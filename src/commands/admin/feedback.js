// src/commands/admin/feedback.js
// /feedback — View and manage admin feedback tickets.
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const feedbackService = require('../../services/feedbackService');
const { Feedback } = require('../../db');
const { baseEmbed } = require('../../utils/embed');
const { fromFraktur } = require('../../utils/textFormatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Gestisci le segnalazioni degli admin')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('setup').setDescription('Crea il canale #modifiche-da-apportare con bottone Apri Segnalazione'))
    .addSubcommand((sub) =>
      sub.setName('stats').setDescription('Statistiche delle segnalazioni'))
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Lista segnalazioni aperte'))
    .addSubcommand((sub) =>
      sub.setName('close').setDescription('Chiudi una segnalazione')
        .addIntegerOption((opt) => opt.setName('id').setDescription('ID del ticket').setRequired(true))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      // Check if channel already exists
      const existing = interaction.guild.channels.cache.find(
        (c) => c.name.toLowerCase().replace(/[^a-z0-9-]/g, '') === feedbackService.FEEDBACK_CHANNEL_NAME
      );

      let channel = existing;
      if (!channel) {
        // Create the channel
        let parent = interaction.guild.channels.cache.find(
          (c) => c.type === 4 && c.name &&
            fromFraktur(c.name).toLowerCase().includes('community')
        );
        if (!parent) {
          parent = interaction.guild.channels.cache.find((c) => c.type === 4);
        }

        channel = await interaction.guild.channels.create({
          name: feedbackService.FEEDBACK_CHANNEL_NAME,
          type: 0,
          parent: parent?.id,
          topic: '📋 Segnalazioni admin strutturate. Clicca "Apri Segnalazione" per iniziare.',
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
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
      }

      // Post the instructions + "Apri Segnalazione" button
      const instructions = new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle('📋 Segnalazioni Modifiche Server')
        .setDescription(
          '**Questo canale serve per segnalare problemi o richiedere modifiche al server.**\n\n' +
          '**Come funziona:**\n' +
          '1. Clicca il bottone **Apri Segnalazione** qui sotto\n' +
          '2. Compila il form con titolo, categoria, priorità e descrizione\n' +
          '3. Il bot crea un ticket con un ID e un thread di discussione\n' +
          '4. L\'**Owner** approva il fix con il bottone **Approva Fix**\n' +
          '5. Il fix viene messo in coda e preso in carico automaticamente\n' +
          '6. Quando il fix è pronto, il bot notifica nel thread\n\n' +
          '**Categorie disponibili:**\n' +
          '• `permissions` — Permessi canali/ruoli\n' +
          '• `bot_command` — Problemi con comandi del bot\n' +
          '• `bot_bug` — Bug del bot\n' +
          '• `dashboard` — Problemi dashboard web\n' +
          '• `feature_request` — Richiesta nuova feature\n' +
          '• `other` — Altro\n\n' +
          '**Priorità:** `low` · `medium` · `high` · `critical`'
        )
        .setFooter({ text: 'Bloods Hub · Sistema Feedback Strutturato' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('feedback:modal:0')
          .setLabel('Apri Segnalazione')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Primary),
      );

      // Delete old bot messages first
      try {
        const messages = await channel.messages.fetch({ limit: 20 });
        const oldBotMsgs = messages.filter((m) => m.author.id === client.user.id);
        if (oldBotMsgs.size > 0) await channel.bulkDelete(oldBotMsgs);
      } catch {}

      await channel.send({ embeds: [instructions], components: [row] });

      await interaction.reply({
        content: `✅ Canale ${channel} configurato! Il bottone **Apri Segnalazione** è pronto.`,
        flags: 64,
      });
    }

    else if (sub === 'stats') {
      const stats = await feedbackService.getStats(interaction.guild.id);
      const embed = baseEmbed('📋 Statistiche Segnalazioni')
        .addFields(
          { name: 'Totali', value: String(stats.total), inline: true },
          { name: '🔴 Aperte', value: String(stats.open), inline: true },
          { name: '🟠 Approvate', value: String(stats.approved), inline: true },
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
          status: ['open', 'approved', 'in_progress'],
        },
        order: [['priority', 'DESC'], ['created_at', 'DESC']],
        limit: 10,
      });

      if (tickets.length === 0) {
        await interaction.reply({ content: '✅ Nessuna segnalazione aperta!', flags: 64 });
        return;
      }

      const embed = baseEmbed('📋 Segnalazioni Aperte')
        .setDescription(tickets.map((t) => {
          const statusLabel = feedbackService.STATUS[t.status].label;
          const prioLabel = feedbackService.PRIORITIES[t.priority].label;
          return `**#${t.id}** — ${t.title}\n${statusLabel} · ${prioLabel}\n👤 <@${t.author_id}> · <t:${Math.floor(t.created_at.getTime() / 1000)}:R>`;
        }).join('\n\n'))
        .setFooter({ text: `${tickets.length} segnalazioni aperte` });

      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    else if (sub === 'close') {
      const id = interaction.options.getInteger('id');
      await feedbackService.closeTicket(interaction, id);
    }
  },
};
