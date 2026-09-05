import logger from '../../../config/logger';

const BASE_URL = 'http://localhost:5000/api/v1/auth';
const HEALTH_URL = 'http://localhost:5000/api/v1/health';

async function runTests() {
  logger.info('==================================================');
  logger.info('STARTING IAM MODULE INTEGRATION TESTS');
  logger.info('==================================================');

  try {
    // 0. Verify Health check is healthy
    logger.info('Test 0: Checking service health...');
    const healthRes = await fetch(HEALTH_URL);
    if (!healthRes.ok) {
      throw new Error(`Health check failed. Server might not be running: ${healthRes.statusText}`);
    }
    const health = await healthRes.json() as any;
    logger.info(`Health Check Response: ${JSON.stringify(health)}`);
    if (health.services.database !== 'UP' || health.services.redis !== 'UP') {
      throw new Error('Postgres or Redis services are not ready in health check.');
    }
    logger.info('PASSED: Health check verified database and redis connection');

    // Generate unique email to avoid conflicts on multiple test runs
    const testEmail = `test.student.${Date.now()}@example.com`;
    const password = 'Password123!';
    let accessToken = '';
    let refreshToken = '';
    let verificationLink = '';
    let verificationToken = '';

    // 1. Register User
    logger.info(`\nTest 1: Registering user: ${testEmail}...`);
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: testEmail,
        password: password,
        role: 'STUDENT'
      })
    });
    const regData = await regRes.json() as any;
    logger.info(`Register Response: ${JSON.stringify(regData)}`);
    
    if (regRes.status !== 201 || !regData.success) {
      throw new Error(`Registration failed: ${regData.message}`);
    }
    verificationLink = regData.verificationLink;
    verificationToken = verificationLink.split('/').pop() || '';
    logger.info(`PASSED: User registered successfully. Verification token: ${verificationToken}`);

    // 2. Login Before Verification (Should Fail)
    logger.info('\nTest 2: Attempting login before email verification...');
    const unverifiedLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password })
    });
    const unverifiedLoginData = await unverifiedLoginRes.json() as any;
    logger.info(`Unverified Login Response: ${JSON.stringify(unverifiedLoginData)}`);
    if (unverifiedLoginRes.status !== 403 || unverifiedLoginData.error_code !== 'AUTH_009') {
      throw new Error('Expected 403 Forbidden for unverified login.');
    }
    logger.info('PASSED: Unverified login was correctly rejected.');

    // 3. Verify Email
    logger.info(`\nTest 3: Verifying email using token ${verificationToken}...`);
    const verifyRes = await fetch(`${BASE_URL}/verify-email/${verificationToken}`);
    const verifyData = await verifyRes.json() as any;
    logger.info(`Verify Email Response: ${JSON.stringify(verifyData)}`);
    if (verifyRes.status !== 200 || !verifyData.success) {
      throw new Error(`Email verification failed: ${verifyData.message}`);
    }
    logger.info('PASSED: Email verified successfully.');

    // 4. Login with Correct Credentials
    logger.info('\nTest 4: Logging in with correct credentials...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password })
    });
    const loginData = await loginRes.json() as any;
    logger.info(`Login Response: ${JSON.stringify(loginData)}`);
    if (loginRes.status !== 200 || !loginData.success) {
      throw new Error(`Login failed: ${loginData.message}`);
    }
    accessToken = loginData.data.accessToken;
    refreshToken = loginData.data.refreshToken;
    logger.info('PASSED: Logged in successfully. Received JWT and Refresh tokens.');

    // 5. Account Lockout on 5 Failed Login Attempts
    logger.info('\nTest 5: Testing account lockout limits...');
    const lockoutEmail = `lockout.${Date.now()}@example.com`;
    // Register lockout user first
    const lReg = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Lockout',
        lastName: 'Test',
        email: lockoutEmail,
        password: password,
        role: 'STUDENT'
      })
    });
    const lRegData = await lReg.json() as any;
    const lVerifyToken = lRegData.verificationLink.split('/').pop();
    await fetch(`${BASE_URL}/verify-email/${lVerifyToken}`);

    // Fail login 5 times
    for (let i = 1; i <= 5; i++) {
      logger.info(`Attempt ${i} with incorrect password...`);
      const failRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockoutEmail, password: 'WrongPassword1!' })
      });
      const failData = await failRes.json() as any;
      logger.info(`Status: ${failRes.status} | Msg: ${failData.message}`);

      if (i === 5) {
        if (failRes.status !== 423 || failData.error_code !== 'AUTH_007') {
          throw new Error('Expected account to be locked with status 423.');
        }
        logger.info('PASSED: Account is locked after 5 failed attempts.');
      } else {
        if (failRes.status !== 401 || failData.error_code !== 'AUTH_001') {
          throw new Error('Expected 401 for incorrect password attempt.');
        }
      }
    }

    // 6. Token Rotation (Refresh Token)
    logger.info('\nTest 6: Refreshing JWT access token (Token Rotation)...');
    const refreshRes = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshData = await refreshRes.json() as any;
    logger.info(`Refresh Response: ${JSON.stringify(refreshData)}`);
    if (refreshRes.status !== 200 || !refreshData.success) {
      throw new Error(`Refresh failed: ${refreshData.message}`);
    }
    const oldRefreshToken = refreshToken;
    accessToken = refreshData.data.accessToken;
    refreshToken = refreshData.data.refreshToken;
    logger.info('PASSED: Rotated tokens. Received new Access and Refresh tokens.');

    // 6.1 Reusing Old Refresh Token (Should Fail - Rotation Check)
    logger.info('Checking old refresh token reuse rejection...');
    const reuseRes = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefreshToken })
    });
    const reuseData = await reuseRes.json() as any;
    logger.info(`Reused Refresh Response: ${JSON.stringify(reuseData)}`);
    if (reuseRes.status !== 401) {
      throw new Error('Old refresh token should not be reusable.');
    }
    logger.info('PASSED: Reusing an old refresh token was successfully rejected.');

    // 7. Session Retrieval
    logger.info('\nTest 7: Fetching active user sessions...');
    const sessionsRes = await fetch(`${BASE_URL}/sessions`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const sessionsData = await sessionsRes.json() as any;
    logger.info(`Sessions Response: ${JSON.stringify(sessionsData)}`);
    if (sessionsRes.status !== 200 || !sessionsData.success || sessionsData.data.length === 0) {
      throw new Error('Failed to retrieve active sessions.');
    }
    const sessionId = sessionsData.data[0].id;
    logger.info(`PASSED: Retrieved active session. Session ID: ${sessionId}`);

    // 8. Session Revocation
    logger.info(`\nTest 8: Revoking session ${sessionId}...`);
    const revokeRes = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const revokeData = await revokeRes.json() as any;
    logger.info(`Revoke Response: ${JSON.stringify(revokeData)}`);
    if (revokeRes.status !== 200 || !revokeData.success) {
      throw new Error('Failed to revoke session.');
    }
    logger.info('PASSED: Session revoked successfully.');

    // 9. Change Password
    logger.info('\nTest 9: Changing account password...');
    const newPassword = 'NewPassword123!';
    const changePassRes = await fetch(`${BASE_URL}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ oldPassword: password, newPassword })
    });
    const changePassData = await changePassRes.json() as any;
    logger.info(`Change Password Response: ${JSON.stringify(changePassData)}`);
    if (changePassRes.status !== 200 || !changePassData.success) {
      throw new Error(`Change password failed: ${changePassData.message}`);
    }
    logger.info('PASSED: Password changed successfully.');

    // 10. Login with New Password
    logger.info('\nTest 10: Logging in with the new password...');
    const newLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newPassword })
    });
    const newLoginData = await newLoginRes.json() as any;
    logger.info(`New Login Response: ${JSON.stringify(newLoginData)}`);
    if (newLoginRes.status !== 200 || !newLoginData.success) {
      throw new Error(`Login with new password failed: ${newLoginData.message}`);
    }
    accessToken = newLoginData.data.accessToken;
    refreshToken = newLoginData.data.refreshToken;
    logger.info('PASSED: Logged in with new password successfully.');

    // 11. Mock Google OAuth Callback Login
    logger.info('\nTest 11: Testing Mock Google OAuth Callback...');
    const googleOAuthRes = await fetch(`${BASE_URL}/google/callback?code=mock_google_student`);
    const googleOAuthData = await googleOAuthRes.json() as any;
    logger.info(`Google OAuth Callback Response: ${JSON.stringify(googleOAuthData)}`);
    if (googleOAuthRes.status !== 200 || !googleOAuthData.success) {
      throw new Error('Google OAuth Callback failed.');
    }
    logger.info(`PASSED: Google OAuth login returned JWT for user: ${googleOAuthData.data.user.email}`);

    // 12. Mock GitHub OAuth Callback Login
    logger.info('\nTest 12: Testing Mock GitHub OAuth Callback...');
    const githubOAuthRes = await fetch(`${BASE_URL}/github/callback?code=mock_github_mentor`);
    const githubOAuthData = await githubOAuthRes.json() as any;
    logger.info(`GitHub OAuth Callback Response: ${JSON.stringify(githubOAuthData)}`);
    if (githubOAuthRes.status !== 200 || !githubOAuthData.success) {
      throw new Error('GitHub OAuth Callback failed.');
    }
    logger.info(`PASSED: GitHub OAuth login returned JWT for user: ${githubOAuthData.data.user.email}`);

    // 13. Rate Limiter Check (Exceed Limit)
    logger.info('\nTest 13: Exceeding rate limiting thresholds...');
    const testLimiterEmail = `limiter.${Date.now()}@example.com`;
    // Spam the register endpoint (limit for anon is 20 requests per minute)
    let exceeded = false;
    for (let j = 0; j < 25; j++) {
      const rateLimitRes = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Limit',
          lastName: 'Spammer',
          email: testLimiterEmail,
          password: password,
          role: 'STUDENT'
        })
      });
      if (rateLimitRes.status === 429) {
        exceeded = true;
        logger.info(`Received 429 on attempt ${j + 1}. Message: ${(await rateLimitRes.json() as any).message}`);
        break;
      }
    }
    if (!exceeded) {
      throw new Error('Expected rate limiter to return 429 Too Many Requests.');
    }
    logger.info('PASSED: Rate limiting middleware correctly returns 429 on abuse.');

    // 14. Logout
    logger.info('\nTest 14: Executing logout...');
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ refreshToken })
    });
    const logoutData = await logoutRes.json() as any;
    logger.info(`Logout Response: ${JSON.stringify(logoutData)}`);
    if (logoutRes.status !== 200 || !logoutData.success) {
      throw new Error(`Logout failed: ${logoutData.message}`);
    }
    logger.info('PASSED: Logged out successfully.');

    // 15. Check Blacklisted Token Access Rejection
    logger.info('\nTest 15: Verifying blacklisted token rejection...');
    const blockedRes = await fetch(`${BASE_URL}/sessions`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const blockedData = await blockedRes.json() as any;
    logger.info(`Blocked Access Response: ${JSON.stringify(blockedData)}`);
    if (blockedRes.status !== 401 || blockedData.error_code !== 'AUTH_002') {
      throw new Error('Expected 401 Unauthorized with token blacklisted error code.');
    }
    logger.info('PASSED: Blacklisted access token was successfully rejected.');

    logger.info('\n==================================================');
    logger.info('ALL TESTS PASSED SUCCESSFULLY! :)');
    logger.info('==================================================');
    process.exit(0);

  } catch (error: any) {
    logger.error(`\nTEST SUITE FAILED: ${error.message}`);
    process.exit(1);
  }
}

runTests();
