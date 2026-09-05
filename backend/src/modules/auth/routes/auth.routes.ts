import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, rateLimiter } from '../middlewares/auth.middleware';

const router = Router();
const controller = new AuthController();

// Apply global rate limiting to all auth endpoints
router.use(rateLimiter);

// Authentication Endpoints
router.post('/register', controller.register.bind(controller));
router.get('/verify-email/:token', controller.verifyEmail.bind(controller));
router.post('/login', controller.login.bind(controller));
router.post('/refresh', controller.refresh.bind(controller));
router.post('/logout', authenticate, controller.logout.bind(controller));

// Password Recovery Endpoints
router.post('/forgot-password', controller.forgotPassword.bind(controller));
router.post('/reset-password', controller.resetPassword.bind(controller));
router.put('/change-password', authenticate, controller.changePassword.bind(controller));

// Session Management Endpoints
router.get('/sessions', authenticate, controller.getSessions.bind(controller));
router.delete('/sessions/:id', authenticate, controller.revokeSession.bind(controller));

// Google OAuth Endpoints
router.get('/google', controller.googleAuth.bind(controller));
router.get('/google/callback', controller.googleCallback.bind(controller));
router.get('/google/mock-consent', controller.googleMockConsent.bind(controller));

// GitHub OAuth Endpoints
router.get('/github', controller.githubAuth.bind(controller));
router.get('/github/callback', controller.githubCallback.bind(controller));
router.get('/github/mock-consent', controller.githubMockConsent.bind(controller));

export default router;
