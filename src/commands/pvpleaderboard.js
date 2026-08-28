// src/commands/pvpleaderboard.js
// /pvpleaderboard — PvP leaderboard using Blizzard API (RBG/Arena ratings).
// Shows guild members ranked by PvP rating.
const { SlashCommandBuilder } = require('discord.js');
const { ExternalAccount, User } = require('../db');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pvpleaderboard')
    .setDescription('Classifica PvP gilda (RBG / Arena) da Blizzard API')
    .addStringOption(opt =>
      opt.setName('bracket')
        .setDescription('Bracket PvP')
        .setRequired(false)
        .addChoices(
          { name: 'RBG', value: 'rbg' },
          { name: 'Arena 2v2', value: '2v2' },
          { name: 'Arena 3v3', value: '3v3' },
          { name: 'Tutti', value: 'all' },
        )
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const bracket = interaction.options.getString('bracket') || 'all';
    const GUILD_ID = interaction.guild.id;

    // Get all linked WoW accounts
    const linked = await ExternalAccount.findAll({
      where: { provider: 'battlenet' },
      include: [{ model: User, where: { guild_id: GUILD_ID }, required: true }],
    });

    if (linked.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Nessun account WoW linkato. Usa `/link battlenet NomePG-Reame`.')] });
    }

    // Fetch PvP ratings from Blizzard API
    const battleNetApi = client.battleNetApi || require('../services/api/battleNetApi');
    const players = [];

    for (const acc of linked) {
      try {
        const pvpData = await this._fetchPvpSummary(battleNetApi, acc.external_id, acc.region || 'eu');
        if (!pvpData) continue;

        const profile = await battleNetApi.fetchProfile(acc.external_id, acc.region || 'eu');
        const name = profile?.name || acc.external_id;
        const className = profile?.character_class?.name || 'Unknown';

        const ratings = {
          rbg: pvpData.rated_battlegrounds?.rating || 0,
          '2v2': pvpData.arena_2v2?.rating || 0,
          '3v3': pvpData.arena_3v3?.rating || 0,
        };

        players.push({
          name,
          className,
          discordId: acc.user_id,
          rbg: ratings.rbg,
          '2v2': ratings['2v2'],
          '3v3': ratings['3v3'],
          bestRating: Math.max(ratings.rbg, ratings['2v2'], ratings['3v3']),
        });
      } catch (err) {
        // Skip individual failures
      }
    }

    // Filter players with at least one rating > 0
    const rated = players.filter(p => p.bestRating > 0);

    if (rated.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Nessun player con rating PvP trovato.')] });
    }

    // Sort by selected bracket or overall best
    if (bracket !== 'all') {
      rated.sort((a, b) => b[bracket] - a[bracket]);
    } else {
      rated.sort((a, b) => b.bestRating - a.bestRating);
    }

    const bracketLabels = {
      rbg: 'RBG',
      '2v2': 'Arena 2v2',
      '3v3': 'Arena 3v3',
      all: 'Tutti i bracket',
    };

    const embed = baseEmbed({
      title: `🏆 Classifica PvP — ${bracketLabels[bracket]}`,
      description: `Top ${rated.length} player per rating PvP (Blizzard API)`,
    });

    let leaderboard = '';
    rated.slice(0, 20).forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      if (bracket === 'all') {
        leaderboard += `${medal} **${p.name}** (${p.className}) — RBG: ${p.rbg} | 2v2: ${p['2v2']} | 3v3: ${p['3v3']}\n`;
      } else {
        leaderboard += `${medal} **${p.name}** (${p.className}) — ${p[bracket]} rating\n`;
      }
    });

    embed.addFields({ name: 'Classifica', value: leaderboard.substring(0, 1024) });

    embed.addFields({
      name: '📋 Info',
      value:
        '• Rating aggiornato da Blizzard API\n' +
        '• Richiede `/link battlenet` per apparire\n' +
        '• Aggiorna con `/refreshstats`',
    });

    return interaction.editReply({ embeds: [embed] });
  },

  async _fetchPvpSummary(battleNetApi, accountId, region) {
    try {
      const token = await battleNetApi._getToken(region);
      const { charName, realmInput } = battleNetApi.parseCharacterId(accountId);
      if (!realmInput) return null;
      const realmSlug = await battleNetApi._resolveRealmSlug(realmInput, region);

      const axios = require('axios');
      const { acquire: rateLimit } = require('../services/api/rateLimiter');
      await rateLimit('battlenet');

      const url = `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}/pvp-summary?namespace=profile-${region}&locale=en_${region}`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => ({ data: null }));

      return data;
    } catch (err) {
      return null;
    }
  },
};
