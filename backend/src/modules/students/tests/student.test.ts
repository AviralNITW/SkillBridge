import logger from '../../../config/logger';
import prisma from '../../../config/db';
import redisClient, { connectRedis } from '../../../config/redis';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const STUDENT_URL = 'http://localhost:5000/api/v1/students';
const HEALTH_URL = 'http://localhost:5000/api/v1/health';

async function runTests() {
  logger.info('==================================================');
  logger.info('STARTING STUDENT LIFECYCLE & SCORING TESTS');
  logger.info('==================================================');

  try {
    // Connect to Redis for caching tests
    await connectRedis();
    // 0. Verify Service Health
    logger.info('Test 0: Checking service health...');
    const healthRes = await fetch(HEALTH_URL);
    if (!healthRes.ok) {
      throw new Error(`Health check failed. Server might not be running: ${healthRes.statusText}`);
    }
    const health = await healthRes.json() as any;
    if (health.services.database !== 'UP' || health.services.redis !== 'UP') {
      throw new Error('Postgres or Redis services are not ready in health check.');
    }
    logger.info('PASSED: Health check verified database and redis connection');

    // Setup emails and password
    const emailA = `student.a.${Date.now()}@example.com`;
    const emailB = `student.b.${Date.now()}@example.com`;
    const emailCompany = `company.${Date.now()}@example.com`;
    const emailAdmin = `admin.${Date.now()}@example.com`;
    const password = 'Password123!';

    let tokenA = '';
    let tokenB = '';
    let tokenCompany = '';
    let tokenAdmin = '';

    let studentIdA = '';
    let studentIdB = '';

    // Helpers to register and verify users
    async function registerAndVerify(email: string, role: 'STUDENT' | 'COMPANY'): Promise<string> {
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
      return loginData.data.accessToken;
    }

    // 1. Register & Login Student A, Student B, and Company
    logger.info('\nTest 1: Registering and logging in Student A, Student B, and Company...');
    tokenA = await registerAndVerify(emailA, 'STUDENT');
    tokenB = await registerAndVerify(emailB, 'STUDENT');
    tokenCompany = await registerAndVerify(emailCompany, 'COMPANY');

    // Register & elevate Admin directly in DB
    const adminRegRes = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'System',
        lastName: 'Admin',
        email: emailAdmin,
        password,
        role: 'MENTOR', // Temporarily MENTOR during registration
      }),
    });
    const adminRegData = await adminRegRes.json() as any;
    const adminVerifyToken = adminRegData.verificationLink.split('/').pop();
    await fetch(`${AUTH_URL}/verify-email/${adminVerifyToken}`);

    // Elevate in Postgres
    await prisma.user.update({
      where: { email: emailAdmin },
      data: { role: 'ADMIN' },
    });

    const adminLoginRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAdmin, password }),
    });
    const adminLoginData = await adminLoginRes.json() as any;
    tokenAdmin = adminLoginData.data.accessToken;

    logger.info('PASSED: Registered and logged in all role accounts.');

    // 2. Fetch Initial Student Profile A
    logger.info('\nTest 2: Fetching initial Student A profile...');
    const profileResA = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const profileDataA = await profileResA.json() as any;
    if (!profileDataA.success) {
      throw new Error(`Failed to fetch Student A profile: ${profileDataA.message}`);
    }
    studentIdA = profileDataA.data.id;
    logger.info(`Initial completion: ${profileDataA.data.profileCompletion}%`);
    logger.info(`Initial employability: ${profileDataA.data.employabilityScore}`);
    
    if (profileDataA.data.profileCompletion !== 0 || profileDataA.data.employabilityScore !== 0) {
      throw new Error('Initial scores should be 0.');
    }
    logger.info('PASSED: Student A profile initialized at 0% completion and 0 employability.');

    // Get Student B ID too
    const profileResB = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const profileDataB = await profileResB.json() as any;
    studentIdB = profileDataB.data.id;

    // 3. Initialize/Update Profile A with Date of Birth, Gender, Bio
    logger.info('\nTest 3: Updating Student A profile with DOB, Gender, and Bio...');
    const updateProfileRes = await fetch(`${STUDENT_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        dateOfBirth: '2001-09-18',
        gender: 'Male',
        bio: 'Aspiring Full Stack Engineer and AI Developer',
      }),
    });
    const updateProfileData = await updateProfileRes.json() as any;
    if (!updateProfileData.success) {
      throw new Error(`Profile update failed: ${updateProfileData.message}`);
    }
    
    // Completion: Bio (10%) = 10%
    // Employability: Profile Completion pts = Math.round((10/100)*5) = 1
    const pAfterUpdate = updateProfileData.data;
    logger.info(`After Profile Update: Completion = ${pAfterUpdate.profileCompletion}%, Employability = ${pAfterUpdate.employabilityScore}`);
    if (pAfterUpdate.profileCompletion !== 10 || pAfterUpdate.employabilityScore !== 1) {
      throw new Error('Scores after profile update are incorrect.');
    }
    logger.info('PASSED: DOB, Gender, and Bio updated. Recalculated profile completion to 10% and employability to 1.');

    // 4. Add a Skill
    logger.info('\nTest 4: Adding skill to Student A profile...');
    const addSkillRes = await fetch(`${STUDENT_URL}/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        skillName: 'TypeScript',
        proficiencyLevel: 'ADVANCED',
        yearsOfExperience: 3,
      }),
    });
    const addSkillData = await addSkillRes.json() as any;
    if (!addSkillData.success) {
      throw new Error(`Adding skill failed: ${addSkillData.message}`);
    }
    const skillId = addSkillData.data.id;

    // Re-fetch profile A to verify scores
    const pAfterSkillRes = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pAfterSkill = (await pAfterSkillRes.json() as any).data;
    // Completion: Bio (10%) + Skills (20%) = 30%
    // Employability: Skills (1 * 6 = 6) + Profile Completion pts = Math.round((30/100)*5) = 2 -> Total = 8
    logger.info(`After Skill Add: Completion = ${pAfterSkill.profileCompletion}%, Employability = ${pAfterSkill.employabilityScore}`);
    if (pAfterSkill.profileCompletion !== 30 || pAfterSkill.employabilityScore !== 8) {
      throw new Error('Scores after skill addition are incorrect.');
    }
    logger.info('PASSED: Skill added. Profile completion updated to 30% and employability to 8.');

    // 5. Add Education Record
    logger.info('\nTest 5: Adding education record to Student A...');
    const addEduRes = await fetch(`${STUDENT_URL}/education`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        institutionName: 'Stanford University',
        degree: 'Bachelor of Science',
        specialization: 'Computer Science',
        cgpa: 3.85,
        startYear: 2020,
        endYear: 2024,
      }),
    });
    const addEduData = await addEduRes.json() as any;
    if (!addEduData.success) {
      throw new Error(`Adding education failed: ${addEduData.message}`);
    }

    // Re-fetch profile A
    const pAfterEduRes = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pAfterEdu = (await pAfterEduRes.json() as any).data;
    // Completion: Bio (10%) + Skills (20%) + Education (20%) = 50%
    // Employability: Education (20) + Skills (6) + Profile Completion pts = Math.round((50/100)*5) = 3 -> Total = 29
    logger.info(`After Education Add: Completion = ${pAfterEdu.profileCompletion}%, Employability = ${pAfterEdu.employabilityScore}`);
    if (pAfterEdu.profileCompletion !== 50 || pAfterEdu.employabilityScore !== 29) {
      throw new Error('Scores after education addition are incorrect.');
    }
    logger.info('PASSED: Education added. Profile completion updated to 50% and employability to 29.');

    // 6. Add Project Record
    logger.info('\nTest 6: Adding project record to Student A...');
    const addProjRes = await fetch(`${STUDENT_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'SkillBridge Backend Portal',
        description: 'Designed and built the microservices backend architecture',
        techStack: 'Node.js, Express, TypeScript, Prisma, Redis',
        githubUrl: 'https://github.com/test/skillbridge',
      }),
    });
    const addProjData = await addProjRes.json() as any;
    if (!addProjData.success) {
      throw new Error(`Adding project failed: ${addProjData.message}`);
    }

    // Re-fetch profile A
    const pAfterProjRes = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pAfterProj = (await pAfterProjRes.json() as any).data;
    // Completion: Bio (10%) + Skills (20%) + Education (20%) + Projects (20%) = 70%
    // Employability: Education (20) + Skills (6) + Projects (10) + Profile Completion pts = Math.round((70/100)*5) = 4 -> Total = 40
    logger.info(`After Project Add: Completion = ${pAfterProj.profileCompletion}%, Employability = ${pAfterProj.employabilityScore}`);
    if (pAfterProj.profileCompletion !== 70 || pAfterProj.employabilityScore !== 40) {
      throw new Error('Scores after project addition are incorrect.');
    }
    logger.info('PASSED: Project added. Profile completion updated to 70% and employability to 40.');

    // 7. Add Achievement Record
    logger.info('\nTest 7: Adding achievement record to Student A...');
    const addAchRes = await fetch(`${STUDENT_URL}/achievements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'First Place Hackathon Winner',
        description: 'Won the annual tech innovation hackathon',
        achievementDate: '2025-11-20',
      }),
    });
    const addAchData = await addAchRes.json() as any;
    if (!addAchData.success) {
      throw new Error(`Adding achievement failed: ${addAchData.message}`);
    }

    // Re-fetch profile A
    const pAfterAchRes = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pAfterAch = (await pAfterAchRes.json() as any).data;
    // Completion: 70% (Achievements do not impact completion percentage)
    // Employability: Education (20) + Skills (6) + Projects (10) + Achievements (5) + Completion pts (4) = 45
    logger.info(`After Achievement Add: Completion = ${pAfterAch.profileCompletion}%, Employability = ${pAfterAch.employabilityScore}`);
    if (pAfterAch.profileCompletion !== 70 || pAfterAch.employabilityScore !== 45) {
      throw new Error('Scores after achievement addition are incorrect.');
    }
    logger.info('PASSED: Achievement added. Employability updated to 45.');

    // 8. Upload Mock Resume (PDF)
    logger.info('\nTest 8: Uploading resume PDF...');
    const resumeFormData = new FormData();
    const mockPdf = new Blob(['%PDF-1.4 Mock PDF Content'], { type: 'application/pdf' });
    resumeFormData.append('resume', mockPdf, 'my_resume.pdf');

    const uploadResumeRes = await fetch(`${STUDENT_URL}/resume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: resumeFormData,
    });
    const uploadResumeData = await uploadResumeRes.json() as any;
    if (!uploadResumeRes.ok || !uploadResumeData.success) {
      throw new Error(`Resume upload failed: ${uploadResumeData.message}`);
    }

    // Re-fetch profile A
    const pAfterResumeRes = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pAfterResume = (await pAfterResumeRes.json() as any).data;
    // Completion: Bio (10) + Skills (20) + Education (20) + Projects (20) + Resume (10) = 80%
    // Employability: Education (20) + Skills (6) + Projects (10) + Achievements (5) + Completion pts (4) = 45
    logger.info(`After Resume Upload: Completion = ${pAfterResume.profileCompletion}%, Employability = ${pAfterResume.employabilityScore}`);
    if (pAfterResume.profileCompletion !== 80 || pAfterResume.employabilityScore !== 45) {
      throw new Error('Scores after resume upload are incorrect.');
    }
    logger.info('PASSED: Resume uploaded. Profile completion updated to 80% and employability remains 45.');

    // 9. Upload Mock Certificate
    logger.info('\nTest 9: Uploading certificate PDF...');
    const certFormData = new FormData();
    certFormData.append('certificate', mockPdf, 'aws_solutions_architect.pdf');
    certFormData.append('certificateName', 'AWS Solutions Architect');
    certFormData.append('issuer', 'Amazon Web Services');
    certFormData.append('issueDate', '2026-01-15');

    const uploadCertRes = await fetch(`${STUDENT_URL}/certificates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: certFormData,
    });
    const uploadCertData = await uploadCertRes.json() as any;
    if (!uploadCertRes.ok || !uploadCertData.success) {
      throw new Error(`Certificate upload failed: ${uploadCertData.message}`);
    }

    // Re-fetch profile A
    const pAfterCertRes = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pAfterCert = (await pAfterCertRes.json() as any).data;
    // Completion: Bio (10) + Skills (20) + Education (20) + Projects (20) + Resume (10) + Certificates (10) = 90%
    // Employability: Education (20) + Skills (6) + Projects (10) + Certificates (5) + Achievements (5) + Completion pts (Math.round(0.9 * 5) = 5) = 51
    logger.info(`After Certificate Upload: Completion = ${pAfterCert.profileCompletion}%, Employability = ${pAfterCert.employabilityScore}`);
    if (pAfterCert.profileCompletion !== 90 || pAfterCert.employabilityScore !== 51) {
      throw new Error('Scores after certificate upload are incorrect.');
    }
    logger.info('PASSED: Certificate uploaded. Profile completion updated to 90% and employability to 51.');

    // 10. Upload Profile Image via PUT /profile (FormData)
    logger.info('\nTest 10: Uploading profile image...');
    const imgFormData = new FormData();
    const mockImage = new Blob(['mock-png-bytes'], { type: 'image/png' });
    imgFormData.append('profileImage', mockImage, 'avatar.png');

    const uploadImgRes = await fetch(`${STUDENT_URL}/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: imgFormData,
    });
    const uploadImgData = await uploadImgRes.json() as any;
    if (!uploadImgRes.ok || !uploadImgData.success) {
      throw new Error(`Profile image upload failed: ${uploadImgData.message}`);
    }

    // Re-fetch profile A
    const pAfterImgRes = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pAfterImg = (await pAfterImgRes.json() as any).data;
    // Completion: Bio (10) + Skills (20) + Education (20) + Projects (20) + Resume (10) + Certificates (10) + Pic (10) = 100%
    // Employability: Education (20) + Skills (6) + Projects (10) + Certificates (5) + Achievements (5) + Completion pts (5) = 51
    logger.info(`After Profile Image Upload: Completion = ${pAfterImg.profileCompletion}%, Employability = ${pAfterImg.employabilityScore}`);
    if (pAfterImg.profileCompletion !== 100 || pAfterImg.employabilityScore !== 51) {
      throw new Error('Scores after profile image upload are incorrect.');
    }
    logger.info('PASSED: Profile image uploaded. Profile completion is 100% and employability is 51.');

    // 11. Verify Redis Cache Operations
    logger.info('\nTest 11: Verifying Redis caching for profiles...');
    // Clear Redis profile A cache key to start clean
    await redisClient.del(`student_profile:${studentIdA}`);

    // Call GET profile (should fetch from DB and write to Cache)
    let startTime = Date.now();
    const cacheFetch1 = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const fetch1Time = Date.now() - startTime;
    logger.info(`First retrieve (DB query): ${fetch1Time}ms`);

    // Verify key exists in Redis
    const cachedData = await redisClient.get(`student_profile:${studentIdA}`);
    if (!cachedData) {
      throw new Error('Profile was not cached in Redis.');
    }
    logger.info('Verified profile exists in Redis cache.');

    // Call GET profile again (should serve from Cache)
    startTime = Date.now();
    const cacheFetch2 = await fetch(`${STUDENT_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const fetch2Time = Date.now() - startTime;
    logger.info(`Second retrieve (Redis serving): ${fetch2Time}ms`);

    // Invalidate Redis (e.g. modify skill)
    logger.info('Updating a skill to trigger cache invalidation...');
    const updateSkillRes = await fetch(`${STUDENT_URL}/skills/${skillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        yearsOfExperience: 5,
      }),
    });
    if (!updateSkillRes.ok) {
      throw new Error('Failed to update skill.');
    }

    // Verify key is evicted from Redis
    const evicted = await redisClient.get(`student_profile:${studentIdA}`);
    if (evicted) {
      throw new Error('Profile cache key was not evicted on data update.');
    }
    logger.info('PASSED: Redis caching, retrieval, and cache invalidation verified successfully.');

    // 12. Security and Authorization Rules
    logger.info('\nTest 12: Verifying security rules and RBAC role-based authorization...');
    
    // Scenario 1: Admin fetches Student A profile
    logger.info('Scenario A: Admin fetching Student A profile...');
    const adminGetRes = await fetch(`${STUDENT_URL}/profile/${studentIdA}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const adminGetData = await adminGetRes.json() as any;
    if (!adminGetRes.ok || !adminGetData.success || !adminGetData.data.resumeUrl) {
      throw new Error('Admin should have full access to Student A profile including resumeUrl.');
    }
    logger.info('Admin retrieved full student profile.');

    // Scenario 2: Company fetches Student A profile
    logger.info('Scenario B: Company fetching Student A profile...');
    const companyGetRes = await fetch(`${STUDENT_URL}/profile/${studentIdA}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const companyGetData = await companyGetRes.json() as any;
    if (!companyGetRes.ok || !companyGetData.success) {
      throw new Error('Company should be allowed to view student profile.');
    }
    if (companyGetData.data.resumeUrl) {
      throw new Error('Security Violation: resumeUrl should be hidden for Company queries.');
    }
    logger.info('Company retrieved sanitized student profile (confidential data hidden).');

    // Scenario 3: Student B fetches Student A profile (should fail)
    logger.info('Scenario C: Student B attempting to fetch Student A profile...');
    const studentBGetRes = await fetch(`${STUDENT_URL}/profile/${studentIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const studentBGetData = await studentBGetRes.json() as any;
    if (studentBGetRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${studentBGetRes.status}`);
    }
    logger.info('Student B profile retrieval was correctly blocked.');

    // Scenario 4: Student B attempts to update Student A's skill (should fail)
    logger.info("Scenario D: Student B attempting to update Student A's skill...");
    const studentBUpdateSkillRes = await fetch(`${STUDENT_URL}/skills/${skillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        yearsOfExperience: 10,
      }),
    });
    if (studentBUpdateSkillRes.status !== 404 && studentBUpdateSkillRes.status !== 403) {
      throw new Error(`Expected 404/403, got ${studentBUpdateSkillRes.status}`);
    }
    logger.info("Student B skill update attempt was correctly rejected.");

    logger.info('\n==================================================');
    logger.info('ALL STUDENT LIFECYCLE TESTS PASSED SUCCESSFULLY! :)');
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
      // Ignore cleanup errors during crash
    }
    process.exit(1);
  }
}

runTests();
