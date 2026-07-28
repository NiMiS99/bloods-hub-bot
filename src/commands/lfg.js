// src/commands/lfg.js
// Looking For Group — creates an embed with join/leave buttons.
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Game } = require('../db');
const { baseEmbed, errorEmbed } = require('../utils/embed');

// In-memory LFG sessions (cleared on restart — acceptable for short-lived LFG).
const lfgSessions = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lfg')
    .setDescription('Cerca compagni di gioco (Looking For Group).')
    .addStringOption((o) => o.setName('gioco').setDescription('Gioco (es. Valorant).').setRequired(true))
    .addStringOption((o) => o.setName('modalita').setDescription('Modalità (es. Ranked, Casual, Raid).').setRequired(false))
    .addIntegerOption((o) => o.setName('posti').setDescription('Numero di posti disponibili.').setRequired(false).setMinValue(1).setMaxValue(20))
    .addStringOption((o) => o.setName('note').setDescription('Note aggiuntive.').setRequired(false)),

  async execute(interaction) {
    const game = interaction.options.getString('gioco');
    const mode = interaction.options.getString('modalita') || 'Qualsiasi';
    const slots = interaction.options.getInteger('posti') || 5;
    const notes = interaction.options.getString('note') || '';

    const embed = baseEmbed({
      title: `🎮 LFG: ${game}`,
      description:
        `**Modalità:** ${mode}\n` +
        `**Posti:** 1/${slots}\n` +
        (notes ? `**Note:** ${notes}\n` : '') +
        `\n**Capitano:** ${interaction.user}\n\n` +
        `**Partecipanti:**\n• ${interaction.user} (capitano)`,
      color: 0x57f287,
      footer: { text: 'Clicca "Unisciti" per partecipare' },
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`lfg:btn:join`).setLabel('Unisciti').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`lfg:btn:leave`).setLabel('Lascia').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`lfg:btn:full`).setLabel('Completo').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    const msg = await interaction.fetchReply();

    // Store session.
    lfgSessions.set(msg.id, {
      gameId: msg.id,
      game, mode, slots,
      captain: interaction.user.id,
      participants: [interaction.user.id],
      notes,
      channelId: interaction.channel.id,
    });
  },
};

// Export for interaction handler.
module.exports.lfgSessions = lfgSessions;
