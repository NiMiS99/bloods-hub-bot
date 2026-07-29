// src/services/xpService.js
// XP and leveling system.
// XP sources:
//   - Messages: 1 XP per message (max 50 XP / 60s anti-spam)
//   - Voice: 5 XP per minute in a game voice channel
//   - Game role assignment: 10 XP bonus
//
// Level curve: level = floor(sqrt(xp / 100))
//   Level 1: 100 XP, Level 5: 2500 XP, Level 10: 10000 XP, Level 20: 40000 XP
const { User, Guild } = require('../db');
const logger = require('../utils/logger');
const { checkLevelRewards } = require('./levelRewardService');

let _xpEventService = null;
function getXpMultiplier() {
  try {
    if (!_xpEventService) _xpEventService = require('./xpEventService');
    return _xpEventService.getMultiplier();
  } catch { return 1; }
}

const MSG_XP = 1;
const MSG_XP_MAX_PER_MIN = 50;
const VOICE_XP_PER_MIN = 5;
const ROLE_BONUS_XP = 10;

// In-memory rate limit: userId -> { count, windowStart }
const _msgRateLimit = new Map();

// Cleanup stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of _msgRateLimit) {
    if (val && now - val.windowStart > 60000) _msgRateLimit.delete(key);
  }
}, 300000).unref();

/**
 * Award XP to a user and handle level-up.
 * @param {object} user - User row (must have user_id, guild_id, xp, level)
 * @param {number} amount - XP to add
 * @param {object} [client] - Discord client (for level-up announcement)
 * @param {object} [channel] - Channel to announce level-up in (optional)
 * @returns {Promise<{leveledUp: boolean, newLevel: number}>}
 */
async function awardXp(user, amount, client, channel) {
  if (amount <= 0) return { leveledUp: false, newLevel: user.level };
  // Apply XP event multiplier
  const mult = getXpMultiplier();
  if (mult > 1) amount = Math.floor(amount * mult);

  const now = new Date();
  const oldLevel = user.level || 0;
  const newxp = (user.xp || 0) + amount;
  const newLevel = Math.floor(Math.sqrt(newxp / 100));

  await User.update(
    { xp: newxp, level: newLevel, last_xp_at: now },
    { where: { user_id: user.user_id, guild_id: user.guild_id } }
  );

  user.xp = newxp;
  user.level = newLevel;

  const leveledUp = newLevel > oldLevel;
  if (leveledUp && client) {
    try {
      const guild = client.guilds.cache.get(user.guild_id);
      if (guild) {
        // Determine which channel to announce in
        let announceChannel = channel;
        if (!announceChannel) {
          const guildRow = await Guild.findByPk(user.guild_id);
          const levelUpChannelId = guildRow?.level_up_channel_id;
          if (levelUpChannelId) {
            announceChannel = guild.channels.cache.get(levelUpChannelId);
          }
        }
        if (announceChannel) {
          const member = await guild.members.fetch(user.user_id, { force: false }).catch(() => null);
          const name = member ? member.displayName : user.username;
          // Get custom message template or use default
          const guildRow = await Guild.findByPk(user.guild_id);
          const template = guildRow?.level_up_message || '🎉 **{user}** ha raggiunto il livello **{level}**!';
          const msg = template.replace('{user}', name).replace('{level}', newLevel);
          await announceChannel.send({ content: msg });
        }
      }
    } catch (e) {
      logger.debug(`Level-up announcement failed: ${e.message}`);
    }
  }

  // Check and assign level rewards (auto roles)
  if (leveledUp && client) {
    try {
      const guild = client.guilds.cache.get(user.guild_id);
      if (guild) {
        await checkLevelRewards(guild, user, newLevel);
      }
    } catch (e) {
      logger.debug(`Level reward check failed: ${e.message}`);
    }
  }

  return { leveledUp, newLevel };
}

/**
 * Award XP for a message, with anti-spam rate limiting.
 * @param {object} user - User row
 * @param {object} [client] - Discord client
 * @param {object} [channel] - Channel for level-up announcement
 */
async function awardMessageXp(user, client, channel) {
  const key = `${user.guild_id}:${user.user_id}`;
  const now = Date.now();
  let rl = _msgRateLimit.get(key);
  if (!rl || now - rl.windowStart > 60000) {
    rl = { count: 0, windowStart: now };
    _msgRateLimit.set(key, rl);
  }
  if (rl.count >= MSG_XP_MAX_PER_MIN) return;
  rl.count++;
  await awardXp(user, MSG_XP, client, channel);
}

/**
 * Award XP for voice activity (called per minute from activityTracker).
 * @param {object} user - User row
 */
async function awardVoiceXp(user) {
  await awardXp(user, VOICE_XP_PER_MIN);
}

/**
 * Award bonus XP for joining a game.
 * @param {object} user - User row
 */
async function awardRoleBonus(user) {
  await awardXp(user, ROLE_BONUS_XP);
}

/**
 * Get XP needed for a given level.
 */
function xpForLevel(level) {
  return level * level * 100;
}

/**
 * Get XP needed for next level from current XP.
 */
function xpToNextLevel(currentXp) {
  const currentLevel = Math.floor(Math.sqrt(currentXp / 100));
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return { currentLevel, nextLevel: currentLevel + 1, xpToNext: nextLevelXp - currentXp, progress: currentXp - xpForLevel(currentLevel) };
}

module.exports = {
  awardXp,
  awardMessageXp,
  awardVoiceXp,
  awardRoleBonus,
  xpForLevel,
  xpToNextLevel,
  MSG_XP,
  VOICE_XP_PER_MIN,
  ROLE_BONUS_XP,
};
