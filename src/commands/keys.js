// src/commands/keys.js
// /keys — Show Mythic+ keys available in the guild for the current week.
// Uses Raider.io API to fetch character run data for linked WoW accounts.
// Subcommands:
//   list — show all gildani M+ keys for the week
//   me — show your own M+ runs and score
//   leaderboard — M+ leaderboard within the guild
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { ExternalAccount, User } = require('../db');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { fromFraktur } = require('../utils/textFormatter');
const logger = require('../utils/logger');

// Raider.io API endpoints (no auth required, rate-limited)
const RIO_API = 'https://raider.io/api/v1';
const RIO_CHAR_PROFILE = `${RIO_API}/characters/profile`;
const RIO_RUNS = `${RIO_API}/runs/list-season`;

// Season 2 M+ dungeon pool
const S2_DUNGEONS = [
  'Altar of Fangs', 'Murder Row', 'Den of Nalorakk', 'The Blinding Vale',
  'Voidscar Arena', 'Kings\' Rest', 'Temple of Sethraliss', 'Ruby Life Pools',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('keys')
    .setDescription('Mythic+ keys della gilda (Season 2)')
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lista key M+ disponibili in gilda questa settimana')
    )
    .addSubcommand(sub =>
      sub.setName('me')
        .setDescription('Le tue run M+ e score Raider.io')
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('Classifica M+ interna della gilda')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      await interaction.deferReply();
      const keys = await this._fetchGuildKeys(interaction.guild.id);

      if (keys.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('Nessun account WoW linkato trovato. Usa `/link battlenet NomePG-Reame` per linkare il tuo PG.')] });
      }

      const embed = baseEmbed({
        title: '🔑 Key Mythic+ della Gilda',
        description: `**Season 2 — Patch 12.1**\n${keys.length} personaggi linkati\n\n**Dungeon attivi:**\n${S2_DUNGEONS.map(d => `• ${d}`).join('\n')}`,
      });

      // Group by dungeon
      const byDungeon = {};
      for (const k of keys) {
        if (!k.bestRun) continue;
        const dung = k.bestRun.dungeon || 'Unknown';
        if (!byDungeon[dung]) byDungeon[dung] = [];
        byDungeon[dung].push(k);
      }

      let keyList = '';
      for (const [dungeon, players] of Object.entries(byDungeon)) {
        players.sort((a, b) => (b.bestRun?.mythicLevel || 0) - (a.bestRun?.mythicLevel || 0));
        keyList += `**${dungeon}:**\n`;
        for (const p of players.slice(0, 5)) {
          keyList += `  +${p.bestRun.mythicLevel} — ${p.characterName} (${p.username})\n`;
        }
        keyList += '\n';
      }

      if (keyList) {
        embed.addFields({ name: 'Key completate questa settimana', value: keyList.substring(0, 1024) });
      } else {
        embed.addFields({ name: 'Key completate questa settimana', value: 'Nessuna run completata trovata.' });
      }

      return interaction.editReply({ embeds: [embed] });

    } else if (sub === 'me') {
      await interaction.deferReply();

      const linked = await ExternalAccount.findOne({
        where: { user_id: interaction.user.id, provider: 'battlenet' },
      });

      if (!linked) {
        return interaction.editReply({ embeds: [errorEmbed('Non hai linkato un account WoW. Usa `/link battlenet NomePG-Reame` per linkarlo.')] });
      }

      const profile = await this._fetchRaiderIoProfile(linked.external_id);

      if (!profile) {
        return interaction.editReply({ embeds: [errorEmbed('Impossibile recuperare il profilo Raider.io. Verifica che il PG sia linkato correttamente.')] });
      }

      const embed = baseEmbed({
        title: `M+ Profile — ${profile.name}`,
        description:
          `**Reame:** ${profile.realm}\n` +
          `**Classe:** ${profile.class} (${profile.active_spec_name})\n` +
          `**Item Level:** ${profile.gear?.item_level_equipped || 'N/D'}\n\n` +
          `**Score M+ Season 2:** ${profile.mythic_plus_scores_by_season?.[0]?.scores?.all || 0}\n` +
          `**Runs questa settimana:** ${profile.mythic_plus_weekly_runs?.length || 0}`,
      });

      if (profile.thumbnail) {
        embed.setThumbnail(profile.thumbnail);
      }

      // Show recent runs
      const runs = profile.mythic_plus_weekly_runs || [];
      if (runs.length > 0) {
        const runList = runs.slice(0, 10).map(r =>
          `+${r.mythic_level} ${r.dungeon} — ${r.affixes?.map(a => a.name).join(', ') || ''} ${r.num_keystone_upgrades > 0 ? '✅' : '❌'}`
        ).join('\n');
        embed.addFields({ name: 'Run recenti', value: runList.substring(0, 1024) });
      }

      return interaction.editReply({ embeds: [embed] });

    } else if (sub === 'leaderboard') {
      await interaction.deferReply();

      const keys = await this._fetchGuildKeys(interaction.guild.id);
      const scored = keys.filter(k => k.score > 0).sort((a, b) => b.score - a.score);

      if (scored.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('Nessuno score M+ trovato. Linka il tuo PG con `/link battlenet`.')] });
      }

      const embed = baseEmbed({
        title: '🏆 Classifica M+ Gilda — Season 2',
        description: `Top ${scored.length} player per score Raider.io`,
      });

      const leaderboard = scored.slice(0, 20).map((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} ${p.characterName} — ${p.score} score (${p.username})`;
      }).join('\n');

      embed.addFields({ name: 'Classifica', value: leaderboard.substring(0, 1024) });

      return interaction.editReply({ embeds: [embed] });
    }
  },

  /**
   * Fetch Raider.io profile for a character.
   */
  async _fetchRaiderIoProfile(accountId) {
    try {
      // Parse "Name-Realm" format
      const idx = accountId.lastIndexOf('-');
      if (idx < 1) return null;
      const name = accountId.slice(0, idx);
      const realm = accountId.slice(idx + 1);

      const { data } = await axios.get(RIO_CHAR_PROFILE, {
        params: {
          region: 'eu',
          realm: realm,
          name: name,
          fields: 'mythic_plus_scores_by_season,mythic_plus_weekly_runs,gear,active_spec_name,thumbnail',
        },
        timeout: 15000,
      });
      return data;
    } catch (err) {
      logger.warn(`/keys: Raider.io fetch failed for ${accountId}: ${err.response?.status || err.message}`);
      return null;
    }
  },

  /**
   * Fetch M+ data for all linked WoW accounts in the guild.
   */
  async _fetchGuildKeys(guildId) {
    const linked = await ExternalAccount.findAll({
      where: { provider: 'battlenet' },
      include: [{ model: User, where: { guild_id: guildId }, required: true }],
    });

    const results = [];
    for (const acc of linked) {
      try {
        const profile = await this._fetchRaiderIoProfile(acc.external_id);
        if (!profile) continue;

        const score = profile.mythic_plus_scores_by_season?.[0]?.scores?.all || 0;
        const weeklyRuns = profile.mythic_plus_weekly_runs || [];
        const bestRun = weeklyRuns.sort((a, b) => (b.mythic_level || 0) - (a.mythic_level || 0))[0];

        results.push({
          userId: acc.user_id,
          username: profile.name,
          characterName: profile.name,
          realm: profile.realm,
          score,
          weeklyRuns,
          bestRun: bestRun ? {
            dungeon: bestRun.dungeon,
            mythicLevel: bestRun.mythic_level,
            affixes: bestRun.affixes,
            completed: bestRun.num_keystone_upgrades > 0,
          } : null,
        });
      } catch (err) {
        // Skip individual failures
      }
    }

    return results;
  },
};
