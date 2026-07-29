// src/commands/mod/clearwarn.js
// /clearwarn — removes all warnings from a user and removes the "Warned" role.
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Warning } = require('../../db');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarn')
    .setDescription('Rimuove tutti i warning di un membro e il ruolo "Warned".')
    .addUserOption((o) => o.setName('user').setDescription('Membro da perdonare.').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo della rimozione.').setRequired(false).setMaxLength(200)),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('motivo') || 'Nessun motivo specificato';

    const count = await Warning.destroy({
      where: { user_id: target.id, guild_id: interaction.guild.id },
    });

    if (count === 0) {
      return interaction.reply({ embeds: [errorEmbed(`${target.username} non ha warning da rimuovere.`)], flags: 64 });
    }

    // Remove "Warned" role
    const member = await interaction.guild.members.fetch(target.id, { force: false }).catch(() => null);
    if (member) {
      const warnedRole = interaction.guild.roles.cache.find((r) => r.name === 'Warned');
      if (warnedRole && member.roles.cache.has(warnedRole.id)) {
        await member.roles.remove(warnedRole).catch((e) => logger.warn(`Warned role remove failed: ${e.message}`));
      }
      // Also remove timeout if active
      if (member.isCommunicationDisabled()) {
        await member.timeout(null, 'Warnings cleared').catch(() => {});
      }
    }

    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: 'mod.clearwarn',
      targetType: 'user',
      targetId: target.id,
      details: { removed: count, reason },
    });

    // DM the user
    try {
      await target.send({
        embeds: [successEmbed(`I tuoi **${count}** warning in **${interaction.guild.name}** sono stati rimossi.\n**Motivo:** ${reason}\nIl ruolo "Warned" è stato rimosso.`)],
      });
    } catch {}

    await interaction.reply({
      embeds: [successEmbed(`Rimossi **${count}** warning da ${target}.\nRuolo "Warned" rimosso.\n**Motivo:** ${reason}`)],
    });
  },
};
