// src/services/weeklyKeysPoster.js
// Posts a weekly summary of all guild M+ keys to #keys-settimanali every Monday 20:00.
// Shows which gildani have keys, their levels, and best runs before the Tuesday reset.
const cron = require('node-cron');
const { ExternalAccount, User } = require('../db');
const logger = require('../utils/logger');
const { fromFraktur } = require('../utils/textFormatter');
const config = require('../config');
const axios = require('axios');

const KEYS_CHANNEL_ID = '1541874221809148057';

class WeeklyKeysPoster {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    // Every Monday at 20:00 (before Tuesday reset)
    this.task = cron.schedule('0 20 * * 1', () => this.run().catch((e) => logger.warn(`WeeklyKeys: ${e.message}`)));
    logger.info('WeeklyKeysPoster started (Monday 20:00).');
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const GUILD_ID = config.discord.guildId || '1010226759817515018';
    const guild = this.client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const channel = guild.channels.cache.get(KEYS_CHANNEL_ID);
    if (!channel) {
      logger.warn('WeeklyKeys: channel not found');
      return;
    }

    // Fetch all linked WoW accounts
    const linked = await ExternalAccount.findAll({
      where: { provider: 'battlenet' },
      include: [{ model: User, where: { guild_id: GUILD_ID }, required: true }],
    });

    if (linked.length === 0) {
      logger.info('WeeklyKeys: no linked WoW accounts');
      return;
    }

    // Fetch Raider.io profiles in parallel (batch of 5)
    const profiles = [];
    const batchSize = 5;
    for (let i = 0; i < linked.length; i += batchSize) {
      const batch = linked.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (acc) => {
          const profile = await this._fetchRaiderIo(acc.external_id);
          if (!profile) return null;
          const score = profile.mythic_plus_scores_by_season?.[0]?.scores?.all || 0;
          const weeklyRuns = profile.mythic_plus_weekly_runs || [];
          const bestRun = weeklyRuns.sort((a, b) => (b.mythic_level || 0) - (a.mythic_level || 0))[0];
          return {
            name: profile.name,
            realm: profile.realm,
            class: profile.class,
            score,
            runs: weeklyRuns.length,
            bestRun: bestRun ? { dungeon: bestRun.dungeon, level: bestRun.mythic_level } : null,
          };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) profiles.push(r.value);
      }
      // Small delay between batches to respect rate limits
      if (i + batchSize < linked.length) await new Promise(r => setTimeout(r, 1000));
    }

    if (profiles.length === 0) {
      logger.info('WeeklyKeys: no Raider.io profiles fetched');
      return;
    }

    // Sort by score
    profiles.sort((a, b) => b.score - a.score);

    const { EmbedBuilder } = require('discord.js');

    let keyList = '';
    for (const p of profiles) {
      const bestKey = p.bestRun ? ` | Best: +${p.bestRun.level} ${p.bestRun.dungeon}` : '';
      keyList += `**${p.name}** (${p.class}) — ${p.score} io | ${p.runs} run${p.bestKey || bestKey}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔑 Key M+ della Gilda — Riepilogo Settimanale')
      .setColor(0x8b0000)
      .setDescription(
        `**Reset di domani (martedì 03:00)**\n` +
        `Ecco le key completate questa settimana dai gildani.\n\n` +
        `**Player con account linkato:** ${profiles.length}\n` +
        `**Top score:** ${profiles[0]?.name} (${profiles[0]?.score} io)\n\n` +
        keyList.substring(0, 3500)
      )
      .addFields({
        name: '📋 Da fare prima del reset',
        value:
          '• Completa la chest settimanale (Vault)\n' +
          '• Finisci le key in corso\n' +
          '• Controlla il tuo score: `/keys me`\n' +
          '• Prossimi affix: martedì mattina (auto-post qui)',
      })
      .setFooter({ text: 'Bloods Hub · Weekly Keys Recap · Auto' })
      .setTimestamp();

    await channel.send({ content: '@here', embeds: [embed] });
    logger.info(`WeeklyKeys: posted weekly recap with ${profiles.length} profiles.`);
  }

  async _fetchRaiderIo(accountId) {
    try {
      const idx = accountId.lastIndexOf('-');
      if (idx < 1) return null;
      const name = accountId.slice(0, idx);
      const realm = accountId.slice(idx + 1);
      const { data } = await axios.get('https://raider.io/api/v1/characters/profile', {
        params: {
          region: 'eu', realm, name,
          fields: 'mythic_plus_scores_by_season,mythic_plus_weekly_runs,class',
        },
        timeout: 15000,
      });
      return data;
    } catch (err) {
      return null;
    }
  }
}

module.exports = WeeklyKeysPoster;
