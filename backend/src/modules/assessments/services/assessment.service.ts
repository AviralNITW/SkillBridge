import { Request, Response, NextFunction } from 'express';
import { PerformanceCategory }             from '@prisma/client';
import prisma                              from '../../../config/db';
import redisClient                         from '../../../config/redis';
import logger                              from '../../../config/logger';
import { AssessmentRepository }            from '../repositories/assessment.repository';
import {
  CreateAssessmentSchema,
  CreateFinalEvaluationSchema,
  UpdateAssessmentSchema,
  CreateRubricSchema,
  GenerateReportSchema,
} from '../validators/assessment.validator';

const repo = new AssessmentRepository();

// ─── Utility: derive PerformanceCategory from score ──────────────────────────
export function deriveCategory(score: number): PerformanceCategory {
  if (score >= 90) return 'OUTSTANDING';
  if (score >= 80) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 60) return 'AVERAGE';
  return 'NEEDS_IMPROVEMENT';
}

// ─── Utility: check certificate eligibility ──────────────────────────────────
async function checkEligibility(internshipId: string, overallScore: number): Promise<boolean> {
  if (overallScore < 60) return false;

  const internship = await prisma.internship.findUnique({
    where  : { id: internshipId },
    include: { tasks: { select: { status: true } } },
  });
  if (!internship || internship.status !== 'COMPLETED') return false;

  const allApproved = internship.tasks.every((t) => t.status === 'APPROVED');
  return allApproved;
}

// ─── Utility: notify user ────────────────────────────────────────────────────
async function notifyUser(userId: string, title: string, message: string) {
  try {
    await prisma.notification.create({ data: { userId, title, message } });
  } catch (_) {}
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
const CACHE_TTL = 900; // 15 minutes

async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redisClient.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch { return null; }
}

async function setCache(key: string, value: unknown): Promise<void> {
  try { await redisClient.setEx(key, CACHE_TTL, JSON.stringify(value)); } catch (_) {}
}

async function evictCache(...keys: string[]): Promise<void> {
  try { if (keys.length > 0) await redisClient.del(keys); } catch (_) {}
}

// ─── Service ──────────────────────────────────────────────────────────────────
export class AssessmentService {

  // ─── Create Assessment ────────────────────────────────────────────────────
  async createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Only organizations, mentors, and admins can create assessments.' });
        return;
      }

      const parsed = CreateAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }
      const body = parsed.data;

      // Verify the internship exists and reviewer has access
      const internship = await prisma.internship.findUnique({
        where  : { id: body.internshipId },
        include: { student: { select: { userId: true } } },
      });
      if (!internship) {
        res.status(404).json({ success: false, message: 'Internship not found.' });
        return;
      }
      if (user.role !== 'ADMIN' && internship.organizationId) {
        const isMember = await prisma.organizationMember.findFirst({
          where: { organizationId: internship.organizationId, userId: user.id },
        });
        const isCreator = await prisma.opportunity.findFirst({
          where: { id: internship.opportunityId, createdBy: user.id },
        });
        if (!isMember && !isCreator) {
          res.status(403).json({ success: false, message: 'You are not authorized to assess this internship.' });
          return;
        }
      }

      // Verify submission belongs to this internship (if provided)
      if (body.submissionId) {
        const submission = await prisma.internshipSubmission.findUnique({
          where  : { id: body.submissionId },
          include: { task: { select: { internshipId: true } } },
        });
        if (!submission || submission.task.internshipId !== body.internshipId) {
          res.status(400).json({ success: false, message: 'Submission does not belong to this internship.' });
          return;
        }
      }

      const category = deriveCategory(body.score);

      const assessment = await repo.createAssessment({
        internshipId         : body.internshipId,
        submissionId         : body.submissionId || null,
        reviewerId           : user.id,
        assessmentType       : body.assessmentType,
        score                : body.score,
        rating               : body.rating,
        feedback             : body.feedback,
        category,
        rubricId             : body.rubricId,
        taskCompletionScore  : body.taskCompletionScore ?? null,
        technicalSkillsScore : body.technicalSkillsScore ?? null,
        communicationScore   : body.communicationScore ?? null,
        problemSolvingScore  : body.problemSolvingScore ?? null,
        professionalismScore : body.professionalismScore ?? null,
        isFinal              : false,
      });

      // Evict relevant caches
      await evictCache(
        `student_assessments:${internship.studentId}`,
        `internship_score:${body.internshipId}`,
      );

      // Notify student
      await notifyUser(
        internship.student.userId,
        'New Assessment Received',
        `You received a score of ${body.score}/100 for your ${body.assessmentType.replace('_', ' ').toLowerCase()}.`,
      );

      logger.info(`Assessment created: ${assessment.id} for internship ${body.internshipId}`);
      res.status(201).json({ success: true, data: assessment, message: 'Assessment created successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Get Assessment By ID ─────────────────────────────────────────────────
  async getAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user  = (req as any).user;
      const { id } = req.params;

      const cacheKey = `assessment:${id}`;
      const cached   = await getFromCache<any>(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, message: 'Fetched from cache.' });
        return;
      }

      const assessment = await repo.findAssessmentById(id);
      if (!assessment) {
        res.status(404).json({ success: false, message: 'Assessment not found.' });
        return;
      }

      // RBAC: students can only see their own assessments
      if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id } });
        if (!student || assessment.internship.studentId !== student.id) {
          res.status(403).json({ success: false, message: 'Access denied.' });
          return;
        }
      }

      await setCache(cacheKey, assessment);
      res.json({ success: true, data: assessment });
    } catch (error) {
      next(error);
    }
  }

  // ─── Update Assessment ─────────────────────────────────────────────────────
  async updateAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user  = (req as any).user;
      const { id } = req.params;

      if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Only organizations, mentors, and admins can update assessments.' });
        return;
      }

      const assessment = await repo.findAssessmentById(id);
      if (!assessment) {
        res.status(404).json({ success: false, message: 'Assessment not found.' });
        return;
      }

      // Immutability: final evaluations cannot be updated
      if (assessment.isFinal) {
        res.status(400).json({ success: false, message: 'Final evaluations are immutable and cannot be updated.' });
        return;
      }

      // Only the reviewer or admin can update
      if (user.role !== 'ADMIN' && assessment.reviewerId !== user.id) {
        res.status(403).json({ success: false, message: 'Only the original reviewer or an admin can update this assessment.' });
        return;
      }

      const parsed = UpdateAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }
      const body     = parsed.data;
      const newScore = body.score ?? Number(assessment.score);
      const category = deriveCategory(newScore);

      const updated = await repo.updateAssessment(id, { ...body, category });

      await evictCache(
        `assessment:${id}`,
        `student_assessments:${assessment.internship.studentId}`,
        `internship_score:${assessment.internshipId}`,
      );

      res.json({ success: true, data: updated, message: 'Assessment updated.' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Create Final Evaluation ───────────────────────────────────────────────
  async createFinalEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user          = (req as any).user;
      const { internshipId } = req.params;

      if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Only organizations, mentors, and admins can submit final evaluations.' });
        return;
      }

      const parsed = CreateFinalEvaluationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }
      const body = parsed.data;

      const internship = await prisma.internship.findUnique({
        where  : { id: internshipId },
        include: {
          student : { select: { id: true, userId: true } },
          tasks   : { select: { status: true } },
        },
      });
      if (!internship) {
        res.status(404).json({ success: false, message: 'Internship not found.' });
        return;
      }

      // Only one final evaluation per internship
      const existing = await prisma.internshipAssessment.findFirst({
        where: { internshipId, isFinal: true },
      });
      if (existing) {
        res.status(409).json({ success: false, message: 'A final evaluation already exists for this internship.' });
        return;
      }

      const category = deriveCategory(body.score);

      const assessment = await repo.createAssessment({
        internshipId         : internshipId,
        submissionId         : null,
        reviewerId           : user.id,
        assessmentType       : 'FINAL_EVALUATION',
        score                : body.score,
        rating               : body.rating,
        feedback             : body.feedback,
        category,
        rubricId             : null,
        taskCompletionScore  : body.taskCompletionScore ?? null,
        technicalSkillsScore : body.technicalSkillsScore ?? null,
        communicationScore   : body.communicationScore ?? null,
        problemSolvingScore  : body.problemSolvingScore ?? null,
        professionalismScore : body.professionalismScore ?? null,
        isFinal              : true,
      });

      // Evict caches
      await evictCache(
        `student_assessments:${internship.student.id}`,
        `internship_score:${internshipId}`,
      );

      // Notify student
      await notifyUser(
        internship.student.userId,
        'Final Evaluation Submitted',
        `Your final internship evaluation has been submitted. Score: ${body.score}/100 — ${category.replace('_', ' ')}.`,
      );

      logger.info(`Final evaluation created for internship ${internshipId} by reviewer ${user.id}`);
      res.status(201).json({ success: true, data: assessment, message: 'Final evaluation submitted. It is now immutable.' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Get Student Assessments ──────────────────────────────────────────────
  async getStudentAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user      = (req as any).user;
      const { studentId } = req.params;

      // RBAC: students can only view their own assessments
      if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id } });
        if (!student || student.id !== studentId) {
          res.status(403).json({ success: false, message: 'You can only view your own assessments.' });
          return;
        }
      }

      const cacheKey   = `student_assessments:${studentId}`;
      const cached     = await getFromCache<any[]>(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached });
        return;
      }

      const assessments = await repo.getStudentAssessments(studentId);
      await setCache(cacheKey, assessments);
      res.json({ success: true, data: assessments });
    } catch (error) {
      next(error);
    }
  }

  // ─── Get Internship Evaluation ────────────────────────────────────────────
  async getInternshipEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user          = (req as any).user;
      const { internshipId } = req.params;

      const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
      if (!internship) {
        res.status(404).json({ success: false, message: 'Internship not found.' });
        return;
      }

      // Students can only see their own internship evaluations
      if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id } });
        if (!student || internship.studentId !== student.id) {
          res.status(403).json({ success: false, message: 'Access denied.' });
          return;
        }
      }

      const cacheKey   = `internship_score:${internshipId}`;
      const cached     = await getFromCache<any>(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached });
        return;
      }

      const [assessments, aggregated, report] = await Promise.all([
        repo.getInternshipAssessments(internshipId),
        repo.aggregateInternshipScore(internshipId),
        repo.getReport(internshipId),
      ]);

      const payload = { assessments, aggregated, report };
      await setCache(cacheKey, payload);
      res.json({ success: true, data: payload });
    } catch (error) {
      next(error);
    }
  }

  // ─── Generate Report ──────────────────────────────────────────────────────
  async generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Only organizations, mentors, and admins can generate reports.' });
        return;
      }

      const parsed = GenerateReportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }
      const { internshipId, studentId } = parsed.data;

      const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
      if (!internship) {
        res.status(404).json({ success: false, message: 'Internship not found.' });
        return;
      }

      const aggregated = await repo.aggregateInternshipScore(internshipId);
      const eligible   = await checkEligibility(internshipId, aggregated.overallScore);
      const category   = deriveCategory(aggregated.overallScore);

      const report = await repo.upsertReport({
        studentId,
        internshipId,
        overallScore           : aggregated.overallScore,
        averageTaskScore       : aggregated.averageTaskScore,
        finalEvaluationScore   : aggregated.finalEvaluationScore,
        performanceCategory    : category,
        eligibleForCertificate : eligible,
      });

      // Evict caches
      await evictCache(
        `internship_score:${internshipId}`,
        `student_assessments:${studentId}`,
        `assessment_report:${internshipId}:${studentId}`,
      );

      // Notify student
      const student = await prisma.student.findUnique({
        where : { id: studentId },
        select: { userId: true },
      });
      if (student) {
        const notifMsg = eligible
          ? `Your internship report has been generated! Score: ${aggregated.overallScore}/100 — ${category}. You are eligible for a certificate!`
          : `Your internship report has been generated. Score: ${aggregated.overallScore}/100 — ${category}.`;
        await notifyUser(student.userId, 'Assessment Report Generated', notifMsg);

        if (eligible) {
          await notifyUser(student.userId, 'Certificate Eligibility Achieved 🎉', 'You are now eligible to receive your internship completion certificate!');
        }
      }

      logger.info(`Report generated for internship ${internshipId}, eligible: ${eligible}`);
      res.status(201).json({ success: true, data: report, message: 'Assessment report generated.' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Get Report ───────────────────────────────────────────────────────────
  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user          = (req as any).user;
      const { internshipId } = req.params;

      const report = await repo.getReport(internshipId);
      if (!report) {
        res.status(404).json({ success: false, message: 'No report found for this internship.' });
        return;
      }

      // Students can only see their own reports
      if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id } });
        if (!student || report.studentId !== student.id) {
          res.status(403).json({ success: false, message: 'Access denied.' });
          return;
        }
      }

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  // ─── Create Rubric ────────────────────────────────────────────────────────
  async createRubric(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Only organizations, mentors, and admins can create rubrics.' });
        return;
      }

      const parsed = CreateRubricSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }
      const body = parsed.data;

      // Verify org exists
      const org = await prisma.organization.findUnique({ where: { id: body.organizationId } });
      if (!org) {
        res.status(404).json({ success: false, message: 'Organization not found.' });
        return;
      }

      const rubric = await repo.createRubric({
        organizationId : body.organizationId,
        createdBy      : user.id,
        name           : body.name,
        description    : body.description,
        maxScore       : body.maxScore,
        criteria       : body.criteria,
      });

      logger.info(`Rubric created: ${rubric.id} by user ${user.id}`);
      res.status(201).json({ success: true, data: rubric, message: 'Rubric created successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Get Rubrics ──────────────────────────────────────────────────────────
  async getRubrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.query as { organizationId?: string };
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId query parameter is required.' });
        return;
      }

      const rubrics = await repo.getRubrics(organizationId);
      res.json({ success: true, data: rubrics });
    } catch (error) {
      next(error);
    }
  }

  // ─── Dashboard Metrics ────────────────────────────────────────────────────
  async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user           = (req as any).user;
      const { studentId, organizationId } = req.query as { studentId?: string; organizationId?: string };

      let metrics: any;

      if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id } });
        if (!student) { res.status(404).json({ success: false, message: 'Student profile not found.' }); return; }
        metrics = await repo.getStudentDashboardMetrics(student.id);
      } else if (user.role === 'MENTOR') {
        metrics = await repo.getMentorDashboardMetrics(user.id);
      } else if (user.role === 'ADMIN' && studentId) {
        metrics = await repo.getStudentDashboardMetrics(studentId);
      } else if (user.role === 'ADMIN' && organizationId) {
        metrics = await repo.getOrganizationDashboardMetrics(organizationId);
      } else {
        // COMPANY
        const org = await prisma.organization.findFirst({
          where: { userId: user.id },
        });
        if (!org) { res.status(404).json({ success: false, message: 'Organization not found.' }); return; }
        const targetOrgId = organizationId || org.id;
        metrics = await repo.getOrganizationDashboardMetrics(targetOrgId);
      }

      res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }
}
