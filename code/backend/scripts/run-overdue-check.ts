/**
 * Manual one-off runner for the overdue check-in scheduler.
 *
 * Usage (from backend dir):
 *   npx ts-node scripts/run-overdue-check.ts
 *
 * Bootstraps a standalone Nest application context (no HTTP server), resolves
 * OverdueCheckinScheduler, runs it once against current DB state, and prints
 * the per-subject breakdown + summary. Useful for verifying the scheduler
 * logic without waiting for the daily cron window.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { OverdueCheckinScheduler } from '../src/modules/alerts/overdue-checkin.scheduler';

async function main(): Promise<void> {
  const logger = new Logger('RunOverdueCheck');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const scheduler = app.get(OverdueCheckinScheduler);
    logger.log('Running overdue check-in scan (manual)...');
    const result = await scheduler.runOnce();

    logger.log('--- Summary ---');
    logger.log(`Active assignments scanned: ${result.scanned}`);
    logger.log(`CHECKIN_OVERDUE events created: ${result.overdueCreated}`);
    logger.log(`SEVERE_OVERDUE events created: ${result.severeCreated}`);
    logger.log(`Skipped (already created today): ${result.skippedDedup}`);

    if (result.details.length > 0) {
      logger.log('--- Per-subject breakdown ---');
      for (const d of result.details) {
        logger.log(
          `subject=${d.subjectId.slice(0, 8)} scenario=${d.scenarioCode} ` +
          `missed=${d.missedDays}d threshold=${d.threshold}d → ${d.action}`,
        );
      }
    } else {
      logger.warn('No active scenario assignments found.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    logger.error(`Failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
