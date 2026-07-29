// src/commands/daily.js
// /daily — view and claim daily/weekly challenges.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const {
  assignDailyChallenges, assignWeeklyChallenges,
  getActiveChallenges, getStreak,
} = require('../services/challengeService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Visualizza le tue sfide giornaliere e settimanali.')
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('Mostra le sfide attive e la streak.'))
    .addSubcommand((sub) =>
      sub.setName('streak').setDescription('Mostra la tua streak di completamento.')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (sub === 'view' || !sub) {
      // Assign challenges if not already done
      await assignDailyChallenges(userId, guildId);
      await assignWeeklyChallenges(userId, guildId);

      const challenges = await getActiveChallenges(userId, guildId);
      const streak = await getStreak(userId, guildId);

      if (challenges.length === 0) {
        return interaction.reply({ embeds: [baseEmbed({ description: 'Nessuna sfida attiva. Riprova più tardi!', color: 0x95a5a6 })], flags: 64 });
      }

      const dailyChallenges = challenges.filter((c) => c.scope === 'daily');
      const weeklyChallenges = challenges.filter((c) => c.scope === 'weekly');

      const embed = new EmbedBuilder()
        .setTitle('🎯 Sfide Giornaliere & Settimanali')
        .setColor(0x8b0000)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(
          `**Streak attuale:** 🔥 ${streak.current_streak || 0} giorni\n` +
          `**Record:** ${streak.longest_streak || 0} giorni\n\n` +
          `Completa le sfide per ottenere XP bonus!`
        );

      if (dailyChallenges.length > 0) {
        embed.addFields({
          name: '📅 Sfide Giornaliere',
          value: dailyChallenges.map((c) => {
            const pct = Math.round((c.current_amount / c.target_amount) * 100);
            const bar = '█'.repeat(Math.ceil(pct / 10)) + '░'.repeat(10 - Math.ceil(pct / 10));
            const status = c.status === 'completed' ? '✅' : '⏳';
            return `${status} **${c.challenge_desc}**\n   \`${bar}\` ${c.current_amount}/${c.target_amount} (+${c.reward_xp} XP)`;
          }).join('\n\n'),
          inline: false,
        });
      }

      if (weeklyChallenges.length > 0) {
        embed.addFields({
          name: '🗓️ Sfida Settimanale',
          value: weeklyChallenges.map((c) => {
            const pct = Math.round((c.current_amount / c.target_amount) * 100);
            const bar = '█'.repeat(Math.ceil(pct / 10)) + '░'.repeat(10 - Math.ceil(pct / 10));
            const status = c.status === 'completed' ? '✅' : '⏳';
            return `${status} **${c.challenge_desc}**\n   \`${bar}\` ${c.current_amount}/${c.target_amount} (+${c.reward_xp} XP)`;
          }).join('\n\n'),
          inline: false,
        });
      }

      embed.setFooter({ text: 'Le sfide si rinnovano ogni giorno/mezzanotte • /daily' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'streak') {
      const streak = await getStreak(userId, guildId);
      const embed = new EmbedBuilder()
        .setTitle('🔥 Streak Sfide Daily')
        .setColor(0x8b0000)
        .setDescription(
          `**Streak attuale:** 🔥 ${streak.current_streak || 0} giorni\n` +
          `**Record:** 🏆 ${streak.longest_streak || 0} giorni\n` +
          `**Totale completate:** ${streak.total_claimed || 0}\n\n` +
          (streak.current_streak >= 7 ? '🎉 Hai raggiunto la streak di 7 giorni! Bonus XP ogni giorno.' : `Mancano ${7 - (streak.current_streak || 0)} giorni per il bonus settimanale.`)
        )
        .setFooter({ text: 'Completa le sfide daily ogni giorno per mantenere la streak!' });

      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  },
};
