// src/services/api/baseApi.js
// Abstract base class for game-API providers. Each provider implements:
//   - fetchProfile(externalId, region?)   -> normalized profile object
//   - fetchStats(externalId, region?)     -> array of { metric, valueNum, valueStr }
//   - refreshForUser(user, externalAccount) -> persists stats into game_stats
const logger = require('../../utils/logger');

class BaseGameApi {
  constructor({ provider, gameCode }) {
    this.provider = provider;
    this.gameCode = gameCode;
  }

  async fetchProfile(/* externalId, region */) {
    throw new Error(`${this.constructor.name}.fetchProfile not implemented`);
  }
  async fetchStats(/* externalId, region */) {
    throw new Error(`${this.constructor.name}.fetchStats not implemented`);
  }

  /**
   * Persist fetched stats into the game_stats table for a user.
   * @param {object} models  - { GameStat, Game }
   * @param {object} user    - Discord user row { user_id, guild_id }
   * @param {object} account - external_accounts row
   */
  async refreshForUser(models, user, account) {
    const game = await models.Game.findOne({ where: { code: this.gameCode } });
    if (!game) throw new Error(`Unknown game code: ${this.gameCode}`);
    const stats = await this.fetchStats(account.external_id, account.region).catch((err) => {
      logger.warn(`[${this.provider}] stat fetch failed for ${account.external_id}: ${err.message}`);
      return [];
    });
    for (const s of stats) {
      await models.GameStat.upsert({
        user_id: user.user_id,
        guild_id: user.guild_id,
        game_id: game.id,
        metric: s.metric,
        value_num: s.valueNum ?? null,
        value_str: s.valueStr ?? null,
      });
    }
    return stats.length;
  }
}

module.exports = BaseGameApi;
