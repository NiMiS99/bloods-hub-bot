// src/services/raidScheduler.js
// Auto-schedules raid reminders and creates spedizione events the day before raid.
// Runs hourly, checks if tomorrow is a raid day.
const { RaidConfig, WowEvent, RaidEligibility } = require('../db');
const logger = require('../utils/logger');
const spedizioneCmd = require('../commands/spedizione');

class RaidScheduler {
  constructor(client) {
    this.client = client;
    this.interval = null;
    this.lastRunDate = null; // track to avoid duplicate runs per day
  }

  start() {
    // Check every hour at :05
    const check = () => {
      const now = new Date();
      if (now.getMinutes() < 5) {
        this._tick().catch((e) => logger.warn(`RaidScheduler: ${e.message}`));
      }
    };
    // Initial check after 60s
    setTimeout(() => check(), 60000);
    this.interval = setInterval(check, 60 * 60 * 1000);
    logger.info('RaidScheduler started (hourly check).');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async _tick() {
    const GUILD_ID = '1010226759817515018';
    const cfg = await RaidConfig.findOne({ where: { guild_id: GUILD_ID } });
    if (!cfg || !cfg.announce_channel_id) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDay();

    const raidDays = cfg.raid_days || [3, 4];
    if (!raidDays.includes(tomorrowDay)) return;

    // Avoid duplicate: check if we already ran today
    const todayKey = now.toISOString().split('T')[0];
    if (this.lastRunDate === todayKey) return;
    this.lastRunDate = todayKey;

    // Tomorrow is a raid day — create reminder + eligibility announcement
    const [hours, minutes] = (cfg.raid_time || '21:00').split(':').map(Number);
    const raidDate = new Date(tomorrow);
    raidDate.setHours(hours || 21, minutes || 0, 0, 0);

    const ts = Math.floor(raidDate.getTime() / 1000);
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const dayName = dayNames[tomorrowDay];

    const guild = this.client.guilds.cache.get(GUILD_ID);
    if (!guild) return;
    const channel = guild.channels.cache.get(cfg.announce_channel_id);
    if (!channel) return;

    // Get eligibility stats
    const eligibleCount = await RaidEligibility.count({ where: { guild_id: GUILD_ID, is_eligible: true } });
    const ineligibleCount = await RaidEligibility.count({ where: { guild_id: GUILD_ID, is_eligible: false } });

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(`Raid: ${cfg.raid_name}`)
      .setColor(0x8b0000)
      .setDescription(
        `**Promemoria raid di ${dayName}**\n\n` +
        `:calendar: Quando: <t:${ts}:F> (<t:${ts}:R>)\n` +
        `:hourglass: Orario: **${cfg.raid_time}**\n\n` +
        `:white_check_mark: Player idonei: **${eligibleCount}**\n` +
        `:x: Player non idonei: **${ineligibleCount}**\n\n` +
        `**Per prenotarti:** usa Raid-Helper nel canale prenotazioni.\n` +
        `**Solo chi ha il ruolo @Progress può partecipare al progress.**\n` +
        `**Per verificare la tua idoneità:** usa \`/raidstatus me\`\n` +
        `**Requisiti minimi:** ilvl **${cfg.min_ilvl}**${cfg.require_tier_bonus ? ' + tier 2pc' : ''}${cfg.min_raid_attendance > 0 ? ` + ${cfg.min_raid_attendance} presenze` : ''}`
      )
      .setFooter({ text: 'Bloods Hub · Auto-scheduling · Sistema meritocratico' })
      .setTimestamp();

    await channel.send({ content: '@everyone', embeds: [embed] }).catch(() => {});
    logger.info(`RaidScheduler: sent reminder for ${dayName} raid.`);
  }
}

module.exports = RaidScheduler;
