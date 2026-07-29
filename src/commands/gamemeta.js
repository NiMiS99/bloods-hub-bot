// src/commands/gamemeta.js
// /gameta <game> <kind> — show the latest cached patch / meta / server-status.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Game, GameMeta } = require('../db');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamemeta')
    .setDescription('Mostra patch notes, meta o stato server di un gioco.')
    .addStringOption((o) =>
      o.setName('game').setDescription('Codice gioco.').setRequired(true).setAutocomplete(true).setMaxLength(200)
    )
    .addStringOption((o) =>
      o
        .setName('kind')
        .setDescription('Tipo di informazione.')
        .setRequired(false).setMaxLength(100)
        .addChoices(
          { name: 'Patch notes', value: 'patch' },
          { name: 'Meta', value: 'meta' },
          { name: 'Stato server', value: 'server_status' }
        )
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'game') {
      const games = await Game.findAll({ where: { is_active: true } });
      const choices = games.map((g) => ({ name: g.name, value: g.code }));
      await interaction.respond(
        choices.filter((c) => c.value.startsWith(focused.value.toLowerCase())).slice(0, 25)
      );
    }
  },

  async execute(interaction) {
    const code = interaction.options.getString('game');
    const kind = interaction.options.getString('kind') ?? 'patch';
    const game = await Game.findOne({ where: { code, is_active: true } });
    if (!game) {
      await interaction.reply({ embeds: [errorEmbed('Gioco sconosciuto.')], flags: 64 });
      return;
    }

    const latest = await GameMeta.findOne({
      where: { game_id: game.id, kind },
      order: [['fetched_at', 'DESC']],
    });
    if (!latest) {
      await interaction.reply({
        embeds: [errorEmbed(`Nessuna informazione ${kind} ancora in cache per ${game.name}. Riprova più tardi.`)],
        flags: 64,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${game.name} — ${kind.replace('_', ' ')}`)
      .setColor(game.color_hex ?? 0x8b0000)
      .setDescription(latest.body ?? latest.title)
      .setTimestamp(new Date(latest.fetched_at));
    if (latest.url) embed.setURL(latest.url);
    if (game.icon_url) embed.setThumbnail(game.icon_url);
    if (latest.url) embed.addFields({ name: 'Source', value: latest.url });

    await interaction.reply({ embeds: [embed] });
  },
};
