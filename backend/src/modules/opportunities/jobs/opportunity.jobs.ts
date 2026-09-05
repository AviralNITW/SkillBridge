import { OpportunityService } from '../services/opportunity.service';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';

const oppService = new OpportunityService();

let expiryTimer: NodeJS.Timeout | null = null;
let featuredTimer: NodeJS.Timeout | null = null;
let analyticsTimer: NodeJS.Timeout | null = null;

export async function runExpiryCleanup(): Promise<number> {
  try {
    const closedCount = await oppService.closeExpired();
    logger.info(`[JOB] Expired Opportunity Cleanup: Closed ${closedCount} expired opportunities.`);
    return closedCount;
  } catch (err: any) {
    logger.error(`[JOB] Expired Opportunity Cleanup failed: ${err.message}`);
    return 0;
  }
}

export async function runFeaturedRefresh(): Promise<void> {
  try {
    // Clear cache key to force rebuild
    await redisClient.del('featured_opportunities');
    logger.info('[JOB] Featured Opportunity Refresh: Evicted cached featured opportunities.');
  } catch (err: any) {
    logger.error(`[JOB] Featured Opportunity Refresh failed: ${err.message}`);
  }
}

export async function runAnalyticsAggregation(): Promise<void> {
  try {
    // Mock aggregation logic - in production this would compute trends/conversion rates and update DB
    logger.info('[JOB] Analytics Aggregation: Aggregated views, applications, and conversion rates.');
  } catch (err: any) {
    logger.error(`[JOB] Analytics Aggregation failed: ${err.message}`);
  }
}

export function initOpportunityJobs(): void {
  logger.info('Initializing Opportunity Module background timers...');

  // 1. Expired Opportunity Cleanup (Hourly: 60 * 60 * 1000 ms)
  // Run once immediately, then set interval
  runExpiryCleanup();
  expiryTimer = setInterval(runExpiryCleanup, 60 * 60 * 1000);

  // 2. Featured Opportunity Refresh (Daily: 24 * 60 * 60 * 1000 ms)
  runFeaturedRefresh();
  featuredTimer = setInterval(runFeaturedRefresh, 24 * 60 * 60 * 1000);

  // 3. Analytics Aggregation (Every 15 Minutes: 15 * 60 * 1000 ms)
  runAnalyticsAggregation();
  analyticsTimer = setInterval(runAnalyticsAggregation, 15 * 60 * 1000);
}

export function stopOpportunityJobs(): void {
  if (expiryTimer) clearInterval(expiryTimer);
  if (featuredTimer) clearInterval(featuredTimer);
  if (analyticsTimer) clearInterval(analyticsTimer);
  logger.info('Stopped Opportunity Module background timers.');
}
