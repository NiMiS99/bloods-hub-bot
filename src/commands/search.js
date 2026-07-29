// src/commands/search.js
// /search — search messages in the server by user or content.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { ActivityLog } = require('../db');
const { Op } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Cerca messaggi nel server.')
    .addStringOption((o) => o.setName('testo').setDescription('Testo da cercare.').setRequired(false).setMaxLength(4000))
    .addUserOption((o) => o.setName('user').setDescription('Filtra per utente.').setRequired(false))
    .addChannelOption((o) => o.setName('canale').setDescription('Filtra per canale.').setRequired(false))
    .addIntegerOption((o) => o.setName('limite').setDescription('Numero risultati (max 20).').setRequired(false).setMinValue(1).setMaxValue(20)),

  async execute(interaction) {
    const text = interaction.options.getString('testo');
    const user = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('canale');
    const limit = interaction.options.getInteger('limite') || 10;

    if (!text && !user && !channel) {
      return interaction.reply({ embeds: [errorEmbed('Specifica almeno un criterio di ricerca.')], flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    // Search in ActivityLog first (faster than fetching messages)
    const where = { guild_id: interaction.guild.id, event_type: 'message' };
    if (user) where.user_id = user.id;
    if (channel) where.channel_id = channel.id;
    if (text) where.metadata = { [Op.substring]: text };

    const logs = await ActivityLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      raw: true,
    });

    if (logs.length === 0) {
      // Fallback: search recent messages in channels directly
      const channels = channel ? [channel] : [...interaction.guild.channels.cache.values()].filter((c) => c.isTextBased() && c.viewable).slice(0, 5);
      const results = [];

      for (const ch of channels) {
        try {
          const messages = await ch.messages.fetch({ limit: 50 });
          for (const msg of messages.values()) {
            if (user && msg.author.id !== user.id) continue;
            if (text && !msg.content.toLowerCase().includes(text.toLowerCase())) continue;
            if (msg.author.bot) continue;
            results.push({
              channel: ch,
              author: msg.author,
              content: msg.content.substring(0, 200),
              url: msg.url,
              timestamp: msg.createdTimestamp,
            });
            if (results.length >= limit) break;
          }
          if (results.length >= limit) break;
        } catch {}
      }

      if (results.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('Nessun messaggio trovato.')] });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔍 Risultati Ricerca')
        .setColor(0x8b0000)
        .setDescription(
          results.map((r) => {
            const date = new Date(r.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            return `**<@${r.author.id}>** in <#${r.channel.id}> — ${date}\n> ${r.content}\n[Vai al messaggio](${r.url})`;
          }).join('\n\n')
        )
        .setFooter({ text: `${results.length} risultati` });

      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔍 Risultati Ricerca (da log)')
      .setColor(0x8b0000)
      .setDescription(
        logs.map((l) => {
          const date = new Date(l.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata || '{}') : (l.metadata || {});
          const preview = meta.content || meta.preview || '(no preview)';
          return `**<@${l.user_id}>** in <#${l.channel_id}> — ${date}\n> ${String(preview).substring(0, 150)}`;
        }).join('\n\n')
      )
      .setFooter({ text: `${logs.length} risultati` });

    await interaction.editReply({ embeds: [embed] });
  },
};
