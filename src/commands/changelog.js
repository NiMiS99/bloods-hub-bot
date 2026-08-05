// src/commands/changelog.js
// /changelog — Shows recent changelog entries from the bot.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('Mostra gli ultimi aggiornamenti del bot')
    .addIntegerOption((opt) =>
      opt.setName('numero')
        .setDescription('Quante voci mostrare (1-10, default 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),

  async execute(interaction) {
    const channelId = process.env.CHANGELOG_CHANNEL_ID;
    if (!channelId) {
      await interaction.reply({ embeds: [errorEmbed('Canale changelog non configurato.')], flags: 64 });
      return;
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      await interaction.reply({ embeds: [errorEmbed('Canale changelog non trovato.')], flags: 64 });
      return;
    }

    const count = interaction.options.getInteger('numero') || 5;
    await interaction.deferReply();

    try {
      const messages = await channel.messages.fetch({ limit: count });
      const entries = messages
        .filter((m) => m.author.id === interaction.client.user.id && m.embeds.length > 0)
        .first(count);

      if (entries.length === 0) {
        await interaction.editReply({ embeds: [errorEmbed('Nessun changelog trovato.')] });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle(`📋 Ultimi ${entries.length} changelog`)
        .setTimestamp()
        .setFooter({ text: 'Bloods Hub Bot' });

      for (const msg of entries) {
        const e = msg.embeds[0];
        const title = e.title || 'Senza titolo';
        const desc = (e.description || '').substring(0, 200);
        embed.addFields({
          name: title.substring(0, 256),
          value: desc || 'Nessuna descrizione',
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`Errore: ${err.message}`)] });
    }
  },
};
