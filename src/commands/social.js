// src/commands/social.js
// /social — mostra statistiche YouTube e TikTok della gilda
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const youtubeService = require('../services/youtubeService');
const tiktokService = require('../services/tiktokService');
const socialGrowthService = require('../services/socialGrowthService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('Mostra le statistiche dei canali social della gilda (YouTube + TikTok).'),

  async execute(interaction) {
    await interaction.deferReply();

    const [ytStats, ttVideo, growth] = await Promise.all([
      youtubeService.fetchChannelStats(),
      tiktokService.fetchLatestVideo(),
      socialGrowthService.getGrowthSummary(),
    ]);

    const fields = [];

    if (ytStats) {
      fields.push({
        name: '📺 YouTube — Bloods',
        value: [
          `👥 Iscritti: **${ytStats.subscriberCount.toLocaleString('it-IT')}**`,
          `👁️ Views totali: **${ytStats.viewCount.toLocaleString('it-IT')}**`,
          `🎬 Video: **${ytStats.videoCount}**`,
        ].join('\n'),
        inline: true,
      });
    } else {
      fields.push({
        name: '📺 YouTube',
        value: '⚠️ Dati non disponibili. Verifica YOUTUBE_API_KEY e YOUTUBE_CHANNEL_ID.',
        inline: true,
      });
    }

    if (ttVideo) {
      fields.push({
        name: '🎵 TikTok — @bloodswow',
        value: [
          `🎬 Ultimo video: [Guarda](${ttVideo.webLink})`,
          ttVideo.playCount ? `👁️ Views: **${ttVideo.playCount.toLocaleString('it-IT')}**` : '',
          ttVideo.likeCount ? `❤️ Like: **${ttVideo.likeCount.toLocaleString('it-IT')}**` : '',
        ].filter(Boolean).join('\n'),
        inline: true,
      });
    } else {
      fields.push({
        name: '🎵 TikTok',
        value: '⚠️ Dati non disponibili (API limitata o login wall).',
        inline: true,
      });
    }

    if (growth) {
      fields.push({
        name: '📊 Crescita',
        value: [
          `📈 Iscritti: ${growth.subGrowth >= 0 ? '+' : ''}**${growth.subGrowth}** (${growth.days} giorni)`,
          `📈 Views: ${growth.viewGrowth >= 0 ? '+' : ''}**${growth.viewGrowth}**`,
        ].join('\n'),
        inline: false,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Statistiche Social — Bloods')
      .setColor(0x8b0000)
      .setDescription('Statistiche aggiornate dei canali social della gilda.')
      .addFields(fields)
      .setFooter({ text: 'Bloods Hub • /social' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
