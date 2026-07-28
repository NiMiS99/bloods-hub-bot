// src/commands/rank.js
// Shows a user's level, XP, and progress to the next level.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../db');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { xpToNextLevel, xpForLevel } = require('../services/xpService');
const { getUserBadges } = require('../services/badgeService');
const { formatDuration } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra il tuo livello, XP e badge.')
    .addUserOption((o) => o.setName('user').setDescription('Membro (tu per default).').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ where: { user_id: target.id, guild_id: interaction.guild.id } });

    if (!user) {
      await interaction.reply({
        embeds: [errorEmbed(target.id === interaction.user.id
          ? 'Non sei ancora registrato. Inizia a chattare o entra in un canale vocale!'
          : 'Questo utente non è ancora registrato nel bot.')],
        flags: 64,
      });
      return;
    }

    const { currentLevel, nextLevel, xpToNext, progress } = xpToNextLevel(user.xp);
    const xpForCurrent = xpForLevel(currentLevel);
    const xpForNext = xpForLevel(nextLevel);
    const xpRange = xpForNext - xpForCurrent;
    const progressPct = xpRange > 0 ? Math.round(((user.xp - xpForCurrent) / xpRange) * 100) : 0;

    // Build progress bar (20 chars).
    const barLength = 20;
    const filled = Math.round((progressPct / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    // Get badges.
    const badges = await getUserBadges(user.user_id, user.guild_id);
    const badgeStr = badges.length > 0
      ? badges.map((b) => `${b.icon} **${b.name}**`).join('\n')
      : 'Nessun badge sbloccato ancora. Continua a partecipare!';

    // Get guild rank (position by XP).
    const allUsers = await User.findAll({
      where: { guild_id: interaction.guild.id },
      order: [['xp', 'DESC']],
      attributes: ['user_id'],
    });
    const rankPos = allUsers.findIndex((u) => u.user_id === user.user_id) + 1;

    const embed = baseEmbed({
      title: `Livello di ${target.username}`,
      description:
        `**Livello ${currentLevel}** • ${user.xp.toLocaleString('it-IT')} XP\n` +
        `Posizione classifica: **#${rankPos || '?'}**\n\n` +
        `Progresso al livello ${nextLevel}:\n` +
        `\`${bar}\` ${progressPct}%\n` +
        `${progress.toLocaleString('it-IT')} / ${(xpForNext - xpForCurrent).toLocaleString('it-IT')} XP\n\n` +
        `**Statistiche:**\n` +
        `💬 Messaggi: ${user.total_messages.toLocaleString('it-IT')}\n` +
        `🎙️ Tempo vocale: ${formatDuration(user.total_voice_seconds)}\n\n` +
        `**Badge (${badges.length}):**\n${badgeStr}`,
      thumbnail: target.displayAvatarURL({ size: 128 }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
