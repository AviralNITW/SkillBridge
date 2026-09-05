import prisma from '../../../config/db';
import { AssessmentType, PerformanceCategory } from '@prisma/client';

export class AssessmentRepository {

  // ─── Assessment CRUD ────────────────────────────────────────────────────────

  async createAssessment(data: {
    internshipId         : string;
    submissionId?        : string | null;
    reviewerId           : string;
    assessmentType       : AssessmentType;
    score                : number;
    rating               : number;
    feedback?            : string | null;
    category             : PerformanceCategory;
    rubricId?            : string | null;
    taskCompletionScore? : number | null;
    technicalSkillsScore?: number | null;
    communicationScore?  : number | null;
    problemSolvingScore? : number | null;
    professionalismScore?: number | null;
    isFinal              : boolean;
  }) {
    return prisma.internshipAssessment.create({
      data: {
        internshipId         : data.internshipId,
        submissionId         : data.submissionId || null,
        reviewerId           : data.reviewerId,
        assessmentType       : data.assessmentType,
        score                : data.score,
        rating               : data.rating,
        feedback             : data.feedback || null,
        category             : data.category,
        rubricId             : data.rubricId || null,
        taskCompletionScore  : data.taskCompletionScore ?? null,
        technicalSkillsScore : data.technicalSkillsScore ?? null,
        communicationScore   : data.communicationScore ?? null,
        problemSolvingScore  : data.problemSolvingScore ?? null,
        professionalismScore : data.professionalismScore ?? null,
        isFinal              : data.isFinal,
      },
      include: {
        internship : { select: { id: true, status: true, opportunityId: true } },
        submission : { select: { id: true, submissionUrl: true } },
        rubric     : { select: { id: true, name: true } },
      },
    });
  }

  async findAssessmentById(id: string) {
    return prisma.internshipAssessment.findUnique({
      where  : { id },
      include: {
        internship : {
          include: {
            student     : { select: { id: true, firstName: true, lastName: true } },
            opportunity : { select: { id: true, title: true } },
          },
        },
        submission : { select: { id: true, submissionUrl: true, submissionType: true } },
        rubric     : { include: { criteria: true } },
      },
    });
  }

  async updateAssessment(id: string, data: {
    score?               : number;
    rating?              : number;
    feedback?            : string | null;
    category?            : PerformanceCategory;
    taskCompletionScore? : number | null;
    technicalSkillsScore?: number | null;
    communicationScore?  : number | null;
    problemSolvingScore? : number | null;
    professionalismScore?: number | null;
  }) {
    return prisma.internshipAssessment.update({
      where: { id },
      data : { ...data, updatedAt: new Date() },
    });
  }

  async getStudentAssessments(studentId: string) {
    return prisma.internshipAssessment.findMany({
      where: {
        internship: { studentId },
      },
      include: {
        internship : { select: { id: true, opportunityId: true, opportunity: { select: { title: true } } } },
        submission : { select: { id: true, submissionUrl: true } },
        rubric     : { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInternshipAssessments(internshipId: string) {
    return prisma.internshipAssessment.findMany({
      where  : { internshipId },
      include: {
        submission : { select: { id: true, submissionUrl: true, submissionType: true } },
        rubric     : { include: { criteria: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Rubric CRUD ────────────────────────────────────────────────────────────

  async createRubric(data: {
    organizationId : string;
    createdBy      : string;
    name           : string;
    description?   : string | null;
    maxScore       : number;
    criteria       : Array<{
      criteriaName     : string;
      description?     : string;
      weightPercentage : number;
      maxScore         : number;
    }>;
  }) {
    return prisma.assessmentRubric.create({
      data: {
        organizationId : data.organizationId,
        createdBy      : data.createdBy,
        name           : data.name,
        description    : data.description || null,
        maxScore       : data.maxScore,
        criteria       : {
          create: data.criteria.map((c) => ({
            criteriaName     : c.criteriaName,
            description      : c.description || null,
            weightPercentage : c.weightPercentage,
            maxScore         : c.maxScore,
          })),
        },
      },
      include: { criteria: true },
    });
  }

  async getRubrics(organizationId: string) {
    return prisma.assessmentRubric.findMany({
      where  : { organizationId, isActive: true },
      include: { criteria: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRubricById(id: string) {
    return prisma.assessmentRubric.findUnique({
      where  : { id },
      include: { criteria: true },
    });
  }

  // ─── Report CRUD ────────────────────────────────────────────────────────────

  async upsertReport(data: {
    studentId              : string;
    internshipId           : string;
    overallScore           : number;
    averageTaskScore?      : number | null;
    finalEvaluationScore?  : number | null;
    performanceCategory    : PerformanceCategory;
    eligibleForCertificate : boolean;
    reportUrl?             : string | null;
  }) {
    return prisma.assessmentReport.upsert({
      where  : { internshipId: data.internshipId },
      create : {
        studentId              : data.studentId,
        internshipId           : data.internshipId,
        overallScore           : data.overallScore,
        averageTaskScore       : data.averageTaskScore ?? null,
        finalEvaluationScore   : data.finalEvaluationScore ?? null,
        performanceCategory    : data.performanceCategory,
        eligibleForCertificate : data.eligibleForCertificate,
        reportUrl              : data.reportUrl || null,
        generatedAt            : new Date(),
        updatedAt              : new Date(),
      },
      update : {
        overallScore           : data.overallScore,
        averageTaskScore       : data.averageTaskScore ?? null,
        finalEvaluationScore   : data.finalEvaluationScore ?? null,
        performanceCategory    : data.performanceCategory,
        eligibleForCertificate : data.eligibleForCertificate,
        reportUrl              : data.reportUrl || null,
        generatedAt            : new Date(),
        updatedAt              : new Date(),
      },
    });
  }

  async getReport(internshipId: string) {
    return prisma.assessmentReport.findUnique({
      where  : { internshipId },
      include: {
        student    : { select: { id: true, firstName: true, lastName: true, userId: true } },
        internship : { select: { id: true, status: true, opportunityId: true, opportunity: { select: { title: true } } } },
      },
    });
  }

  // ─── Score Aggregation ──────────────────────────────────────────────────────

  async aggregateInternshipScore(internshipId: string): Promise<{
    averageTaskScore      : number | null;
    finalEvaluationScore  : number | null;
    overallScore          : number;
    taskAssessmentCount   : number;
  }> {
    const assessments = await prisma.internshipAssessment.findMany({
      where  : { internshipId },
      select : { score: true, isFinal: true, assessmentType: true },
    });

    const taskAssessments = assessments.filter((a) => !a.isFinal);
    const finalEval       = assessments.find((a) => a.isFinal);

    const taskScores = taskAssessments.map((a) => Number(a.score));
    const avgTask    = taskScores.length > 0
      ? taskScores.reduce((s, v) => s + v, 0) / taskScores.length
      : null;

    const finalScore = finalEval ? Number(finalEval.score) : null;

    // Formula: avgTask(70%) + finalEval(30%)
    let overall = 0;
    if (avgTask !== null && finalScore !== null) {
      overall = avgTask * 0.7 + finalScore * 0.3;
    } else if (avgTask !== null) {
      overall = avgTask;
    } else if (finalScore !== null) {
      overall = finalScore;
    }

    return {
      averageTaskScore    : avgTask,
      finalEvaluationScore: finalScore,
      overallScore        : parseFloat(overall.toFixed(2)),
      taskAssessmentCount : taskAssessments.length,
    };
  }

  // ─── Dashboard Metrics ──────────────────────────────────────────────────────

  async getStudentDashboardMetrics(studentId: string) {
    const assessments = await prisma.internshipAssessment.findMany({
      where : { internship: { studentId } },
      select: { score: true, category: true },
    });

    const scores = assessments.map((a) => Number(a.score));
    const avg    = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;

    const categoryCount: Record<string, number> = {};
    assessments.forEach((a) => {
      categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
    });

    // Latest overall performance category from report
    const report = await prisma.assessmentReport.findFirst({
      where  : { studentId },
      orderBy: { generatedAt: 'desc' },
      select : { performanceCategory: true, overallScore: true, eligibleForCertificate: true },
    });

    return {
      completedAssessments: assessments.length,
      averageScore        : parseFloat(avg.toFixed(2)),
      highestScore        : highest,
      performanceCategory : report?.performanceCategory ?? null,
      overallScore        : report ? Number(report.overallScore) : null,
      eligibleForCertificate: report?.eligibleForCertificate ?? false,
      categoryBreakdown   : categoryCount,
    };
  }

  async getOrganizationDashboardMetrics(organizationId: string) {
    const internships = await prisma.internship.findMany({
      where  : { organizationId },
      include: { assessments: { select: { score: true, category: true } } },
    });

    const allScores = internships.flatMap((i) => i.assessments.map((a) => Number(a.score)));
    const avgScore  = allScores.length > 0 ? allScores.reduce((s, v) => s + v, 0) / allScores.length : 0;

    const completed   = internships.filter((i) => i.status === 'COMPLETED').length;
    const outstanding = internships.flatMap((i) => i.assessments)
      .filter((a) => a.category === 'OUTSTANDING').length;

    const categoryDist: Record<string, number> = {};
    internships.flatMap((i) => i.assessments).forEach((a) => {
      categoryDist[a.category] = (categoryDist[a.category] || 0) + 1;
    });

    return {
      totalInternships           : internships.length,
      completedInternships       : completed,
      completionRate             : internships.length > 0 ? parseFloat(((completed / internships.length) * 100).toFixed(2)) : 0,
      averageInternScore         : parseFloat(avgScore.toFixed(2)),
      outstandingStudents        : outstanding,
      assessmentDistribution     : categoryDist,
    };
  }

  async getMentorDashboardMetrics(mentorUserId: string) {
    const assessments = await prisma.internshipAssessment.findMany({
      where  : { reviewerId: mentorUserId },
      select : { score: true, createdAt: true, category: true },
    });

    const pendingInternships = await prisma.internship.count({
      where: {
        opportunity : { createdBy: mentorUserId },
        status      : 'ACTIVE',
      },
    });

    const scores = assessments.map((a) => Number(a.score));
    const avg    = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;

    return {
      reviewsCompleted     : assessments.length,
      averageAssignedScore : parseFloat(avg.toFixed(2)),
      pendingEvaluations   : pendingInternships,
    };
  }
}
