// src/services/metaScheduler.js
// Periodically fetches patch notes / meta / server-status for each game and
// stores the latest entry in game_meta. Deduplicates by (game_id, kind, url)
// and prunes entries older than 7 days to prevent unbounded growth.
const cron = require('node-cron');
const { Op } = require('sequelize');
const { Game, GameMeta } = require('../db');
const logger = require('../utils/logger');

class MetaScheduler {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    this.task = cron.schedule('0 */6 * * *', () => this.run().catch((e) => logger.error('meta scheduler:', e)));
    logger.info('MetaScheduler started (every 6h).');
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const games = await Game.findAll({ where: { is_active: true } });
    for (const game of games) {
      try {
        const mod = this._loadGameModule(game.code);
        if (mod?.fetchMeta) {
          const items = await mod.fetchMeta();
          for (const item of items) {
            // Dedup: skip if an entry with the same (game_id, kind, url) exists
            // and was fetched in the last 6 hours.
            if (item.url) {
              const existing = await GameMeta.findOne({
                where: {
                  game_id: game.id,
                  kind: item.kind,
                  url: item.url,
                  fetched_at: { [Op.gte]: new Date(Date.now() - 6 * 3600 * 1000) },
                },
              });
              if (existing) continue;
            }
            await GameMeta.create({
              game_id: game.id,
              kind: item.kind,
              title: item.title,
              body: item.body ?? null,
              url: item.url ?? null,
            });
          }
          logger.info(`Fetched meta for ${game.code}: ${items.length} item(s).`);
        }
      } catch (err) {
        logger.warn(`meta fetch failed for ${game.code}: ${err.message}`);
      }
    }

    // Prune entries older than 7 days.
    const deleted = await GameMeta.destroy({
      where: { fetched_at: { [Op.lt]: new Date(Date.now() - 7 * 86400 * 1000) } },
    });
    if (deleted > 0) logger.info(`Pruned ${deleted} old game_meta entries (>7 days).`);
  }

  _loadGameModule(code) {
    try {
      return require(`../modules/games/${code}`);
    } catch {
      return null;
    }
  }
}

module.exports = MetaScheduler;
