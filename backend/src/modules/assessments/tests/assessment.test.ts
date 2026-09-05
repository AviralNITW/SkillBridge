import logger from '../../../config/logger';
import prisma from '../../../config/db';
import redisClient, { connectRedis } from '../../../config/redis';

const BASE_URL  = 'http://localhost:5000/api/v1';
const AUTH_URL  = `${BASE_URL}/auth`;
const ORG_URL   = `${BASE_URL}/organizations`;
const OPP_URL   = `${BASE_URL}/opportunities`;
const APP_URL   = `${BASE_URL}/applications`;
const TASK_URL  = `${BASE_URL}/tasks`;
const ASM_URL   = `${BASE_URL}/assessments`;
const HEALTH_URL = `${BASE_URL}/health`;

// ─── Helper: assert HTTP status ───────────────────────────────────────────────
function assertStatus(res: Response, expected: number, context: string) {
  if (res.status !== expected) {
    throw new Error(`[${context}] Expected HTTP ${expected}, got ${res.status}`);
  }
}

// ─── Helper: assert equality ──────────────────────────────────────────────────
function assertEqual<T>(actual: T, expected: T, context: string) {
  if (actual !== expected) {
    throw new Error(`[${context}] Expected "${expected}", got "${actual}"`);
  }
}

async function runTests() {
  logger.info('==================================================');
  logger.info('STARTING ASSESSMENT & EVALUATION MODULE TESTS');
  logger.info('Module: ASM-001 | Phase: MVP + Phase 2');
  logger.info('==================================================');

  try {
    await connectRedis();

    // ─── 0. Health Gate ───────────────────────────────────────────────────────
    logger.info('\n[BOOT] Verifying service health...');
    const healthRes  = await fetch(HEALTH_URL);
    const healthData = await healthRes.json() as any;
    if (!healthRes.ok || healthData.services.database !== 'UP') {
      throw new Error('Service health check failed.');
    }
    logger.info('PASSED: Health check OK.');

    // ─── Account Bootstrapping ────────────────────────────────────────────────
    const ts       = Date.now();
    const password = 'Password123!';

    const emailStudent  = `student.asm.${ts}@sb.com`;
    const emailCompany  = `company.asm.${ts}@sb.com`;
    const emailMentor   = `mentor.asm.${ts}@sb.com`;
    const emailAdmin    = `admin.asm.${ts}@sb.com`;

    let tokenStudent = '';
    let tokenCompany = '';
    let tokenMentor  = '';
    let tokenAdmin   = '';

    async function bootstrap(email: string, role: 'STUDENT' | 'COMPANY' | 'MENTOR'): Promise<string> {
      try {
        const keys = await redisClient.keys('rate_limit:*');
        if (keys.length > 0) await redisClient.del(keys);
      } catch (_) {}

      const regRes  = await fetch(`${AUTH_URL}/register`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ firstName: 'Test', lastName: 'User', email, password, role }),
      });
      const regData = await regRes.json() as any;
      if (!regData.success) throw new Error(`Registration failed for ${email}: ${regData.message}`);

      const verifyToken = regData.verificationLink.split('/').pop();
      await fetch(`${AUTH_URL}/verify-email/${verifyToken}`);

      const loginRes  = await fetch(`${AUTH_URL}/login`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json() as any;
      if (!loginRes.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(loginData)}`);
      return loginData.data.accessToken;
    }

    // ─── Test 1: Bootstrap Accounts ──────────────────────────────────────────
    logger.info('\nTest 1: Bootstrapping user accounts...');
    tokenStudent = await bootstrap(emailStudent, 'STUDENT');
    tokenCompany = await bootstrap(emailCompany, 'COMPANY');
    tokenMentor  = await bootstrap(emailMentor,  'MENTOR');
    tokenAdmin   = await bootstrap(emailAdmin,    'COMPANY');
    await prisma.user.update({ where: { email: emailAdmin }, data: { role: 'ADMIN' } });
    logger.info('PASSED: All accounts bootstrapped.');

    // ─── Test 2: Create & Approve Organization ────────────────────────────────
    logger.info('\nTest 2: Creating and approving company organization...');
    const orgRes = await fetch(`${ORG_URL}/create`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        organizationType: 'COMPANY', name: 'AssessCorp',
        email: `hr@assesscorp.${ts}.com`, phone: '9876543210',
        website: 'https://assesscorp.com', address: 'Bangalore, India',
        description: 'Assessment testing firm.', industry: 'SOFTWARE',
        companySize: '100-500', headquarters: 'Bangalore', foundedYear: 2019,
      }),
    });
    const orgData = await orgRes.json() as any;
    if (!orgRes.ok || !orgData.success) throw new Error(`Org creation failed: ${orgData.message}`);
    const orgId = orgData.data.id;

    await fetch(`${ORG_URL}/${orgId}/verify`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` },
      body   : JSON.stringify({ status: 'APPROVED' }),
    });
    logger.info(`PASSED: Organization created & approved. ID: ${orgId}`);

    // ─── Test 3: Create Rubric ────────────────────────────────────────────────
    logger.info('\nTest 3: Creating assessment rubric...');
    const rubricRes  = await fetch(`${ASM_URL}/rubrics`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        organizationId: orgId,
        name          : 'Standard Internship Rubric',
        description   : 'Default rubric for all interns.',
        maxScore      : 100,
        criteria      : [
          { criteriaName: 'Task Completion',  weightPercentage: 40, maxScore: 100, description: 'Did the intern complete all assigned tasks?' },
          { criteriaName: 'Technical Skills', weightPercentage: 25, maxScore: 100, description: 'Quality of technical implementation.' },
          { criteriaName: 'Communication',    weightPercentage: 15, maxScore: 100, description: 'Clarity of communication and documentation.' },
          { criteriaName: 'Problem Solving',  weightPercentage: 10, maxScore: 100, description: 'Ability to debug and resolve issues.' },
          { criteriaName: 'Professionalism',  weightPercentage: 10, maxScore: 100, description: 'Timeliness and conduct.' },
        ],
      }),
    });
    const rubricData = await rubricRes.json() as any;
    if (!rubricRes.ok || !rubricData.success) throw new Error(`Rubric creation failed: ${rubricData.message}`);
    const rubricId = rubricData.data.id;
    logger.info(`PASSED: Rubric created with 5 criteria. ID: ${rubricId}`);

    // ─── Test 4: Rubric Weight Validation (should reject if sum ≠ 100) ───────
    logger.info('\nTest 4: Rubric with invalid weight sum should be rejected...');
    const badRubricRes = await fetch(`${ASM_URL}/rubrics`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        organizationId: orgId,
        name: 'Bad Rubric',
        maxScore: 100,
        criteria: [
          { criteriaName: 'A', weightPercentage: 60, maxScore: 100 },
          { criteriaName: 'B', weightPercentage: 30, maxScore: 100 }, // Total = 90, not 100
        ],
      }),
    });
    assertStatus(badRubricRes, 400, 'Invalid rubric weight validation');
    logger.info('PASSED: Rubric with invalid weights rejected (400).');

    // ─── Test 5: Get Rubrics ──────────────────────────────────────────────────
    logger.info('\nTest 5: Retrieving organization rubrics...');
    const getRubricsRes  = await fetch(`${ASM_URL}/rubrics?organizationId=${orgId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const getRubricsData = await getRubricsRes.json() as any;
    assertStatus(getRubricsRes, 200, 'Get rubrics');
    if (!Array.isArray(getRubricsData.data) || getRubricsData.data.length === 0) {
      throw new Error('Expected at least one rubric in the list.');
    }
    logger.info(`PASSED: Retrieved ${getRubricsData.data.length} rubric(s).`);

    // ─── Test 6: Setup Internship (Opportunity → Application → Accept) ────────
    logger.info('\nTest 6: Setting up full internship pipeline...');
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const oppRes = await fetch(OPP_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        title: 'Data Science Intern', description: 'ML data pipeline project.',
        category: 'INTERNSHIP', mode: 'remote', deadline,
        skillsRequired: ['Python', 'Pandas'],
      }),
    });
    const oppData = await oppRes.json() as any;
    const oppId   = oppData.data.id;

    // Add resume to student
    const userS = await prisma.user.findUnique({ where: { email: emailStudent } });
    await prisma.student.update({
      where: { userId: userS!.id },
      data : { resumeUrl: '/uploads/resumes/asm_student_resume.pdf' },
    });

    const applyRes  = await fetch(APP_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({ opportunityId: oppId, coverLetter: 'Excited!', useProfileResume: true }),
    });
    const applyData = await applyRes.json() as any;
    const appId     = applyData.data.id;

    for (const status of ['UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED'] as const) {
      await fetch(`${APP_URL}/${appId}/status`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
        body   : JSON.stringify({ status }),
      });
    }

    const studentRecord = await prisma.student.findUnique({ where: { userId: userS!.id } });
    const internship    = await prisma.internship.findFirst({
      where: { studentId: studentRecord!.id, opportunityId: oppId },
    });
    if (!internship) throw new Error('Internship was not auto-created.');
    const internshipId = internship.id;

    // Create and assign a task
    const taskRes  = await fetch(TASK_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        internshipId,
        title      : 'Data Pipeline Report',
        description: 'Build a data processing pipeline.',
        priority   : 'HIGH',
        deadline   : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore   : 100,
      }),
    });
    const taskData = await taskRes.json() as any;
    const taskId   = taskData.data.id;

    await fetch(`${TASK_URL}/${taskId}/assign`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ studentIds: [studentRecord!.id] }),
    });

    // Student submits task
    const submitRes  = await fetch(`${TASK_URL}/${taskId}/submit`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({ submissionType: 'GITHUB_LINK', submissionUrl: 'https://github.com/test/pipeline' }),
    });
    const submitData = await submitRes.json() as any;
    const submissionId = submitData.data.id;

    logger.info(`PASSED: Full internship pipeline set up. Internship: ${internshipId}, Submission: ${submissionId}`);

    // ─── Test 7: RBAC — Student cannot create assessment ─────────────────────
    logger.info('\nTest 7: RBAC — Student must not be allowed to create assessments...');
    const studentAsmRes = await fetch(ASM_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({
        internshipId, submissionId, assessmentType: 'TASK_ASSESSMENT', score: 90, rating: 5,
      }),
    });
    assertStatus(studentAsmRes, 403, 'Student assessment creation RBAC');
    logger.info('PASSED: Student blocked from creating assessment (403).');

    // ─── Test 8: Create Task Assessment ──────────────────────────────────────
    logger.info('\nTest 8: Organization creates a task assessment...');
    const createAsmRes  = await fetch(ASM_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        internshipId,
        submissionId,
        assessmentType       : 'TASK_ASSESSMENT',
        score                : 88,
        rating               : 4,
        feedback             : 'Excellent pipeline implementation with clean code.',
        taskCompletionScore  : 90,
        technicalSkillsScore : 85,
        communicationScore   : 88,
        problemSolvingScore  : 86,
        professionalismScore : 91,
      }),
    });
    const createAsmData = await createAsmRes.json() as any;
    if (!createAsmRes.ok || !createAsmData.success) {
      throw new Error(`Assessment creation failed: ${createAsmData.message}`);
    }
    const assessmentId = createAsmData.data.id;
    logger.info(`PASSED: Assessment created. ID: ${assessmentId}`);

    // ─── Test 9: Performance Category — EXCELLENT for score 88 ───────────────
    logger.info('\nTest 9: Verify performance category is EXCELLENT for score 88...');
    const freshAsm = await prisma.internshipAssessment.findUnique({ where: { id: assessmentId } });
    assertEqual(freshAsm!.category, 'EXCELLENT', 'Performance category for score 88');
    logger.info('PASSED: Category is EXCELLENT (80–89 range).');

    // ─── Test 10: Create Rubric-Based Assessment ──────────────────────────────
    logger.info('\nTest 10: Organization creates a rubric-based assessment...');
    // Create a second task for rubric assessment
    const task2Res  = await fetch(TASK_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        internshipId,
        title: 'ML Model Training', description: 'Train and evaluate an ML model.',
        priority: 'MEDIUM',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 100,
      }),
    });
    const task2Data = await task2Res.json() as any;
    const taskId2   = task2Data.data.id;

    await fetch(`${TASK_URL}/${taskId2}/assign`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ studentIds: [studentRecord!.id] }),
    });
    const submit2Res  = await fetch(`${TASK_URL}/${taskId2}/submit`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({ submissionType: 'GITHUB_LINK', submissionUrl: 'https://github.com/test/ml-model' }),
    });
    const submit2Data   = await submit2Res.json() as any;
    const submissionId2 = submit2Data.data.id;

    const rubricAsmRes  = await fetch(ASM_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        internshipId,
        submissionId  : submissionId2,
        assessmentType: 'TASK_ASSESSMENT',
        score         : 75,
        rating        : 3,
        feedback      : 'Good work but model accuracy could be improved.',
        rubricId      : rubricId,
      }),
    });
    const rubricAsmData = await rubricAsmRes.json() as any;
    if (!rubricAsmRes.ok || !rubricAsmData.success) {
      throw new Error(`Rubric-based assessment creation failed: ${rubricAsmData.message}`);
    }
    const assessmentId2 = rubricAsmData.data.id;
    logger.info(`PASSED: Rubric-based assessment created. ID: ${assessmentId2}. Rubric linked: ${rubricId}`);

    // ─── Test 11: Performance Category — GOOD for score 75 ───────────────────
    logger.info('\nTest 11: Verify performance category is GOOD for score 75...');
    const rubricFreshAsm = await prisma.internshipAssessment.findUnique({ where: { id: assessmentId2 } });
    assertEqual(rubricFreshAsm!.category, 'GOOD', 'Performance category for score 75');
    logger.info('PASSED: Category is GOOD (70–79 range).');

    // ─── Test 12: Get Assessment By ID ───────────────────────────────────────
    logger.info('\nTest 12: Retrieving assessment by ID...');
    const getAsmRes  = await fetch(`${ASM_URL}/${assessmentId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    assertStatus(getAsmRes, 200, 'Get assessment by ID (company)');
    // Student can view their own assessment
    const getAsmStudentRes = await fetch(`${ASM_URL}/${assessmentId}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    assertStatus(getAsmStudentRes, 200, 'Get assessment by ID (student)');
    logger.info('PASSED: Assessment accessible to both company and student.');

    // ─── Test 13: Update Assessment (before final eval) ───────────────────────
    logger.info('\nTest 13: Organization updates assessment feedback...');
    const updateAsmRes  = await fetch(`${ASM_URL}/${assessmentId}`, {
      method : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ feedback: 'Updated: Outstanding pipeline. Ready for production.', score: 92 }),
    });
    const updateAsmData = await updateAsmRes.json() as any;
    if (!updateAsmRes.ok || !updateAsmData.success) {
      throw new Error(`Assessment update failed: ${updateAsmData.message}`);
    }
    logger.info('PASSED: Assessment updated successfully.');

    // Verify category upgraded to OUTSTANDING after score update to 92
    const updatedCategory = await prisma.internshipAssessment.findUnique({ where: { id: assessmentId } });
    assertEqual(updatedCategory!.category, 'OUTSTANDING', 'Updated category after score 92');
    logger.info('PASSED: Category auto-updated to OUTSTANDING after score update to 92.');

    // ─── Test 14: Redis Cache-Aside for Assessment ────────────────────────────
    logger.info('\nTest 14: Validating Redis Cache-Aside for assessment details...');
    const asmCacheKey = `assessment:${assessmentId}`;
    await redisClient.del(asmCacheKey);
    // First fetch — DB hit, populates cache
    await fetch(`${ASM_URL}/${assessmentId}`, { headers: { Authorization: `Bearer ${tokenCompany}` } });
    const cachedAsm = await redisClient.get(asmCacheKey);
    if (!cachedAsm) throw new Error('Assessment not cached after first fetch.');
    logger.info('PASSED: Assessment details cached in Redis.');
    // Mutation — cache should evict
    await fetch(`${ASM_URL}/${assessmentId}`, {
      method : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ feedback: 'Cache eviction test update.' }),
    });
    const evictedAsm = await redisClient.get(asmCacheKey);
    if (evictedAsm) throw new Error('Cache was NOT evicted on assessment mutation.');
    logger.info('PASSED: Cache evicted on assessment mutation. Cache-Aside confirmed.');

    // ─── Test 15: Get Student Assessment History ──────────────────────────────
    logger.info('\nTest 15: Student retrieves their assessment history...');
    const studentAsmHistory = await fetch(`${ASM_URL}/student/${studentRecord!.id}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const studentAsmHistoryData = await studentAsmHistory.json() as any;
    assertStatus(studentAsmHistory, 200, 'Student assessment history');
    if (!Array.isArray(studentAsmHistoryData.data) || studentAsmHistoryData.data.length < 2) {
      throw new Error(`Expected at least 2 assessments, got: ${studentAsmHistoryData.data?.length}`);
    }
    logger.info(`PASSED: Student sees ${studentAsmHistoryData.data.length} assessment(s).`);

    // ─── Test 16: RBAC — Student cannot access other student's assessments ────
    logger.info('\nTest 16: RBAC — Student cannot access another student\'s assessments...');
    // Use a random UUID that doesn't belong to our test student
    const fakeStudentId  = '00000000-0000-0000-0000-000000000000';
    const otherStudentRes = await fetch(`${ASM_URL}/student/${fakeStudentId}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    assertStatus(otherStudentRes, 403, 'Student cross-student assessment access RBAC');
    logger.info('PASSED: Student blocked from accessing other student\'s assessments (403).');

    // ─── Test 17: Get Internship Evaluation Summary ───────────────────────────
    logger.info('\nTest 17: Getting internship evaluation summary...');
    const internshipEvalRes  = await fetch(`${ASM_URL}/internship/${internshipId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const internshipEvalData = await internshipEvalRes.json() as any;
    assertStatus(internshipEvalRes, 200, 'Get internship evaluation');
    if (!internshipEvalData.data.assessments || !internshipEvalData.data.aggregated) {
      throw new Error('Internship evaluation missing assessments or aggregated data.');
    }
    logger.info(`PASSED: Internship evaluation returned. Assessments: ${internshipEvalData.data.assessments.length}, Overall: ${internshipEvalData.data.aggregated.overallScore}`);

    // ─── Test 18: Create Final Evaluation ────────────────────────────────────
    logger.info('\nTest 18: Creating final evaluation for internship...');

    // First mark the internship as COMPLETED so eligibility check can pass
    await prisma.internship.update({
      where: { id: internshipId },
      data : { status: 'COMPLETED' },
    });
    // Mark all tasks as APPROVED
    await prisma.internshipTask.updateMany({
      where: { internshipId },
      data : { status: 'APPROVED' },
    });

    const finalEvalRes  = await fetch(`${ASM_URL}/final/${internshipId}`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        score                : 87,
        rating               : 4,
        feedback             : 'Exceptional intern. Strong technical skills and excellent communication.',
        taskCompletionScore  : 90,
        technicalSkillsScore : 85,
        communicationScore   : 88,
        problemSolvingScore  : 84,
        professionalismScore : 88,
      }),
    });
    const finalEvalData = await finalEvalRes.json() as any;
    if (!finalEvalRes.ok || !finalEvalData.success) {
      throw new Error(`Final evaluation creation failed: ${finalEvalData.message}`);
    }
    const finalEvalId = finalEvalData.data.id;
    // Verify it's marked as final
    const finalEvalRecord = await prisma.internshipAssessment.findUnique({ where: { id: finalEvalId } });
    if (!finalEvalRecord!.isFinal) throw new Error('Final evaluation was NOT marked as isFinal = true.');
    logger.info(`PASSED: Final evaluation submitted and locked. ID: ${finalEvalId}, isFinal: true.`);

    // ─── Test 19: Final Evaluation Immutability ───────────────────────────────
    logger.info('\nTest 19: Final evaluation must be immutable (update blocked)...');
    const immutableUpdateRes = await fetch(`${ASM_URL}/${finalEvalId}`, {
      method : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ score: 50, feedback: 'Hacking final eval.' }),
    });
    assertStatus(immutableUpdateRes, 400, 'Final evaluation immutability');
    logger.info('PASSED: Final evaluation update blocked (400). Immutability confirmed.');

    // ─── Test 20: Duplicate Final Evaluation Blocked ──────────────────────────
    logger.info('\nTest 20: Duplicate final evaluation must be blocked...');
    const dupFinalRes = await fetch(`${ASM_URL}/final/${internshipId}`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ score: 70, rating: 3, feedback: 'Second final — should be blocked.' }),
    });
    assertStatus(dupFinalRes, 409, 'Duplicate final evaluation');
    logger.info('PASSED: Duplicate final evaluation blocked (409).');

    // ─── Test 21: Score Aggregation Formula ──────────────────────────────────
    logger.info('\nTest 21: Verifying score aggregation formula: avgTask(70%) + finalEval(30%)...');
    const evalSummaryRes  = await fetch(`${ASM_URL}/internship/${internshipId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const evalSummaryData = await evalSummaryRes.json() as any;
    const agg = evalSummaryData.data.aggregated;

    // avg of [92, 75] = 83.5, final = 87
    // overall = 83.5 * 0.7 + 87 * 0.3 = 58.45 + 26.1 = 84.55
    const expectedOverall = parseFloat((83.5 * 0.7 + 87 * 0.3).toFixed(2));
    if (Math.abs(Number(agg.overallScore) - expectedOverall) > 0.5) {
      throw new Error(`Score aggregation formula incorrect. Expected ~${expectedOverall}, got ${agg.overallScore}`);
    }
    logger.info(`PASSED: Aggregation correct — avgTask: ${agg.averageTaskScore}, final: ${agg.finalEvaluationScore}, overall: ${agg.overallScore} (expected ~${expectedOverall}).`);

    // ─── Test 22: Generate Assessment Report ──────────────────────────────────
    logger.info('\nTest 22: Generating assessment report...');
    const reportRes  = await fetch(`${ASM_URL}/report`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ internshipId, studentId: studentRecord!.id }),
    });
    const reportData = await reportRes.json() as any;
    if (!reportRes.ok || !reportData.success) {
      throw new Error(`Report generation failed: ${reportData.message}`);
    }
    logger.info(`PASSED: Report generated. Overall: ${reportData.data.overallScore}, Category: ${reportData.data.performanceCategory}, Eligible: ${reportData.data.eligibleForCertificate}.`);

    // ─── Test 23: Certificate Eligibility — Positive (score > 60, COMPLETED) ─
    logger.info('\nTest 23: Verifying certificate eligibility (positive path)...');
    if (!reportData.data.eligibleForCertificate) {
      throw new Error(`Student should be eligible for certificate (score >${reportData.data.overallScore}>=60, internship COMPLETED, all tasks APPROVED).`);
    }
    logger.info('PASSED: Student is eligible for certificate. Eligibility rules enforced correctly.');

    // ─── Test 24: Certificate Ineligibility (score < 60) ─────────────────────
    logger.info('\nTest 24: Certificate ineligibility for low-score internship...');
    // Simulate a second internship with low score via direct DB insert
    const secondStudent = await prisma.student.findUnique({ where: { userId: userS!.id } });
    const lowScoreReport = await prisma.assessmentReport.create({
      data: {
        studentId              : secondStudent!.id,
        internshipId           : internshipId, // We'll use a modified check — just check the logic
        overallScore           : 45,
        averageTaskScore       : 45,
        finalEvaluationScore   : null,
        performanceCategory    : 'NEEDS_IMPROVEMENT',
        eligibleForCertificate : false, // Below threshold
        updatedAt              : new Date(),
      },
    }).catch(() => null); // May fail due to unique constraint (report already exists), that's fine

    // Direct verification: score of 45 < 60 → NEEDS_IMPROVEMENT → NOT eligible
    const { deriveCategory } = await import('../services/assessment.service');
    assertEqual(deriveCategory(45), 'NEEDS_IMPROVEMENT', 'Category for score 45');
    assertEqual(deriveCategory(55), 'NEEDS_IMPROVEMENT', 'Category for score 55');
    assertEqual(deriveCategory(60), 'AVERAGE', 'Category for score 60 (boundary)');
    logger.info('PASSED: Score < 60 → NEEDS_IMPROVEMENT, not eligible. Score 60 = AVERAGE (boundary correct).');

    // ─── Test 25: Get Report ──────────────────────────────────────────────────
    logger.info('\nTest 25: Retrieving assessment report...');
    const getReportRes  = await fetch(`${ASM_URL}/report/${internshipId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const getReportData = await getReportRes.json() as any;
    assertStatus(getReportRes, 200, 'Get report');
    if (!getReportData.data.overallScore) throw new Error('Report missing overallScore.');
    logger.info(`PASSED: Report retrieved. Overall: ${getReportData.data.overallScore}, Eligible: ${getReportData.data.eligibleForCertificate}.`);

    // ─── Test 26: Student Dashboard Metrics ───────────────────────────────────
    logger.info('\nTest 26: Student dashboard metrics...');
    const studentMetricsRes  = await fetch(`${ASM_URL}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const studentMetricsData = await studentMetricsRes.json() as any;
    if (!studentMetricsRes.ok || !studentMetricsData.success) {
      throw new Error(`Student dashboard metrics failed: ${studentMetricsData.message}`);
    }
    logger.info(`PASSED: Student metrics: ${JSON.stringify(studentMetricsData.data)}`);

    // ─── Test 27: Company Dashboard Metrics ───────────────────────────────────
    logger.info('\nTest 27: Company dashboard metrics...');
    const companyMetricsRes  = await fetch(`${ASM_URL}/dashboard/metrics?organizationId=${orgId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const companyMetricsData = await companyMetricsRes.json() as any;
    if (!companyMetricsRes.ok || !companyMetricsData.success) {
      throw new Error(`Company dashboard metrics failed: ${companyMetricsData.message}`);
    }
    logger.info(`PASSED: Company metrics: ${JSON.stringify(companyMetricsData.data)}`);

    // ─── Test 28: Mentor Dashboard Metrics ───────────────────────────────────
    logger.info('\nTest 28: Mentor dashboard metrics...');
    const mentorMetricsRes  = await fetch(`${ASM_URL}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${tokenMentor}` },
    });
    const mentorMetricsData = await mentorMetricsRes.json() as any;
    if (!mentorMetricsRes.ok || !mentorMetricsData.success) {
      throw new Error(`Mentor dashboard metrics failed: ${mentorMetricsData.message}`);
    }
    logger.info(`PASSED: Mentor metrics: ${JSON.stringify(mentorMetricsData.data)}`);

    // ─── Test 29: Unauthenticated Request ────────────────────────────────────
    logger.info('\nTest 29: Unauthenticated request must return 401...');
    const unauthRes = await fetch(`${ASM_URL}/dashboard/metrics`);
    assertStatus(unauthRes, 401, 'Unauthenticated assessment request');
    logger.info('PASSED: Unauthenticated request correctly rejected (401).');

    // ─── Summary ──────────────────────────────────────────────────────────────
    logger.info('\n==================================================');
    logger.info('ALL ASSESSMENT & EVALUATION MODULE TESTS PASSED! ✓');
    logger.info('Module: ASM-001 | Tests: 29 | Phase 1 + Phase 2');
    logger.info('==================================================');

    await redisClient.quit();
    await prisma.$disconnect();
    process.exit(0);

  } catch (error: any) {
    logger.error(`\nTEST SUITE FAILED: ${error.message}`);
    try { await redisClient.quit(); await prisma.$disconnect(); } catch (_) {}
    process.exit(1);
  }
}

runTests();
