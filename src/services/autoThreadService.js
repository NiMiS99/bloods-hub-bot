// src/services/autoThreadService.js
// Automatically creates a thread for each message in configured channels.
// Useful for support/feedback channels to keep conversations organized.
const logger = require('../utils/logger');
const { Guild } = require('../db');

const AUTO_THREAD_KEY = 'autoThreadChannels'; // stored in guild.settings JSON

/**
 * Get the list of auto-thread channel IDs for a guild.
 * @param {string} guildId
 * @returns {Promise<string[]>}
 */
async function getAutoThreadChannels(guildId) {
  const guild = await Guild.findByPk(guildId);
  if (!guild || !guild.settings) return [];
  return guild.settings[AUTO_THREAD_KEY] || [];
}

/**
 * Add a channel to auto-thread list.
 */
async function addAutoThreadChannel(guildId, channelId) {
  const guild = await Guild.findByPk(guildId);
  if (!guild) return false;
  const settings = guild.settings || {};
  const list = settings[AUTO_THREAD_KEY] || [];
  if (list.includes(channelId)) return false;
  list.push(channelId);
  settings[AUTO_THREAD_KEY] = list;
  await guild.update({ settings });
  return true;
}

/**
 * Remove a channel from auto-thread list.
 */
async function removeAutoThreadChannel(guildId, channelId) {
  const guild = await Guild.findByPk(guildId);
  if (!guild) return false;
  const settings = guild.settings || {};
  const list = settings[AUTO_THREAD_KEY] || [];
  const idx = list.indexOf(channelId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  settings[AUTO_THREAD_KEY] = list;
  await guild.update({ settings });
  return true;
}

/**
 * Check if a message should get an auto-thread, and create one if so.
 * @param {object} message - Discord Message
 */
async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;
  if (message.channel.type !== 0) return; // Only text channels

  try {
    const channels = await getAutoThreadChannels(message.guild.id);
    if (!channels.includes(message.channel.id)) return;

    const threadName = message.content.slice(0, 80) || `Discussione ${message.author.username}`;
    const thread = await message.startThread({
      name: threadName,
      autoArchiveDuration: 1440, // 24 hours
      reason: `Auto-thread in ${message.channel.name}`,
    }).catch(() => null);

    if (thread) {
      logger.debug(`Auto-thread created: ${thread.name} in ${message.channel.name}`);
    }
  } catch (err) {
    logger.debug(`Auto-thread failed: ${err.message}`);
  }
}

module.exports = {
  getAutoThreadChannels,
  addAutoThreadChannel,
  removeAutoThreadChannel,
  handleMessage,
};
