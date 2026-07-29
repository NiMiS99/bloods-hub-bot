// src/services/suggestService.js
// Suggestion tracking with DB persistence and vote counting.
const { Suggestion } = require('../db');
const logger = require('../utils/logger');

/**
 * Create a suggestion record in the DB.
 */
async function createSuggestion({ guildId, userId, messageId, channelId, content }) {
  return Suggestion.create({
    guild_id: guildId,
    user_id: userId,
    message_id: messageId,
    channel_id: channelId,
    content,
    upvotes: 0,
    downvotes: 0,
    voted_users: [],
    status: 'open',
  });
}

/**
 * Handle a vote on a suggestion (up or down).
 * Prevents double-voting.
 */
async function handleVote(interaction, voteType) {
  try {
    const suggestion = await Suggestion.findOne({
      where: { message_id: interaction.message.id, guild_id: interaction.guild.id },
    });

    if (!suggestion) {
      // Suggestion not in DB (legacy) — just acknowledge
      await interaction.reply({ content: 'Voto registrato!', flags: 64 });
      return;
    }

    if (suggestion.status !== 'open') {
      await interaction.reply({ content: 'Questo suggerimento è chiuso.', flags: 64 });
      return;
    }

    const votedUsers = suggestion.voted_users || [];
    const existingVote = votedUsers.find((v) => v.userId === interaction.user.id);

    if (existingVote) {
      if (existingVote.vote === voteType) {
        // Remove vote
        suggestion.voted_users = votedUsers.filter((v) => v.userId !== interaction.user.id);
        if (voteType === 'up') suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
        else suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
        await interaction.reply({ content: 'Voto rimosso.', flags: 64 });
      } else {
        // Change vote
        suggestion.voted_users = votedUsers.map((v) =>
          v.userId === interaction.user.id ? { userId: interaction.user.id, vote: voteType } : v
        );
        if (voteType === 'up') {
          suggestion.upvotes += 1;
          suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
        } else {
          suggestion.downvotes += 1;
          suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
        }
        await interaction.reply({ content: 'Voto cambiato!', flags: 64 });
      }
    } else {
      // New vote
      suggestion.voted_users = [...votedUsers, { userId: interaction.user.id, vote: voteType }];
      if (voteType === 'up') suggestion.upvotes += 1;
      else suggestion.downvotes += 1;
      await interaction.reply({ content: 'Voto registrato!', flags: 64 });
    }

    await suggestion.save();

    // Update the embed with new counts
    const { EmbedBuilder } = require('discord.js');
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const fields = embed.data.fields || [];
    const voteFieldIdx = fields.findIndex((f) => f.name && f.name.includes('Voti'));
    if (voteFieldIdx >= 0) {
      embed.spliceFields(voteFieldIdx, 1, {
        name: '📊 Voti',
        value: `👍 ${suggestion.upvotes} | 👎 ${suggestion.downvotes} | Netto: ${suggestion.upvotes - suggestion.downvotes}`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: '📊 Voti',
        value: `👍 ${suggestion.upvotes} | 👎 ${suggestion.downvotes} | Netto: ${suggestion.upvotes - suggestion.downvotes}`,
        inline: false,
      });
    }
    await interaction.message.edit({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    logger.error('Suggest vote error:', err.message);
    await interaction.reply({ content: 'Errore durante il voto.', flags: 64 }).catch(() => {});
  }
}

/**
 * Update suggestion status (admin).
 */
async function updateStatus(suggestionId, status) {
  return Suggestion.update({ status }, { where: { id: suggestionId } });
}

/**
 * Get top suggestions by net votes.
 */
async function getTopSuggestions(guildId, limit = 10) {
  const all = await Suggestion.findAll({
    where: { guild_id: guildId, status: 'open' },
    order: [['created_at', 'DESC']],
  });
  return all
    .map((s) => ({ ...s.toJSON(), net: s.upvotes - s.downvotes }))
    .sort((a, b) => b.net - a.net)
    .slice(0, limit);
}

module.exports = { createSuggestion, handleVote, updateStatus, getTopSuggestions };
