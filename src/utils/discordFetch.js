// src/utils/discordFetch.js
// Safe Discord fetch helpers with cache-first + timeout fallback.
const logger = require('./logger');

/**
 * Fetch a guild member with cache-first strategy and timeout.
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 * @param {object} opts - { force: false, timeoutMs: 5000 }
 * @returns {Promise<import('discord.js').GuildMember|null>}
 */
async function fetchMember(guild, userId, opts = {}) {
  if (!guild || !userId) return null;
  const { force = false, timeoutMs = 5000 } = opts;
  try {
    // Try cache first (force: false)
    const member = await guild.members.fetch(userId, { force }).catch(() => null);
    return member;
  } catch (err) {
    logger.debug(`fetchMember ${userId} failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetch multiple guild members in batch (cache-first).
 * @param {import('discord.js').Guild} guild
 * @param {string[]} userIds
 * @returns {Promise<Map<string, import('discord.js').GuildMember>>}
 */
async function fetchMembersBatch(guild, userIds) {
  const result = new Map();
  if (!guild || !userIds || userIds.length === 0) return result;

  // Deduplicate
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  for (const uid of uniqueIds) {
    const m = await guild.members.fetch(uid, { force: false }).catch(() => null);
    if (m) result.set(uid, m);
  }

  return result;
}

/**
 * Fetch a channel with cache-first.
 * @param {import('discord.js').Guild} guild
 * @param {string} channelId
 * @returns {Promise<import('discord.js').GuildChannel|null>}
 */
async function fetchChannel(guild, channelId) {
  if (!guild || !channelId) return null;
  return guild.channels.cache.get(channelId) || null;
}

module.exports = { fetchMember, fetchMembersBatch, fetchChannel };
