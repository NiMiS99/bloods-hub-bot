// src/commands/mod/mute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Muta (timeout) un membro per un periodo di tempo.')
    .addUserOption((o) => o.setName('user').setDescription('Membro da mutare.').setRequired(true))
    .addIntegerOption((o) =>
      o.setName('durata').setDescription('Durata in minuti.').setRequired(true).setMinValue(1).setMaxValue(40320)) // max 28 days
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo del mute.').setRequired(false)),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const target = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('durata');
    const reason = interaction.options.getString('motivo') || 'Nessun motivo specificato';

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Non puoi mutare te stesso.')], flags: 64 });
    }

    const member = await interaction.guild.members.fetch(target.id, { force: false }).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Membro non trovato nel server.')], flags: 64 });
    }

    if (!member.moderatable) {
      return interaction.reply({ embeds: [errorEmbed('Non posso mutare questo membro (permessi insufficienti o ruolo troppo alto).')], flags: 64 });
    }

    try {
      await member.timeout(duration * 60 * 1000, reason);

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'mod.mute',
        targetType: 'user',
        targetId: target.id,
        details: { duration_min: duration, reason },
      });

      // Try to DM.
      try {
        await target.send({
          embeds: [baseEmbed({
            title: '🔇 Mutato',
            description: `Sei stato mutato in **${interaction.guild.name}** per **${duration} minuti**.\nMotivo: ${reason}`,
            color: 0xff9900,
          })],
        });
      } catch {}

      await interaction.reply({
        embeds: [successEmbed(`${target} mutato per **${duration} minuti**.\nMotivo: ${reason}`)],
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Errore: ${err.message}`)], flags: 64 });
    }
  },
};
