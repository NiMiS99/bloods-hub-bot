// src/commands/dashboard.js
// /dashboard — opens the dashboard as a Discord Embedded Activity (iframe in Discord).
// Falls back to posting the URL if Embedded Activities aren't available.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const { errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://185.229.236.155:4567';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Apri la dashboard admin (Embedded Activity o link).'),

  async execute(interaction, client) {
    // Only admins can use this
    if (!isAdmin(interaction.member)) {
      await interaction.reply({
        embeds: [errorEmbed('Solo i **Bloods Admin** possono usare questo comando.')],
        flags: 64,
      });
      return;
    }

    // Try to open as Embedded Activity
    try {
      // Check if the channel supports embedded activities
      const channel = interaction.channel;
      if (channel && channel.isTextBased?.()) {
        // Create an embedded activity invite
        // Note: Discord Embedded Activities require HTTPS URL
        // For now, we post the link with a rich embed
        const embed = new EmbedBuilder()
          .setTitle('Dashboard Admin')
          .setColor(0x8b0000)
          .setDescription(
            '**Dashboard Bloods Hub**\n\n' +
            `Apri la dashboard completa: [${DASHBOARD_URL}](${DASHBOARD_URL})\n\n` +
            '**Oppure usa i pannelli interattivi nel canale #dashboard-admin:**\n' +
            '• 📊 Stats server live\n' +
            '• ⚔️ Stats raid / progress\n' +
            '• 📋 Audit log\n' +
            '• 👥 Ultimi membri\n\n' +
            '**Comandi rapidi:**\n' +
            '• `/raidstatus check` — controlla idoneità raid\n' +
            '• `/raidreq view` — config raid\n' +
            '• `/bp leaderboard` — classifica DKP'
          )
          .setFooter({ text: 'Bloods Hub · Dashboard' });

        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
      }
    } catch (err) {
      // Fall through to link
    }

    await interaction.reply({
      content: `Dashboard: ${DASHBOARD_URL}`,
      flags: 64,
    });
  },
};
