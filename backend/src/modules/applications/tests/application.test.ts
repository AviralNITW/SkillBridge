import logger from '../../../config/logger';
import prisma from '../../../config/db';
import redisClient, { connectRedis } from '../../../config/redis';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const ORG_URL = 'http://localhost:5000/api/v1/organizations';
const OPP_URL = 'http://localhost:5000/api/v1/opportunities';
const APP_URL = 'http://localhost:5000/api/v1/applications';
const HEALTH_URL = 'http://localhost:5000/api/v1/health';

async function runTests() {
  logger.info('==================================================');
  logger.info('STARTING APPLICATION MODULE INTEGRATION TESTS');
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
    const emailStudentA = `student.a.${Date.now()}@example.com`;
    const emailStudentB = `student.b.${Date.now()}@example.com`;
    const emailStudentC = `student.c.${Date.now()}@example.com`;
    const emailStudentD = `student.d.${Date.now()}@example.com`;
    const emailStudentE = `student.e.${Date.now()}@example.com`;
    const emailCompany = `company.owner.app.${Date.now()}@example.com`;
    const emailAdmin = `admin.user.app.${Date.now()}@example.com`;
    const password = 'Password123!';

    let tokenStudentA = '';
    let tokenStudentB = '';
    let tokenStudentC = '';
    let tokenStudentD = '';
    let tokenStudentE = '';
    let tokenCompany = '';
    let tokenAdmin = '';

    let orgIdCompany = '';

    // Register & Login Helper
    async function registerAndLogin(email: string, role: 'STUDENT' | 'SCHOOL' | 'COMPANY' | 'MENTOR'): Promise<string> {
      try {
        const keys = await redisClient.keys('rate_limit:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (err) {}

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
    tokenStudentA = await registerAndLogin(emailStudentA, 'STUDENT');
    tokenStudentB = await registerAndLogin(emailStudentB, 'STUDENT');
    tokenStudentC = await registerAndLogin(emailStudentC, 'STUDENT');
    tokenStudentD = await registerAndLogin(emailStudentD, 'STUDENT');
    tokenStudentE = await registerAndLogin(emailStudentE, 'STUDENT');
    tokenCompany = await registerAndLogin(emailCompany, 'COMPANY');
    
    // Create Admin
    tokenAdmin = await registerAndLogin(emailAdmin, 'COMPANY');
    await prisma.user.update({
      where: { email: emailAdmin },
      data: { role: 'ADMIN' },
    });
    logger.info('PASSED: Users registered successfully.');

    // Approve Company organization
    const createOrgRes = await fetch(`${ORG_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({
        organizationType: 'COMPANY',
        name: 'AppCorp',
        email: 'jobs@appcorp.com',
        phone: '1234567890',
        website: 'https://appcorp.com',
        address: 'Bangalore, India',
        description: 'Global tech products and services.',
        industry: 'SOFTWARE',
        companySize: '500-1000',
        headquarters: 'Bangalore',
        foundedYear: 2012,
      }),
    });
    const createOrgData = await createOrgRes.json() as any;
    if (!createOrgRes.ok || !createOrgData.success) {
      throw new Error(`Organization creation failed: ${createOrgData.message}`);
    }
    orgIdCompany = createOrgData.data.id;

    // Admin approves organization
    const approveRes = await fetch(`${ORG_URL}/${orgIdCompany}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    if (!approveRes.ok) {
      throw new Error('Admin failed to approve organization verification.');
    }
    logger.info('PASSED: Organization registered and approved.');

    // Create Opportunities
    logger.info('\nTest 2: Creating opportunities for testing...');
    const deadlineDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days in future
    const expiredDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days in past

    // 1. Published Opportunity A
    const oppARes = await fetch(OPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({
        title: 'Backend Engineer',
        description: 'Developer role.',
        category: 'INTERNSHIP',
        mode: 'remote',
        deadline: deadlineDate,
        skillsRequired: ['Node.js'],
      }),
    });
    const oppAData = await oppARes.json() as any;
    if (!oppARes.ok) throw new Error(`Failed to create Opportunity A: ${oppAData.message}`);
    const oppIdA = oppAData.data.id;

    // 2. Draft Opportunity B
    const oppBRes = await fetch(`${OPP_URL}/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({
        title: 'Frontend Engineer',
        description: 'Draft role.',
        category: 'INTERNSHIP',
        mode: 'remote',
        deadline: deadlineDate,
        skillsRequired: ['React'],
      }),
    });
    const oppBData = await oppBRes.json() as any;
    if (!oppBRes.ok) throw new Error(`Failed to create Opportunity B: ${oppBData.message}`);
    const oppIdB = oppBData.data.id;

    // 3. Expired Opportunity C
    const oppCRes = await fetch(`${OPP_URL}/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({
        title: 'DevOps Engineer',
        description: 'Expired role.',
        category: 'INTERNSHIP',
        mode: 'remote',
        deadline: expiredDeadline,
        skillsRequired: ['Docker'],
      }),
    });
    const oppCData = await oppCRes.json() as any;
    if (!oppCRes.ok) throw new Error(`Failed to create Opportunity C: ${oppCData.message}`);
    const oppIdC = oppCData.data.id;

    // Publish Opportunity C (Admin bypasses checks or we update in DB)
    await prisma.opportunity.update({
      where: { id: oppIdC },
      data: { status: 'PUBLISHED' },
    });

    logger.info('PASSED: Opportunities created successfully.');

    // 3. Apply checks
    logger.info('\nTest 3: Testing application submission validation rules...');

    // Student A applying with no resume in profile and no custom upload should fail
    const applyFail1 = await fetch(APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentA}`,
      },
      body: JSON.stringify({
        opportunityId: oppIdA,
        useProfileResume: true,
      }),
    });
    if (applyFail1.status !== 400) {
      throw new Error(`Expected 400 for application with no resume, got ${applyFail1.status}`);
    }
    logger.info('PASSED: Blocked application with no resume.');

    // Add resume to Student A's profile
    const userA = await prisma.user.findUnique({ where: { email: emailStudentA } });
    await prisma.student.update({
      where: { userId: userA!.id },
      data: { resumeUrl: '/uploads/resumes/alice_profile_resume.pdf' },
    });

    // Student A applying to Draft Opportunity B should fail
    const applyFail2 = await fetch(APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentA}`,
      },
      body: JSON.stringify({
        opportunityId: oppIdB,
        useProfileResume: true,
      }),
    });
    if (applyFail2.status !== 400) {
      throw new Error(`Expected 400 for applying to draft opportunity, got ${applyFail2.status}`);
    }
    logger.info('PASSED: Blocked application to draft opportunity.');

    // Student A applying to Expired Opportunity C should fail
    const applyFail3 = await fetch(APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentA}`,
      },
      body: JSON.stringify({
        opportunityId: oppIdC,
        useProfileResume: true,
      }),
    });
    if (applyFail3.status !== 400) {
      throw new Error(`Expected 400 for applying to expired opportunity, got ${applyFail3.status}`);
    }
    logger.info('PASSED: Blocked application to expired opportunity.');

    // Student A applying to Opportunity A should succeed
    const applySuccess1 = await fetch(APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentA}`,
      },
      body: JSON.stringify({
        opportunityId: oppIdA,
        coverLetter: 'I am excited about Node.js!',
        useProfileResume: true,
      }),
    });
    const applyData1 = await applySuccess1.json() as any;
    if (!applySuccess1.ok || !applyData1.success) {
      throw new Error(`Application failed: ${applyData1.message}`);
    }
    const appIdA = applyData1.data.id;
    logger.info(`PASSED: Student A successfully applied. App ID: ${appIdA}`);

    // Student A applying to Opportunity A again should fail (duplicate block)
    const applyFail4 = await fetch(APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentA}`,
      },
      body: JSON.stringify({
        opportunityId: oppIdA,
        useProfileResume: true,
      }),
    });
    if (applyFail4.status !== 400) {
      throw new Error(`Expected 400 for duplicate application, got ${applyFail4.status}`);
    }
    logger.info('PASSED: Duplicate application blocked.');

    // 4. File Upload (Phase 2 Custom Resume)
    logger.info('\nTest 4: Submitting application with custom PDF resume upload...');
    
    // Construct FormData request for Student B
    const formData = new FormData();
    formData.append('opportunityId', oppIdA);
    formData.append('coverLetter', 'Cover letter for Student B');
    formData.append('useProfileResume', 'false');

    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
    const fileBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('resume', fileBlob, 'custom_resume.pdf');

    const uploadRes = await fetch(APP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenStudentB}`,
      },
      body: formData,
    });
    const uploadData = await uploadRes.json() as any;
    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(`Custom resume upload application failed: ${uploadData.message}`);
    }
    const appIdB = uploadData.data.id;
    if (!uploadData.data.resumeUrl.includes('/uploads/resumes/resume-') || !uploadData.data.resumeUrl.endsWith('.pdf')) {
      throw new Error(`Expected resumeUrl to start with /uploads/resumes/resume- and end with .pdf, got ${uploadData.data.resumeUrl}`);
    }
    logger.info(`PASSED: Student B applied with custom resume. App ID: ${appIdB}`);

    // 5. Withdraw workflow
    logger.info('\nTest 5: Testing application withdrawal...');
    
    // Student B attempts to withdraw Student A's application -> fail
    const withdrawFail = await fetch(`${APP_URL}/${appIdA}/withdraw`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    if (withdrawFail.status !== 403) {
      throw new Error(`Expected 403 when withdrawing another student's application, got ${withdrawFail.status}`);
    }

    // Student A withdraws their own application -> success
    const withdrawSuccess = await fetch(`${APP_URL}/${appIdA}/withdraw`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    const withdrawData = await withdrawSuccess.json() as any;
    if (!withdrawSuccess.ok || withdrawData.data.status !== 'WITHDRAWN') {
      throw new Error(`Withdrawal failed: ${withdrawData.message}`);
    }
    logger.info('PASSED: Application successfully withdrawn and permissions verified.');

    // 6. Review and Status Transitions
    logger.info('\nTest 6: Reviewing application status transitions & Rule 5 enforcement...');
    
    // Under review
    const statusReviewRes = await fetch(`${APP_URL}/${appIdB}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({ status: 'UNDER_REVIEW', remarks: 'Looking good so far' }),
    });
    const statusReviewData = await statusReviewRes.json() as any;
    if (!statusReviewRes.ok || statusReviewData.data.status !== 'UNDER_REVIEW') {
      throw new Error(`Under review transition failed: ${statusReviewData.message}`);
    }

    // Shortlist
    const statusShortlistRes = await fetch(`${APP_URL}/${appIdB}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({ status: 'SHORTLISTED', remarks: 'Shortlisted for interview' }),
    });
    if (!statusShortlistRes.ok) throw new Error('Shortlist transition failed');

    // Reject Student B
    const statusRejectRes = await fetch(`${APP_URL}/${appIdB}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({ status: 'REJECTED', remarks: 'Failed interview' }),
    });
    if (!statusRejectRes.ok) throw new Error('Reject transition failed');

    // Verify Rule 5: Rejected application cannot transition to ACCEPTED
    const rule5Res = await fetch(`${APP_URL}/${appIdB}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({ status: 'ACCEPTED', remarks: 'Let us try to accept anyway' }),
    });
    if (rule5Res.status !== 400) {
      throw new Error(`Expected 400 for Rule 5 violation (Rejected -> Accepted), got ${rule5Res.status}`);
    }
    logger.info('PASSED: Status transitions and Rule 5 successfully validated.');

    // 7. Success Lifecycle: Student C (Submitted -> Under Review -> Shortlist -> Accepted -> In Progress -> Completed)
    logger.info('\nTest 7: Validating successful lifecycle path (Student C)...');
    
    // Add resume to Student C
    const userC = await prisma.user.findUnique({ where: { email: emailStudentC } });
    await prisma.student.update({
      where: { userId: userC!.id },
      data: { resumeUrl: '/uploads/resumes/charlie_resume.pdf' },
    });

    // Apply
    const applyC = await fetch(APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentC}`,
      },
      body: JSON.stringify({ opportunityId: oppIdA, useProfileResume: true }),
    });
    const applyCData = await applyC.json() as any;
    const appIdC = applyCData.data.id;

    const statuses: ('UNDER_REVIEW' | 'SHORTLISTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED')[] = [
      'UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'
    ];

    for (const stepStatus of statuses) {
      const updateStep = await fetch(`${APP_URL}/${appIdC}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenCompany}`,
        },
        body: JSON.stringify({ status: stepStatus }),
      });
      if (!updateStep.ok) {
        const errData = await updateStep.json() as any;
        throw new Error(`Failed lifecycle transition to ${stepStatus}: ${errData.message}`);
      }
    }
    logger.info('PASSED: Full lifecycle path completed.');

    // 8. Bulk updates (Phase 2 Bulk Actions)
    logger.info('\nTest 8: Testing bulk status updates (Students D & E)...');
    
    // Setup Student D & E
    const userD = await prisma.user.findUnique({ where: { email: emailStudentD } });
    await prisma.student.update({
      where: { userId: userD!.id },
      data: { resumeUrl: '/uploads/resumes/d.pdf' },
    });
    const userE = await prisma.user.findUnique({ where: { email: emailStudentE } });
    await prisma.student.update({
      where: { userId: userE!.id },
      data: { resumeUrl: '/uploads/resumes/e.pdf' },
    });

    const applyD = await fetch(APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudentD}` },
      body: JSON.stringify({ opportunityId: oppIdA, useProfileResume: true }),
    });
    const appIdD = ((await applyD.json()) as any).data.id;

    const applyE = await fetch(APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudentE}` },
      body: JSON.stringify({ opportunityId: oppIdA, useProfileResume: true }),
    });
    const appIdE = ((await applyE.json()) as any).data.id;

    // Bulk update to SHORTLISTED
    const bulkRes = await fetch(`${APP_URL}/bulk-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body: JSON.stringify({
        applicationIds: [appIdD, appIdE],
        status: 'SHORTLISTED',
        remarks: 'Bulk shortlisting candidates',
      }),
    });
    const bulkData = await bulkRes.json() as any;
    if (!bulkRes.ok || !bulkData.success) {
      throw new Error(`Bulk shortlist failed: ${bulkData.message}`);
    }

    // Verify DB update
    const appD = await prisma.application.findUnique({ where: { id: appIdD } });
    const appE = await prisma.application.findUnique({ where: { id: appIdE } });
    if (appD!.status !== 'SHORTLISTED' || appE!.status !== 'SHORTLISTED') {
      throw new Error('Bulk update failed to update statuses in DB.');
    }
    logger.info('PASSED: Bulk status updates verified.');

    // 9. Internal Notes (Phase 2)
    logger.info('\nTest 9: Verifying internal organizational notes privacy...');

    // Add note
    const noteRes = await fetch(`${APP_URL}/${appIdC}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body: JSON.stringify({ note: 'Superb project portfolio' }),
    });
    const noteData = await noteRes.json() as any;
    if (!noteRes.ok || !noteData.success) {
      throw new Error(`Adding note failed: ${noteData.message}`);
    }

    // Retrieve as Company -> should see note
    const getCompanyApp = await fetch(`${APP_URL}/${appIdC}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const getCompanyAppData = await getCompanyApp.json() as any;
    if (!getCompanyAppData.data.notes || getCompanyAppData.data.notes.length === 0) {
      throw new Error('Company was unable to retrieve application notes.');
    }

    // Retrieve as Student C -> should NOT see note
    const getStudentApp = await fetch(`${APP_URL}/${appIdC}`, {
      headers: { Authorization: `Bearer ${tokenStudentC}` },
    });
    const getStudentAppData = await getStudentApp.json() as any;
    if (getStudentAppData.data.notes) {
      throw new Error('Student was able to retrieve private internal notes!');
    }
    logger.info('PASSED: Internal notes are correctly restricted to organization members.');

    // 10. Dashboard Analytics Metrics (Phase 2)
    logger.info('\nTest 10: Verifying application dashboard metrics calculation...');
    
    const statsRes = await fetch(`${APP_URL}/dashboard-metrics?opportunityId=${oppIdA}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const statsData = await statsRes.json() as any;
    if (!statsRes.ok || !statsData.success) {
      throw new Error(`Stats retrieval failed: ${statsData.message}`);
    }

    const metrics = statsData.data;
    logger.info(`Metrics for Opp ${oppIdA}: ${JSON.stringify(metrics)}`);
    // Expected:
    // - Student A: WITHDRAWN (1)
    // - Student B: REJECTED (1)
    // - Student C: COMPLETED (1)
    // - Student D: SHORTLISTED (1)
    // - Student E: SHORTLISTED (1)
    // Total = 5
    if (metrics.total !== 5) {
      throw new Error(`Expected total 5 applications, got ${metrics.total}`);
    }
    if (metrics.REJECTED !== 1 || metrics.COMPLETED !== 1 || metrics.SHORTLISTED !== 2 || metrics.WITHDRAWN !== 1) {
      throw new Error('Status breakdown is incorrect.');
    }
    logger.info('PASSED: Dashboard metrics computed correctly.');

    // 11. Redis Cache details & invalidation (Phase 2)
    logger.info('\nTest 11: Testing Application details Redis caching & invalidation...');

    const cacheKey = `application:${appIdD}`;
    await redisClient.del(cacheKey);

    // First retrieve -> caches it
    let startTime = Date.now();
    await fetch(`${APP_URL}/${appIdD}`, { headers: { Authorization: `Bearer ${tokenStudentD}` } });
    const queryTime1 = Date.now() - startTime;
    logger.info(`First retrieve (DB query): ${queryTime1}ms`);

    // Verify cache exists
    const cachedApp = await redisClient.get(cacheKey);
    if (!cachedApp) {
      throw new Error('Application details were not cached in Redis.');
    }

    // Second retrieve -> hits cache
    startTime = Date.now();
    await fetch(`${APP_URL}/${appIdD}`, { headers: { Authorization: `Bearer ${tokenStudentD}` } });
    const queryTime2 = Date.now() - startTime;
    logger.info(`Second retrieve (Redis served): ${queryTime2}ms`);

    // Trigger update -> invalidates cache
    await fetch(`${APP_URL}/${appIdD}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });

    const evictedApp = await redisClient.get(cacheKey);
    if (evictedApp) {
      throw new Error('Cache was not evicted on status update.');
    }
    logger.info('PASSED: Redis cache serving and invalidation validated.');

    logger.info('\n==================================================');
    logger.info('ALL APPLICATION MODULE TESTS PASSED SUCCESSFULLY! :)');
    logger.info('==================================================');

    await redisClient.quit();
    await prisma.$disconnect();
    process.exit(0);

  } catch (error: any) {
    logger.error(`\nTEST SUITE FAILED: ${error.message}`);
    try {
      await redisClient.quit();
      await prisma.$disconnect();
    } catch (cleanupErr) {}
    process.exit(1);
  }
}

runTests();
