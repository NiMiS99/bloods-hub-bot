// src/services/cleanupScheduler.js
// Daily cron that prunes old activity_log rows (>30 days) to prevent
// unbounded table growth. Aggregated totals are preserved in users table.
const cron = require('node-cron');
const { Op } = require('sequelize');
const { ActivityLog, DiscordLog } = require('../db');
const logger = require('../utils/logger');

class CleanupScheduler {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    // Run at 4:00 AM every day.
    this.task = cron.schedule('0 4 * * *', () => this.run().catch((e) => logger.error('cleanup scheduler:', e)));
    logger.info('CleanupScheduler started (daily at 4:00 AM).');
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const cutoff = new Date(Date.now() - 30 * 86400 * 1000);

    // Prune old activity_log rows
    const deletedActivity = await ActivityLog.destroy({
      where: { occurred_at: { [Op.lt]: cutoff } },
    });
    if (deletedActivity > 0) {
      logger.info(`Cleanup: pruned ${deletedActivity} activity_log rows older than 30 days.`);
    }

    // Prune old discord_logs rows (same 30-day retention)
    const deletedDiscordLogs = await DiscordLog.destroy({
      where: { created_at: { [Op.lt]: cutoff } },
    });
    if (deletedDiscordLogs > 0) {
      logger.info(`Cleanup: pruned ${deletedDiscordLogs} discord_logs rows older than 30 days.`);
    }
  }
}

module.exports = CleanupScheduler;
