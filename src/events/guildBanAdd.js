// src/events/guildBanAdd.js
// Logs member bans to DB + advancedLogger (embed in #log-staff).
const { DiscordLog } = require('../db');
const logger = require('../utils/logger');
const AdvancedLogger = require('../services/advancedLogger');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, _client) {
    try {
      // Embed log (channel)
      await AdvancedLogger.onBanAdd(ban);

      // DB log
      let reason = 'Nessun motivo specificato';
      let bannerId = null;
      try {
        const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_BAN_ADD' });
        const entry = auditLogs.entries.first();
        if (entry && entry.target?.id === ban.user.id && Date.now() - entry.createdTimestamp < 5000) {
          reason = entry.reason || reason;
          bannerId = entry.executor?.id;
        }
      } catch {}

      await DiscordLog.create({
        guild_id: ban.guild.id,
        event_type: 'member_ban',
        target_id: ban.user.id,
        target_type: 'member',
        details: { username: ban.user.username, reason, banner_id: bannerId },
      }).catch(() => {});
    } catch (err) {
      logger.debug(`guildBanAdd log failed: ${err.message}`);
    }
  },
};
