// src/commands/mod/warnings.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Warning } = require('../../db');
const { baseEmbed, errorEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Mostra lo storico warning di un membro.')
    .addUserOption((o) => o.setName('user').setDescription('Membro da controllare.').setRequired(true)),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const target = interaction.options.getUser('user');
    const warnings = await Warning.findAll({
      where: { user_id: target.id, guild_id: interaction.guild.id },
      order: [['created_at', 'DESC']],
    });

    const activeWarnings = warnings.filter((w) => !w.is_expired);
    const expiredWarnings = warnings.filter((w) => w.is_expired);

    if (warnings.length === 0) {
      return interaction.reply({ embeds: [baseEmbed({ description: `${target} non ha warning.`, color: 0x57f287 })], flags: 64 });
    }

    const warningList = warnings.slice(0, 10).map((w) => {
      const sev = w.severity === 'high' ? '🔴' : w.severity === 'medium' ? '🟡' : '🟢';
      const date = new Date(w.created_at).toLocaleDateString('it-IT');
      const exp = w.is_expired ? ' ~~(scaduto)~~' : '';
      return `${sev} **[${w.severity}]** ${w.reason}${exp}\n   — da <@${w.issued_by}> il ${date}`;
    }).join('\n\n');

    const embed = baseEmbed({
      title: `Warning di ${target.tag}`,
      description: `**Attivi:** ${activeWarnings.length} | **Scaduti:** ${expiredWarnings.length}\n\n${warningList}${warnings.length > 10 ? `\n\n...e altri ${warnings.length - 10} non mostrati.` : ''}`,
      color: 0xff9900,
    });

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};
