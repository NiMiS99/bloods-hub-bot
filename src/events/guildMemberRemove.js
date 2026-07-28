// src/events/guildMemberRemove.js
// Logs members leaving to DB + advancedLogger (embed in #log-staff).
const { DiscordLog } = require('../db');
const logger = require('../utils/logger');
const AdvancedLogger = require('../services/advancedLogger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      // Embed log (channel)
      await AdvancedLogger.onMemberLeave(member);

      // DB log (for dashboard)
      let isKick = false;
      let kickerId = null;
      try {
        const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_KICK' });
        const entry = auditLogs.entries.first();
        if (entry && entry.target?.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
          isKick = true;
          kickerId = entry.executor?.id;
        }
      } catch {}

      await DiscordLog.create({
        guild_id: member.guild.id,
        event_type: isKick ? 'member_kick' : 'member_leave',
        target_id: member.id,
        target_type: 'member',
        details: { username: member.user.username, kicker_id: kickerId },
      }).catch(() => {});
    } catch (err) {
      logger.debug(`guildMemberRemove log failed: ${err.message}`);
    }
  },
};
