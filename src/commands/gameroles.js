// src/commands/gameroles.js
// /gameroles — show all game roles and their member counts.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Game, UserGame, User } = require('../db');
const { baseEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gameroles')
    .setDescription('Mostra i ruoli di gioco disponibili e i loro membri.')
    .addStringOption((o) =>
      o.setName('gioco').setDescription('Mostra dettagli di un gioco specifico.').setRequired(false)
        .setAutocomplete(true).setMaxLength(200)),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const gameFilter = interaction.options.getString('gioco');

    if (gameFilter) {
      // Show specific game details
      const game = await Game.findOne({ where: { code: gameFilter, is_active: true } });
      if (!game) {
        return interaction.editReply({ embeds: [require('../utils/embed').errorEmbed('Gioco non trovato.')] });
      }

      const members = await UserGame.findAll({
        where: { game_id: game.id },
        include: [{ model: User, attributes: ['username', 'user_id', 'level', 'xp'] }],
      });

      const role = interaction.guild.roles.cache.get(game.role_id);
      const category = interaction.guild.channels.cache.get(game.category_id);

      const memberList = members
        .map((m) => m.User)
        .filter((u) => u)
        .sort((a, b) => (b.level || 0) - (a.level || 0))
        .slice(0, 20)
        .map((u, i) => `${i + 1}. <@${u.user_id}> — Liv. ${u.level || 0} (${(u.xp || 0).toLocaleString()} XP)`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${game.name}`)
        .setColor(0x8b0000)
        .setDescription(
          `**Codice:** ${game.code}\n` +
          `**Membri:** ${members.length}\n` +
          `**Ruolo:** ${role ? `<@&${role.id}>` : 'Non configurato'}\n` +
          `**Categoria:** ${category ? category.name : 'Non configurata'}\n\n` +
          `**Top 20 giocatori:**\n${memberList || 'Nessun membro'}`
        )
        .setFooter({ text: 'Bloods Community • /gameroles' });

      return interaction.editReply({ embeds: [embed] });
    }

    // Show all games
    const games = await Game.findAll({ where: { is_active: true }, raw: true });
    const gameData = [];

    for (const game of games) {
      const count = await UserGame.count({ where: { game_id: game.id } });
      const role = interaction.guild.roles.cache.get(game.role_id);
      gameData.push({
        name: game.name,
        code: game.code,
        count,
        roleId: game.role_id,
        roleName: role?.name || 'N/A',
      });
    }

    gameData.sort((a, b) => b.count - a.count);

    const embed = new EmbedBuilder()
      .setTitle('🎮 Ruoli di Gioco')
      .setColor(0x8b0000)
      .setDescription(
        `**${games.length} giochi attivi** con ${gameData.reduce((a, g) => a + g.count, 0)} iscrizioni totali.\n\n` +
        gameData.map((g, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `${medal} **${g.name}** — ${g.count} membri`;
        }).join('\n')
      )
      .addFields({
        name: '📝 Come iscriversi',
        value: 'Vai nel canale di selezione giochi e usa il menu a tendina per scegliere i tuoi giochi.',
        inline: false,
      })
      .setFooter({ text: 'Bloods Community • /gameroles' });

    await interaction.editReply({ embeds: [embed] });
  },

  async autocomplete(interaction) {
    const games = await Game.findAll({ where: { is_active: true }, attributes: ['code', 'name'], raw: true });
    const focused = interaction.options.getFocused().toLowerCase();
    const filtered = games
      .filter((g) => g.name.toLowerCase().includes(focused) || g.code.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((g) => ({ name: g.name, value: g.code }));
    await interaction.respond(filtered);
  },
};
