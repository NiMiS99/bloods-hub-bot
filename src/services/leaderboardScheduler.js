// src/services/leaderboardScheduler.js
// Periodically rebuilds leaderboard_cache rows for known (guild, game, metric)
// combinations so /leaderboard responses are fast. Runs every 5 minutes.
const cron = require('node-cron');
const { Op } = require('sequelize');
const { LeaderboardCache, GameStat, User, Game } = require('../db');
const logger = require('../utils/logger');

class LeaderboardScheduler {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    this.task = cron.schedule('*/5 * * * *', () => this.run().catch((e) => logger.error('lb scheduler:', e)));
    logger.info('LeaderboardScheduler started (every 5 min).');
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const games = await Game.findAll({ where: { is_active: true } });
    for (const guild of this.client.guilds.cache.values()) {
      // Discord-activity leaderboards
      await this._cacheDiscordActivity(guild.id);
      // Per-game leaderboards for every numeric metric present.
      for (const game of games) {
        await this._cacheGame(guild.id, game);
      }
    }
  }

  async _cacheDiscordActivity(guildId) {
    const metrics = ['total_voice_seconds', 'total_messages'];
    for (const metric of metrics) {
      const rows = await User.findAll({
        where: { guild_id: guildId },
        order: [[metric, 'DESC']],
        limit: 25,
      });
      const payload = rows.map((u, i) => ({
        userId: u.user_id.toString(),
        displayName: u.username,
        rank: i + 1,
        value: u[metric],
      }));
      await this._upsert(guildId, null, metric, payload);
    }
  }

  async _cacheGame(guildId, game) {
    const metrics = await GameStat.findAll({
      attributes: ['metric'],
      where: { guild_id: guildId, game_id: game.id, value_num: { [Op.ne]: null } },
      group: ['metric'],
      raw: true,
    });
    for (const { metric } of metrics) {
      const rows = await GameStat.findAll({
        where: { guild_id: guildId, game_id: game.id, metric, value_num: { [Op.ne]: null } },
        order: [['value_num', 'DESC']],
        limit: 25,
        include: [{ model: User, attributes: ['username'] }],
      });
      const payload = rows.map((s, i) => ({
        userId: s.user_id.toString(),
        displayName: s.User?.username ?? 'Unknown',
        rank: i + 1,
        value: s.value_num,
      }));
      await this._upsert(guildId, game.id, metric, payload);
    }
  }

  async _upsert(guildId, gameId, metric, payload) {
    await LeaderboardCache.create({
      guild_id: guildId,
      game_id: gameId,
      metric,
      scope: 'guild',
      payload,
      generated_at: new Date(),
    }).catch(() => {});
    // Keep only the latest 3 snapshots per (guild, game, metric, scope).
    // Use Sequelize to find and delete old entries instead of raw SQL hack.
    const oldEntries = await LeaderboardCache.findAll({
      where: {
        guild_id: guildId,
        game_id: gameId,
        metric,
        scope: 'guild',
      },
      order: [['generated_at', 'DESC']],
      offset: 3,
      limit: 100,
      attributes: ['id'],
    }).catch(() => []);
    if (oldEntries.length > 0) {
      await LeaderboardCache.destroy({
        where: { id: { [Op.in]: oldEntries.map((e) => e.id) } },
      }).catch(() => {});
    }
  }
}

module.exports = LeaderboardScheduler;
