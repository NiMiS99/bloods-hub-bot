// src/services/starboardService.js
// Starboard system: track starred messages, post top messages to a starboard channel.
// Config is stored in the Guild model (starboard_channel_id, starboard_threshold).
const { Op: _Op } = require('sequelize');
const { EmbedBuilder } = require('discord.js');
const { Starboard, Guild } = require('../db');
const logger = require('../utils/logger');

const STAR_EMOJI = '⭐';

/**
 * Get the starboard config for a guild.
 * @param {string} guildId - Guild ID
 * @returns {Promise<{ channelId: string|null, threshold: number }>}
 */
async function getConfig(guildId) {
  try {
    const guild = await Guild.findByPk(guildId);
    return {
      channelId: guild?.starboard_channel_id ? String(guild.starboard_channel_id) : null,
      threshold: guild?.starboard_threshold ?? 5,
    };
  } catch (err) {
    logger.error(`Starboard getConfig failed: ${err.message}`);
    return { channelId: null, threshold: 5 };
  }
}

/**
 * Save the starboard config (channel + threshold) for a guild.
 * @param {string} guildId - Guild ID
 * @param {string|null} channelId - Starboard channel ID (or null to clear)
 * @param {number} threshold - Minimum star count to post on starboard
 * @returns {Promise<boolean>} True on success
 */
async function setConfig(guildId, channelId, threshold) {
  try {
    await Guild.update(
      { starboard_channel_id: channelId ?? null, starboard_threshold: threshold ?? 5 },
      { where: { guild_id: guildId } }
    );
    logger.info(`Starboard config updated for guild ${guildId}: channel=${channelId}, threshold=${threshold}.`);
    return true;
  } catch (err) {
    logger.error(`Starboard setConfig failed: ${err.message}`);
    return false;
  }
}

/**
 * Get the star count for a specific message reaction (⭐ only).
 * @param {object} reaction - Discord MessageReaction
 * @returns {number}
 */
function _getStarCount(reaction) {
  if (!reaction) return 0;
  const name = reaction.emoji.name;
  if (name === STAR_EMOJI || name === '🌟') {
    return reaction.count || 0;
  }
  return 0;
}

/**
 * Build the starboard embed for a starred message.
 * @param {object} originalMessage - The original Discord message
 * @param {number} starCount - Number of stars
 * @returns {EmbedBuilder}
 */
function buildStarboardEmbed(originalMessage, starCount) {
  const stars = STAR_EMOJI.repeat(Math.min(starCount, 10));
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${stars} ${starCount} stelle`)
    .setAuthor({
      name: originalMessage.author?.tag || 'Utente sconosciuto',
      iconURL: originalMessage.author?.displayAvatarURL?.({ size: 64 }),
    })
    .setDescription(originalMessage.content || '*Messaggio senza testo*')
    .addFields(
      { name: 'Canale', value: `<#${originalMessage.channelId}>`, inline: true },
      { name: 'Vai al messaggio', value: `[Salta al messaggio](${originalMessage.url})`, inline: true }
    )
    .setTimestamp(originalMessage.createdAt || new Date());

  if (originalMessage.attachments && originalMessage.attachments.size > 0) {
    const firstAttachment = originalMessage.attachments.first();
    if (firstAttachment.contentType?.startsWith('image/')) {
      embed.setImage(firstAttachment.url);
    }
  }

  return embed;
}

/**
 * Handle a star reaction add: create or update the starboard entry.
 * @param {object} reaction - Discord MessageReaction
 * @param {object} user - Discord User who reacted
 * @param {object} client - Discord client
 */
async function handleStarAdd(reaction, user, client) {
  try {
    if (reaction.partial) await reaction.fetch().catch(() => null);
    if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

    // Only handle star emoji
    const name = reaction.emoji.name;
    if (name !== STAR_EMOJI && name !== '🌟') return;

    const message = reaction.message;
    if (!message || !message.guildId) return;
    if (message.author?.bot) return;

    const guildId = message.guildId;
    const config = await getConfig(guildId);

    // No starboard channel configured
    if (!config.channelId) return;

    const starCount = reaction.count || 1;

    // Find or create the starboard entry
    let entry = await Starboard.findOne({
      where: { guild_id: guildId, original_message_id: message.id },
    });

    if (!entry) {
      entry = await Starboard.create({
        guild_id: guildId,
        original_channel_id: message.channelId,
        original_message_id: message.id,
        original_author_id: message.author?.id || '0',
        starboard_message_id: null,
        star_count: starCount,
        content: message.content || null,
      });
    } else {
      await entry.update({ star_count: starCount, content: message.content || entry.content });
    }

    // Only post/update on starboard if threshold is reached
    if (starCount < config.threshold) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const starboardChannel = guild.channels.cache.get(config.channelId);
    if (!starboardChannel) return;

    const embed = buildStarboardEmbed(message, starCount);

    if (entry.starboard_message_id) {
      // Update existing starboard message
      const sbMessage = await starboardChannel.messages
        .fetch(String(entry.starboard_message_id))
        .catch(() => null);
      if (sbMessage) {
        await sbMessage.edit({ embeds: [embed] }).catch(() => {});
      } else {
        // Starboard message was deleted, repost
        const sent = await starboardChannel.send({ embeds: [embed] }).catch(() => null);
        if (sent) await entry.update({ starboard_message_id: sent.id });
      }
    } else {
      // Create new starboard message
      const sent = await starboardChannel.send({ embeds: [embed] }).catch(() => null);
      if (sent) await entry.update({ starboard_message_id: sent.id });
    }
  } catch (err) {
    logger.error(`Starboard handleStarAdd failed: ${err.message}`);
  }
}

/**
 * Handle a star reaction remove: update or remove the starboard entry.
 * @param {object} reaction - Discord MessageReaction
 * @param {object} user - Discord User who removed the reaction
 * @param {object} client - Discord client
 */
async function handleStarRemove(reaction, user, client) {
  try {
    if (reaction.partial) await reaction.fetch().catch(() => null);
    if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

    const name = reaction.emoji.name;
    if (name !== STAR_EMOJI && name !== '🌟') return;

    const message = reaction.message;
    if (!message || !message.guildId) return;

    const guildId = message.guildId;
    const starCount = reaction.count || 0;

    const entry = await Starboard.findOne({
      where: { guild_id: guildId, original_message_id: message.id },
    });
    if (!entry) return;

    await entry.update({ star_count: starCount });

    const config = await getConfig(guildId);
    if (!config.channelId) return;

    // If below threshold, remove the starboard message
    if (starCount < config.threshold) {
      if (entry.starboard_message_id) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          const channel = guild.channels.cache.get(config.channelId);
          if (channel) {
            const sbMessage = await channel.messages
              .fetch(String(entry.starboard_message_id))
              .catch(() => null);
            if (sbMessage) await sbMessage.delete().catch(() => {});
          }
        }
        await entry.update({ starboard_message_id: null });
      }
      return;
    }

    // Update the starboard message with new count
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const starboardChannel = guild.channels.cache.get(config.channelId);
    if (!starboardChannel) return;

    const embed = buildStarboardEmbed(message, starCount);
    if (entry.starboard_message_id) {
      const sbMessage = await starboardChannel.messages
        .fetch(String(entry.starboard_message_id))
        .catch(() => null);
      if (sbMessage) {
        await sbMessage.edit({ embeds: [embed] }).catch(() => {});
      }
    }
  } catch (err) {
    logger.error(`Starboard handleStarRemove failed: ${err.message}`);
  }
}

/**
 * Get the top starred messages for a guild (for /starboard view).
 * @param {string} guildId - Guild ID
 * @param {number} [limit=10] - Max results
 * @returns {Promise<Array<object>>}
 */
async function getTopMessages(guildId, limit = 10) {
  try {
    return await Starboard.findAll({
      where: { guild_id: guildId },
      order: [['star_count', 'DESC'], ['created_at', 'DESC']],
      limit,
    });
  } catch (err) {
    logger.error(`Starboard getTopMessages failed: ${err.message}`);
    return [];
  }
}

/**
 * Get the top starred users leaderboard for a guild (for /starboard leaderboard).
 * Groups by original_author_id and sums star counts.
 * @param {string} guildId - Guild ID
 * @param {number} [limit=10] - Max results
 * @returns {Promise<Array<{ user_id: string, total_stars: number, message_count: number }>>}
 */
async function getLeaderboard(guildId, limit = 10) {
  try {
    const { sequelize } = require('../db');
    const [rows] = await sequelize.query(
      `SELECT original_author_id AS user_id, SUM(star_count) AS total_stars, COUNT(*) AS message_count
       FROM starboard_messages
       WHERE guild_id = ?
       GROUP BY original_author_id
       ORDER BY total_stars DESC
       LIMIT ?`,
      { replacements: [guildId, limit] }
    );
    return rows;
  } catch (err) {
    logger.error(`Starboard getLeaderboard failed: ${err.message}`);
    return [];
  }
}

module.exports = {
  getConfig,
  setConfig,
  handleStarAdd,
  handleStarRemove,
  getTopMessages,
  getLeaderboard,
  STAR_EMOJI,
};
