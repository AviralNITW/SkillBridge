import prisma from '../../../config/db';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';

let deadlineReminderTimer: NodeJS.Timeout | null = null;
let overdueCheckerTimer: NodeJS.Timeout | null = null;
let progressAggregationTimer: NodeJS.Timeout | null = null;

// 1. Deadline Reminder (Daily): Alerts students 3 days before task deadline
export async function runDeadlineReminders(): Promise<number> {
  try {
    const threeDaysInFutureStart = new Date();
    threeDaysInFutureStart.setDate(threeDaysInFutureStart.getDate() + 3);
    threeDaysInFutureStart.setHours(0, 0, 0, 0);

    const threeDaysInFutureEnd = new Date(threeDaysInFutureStart);
    threeDaysInFutureEnd.setHours(23, 59, 59, 999);

    // Find tasks whose deadline is in this range and are still pending
    const tasks = await prisma.internshipTask.findMany({
      where: {
        deadline: {
          gte: threeDaysInFutureStart,
          lte: threeDaysInFutureEnd,
        },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      include: {
        assignments: {
          include: {
            student: true,
          },
        },
      },
    });

    let reminderCount = 0;
    for (const task of tasks) {
      for (const assignment of task.assignments) {
        await prisma.notification.create({
          data: {
            userId: assignment.student.userId,
            title: 'Task Deadline Approaching',
            message: `Reminder: Your assigned task "${task.title}" is due in 3 days (Deadline: ${task.deadline.toLocaleDateString()}).`,
          },
        });
        reminderCount++;
      }
    }

    if (reminderCount > 0) {
      logger.info(`[JOB] Task Deadline Reminders: Sent ${reminderCount} reminders.`);
    }
    return reminderCount;
  } catch (err: any) {
    logger.error(`[JOB] Task Deadline Reminders failed: ${err.message}`);
    return 0;
  }
}

// 2. Overdue Task Checker (Hourly): Marks overdue tasks as REJECTED
export async function runOverdueChecker(): Promise<number> {
  try {
    const now = new Date();

    const overdueTasks = await prisma.internshipTask.findMany({
      where: {
        deadline: { lt: now },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      include: {
        assignments: {
          include: {
            student: true,
          },
        },
      },
    });

    let overdueCount = 0;
    for (const task of overdueTasks) {
      // Mark task status as REJECTED in database
      await prisma.internshipTask.update({
        where: { id: task.id },
        data: { status: 'REJECTED' },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'TASK_OVERDUE_REJECTED',
          resourceType: 'TASK',
          resourceId: task.id,
        },
      });

      // Notify students
      for (const assignment of task.assignments) {
        await prisma.notification.create({
          data: {
            userId: assignment.student.userId,
            title: 'Task Overdue',
            message: `Your task "${task.title}" was marked overdue and status set to REJECTED.`,
          },
        });
      }
      overdueCount++;
    }

    if (overdueCount > 0) {
      logger.info(`[JOB] Overdue Task Checker: Marked ${overdueCount} tasks as overdue/rejected.`);
    }
    return overdueCount;
  } catch (err: any) {
    logger.error(`[JOB] Overdue Task Checker failed: ${err.message}`);
    return 0;
  }
}

// 3. Progress Aggregation (Every 15 Minutes): Calculates internship completion % and caches in Redis
export async function runProgressAggregation(): Promise<number> {
  try {
    const internships = await prisma.internship.findMany({
      where: { status: 'ACTIVE' },
      include: {
        tasks: true,
      },
    });

    let aggregatedCount = 0;
    for (const internship of internships) {
      const totalTasks = internship.tasks.filter((t) => t.status !== 'DRAFT').length;
      const completedTasks = internship.tasks.filter((t) => ['APPROVED', 'COMPLETED'].includes(t.status)).length;

      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const stats = {
        totalTasks,
        completedTasks,
        completionPercentage: parseFloat(completionPercentage.toFixed(2)),
      };

      // Store in Redis
      const redisKey = `internship_progress:${internship.id}`;
      await redisClient.set(redisKey, JSON.stringify(stats), { EX: 24 * 60 * 60 }); // Cache for 24h
      aggregatedCount++;
    }

    if (aggregatedCount > 0) {
      logger.debug(`[JOB] Internship Progress Aggregation: Calculated progress stats for ${aggregatedCount} active internships.`);
    }
    return aggregatedCount;
  } catch (err: any) {
    logger.error(`[JOB] Internship Progress Aggregation failed: ${err.message}`);
    return 0;
  }
}

export function initTaskJobs(): void {
  logger.info('Initializing Task Module background timers...');

  // 1. Deadline Reminder (Daily: 24h)
  runDeadlineReminders();
  deadlineReminderTimer = setInterval(runDeadlineReminders, 24 * 60 * 60 * 1000);

  // 2. Overdue Task Checker (Hourly: 1h)
  runOverdueChecker();
  overdueCheckerTimer = setInterval(runOverdueChecker, 60 * 60 * 1000);

  // 3. Progress Aggregation (Every 15 min)
  runProgressAggregation();
  progressAggregationTimer = setInterval(runProgressAggregation, 15 * 60 * 1000);
}

export function stopTaskJobs(): void {
  if (deadlineReminderTimer) clearInterval(deadlineReminderTimer);
  if (overdueCheckerTimer) clearInterval(overdueCheckerTimer);
  if (progressAggregationTimer) clearInterval(progressAggregationTimer);
  logger.info('Stopped Task Module background timers.');
}
