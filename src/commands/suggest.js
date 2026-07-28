// src/commands/suggest.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const { recordAudit } = require('../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Proponi un suggerimento per la community.')
    .addStringOption((o) => o.setName('testo').setDescription('Il tuo suggerimento.').setRequired(true).setMaxLength(500)),

  async execute(interaction) {
    const text = interaction.options.getString('testo');

    // Find or create a suggestions channel.
    let channel = interaction.guild.channels.cache.find(
      (c) => c.name === 'suggerimenti' || c.name === '𝔰𝔲𝔤𝔤𝔢𝔯𝔦𝔪𝔢𝔫𝔱𝔦'
    );
    if (!channel) {
      // Fall back to current channel.
      channel = interaction.channel;
    }

    const embed = baseEmbed({
      title: '💡 Suggerimento',
      description: text,
      footer: { text: `Proposto da ${interaction.user.tag}` },
      color: 0xfee75c,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('suggest:btn:up').setLabel('👍 Approvo').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('suggest:btn:down').setLabel('👎 Non approvo').setStyle(ButtonStyle.Danger),
    );

    const sent = await channel.send({ embeds: [embed], components: [row] });
    await sent.react('👍').catch(() => {});
    await sent.react('👎').catch(() => {});

    // Auto-pin if sent in a dedicated suggestions channel.
    if (channel.name.includes('suggerimenti') || channel.name.includes('uggest')) {
      // Don't auto-pin, just let the community vote.
    }

    await interaction.reply({ embeds: [successEmbed('Suggerimento pubblicato! Grazie per il contributo.')], flags: 64 });
  },
};
