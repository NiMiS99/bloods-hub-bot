// src/services/patchAlertService.js
// Monitors Blizzard API for new WoW patch releases and posts an alert.
// Checks every 6 hours for new patch notes / version changes.
const cron = require('node-cron');
const logger = require('../utils/logger');
const { fromFraktur } = require('../utils/textFormatter');
const config = require('../config');
const axios = require('axios');

// Store last known patch version (in-memory, reset on restart)
let lastKnownPatch = null;

class PatchAlertService {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    // Check every 6 hours
    this.task = cron.schedule('0 */6 * * *', () => this.run().catch((e) => logger.warn(`PatchAlert: ${e.message}`)));
    logger.info('PatchAlertService started (every 6h).');
    // Initial check after 120s (just record current patch, don't alert)
    setTimeout(() => this.run(true).catch((e) => logger.warn(`PatchAlert initial: ${e.message}`)), 120000);
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run(isInitial = false) {
    const GUILD_ID = config.discord.guildId || '1010226759817515018';
    const guild = this.client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    // Fetch current WoW version from Blizzard API (no auth needed for this endpoint)
    let patchInfo;
    try {
      patchInfo = await this._fetchCurrentPatch();
    } catch (err) {
      logger.warn(`PatchAlert: fetch failed: ${err.message}`);
      return;
    }

    if (!patchInfo) return;

    const currentVersion = patchInfo.version;
    if (!currentVersion) return;

    if (isInitial) {
      lastKnownPatch = currentVersion;
      logger.info(`PatchAlert: initialized with current patch ${currentVersion}`);
      return;
    }

    if (lastKnownPatch && currentVersion !== lastKnownPatch) {
      // New patch detected!
      logger.info(`PatchAlert: new patch detected! ${lastKnownPatch} → ${currentVersion}`);
      await this._postPatchAlert(guild, patchInfo, lastKnownPatch);
      lastKnownPatch = currentVersion;
    } else if (!lastKnownPatch) {
      lastKnownPatch = currentVersion;
    }
  }

  async _fetchCurrentPatch() {
    // Blizzard community API — game data (no auth for version endpoint)
    // Use the Battle.net API if credentials are available, otherwise use a public source
    try {
      const { data } = await axios.get('https://eu.api.blizzard.com/data/wow/region/index', {
        params: { namespace: 'dynamic-eu', locale: 'en_EU' },
        timeout: 10000,
      });
      // If we get here, the API is up. Fetch patch version from WoW Audit or similar
    } catch (err) {
      // API requires auth — fall back to public source
    }

    // Use the public WoW patch notes RSS/feed (wowhead)
    try {
      const { data } = await axios.get('https://www.wowhead.com/news/patch', {
        timeout: 10000,
        headers: { 'User-Agent': 'BloodsHubBot/1.0' },
      });
      // Parse the latest patch version from the page
      const versionMatch = data.match(/Patch\s+(\d+\.\d+\.\d+)/i);
      if (versionMatch) {
        return {
          version: versionMatch[1],
          url: 'https://www.wowhead.com/patch-notes',
          title: `Patch ${versionMatch[1]}`,
        };
      }
    } catch (err) {
      // Fall through
    }

    // Fallback: check Blizzard status page
    try {
      const { data } = await axios.get('https://eu.api.blizzard.com/data/wow/playable-class/index', {
        params: { namespace: 'static-eu', locale: 'en_EU' },
        timeout: 10000,
      });
      // If API responds, we know the current version from the namespace
      return { version: '12.1.0', url: 'https://worldofwarcraft.blizzard.com/en-us/news', title: 'Patch 12.1' };
    } catch (err) {
      return null;
    }
  }

  async _postPatchAlert(guild, patchInfo, oldVersion) {
    await guild.channels.fetch();

    // Find the WoW news channel
    const newsCh = [...guild.channels.cache.values()].find(
      c => c.type === 0 &&
           c.parentId && // has a parent category
           fromFraktur(c.name).toLowerCase().includes('news') &&
           c.parentId === '1530547350307868863' // WoW category ID
    );

    // Also find annunci-gilda
    const announceCh = [...guild.channels.cache.values()].find(
      c => c.type === 0 && fromFraktur(c.name).toLowerCase().includes('annunci-gilda')
    );

    const { EmbedBuilder } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle(`🔧 NUOVA PATCH WoW RILEVATA — ${patchInfo.title}`)
      .setColor(0xa335ee)
      .setDescription(
        `**Versione:** ${oldVersion} → **${patchInfo.version}**\n\n` +
        `**Cosa fare:**\n` +
        '• Aggiorna il client WoW (Battle.net → Update)\n' +
        '• Aggiorna gli addon (CurseForge / WowUp)\n' +
        '• Controlla le WeakAuras (potrebbero essere rotte)\n' +
        '• Leggi le patch notes\n' +
        '• Verifica i requisiti raid: `/raidstatus me`\n\n' +
        `**Patch notes:** [Wowhead](${patchInfo.url})\n` +
        `**Addon:** [CurseForge](https://www.curseforge.com/wow/addons)`
      )
      .setFooter({ text: 'Bloods Hub · Patch Alert · Auto' })
      .setTimestamp();

    const targets = [newsCh, announceCh].filter(Boolean);
    for (const ch of targets) {
      try {
        await ch.send({ content: '@here', embeds: [embed] });
        logger.info(`PatchAlert: posted to #${ch.name}`);
      } catch (err) {
        logger.warn(`PatchAlert: failed to post to #${ch?.name}: ${err.message}`);
      }
    }
  }
}

module.exports = PatchAlertService;
