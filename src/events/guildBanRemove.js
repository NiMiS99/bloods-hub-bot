// src/events/guildBanRemove.js
// Logs member unbans to DB + advancedLogger (embed in #log-staff).
const { DiscordLog } = require('../db');
const logger = require('../utils/logger');
const AdvancedLogger = require('../services/advancedLogger');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, _client) {
    try {
      // Embed log (channel)
      await AdvancedLogger.onBanRemove(ban);

      // DB log
      let unbannerId = null;
      try {
        const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_BAN_REMOVE' });
        const entry = auditLogs.entries.first();
        if (entry && entry.target?.id === ban.user.id && Date.now() - entry.createdTimestamp < 5000) {
          unbannerId = entry.executor?.id;
        }
      } catch {}

      await DiscordLog.create({
        guild_id: ban.guild.id,
        event_type: 'member_unban',
        target_id: ban.user.id,
        target_type: 'member',
        details: { username: ban.user.username, unbanner_id: unbannerId },
      }).catch(() => {});
    } catch (err) {
      logger.debug(`guildBanRemove log failed: ${err.message}`);
    }
  },
};
