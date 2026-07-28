// src/services/statRefreshScheduler.js
// Daily cron that auto-refreshes stats for all users with linked external accounts.
// Runs at 5:00 AM to avoid peak hours.
const cron = require('node-cron');
const { ExternalAccount, User, Game } = require('../db');
const { getApiForGame } = require('./api');
const logger = require('../utils/logger');

class StatRefreshScheduler {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    this.task = cron.schedule('0 5 * * *', () => this.run().catch((e) => logger.error('stat refresh scheduler:', e)));
    logger.info('StatRefreshScheduler started (daily at 5:00 AM).');
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const accounts = await ExternalAccount.findAll();
    if (accounts.length === 0) return;

    logger.info(`StatRefresh: refreshing ${accounts.length} linked accounts...`);
    let success = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        const user = await User.findOne({
          where: { user_id: account.user_id, guild_id: account.guild_id },
        });
        if (!user) continue;

        const game = await Game.findOne({ where: { api_provider: account.provider } });
        if (!game) continue;

        const api = getApiForGame(game);
        if (!api || !api.enabled) continue;

        const count = await api.refreshForUser(
          { GameStat: require('../db').GameStat, Game },
          user,
          account
        );
        if (count > 0) success++;
      } catch (err) {
        failed++;
        logger.warn(`StatRefresh failed for ${account.provider}:${account.external_id}: ${err.message}`);
      }
    }

    logger.info(`StatRefresh complete: ${success} success, ${failed} failed.`);
  }
}

module.exports = StatRefreshScheduler;
