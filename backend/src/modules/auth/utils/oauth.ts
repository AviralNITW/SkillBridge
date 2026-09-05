import logger from '../../../config/logger';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || '';

const isGoogleMock = !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('placeholder');
const isGithubMock = !GITHUB_CLIENT_ID || GITHUB_CLIENT_ID.includes('placeholder');

export interface OAuthUser {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const getGoogleAuthUrl = (): string => {
  if (isGoogleMock) {
    logger.info('Using MOCK Google OAuth Flow');
    return `/api/v1/auth/google/mock-consent`;
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    GOOGLE_CALLBACK_URL
  )}&response_type=code&scope=profile%20email`;
};

export const getGoogleUser = async (code: string): Promise<OAuthUser> => {
  if (isGoogleMock || code.startsWith('mock_')) {
    const isMentor = code.includes('mentor');
    const role = isMentor ? 'mentor' : 'student';
    return {
      providerId: `google_mock_id_${Date.now()}`,
      email: `${role}.google@example.com`,
      firstName: `Google`,
      lastName: `${isMentor ? 'Mentor' : 'Student'}`,
    };
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Google token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = (await tokenResponse.json()) as any;

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error(`Google userinfo fetch failed: ${userResponse.statusText}`);
    }

    const profile = (await userResponse.json()) as any;
    return {
      providerId: String(profile.id),
      email: profile.email,
      firstName: profile.given_name || 'Google',
      lastName: profile.family_name || 'User',
    };
  } catch (error: any) {
    logger.error(`Real Google OAuth Error: ${error.message}`);
    throw error;
  }
};

export const getGithubAuthUrl = (): string => {
  if (isGithubMock) {
    logger.info('Using MOCK GitHub OAuth Flow');
    return `/api/v1/auth/github/mock-consent`;
  }
  return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    GITHUB_CALLBACK_URL
  )}&scope=user:email`;
};

export const getGithubUser = async (code: string): Promise<OAuthUser> => {
  if (isGithubMock || code.startsWith('mock_')) {
    const isMentor = code.includes('mentor');
    const role = isMentor ? 'mentor' : 'student';
    return {
      providerId: `github_mock_id_${Date.now()}`,
      email: `${role}.github@example.com`,
      firstName: `GitHub`,
      lastName: `${isMentor ? 'Mentor' : 'Student'}`,
    };
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: GITHUB_CALLBACK_URL,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = (await tokenResponse.json()) as any;

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${tokens.access_token}`,
        'User-Agent': 'SkillBridge-Backend',
      },
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub userinfo fetch failed: ${userResponse.statusText}`);
    }

    const profile = (await userResponse.json()) as any;

    const fullName = profile.name || 'GitHub User';
    const parts = fullName.split(' ');
    const firstName = parts[0] || 'GitHub';
    const lastName = parts.slice(1).join(' ') || 'User';

    let email = profile.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${tokens.access_token}`,
          'User-Agent': 'SkillBridge-Backend',
        },
      });
      if (emailResponse.ok) {
        const emails = (await emailResponse.json()) as any[];
        const primaryEmailObj = emails.find((e) => e.primary) || emails[0];
        email = primaryEmailObj ? primaryEmailObj.email : `${profile.login}@github.mock`;
      } else {
        email = `${profile.login}@github.mock`;
      }
    }

    return {
      providerId: String(profile.id),
      email,
      firstName,
      lastName,
    };
  } catch (error: any) {
    logger.error(`Real GitHub OAuth Error: ${error.message}`);
    throw error;
  }
};
