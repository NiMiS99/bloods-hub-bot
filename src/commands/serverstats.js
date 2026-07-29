// src/commands/serverstats.js
// /serverstats — server statistics with activity charts.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, ActivityLog, Game } = require('../db');
const { Op } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('Statistiche del server con grafici attività.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    const guildId = guild.id;

    // Member stats
    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter((m) => m.presence?.status !== 'offline' && !m.user.bot).size;
    const botCount = guild.members.cache.filter((m) => m.user.bot).size;

    // Channel stats
    const textChannels = guild.channels.cache.filter((c) => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === 2 || c.type === 13).size;
    const categories = guild.channels.cache.filter((c) => c.type === 4).size;

    // Activity stats (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const msgCount = await ActivityLog.count({
      where: { guild_id: guildId, event_type: 'message', created_at: { [Op.gte]: sevenDaysAgo } },
    });
    const voiceSeconds = await ActivityLog.sum('amount', {
      where: { guild_id: guildId, event_type: 'voice_seconds', created_at: { [Op.gte]: sevenDaysAgo } },
    }) || 0;
    const voiceHours = Math.floor(voiceSeconds / 3600);

    // Top games
    const games = await Game.findAll({ where: { is_active: true }, raw: true });
    const gameStats = [];
    for (const game of games) {
      const count = await User.count({
        include: [{ model: require('../db').UserGame, where: { game_id: game.id }, required: true }],
        where: { guild_id: guildId },
      });
      if (count > 0) gameStats.push({ name: game.name, count });
    }
    gameStats.sort((a, b) => b.count - a.count);

    // Daily activity (last 7 days) — bar chart in text
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const count = await ActivityLog.count({
        where: {
          guild_id: guildId,
          created_at: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
        },
      });
      dailyActivity.push({ day: dayStart.toLocaleDateString('it-IT', { weekday: 'short' }), count });
    }

    const maxActivity = Math.max(...dailyActivity.map((d) => d.count), 1);
    const chartLines = dailyActivity.map((d) => {
      const barLen = Math.round((d.count / maxActivity) * 20);
      return `${d.day} \`${'█'.repeat(barLen).padEnd(20, '░')}\` ${d.count}`;
    }).join('\n');

    // XP stats
    const totalXp = await User.sum('xp', { where: { guild_id: guildId } }) || 0;
    const avgLevel = await User.findAll({
      where: { guild_id: guildId },
      attributes: [[User.sequelize.fn('AVG', User.sequelize.col('level')), 'avg']],
      raw: true,
    });
    const avgLvl = avgLevel[0]?.avg ? Math.round(parseFloat(avgLevel[0].avg) * 10) / 10 : 0;

    const embed = new EmbedBuilder()
      .setTitle('📊 Statistiche Server')
      .setColor(0x8b0000)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: '👥 Membri', value: `**Totali:** ${totalMembers}\n**Online:** ${onlineMembers}\n**Bot:** ${botCount}`, inline: true },
        { name: '📺 Canali', value: `**Testo:** ${textChannels}\n**Vocale:** ${voiceChannels}\n**Categorie:** ${categories}`, inline: true },
        { name: '🎮 Giochi', value: `**Attivi:** ${games.length}\n**Top:** ${gameStats[0] ? gameStats[0].name : 'N/A'} (${gameStats[0]?.count || 0})`, inline: true },
        { name: '📈 Attività (7gg)', value: `**Messaggi:** ${msgCount}\n**Vocale:** ${voiceHours}h\n**XP totale:** ${totalXp.toLocaleString()}\n**Livello medio:** ${avgLvl}`, inline: true },
        { name: '📊 Attività giornaliera', value: chartLines, inline: false },
      )
      .addFields(
        { name: '🎮 Top 5 Giochi per Membri', value: gameStats.slice(0, 5).map((g, i) => `${i + 1}. ${g.name} — ${g.count} membri`).join('\n') || 'Nessun dato', inline: false }
      )
      .setFooter({ text: `Bloods Community • ${guild.name}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
