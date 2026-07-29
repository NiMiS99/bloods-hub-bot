// src/services/activityTracker.js
// Periodically scans voice channels, computes elapsed seconds since the last
// tick for each connected member, and persists voice_seconds activity +
// increments users.total_voice_seconds. Also flushes last_seen_at.
const { User, ActivityLog } = require('../db');
const { awardVoiceXp } = require('./xpService');
const { checkBadges } = require('./badgeService');
const config = require('../config');
const logger = require('../utils/logger');

class ActivityTracker {
  constructor(client) {
    this.client = client;
    this.timer = null;
    this.lastTick = new Map(); // key: `${guildId}:${userId}` -> Date
  }

  start() {
    const interval = config.misc.activityTrackIntervalMs;
    this.timer = setInterval(() => this.tick().catch((e) => logger.error('activity tick:', e)), interval);
    logger.info(`ActivityTracker started (every ${interval}ms).`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    for (const guild of this.client.guilds.cache.values()) {
      const voiceStates = guild.voiceStates.cache.values();
      for (const vs of voiceStates) {
        if (!vs.channelId || !vs.member || vs.member.user.bot) continue;
        const key = `${guild.id}:${vs.id}`;
        const now = new Date();
        const prev = this.lastTick.get(key);
        const seconds = prev ? Math.floor((now - prev) / 1000) : 0;
        this.lastTick.set(key, now);
        if (seconds <= 0) continue;

        try {
          const [user] = await User.findOrCreate({
            where: { user_id: vs.id, guild_id: guild.id },
            defaults: { user_id: vs.id, guild_id: guild.id, username: vs.member.user.username },
          });
          await user.increment('total_voice_seconds', { by: seconds });
          await user.update({ last_seen_at: now });
          await ActivityLog.create({
            user_id: vs.id,
            guild_id: guild.id,
            event_type: 'voice_seconds',
            channel_id: vs.channelId,
            amount: seconds,
          });
          // Award voice XP (5 XP per minute, proportional to elapsed seconds).
          const xpAmount = Math.floor((seconds / 60) * 5);
          if (xpAmount > 0) await awardVoiceXp(user, this.client).catch(() => {});
          // Check badges every ~5 minutes of voice time.
          if (user.total_voice_seconds % 300 < 60) {
            await checkBadges(user, guild).catch(() => {});
          }
          // Update daily challenge progress (voice minutes)
          const { updateProgress } = require('./challengeService');
          const voiceMinutes = Math.floor(seconds / 60);
          if (voiceMinutes > 0) {
            await updateProgress(vs.id, guild.id, 'voice', voiceMinutes).catch(() => {});
            // Check if in a game category
            const channel = guild.channels.cache.get(vs.channelId);
            if (channel?.parent) {
              const { Game } = require('../db');
              const game = await Game.findOne({ where: { category_id: channel.parentId, is_active: true } });
              if (game) {
                await updateProgress(vs.id, guild.id, 'voice_game', voiceMinutes).catch(() => {});
                // Track per-game voice time
                const { ActivityLog } = require('../db');
                await ActivityLog.create({
                  user_id: vs.id, guild_id: guild.id,
                  event_type: 'voice_game',
                  channel_id: vs.channelId,
                  amount: seconds,
                  metadata: { game_id: game.id, game_code: game.code },
                }).catch(() => {});
              }
            }
          }
        } catch (err) {
          logger.error('voice accrual error:', err.message);
        }
      }
      // Clear stale keys (members who left voice since last tick).
      const liveKeys = new Set(
        [...guild.voiceStates.cache.values()]
          .filter((vs) => vs.channelId && vs.member && !vs.member.user.bot)
          .map((vs) => `${guild.id}:${vs.id}`)
      );
      for (const key of this.lastTick.keys()) {
        if (key.startsWith(`${guild.id}:`) && !liveKeys.has(key)) this.lastTick.delete(key);
      }
    }
  }
}

module.exports = ActivityTracker;
