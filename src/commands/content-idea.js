// src/commands/content-idea.js
// /content-idea — genera idee contenuti basate su trend WoW YouTube
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const socialGrowthService = require('../services/socialGrowthService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('content-idea')
    .setDescription('Genera idee per contenuti YouTube/TikTok basate su trend WoW.'),

  async execute(interaction) {
    await interaction.deferReply();

    const trending = await socialGrowthService.fetchTrendingWoWTopics();

    if (!trending || trending.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('💡 Idee Contenuti')
        .setColor(0x8b0000)
        .setDescription(
          'Nessun trend trovato al momento. Ecco idee evergreen:\n\n' +
          '1. **Raid recap** — highlight delle kill piu recenti\n' +
          '2. **Guida M+** — come fare +15 in 30 minuti\n' +
          '3. **POV: sei nei Bloods** — meme WoW verticale per TikTok\n' +
          '4. **Tutorial onboarding** — come unirsi alla gilda passo per passo\n' +
          '5. **Bloods Points spiegati** — come funziona il sistema loot'
        )
        .setFooter({ text: 'Bloods Hub • /content-idea' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const shuffled = trending.sort(() => Math.random() - 0.5).slice(0, 5);

    const embed = new EmbedBuilder()
      .setTitle('💡 Idee Contenuti — Trend WoW di Oggi')
      .setColor(0x00ff88)
      .setDescription(
        'Contenuti WoW trending su YouTube che potresti ricreare per il canale Bloods:\n\n' +
        shuffled.map((t, i) =>
          `${i + 1}. **${t.title.substring(0, 70)}**\n` +
          `   Canale: ${t.channel}\n` +
          `   [Guarda e prendi spunto](https://youtube.com/watch?v=${t.videoId})`
        ).join('\n\n')
      )
      .addFields({
        name: '🎯 Azione consigliata',
        value: 'Scegli un topic, crea una versione italiana/versione Bloods e pubblicala entro 48h per cavalcare l\'onda trending. Cross-posta su TikTok e YouTube Shorts!',
      })
      .setFooter({ text: 'Bloods Hub • /content-idea' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
