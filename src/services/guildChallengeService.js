// src/services/guildChallengeService.js
// Guild-wide weekly challenges: "Raggiungiamo X come community"
// Tracks total guild activity and announces when goal is reached.
const logger = require('../utils/logger');
const { ActivityLog, Guild } = require('../db');
const { Op } = require('sequelize');
const { EmbedBuilder } = require('discord.js');

const GUILD_CHALLENGES = [
  { type: 'messages', desc: 'Raggiungiamo 1000 messaggi questa settimana!', target: 1000, metric: 'message' },
  { type: 'voice', desc: 'Trascorriamo 10 ore in vocale questa settimana!', target: 600, metric: 'voice_join' },
  { type: 'active', desc: 'Abbiamo 30 membri attivi questa settimana!', target: 30, metric: 'active_users' },
];

let _interval = null;
let _client = null;
let _lastProgress = new Map(); // guildId -> { challengeIdx, lastValue }

async function checkGuildChallenges() {
  if (!_client) return;

  for (const guild of _client.guilds.cache.values()) {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      // Only run checks Monday-Saturday (reset on Sunday)
      if (dayOfWeek === 0) continue;

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);

      // Pick challenge based on week number (deterministic)
      const weekNum = Math.floor(now.getTime() / (7 * 86400000));
      const challenge = GUILD_CHALLENGES[weekNum % GUILD_CHALLENGES.length];

      // Get current progress
      let currentValue = 0;
      if (challenge.metric === 'active_users') {
        const { User } = require('../db');
        currentValue = await User.count({
          where: {
            guild_id: guild.id,
            last_xp_at: { [Op.gte]: weekStart },
          },
        });
      } else {
        currentValue = await ActivityLog.sum('amount', {
          where: {
            guild_id: guild.id,
            event_type: challenge.metric,
            occurred_at: { [Op.gte]: weekStart },
          },
        }) || 0;
      }

      // Check if we just crossed the target
      const key = `${guild.id}:${challenge.type}`;
      const last = _lastProgress.get(key) || 0;
      if (last < challenge.target && currentValue >= challenge.target) {
        // Goal reached!
        const guildRow = await Guild.findByPk(guild.id);
        const channelId = guildRow?.announcements_channel_id || guildRow?.welcome_channel_id;
        if (channelId) {
          const channel = guild.channels.cache.get(channelId);
          if (channel) {
            const embed = new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle('🏆 Challenge Guild Completata!')
              .setDescription(
                `**${challenge.desc}**\n\n` +
                `🎉 **OBIETTIVO RAGGIUNTO!** 🎉\n` +
                `La community ha raggiunto **${currentValue.toLocaleString('it-IT')}** (target: ${challenge.target})!\n` +
                `Grazie a tutti per la partecipazione! 🩸`
              )
              .setThumbnail(guild.iconURL({ size: 128 }))
              .setTimestamp();
            await channel.send({ content: '@everyone', embeds: [embed] }).catch(() => {});
            logger.info(`GuildChallenge: ${guild.name} reached ${challenge.type} goal!`);
          }
        }
      }

      _lastProgress.set(key, currentValue);
    } catch (err) {
      logger.debug(`GuildChallenge check failed for ${guild.id}: ${err.message}`);
    }
  }
}

function start(client) {
  _client = client;
  _interval = setInterval(checkGuildChallenges, 10 * 60 * 1000).unref(); // Check every 10 min
  logger.info('GuildChallengeService: started (checks every 10 min).');
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  _client = null;
}

module.exports = { start, stop, checkGuildChallenges, GUILD_CHALLENGES };
