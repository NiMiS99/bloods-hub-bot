// src/commands/admin/guida.js
// /guida — posts or refreshes guide messages in all relevant channels (admin only).
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guida')
    .setDescription('Posta o aggiorna i messaggi guida in tutti i canali.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Non hai i permessi per usare questo comando.')],
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const guidePoster = interaction.client.guidePoster;
      if (!guidePoster) {
        await interaction.editReply({ embeds: [errorEmbed('GuidePoster service non attivo.')] });
        return;
      }

      await guidePoster.postForGuild(interaction.guild);
      await interaction.editReply({
        embeds: [
          successEmbed(
            '✅ **Messaggi guida aggiornati** in tutti i canali:\n' +
            '• 🎮 Selezione giochi\n' +
            '• 💬 Generale (per ogni gioco)\n' +
            '• ⚔️ Composizioni (per ogni gioco)\n' +
            '• 📰 News (per ogni gioco)\n\n' +
            'I messaggi sono stati fissati (pinned) automaticamente.'
          ),
        ],
      });
    } catch (err) {
      logger.error(`guida command: ${err.message}`);
      await interaction.editReply({
        embeds: [errorEmbed(`Errore durante l'aggiornamento: ${err.message.substring(0, 100)}`)],
      });
    }
  },
};
