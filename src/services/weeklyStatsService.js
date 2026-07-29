// src/services/weeklyStatsService.js
// Posts weekly server statistics every Sunday at 6 PM.
// Shows: total messages, voice time, new members, top posters, XP gained.
const logger = require('../utils/logger');
const { User, ActivityLog, Guild } = require('../db');
const { Op } = require('sequelize');
const { EmbedBuilder } = require('discord.js');

let _interval = null;
let _client = null;

async function postWeeklyStats() {
  if (!_client) return;

  for (const guild of _client.guilds.cache.values()) {
    try {
      const guildRow = await Guild.findByPk(guild.id);
      const channelId = guildRow?.announcements_channel_id || guildRow?.welcome_channel_id;
      if (!channelId) continue;

      const channel = guild.channels.cache.get(channelId);
      if (!channel) continue;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      // Gather stats
      const [totalMessages, totalVoice, newMembers, activeUsers, topPosters] = await Promise.all([
        ActivityLog.sum('amount', {
          where: {
            guild_id: guild.id,
            event_type: 'message',
            occurred_at: { [Op.gte]: weekAgo },
          },
        }) || 0,
        ActivityLog.sum('amount', {
          where: {
            guild_id: guild.id,
            event_type: 'voice_join',
            occurred_at: { [Op.gte]: weekAgo },
          },
        }) || 0,
        User.count({
          where: {
            guild_id: guild.id,
            created_at: { [Op.gte]: weekAgo },
          },
        }),
        User.count({
          where: {
            guild_id: guild.id,
            last_xp_at: { [Op.gte]: weekAgo },
          },
        }),
        User.findAll({
          where: { guild_id: guild.id },
          order: [['total_messages', 'DESC']],
          limit: 5,
          attributes: ['user_id', 'username', 'total_messages', 'level'],
        }),
      ]);

      // Get member count change
      const totalMembers = guild.memberCount;

      const embed = new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle('📊 Statistiche Settimanali')
        .setDescription(
          `**Periodo:** ${weekAgo.toLocaleDateString('it-IT')} - ${now.toLocaleDateString('it-IT')}\n\n` +
          `**📈 Attività:**\n` +
          `• Messaggi: **${totalMessages.toLocaleString('it-IT')}**\n` +
          `• Utenti attivi: **${activeUsers}**\n` +
          `• Nuovi membri: **${newMembers}**\n` +
          `• Membri totali: **${totalMembers}**\n\n` +
          `**🏆 Top Poster:**\n` +
          (topPosters.length > 0
            ? topPosters.map((u, i) => {
              const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || `${i + 1}.`;
              return `${medal} <@${u.user_id}> — ${u.total_messages} messaggi (Liv. ${u.level})`;
            }).join('\n')
            : '*Nessun dato*')
        )
        .setThumbnail(guild.iconURL({ size: 128 }))
        .setFooter({ text: guild.name })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
      logger.info(`WeeklyStats: posted for ${guild.name}`);
    } catch (err) {
      logger.error(`WeeklyStats failed for ${guild.id}: ${err.message}`);
    }
  }
}

function start(client) {
  _client = client;
  // Check every hour if it's Sunday 6 PM
  _interval = setInterval(() => {
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 18 && now.getMinutes() === 0) {
      postWeeklyStats().catch(() => {});
    }
  }, 60000).unref();
  logger.info('WeeklyStatsService: started (Sundays at 6 PM).');
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  _client = null;
}

module.exports = { start, stop, postWeeklyStats };
