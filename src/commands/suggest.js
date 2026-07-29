// src/commands/suggest.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, successEmbed } = require('../utils/embed');
const { recordAudit: _recordAudit } = require('../utils/auditLog');
const { createSuggestion } = require('../services/suggestService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Proponi un suggerimento per la community.')
    .addStringOption((o) => o.setName('testo').setDescription('Il tuo suggerimento.').setRequired(true).setMaxLength(500)),

  async execute(interaction) {
    const text = interaction.options.getString('testo');

    // Find or create a suggestions channel.
    let channel = interaction.guild.channels.cache.find(
      (c) => {
        const name = c.name.toLowerCase();
        return name === 'suggerimenti' || name.includes('sugger') || name.includes('uggest');
      }
    );
    if (!channel) {
      channel = interaction.channel;
    }

    const embed = baseEmbed({
      title: '💡 Suggerimento',
      description: text,
      footer: { text: `Proposto da ${interaction.user.tag}` },
      color: 0xfee75c,
    }).addFields({
      name: '📊 Voti',
      value: '👍 0 | 👎 0 | Netto: 0',
      inline: false,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('suggest:btn:up').setLabel('👍 Approvo').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('suggest:btn:down').setLabel('👎 Non approvo').setStyle(ButtonStyle.Danger),
    );

    const sent = await channel.send({ embeds: [embed], components: [row] });

    // Save to DB
    await createSuggestion({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      messageId: sent.id,
      channelId: channel.id,
      content: text,
    });

    await interaction.reply({ embeds: [successEmbed('Suggerimento pubblicato! Grazie per il contributo.')], flags: 64 });
  },
};
