import { Request, Response, NextFunction } from 'express';
import UAParser from 'ua-parser-js';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from '../validators/auth.validator';
import {
  getGoogleAuthUrl,
  getGoogleUser,
  getGithubAuthUrl,
  getGithubUser,
} from '../utils/oauth';
import logger from '../../../config/logger';

const authService = new AuthService();

const getClientInfo = (req: Request) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const cleanIp = Array.isArray(ip) ? ip[0] : ip || 'unknown';

  const userAgent = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim();
  const device = `${result.device.vendor || ''} ${result.device.model || ''} ${result.os.name || 'Unknown Device'}`.trim();

  return { ip: cleanIp, browser, device };
};

export class AuthController {
  // 1. Register User
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RegisterSchema.parse(req.body);
      const result = await authService.register(validated);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          status: result.user.status,
        },
        // Include link in dev mode for easy testing
        verificationLink: process.env.NODE_ENV === 'development' ? result.verificationLink : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Verify Email
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      await authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Login
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = LoginSchema.parse(req.body);
      const clientInfo = getClientInfo(req);
      const result = await authService.login(validated, clientInfo);

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Refresh Token
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required.',
        });
        return;
      }

      const clientInfo = getClientInfo(req);
      const result = await authService.refresh(refreshToken, clientInfo);

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Logout
  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required for logging out.',
        });
        return;
      }

      await authService.logout(req.user!.id, refreshToken, req.token!);

      res.status(200).json({
        success: true,
        message: 'Logout successful.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 6. Forgot Password
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ForgotPasswordSchema.parse(req.body);
      await authService.forgotPassword(validated.email);

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 7. Reset Password
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ResetPasswordSchema.parse(req.body);
      await authService.resetPassword(validated.token, validated.newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 8. Change Password
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ChangePasswordSchema.parse(req.body);
      await authService.changePassword(req.user!.id, validated.oldPassword, validated.newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Other sessions have been revoked.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 9. Get Sessions
  async getSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await authService.getSessions(req.user!.id);
      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  // 10. Revoke Session
  async revokeSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await authService.revokeSession(req.user!.id, id);

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 11. Redirect to Google OAuth
  googleAuth(req: Request, res: Response): void {
    const url = getGoogleAuthUrl();
    res.redirect(url);
  }

  // 12. Google OAuth Callback
  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          message: 'OAuth authorization code is missing.',
        });
        return;
      }

      const clientInfo = getClientInfo(req);
      const oauthUser = await getGoogleUser(code);
      const result = await authService.loginOrCreateOAuthUser(
        'google',
        oauthUser.providerId,
        oauthUser.email,
        oauthUser.firstName,
        oauthUser.lastName,
        clientInfo
      );

      res.status(200).json({
        success: true,
        message: 'Google login successful.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 13. Redirect to GitHub OAuth
  githubAuth(req: Request, res: Response): void {
    const url = getGithubAuthUrl();
    res.redirect(url);
  }

  // 14. GitHub OAuth Callback
  async githubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          message: 'OAuth authorization code is missing.',
        });
        return;
      }

      const clientInfo = getClientInfo(req);
      const oauthUser = await getGithubUser(code);
      const result = await authService.loginOrCreateOAuthUser(
        'github',
        oauthUser.providerId,
        oauthUser.email,
        oauthUser.firstName,
        oauthUser.lastName,
        clientInfo
      );

      res.status(200).json({
        success: true,
        message: 'GitHub login successful.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 15. Mock Consent HTML Pages for Dev Mode
  googleMockConsent(req: Request, res: Response): void {
    const html = getMockConsentHtml('Google', '/api/v1/auth/google/callback');
    res.send(html);
  }

  githubMockConsent(req: Request, res: Response): void {
    const html = getMockConsentHtml('GitHub', '/api/v1/auth/github/callback');
    res.send(html);
  }
}

// Beautiful premium mock consent page using HSL colors, gradients, and micro-interactions
function getMockConsentHtml(providerName: string, callbackPath: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SkillBridge Mock ${providerName} Consent</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-color: #0b0f19;
          --panel-color: rgba(22, 28, 45, 0.6);
          --accent-color: ${providerName === 'Google' ? '#4285F4' : '#24292e'};
          --text-color: #f3f4f6;
          --subtitle-color: #9ca3af;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
          color: var(--text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background: var(--panel-color);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          text-align: center;
          animation: fadeIn 0.6s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .logo {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(to right, #38bdf8, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 24px;
        }
        h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 10px 0;
        }
        p {
          color: var(--subtitle-color);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .button-group {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .btn {
          font-family: 'Outfit', sans-serif;
          display: block;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }
        .btn-student {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        .btn-student:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
        }
        .btn-mentor {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }
        .btn-mentor:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
        }
        .btn-cancel {
          background: rgba(255, 255, 255, 0.05);
          color: var(--subtitle-color);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SkillBridge</div>
        <h2>Sign in with ${providerName}</h2>
        <p>This is a simulated ${providerName} OAuth sign-in screen. Select the role profile you want to authenticate with for local testing purposes.</p>
        <div class="button-group">
          <a href="${callbackPath}?code=mock_${providerName.toLowerCase()}_student" class="btn btn-student">Continue as STUDENT</a>
          <a href="${callbackPath}?code=mock_${providerName.toLowerCase()}_mentor" class="btn btn-mentor">Continue as MENTOR</a>
          <a href="/" class="btn btn-cancel">Cancel</a>
        </div>
      </div>
    </body>
    </html>
  `;
}
