import logger from '../../../config/logger';
import prisma from '../../../config/db';
import redisClient, { connectRedis } from '../../../config/redis';
import { runExpiryCleanup } from '../jobs/opportunity.jobs';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const ORG_URL = 'http://localhost:5000/api/v1/organizations';
const OPP_URL = 'http://localhost:5000/api/v1/opportunities';
const HEALTH_URL = 'http://localhost:5000/api/v1/health';

async function runTests() {
  logger.info('==================================================');
  logger.info('STARTING OPPORTUNITY MODULE INTEGRATION TESTS');
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
    const emailStudent = `student.${Date.now()}@example.com`;
    const emailCompany = `company.owner.${Date.now()}@example.com`;
    const emailMentor = `mentor.owner.${Date.now()}@example.com`;
    const emailAdmin = `admin.user.${Date.now()}@example.com`;
    const password = 'Password123!';

    let tokenStudent = '';
    let tokenCompany = '';
    let tokenMentor = '';
    let tokenAdmin = '';

    let orgIdCompany = '';

    // Register & Login Helper (clears rate limit keys to prevent 429)
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
    tokenStudent = await registerAndLogin(emailStudent, 'STUDENT');
    tokenCompany = await registerAndLogin(emailCompany, 'COMPANY');
    tokenMentor = await registerAndLogin(emailMentor, 'MENTOR');
    
    // Create Admin
    tokenAdmin = await registerAndLogin(emailAdmin, 'MENTOR');
    await prisma.user.update({
      where: { email: emailAdmin },
      data: { role: 'ADMIN' },
    });
    logger.info('PASSED: Users registered successfully.');

    // Connect Student profile details for recommendations matching
    const studentUser = await prisma.user.findUnique({ where: { email: emailStudent } });
    if (!studentUser) throw new Error('Student user not found');

    const studentRecord = await prisma.student.upsert({
      where: { userId: studentUser.id },
      create: {
        userId: studentUser.id,
        firstName: 'Alice',
        lastName: 'Developer',
        bio: 'Aspiring backend engineer interested in Node.js, databases and backend architecture in India.',
        profileCompletion: 50,
      },
      update: {
        firstName: 'Alice',
        lastName: 'Developer',
        bio: 'Aspiring backend engineer interested in Node.js, databases and backend architecture in India.',
        profileCompletion: 50,
      },
    });

    await prisma.studentSkill.createMany({
      data: [
        { studentId: studentRecord.id, skillName: 'Node.js', proficiencyLevel: 'INTERMEDIATE', yearsOfExperience: 1 },
        { studentId: studentRecord.id, skillName: 'TypeScript', proficiencyLevel: 'BEGINNER', yearsOfExperience: 1 },
      ],
    });

    await prisma.studentEducation.create({
      data: {
        studentId: studentRecord.id,
        institutionName: 'State Tech University',
        degree: 'Bachelor of Technology',
        specialization: 'Computer Science',
        cgpa: 8.5,
        startYear: 2022,
        endYear: 2026,
      },
    });

    // Create Company Organization Profile
    const createOrgRes = await fetch(`${ORG_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({
        organizationType: 'COMPANY',
        name: 'OmniCorp Tech',
        email: 'jobs@omnicorp.com',
        phone: '1234567890',
        website: 'https://omnicorp.com',
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
    logger.info(`PASSED: Student profile set up and Company organization created. Org ID: ${orgIdCompany}`);

    // 2. Save Draft Opportunity
    logger.info('\nTest 2: Saving opportunity as draft (Company Owner)...');
    const deadlineDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days in future
    const draftRes = await fetch(`${OPP_URL}/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({
        title: 'Backend NodeJS Developer',
        description: 'Exciting Backend developer role using Node.js and Express.',
        category: 'INTERNSHIP',
        mode: 'remote',
        location: 'India',
        durationWeeks: 12,
        stipend: 15000.00,
        currency: 'INR',
        openings: 3,
        deadline: deadlineDate,
        skillsRequired: ['Node.js', 'Express', 'PostgreSQL'],
        tags: ['backend', 'nodejs', 'web'],
      }),
    });
    const draftData = await draftRes.json() as any;
    if (!draftRes.ok || !draftData.success) {
      throw new Error(`Draft save failed: ${draftData.message}`);
    }
    const oppIdDraft = draftData.data.id;
    if (draftData.data.status !== 'DRAFT') {
      throw new Error(`Expected status DRAFT, got: ${draftData.data.status}`);
    }
    logger.info(`PASSED: Opportunity draft saved. ID: ${oppIdDraft}`);

    // 3. Publish Restriction: Verify unverified organization publication fails
    logger.info('\nTest 3: Testing publishing restrictions for unverified organization...');
    
    // Try immediate publish
    const immediateRes = await fetch(OPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({
        title: 'Instant Opportunity',
        description: 'Should fail immediately.',
        category: 'INTERNSHIP',
        mode: 'remote',
        skillsRequired: ['Git'],
        deadline: deadlineDate,
      }),
    });
    if (immediateRes.status !== 403) {
      throw new Error(`Expected status 403 for immediate publish by unverified org, got ${immediateRes.status}`);
    }

    // Try draft publish
    const publishRes = await fetch(`${OPP_URL}/${oppIdDraft}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    if (publishRes.status !== 403) {
      throw new Error(`Expected status 403 for publishing draft by unverified org, got ${publishRes.status}`);
    }
    logger.info('PASSED: Publishing was correctly blocked (403) for unverified organization.');

    // 4. Verification & Publish Opportunity
    logger.info('\nTest 4: Approving organization verification and publishing opportunity...');
    
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

    // Publish draft now
    const publishSuccessRes = await fetch(`${OPP_URL}/${oppIdDraft}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const publishSuccessData = await publishSuccessRes.json() as any;
    if (!publishSuccessRes.ok || publishSuccessData.data.status !== 'PUBLISHED') {
      throw new Error(`Publish failed: ${publishSuccessData.message}`);
    }
    logger.info('PASSED: Organization verified and opportunity published successfully.');

    // 5. Create Published Opportunity Directly (Mentor)
    logger.info('\nTest 5: Creating opportunity published directly (Verified Mentor)...');
    
    // Verify Mentor directly in DB
    const mentorUser = await prisma.user.findUnique({ where: { email: emailMentor } });
    if (!mentorUser) throw new Error('Mentor user not found');
    await prisma.mentor.upsert({
      where: { userId: mentorUser.id },
      create: {
        userId: mentorUser.id,
        specialization: 'Physics Research',
        experienceYears: 5,
        verified: true,
      },
      update: {
        specialization: 'Physics Research',
        experienceYears: 5,
        verified: true,
      },
    });

    const mentorOppRes = await fetch(OPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenMentor}`,
      },
      body: JSON.stringify({
        title: 'Quantum Mechanics Research Project',
        description: 'Advanced academic study on quantum physics systems.',
        category: 'RESEARCH_PROJECT',
        mode: 'onsite',
        location: 'New York',
        durationWeeks: 16,
        stipend: 0,
        currency: 'USD',
        openings: 2,
        deadline: deadlineDate,
        skillsRequired: ['Physics', 'Mathematics', 'Python'],
        tags: ['academic', 'quantum'],
      }),
    });
    const mentorOppData = await mentorOppRes.json() as any;
    if (!mentorOppRes.ok || mentorOppData.data.status !== 'PUBLISHED') {
      throw new Error(`Mentor opportunity creation failed: ${mentorOppData.message}`);
    }
    const oppIdMentor = mentorOppData.data.id;
    logger.info(`PASSED: Mentor published opportunity directly. ID: ${oppIdMentor}`);

    // 6. Get Opportunity details and check views recording
    logger.info('\nTest 6: Retrieving opportunity details and validating view tracking...');
    
    // View as Student
    const viewRes = await fetch(`${OPP_URL}/${oppIdDraft}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const viewData = await viewRes.json() as any;
    if (!viewRes.ok || viewData.data.title !== 'Backend NodeJS Developer') {
      throw new Error(`Failed to fetch opportunity: ${viewData.message}`);
    }

    // Verify view got recorded in database
    const viewsCount = await prisma.opportunityView.count({
      where: { opportunityId: oppIdDraft },
    });
    if (viewsCount === 0) {
      throw new Error('View was not recorded in database.');
    }
    logger.info('PASSED: Opportunity retrieved and student view recorded successfully.');

    // 7. Search and Filtering
    logger.info('\nTest 7: Testing opportunities search and filtering...');
    
    // Search by text
    const searchRes = await fetch(`${OPP_URL}?search=nodejs`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const searchData = await searchRes.json() as any;
    if (searchData.data.items.length === 0 || searchData.data.items[0].title !== 'Backend NodeJS Developer') {
      throw new Error('Search failed to find NodeJS Developer opportunity.');
    }

    // Filter by mode
    const modeRes = await fetch(`${OPP_URL}?mode=remote`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const modeData = await modeRes.json() as any;
    if (modeData.data.items.some((item: any) => item.mode !== 'remote')) {
      throw new Error('Mode filter failed. Found non-remote opportunities.');
    }

    // Filter by paid (stipend > 0)
    const paidRes = await fetch(`${OPP_URL}?paid=true`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const paidData = await paidRes.json() as any;
    if (paidData.data.items.some((item: any) => parseFloat(item.stipend) <= 0)) {
      throw new Error('Paid filter failed. Found unpaid opportunities.');
    }
    logger.info('PASSED: Search, mode, and stipend filters match results correctly.');

    // 8. Bookmarks Workflow
    logger.info('\nTest 8: Testing opportunity bookmarks management...');
    
    // Add Bookmark
    const bookRes = await fetch(`${OPP_URL}/${oppIdDraft}/bookmark`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const bookData = await bookRes.json() as any;
    if (!bookRes.ok || !bookData.success) {
      throw new Error(`Bookmark addition failed: ${bookData.message}`);
    }

    // List Bookmarks via /my-opportunities
    const listRes = await fetch(`${OPP_URL}/my-opportunities`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const listData = await listRes.json() as any;
    if (listData.data.length !== 1 || listData.data[0].opportunity.id !== oppIdDraft) {
      throw new Error('Student bookmarks list incorrect.');
    }

    // Remove Bookmark
    const unbookRes = await fetch(`${OPP_URL}/${oppIdDraft}/bookmark`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    if (!unbookRes.ok) {
      throw new Error('Failed to delete bookmark.');
    }
    logger.info('PASSED: Bookmark successfully added, listed, and removed.');

    // 9. Recommendations Engine MVP Matching Score check
    logger.info('\nTest 9: Verifying recommendation matching score calculation...');
    
    const recRes = await fetch(`${OPP_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const recData = await recRes.json() as any;
    if (!recRes.ok || recData.data.length === 0) {
      throw new Error(`Recommendations fetch failed: ${recData.message}`);
    }

    // Let's assert matchingScore calculations for Student Alice:
    // Student Alice has:
    // - skills: ["Node.js", "TypeScript"]
    // - education specialization: "Computer Science"
    // - bio: contains "India"
    // For "Backend NodeJS Developer":
    // - required skills: ["Node.js", "Express", "PostgreSQL"] -> Intersection is ["Node.js"] -> 1/3 skill match = 20 pts (60% weight)
    // - category: "INTERNSHIP" -> Alice study "Computer Science" doesn't strictly contain "INTERNSHIP", no bookmarks/applications yet -> 0 pts (20% weight)
    // - mode: "remote" -> 20 pts (20% weight)
    // Total expected score: 20 (skill) + 0 (category) + 20 (location) = 40 pts
    const nodejsRec = recData.data.find((item: any) => item.id === oppIdDraft);
    if (!nodejsRec) {
      throw new Error('Backend NodeJS Developer was missing from recommendations.');
    }
    logger.info(`Matching score for Backend NodeJS Developer: ${nodejsRec.matchingScore}`);
    if (nodejsRec.matchingScore !== 40) {
      throw new Error(`Expected matchingScore 40, got: ${nodejsRec.matchingScore}`);
    }
    logger.info('PASSED: Matching recommendations score correctly calculated.');

    // 10. Background Cron Job Expiry closing
    logger.info('\nTest 10: Verifying background cron job expiry close...');
    
    // Set a published opportunity deadline to the past
    await prisma.opportunity.update({
      where: { id: oppIdMentor },
      data: {
        deadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      },
    });

    // Run cleanups
    const closedCount = await runExpiryCleanup();
    if (closedCount !== 1) {
      throw new Error(`Expected 1 opportunity to be closed by cron job, got: ${closedCount}`);
    }

    // Verify DB update
    const expiredOpp = await prisma.opportunity.findUnique({ where: { id: oppIdMentor } });
    if (!expiredOpp || expiredOpp.status !== 'CLOSED') {
      throw new Error('Opportunity status was not changed to CLOSED.');
    }
    logger.info('PASSED: Cron cleanup correctly closed expired opportunity.');

    // 11. Redis Cache Details & Invalidation
    logger.info('\nTest 11: Testing Redis caching details and eviction...');
    
    const redisKey = `opportunity:${oppIdDraft}`;
    await redisClient.del(redisKey);

    // Initial retrieve (DB query)
    let startTime = Date.now();
    await fetch(`${OPP_URL}/${oppIdDraft}`, { headers: { Authorization: `Bearer ${tokenStudent}` } });
    const dbQueryTime = Date.now() - startTime;
    logger.info(`First retrieve (DB Query): ${dbQueryTime}ms`);

    // Verify cache presence
    const cached = await redisClient.get(redisKey);
    if (!cached) {
      throw new Error('Opportunity detail was not cached in Redis.');
    }

    // Second retrieve (served from Redis)
    startTime = Date.now();
    await fetch(`${OPP_URL}/${oppIdDraft}`, { headers: { Authorization: `Bearer ${tokenStudent}` } });
    const redisQueryTime = Date.now() - startTime;
    logger.info(`Second retrieve (Redis served): ${redisQueryTime}ms`);

    // Trigger update -> should evict cache key
    await fetch(`${OPP_URL}/${oppIdDraft}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompany}`,
      },
      body: JSON.stringify({ openings: 4 }),
    });

    // Verify cache eviction
    const evicted = await redisClient.get(redisKey);
    if (evicted) {
      throw new Error('Cache key was not evicted on opportunity update.');
    }
    logger.info('PASSED: Caching detail serving and eviction logic validated.');

    logger.info('\n==================================================');
    logger.info('ALL OPPORTUNITY MODULE TESTS PASSED SUCCESSFULLY! :)');
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
    } catch (cleanupErr) {}
    process.exit(1);
  }
}

runTests();
