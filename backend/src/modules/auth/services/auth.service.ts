import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Role, UserStatus, User, UserSession } from '@prisma/client';
import { AuthRepository } from '../repositories/auth.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';
import prisma from '../../../config/db';

// Helper to hash token string (SHA-256)
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  // 1. Register User
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: Role;
    isOAuth?: boolean;
    googleId?: string;
    githubId?: string;
  }): Promise<{ user: User; verificationLink?: string }> {
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      const err: any = new Error('Email is already registered');
      err.status = 400;
      err.code = 'AUTH_004';
      throw err;
    }

    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    const emailVerified = !!data.isOAuth;
    const status = data.isOAuth ? UserStatus.ACTIVE : UserStatus.REGISTERED;

    let token: string | undefined;
    let verificationData: { tokenHash: string; expiresAt: Date } | undefined;

    if (!data.isOAuth) {
      token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours
      verificationData = { tokenHash, expiresAt };
    }

    const user = await this.authRepository.createUserWithProfileAndVerification(
      {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        status,
        googleId: data.googleId,
        githubId: data.githubId,
        emailVerified,
      },
      verificationData
    );

    let verificationLink: string | undefined;
    if (token) {
      verificationLink = await sendVerificationEmail(user.email, token);
      
      // Cache verification code in Redis: otp:{email} -> token (15 mins TTL)
      await redisClient.set(`otp:${user.email}`, token, { EX: 15 * 60 });
    }

    return { user, verificationLink };
  }

  // 2. Verify Email
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const verification = await this.authRepository.findEmailVerification(tokenHash);

    if (!verification) {
      const err: any = new Error('Invalid or expired verification token');
      err.status = 400;
      err.code = 'AUTH_005';
      throw err;
    }

    if (verification.expiresAt < new Date()) {
      const err: any = new Error('Verification token has expired');
      err.status = 400;
      err.code = 'AUTH_006';
      throw err;
    }

    await this.authRepository.verifyEmailTransaction(verification.userId, verification.id);
  }

  // 3. Login User
  async login(
    data: { email: string; password?: string },
    clientInfo: { ip?: string; device?: string; browser?: string }
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.authRepository.findUserByEmail(data.email);

    if (!user) {
      const err: any = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'AUTH_001';
      throw err;
    }

    // Check Lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const timeRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      const err: any = new Error(`Account is locked. Try again in ${timeRemaining} minutes.`);
      err.status = 423;
      err.code = 'AUTH_007';
      throw err;
    }

    // Verify Password
    let isPasswordValid = false;
    if (user.passwordHash && data.password) {
      isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    }

    if (!isPasswordValid) {
      // Increment failed attempts
      await this.authRepository.incrementFailedLoginAttempts(user.id);
      const updatedUser = await this.authRepository.findUserById(user.id);

      if (updatedUser && updatedUser.failedLoginAttempts >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        await this.authRepository.updateUser(user.id, { lockedUntil });
        await this.authRepository.createAuditLog({
          userId: user.id,
          action: 'ACCOUNT_LOCKOUT',
          resourceType: 'USER',
          resourceId: user.id,
          ipAddress: clientInfo.ip,
        });

        const err: any = new Error('Account locked due to 5 failed login attempts. Try again in 15 minutes.');
        err.status = 423;
        err.code = 'AUTH_007';
        throw err;
      }

      await this.authRepository.createAuditLog({
        userId: user.id,
        action: 'FAILED_LOGIN',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress: clientInfo.ip,
      });

      const err: any = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'AUTH_001';
      throw err;
    }

    // Verify user status
    if (user.status === UserStatus.SUSPENDED) {
      const err: any = new Error('Your account has been suspended. Contact support.');
      err.status = 403;
      err.code = 'AUTH_008';
      throw err;
    }

    if (!user.emailVerified) {
      const err: any = new Error('Please verify your email address before logging in.');
      err.status = 403;
      err.code = 'AUTH_009';
      throw err;
    }

    // Successful login -> Reset lockout counter
    await this.authRepository.resetFailedLoginAttempts(user.id);

    // Generate tokens
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const rawRefreshToken = generateRefreshToken(payload);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days

    // Save refresh token in DB
    const dbRefreshToken = await this.authRepository.createRefreshToken(
      user.id,
      refreshTokenHash,
      refreshTokenExpiresAt
    );

    // Save refresh token in Redis: refresh:{tokenId} -> hash (7 days TTL)
    await redisClient.set(`refresh:${dbRefreshToken.id}`, refreshTokenHash, { EX: 7 * 24 * 60 * 60 });

    // Create session in DB
    const session = await this.authRepository.createSession(
      user.id,
      clientInfo.ip,
      clientInfo.device,
      clientInfo.browser
    );

    // Cache session in Redis: session:{userId} -> sessionId (30 mins TTL)
    await redisClient.set(`session:${user.id}`, session.id, { EX: 30 * 60 });

    await this.authRepository.createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress: clientInfo.ip,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // 4. OAuth Login / Register
  async loginOrCreateOAuthUser(
    provider: 'google' | 'github',
    providerId: string,
    email: string,
    firstName: string,
    lastName: string,
    clientInfo: { ip?: string; device?: string; browser?: string }
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    let user = await this.authRepository.findUserByEmail(email);

    if (user) {
      // Link provider if not set
      if (provider === 'google' && !user.googleId) {
        user = await this.authRepository.updateUser(user.id, { googleId: providerId, emailVerified: true });
      } else if (provider === 'github' && !user.githubId) {
        user = await this.authRepository.updateUser(user.id, { githubId: providerId, emailVerified: true });
      }
    } else {
      // Register new user via OAuth
      user = await this.authRepository.createUserWithProfileAndVerification({
        email,
        firstName,
        lastName,
        role: Role.STUDENT, // Default OAuth register role
        status: UserStatus.ACTIVE,
        googleId: provider === 'google' ? providerId : undefined,
        githubId: provider === 'github' ? providerId : undefined,
        emailVerified: true,
      });
    }

    if (user.status === UserStatus.SUSPENDED) {
      const err: any = new Error('Your account has been suspended.');
      err.status = 403;
      err.code = 'AUTH_008';
      throw err;
    }

    // Reset failed counter
    await this.authRepository.resetFailedLoginAttempts(user.id);

    // Generate tokens
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const rawRefreshToken = generateRefreshToken(payload);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days

    // Save refresh token in DB
    const dbRefreshToken = await this.authRepository.createRefreshToken(
      user.id,
      refreshTokenHash,
      refreshTokenExpiresAt
    );

    // Save in Redis
    await redisClient.set(`refresh:${dbRefreshToken.id}`, refreshTokenHash, { EX: 7 * 24 * 60 * 60 });

    // Create session
    const session = await this.authRepository.createSession(
      user.id,
      clientInfo.ip,
      clientInfo.device,
      clientInfo.browser
    );

    await redisClient.set(`session:${user.id}`, session.id, { EX: 30 * 60 });

    await this.authRepository.createAuditLog({
      userId: user.id,
      action: 'LOGIN_OAUTH',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress: clientInfo.ip,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // 5. Refresh Tokens (Rotation)
  async refresh(
    rawRefreshToken: string,
    clientInfo: { ip?: string; device?: string; browser?: string }
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch (error) {
      const err: any = new Error('Invalid refresh token signature');
      err.status = 401;
      err.code = 'AUTH_002';
      throw err;
    }

    const refreshTokenHash = hashToken(rawRefreshToken);
    const dbToken = await this.authRepository.findRefreshToken(refreshTokenHash);

    if (!dbToken) {
      const err: any = new Error('Refresh token not found or revoked');
      err.status = 401;
      err.code = 'AUTH_002';
      throw err;
    }

    if (dbToken.expiresAt < new Date()) {
      const err: any = new Error('Refresh token has expired');
      err.status = 401;
      err.code = 'AUTH_002';
      throw err;
    }

    // Verify Redis cache matches
    const cachedTokenHash = await redisClient.get(`refresh:${dbToken.id}`);
    if (!cachedTokenHash || cachedTokenHash !== refreshTokenHash) {
      const err: any = new Error('Refresh token is blacklisted or out of sync');
      err.status = 401;
      err.code = 'AUTH_002';
      throw err;
    }

    // Revoke old refresh token (Rotation)
    await this.authRepository.revokeRefreshToken(dbToken.id);
    await redisClient.del(`refresh:${dbToken.id}`);

    // Fetch user
    const user = await this.authRepository.findUserById(payload.userId);
    if (!user || user.status === UserStatus.SUSPENDED) {
      const err: any = new Error('User account is invalid or suspended');
      err.status = 401;
      err.code = 'AUTH_003';
      throw err;
    }

    // Generate new token pair
    const newPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRawRefreshToken = generateRefreshToken(newPayload);
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newDbToken = await this.authRepository.createRefreshToken(
      user.id,
      newRefreshTokenHash,
      newExpiresAt
    );

    // Save in Redis
    await redisClient.set(`refresh:${newDbToken.id}`, newRefreshTokenHash, { EX: 7 * 24 * 60 * 60 });

    // Update session expiry in Redis if active
    const activeSessionId = await redisClient.get(`session:${user.id}`);
    if (activeSessionId) {
      await redisClient.expire(`session:${user.id}`, 30 * 60); // Slide expiration to 30 mins
    }

    await this.authRepository.createAuditLog({
      userId: user.id,
      action: 'TOKEN_REFRESH',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress: clientInfo.ip,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // 6. Logout User
  async logout(userId: string, rawRefreshToken: string, rawAccessToken: string): Promise<void> {
    // 1. Revoke current refresh token
    const refreshTokenHash = hashToken(rawRefreshToken);
    const dbToken = await prisma.refreshToken.findFirst({
      where: { userId, tokenHash: refreshTokenHash, revoked: false },
    });

    if (dbToken) {
      await this.authRepository.revokeRefreshToken(dbToken.id);
      await redisClient.del(`refresh:${dbToken.id}`);
    }

    // 2. Revoke Sessions
    await this.authRepository.revokeAllSessionsForUser(userId);
    await redisClient.del(`session:${userId}`);

    // 3. Blacklist Access Token in Redis
    try {
      const decoded: any = jwtDecode(rawAccessToken);
      const remainingTime = Math.ceil(decoded.exp - Date.now() / 1000);
      if (remainingTime > 0) {
        await redisClient.set(`blacklist:${rawAccessToken}`, 'true', { EX: remainingTime });
      }
    } catch {
      // In case accessToken format is invalid, blacklist it with default access expiry (15 mins)
      await redisClient.set(`blacklist:${rawAccessToken}`, 'true', { EX: 15 * 60 });
    }

    await this.authRepository.createAuditLog({
      userId,
      action: 'LOGOUT',
      resourceType: 'USER',
      resourceId: userId,
    });
  }

  // 7. Forgot Password
  async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepository.findUserByEmail(email);

    // To prevent user enumeration, we always return success on controller
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes

    await this.authRepository.createPasswordReset(user.id, tokenHash, expiresAt);

    await sendPasswordResetEmail(user.email, token);

    await this.authRepository.createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      resourceType: 'USER',
      resourceId: user.id,
    });
  }

  // 8. Reset Password
  async resetPassword(token: string, newPassword?: string): Promise<void> {
    if (!newPassword) {
      const err: any = new Error('New password is required');
      err.status = 400;
      throw err;
    }

    const tokenHash = hashToken(token);
    const reset = await this.authRepository.findPasswordReset(tokenHash);

    if (!reset) {
      const err: any = new Error('Invalid or expired password reset token');
      err.status = 400;
      err.code = 'AUTH_010';
      throw err;
    }

    if (reset.expiresAt < new Date()) {
      const err: any = new Error('Password reset token has expired');
      err.status = 400;
      err.code = 'AUTH_011';
      throw err;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await this.authRepository.resetPasswordTransaction(reset.userId, reset.id, newPasswordHash);
  }

  // 9. Change Password
  async changePassword(userId: string, oldPassword?: string, newPassword?: string): Promise<void> {
    if (!oldPassword || !newPassword) {
      const err: any = new Error('Old password and new password are required');
      err.status = 400;
      throw err;
    }

    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (!user.passwordHash) {
      const err: any = new Error('This account was registered using OAuth and does not have a local password. Please use forgot password to set one.');
      err.status = 400;
      throw err;
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      const err: any = new Error('Incorrect old password');
      err.status = 400;
      err.code = 'AUTH_012';
      throw err;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
      prisma.userSession.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGE_SUCCESS',
          resourceType: 'USER',
          resourceId: userId,
        },
      }),
    ]);

    await redisClient.del(`session:${userId}`);
  }

  // 10. Active Sessions
  async getSessions(userId: string): Promise<UserSession[]> {
    return this.authRepository.findActiveSessionsForUser(userId);
  }

  // 11. Revoke Session
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.authRepository.findSessionById(sessionId);

    if (!session || session.userId !== userId) {
      const err: any = new Error('Session not found or unauthorized');
      err.status = 404;
      throw err;
    }

    await this.authRepository.revokeSession(sessionId);

    // If it is the current session cached in Redis, delete it
    const cachedSessionId = await redisClient.get(`session:${userId}`);
    if (cachedSessionId === sessionId) {
      await redisClient.del(`session:${userId}`);
    }

    await this.authRepository.createAuditLog({
      userId,
      action: 'SESSION_REVOKED',
      resourceType: 'SESSION',
      resourceId: sessionId,
    });
  }
}

// Simple local jwtDecode fallback helper since we don't have extra npm packages for decoding JWTs
function jwtDecode(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error();
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    throw new Error('Invalid JWT format');
  }
}
