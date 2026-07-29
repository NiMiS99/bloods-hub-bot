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
  const { force = false, timeoutMs: _timeoutMs = 5000 } = opts;
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
 * Fetch multiple guild members in batch (cache-first, parallel with concurrency limit).
 * Uses Promise.all with chunking to respect Discord API rate limits.
 * @param {import('discord.js').Guild} guild
 * @param {string[]} userIds
 * @param {object} opts - { concurrency: 10 }
 * @returns {Promise<Map<string, import('discord.js').GuildMember>>}
 */
async function fetchMembersBatch(guild, userIds, opts = {}) {
  const result = new Map();
  if (!guild || !userIds || userIds.length === 0) return result;

  const { concurrency = 10 } = opts;
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  // Process in chunks to avoid hitting rate limits
  for (let i = 0; i < uniqueIds.length; i += concurrency) {
    const chunk = uniqueIds.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      chunk.map((uid) => guild.members.fetch(uid, { force: false }))
    );
    for (let j = 0; j < settled.length; j++) {
      if (settled[j].status === 'fulfilled' && settled[j].value) {
        result.set(chunk[j], settled[j].value);
      }
    }
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
