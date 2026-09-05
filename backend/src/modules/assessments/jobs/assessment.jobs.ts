import prisma  from '../../../config/db';
import logger  from '../../../config/logger';
import { AssessmentRepository } from '../repositories/assessment.repository';
import { deriveCategory }       from '../services/assessment.service';

const repo = new AssessmentRepository();

// ─── Job 1: Score Aggregation (Every Hour) ────────────────────────────────────
// Re-computes internship overall scores for all active internships that have assessments.
async function runScoreAggregation(): Promise<void> {
  try {
    logger.info('[JOB-ASM] Score Aggregation: Starting...');

    const activeInternships = await prisma.internship.findMany({
      where  : { status: 'ACTIVE' },
      include: { assessments: { select: { id: true } } },
    });

    const toAggregate = activeInternships.filter((i) => i.assessments.length > 0);

    for (const internship of toAggregate) {
      try {
        const aggregated = await repo.aggregateInternshipScore(internship.id);
        // Update the cached score (stored in assessment_reports if exists)
        const existingReport = await repo.getReport(internship.id);
        if (existingReport) {
          const category = deriveCategory(aggregated.overallScore);
          await repo.upsertReport({
            studentId              : existingReport.studentId,
            internshipId           : internship.id,
            overallScore           : aggregated.overallScore,
            averageTaskScore       : aggregated.averageTaskScore,
            finalEvaluationScore   : aggregated.finalEvaluationScore,
            performanceCategory    : category,
            eligibleForCertificate : existingReport.eligibleForCertificate,
          });
        }
      } catch (innerErr) {
        logger.warn(`[JOB-ASM] Score aggregation failed for internship ${internship.id}: ${(innerErr as Error).message}`);
      }
    }

    logger.info(`[JOB-ASM] Score Aggregation: Updated scores for ${toAggregate.length} internship(s).`);
  } catch (err) {
    logger.error(`[JOB-ASM] Score Aggregation failed: ${(err as Error).message}`);
  }
}

// ─── Job 2: Auto Report Generation (Daily) ───────────────────────────────────
// Generates assessment reports for COMPLETED internships that have assessments but no report.
async function runAutoReportGeneration(): Promise<void> {
  try {
    logger.info('[JOB-ASM] Auto Report Generation: Starting...');

    const completedInternships = await prisma.internship.findMany({
      where  : { status: 'COMPLETED' },
      include: {
        assessments : { select: { score: true, isFinal: true } },
        report      : { select: { id: true } },
        student     : { select: { id: true, userId: true } },
        tasks       : { select: { status: true } },
      },
    });

    let generated = 0;
    for (const internship of completedInternships) {
      // Skip if already has a report or has no assessments
      if (internship.report || internship.assessments.length === 0) continue;

      try {
        const aggregated = await repo.aggregateInternshipScore(internship.id);
        const allApproved = internship.tasks.length > 0 && internship.tasks.every((t) => t.status === 'APPROVED');
        const eligible    = aggregated.overallScore >= 60 && allApproved;
        const category    = deriveCategory(aggregated.overallScore);

        await repo.upsertReport({
          studentId              : internship.student.id,
          internshipId           : internship.id,
          overallScore           : aggregated.overallScore,
          averageTaskScore       : aggregated.averageTaskScore,
          finalEvaluationScore   : aggregated.finalEvaluationScore,
          performanceCategory    : category,
          eligibleForCertificate : eligible,
        });

        // Notify student
        try {
          await prisma.notification.create({
            data: {
              userId  : internship.student.userId,
              title   : 'Assessment Report Generated',
              message : `Your internship assessment report has been auto-generated. Score: ${aggregated.overallScore}/100.`,
            },
          });
        } catch (_) {}

        generated++;
      } catch (innerErr) {
        logger.warn(`[JOB-ASM] Report generation failed for internship ${internship.id}: ${(innerErr as Error).message}`);
      }
    }

    logger.info(`[JOB-ASM] Auto Report Generation: Generated reports for ${generated} internship(s).`);
  } catch (err) {
    logger.error(`[JOB-ASM] Auto Report Generation failed: ${(err as Error).message}`);
  }
}

// ─── Job 3: Eligibility Checker (Every Hour) ─────────────────────────────────
// Re-evaluates certificate eligibility for recently-completed internships.
async function runEligibilityChecker(): Promise<void> {
  try {
    logger.info('[JOB-ASM] Eligibility Checker: Starting...');

    // Find all reports where eligibility might need to be re-checked
    const reports = await prisma.assessmentReport.findMany({
      where  : { eligibleForCertificate: false },
      include: {
        internship : {
          include: { tasks: { select: { status: true } } },
        },
        student    : { select: { id: true, userId: true } },
      },
    });

    let updated = 0;
    for (const report of reports) {
      const overallScore = Number(report.overallScore);
      const internship   = report.internship;

      if (internship.status !== 'COMPLETED') continue;
      const allApproved = internship.tasks.length > 0 && internship.tasks.every((t) => t.status === 'APPROVED');
      const eligible    = overallScore >= 60 && allApproved;

      if (eligible) {
        await prisma.assessmentReport.update({
          where: { id: report.id },
          data : { eligibleForCertificate: true, updatedAt: new Date() },
        });

        try {
          await prisma.notification.create({
            data: {
              userId  : report.student.userId,
              title   : 'Certificate Eligibility Achieved 🎉',
              message : 'Congratulations! You are now eligible to receive your internship completion certificate.',
            },
          });
        } catch (_) {}

        updated++;
      }
    }

    logger.info(`[JOB-ASM] Eligibility Checker: Updated eligibility for ${updated} report(s).`);
  } catch (err) {
    logger.error(`[JOB-ASM] Eligibility Checker failed: ${(err as Error).message}`);
  }
}

// ─── Job Initialization ───────────────────────────────────────────────────────
export function initAssessmentJobs(): void {
  // Job 1: Score Aggregation — every hour
  setInterval(runScoreAggregation, 60 * 60 * 1000);

  // Job 2: Auto Report Generation — every 24 hours
  setInterval(runAutoReportGeneration, 24 * 60 * 60 * 1000);

  // Job 3: Eligibility Checker — every hour
  setInterval(runEligibilityChecker, 60 * 60 * 1000);

  logger.info('[ASM-001] Assessment background jobs initialized (Score Aggregation, Report Generation, Eligibility Checker).');
}
