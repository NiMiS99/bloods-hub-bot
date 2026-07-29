// src/services/advancedLogger.js
// Advanced logging: tracks member join/leave, role changes, message deletes,
// voice activity, and posts to a staff-only log channel.
const { EmbedBuilder, ChannelType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const LOG_CHANNEL_NAME = 'log-staff';

/**
 * Find or create the staff log channel.
 */
async function getLogChannel(guild) {
  let channel = [...guild.channels.cache.values()].find(
    (c) => c.name === LOG_CHANNEL_NAME && c.type === ChannelType.GuildText
  );
  if (!channel) {
    // Find a staff category or create in the Forum area
    const category = [...guild.channels.cache.values()].find(
      (c) => c.type === ChannelType.GuildCategory && c.name && c.name.includes('Forum')
    );
    channel = await guild.channels.create({
      name: LOG_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: category?.id || null,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: ['ViewChannel'],
        },
        // Staff can see
        ...['Bloods Admin', 'Consigliere', 'Founder', 'Owner', 'Officer'].map((name) => {
          const role = guild.roles.cache.find((r) => r.name === name);
          if (!role) return null;
          return { id: role.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] };
        }).filter(Boolean),
        // Bot can write
        {
          id: guild.members.me?.id || '0',
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks'],
        },
      ],
    });
    logger.info(`AdvancedLogger: created log channel "${LOG_CHANNEL_NAME}".`);
  }
  return channel;
}

async function sendLog(guild, embed) {
  const channel = await getLogChannel(guild);
  if (!channel) return;
  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ===== Event handlers =====

async function onMemberJoin(member) {
  if (member.guild.id !== GUILD_ID) return;
  const embed = new EmbedBuilder()
    .setTitle('Nuovo Membro')
    .setColor(0x57f287)
    .setDescription(
      `**${member.user.tag}** è entrato nel server.\n` +
      `Account creato: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
      `Membro #: ${member.guild.memberCount}`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();
  await sendLog(member.guild, embed);
}

async function onMemberLeave(member) {
  if (member.guild.id !== GUILD_ID) return;
  const roles = member.roles.cache.filter((r) => r.name !== '@everyone').map((r) => r.name).join(', ') || 'Nessuno';
  const embed = new EmbedBuilder()
    .setTitle('Membro Uscito')
    .setColor(0xed4245)
    .setDescription(
      `**${member.user.tag}** ha lasciato il server.\n` +
      `Ruoli: ${roles}\n` +
      `Entrato: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();
  await sendLog(member.guild, embed);
}

async function onGuildMemberUpdate(oldMember, newMember) {
  if (newMember.guild.id !== GUILD_ID) return;

  // Role changes
  const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
  const removed = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

  if (added.size > 0 || removed.size > 0) {
    const changes = [];
    if (added.size > 0) changes.push(`**+Ruoli:** ${added.map((r) => r.name).join(', ')}`);
    if (removed.size > 0) changes.push(`**-Ruoli:** ${removed.map((r) => r.name).join(', ')}`);

    const embed = new EmbedBuilder()
      .setTitle('Ruoli Modificati')
      .setColor(0xfee75c)
      .setDescription(`**${newMember.user.tag}**\n${changes.join('\n')}`)
      .setTimestamp();
    await sendLog(newMember.guild, embed);
  }

  // Nickname changes
  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setTitle('Nickname Modificato')
      .setColor(0xfee75c)
      .setDescription(
        `**${newMember.user.tag}**\n` +
        `Prima: ${oldMember.nickname || oldMember.user.username}\n` +
        `Dopo: ${newMember.nickname || newMember.user.username}`
      )
      .setTimestamp();
    await sendLog(newMember.guild, embed);
  }
}

async function onMessageDelete(message) {
  if (message.guild?.id !== GUILD_ID) return;
  if (message.author?.bot) return;

  const embed = new EmbedBuilder()
    .setTitle('Messaggio Eliminato')
    .setColor(0xed4245)
    .setDescription(
      `**Autore:** ${message.author?.tag || 'Sconosciuto'}\n` +
      `**Canale:** <#${message.channelId}>\n` +
      `**Contenuto:**\n${(message.content || '(vuoto/allegato)').slice(0, 1000)}`
    )
    .setTimestamp();
  await sendLog(message.guild, embed);
}

async function onMessageUpdate(oldMessage, newMessage) {
  if (newMessage.guild?.id !== GUILD_ID) return;
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const embed = new EmbedBuilder()
    .setTitle('Messaggio Modificato')
    .setColor(0xfee75c)
    .setDescription(
      `**Autore:** ${newMessage.author?.tag}\n` +
      `**Canale:** <#${newMessage.channelId}>\n` +
      `[Vai al messaggio](${newMessage.url})\n\n` +
      `**Prima:**\n${(oldMessage.content || '(vuoto)').slice(0, 500)}\n\n` +
      `**Dopo:**\n${(newMessage.content || '(vuoto)').slice(0, 500)}`
    )
    .setTimestamp();
  await sendLog(newMessage.guild, embed);
}

async function onVoiceStateUpdate(oldState, newState) {
  if (newState.guild.id !== GUILD_ID) return;
  const member = newState.member;
  if (member?.user?.bot) return;

  let action = null;
  if (!oldState.channelId && newState.channelId) {
    action = 'Entrato in vocale';
  } else if (oldState.channelId && !newState.channelId) {
    action = 'Uscito dal vocale';
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    action = 'Cambiato canale vocale';
  }

  if (!action) return;

  const embed = new EmbedBuilder()
    .setTitle('Attività Vocale')
    .setColor(0x5865f2)
    .setDescription(
      `**${member.user.tag}** — ${action}\n` +
      (oldState.channelId ? `Da: <#${oldState.channelId}>\n` : '') +
      (newState.channelId ? `A: <#${newState.channelId}>` : '')
    )
    .setTimestamp();
  await sendLog(newState.guild, embed);
}

// ===== Ban / Unban =====

async function onBanAdd(ban) {
  if (ban.guild.id !== GUILD_ID) return;
  let reason = 'Nessun motivo specificato';
  let bannerId = null;
  try {
    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_BAN_ADD' });
    const entry = auditLogs.entries.first();
    if (entry && entry.target?.id === ban.user.id && Date.now() - entry.createdTimestamp < 5000) {
      reason = entry.reason || reason;
      bannerId = entry.executor?.id;
    }
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('Membro Bannato')
    .setColor(0xed4245)
    .setDescription(
      `**Utente:** ${ban.user.tag}\n` +
      (bannerId ? `**Bannato da:** <@${bannerId}>\n` : '') +
      `**Motivo:** ${reason}`
    )
    .setThumbnail(ban.user.displayAvatarURL())
    .setTimestamp();
  await sendLog(ban.guild, embed);
}

async function onBanRemove(ban) {
  if (ban.guild.id !== GUILD_ID) return;
  let unbannerId = null;
  try {
    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_BAN_REMOVE' });
    const entry = auditLogs.entries.first();
    if (entry && entry.target?.id === ban.user.id && Date.now() - entry.createdTimestamp < 5000) {
      unbannerId = entry.executor?.id;
    }
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('Membro Sbannato')
    .setColor(0x57f287)
    .setDescription(
      `**Utente:** ${ban.user.tag}\n` +
      (unbannerId ? `**Sbannato da:** <@${unbannerId}>` : '')
    )
    .setThumbnail(ban.user.displayAvatarURL())
    .setTimestamp();
  await sendLog(ban.guild, embed);
}

// ===== Automod =====

async function onAutomodAction(message, rule, reason) {
  if (message.guild?.id !== GUILD_ID) return;
  const embed = new EmbedBuilder()
    .setTitle('Automod')
    .setColor(0xfee75c)
    .setDescription(
      `**Utente:** ${message.author?.tag || 'Sconosciuto'}\n` +
      `**Canale:** <#${message.channelId}>\n` +
      `**Regola:** ${rule?.name || 'N/A'}\n` +
      `**Azione:** ${rule?.action || 'N/A'}\n` +
      `**Motivo:** ${reason || 'N/A'}\n` +
      `**Contenuto:**\n${(message.content || '(vuoto)').slice(0, 500)}`
    )
    .setTimestamp();
  await sendLog(message.guild, embed);
}

module.exports = {
  onMemberJoin,
  onMemberLeave,
  onGuildMemberUpdate,
  onMessageDelete,
  onMessageUpdate,
  onVoiceStateUpdate,
  onBanAdd,
  onBanRemove,
  onAutomodAction,
  getLogChannel,
};
