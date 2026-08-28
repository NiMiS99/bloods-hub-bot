// src/services/attendanceFlagService.js
// Weekly check: flags raiders with <50% attendance in the last 30 days
// and notifies officers in #officer-only for review.
const cron = require('node-cron');
const { Op } = require('sequelize');
const { RaidAttendance, RaidConfig } = require('../db');
const logger = require('../utils/logger');
const { fromFraktur } = require('../utils/textFormatter');
const config = require('../config');

const ATTENDANCE_THRESHOLD = 0.5; // 50%

class AttendanceFlagService {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    // Every Monday at 09:00 (before raid week starts)
    this.task = cron.schedule('0 9 * * 1', () => this.run().catch((e) => logger.warn(`AttendanceFlag: ${e.message}`)));
    logger.info('AttendanceFlagService started (Monday 09:00).');
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const GUILD_ID = config.discord.guildId || '1010226759817515018';
    const guild = this.client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    // Find officer-only channel
    await guild.channels.fetch();
    const officerCh = [...guild.channels.cache.values()].find(
      c => c.type === 0 && fromFraktur(c.name).toLowerCase().includes('officer')
    );
    if (!officerCh) {
      logger.warn('AttendanceFlag: officer channel not found');
      return;
    }

    // Get all raid attendance in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Get all unique users with attendance records
    const records = await RaidAttendance.findAll({
      where: {
        guild_id: GUILD_ID,
        raid_date: { [Op.gte]: dateStr },
      },
      order: [['user_id', 'ASC'], ['raid_date', 'ASC']],
    });

    if (records.length === 0) {
      logger.info('AttendanceFlag: no attendance records in last 30 days');
      return;
    }

    // Group by user
    const byUser = {};
    for (const r of records) {
      if (!byUser[r.user_id]) byUser[r.user_id] = { total: 0, attended: 0 };
      byUser[r.user_id].total++;
      if (r.attended) byUser[r.user_id].attended++;
    }

    // Find users below threshold
    const flagged = [];
    for (const [userId, stats] of Object.entries(byUser)) {
      const rate = stats.total > 0 ? stats.attended / stats.total : 0;
      if (rate < ATTENDANCE_THRESHOLD && stats.total >= 3) {
        // Only flag if they have at least 3 raids (enough data)
        flagged.push({ userId, ...stats, rate: Math.round(rate * 100) });
      }
    }

    if (flagged.length === 0) {
      logger.info('AttendanceFlag: all raiders above 50% threshold');
      return;
    }

    // Sort by lowest attendance first
    flagged.sort((a, b) => a.rate - b.rate);

    const { EmbedBuilder } = require('discord.js');

    let flagList = '';
    for (const f of flagged) {
      flagList += `⚠️ <@${f.userId}> — ${f.attended}/${f.total} raid (${f.rate}%)\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Review Presenze Raid — Raider sotto 50%')
      .setColor(0xed4245)
      .setDescription(
        `**Controllo settimanale presenze (ultimi 30 giorni)**\n\n` +
        `I seguenti raider hanno una percentuale di presenza **sotto il 50%**.\n` +
        `Valutare se contattarli, dare warning, o rimuovere il ruolo Progress.\n\n` +
        flagList
      )
      .addFields({
        name: 'Azioni consigliate',
        value:
          '1. Contattare il player via DM per capire il motivo\n' +
          '2. Se inattivo >2 settimane senza preavviso → warning\n' +
          '3. Se inattivo >4 settimane → rimuovere ruolo Progress\n' +
          '4. Documentare la decisione con `/recruit update`',
      })
      .setFooter({ text: 'Bloods Hub · Attendance Flag · Auto (Monday 09:00)' })
      .setTimestamp();

    await officerCh.send({ content: '@here', embeds: [embed] });
    logger.info(`AttendanceFlag: flagged ${flagged.length} raider(s) below 50% attendance.`);
  }
}

module.exports = AttendanceFlagService;
