// src/services/feedbackService.js
// Structured admin feedback system:
// Modal form → ticket → thread → approval → fix → resolution
// Syncs with pending-fixes.json for Devin to pick up approved fixes.
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { fromFraktur } = require('../utils/textFormatter');
const { Feedback } = require('../db');

// === CONFIG ===
const PENDING_FIXES_FILE = path.join(__dirname, '..', '..', 'pending-fixes.json');
const FEEDBACK_CHANNEL_NAME = 'modifiche-da-apportare';

// === STATUS ===
const STATUS = {
  open: { label: '🔴 Aperto', color: 0xff6b6b, desc: 'In attesa di approvazione' },
  approved: { label: '� Approvato', color: 0xff9f43, desc: 'Approvato, in attesa di fix' },
  in_progress: { label: '🔵 In Lavorazione', color: 0x48dbfb, desc: 'Fix in corso' },
  resolved: { label: '🟢 Risolto', color: 0x57f287, desc: 'Fix completato e verificato' },
  closed: { label: '⚪ Chiuso', color: 0x95a5a6, desc: 'Chiuso senza fix' },
};

const CATEGORIES = {
  permissions: { label: '🔐 Permessi Canali/Ruoli', icon: '🔐' },
  bot_command: { label: '🤖 Comando Bot', icon: '🤖' },
  bot_bug: { label: '🐛 Bug Bot', icon: '🐛' },
  dashboard: { label: '📊 Dashboard', icon: '📊' },
  feature_request: { label: '✨ Nuova Feature', icon: '✨' },
  other: { label: '📦 Altro', icon: '📦' },
};

const PRIORITIES = {
  low: { label: '🟢 Bassa', color: 0x57f287 },
  medium: { label: '🟡 Media', color: 0xfeca57 },
  high: { label: '🟠 Alta', color: 0xff9f43 },
  critical: { label: '🔴 Critica', color: 0xff6b6b },
};

// === MODAL ===

/**
 * Show the feedback modal form to an admin.
 */
async function showFeedbackModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('feedback:modal')
    .setTitle('📋 Nuova Segnalazione');

  const titleInput = new TextInputBuilder()
    .setCustomId('feedback_title')
    .setLabel('Titolo breve')
    .setPlaceholder('Es: Admin non vedono canali Community Hub')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const categoryInput = new TextInputBuilder()
    .setCustomId('feedback_category')
    .setLabel('Categoria')
    .setPlaceholder('permissions / bot_command / bot_bug / dashboard / feature_request / other')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  const priorityInput = new TextInputBuilder()
    .setCustomId('feedback_priority')
    .setLabel('Priorità')
    .setPlaceholder('low / medium / high / critical')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10);

  const affectedInput = new TextInputBuilder()
    .setCustomId('feedback_affected')
    .setLabel('Canali o ruoli coinvolti')
    .setPlaceholder('Es: #pubblica-1, #pubblica-2, ruolo Consigliere, Blood Admin')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500);

  const descInput = new TextInputBuilder()
    .setCustomId('feedback_description')
    .setLabel('Descrizione dettagliata')
    .setPlaceholder('Descrivi cosa succede, cosa ti aspetti, e come riprodurre il problema...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(priorityInput),
    new ActionRowBuilder().addComponents(affectedInput),
    new ActionRowBuilder().addComponents(descInput),
  );

  await interaction.showModal(modal);
}

/**
 * Handle modal submission — create the ticket.
 */
async function handleModalSubmit(interaction) {
  const title = interaction.fields.getTextInputValue('feedback_title').trim();
  const categoryRaw = interaction.fields.getTextInputValue('feedback_category').trim().toLowerCase();
  const priorityRaw = interaction.fields.getTextInputValue('feedback_priority').trim().toLowerCase();
  const affected = interaction.fields.getTextInputValue('feedback_affected')?.trim() || '';
  const description = interaction.fields.getTextInputValue('feedback_description').trim();

  // Validate category
  const category = CATEGORIES[categoryRaw] ? categoryRaw : 'other';
  const priority = PRIORITIES[priorityRaw] ? priorityRaw : 'medium';

  // Find or create the feedback channel
  let channel = interaction.guild.channels.cache.find(
    (c) => c.name.toLowerCase().replace(/[^a-z0-9-]/g, '') === FEEDBACK_CHANNEL_NAME
  );

  if (!channel) {
    // Create it
    const parent = interaction.guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name &&
        fromFraktur(c.name).toLowerCase().includes('community')
    );
    channel = await interaction.guild.channels.create({
      name: FEEDBACK_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: parent?.id,
      topic: '📋 Segnalazioni admin strutturate. Clicca "Apri Segnalazione" per iniziare.',
    });
  }

  // Create DB record
  const ticket = await Feedback.create({
    guild_id: interaction.guild.id,
    channel_id: channel.id,
    message_id: '0', // will update after sending
    author_id: interaction.user.id,
    author_username: interaction.user.username,
    title,
    category,
    priority,
    affected_channels: affected,
    affected_roles: '',
    description,
    status: 'open',
  });

  // Build embed
  const embed = buildTicketEmbed(ticket, interaction.user);

  // Build buttons — "Approva Fix" only visible to owner/founder
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`feedback:approve:${ticket.id}`)
      .setLabel('Approva Fix')
      .setEmoji('🟠')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`feedback:close:${ticket.id}`)
      .setLabel('Chiudi')
      .setEmoji('⚪')
      .setStyle(ButtonStyle.Secondary),
  );

  // Send embed
  const msg = await channel.send({ embeds: [embed], components: [row] });

  // Update ticket with message ID
  ticket.message_id = msg.id;
  await ticket.save();

  // Create thread for discussion
  try {
    const thread = await msg.startThread({
      name: `#${ticket.id} — ${title.substring(0, 80)}`,
      autoArchiveDuration: 10080, // 7 days
    });
    ticket.thread_id = thread.id;
    await ticket.save();

    // Post summary in thread
    const threadEmbed = new EmbedBuilder()
      .setColor(0x8b0000)
      .setTitle(`📋 Ticket #${ticket.id}`)
      .setDescription(
        `**Thread di discussione per il ticket #${ticket.id}**\n\n` +
        `**Stato:** ${STATUS.open.label} — in attesa di approvazione\n` +
        `L'owner approverà il fix, poi verrà preso in carico automaticamente.\n\n` +
        `Usa questo thread per aggiungere dettagli o fare domande.`
      )
      .setTimestamp();
    await thread.send({ embeds: [threadEmbed] });
  } catch (e) {
    logger.debug(`Feedback: could not create thread: ${e.message}`);
  }

  // Reply to the admin who submitted
  await interaction.reply({
    content: `✅ **Segnalazione creata!** Ticket #${ticket.id} in ${channel}`,
    flags: 64,
  });

  logger.info(`Feedback ticket #${ticket.id} created by ${interaction.user.username}: ${title}`);
  return ticket;
}

/**
 * Build the ticket embed.
 */
function buildTicketEmbed(ticket, authorUser) {
  const statusInfo = STATUS[ticket.status];
  const catInfo = CATEGORIES[ticket.category];
  const prioInfo = PRIORITIES[ticket.priority];

  const embed = new EmbedBuilder()
    .setColor(prioInfo.color)
    .setTitle(`📋 Ticket #${ticket.id} — ${ticket.title}`)
    .setDescription(ticket.description)
    .addFields(
      { name: '👤 Segnalato da', value: `<@${ticket.author_id}> (${ticket.author_username})`, inline: true },
      { name: '📊 Stato', value: `${statusInfo.label}\n*${statusInfo.desc}*`, inline: true },
      { name: '🏷️ Categoria', value: catInfo.label, inline: true },
      { name: '⚡ Priorità', value: prioInfo.label, inline: true },
      { name: '📅 Data', value: `<t:${Math.floor(ticket.created_at.getTime() / 1000)}:F>`, inline: true },
    );

  if (ticket.affected_channels) {
    embed.addFields({ name: '🎯 Canali/Ruoli coinvolti', value: ticket.affected_channels, inline: false });
  }

  if (ticket.approved_by) {
    embed.addFields({ name: '✅ Approvato da', value: `<@${ticket.approved_by}>`, inline: true });
  }

  if (ticket.fix_commit) {
    embed.addFields({ name: '🔧 Fix commit', value: `\`${ticket.fix_commit}\``, inline: true });
  }

  if (ticket.fix_notes) {
    embed.addFields({ name: '📝 Note fix', value: ticket.fix_notes, inline: false });
  }

  embed.setFooter({ text: `Ticket ID: ${ticket.id}` })
    .setTimestamp();

  if (authorUser) {
    embed.setThumbnail(authorUser.displayAvatarURL({ size: 64 }));
  }

  return embed;
}

/**
 * Approve a ticket — only Owner/Founder can do this.
 * Writes to pending-fixes.json for Devin to pick up.
 */
async function approveTicket(interaction, ticketId) {
  const member = interaction.member;
  const isOwner = member.roles.cache.some(r => ['Owner', 'Founder'].includes(r.name)) ||
    member.permissions.has('Administrator');

  if (!isOwner) {
    await interaction.reply({
      content: '❌ Solo l\'Owner o Founder può approvare i fix.',
      flags: 64,
    });
    return;
  }

  const ticket = await Feedback.findByPk(ticketId);
  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket non trovato.', flags: 64 });
    return;
  }

  if (ticket.status !== 'open') {
    await interaction.reply({
      content: `❌ Il ticket è già in stato: ${STATUS[ticket.status].label}`,
      flags: 64,
    });
    return;
  }

  // Update ticket
  ticket.status = 'approved';
  ticket.approved_by = interaction.user.id;
  ticket.approved_at = new Date();
  await ticket.save();

  // Write to pending-fixes.json
  await writePendingFixes();

  // Update embed
  await updateTicketEmbed(interaction.guild, ticket);

  // Notify in thread
  if (ticket.thread_id) {
    const thread = interaction.guild.channels.cache.get(ticket.thread_id);
    if (thread) {
      await thread.send({
        content: `🟠 **Ticket approvato da <@${interaction.user.id}>!**\n\n` +
          `Il fix è stato messo in coda. Verrà preso in carico automaticamente.\n` +
          `File: \`pending-fixes.json\``,
      }).catch(() => {});
    }
  }

  await interaction.reply({
    content: `✅ **Ticket #${ticket.id} approvato!**\nIl fix è stato messo in coda in \`pending-fixes.json\`.`,
    flags: 64,
  });

  logger.info(`Feedback ticket #${ticket.id} approved by ${interaction.user.username}`);
}

/**
 * Close a ticket without fix.
 */
async function closeTicket(interaction, ticketId) {
  const ticket = await Feedback.findByPk(ticketId);
  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket non trovato.', flags: 64 });
    return;
  }

  const member = interaction.member;
  const isStaff = member.roles.cache.some(r =>
    ['Owner', 'Founder', 'Consigliere', 'Bloods Admin'].includes(r.name)
  );
  const isAuthor = ticket.author_id === member.id;

  if (!isStaff && !isAuthor) {
    await interaction.reply({ content: '❌ Non hai i permessi per chiudere questo ticket.', flags: 64 });
    return;
  }

  ticket.status = 'closed';
  ticket.resolved_at = new Date();
  ticket.resolved_by = member.id;
  await ticket.save();

  // Remove from pending fixes if present
  await writePendingFixes();

  await updateTicketEmbed(interaction.guild, ticket);

  await interaction.reply({
    content: `⚪ **Ticket #${ticket.id} chiuso.**`,
    flags: 64,
  });

  logger.info(`Feedback ticket #${ticket.id} closed by ${interaction.user.username}`);
}

/**
 * Update the ticket embed in Discord.
 */
async function updateTicketEmbed(guild, ticket) {
  const channel = guild.channels.cache.get(ticket.channel_id);
  if (!channel || !ticket.message_id || ticket.message_id === '0') return;

  try {
    const msg = await channel.messages.fetch(ticket.message_id);
    const embed = buildTicketEmbed(ticket, null);

    // Update buttons based on status
    let row = null;
    if (ticket.status === 'open') {
      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`feedback:approve:${ticket.id}`)
          .setLabel('Approva Fix')
          .setEmoji('�')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`feedback:close:${ticket.id}`)
          .setLabel('Chiudi')
          .setEmoji('⚪')
          .setStyle(ButtonStyle.Secondary),
      );
    } else if (ticket.status === 'approved') {
      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`feedback:close:${ticket.id}`)
          .setLabel('Chiudi')
          .setEmoji('⚪')
          .setStyle(ButtonStyle.Secondary),
      );
    } else {
      // resolved or closed — no buttons
      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`feedback:reopen:${ticket.id}`)
          .setLabel('Riapri')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),
      );
    }

    await msg.edit({ embeds: [embed], components: [row] });
  } catch (e) {
    logger.debug(`Feedback: could not edit embed: ${e.message}`);
  }
}

/**
 * Reopen a closed/resolved ticket.
 */
async function reopenTicket(interaction, ticketId) {
  const member = interaction.member;
  const isStaff = member.roles.cache.some(r =>
    ['Owner', 'Founder', 'Consigliere', 'Bloods Admin'].includes(r.name)
  );
  if (!isStaff) {
    await interaction.reply({ content: '❌ Solo lo staff può riaprire i ticket.', flags: 64 });
    return;
  }

  const ticket = await Feedback.findByPk(ticketId);
  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket non trovato.', flags: 64 });
    return;
  }

  ticket.status = 'open';
  ticket.approved_by = null;
  ticket.approved_at = null;
  ticket.resolved_at = null;
  ticket.resolved_by = null;
  ticket.fix_notes = null;
  ticket.fix_commit = null;
  await ticket.save();

  await writePendingFixes();
  await updateTicketEmbed(interaction.guild, ticket);

  await interaction.reply({ content: `🔄 **Ticket #${ticket.id} riaperto.**`, flags: 64 });
}

// === FILE SYNC ===

/**
 * Write all approved + in_progress tickets to pending-fixes.json.
 * This file is the bridge between Discord and Devin.
 */
async function writePendingFixes() {
  const tickets = await Feedback.findAll({
    where: { status: ['approved', 'in_progress'] },
    order: [['priority', 'DESC'], ['approved_at', 'ASC']],
    limit: 50,
  });

  const data = {
    last_updated: new Date().toISOString(),
    pending_count: tickets.length,
    tickets: tickets.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      description: t.description,
      affected_channels: t.affected_channels,
      status: t.status,
      approved_by: t.approved_username || t.approved_by,
      approved_at: t.approved_at?.toISOString(),
      // Devin fills these when fix is done:
      fix_notes: t.fix_notes || null,
      fix_commit: t.fix_commit || null,
      fix_status: t.status === 'in_progress' ? 'in_progress' : 'pending',
    })),
  };

  try {
    fs.writeFileSync(PENDING_FIXES_FILE, JSON.stringify(data, null, 2));
    logger.info(`Pending fixes file updated: ${tickets.length} tickets`);
  } catch (e) {
    logger.error(`Failed to write pending-fixes.json: ${e.message}`);
  }
}

/**
 * Read pending-fixes.json and check if Devin has completed any fixes.
 * Called periodically by the watcher.
 */
async function checkCompletedFixes(client) {
  if (!fs.existsSync(PENDING_FIXES_FILE)) return;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(PENDING_FIXES_FILE, 'utf8'));
  } catch {
    return;
  }

  if (!data.tickets) return;

  for (const entry of data.tickets) {
    // Devin marks fix_status as "completed" and fills fix_notes/fix_commit
    if (entry.fix_status === 'completed' && entry.id) {
      const ticket = await Feedback.findByPk(entry.id);
      if (!ticket || ticket.status === 'resolved') continue;

      // Update ticket with fix info
      ticket.status = 'resolved';
      ticket.fix_notes = entry.fix_notes || 'Fix completato';
      ticket.fix_commit = entry.fix_commit || '';
      ticket.resolved_at = new Date();
      ticket.resolved_by = 'devin';
      await ticket.save();

      // Update Discord embed
      const guild = client.guilds.cache.get(ticket.guild_id);
      if (guild) {
        await updateTicketEmbed(guild, ticket);

        // Notify in thread
        if (ticket.thread_id) {
          const thread = guild.channels.cache.get(ticket.thread_id);
          if (thread) {
            const { EmbedBuilder } = require('discord.js');
            const notifyEmbed = new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle('🟢 Fix Completato!')
              .setDescription(
                `**Ticket #${ticket.id} risolto!**\n\n` +
                (ticket.fix_notes ? `**Note:** ${ticket.fix_notes}\n` : '') +
                (ticket.fix_commit ? `**Commit:** \`${ticket.fix_commit}\`\n` : '') +
                `\nIl fix è stato applicato. Verifica che il problema sia risolto.`
              )
              .setTimestamp();
            await thread.send({ content: `<@${ticket.author_id}>`, embeds: [notifyEmbed] }).catch(() => {});
          }
        }
      }

      logger.info(`Feedback ticket #${ticket.id} resolved by Devin`);
    }
  }

  // Rewrite file with updated statuses (remove completed ones)
  await writePendingFixes();
}

/**
 * Start the file watcher — checks pending-fixes.json every 30 seconds.
 */
let _watcherInterval = null;

function startWatcher(client) {
  if (_watcherInterval) return;
  _watcherInterval = setInterval(() => {
    checkCompletedFixes(client).catch((e) => {
      logger.debug(`Feedback watcher error: ${e.message}`);
    });
  }, 30000); // 30 seconds
  logger.info('Feedback watcher started (checking pending-fixes.json every 30s)');
}

function stopWatcher() {
  if (_watcherInterval) {
    clearInterval(_watcherInterval);
    _watcherInterval = null;
    logger.info('Feedback watcher stopped');
  }
}

// === STATS ===

async function getStats(guildId) {
  const open = await Feedback.count({ where: { guild_id: guildId, status: 'open' } });
  const approved = await Feedback.count({ where: { guild_id: guildId, status: 'approved' } });
  const inProgress = await Feedback.count({ where: { guild_id: guildId, status: 'in_progress' } });
  const resolved = await Feedback.count({ where: { guild_id: guildId, status: 'resolved' } });
  const closed = await Feedback.count({ where: { guild_id: guildId, status: 'closed' } });
  const total = open + approved + inProgress + resolved + closed;
  return { total, open, approved, inProgress, resolved, closed };
}

module.exports = {
  showFeedbackModal,
  handleModalSubmit,
  approveTicket,
  closeTicket,
  reopenTicket,
  updateTicketEmbed,
  getStats,
  startWatcher,
  stopWatcher,
  writePendingFixes,
  checkCompletedFixes,
  STATUS,
  CATEGORIES,
  PRIORITIES,
  FEEDBACK_CHANNEL_NAME,
};
