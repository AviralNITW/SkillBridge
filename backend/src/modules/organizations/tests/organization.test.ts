import logger from '../../../config/logger';
import prisma from '../../../config/db';
import redisClient, { connectRedis } from '../../../config/redis';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const ORG_URL = 'http://localhost:5000/api/v1/organizations';
const HEALTH_URL = 'http://localhost:5000/api/v1/health';

async function runTests() {
  logger.info('==================================================');
  logger.info('STARTING ORGANIZATION MODULE INTEGRATION TESTS');
  logger.info('==================================================');

  try {
    // Connect to Redis for caching tests
    await connectRedis();

    // 0. Verify Service Health
    logger.info('Test 0: Checking service health...');
    const healthRes = await fetch(HEALTH_URL);
    if (!healthRes.ok) {
      throw new Error(`Health check failed: ${healthRes.statusText}`);
    }
    const health = await healthRes.json() as any;
    if (health.services.database !== 'UP' || health.services.redis !== 'UP') {
      throw new Error('Postgres or Redis are down.');
    }
    logger.info('PASSED: Health check confirmed system status is healthy.');

    // Unique emails for current test run
    const emailA = `school.owner.${Date.now()}@example.com`;
    const emailB = `company.owner.${Date.now()}@example.com`;
    const emailMember = `team.member.${Date.now()}@example.com`;
    const emailAdmin = `admin.user.${Date.now()}@example.com`;
    const password = 'Password123!';

    let tokenA = '';
    let tokenB = '';
    let tokenMember = '';
    let tokenAdmin = '';

    let orgIdA = '';
    let orgIdB = '';

    // Register & Login Helper
    async function registerAndLogin(email: string, role: 'SCHOOL' | 'COMPANY' | 'MENTOR'): Promise<string> {
      try {
        const keys = await redisClient.keys('rate_limit:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (err) {
        // Ignore redis connection issues during clearing
      }

      const regRes = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'User',
          email,
          password,
          role,
        }),
      });
      const regData = await regRes.json() as any;
      if (!regData.success) {
        throw new Error(`Registration failed for ${email}: ${regData.message}`);
      }
      const verifyToken = regData.verificationLink.split('/').pop();
      await fetch(`${AUTH_URL}/verify-email/${verifyToken}`);

      const loginRes = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json() as any;
      if (!loginRes.ok) {
        throw new Error(`Login failed for ${email} with status ${loginRes.status}: ${JSON.stringify(loginData)}`);
      }
      return loginData.data.accessToken;
    }

    logger.info('\nTest 1: Registering and logging in users...');
    tokenA = await registerAndLogin(emailA, 'SCHOOL');
    tokenB = await registerAndLogin(emailB, 'COMPANY');
    tokenMember = await registerAndLogin(emailMember, 'SCHOOL');
    
    // Create Admin
    tokenAdmin = await registerAndLogin(emailAdmin, 'MENTOR');
    await prisma.user.update({
      where: { email: emailAdmin },
      data: { role: 'ADMIN' },
    });
    logger.info('PASSED: Users and Admin registered successfully.');

    // 1. Create Organization Profile - SCHOOL
    logger.info('\nTest 2: Creating a SCHOOL organization (User A)...');
    const createSchoolRes = await fetch(`${ORG_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        organizationType: 'SCHOOL',
        name: 'MIT University',
        email: 'contact@mit.edu',
        phone: '1234567890',
        website: 'https://mit.edu',
        address: 'Cambridge, MA',
        description: 'Massachusetts Institute of Technology',
        institutionType: 'UNIVERSITY',
        principalName: 'Sally Kornbluth',
        studentCount: 11000,
      }),
    });
    const createSchoolData = await createSchoolRes.json() as any;
    if (!createSchoolRes.ok || !createSchoolData.success) {
      throw new Error(`School creation failed: ${createSchoolData.message}`);
    }
    orgIdA = createSchoolData.data.id;
    logger.info(`PASSED: SCHOOL organization created. ID: ${orgIdA}`);

    // 2. Create Organization Profile - COMPANY
    logger.info('\nTest 3: Creating a COMPANY organization (User B)...');
    const createCompanyRes = await fetch(`${ORG_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        organizationType: 'COMPANY',
        name: 'Stark Industries',
        email: 'info@stark.com',
        phone: '9876543210',
        website: 'https://stark.com',
        address: 'Los Angeles, CA',
        description: 'Advanced technology and energy solutions',
        industry: 'AEROSPACE',
        companySize: '10000+',
        headquarters: 'Malibu, California',
        foundedYear: 1963,
      }),
    });
    const createCompanyData = await createCompanyRes.json() as any;
    if (!createCompanyRes.ok || !createCompanyData.success) {
      throw new Error(`Company creation failed: ${createCompanyData.message}`);
    }
    orgIdB = createCompanyData.data.id;
    logger.info(`PASSED: COMPANY organization created. ID: ${orgIdB}`);

    // 3. Update Organization Profile
    logger.info('\nTest 4: Updating School A details...');
    const updateRes = await fetch(`${ORG_URL}/${orgIdA}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        phone: '5555555555',
        principalName: 'Updated Principal Name',
        studentCount: 12000,
      }),
    });
    const updateData = await updateRes.json() as any;
    if (!updateRes.ok || !updateData.success) {
      throw new Error(`Update failed: ${updateData.message}`);
    }
    if (updateData.data.phone !== '5555555555' || updateData.data.school.principalName !== 'Updated Principal Name') {
      throw new Error('Updated fields do not match.');
    }
    logger.info('PASSED: Organization details updated successfully.');

    // 4. KYC Document Upload
    logger.info('\nTest 5: Uploading KYC verification documents...');
    const docFormData = new FormData();
    const mockPdf = new Blob(['%PDF-1.4 Mock Affiliation Certificate'], { type: 'application/pdf' });
    docFormData.append('document', mockPdf, 'affiliation_doc.pdf');

    const uploadRes = await fetch(`${ORG_URL}/${orgIdA}/verification-documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: docFormData,
    });
    const uploadData = await uploadRes.json() as any;
    if (!uploadRes.ok || !uploadData.success || !uploadData.data.verificationDocumentUrl) {
      throw new Error(`KYC upload failed: ${uploadData.message}`);
    }
    logger.info(`PASSED: KYC document uploaded. URL: ${uploadData.data.verificationDocumentUrl}`);

    // 5. Submit KYC for Verification
    logger.info('\nTest 6: Submitting KYC verification request...');
    const submitRes = await fetch(`${ORG_URL}/${orgIdA}/submit-verification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const submitData = await submitRes.json() as any;
    if (!submitRes.ok || submitData.data.verificationStatus !== 'PENDING') {
      throw new Error(`Submission failed: ${submitData.message}`);
    }
    logger.info('PASSED: Verification status updated to PENDING.');

    // 6. Admin Verification Action
    logger.info('\nTest 7: Verification workflow - Approve & Security checks...');
    
    // Non-admin tries to approve -> should fail
    const badApproveRes = await fetch(`${ORG_URL}/${orgIdA}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`, // Company owner trying to approve School
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    if (badApproveRes.status !== 403) {
      throw new Error('Non-admin users must be forbidden from verifying organizations.');
    }
    logger.info('Verified: Non-admin approval request was correctly rejected (403).');

    // Admin approves
    const adminApproveRes = await fetch(`${ORG_URL}/${orgIdA}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const adminApproveData = await adminApproveRes.json() as any;
    if (!adminApproveRes.ok || adminApproveData.data.verificationStatus !== 'APPROVED') {
      throw new Error(`Admin approval failed: ${adminApproveData.message}`);
    }
    logger.info('PASSED: Admin successfully approved organization. Verification status is APPROVED.');

    // 7. Add Team Member
    logger.info('\nTest 8: Inviting and listing team members...');
    const addMemberRes = await fetch(`${ORG_URL}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        organizationId: orgIdA,
        email: emailMember,
        role: 'PLACEMENT_OFFICER',
      }),
    });
    const addMemberData = await addMemberRes.json() as any;
    if (!addMemberRes.ok || !addMemberData.success) {
      throw new Error(`Add member failed: ${addMemberData.message}`);
    }
    logger.info('PASSED: Member invited successfully.');

    // List Members
    const membersRes = await fetch(`${ORG_URL}/members?organizationId=${orgIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const membersData = await membersRes.json() as any;
    if (!membersRes.ok || !membersData.data || membersData.data.length !== 2) {
      throw new Error(`Incorrect organization members count. Received: ${JSON.stringify(membersData)}`);
    }
    logger.info('PASSED: Listed organization members successfully.');

    // 8. Subscriptions - Payments and 18% GST Calculations
    logger.info('\nTest 9: Creating subscription payment order & GST verification (Phase 2)...');
    const orderRes = await fetch(`${ORG_URL}/subscription/payment/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        organizationId: orgIdA,
        planName: 'GROWTH',
        gstin: '27AADCS1429B1Z4', // Maharashtra valid mock GSTIN
      }),
    });
    const orderData = await orderRes.json() as any;
    if (!orderRes.ok || !orderData.orderId) {
      throw new Error(`Order creation failed: ${orderData.message}`);
    }

    // Growth Plan = 9999. GST (18%) = 1799.82. Total = 11798.82
    logger.info(`Order Details: Plan = ${orderData.planName}, Amount = ${orderData.amount}, GST (18%) = ${orderData.gstAmount}, Total = ${orderData.totalAmount}`);
    if (orderData.amount !== 9999.00 || orderData.gstAmount !== 1799.82 || orderData.totalAmount !== 11798.82) {
      throw new Error('GST calculations or subscription amounts are incorrect.');
    }
    logger.info('PASSED: Razorpay order generated with precise 18% GST billing calculations.');

    // 9. Subscriptions - Verify Payment
    logger.info('\nTest 10: Verifying Razorpay payment signature & plan elevation...');
    const paymentId = 'pay_mock_123456';
    const mockSignature = `sig_${orderData.orderId}_${paymentId}`;

    const verifyPayRes = await fetch(`${ORG_URL}/subscription/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        organizationId: orgIdA,
        planName: 'GROWTH',
        amount: orderData.amount,
        gstAmount: orderData.gstAmount,
        totalAmount: orderData.totalAmount,
        gstin: orderData.gstin,
        orderId: orderData.orderId,
        paymentId,
        signature: mockSignature,
      }),
    });
    const verifyPayData = await verifyPayRes.json() as any;
    if (!verifyPayRes.ok || !verifyPayData.success || verifyPayData.data.status !== 'ACTIVE') {
      throw new Error(`Payment verification failed: ${verifyPayData.message}`);
    }
    logger.info('PASSED: Razorpay payment signature verified. Plan elevated to GROWTH.');

    // 10. Multi-Campus - Add Branch (Phase 2)
    logger.info('\nTest 11: Multi-Campus branch management...');
    const branchRes = await fetch(`${ORG_URL}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        organizationId: orgIdA,
        name: 'MIT North Campus',
        location: 'Boston, MA',
        address: '100 North St',
      }),
    });
    const branchData = await branchRes.json() as any;
    if (!branchRes.ok || !branchData.success) {
      throw new Error(`Add branch failed: ${branchData.message}`);
    }
    
    // List branches
    const listBranchRes = await fetch(`${ORG_URL}/${orgIdA}/branches`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listBranchData = await listBranchRes.json() as any;
    if (!listBranchRes.ok || listBranchData.data.length !== 1 || listBranchData.data[0].name !== 'MIT North Campus') {
      throw new Error('Failed to retrieve branch list.');
    }
    logger.info('PASSED: Branch added and listed successfully.');

    // 11. Enterprise SSO Restrictions
    logger.info('\nTest 12: Verifying Enterprise SSO restrictions...');
    
    // SSO should fail on GROWTH plan
    const ssoFailRes = await fetch(`${ORG_URL}/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        organizationId: orgIdA,
        ssoEnabled: true,
        ssoProvider: 'SAML',
      }),
    });
    if (ssoFailRes.status !== 403) {
      throw new Error('SSO enablement must fail on non-Enterprise subscription plans.');
    }
    logger.info('SSO correctly rejected for non-Enterprise plan.');

    // Upgrade directly to ENTERPRISE for testing
    await prisma.organization.update({
      where: { id: orgIdA },
      data: { subscriptionPlan: 'ENTERPRISE' },
    });

    // SSO configure should now succeed
    const ssoSuccessRes = await fetch(`${ORG_URL}/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        organizationId: orgIdA,
        ssoEnabled: true,
        ssoProvider: 'OIDC',
      }),
    });
    const ssoSuccessData = await ssoSuccessRes.json() as any;
    if (!ssoSuccessRes.ok || !ssoSuccessData.success || !ssoSuccessData.data.ssoEnabled) {
      throw new Error(`SSO configuration failed: ${ssoSuccessData.message}`);
    }
    logger.info('PASSED: SSO successfully configured on ENTERPRISE plan.');

    // 12. Redis Caching Operations
    logger.info('\nTest 13: Verifying Redis caching for organization details...');
    await redisClient.del(`organization:${orgIdA}`);

    let startTime = Date.now();
    await fetch(`${ORG_URL}/${orgIdA}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    logger.info(`First retrieve (DB query): ${Date.now() - startTime}ms`);

    const cachedOrg = await redisClient.get(`organization:${orgIdA}`);
    if (!cachedOrg) {
      throw new Error('Organization was not cached in Redis.');
    }
    logger.info('Verified key is present in Redis cache.');

    startTime = Date.now();
    await fetch(`${ORG_URL}/${orgIdA}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    logger.info(`Second retrieve (Redis served): ${Date.now() - startTime}ms`);

    // Invalidate
    logger.info('Triggering cache invalidation via update...');
    await fetch(`${ORG_URL}/${orgIdA}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: 'MIT New Name' }),
    });

    const evicted = await redisClient.get(`organization:${orgIdA}`);
    if (evicted) {
      throw new Error('Cache key was not evicted on profile update.');
    }
    logger.info('PASSED: Redis cache serving and eviction function verified.');

    // 13. Dashboard Metrics
    logger.info('\nTest 14: Verifying organization dashboard stats...');
    const dashRes = await fetch(`${ORG_URL}/dashboard?organizationId=${orgIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dashData = await dashRes.json() as any;
    if (!dashRes.ok || !dashData.success) {
      throw new Error(`Dashboard stats load failed: ${dashData.message}`);
    }
    
    logger.info(`Dashboard stats: ${JSON.stringify(dashData.data)}`);
    if (dashData.data.teamMembers !== 2 || dashData.data.subscriptionPlan !== 'ENTERPRISE') {
      throw new Error('Dashboard stats values are incorrect.');
    }
    logger.info('PASSED: Organization dashboard loaded successfully.');

    logger.info('\n==================================================');
    logger.info('ALL ORGANIZATION TESTS PASSED SUCCESSFULLY! :)');
    logger.info('==================================================');
    
    // Cleanup
    await redisClient.quit();
    await prisma.$disconnect();
    process.exit(0);

  } catch (error: any) {
    logger.error(`\nTEST SUITE FAILED: ${error.message}`);
    try {
      await redisClient.quit();
      await prisma.$disconnect();
    } catch (cleanupErr) {
      // Ignore
    }
    process.exit(1);
  }
}

runTests();
