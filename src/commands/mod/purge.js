// src/commands/mod/purge.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Cancella bulk messaggi dal canale corrente.')
    .addIntegerOption((o) => o.setName('quantita').setDescription('Numero di messaggi (1-100).').setMinValue(1).setMaxValue(100).setRequired(true))
    .addUserOption((o) => o.setName('user').setDescription('Cancella solo messaggi di questo utente.').setRequired(false)),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ManageMessages])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const count = interaction.options.getInteger('quantita');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ flags: 64 });

    try {
      let messages = await interaction.channel.messages.fetch({ limit: count + 5 });
      if (targetUser) {
        messages = messages.filter((m) => m.author.id === targetUser.id);
      }
      messages = messages.first(count);

      if (messages.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('Nessun messaggio trovato da cancellare.')] });
      }

      await interaction.channel.bulkDelete(messages, true);

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'mod.purge',
        targetType: 'channel',
        targetId: interaction.channel.id,
        details: { count: messages.length, targetUser: targetUser?.id || null },
      });

      await interaction.editReply({
        embeds: [successEmbed(`Cancellati **${messages.length}** messaggi${targetUser ? ` di ${targetUser}` : ''}.`)],
      });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`Errore: ${err.message}`)] });
    }
  },
};
