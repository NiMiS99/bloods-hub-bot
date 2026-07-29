// src/services/ticketService.js
// Ticket system: users click "Apri Ticket" → creates private channel → staff helps → "Chiudi Ticket".
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

// Category for tickets (will be set dynamically)
const _TICKET_CATEGORY_NAME = 'Assistenza';
const STAFF_ROLES = ['Bloods Admin', 'Consigliere', 'Founder', 'Owner', 'Officer', 'Officer Reclutatore', 'Officer in Prova'];

const CID = {
  ticketOpen: 'ticket:open',
  ticketClose: 'ticket:close',
  ticketClaim: 'ticket:claim',
};

/**
 * Post the ticket panel in the assistance channel.
 */
async function postTicketPanel(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  // Find the ticket-assistenza channel
  const channel = [...guild.channels.cache.values()].find(
    (c) => c.name && c.name.includes('ticket-assistenza')
  );
  if (!channel) {
    logger.warn('TicketService: ticket-assistenza channel not found.');
    return;
  }

  // Delete previous bot messages
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const oldBotMsgs = messages.filter((m) => m.author.id === client.user.id);
    if (oldBotMsgs.size > 0) await channel.bulkDelete(oldBotMsgs).catch(() => {});
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('Sistema di Assistenza')
    .setColor(0x8b0000)
    .setDescription(
      '**Hai bisogno di aiuto?**\n\n' +
      'Clicca il bottone **Apri Ticket** qui sotto per creare un canale privato con lo staff.\n\n' +
      '• Supporto tecnico\n' +
      '• Domande sulla gilda\n' +
      '• Segnalazioni\n' +
      '• Richieste speciali\n\n' +
      '*Lo staff risponderà il prima possibile.*'
    )
    .setFooter({ text: 'Bloods Hub · Sistema Ticket' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CID.ticketOpen)
      .setLabel('Apri Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
  logger.info('TicketService: panel posted.');
}

/**
 * Handle "Apri Ticket" button — create private channel.
 */
async function handleOpen(interaction, client) {
  const guild = interaction.guild;
  const member = interaction.member;

  // Check if user already has an open ticket
  const existing = [...guild.channels.cache.values()].find(
    (c) => c.name === `ticket-${member.user.username.toLowerCase()}` && c.type === ChannelType.GuildText
  );
  if (existing) {
    await interaction.reply({
      content: `Hai già un ticket aperto: <#${existing.id}>`,
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  // Find the Assistenza category
  const category = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name && c.name.includes('Assistenza')
  );

  // Create ticket channel
  const ticketChannel = await guild.channels.create({
    name: `ticket-${member.user.username.toLowerCase()}`.slice(0, 50),
    type: ChannelType.GuildText,
    parent: category?.id || null,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      // Add staff roles
      ...STAFF_ROLES.map((roleName) => {
        const role = guild.roles.cache.find((r) => r.name === roleName);
        if (!role) return null;
        return {
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageMessages,
          ],
        };
      }).filter(Boolean),
      // Bot itself
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
        ],
      },
    ],
  });

  // Send initial message in ticket
  const embed = new EmbedBuilder()
    .setTitle(`Ticket di ${member.user.username}`)
    .setColor(0x8b0000)
    .setDescription(
      `**Benvenuto <@${member.id}>!**\n\n` +
      'Descrivi il tuo problema o la tua richiesta qui sotto.\n' +
      'Lo staff ti risponderà il prima possibile.\n\n' +
      'Quando hai finito, clicca **Chiudi Ticket** per chiudere questa conversazione.'
    )
    .setFooter({ text: 'Bloods Hub · Ticket System' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CID.ticketClose)
      .setLabel('Chiudi Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });

  await interaction.editReply({
    content: `Ticket creato: <#${ticketChannel.id}>`,
  });

  logger.info(`TicketService: ticket opened by ${member.user.tag} (#${ticketChannel.name}).`);
}

/**
 * Handle "Chiudi Ticket" button — archive/delete the channel.
 */
async function handleClose(interaction, _client) {
  const channel = interaction.channel;
  const member = interaction.member;

  // Check if this is a ticket channel
  if (!channel.name?.startsWith('ticket-')) {
    await interaction.reply({
      content: 'Questo comando può essere usato solo in un canale ticket.',
      flags: 64,
    });
    return;
  }

  // Check permissions: only ticket owner or staff can close
  const isStaff = STAFF_ROLES.some((name) => member.roles.cache.some((r) => r.name === name));
  const isOwner = channel.topic === interaction.user.id || channel.name === `ticket-${member.user.username.toLowerCase()}`;

  if (!isStaff && !isOwner) {
    await interaction.reply({
      content: 'Solo il proprietario del ticket o lo staff possono chiuderlo.',
      flags: 64,
    });
    return;
  }

  await interaction.reply({
    content: '🔒 **Ticket in chiusura...** Il canale verrà eliminato tra 5 secondi.',
  });

  logger.info(`TicketService: ticket #${channel.name} closed by ${member.user.tag}.`);

  setTimeout(async () => {
    try {
      await channel.delete('Ticket chiuso.');
    } catch (e) {
      logger.warn(`TicketService: failed to delete channel: ${e.message}`);
    }
  }, 5000);
}

module.exports = {
  CID,
  postTicketPanel,
  handleOpen,
  handleClose,
};
