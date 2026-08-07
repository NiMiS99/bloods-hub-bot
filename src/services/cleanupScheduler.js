// src/services/cleanupScheduler.js
// Daily cron that prunes old activity_log rows (>90 days) to prevent
// unbounded table growth. Aggregated totals are preserved in users table.
// Discord logs pruned at 30 days (less useful for analytics).
const cron = require('node-cron');
const { Op } = require('sequelize');
const { ActivityLog, DiscordLog } = require('../db');
const logger = require('../utils/logger');

const ACTIVITY_RETENTION_DAYS = 90;
const DISCORD_LOG_RETENTION_DAYS = 30;

class CleanupScheduler {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    // Run at 4:00 AM every day.
    this.task = cron.schedule('0 4 * * *', () => this.run().catch((e) => logger.error('cleanup scheduler:', e)));
    logger.info(`CleanupScheduler started (daily at 4:00 AM). Activity retention: ${ACTIVITY_RETENTION_DAYS}d, Discord log: ${DISCORD_LOG_RETENTION_DAYS}d`);
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const activityCutoff = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 86400 * 1000);
    const discordCutoff = new Date(Date.now() - DISCORD_LOG_RETENTION_DAYS * 86400 * 1000);

    // Prune old activity_log rows (90 days — keep for analytics)
    const deletedActivity = await ActivityLog.destroy({
      where: { occurred_at: { [Op.lt]: activityCutoff } },
    });
    if (deletedActivity > 0) {
      logger.info(`Cleanup: pruned ${deletedActivity} activity_log rows older than ${ACTIVITY_RETENTION_DAYS} days.`);
    }

    // Prune old discord_logs rows (30-day retention)
    const deletedDiscordLogs = await DiscordLog.destroy({
      where: { created_at: { [Op.lt]: discordCutoff } },
    });
    if (deletedDiscordLogs > 0) {
      logger.info(`Cleanup: pruned ${deletedDiscordLogs} discord_logs rows older than ${DISCORD_LOG_RETENTION_DAYS} days.`);
    }
  }
}

module.exports = CleanupScheduler;
