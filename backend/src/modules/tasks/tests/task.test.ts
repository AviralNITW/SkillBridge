import logger from '../../../config/logger';
import prisma from '../../../config/db';
import redisClient, { connectRedis } from '../../../config/redis';

const BASE_URL    = 'http://localhost:5000/api/v1';
const AUTH_URL    = `${BASE_URL}/auth`;
const ORG_URL     = `${BASE_URL}/organizations`;
const OPP_URL     = `${BASE_URL}/opportunities`;
const APP_URL     = `${BASE_URL}/applications`;
const TASK_URL    = `${BASE_URL}/tasks`;
const HEALTH_URL  = `${BASE_URL}/health`;

// ─── Helper: assert HTTP status ──────────────────────────────────────────────
function assertStatus(res: Response, expected: number, context: string) {
  if (res.status !== expected) {
    throw new Error(`[${context}] Expected HTTP ${expected}, got ${res.status}`);
  }
}

// ─── Helper: assert deep equality ────────────────────────────────────────────
function assertEqual<T>(actual: T, expected: T, context: string) {
  if (actual !== expected) {
    throw new Error(`[${context}] Expected "${expected}", got "${actual}"`);
  }
}

async function runTests() {
  logger.info('==================================================');
  logger.info('STARTING TASK & INTERNSHIP EXECUTION MODULE TESTS');
  logger.info('Module: TASK-001 | Phase: MVP + Phase 2');
  logger.info('==================================================');

  try {
    await connectRedis();

    // ─── 0. Health Gate ──────────────────────────────────────────────────────
    logger.info('\n[BOOT] Verifying service health...');
    const healthRes  = await fetch(HEALTH_URL);
    const healthData = await healthRes.json() as any;
    if (!healthRes.ok || healthData.services.database !== 'UP') {
      throw new Error('Service health check failed. Postgres or Redis is down.');
    }
    logger.info('PASSED: Health check OK.');

    // ─── Test Accounts Setup ─────────────────────────────────────────────────
    const ts         = Date.now();
    const password   = 'Password123!';

    const emailStudent  = `student.task.${ts}@sb.com`;
    const emailStudent2 = `student2.task.${ts}@sb.com`;
    const emailCompany  = `company.task.${ts}@sb.com`;
    const emailMentor   = `mentor.task.${ts}@sb.com`;
    const emailAdmin    = `admin.task.${ts}@sb.com`;

    let tokenStudent  = '';
    let tokenStudent2 = '';
    let tokenCompany  = '';
    let tokenMentor   = '';
    let tokenAdmin    = '';

    // ─── Helper: register, verify email, login → return access token ─────────
    async function bootstrap(
      email: string,
      role: 'STUDENT' | 'COMPANY' | 'MENTOR'
    ): Promise<string> {
      // Clear rate-limit keys so tests don't throttle each other
      try {
        const keys = await redisClient.keys('rate_limit:*');
        if (keys.length > 0) await redisClient.del(keys);
      } catch (_) {}

      const regRes = await fetch(`${AUTH_URL}/register`, {
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

    // ─── 1. Register & Login ─────────────────────────────────────────────────
    logger.info('\nTest 1: Bootstrapping user accounts...');
    tokenStudent  = await bootstrap(emailStudent,  'STUDENT');
    tokenStudent2 = await bootstrap(emailStudent2, 'STUDENT');
    tokenCompany  = await bootstrap(emailCompany,  'COMPANY');
    tokenMentor   = await bootstrap(emailMentor,   'MENTOR');
    tokenAdmin    = await bootstrap(emailAdmin,     'COMPANY');

    // Promote admin
    await prisma.user.update({ where: { email: emailAdmin }, data: { role: 'ADMIN' } });
    logger.info('PASSED: All accounts bootstrapped.');

    // ─── 2. Create & Approve Organization ────────────────────────────────────
    logger.info('\nTest 2: Creating and approving company organization...');
    const createOrgRes = await fetch(`${ORG_URL}/create`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        organizationType: 'COMPANY',
        name            : 'TaskCorp',
        email           : `hr@taskcorp.${ts}.com`,
        phone           : '9876543210',
        website         : 'https://taskcorp.com',
        address         : 'Mumbai, India',
        description     : 'Engineering firm for testing task flows.',
        industry        : 'SOFTWARE',
        companySize     : '100-500',
        headquarters    : 'Mumbai',
        foundedYear     : 2018,
      }),
    });
    const orgData = await createOrgRes.json() as any;
    if (!createOrgRes.ok || !orgData.success) throw new Error(`Org creation failed: ${orgData.message}`);
    const orgId = orgData.data.id;

    // Admin verifies org
    const verifyOrgRes = await fetch(`${ORG_URL}/${orgId}/verify`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` },
      body   : JSON.stringify({ status: 'APPROVED' }),
    });
    assertStatus(verifyOrgRes, 200, 'Org verification');
    logger.info(`PASSED: Organization created & approved. ID: ${orgId}`);

    // ─── 3. Create & Publish Opportunity ─────────────────────────────────────
    logger.info('\nTest 3: Creating and publishing internship opportunity...');
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const createOppRes = await fetch(OPP_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        title         : 'Full-Stack Intern',
        description   : 'Work on live project.',
        category      : 'INTERNSHIP',
        mode          : 'remote',
        deadline,
        skillsRequired: ['Node.js', 'React'],
      }),
    });
    const oppData = await createOppRes.json() as any;
    if (!createOppRes.ok || !oppData.success) throw new Error(`Opportunity creation failed: ${oppData.message}`);
    const oppId = oppData.data.id;
    logger.info(`PASSED: Opportunity created. ID: ${oppId}`);

    // ─── 4. Student Applies & Gets Accepted (Auto-Internship Trigger) ─────────
    logger.info('\nTest 4: Student applies, org accepts — auto internship is created...');

    // Add resume to Student 1 profile
    const userS = await prisma.user.findUnique({ where: { email: emailStudent } });
    await prisma.student.update({
      where: { userId: userS!.id },
      data : { resumeUrl: '/uploads/resumes/task_student_resume.pdf' },
    });

    const applyRes  = await fetch(APP_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({ opportunityId: oppId, coverLetter: 'Excited to work!', useProfileResume: true }),
    });
    const applyData = await applyRes.json() as any;
    if (!applyRes.ok || !applyData.success) throw new Error(`Application failed: ${applyData.message}`);
    const appId = applyData.data.id;

    // Walk through statuses: UNDER_REVIEW → SHORTLISTED → ACCEPTED
    for (const status of ['UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED'] as const) {
      const r = await fetch(`${APP_URL}/${appId}/status`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
        body   : JSON.stringify({ status }),
      });
      if (!r.ok) {
        const e = await r.json() as any;
        throw new Error(`Status transition to ${status} failed: ${e.message}`);
      }
    }

    // Verify Internship auto-creation in DB
    const studentRecord = await prisma.student.findUnique({ where: { userId: userS!.id } });
    const internship    = await prisma.internship.findFirst({
      where: { studentId: studentRecord!.id, opportunityId: oppId },
    });
    if (!internship) throw new Error('Internship was NOT auto-created on ACCEPTED application status.');
    const internshipId = internship.id;
    logger.info(`PASSED: Internship auto-created on ACCEPTED. Internship ID: ${internshipId}`);

    // ─── 5. RBAC — Student cannot create tasks ────────────────────────────────
    logger.info('\nTest 5: RBAC — Student must not be allowed to create tasks...');
    const studentCreateTask = await fetch(TASK_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({
        internshipId,
        title      : 'Unauthorized Task',
        description: 'This should not be created.',
        deadline   : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assertStatus(studentCreateTask, 403, 'Student task creation RBAC');
    logger.info('PASSED: Student blocked from creating tasks (403).');

    // ─── 6. Organization Creates a Task ──────────────────────────────────────
    logger.info('\nTest 6: Organization creates a task in the internship...');
    const taskDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const createTaskRes  = await fetch(TASK_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        internshipId,
        title      : 'Build REST API',
        description: 'Build a CRUD REST API with Express and Prisma.',
        priority   : 'HIGH',
        deadline   : taskDeadline,
        maxScore   : 100,
      }),
    });
    const createTaskData = await createTaskRes.json() as any;
    if (!createTaskRes.ok || !createTaskData.success) {
      throw new Error(`Task creation failed: ${createTaskData.message}`);
    }
    const taskId = createTaskData.data.id;
    logger.info(`PASSED: Task created. ID: ${taskId}`);

    // Verify task is in DRAFT status by default
    assertEqual(createTaskData.data.status, 'DRAFT', 'Default task status');
    logger.info('PASSED: Task defaults to DRAFT status.');

    // ─── 7. Get Internship Tasks ──────────────────────────────────────────────
    logger.info('\nTest 7: Retrieving all tasks for an internship (organization side)...');
    const getTasksRes  = await fetch(`${TASK_URL}/internship/${internshipId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const getTasksData = await getTasksRes.json() as any;
    assertStatus(getTasksRes, 200, 'Get internship tasks');
    if (!Array.isArray(getTasksData.data) || getTasksData.data.length === 0) {
      throw new Error('Expected at least one task in internship tasks list.');
    }
    logger.info(`PASSED: Retrieved ${getTasksData.data.length} task(s) for internship.`);

    // ─── 8. Assign Task to Student ────────────────────────────────────────────
    logger.info('\nTest 8: Assigning task to student...');
    const assignTaskRes  = await fetch(`${TASK_URL}/${taskId}/assign`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ studentIds: [studentRecord!.id] }),
    });
    const assignTaskData = await assignTaskRes.json() as any;
    if (!assignTaskRes.ok || !assignTaskData.success) {
      throw new Error(`Task assignment failed: ${assignTaskData.message}`);
    }
    logger.info('PASSED: Task successfully assigned to student.');

    // ─── 9. Student Gets Their Assigned Tasks ─────────────────────────────────
    logger.info('\nTest 9: Student views assigned tasks via /my-tasks endpoint...');
    const myTasksRes  = await fetch(`${TASK_URL}/my-tasks`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const myTasksData = await myTasksRes.json() as any;
    assertStatus(myTasksRes, 200, 'Student my-tasks');
    if (!Array.isArray(myTasksData.data) || myTasksData.data.length === 0) {
      throw new Error('Student was unable to see assigned tasks.');
    }
    logger.info(`PASSED: Student can view ${myTasksData.data.length} assigned task(s).`);

    // ─── 10. Student Submits Task (Link-based) ────────────────────────────────
    logger.info('\nTest 10: Student submits task via GitHub URL...');
    const submitRes  = await fetch(`${TASK_URL}/${taskId}/submit`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({
        submissionType: 'GITHUB_LINK',
        submissionUrl : 'https://github.com/test-student/rest-api',
        remarks       : 'Completed all CRUD endpoints with Prisma.',
      }),
    });
    const submitData = await submitRes.json() as any;
    if (!submitRes.ok || !submitData.success) {
      throw new Error(`Task submission failed: ${submitData.message}`);
    }
    const submissionId = submitData.data.id;
    logger.info(`PASSED: Submission created. ID: ${submissionId}`);

    // ─── 11. Unauthorized Student Cannot Submit for Others ────────────────────
    logger.info('\nTest 11: Un-assigned student2 must be blocked from submitting...');

    // Add resume to Student 2 profile (in case it's needed)
    const userS2 = await prisma.user.findUnique({ where: { email: emailStudent2 } });
    await prisma.student.update({
      where: { userId: userS2!.id },
      data : { resumeUrl: '/uploads/resumes/task_student2_resume.pdf' },
    });

    const forbiddenSubmitRes = await fetch(`${TASK_URL}/${taskId}/submit`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent2}` },
      body   : JSON.stringify({
        submissionType: 'GITHUB_LINK',
        submissionUrl : 'https://github.com/unassigned/hack',
        remarks       : 'Should be rejected.',
      }),
    });
    assertStatus(forbiddenSubmitRes, 403, 'Unassigned student submission');
    logger.info('PASSED: Un-assigned student blocked from submitting (403).');

    // ─── 12. Student Views Their Submissions ──────────────────────────────────
    logger.info('\nTest 12: Student views submission history...');
    const mySubsRes  = await fetch(`${TASK_URL}/my-submissions`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const mySubsData = await mySubsRes.json() as any;
    assertStatus(mySubsRes, 200, 'Student my-submissions');
    if (!Array.isArray(mySubsData.data) || mySubsData.data.length === 0) {
      throw new Error('Student could not retrieve their submission history.');
    }
    logger.info(`PASSED: Student sees ${mySubsData.data.length} submission(s).`);

    // ─── 13. Update Task (Organization) — must run BEFORE review locks status ─
    logger.info('\nTest 13: Organization updates task metadata (before review locks it)...');
    const updateTaskRes  = await fetch(`${TASK_URL}/${taskId}`, {
      method : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        title      : 'Build REST API (Updated)',
        description: 'Include rate limiting and JWT middleware.',
        priority   : 'CRITICAL',
      }),
    });
    const updateTaskData = await updateTaskRes.json() as any;
    if (!updateTaskRes.ok || !updateTaskData.success) {
      throw new Error(`Task update failed: ${updateTaskData.message}`);
    }
    assertEqual(updateTaskData.data.title, 'Build REST API (Updated)', 'Updated task title');
    logger.info('PASSED: Task updated successfully.');

    // ─── 14. Redis Cache: Task Details — mutation before review ──────────────
    logger.info('\nTest 14: Validating Redis Cache-Aside for task details...');
    const cacheKey = `task:${taskId}`;
    await redisClient.del(cacheKey);

    // First fetch — DB hit, should populate cache
    await fetch(`${TASK_URL}/${taskId}`, { headers: { Authorization: `Bearer ${tokenCompany}` } });
    const cachedTask = await redisClient.get(cacheKey);
    if (!cachedTask) throw new Error('Task details were not cached in Redis after first fetch.');
    logger.info('PASSED: Task details cached in Redis.');

    // Trigger mutation — cache should evict
    await fetch(`${TASK_URL}/${taskId}`, {
      method : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ title: 'Build REST API (Final)' }),
    });
    const evictedTask = await redisClient.get(cacheKey);
    if (evictedTask) throw new Error('Cache was NOT evicted on task mutation.');
    logger.info('PASSED: Cache evicted on task mutation. Cache-Aside pattern confirmed.');

    // ─── 15. Organization Reviews Submission ──────────────────────────────────
    logger.info('\nTest 15: Organization reviews submission and assigns score...');
    const reviewRes  = await fetch(`${TASK_URL}/submissions/${submissionId}/review`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        score   : 85,
        feedback: 'Excellent implementation! Clean code, well documented.',
      }),
    });
    const reviewData = await reviewRes.json() as any;
    if (!reviewRes.ok || !reviewData.success) {
      throw new Error(`Review submission failed: ${reviewData.message}`);
    }
    logger.info(`PASSED: Submission reviewed. Score: ${reviewData.data.score}.`);

    // Verify the task was auto-approved (score 85/100 = 85% >= 50% threshold)
    const approvedTask = await prisma.internshipTask.findUnique({ where: { id: taskId } });
    if (approvedTask!.status !== 'APPROVED') {
      throw new Error(`Task should be APPROVED after 85/100 score review, but got: ${approvedTask!.status}`);
    }
    logger.info('PASSED: Auto-approval logic verified — task is APPROVED (score >= 50% threshold).');

    // ─── 16. RBAC — Student cannot review submissions ─────────────────────────
    logger.info('\nTest 16: RBAC — Student must not be allowed to review submissions...');
    const studentReviewRes = await fetch(`${TASK_URL}/submissions/${submissionId}/review`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStudent}` },
      body   : JSON.stringify({ score: 100, feedback: 'Self-review hack' }),
    });
    assertStatus(studentReviewRes, 403, 'Student submission review RBAC');
    logger.info('PASSED: Student blocked from reviewing submissions (403).');


    // ─── 17. Dashboard Metrics (Student) ─────────────────────────────────────
    logger.info('\nTest 17: Student task dashboard metrics...');
    const studentMetricsRes  = await fetch(`${TASK_URL}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const studentMetricsData = await studentMetricsRes.json() as any;
    if (!studentMetricsRes.ok || !studentMetricsData.success) {
      throw new Error(`Student metrics failed: ${studentMetricsData.message}`);
    }
    logger.info(`PASSED: Student dashboard metrics returned: ${JSON.stringify(studentMetricsData.data)}`);

    // ─── 18. Dashboard Metrics (Company) ─────────────────────────────────────
    logger.info('\nTest 18: Company task dashboard metrics with organizationId query param...');
    const companyMetricsRes  = await fetch(`${TASK_URL}/dashboard/metrics?organizationId=${orgId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    const companyMetricsData = await companyMetricsRes.json() as any;
    if (!companyMetricsRes.ok || !companyMetricsData.success) {
      throw new Error(`Company metrics failed: ${companyMetricsData.message}`);
    }
    logger.info(`PASSED: Company dashboard metrics returned: ${JSON.stringify(companyMetricsData.data)}`);

    // ─── 19. File Upload Submission (PDF) ────────────────────────────────────
    logger.info('\nTest 19: Student submits task via file upload (PDF)...');

    // Create a second task for file upload test
    const createTask2Res  = await fetch(TASK_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        internshipId,
        title      : 'Submit Project Report',
        description: 'PDF documentation of completed work.',
        priority   : 'MEDIUM',
        deadline   : taskDeadline,
        maxScore   : 50,
      }),
    });
    const createTask2Data = await createTask2Res.json() as any;
    const taskId2 = createTask2Data.data.id;

    // Assign to student
    await fetch(`${TASK_URL}/${taskId2}/assign`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({ studentIds: [studentRecord!.id] }),
    });

    // Build multipart form data with a minimal PDF blob
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
    const fileBlob  = new Blob([pdfBuffer], { type: 'application/pdf' });
    const formData  = new FormData();
    formData.append('submissionType', 'FILE');
    formData.append('remarks', 'PDF report attached');
    formData.append('submission', fileBlob, 'project_report.pdf');

    const fileSubmitRes  = await fetch(`${TASK_URL}/${taskId2}/submit`, {
      method : 'POST',
      headers: { Authorization: `Bearer ${tokenStudent}` },
      body   : formData,
    });
    const fileSubmitData = await fileSubmitRes.json() as any;
    if (!fileSubmitRes.ok || !fileSubmitData.success) {
      throw new Error(`File submission failed: ${fileSubmitData.message}`);
    }
    if (!fileSubmitData.data.submissionUrl) {
      throw new Error('Submission URL was not returned after file upload.');
    }
    logger.info(`PASSED: File upload submission succeeded. URL: ${fileSubmitData.data.submissionUrl}`);

    // ─── 20. Get Task Details ─────────────────────────────────────────────────
    logger.info('\nTest 20: Retrieving individual task details (company, student)...');

    const getTaskRes = await fetch(`${TASK_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${tokenCompany}` },
    });
    assertStatus(getTaskRes, 200, 'Get task by company');

    const getTaskStudentRes = await fetch(`${TASK_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    assertStatus(getTaskStudentRes, 200, 'Get task by assigned student');
    logger.info('PASSED: Task details accessible to both company and assigned student.');

    // ─── 21. Unassigned Student Cannot View Task ──────────────────────────────
    logger.info('\nTest 21: Unassigned student2 cannot view task details...');
    const getTaskForbidRes = await fetch(`${TASK_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assertStatus(getTaskForbidRes, 403, 'Unassigned student task view');
    logger.info('PASSED: Unassigned student blocked from viewing task (403).');

    // ─── 22. Low-Score Review = Rejected ─────────────────────────────────────
    logger.info('\nTest 22: Review with low score should mark submission as rejected...');
    const submissionId2 = fileSubmitData.data.id;
    const lowReviewRes  = await fetch(`${TASK_URL}/submissions/${submissionId2}/review`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCompany}` },
      body   : JSON.stringify({
        score   : 20,
        feedback: 'Missing key sections. Please redo.',
      }),
    });
    const lowReviewData = await lowReviewRes.json() as any;
    if (!lowReviewRes.ok || !lowReviewData.success) {
      throw new Error(`Low score review failed: ${lowReviewData.message}`);
    }

    // Verify the task was set to REJECTED (score 20/50 = 40% < 50% threshold)
    const rejectedTask = await prisma.internshipTask.findUnique({ where: { id: taskId2 } });
    if (rejectedTask!.status !== 'REJECTED') {
      throw new Error(`Task should be REJECTED after 20/50 score review, but got: ${rejectedTask!.status}`);
    }
    logger.info('PASSED: Low-score review correctly rejected — task is REJECTED (score < 50% threshold).');

    // ─── 23. Internship Tasks Visible to Student (Assigned Internship) ────────
    logger.info('\nTest 23: Student views tasks for their internship...');
    const studentInternshipTasksRes  = await fetch(`${TASK_URL}/internship/${internshipId}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const studentInternshipTasksData = await studentInternshipTasksRes.json() as any;
    assertStatus(studentInternshipTasksRes, 200, 'Student view internship tasks');
    if (!Array.isArray(studentInternshipTasksData.data)) {
      throw new Error('Internship tasks not returned as array for student.');
    }
    logger.info(`PASSED: Student can see ${studentInternshipTasksData.data.length} task(s) in their internship.`);

    // ─── 24. Redis Cache: Internship Tasks ────────────────────────────────────
    logger.info('\nTest 24: Validating Redis Cache-Aside for internship tasks...');
    const internshipCacheKey = `internship:${internshipId}`;
    const cachedTasks = await redisClient.get(internshipCacheKey);
    if (!cachedTasks) {
      logger.info('INFO: Internship tasks not in cache (may have been evicted). Fetching to populate...');
      await fetch(`${TASK_URL}/internship/${internshipId}`, {
        headers: { Authorization: `Bearer ${tokenCompany}` },
      });
      const reFetchedCache = await redisClient.get(internshipCacheKey);
      if (!reFetchedCache) throw new Error('Internship tasks were not cached after re-fetch.');
    }
    logger.info('PASSED: Internship tasks Cache-Aside confirmed.');

    // ─── 25. Admin Can View Dashboard Metrics for Any Student ─────────────────
    logger.info('\nTest 25: Admin can access any student\'s dashboard metrics...');
    const adminMetricsRes  = await fetch(`${TASK_URL}/dashboard/metrics?studentId=${studentRecord!.id}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const adminMetricsData = await adminMetricsRes.json() as any;
    if (!adminMetricsRes.ok || !adminMetricsData.success) {
      throw new Error(`Admin metrics by studentId failed: ${adminMetricsData.message}`);
    }
    logger.info(`PASSED: Admin metrics for student returned: ${JSON.stringify(adminMetricsData.data)}`);

    // ─── 26. Unauthenticated Request is Rejected ──────────────────────────────
    logger.info('\nTest 26: Unauthenticated request must return 401...');
    const unauthRes = await fetch(`${TASK_URL}/my-tasks`);
    assertStatus(unauthRes, 401, 'Unauthenticated my-tasks');
    logger.info('PASSED: Unauthenticated request correctly rejected (401).');

    // ─── Summary ──────────────────────────────────────────────────────────────
    logger.info('\n==================================================');
    logger.info('ALL TASK & INTERNSHIP MODULE TESTS PASSED! ✓');
    logger.info('Module: TASK-001 | Tests: 26 | Phase 1 + Phase 2');
    logger.info('==================================================');

    await redisClient.quit();
    await prisma.$disconnect();
    process.exit(0);

  } catch (error: any) {
    logger.error(`\nTEST SUITE FAILED: ${error.message}`);
    try {
      await redisClient.quit();
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

runTests();
