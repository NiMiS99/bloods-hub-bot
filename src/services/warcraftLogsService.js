// src/services/warcraftLogsService.js
// Auto-posts new Warcraft Logs reports to the #raid-log channel.
// Polls the WCL API v2 (GraphQL) every 10 minutes for new reports.
// Requires WCL_CLIENT_ID and WCL_CLIENT_SECRET in .env.
const axios = require('axios');
const cron = require('node-cron');
const { Guild } = require('../db');
const logger = require('../utils/logger');
const { fromFraktur } = require('../utils/textFormatter');
const config = require('../config');

const WCL_GUILD_NAME = process.env.WCL_GUILD_NAME || 'Bloods';
const WCL_GUILD_SERVER = process.env.WCL_GUILD_SERVER || 'Pozzo dell\'Eternity';
const WCL_REGION = process.env.WCL_REGION || 'EU';

// Channel ID for raid-log (🏰 𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖤)
const RAID_LOG_CHANNEL_ID = '1422990227718406236';

class WarcraftLogsService {
  constructor(client) {
    this.client = client;
    this.task = null;
    this._token = null;
    this._tokenExpires = 0;
    this._lastReportId = null; // track last seen report to avoid duplicates
  }

  start() {
    if (!process.env.WCL_CLIENT_ID || !process.env.WCL_CLIENT_SECRET) {
      logger.info('WarcraftLogsService: WCL credentials not set, skipping.');
      return;
    }
    // Check every 10 minutes
    this.task = cron.schedule('*/10 * * * *', () => this.run().catch((e) => logger.warn(`WCL: ${e.message}`)));
    logger.info('WarcraftLogsService started (every 10min).');
    // Initial check after 90s
    setTimeout(() => this.run().catch((e) => logger.warn(`WCL initial: ${e.message}`)), 90000);
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExpires - 60000) return this._token;
    const { data } = await axios.post(
      'https://www.warcraftlogs.com/oauth/token',
      'grant_type=client_credentials',
      {
        auth: {
          username: process.env.WCL_CLIENT_ID,
          password: process.env.WCL_CLIENT_SECRET,
        },
      }
    );
    this._token = data.access_token;
    this._tokenExpires = Date.now() + (data.expires_in ?? 86400) * 1000;
    return this._token;
  }

  async _fetchRecentReports() {
    const token = await this._getToken();
    // WCL API v2 — GraphQL endpoint
    const query = `
      query {
        reportData {
          reports(guildName: "${WCL_GUILD_NAME}", guildServer: "${WCL_GUILD_SERVER}", guildServerRegion: "${WCL_REGION}", limit: 5) {
            data {
              id
              code
              title
              startTime
              zone {
                name
              }
              segments
            }
          }
        }
      }
    `;
    const { data } = await axios.post(
      'https://www.warcraftlogs.com/api/v2/client',
      { query },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data?.data?.reportData?.reports?.data || [];
  }

  async run() {
    const GUILD_ID = config.discord.guildId || '1010226759817515018';
    const guild = this.client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const channel = guild.channels.cache.get(RAID_LOG_CHANNEL_ID);
    if (!channel) {
      logger.warn('WCL: raid-log channel not found');
      return;
    }

    let reports;
    try {
      reports = await this._fetchRecentReports();
    } catch (err) {
      logger.warn(`WCL: fetch failed: ${err.response?.status} ${err.response?.statusText || err.message}`);
      return;
    }

    if (reports.length === 0) return;

    // Sort by startTime ascending (oldest first)
    reports.sort((a, b) => a.startTime - b.startTime);

    // On first run, just record the latest report ID without posting
    if (!this._lastReportId) {
      this._lastReportId = reports[reports.length - 1].id;
      logger.info(`WCL: initialized with latest report ${this._lastReportId}`);
      return;
    }

    // Post any reports newer than the last seen
    const newReports = reports.filter(r => r.id > this._lastReportId || r.startTime > Date.now() - 3600000);
    for (const report of newReports) {
      if (report.id <= this._lastReportId) continue;
      try {
        await this._postReport(channel, report);
        this._lastReportId = report.id;
      } catch (err) {
        logger.error(`WCL: failed to post report ${report.code}: ${err.message}`);
      }
    }
  }

  async _postReport(channel, report) {
    const { EmbedBuilder } = require('discord.js');
    const ts = Math.floor(report.startTime / 1000);
    const wclUrl = `https://www.warcraftlogs.com/reports/${report.code}`;

    const embed = new EmbedBuilder()
      .setTitle(`📑 ${report.title || 'Nuovo Report Raid'}`)
      .setColor(0x8b0000)
      .setDescription(
        `**Zona:** ${report.zone?.name || 'N/D'}\n` +
        `**Data:** <t:${ts}:F> (<t:${ts}:R>)\n\n` +
        `**Analisi completa:** [Warcraft Logs](${wclUrl})`
      )
      .setURL(wclUrl)
      .setFooter({ text: 'Bloods Hub · Warcraft Logs Auto-Post' })
      .setTimestamp(new Date(report.startTime));

    await channel.send({ content: '@here', embeds: [embed] });
    logger.info(`WCL: posted report ${report.code} — ${report.title}`);

    // Parse boss kills from the report and update progress
    await this._parseBossKills(report);
  }

  /**
   * Fetch detailed report data and extract boss kills.
   * Posts a progress update if new bosses were killed.
   */
  async _parseBossKills(report) {
    try {
      const token = await this._getToken();
      const query = `
        query {
          reportData {
            report(code: "${report.code}") {
              fights(killType: Kills) {
                id
                name
                kill
                difficulty
                bossPercentage
                encounterID
                startTime
                endTime
              }
              zone {
                name
                encounters {
                  id
                  name
                }
              }
            }
          }
        }
      `;
      const { data } = await axios.post(
        'https://www.warcraftlogs.com/api/v2/client',
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const reportData = data?.data?.reportData?.report;
      if (!reportData?.fights) return;

      const kills = reportData.fights.filter(f => f.kill);
      if (kills.length === 0) return;

      const difficultyMap = { 1: 'LFR', 2: 'Normal', 3: 'Heroic', 4: 'Mythic', 5: 'Mythic', 10: 'Heroic', 14: 'Normal', 15: 'Heroic', 16: 'Mythic' };

      // Group kills by difficulty
      const byDifficulty = {};
      for (const kill of kills) {
        const diff = difficultyMap[kill.difficulty] || 'Unknown';
        if (!byDifficulty[diff]) byDifficulty[diff] = new Set();
        byDifficulty[diff].add(kill.name);
      }

      // Post progress update to raid-log channel
      const GUILD_ID = config.discord.guildId || '1010226759817515018';
      const guild = this.client.guilds.cache.get(GUILD_ID);
      if (!guild) return;

      const channel = guild.channels.cache.get(RAID_LOG_CHANNEL_ID);
      if (!channel) return;

      const { EmbedBuilder } = require('discord.js');

      let progressDesc = '';
      for (const [diff, bosses] of Object.entries(byDifficulty)) {
        const bossList = [...bosses].sort();
        progressDesc += `**${diff} (${bossList.length}/${reportData.zone?.encounters?.length || 8}):**\n`;
        progressDesc += bossList.map(b => `  ✅ ${b}`).join('\n') + '\n\n';
      }

      const progressEmbed = new EmbedBuilder()
        .setTitle(`🏆 Progress Update — ${reportData.zone?.name || report.title}`)
        .setColor(0x8b0000)
        .setDescription(progressDesc || 'Nessun kill rilevato')
        .setFooter({ text: 'Bloods Hub · Boss Kill Tracker · Auto' })
        .setTimestamp();

      await channel.send({ embeds: [progressEmbed] });
      logger.info(`WCL: posted progress update — ${kills.length} kills in ${report.code}`);

      // Also post to annunci-gilda if Mythic kills
      if (byDifficulty['Mythic'] && byDifficulty['Mythic'].size > 0) {
        const { fromFraktur } = require('../utils/textFormatter');
        await guild.channels.fetch();
        const announceCh = [...guild.channels.cache.values()].find(
          c => c.type === 0 && fromFraktur(c.name).toLowerCase().includes('annunci-gilda')
        );
        if (announceCh) {
          const mythicBosses = [...byDifficulty['Mythic']].sort();
          const mythicEmbed = new EmbedBuilder()
            .setTitle(`🏆 MYTHIC KILL — ${reportData.zone?.name || 'Raid'}`)
            .setColor(0xa335ee)
            .setDescription(
              `**Nuovi boss killati in Mythic!**\n\n` +
              mythicBosses.map(b => `💀 ${b}`).join('\n') +
              `\n\n**Progress Mythic:** ${byDifficulty['Mythic'].size}/${reportData.zone?.encounters?.length || 8}\n` +
              `**GG Bloods!** 🎉`
            )
            .setFooter({ text: 'Bloods Hub · Mythic Kill Alert' })
            .setTimestamp();
          await announceCh.send({ content: '@everyone', embeds: [mythicEmbed] });
        }
      }
    } catch (err) {
      logger.warn(`WCL: failed to parse boss kills for ${report.code}: ${err.message}`);
    }
  }
}

module.exports = WarcraftLogsService;
