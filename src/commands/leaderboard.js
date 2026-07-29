// src/commands/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');
const { LeaderboardCache, Game, GameStat, User } = require('../db');
const { formatDuration, ordinal } = require('../utils/format');

const DISCORD_METRICS = {
  voice: 'total_voice_seconds',
  messages: 'total_messages',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Mostra i migliori giocatori per un gioco o per attività Discord.')
    .addStringOption((o) =>
      o.setName('game').setDescription('Codice gioco (es. valorant) — vuoto per attività Discord.').setRequired(false).setMaxLength(200)
    )
    .addStringOption((o) =>
      o
        .setName('metric')
        .setDescription('Metrica di classifica (es. rank, playtime_seconds, voice, messages).')
        .setRequired(false).setMaxLength(100)
    )
    .addIntegerOption((o) =>
      o.setName('top').setDescription('Quante posizioni mostrare (max 25).').setMinValue(5).setMaxValue(25).setRequired(false)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'game') {
      const games = await Game.findAll({ where: { is_active: true } });
      const choices = games.map((g) => ({ name: g.name, value: g.code }));
      await interaction.respond(choices.filter((c) => c.value.startsWith(focused.value.toLowerCase())).slice(0, 25));
    }
  },

  async execute(interaction) {
    const gameCode = interaction.options.getString('game');
    const metricInput = interaction.options.getString('metric');
    const top = interaction.options.getInteger('top') ?? 10;

    let gameId = null;
    let metric = metricInput;
    let title = 'Classifica attività Discord';
    let color = 0x8b0000;

    if (gameCode) {
      const game = await Game.findOne({ where: { code: gameCode, is_active: true } });
      if (!game) {
        await interaction.reply({ content: `Gioco sconosciuto: \`${gameCode}\``, flags: 64 });
        return;
      }
      gameId = game.id;
      title = `Classifica — ${game.name}`;
      color = game.color_hex ?? color;
      if (!metric) metric = 'playtime_seconds';
    } else {
      if (!metric) metric = 'total_voice_seconds';
      if (DISCORD_METRICS[metric]) metric = DISCORD_METRICS[metric];
      title = `Attività Discord — ${metric.replace(/_/g, ' ')}`;
    }

    await interaction.deferReply();

    // Try cache first.
    let cached = await LeaderboardCache.findOne({
      where: { guild_id: interaction.guild.id, game_id: gameId ?? null, metric, scope: 'guild' },
      order: [['generated_at', 'DESC']],
    });

    let entries;
    if (cached) {
      entries = cached.payload;
      // Validate cached payload is an array.
      if (!Array.isArray(entries)) {
        entries = null;
        cached = null;
      }
    }
    if (!entries) {
      // Fallback: live query.
      entries = await this._liveQuery(interaction.guild.id, gameId, metric, top);
    }

    entries = entries.slice(0, top);
    if (entries.length === 0) {
      await interaction.editReply({ content: `Nessun dato ancora per la metrica \`${metric}\`.` });
      return;
    }

    const isDuration = metric.includes('seconds') || metric.includes('playtime');
    const lines = entries.map((e) => {
      const val = isDuration ? formatDuration(e.value) : String(e.value ?? '—');
      return `**${ordinal(e.rank)}** <@${e.userId}> — ${val}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${title}`)
      .setColor(color)
      .setDescription(lines.join('\n'))
      .setFooter({ text: cached ? `In cache • ${new Date(cached.generated_at).toLocaleString('it-IT')}` : 'Dal vivo' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async _liveQuery(guildId, gameId, metric, limit) {
    if (gameId == null) {
      const rows = await User.findAll({
        where: { guild_id: guildId },
        order: [[metric, 'DESC']],
        limit,
      });
      return rows.map((u, i) => ({ userId: u.user_id.toString(), displayName: u.username, rank: i + 1, value: u[metric] }));
    }
    // Try numeric first; if no results, try string-based metrics (e.g. rank).
    let rows = await GameStat.findAll({
      where: { guild_id: guildId, game_id: gameId, metric, value_num: { [Op.ne]: null } },
      order: [['value_num', 'DESC']],
      limit,
      include: [{ model: User, attributes: ['username'] }],
    });
    if (rows.length === 0) {
      rows = await GameStat.findAll({
        where: { guild_id: guildId, game_id: gameId, metric, value_str: { [Op.ne]: null } },
        order: [['value_str', 'ASC']],
        limit,
        include: [{ model: User, attributes: ['username'] }],
      });
      return rows.map((s, i) => ({
        userId: s.user_id.toString(),
        displayName: s.User?.username ?? 'Sconosciuto',
        rank: i + 1,
        value: s.value_str,
      }));
    }
    return rows.map((s, i) => ({
      userId: s.user_id.toString(),
      displayName: s.User?.username ?? 'Sconosciuto',
      rank: i + 1,
      value: s.value_num,
    }));
  },
};
