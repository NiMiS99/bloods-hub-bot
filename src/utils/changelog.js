// src/utils/changelog.js
// Helper to post changelog and updates to Discord channels.
const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

let _client = null;

/**
 * Set the Discord client instance (called from index.js on bot ready).
 */
function setClient(client) {
  _client = client;
}

/**
 * Post a changelog entry to #changelog channel.
 * @param {Object} entry - { category, title, description, files }
 */
async function postChangelog(entry) {
  if (!_client) { logger.warn('Changelog: no client set'); return; }
  const channelId = process.env.CHANGELOG_CHANNEL_ID;
  if (!channelId) { logger.warn('Changelog: CHANGELOG_CHANNEL_ID not set'); return; }

  const channel = _client.channels.cache.get(channelId);
  if (!channel) { logger.warn(`Changelog: channel ${channelId} not found`); return; }

  const colors = {
    fix: 0x8b0000,
    feature: 0x008b00,
    refactor: 0x008b8b,
    docs: 0x8b8b00,
    security: 0x8b0000,
    test: 0x4b0082,
  };

  const embed = new EmbedBuilder()
    .setColor(colors[entry.category] || 0x8b0000)
    .setTitle(`[${(entry.category || 'misc').toUpperCase()}] ${entry.title}`)
    .setDescription(entry.description || '')
    .setTimestamp();

  if (entry.files && entry.files.length > 0) {
    embed.addFields({ name: 'File modificati', value: entry.files.map(f => `\`${f}\``).join('\n') });
  }

  embed.setFooter({ text: 'Bloods Hub Bot — Devin' });

  await channel.send({ embeds: [embed] }).catch(e => logger.error(`Changelog send error: ${e.message}`));
  logger.info(`Changelog: posted [${entry.category}] ${entry.title}`);
}

/**
 * Post an update announcement to #updates channel.
 * @param {Object} update - { title, description, type }
 */
async function postUpdate(update) {
  if (!_client) { logger.warn('Updates: no client set'); return; }
  const channelId = process.env.UPDATES_CHANNEL_ID;
  if (!channelId) { logger.warn('Updates: UPDATES_CHANNEL_ID not set'); return; }

  const channel = _client.channels.cache.get(channelId);
  if (!channel) { logger.warn(`Updates: channel ${channelId} not found`); return; }

  const colors = {
    new: 0x008b00,
    improvement: 0x008b8b,
    fix: 0x8b0000,
    notice: 0x8b8b00,
  };

  const embed = new EmbedBuilder()
    .setColor(colors[update.type] || 0x8b0000)
    .setTitle(update.title)
    .setDescription(update.description || '')
    .setTimestamp()
    .setFooter({ text: 'Bloods Hub Bot' });

  await channel.send({ embeds: [embed] }).catch(e => logger.error(`Updates send error: ${e.message}`));
  logger.info(`Updates: posted ${update.title}`);
}

module.exports = { setClient, postChangelog, postUpdate };
