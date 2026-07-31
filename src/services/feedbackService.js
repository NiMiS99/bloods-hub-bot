// src/services/feedbackService.js
// Listens for admin feedback in #modifiche-da-apportare channel.
// Creates structured tickets from messages, tracks status, and enables
// automated workflow: segnalazione → in analisi → in lavorazione → risolto.
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { Feedback } = require('../db');

const COLORS = {
  open: 0xff6b6b,       // red — new issue
  analyzing: 0xfeca57,  // yellow — under analysis
  in_progress: 0x48dbfb, // blue — being worked on
  resolved: 0x57f287,   // green — fixed
  closed: 0x95a5a6,     // grey — won't fix
};

const LABELS = {
  open: '🔴 Aperto',
  analyzing: '🟡 In Analisi',
  in_progress: '🔵 In Lavorazione',
  resolved: '🟢 Risolto',
  closed: '⚪ Chiuso',
};

// Categories for classification
const CATEGORIES = {
  permissions: 'Permessi Canali/Ruoli',
  bot_command: 'Comando Bot',
  bot_bug: 'Bug Bot',
  dashboard: 'Dashboard',
  feature_request: 'Nuova Feature',
  other: 'Altro',
};

/**
 * Create a feedback ticket from a message in the feedback channel.
 */
async function createTicket(message) {
  // Check if message already has a ticket (reply or bot message)
  const existing = await Feedback.findOne({
    where: { message_id: message.id, guild_id: message.guild.id },
  });
  if (existing) return existing;

  // Create DB record
  const ticket = await Feedback.create({
    guild_id: message.guild.id,
    channel_id: message.channel.id,
    message_id: message.id,
    author_id: message.author.id,
    author_username: message.author.username,
    content: message.content,
    status: 'open',
    category: 'other',
  });

  // Create structured embed
  const embed = new EmbedBuilder()
    .setColor(COLORS.open)
    .setTitle(`📋 Segnalazione #${ticket.id}`)
    .setDescription(message.content || '*Messaggio senza testo*')
    .addFields(
      { name: 'Segnalato da', value: `<@${message.author.id}> (${message.author.username})`, inline: true },
      { name: 'Stato', value: LABELS.open, inline: true },
      { name: 'Categoria', value: CATEGORIES.other, inline: true },
      { name: 'Data', value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`, inline: false },
    )
    .setFooter({ text: `Ticket ID: ${ticket.id} • Usa i bottoni per cambiare stato` })
    .setTimestamp();

  // Action buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`feedback:analyze:${ticket.id}`)
      .setLabel('In Analisi')
      .setEmoji('🟡')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`feedback:progress:${ticket.id}`)
      .setLabel('In Lavorazione')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`feedback:resolve:${ticket.id}`)
      .setLabel('Risolto')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`feedback:close:${ticket.id}`)
      .setLabel('Chiudi')
      .setEmoji('⚪')
      .setStyle(ButtonStyle.Secondary),
  );

  // Send embed as reply to the original message
  const ticketMsg = await message.reply({ embeds: [embed], components: [row] });

  // Update ticket with the embed message ID
  ticket.embed_message_id = ticketMsg.id;
  await ticket.save();

  // Add thread for discussion
  try {
    await ticketMsg.startThread({
      name: `Ticket #${ticket.id} — ${message.author.username}`,
      autoArchiveDuration: 1440, // 24h auto-archive
    });
  } catch (e) {
    logger.debug(`Feedback: could not create thread: ${e.message}`);
  }

  logger.info(`Feedback ticket #${ticket.id} created by ${message.author.username}`);
  return ticket;
}

/**
 * Update ticket status and edit the embed.
 */
async function updateStatus(interaction, ticketId, newStatus) {
  const ticket = await Feedback.findByPk(ticketId);
  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket non trovato.', flags: 64 });
    return;
  }

  // Check permissions: only admins/staff can change status
  const member = interaction.member;
  const isAdmin = member.permissions.has('ManageGuild') ||
    member.roles.cache.some(r => ['Bloods Admin', 'Consigliere', 'Founder', 'Owner'].includes(r.name));
  // Author can close their own ticket
  const isAuthor = ticket.author_id === member.id;

  if (!isAdmin && !(isAuthor && newStatus === 'closed')) {
    await interaction.reply({ content: '❌ Non hai i permessi per cambiare lo stato di questo ticket.', flags: 64 });
    return;
  }

  ticket.status = newStatus;
  if (newStatus === 'resolved' || newStatus === 'closed') {
    ticket.resolved_at = new Date();
    ticket.resolved_by = member.id;
  }
  await ticket.save();

  // Update the embed
  const channel = interaction.guild.channels.cache.get(ticket.channel_id);
  if (channel && ticket.embed_message_id) {
    try {
      const msg = await channel.messages.fetch(ticket.embed_message_id);
      const embed = EmbedBuilder.from(msg.embeds[0])
        .setColor(COLORS[newStatus])
        .spliceFields(1, 1, { name: 'Stato', value: LABELS[newStatus], inline: true });
      await msg.edit({ embeds: [embed] });
    } catch (e) {
      logger.debug(`Feedback: could not edit embed: ${e.message}`);
    }
  }

  await interaction.reply({
    content: `✅ Ticket #${ticket.id} aggiornato a **${LABELS[newStatus]}**`,
    flags: 64,
  });

  logger.info(`Feedback ticket #${ticket.id} status → ${newStatus} by ${member.user.username}`);
}

/**
 * Get statistics for the feedback channel.
 */
async function getStats(guildId) {
  const open = await Feedback.count({ where: { guild_id: guildId, status: 'open' } });
  const analyzing = await Feedback.count({ where: { guild_id: guildId, status: 'analyzing' } });
  const inProgress = await Feedback.count({ where: { guild_id: guildId, status: 'in_progress' } });
  const resolved = await Feedback.count({ where: { guild_id: guildId, status: 'resolved' } });
  const closed = await Feedback.count({ where: { guild_id: guildId, status: 'closed' } });
  const total = open + analyzing + inProgress + resolved + closed;
  return { total, open, analyzing, inProgress, resolved, closed };
}

module.exports = {
  createTicket,
  updateStatus,
  getStats,
  COLORS,
  LABELS,
  CATEGORIES,
};
