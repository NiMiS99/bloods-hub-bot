// src/commands/stats.js
// /stats — community-wide stats summary.
const { SlashCommandBuilder } = require('discord.js');
const { User, Game, UserGame } = require('../db');
const { baseEmbed } = require('../utils/embed');
const { formatDuration } = require('../utils/format');
const { Sequelize: _Sequelize } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder().setName('stats').setDescription('Statistiche generali della community.'),
  async execute(interaction) {
    await interaction.deferReply();
    const gid = interaction.guild.id;
    const totalUsers = await User.count({ where: { guild_id: gid } });
    const legacyUsers = await User.count({ where: { guild_id: gid, legacy_wow_member: true } });
    const totalMessages = await User.sum('total_messages', { where: { guild_id: gid } }) || 0;
    const totalVoice = await User.sum('total_voice_seconds', { where: { guild_id: gid } }) || 0;
    const games = await Game.count({ where: { is_active: true } });
    const memberships = await UserGame.count({ where: { guild_id: gid } });

    const embed = baseEmbed({
      title: 'Statistiche community',
      description: [
        `**Membri tracciati:** ${totalUsers}`,
        `**Membri WoW legacy:** ${legacyUsers}`,
        `**Giochi attivi:** ${games}`,
        `**Iscrizioni giochi:** ${memberships}`,
        `**Messaggi totali:** ${totalMessages.toLocaleString('it-IT')}`,
        `**Tempo vocale totale:** ${formatDuration(totalVoice)}`,
      ].join('\n'),
    });
    await interaction.editReply({ embeds: [embed] });
  },
};
