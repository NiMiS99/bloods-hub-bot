// src/commands/mod/unmute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Rimuove il timeout da un membro.')
    .addUserOption((o) => o.setName('user').setDescription('Membro da smutare.').setRequired(true)),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const target = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(target.id, { force: false }).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Membro non trovato.')], flags: 64 });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ embeds: [errorEmbed('Questo membro non è attualmente mutato.')], flags: 64 });
    }

    try {
      await member.timeout(null, 'Rimosso da ' + interaction.user.tag);
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'mod.unmute',
        targetType: 'user',
        targetId: target.id,
      });
      await interaction.reply({ embeds: [successEmbed(`${target} smutato.`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Errore: ${err.message}`)], flags: 64 });
    }
  },
};
