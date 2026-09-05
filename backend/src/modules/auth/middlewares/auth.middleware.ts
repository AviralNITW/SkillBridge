import { Request, Response, NextFunction } from 'express';
import { Role, UserStatus } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { AuthRepository } from '../repositories/auth.repository';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';

const authRepository = new AuthRepository();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
    firstName: string;
    lastName: string;
  };
  token?: string;
}

// 1. JWT Authentication Middleware
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication credentials are required.',
        error_code: 'AUTH_003',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check Blacklist in Redis
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been invalidated (logged out).',
        error_code: 'AUTH_002',
      });
      return;
    }

    let payload: any;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token.',
        error_code: 'AUTH_002',
      });
      return;
    }

    const user = await authRepository.findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists.',
        error_code: 'AUTH_003',
      });
      return;
    }

    if (user.status === UserStatus.SUSPENDED) {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended.',
        error_code: 'AUTH_008',
      });
      return;
    }

    // Attach to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    req.token = token;

    next();
  } catch (error: any) {
    logger.error(`Authentication Middleware Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

// 2. RBAC Roles Middleware
export const requireRoles = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication required.',
        error_code: 'AUTH_003',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
        error_code: 'AUTH_003',
      });
      return;
    }

    next();
  };
};

// 3. Redis-Based Rate Limiting Middleware
export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const cleanIp = Array.isArray(ip) ? ip[0] : ip || 'unknown';
    const rateLimitKey = `rate_limit:${cleanIp}`;

    const authHeader = req.headers.authorization;
    const isAuth = authHeader && authHeader.startsWith('Bearer ');
    const limit = isAuth ? 100 : 20;

    const requestCount = await redisClient.incr(rateLimitKey);

    if (requestCount === 1) {
      await redisClient.expire(rateLimitKey, 60);
    }

    const ttl = await redisClient.ttl(rateLimitKey);

    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(Math.max(0, limit - requestCount)));
    res.set('X-RateLimit-Reset', String(ttl));

    if (requestCount > limit) {
      res.status(429).set('Retry-After', String(ttl)).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        error_code: 'SYS_429',
      });
      return;
    }

    next();
  } catch (error: any) {
    logger.error(`Rate Limiter Middleware Error: ${error.message}`);
    next();
  }
};
