import cron from 'node-cron';
import { sessionManager } from './session-manager.js';

/**
 * Session Cleanup Scheduler
 *
 * Phase 5.1 - Week 3, Task 3.4: Scheduled Session Cleanup (Issue #14)
 *
 * Implements periodic cleanup of expired sessions to prevent the session store
 * from growing indefinitely. Uses node-cron for scheduling.
 *
 * Configuration:
 * - SESSION_CLEANUP_SCHEDULE: Cron expression for cleanup frequency (default: every hour)
 * - SESSION_CLEANUP_ENABLED: Enable/disable scheduled cleanup (default: true)
 *
 * Cron Expression Format: minute hour day month dayOfWeek
 * Examples:
 * - Every hour at minute 0
 * - Every 30 minutes
 * - Daily at midnight
 * - Every 6 hours
 */

// Configurable cleanup schedule (default: every hour)
const DEFAULT_CLEANUP_SCHEDULE = '0 * * * *'; // Every hour at minute 0

let cleanupTask: cron.ScheduledTask | null = null;

/**
 * Start the session cleanup scheduler
 */
export function startCleanupScheduler(): void {
  // Check if cleanup is enabled
  const isEnabled = process.env.SESSION_CLEANUP_ENABLED !== 'false';

  if (!isEnabled) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Session cleanup scheduler disabled via SESSION_CLEANUP_ENABLED',
    }));
    return;
  }

  // Get cleanup schedule from environment or use default
  const schedule = process.env.SESSION_CLEANUP_SCHEDULE || DEFAULT_CLEANUP_SCHEDULE;

  // Validate cron expression
  if (!cron.validate(schedule)) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Invalid cron expression for session cleanup',
      schedule,
      using: DEFAULT_CLEANUP_SCHEDULE,
    }));
    // Fall back to default schedule
    startCleanupSchedulerWithExpression(DEFAULT_CLEANUP_SCHEDULE);
    return;
  }

  startCleanupSchedulerWithExpression(schedule);
}

/**
 * Start cleanup scheduler with a specific cron expression
 */
function startCleanupSchedulerWithExpression(schedule: string): void {
  // Stop existing task if any
  if (cleanupTask) {
    cleanupTask.stop();
  }

  // Schedule the cleanup task
  cleanupTask = cron.schedule(schedule, async () => {
    const startTime = Date.now();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Starting scheduled session cleanup',
      schedule,
    }));

    try {
      const deletedCount = await sessionManager.cleanupExpiredSessions();
      const duration = Date.now() - startTime;

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Scheduled session cleanup completed',
        deletedCount,
        duration: `${duration}ms`,
        nextRun: getNextRunTime(schedule),
      }));
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Session cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }));
    }
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Session cleanup scheduler started',
    schedule,
    description: getScheduleDescription(schedule),
    nextRun: getNextRunTime(schedule),
  }));
}

/**
 * Stop the session cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Session cleanup scheduler stopped',
    }));
  }
}

/**
 * Get human-readable description of the schedule
 */
function getScheduleDescription(schedule: string): string {
  const parts = schedule.split(' ');

  if (schedule === '0 * * * *') return 'Every hour';
  if (schedule === '*/30 * * * *') return 'Every 30 minutes';
  if (schedule === '*/15 * * * *') return 'Every 15 minutes';
  if (schedule === '0 0 * * *') return 'Daily at midnight';
  if (schedule === '0 */6 * * *') return 'Every 6 hours';
  if (schedule === '0 */12 * * *') return 'Every 12 hours';

  return `Cron: ${schedule}`;
}

/**
 * Get the next scheduled run time
 */
function getNextRunTime(schedule: string): string {
  // Parse cron expression to calculate next run time
  // For simplicity, return a generic message
  // A full implementation would calculate the exact next run time
  return 'Next run scheduled per cron expression';
}

/**
 * Manually trigger session cleanup (for testing/maintenance)
 */
export async function triggerManualCleanup(): Promise<number> {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Manual session cleanup triggered',
  }));

  try {
    const deletedCount = await sessionManager.cleanupExpiredSessions();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Manual session cleanup completed',
      deletedCount,
    }));

    return deletedCount;
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Manual session cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    throw error;
  }
}
