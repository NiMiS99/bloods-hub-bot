// src/services/tempVoiceService.js
// Temporary voice channels: users join a "creator" channel and get their own private voice channel.
// Channel is deleted when empty. Owner can rename/lock/limit via buttons.
const { ChannelType, PermissionFlagsBits, ActionRowBuilder } = require('discord.js');
const logger = require('../utils/logger');

// In-memory tracking: channelId -> { ownerId, createdAt }
const _tempChannels = new Map();

const _BUTTON_RENAME = 'tempvc:rename';
const _BUTTON_LOCK = 'tempvc:lock';
const _BUTTON_LIMIT = 'tempvc:limit';
const _BUTTON_TRANSFER = 'tempvc:transfer';
const _BUTTON_DELETE = 'tempvc:delete';

/**
 * Setup the temp voice system: monitor the creator channel via voiceStateUpdate.
 * Called from voiceStateUpdate event.
 */
async function handleVoiceStateUpdate(oldState, newState, client) {
  try {
    // User joined a channel
    if (!oldState.channelId && newState.channelId) {
      await onUserJoin(newState, client);
    }
    // User left a channel
    if (oldState.channelId && !newState.channelId) {
      await onUserLeave(oldState, client);
    }
    // User moved between channels
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      await onUserLeave(oldState, client);
      await onUserJoin(newState, client);
    }
  } catch (err) {
    logger.debug(`TempVoice voiceStateUpdate: ${err.message}`);
  }
}

/**
 * Get the creator channel ID from guild settings (stored in Guild table).
 */
async function getCreatorChannelId(guild) {
  const { Guild } = require('../db');
  const guildRow = await Guild.findOne({ where: { guild_id: guild.id } });
  return guildRow?.temp_voice_creator_channel_id || null;
}

/**
 * User joined a channel — if it's the creator channel, create a temp channel.
 */
async function onUserJoin(state, _client) {
  const creatorChannelId = await getCreatorChannelId(state.guild);
  if (!creatorChannelId || state.channelId !== creatorChannelId) return;

  const guild = state.guild;
  const member = state.member;

  // Create a new voice channel
  const channelName = `🔊 ${member.displayName}'s Room`;
  const category = guild.channels.cache.get(creatorChannelId)?.parentId;

  const voiceChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildVoice,
    parent: category,
    permissionOverwrites: [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.Connect],
      },
      {
        id: member.id, // owner
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
        ],
      },
    ],
  });

  // Move the user to their new channel
  await member.voice.setChannel(voiceChannel).catch(() => {});

  // Track the channel
  _tempChannels.set(voiceChannel.id, { ownerId: member.id, createdAt: Date.now() });

  logger.info(`TempVoice: created channel ${voiceChannel.name} for ${member.user.tag}`);
}

/**
 * User left a channel — if it's a temp channel and empty, delete it.
 */
async function onUserLeave(state, _client) {
  const tempInfo = _tempChannels.get(state.channelId);
  if (!tempInfo) return;

  const channel = state.guild.channels.cache.get(state.channelId);
  if (!channel) {
    _tempChannels.delete(state.channelId);
    return;
  }

  // Delete if empty
  if (channel.members.size === 0) {
    await channel.delete('Canale vocale temporaneo vuoto').catch(() => {});
    _tempChannels.delete(state.channelId);
    logger.info(`TempVoice: deleted empty channel ${channel.name}`);
  }
}

/**
 * Handle button interactions for temp voice control panel.
 */
async function handleButton(interaction, _client) {
  const action = interaction.customId.split(':')[1];
  const tempInfo = _tempChannels.get(interaction.channelId);
  
  if (!tempInfo || tempInfo.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'Solo il proprietario del canale può usare questi controlli.', flags: 64 });
  }

  const channel = interaction.member.voice.channel;
  if (!channel || channel.id !== interaction.channelId) {
    return interaction.reply({ content: 'Devi essere nel canale vocale per usarlo.', flags: 64 });
  }

  switch (action) {
    case 'rename': {
      // Use modal for rename
      const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
      const modal = new ModalBuilder()
        .setCustomId('tempvc:rename_modal')
        .setTitle('Rinomina canale');
      const input = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Nuovo nome del canale')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }
    case 'lock': {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: false,
      });
      await interaction.reply({ content: 'Canale bloccato. Nessuno nuovo può entrare.', flags: 64 });
      return;
    }
    case 'unlock': {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: null,
      });
      await interaction.reply({ content: 'Canale sbloccato.', flags: 64 });
      return;
    }
    case 'limit': {
      const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
      const modal = new ModalBuilder()
        .setCustomId('tempvc:limit_modal')
        .setTitle('Limite utenti');
      const input = new TextInputBuilder()
        .setCustomId('user_limit')
        .setLabel('Numero massimo di utenti (0 = illimitato)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(2);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }
    case 'delete': {
      await channel.delete('Proprietario ha chiuso il canale').catch(() => {});
      _tempChannels.delete(channel.id);
      return;
    }
  }
}

/**
 * Handle modal submissions for temp voice.
 */
async function handleModalSubmit(interaction, _client) {
  if (!interaction.customId.startsWith('tempvc:')) return false;
  
  const action = interaction.customId.split(':')[1];
  const channel = interaction.member.voice.channel;
  if (!channel) {
    await interaction.reply({ content: 'Devi essere in un canale vocale.', flags: 64 });
    return true;
  }
  const tempInfo = _tempChannels.get(channel.id);
  if (!tempInfo || tempInfo.ownerId !== interaction.user.id) {
    await interaction.reply({ content: 'Non sei il proprietario.', flags: 64 });
    return true;
  }

  if (action === 'rename_modal') {
    const newName = interaction.fields.getTextInputValue('new_name');
    await channel.setName(`🔊 ${newName}`).catch(() => {});
    await interaction.reply({ content: `Canale rinominato in: **${newName}**`, flags: 64 });
    return true;
  }
  if (action === 'limit_modal') {
    const limit = parseInt(interaction.fields.getTextInputValue('user_limit')) || 0;
    await channel.setUserLimit(Math.min(Math.max(limit, 0), 99)).catch(() => {});
    await interaction.reply({ content: `Limite utenti impostato a: **${limit === 0 ? 'illimitato' : limit}**`, flags: 64 });
    return true;
  }
  return false;
}

/**
 * Set the creator channel ID for a guild.
 */
async function setCreatorChannel(guildId, channelId) {
  const { Guild } = require('../db');
  const { sequelize } = require('../db');
  // Add column if not exists
  const [result] = await sequelize.query(
    "SHOW COLUMNS FROM guilds LIKE 'temp_voice_creator_channel_id'"
  );
  if (result.length === 0) {
    await sequelize.query(
      "ALTER TABLE guilds ADD COLUMN temp_voice_creator_channel_id BIGINT UNSIGNED NULL"
    );
  }
  await Guild.update(
    { temp_voice_creator_channel_id: channelId },
    { where: { guild_id: guildId } }
  );
  logger.info(`TempVoice: creator channel set to ${channelId} for guild ${guildId}`);
}

function getTempChannels() {
  return _tempChannels;
}

module.exports = {
  handleVoiceStateUpdate,
  handleButton,
  handleModalSubmit,
  setCreatorChannel,
  getTempChannels,
};
