// src/services/affixScheduler.js
// Posts the weekly Mythic+ affixes to the #keys-settimanali channel.
// Runs every Tuesday at 10:05 AM (after the EU weekly reset at 03:00).
// Uses the Raider.io API (no auth required).
const axios = require('axios');
const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config');

// Channel ID for keys-settimanali (new M+ category)
const KEYS_CHANNEL_ID = '1541874221809148057';

class AffixScheduler {
  constructor(client) {
    this.client = client;
    this.task = null;
    this.lastPostedWeek = null;
  }

  start() {
    // Every Tuesday at 10:05 AM
    this.task = cron.schedule('5 10 * * 2', () => this.run().catch((e) => logger.warn(`AffixScheduler: ${e.message}`)));
    logger.info('AffixScheduler started (Tuesday 10:05 AM).');
    // Initial check after 60s (in case bot restarts on Tuesday after 10:05)
    setTimeout(() => this.run().catch((e) => logger.warn(`AffixScheduler initial: ${e.message}`)), 60000);
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async _fetchAffixes() {
    const { data } = await axios.get('https://raider.io/api/v1/mythic-plus/affixes', {
      params: { region: 'eu', locale: 'it' },
      timeout: 15000,
    });
    return data;
  }

  async run() {
    const GUILD_ID = config.discord.guildId || '1010226759817515018';
    const guild = this.client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const channel = guild.channels.cache.get(KEYS_CHANNEL_ID);
    if (!channel) {
      logger.warn('AffixScheduler: keys-settimanali channel not found');
      return;
    }

    // Avoid duplicate posts in the same week
    const now = new Date();
    const weekKey = `${now.getFullYear()}-${now.getWeek?.() || this._getWeekNumber(now)}`;
    if (this.lastPostedWeek === weekKey) return;

    let affixData;
    try {
      affixData = await this._fetchAffixes();
    } catch (err) {
      logger.warn(`AffixScheduler: fetch failed: ${err.message}`);
      return;
    }

    if (!affixData?.affix_details && !affixData?.affixes) {
      logger.warn('AffixScheduler: no affix data returned');
      return;
    }

    // Raider.io API returns affix_details array (season) or affixes (current week)
    const affixes = affixData.affix_details || affixData.affixes || [];
    if (affixes.length === 0) return;

    this.lastPostedWeek = weekKey;

    const { EmbedBuilder } = require('discord.js');

    let affixList = '';
    const affixEmojis = {
      'Tyrannical': ' Tyrannical',
      'Fortified': ' Fortified',
      'Bolstering': ' Bolstering',
      'Sanguine': ' Sanguine',
      'Volcanic': ' Volcanic',
      'Necrotic': ' Necrotic',
      'Inspiring': ' Inspiring',
      'Quaking': ' Quaking',
      'Grievous': ' Grievous',
      'Explosive': ' Explosive',
      'Raging': ' Raging',
      'Teeming': ' Teeming',
      'Beguiling': ' Beguiling',
      'Awakened': ' Awakened',
      'Prideful': ' Prideful',
      'Spiteful': ' Spiteful',
      'Storming': ' Storming',
      'Tormented': ' Tormented',
      'Encrypted': ' Encrypted',
      'Shrouded': ' Shrouded',
      'Thundering': ' Thundering',
      'Afflicted': ' Afflicted',
      'Incorporeal': ' Incorporeal',
      'Xal\'atath': ' Xal\'atath',
    };

    const levelLabels = ['+4', '+7', '+10', '+12 (Tyrannical/Fortified)'];
    affixes.forEach((affix, i) => {
      const name = affix.name || affix;
      const desc = affix.description || '';
      const level = levelLabels[i] || `Affix ${i + 1}`;
      affixList += `**${level}:** ${name}\n`;
      if (desc) affixList += `  *${desc.substring(0, 200)}*\n`;
      affixList += '\n';
    });

    const embed = new EmbedBuilder()
      .setTitle('🔑 Affix Mythic+ della Settimana')
      .setColor(0x8b0000)
      .setDescription(
        `**Reset di questa settimana:**\n\n${affixList}` +
        `\n**Dungeon attivi Season 2:**\n` +
        `• Altar of Fangs\n• Murder Row\n• Den of Nalorakk\n• The Blinding Vale\n` +
        `• Voidscar Arena\n• Kings\' Rest\n• Temple of Sethraliss\n• Ruby Life Pools\n\n` +
        `**Fonte:** [Raider.io](https://raider.io/mythic-plus-affixes)`
      )
      .setFooter({ text: 'Bloods Hub · Affix Auto-Post · Patch 12.1 Season 2' })
      .setTimestamp();

    await channel.send({ content: '@here', embeds: [embed] });
    logger.info('AffixScheduler: posted weekly affixes.');
  }

  _getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
}

module.exports = AffixScheduler;
