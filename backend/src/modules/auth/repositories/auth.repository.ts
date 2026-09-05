import prisma from '../../../config/db';
import { User, Role, UserStatus, RefreshToken, EmailVerification, PasswordReset, UserSession } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async findUserByGithubId(githubId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { githubId } });
  }

  async createUserWithProfileAndVerification(
    userData: {
      email: string;
      passwordHash?: string;
      firstName: string;
      lastName: string;
      role: Role;
      status: UserStatus;
      googleId?: string;
      githubId?: string;
      emailVerified?: boolean;
    },
    verificationData?: {
      tokenHash: string;
      expiresAt: Date;
    }
  ): Promise<User> {
    return prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: userData.email,
          passwordHash: userData.passwordHash || null,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          status: userData.status,
          googleId: userData.googleId,
          githubId: userData.githubId,
          emailVerified: userData.emailVerified || false,
        },
      });

      // 2. Create specific profile based on role
      if (userData.role === Role.STUDENT) {
        await tx.student.create({
          data: {
            userId: user.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
          },
        });
      } else if (userData.role === Role.MENTOR) {
        await tx.mentor.create({
          data: {
            userId: user.id,
            specialization: 'Not Specified',
            experienceYears: 0,
          },
        });
      }

      // 3. Create email verification record if required
      if (verificationData) {
        await tx.emailVerification.create({
          data: {
            userId: user.id,
            tokenHash: verificationData.tokenHash,
            expiresAt: verificationData.expiresAt,
          },
        });
      }

      // 4. Create Audit Log for registration
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTRATION',
          resourceType: 'USER',
          resourceId: user.id,
        },
      });

      return user;
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async incrementFailedLoginAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
    });
  }

  async resetFailedLoginAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  // Refresh Tokens
  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false },
    });
  }

  async revokeRefreshToken(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  // Email Verification
  async findEmailVerification(tokenHash: string): Promise<EmailVerification | null> {
    return prisma.emailVerification.findFirst({
      where: { tokenHash, verified: false },
    });
  }

  async verifyEmailTransaction(userId: string, verificationId: string): Promise<void> {
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verificationId },
        data: { verified: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'EMAIL_VERIFICATION_SUCCESS',
          resourceType: 'USER',
          resourceId: userId,
        },
      }),
    ]);
  }

  // Password Reset
  async createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordReset> {
    return prisma.passwordReset.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findPasswordReset(tokenHash: string): Promise<PasswordReset | null> {
    return prisma.passwordReset.findFirst({
      where: { tokenHash, used: false },
    });
  }

  async resetPasswordTransaction(userId: string, resetId: string, passwordHash: string): Promise<void> {
    await prisma.$transaction([
      prisma.passwordReset.update({
        where: { id: resetId },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
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
          action: 'PASSWORD_RESET_SUCCESS',
          resourceType: 'USER',
          resourceId: userId,
        },
      }),
    ]);
  }

  // Sessions
  async createSession(
    userId: string,
    ipAddress?: string,
    deviceInfo?: string,
    browserInfo?: string
  ): Promise<UserSession> {
    return prisma.userSession.create({
      data: {
        userId,
        ipAddress,
        deviceInfo,
        browserInfo,
      },
    });
  }

  async findActiveSessionsForUser(userId: string): Promise<UserSession[]> {
    return prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { loginTime: 'desc' },
    });
  }

  async findSessionById(id: string): Promise<UserSession | null> {
    return prisma.userSession.findUnique({
      where: { id },
    });
  }

  async revokeSession(id: string): Promise<UserSession> {
    return prisma.userSession.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  // Audit Logs
  async createAuditLog(log: {
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: log,
    });
  }
}
