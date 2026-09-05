import { ApplicationRepository } from '../repositories/application.repository';
import logger from '../../../config/logger';
import prisma from '../../../config/db';

const appRepository = new ApplicationRepository();

let draftCleanupTimer: NodeJS.Timeout | null = null;
let statusReminderTimer: NodeJS.Timeout | null = null;

// Cleanup DRAFT applications older than 30 days
export async function runDraftCleanup(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleDrafts = await appRepository.findStaleDrafts(thirtyDaysAgo);
    if (staleDrafts.length > 0) {
      const ids = staleDrafts.map((d) => d.id);
      const result = await appRepository.deleteDrafts(ids);
      logger.info(`[JOB] Draft Cleanup: Removed ${result.count} stale draft applications.`);
      return result.count;
    }
    return 0;
  } catch (err: any) {
    logger.error(`[JOB] Draft Cleanup failed: ${err.message}`);
    return 0;
  }
}

// Send reminders for applications in SUBMITTED or UNDER_REVIEW for more than 7 days
export async function runStatusReminders(): Promise<number> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pendingApps = await prisma.application.findMany({
      where: {
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        updatedAt: { lt: sevenDaysAgo },
      },
      include: {
        opportunity: true,
      },
    });

    let reminderCount = 0;
    for (const app of pendingApps) {
      // Avoid duplicate reminders within short intervals by checking if we already reminded recently or just insert a notification
      // Insert notification for opportunity creator
      await prisma.notification.create({
        data: {
          userId: app.opportunity.createdBy,
          title: 'Pending Review Reminder',
          message: `Application for "${app.opportunity.title}" has been pending for over 7 days. Please review it.`,
        },
      });
      reminderCount++;
    }

    if (reminderCount > 0) {
      logger.info(`[JOB] Status Reminders: Dispatched ${reminderCount} reminders to opportunity creators.`);
    }
    return reminderCount;
  } catch (err: any) {
    logger.error(`[JOB] Status Reminders failed: ${err.message}`);
    return 0;
  }
}

export function initApplicationJobs(): void {
  logger.info('Initializing Application Module background timers...');

  // 1. Run draft cleanup once daily
  runDraftCleanup();
  draftCleanupTimer = setInterval(runDraftCleanup, 24 * 60 * 60 * 1000);

  // 2. Run status reminders daily
  runStatusReminders();
  statusReminderTimer = setInterval(runStatusReminders, 24 * 60 * 60 * 1000);
}

export function stopApplicationJobs(): void {
  if (draftCleanupTimer) clearInterval(draftCleanupTimer);
  if (statusReminderTimer) clearInterval(statusReminderTimer);
  logger.info('Stopped Application Module background timers.');
}
