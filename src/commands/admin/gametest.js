// src/commands/admin/gametest.js
// /gametest <game> — manually fetch + post news for a game (admin only).
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Game, GameMeta } = require('../../db');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gametest')
    .setDescription('Testa le funzioni di un gioco: fetch news + post nel canale news.')
    .addStringOption((o) =>
      o.setName('game').setDescription('Codice gioco').setRequired(true).setAutocomplete(true)
    )
    .addBooleanOption((o) =>
      o.setName('fetch').setDescription('Forza fetch nuove news prima di postare (default: true)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction) {
    const games = await Game.findAll({ where: { is_active: true } });
    await interaction.respond(
      games
        .filter((g) => g.code.startsWith(interaction.options.getFocused()))
        .slice(0, 25)
        .map((g) => ({ name: g.name, value: g.code }))
    );
  },

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Non hai i permessi per usare questo comando.')],
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const code = interaction.options.getString('game');
    const doFetch = interaction.options.getBoolean('fetch') ?? true;
    const game = await Game.findOne({ where: { code, is_active: true } });
    if (!game) {
      await interaction.editReply({ embeds: [errorEmbed('Gioco non trovato.')] });
      return;
    }

    let fetchResult = 'saltato';
    if (doFetch) {
      try {
        const mod = require(`../../modules/games/${game.code}`);
        if (mod?.fetchMeta) {
          const items = await mod.fetchMeta();
          const { Op } = require('sequelize');
          let newCount = 0;
          for (const item of items) {
            if (item.url) {
              const existing = await GameMeta.findOne({
                where: {
                  game_id: game.id,
                  kind: item.kind,
                  url: item.url,
                  fetched_at: { [Op.gte]: new Date(Date.now() - 6 * 3600 * 1000) },
                },
              });
              if (existing) continue;
            }
            await GameMeta.create({
              game_id: game.id,
              kind: item.kind,
              title: item.title,
              body: item.body ?? null,
              url: item.url ?? null,
              posted_to_channel: false,
            });
            newCount++;
          }
          fetchResult = `${items.length} item fetchati, ${newCount} nuovi`;
        } else {
          fetchResult = 'nessun modulo fetchMeta';
        }
      } catch (err) {
        fetchResult = `errore: ${err.message.substring(0, 80)}`;
      }
    }

    // Post to news channel
    let postResult = 'errore sconosciuto';
    try {
      const result = await interaction.client.newsPoster.postForGame(game.code);
      if (result.error) {
        postResult = result.error;
      } else {
        postResult = `${result.posted} news postate in #${result.channel}`;
      }
    } catch (err) {
      postResult = `errore: ${err.message.substring(0, 80)}`;
    }

    // Check game channels
    const guild = interaction.guild;
    await guild.channels.fetch();
    const cat = game.category_id ? guild.channels.cache.get(game.category_id) : null;
    let channelsInfo = 'nessuna categoria';
    if (cat) {
      const children = [...guild.channels.cache.values()]
        .filter((c) => c.parentId === cat.id)
        .map((c) => `#${c.name}`);
      channelsInfo = `${children.length} canali: ${children.join(', ')}`;
    }

    const role = game.role_id ? `<@&${game.role_id}>` : 'non configurato';

    await interaction.editReply({
      embeds: [
        successEmbed(
          `**Test gioco: ${game.name}**\n\n` +
          `**Fetch:** ${fetchResult}\n` +
          `**Post:** ${postResult}\n` +
          `**Ruolo:** ${role}\n` +
          `**Canali:** ${channelsInfo}`
        ),
      ],
    });
  },
};
