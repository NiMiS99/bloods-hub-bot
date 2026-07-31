// src/commands/admin/feedback.js
// /feedback — View and manage admin feedback tickets.
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const feedbackService = require('../../services/feedbackService');
const { Feedback } = require('../../db');
const { baseEmbed } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Gestisci le segnalazioni degli admin')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('stats').setDescription('Statistiche delle segnalazioni'))
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Lista segnalazioni aperte'))
    .addSubcommand((sub) =>
      sub.setName('close').setDescription('Chiudi una segnalazione')
        .addIntegerOption((opt) => opt.setName('id').setDescription('ID del ticket').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('setup').setDescription('Crea il canale #modifiche-da-apportare')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'stats') {
      const stats = await feedbackService.getStats(interaction.guild.id);
      const embed = baseEmbed('📋 Statistiche Segnalazioni')
        .addFields(
          { name: 'Totali', value: String(stats.total), inline: true },
          { name: '🔴 Aperte', value: String(stats.open), inline: true },
          { name: '🟡 In Analisi', value: String(stats.analyzing), inline: true },
          { name: '🔵 In Lavorazione', value: String(stats.inProgress), inline: true },
          { name: '🟢 Risolte', value: String(stats.resolved), inline: true },
          { name: '⚪ Chiuse', value: String(stats.closed), inline: true },
        )
        .setFooter({ text: 'Bloods Hub · Sistema Feedback Admin' });
      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    else if (sub === 'list') {
      const tickets = await Feedback.findAll({
        where: {
          guild_id: interaction.guild.id,
          status: ['open', 'analyzing', 'in_progress'],
        },
        order: [['created_at', 'DESC']],
        limit: 10,
      });

      if (tickets.length === 0) {
        await interaction.reply({ content: '✅ Nessuna segnalazione aperta!', flags: 64 });
        return;
      }

      const embed = baseEmbed('📋 Segnalazioni Aperte')
        .setDescription(tickets.map((t) =>
          `**#${t.id}** — ${feedbackService.LABELS[t.status]}\n` +
          `📝 ${t.content.substring(0, 100)}${t.content.length > 100 ? '...' : ''}\n` +
          `👤 <@${t.author_id}> · <t:${Math.floor(t.created_at.getTime() / 1000)}:R>\n`
        ).join('\n'))
        .setFooter({ text: `${tickets.length} segnalazioni aperte` });

      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    else if (sub === 'close') {
      const id = interaction.options.getInteger('id');
      await feedbackService.updateStatus(interaction, id, 'closed');
    }

    else if (sub === 'setup') {
      // Create the #modifiche-da-apportare channel
      const existing = interaction.guild.channels.cache.find(
        (c) => c.name.toLowerCase().replace(/[^a-z0-9-]/g, '') === 'modifiche-da-apportare'
      );

      if (existing) {
        await interaction.reply({
          content: `Il canale ${existing} esiste già! Gli admin possono scrivere lì le loro segnalazioni.`,
          flags: 64,
        });
        return;
      }

      // Find the Community Hub category or use the first available
      let parent = interaction.guild.channels.cache.find(
        (c) => c.type === 4 && c.name.toLowerCase().includes('community')
      );
      if (!parent) {
        parent = interaction.guild.channels.cache.find((c) => c.type === 4);
      }

      const channel = await interaction.guild.channels.create({
        name: 'modifiche-da-apportare',
        type: 0, // text channel
        parent: parent?.id,
        topic: '📋 Canale per segnalazioni admin. Ogni messaggio diventa un ticket tracciato automaticamente.',
        permissionOverwrites: [
          {
            id: interaction.guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel],
          },
          // Allow all staff roles
          ...['Owner', 'Founder', 'Consigliere', 'Bloods Admin', 'Officer', 'Officer Reclutatore', 'Officer in Prova', 'Bloods']
            .map((roleName) => {
              const role = interaction.guild.roles.cache.find((r) => r.name === roleName);
              return role ? {
                id: role.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              } : null;
            })
            .filter(Boolean),
        ],
      });

      // Post instructions
      const instructions = new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle('📋 Segnalazioni Modifiche')
        .setDescription(
          '**Questo canale serve per segnalare problemi o richiedere modifiche al server.**\n\n' +
          '**Come funziona:**\n' +
          '1. Scrivi un messaggio descrivendo il problema\n' +
          '2. Il bot crea automaticamente un ticket con un ID\n' +
          '3. Uno staff member analizza e cambia lo stato:\n' +
          '   🟡 In Analisi → 🔵 In Lavorazione → 🟢 Risolto\n' +
          '4. Puoi seguire la discussione nel thread creato\n\n' +
          '**Tipi di segnalazione:**\n' +
          '• Permessi canali/ruoli\n' +
          '• Bug dei comandi del bot\n' +
          '• Problemi dashboard\n' +
          '• Richieste nuove feature\n\n' +
          '**Sii dettagliato:** indica canali/ruoli coinvolti, cosa succede, cosa ti aspetti.'
        )
        .setFooter({ text: 'Bloods Hub · Sistema Feedback Automatico' });

      await channel.send({ embeds: [instructions] });

      await interaction.reply({
        content: `✅ Canale ${channel} creato! Gli admin possono ora scrivere le loro segnalazioni lì.`,
        flags: 64,
      });
    }
  },
};
