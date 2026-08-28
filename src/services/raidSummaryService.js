// src/services/raidSummaryService.js
// Auto-posts a raid summary after raid end time (23:59 on raid days).
// Summarizes: attendance, BP awarded, loot distributed, bosses killed.
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { RaidConfig, RaidAttendance, BpLootHistory, BpUser } = require('../db');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
let _task = null;

async function postRaidSummary(client) {
  try {
    const cfg = await RaidConfig.findOne({ where: { guild_id: GUILD_ID } });
    if (!cfg || !cfg.announce_channel_id) return;

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;
    const channel = guild.channels.cache.get(cfg.announce_channel_id);
    if (!channel) return;

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch today's attendance
    const attendances = await RaidAttendance.findAll({
      where: {
        guild_id: GUILD_ID,
        attended_at: { between: [startOfDay, endOfDay] },
      },
    });

    if (attendances.length === 0) {
      logger.info('RaidSummary: no attendance records today, skipping.');
      return;
    }

    const present = attendances.filter((a) => a.status === 'present').length;
    const late = attendances.filter((a) => a.status === 'late').length;
    const absent = attendances.filter((a) => a.status === 'absent').length;
    const total = attendances.length;

    // Fetch today's loot
    const lootRecords = await BpLootHistory.findAll({
      where: {
        guild_id: GUILD_ID,
        awarded_at: { between: [startOfDay, endOfDay] },
      },
    });

    const lootLines = lootRecords.slice(0, 10).map((l) => {
      return `• <@${l.user_id}> — **${l.item_name || 'Item'}** (${l.bp_cost || 0} BP)`;
    });
    const lootText = lootLines.length > 0
      ? lootLines.join('\n')
      : '_Nessun loot registrato oggi._';

    // Total BP awarded today (attendance + loot)
    const bpAwarded = attendances.reduce((sum, a) => sum + (a.bp_awarded || 0), 0);
    const bpSpent = lootRecords.reduce((sum, l) => sum + (l.bp_cost || 0), 0);

    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const dayName = dayNames[now.getDay()];

    const embed = new EmbedBuilder()
      .setTitle(`Riepilogo Raid — ${dayName} ${now.toLocaleDateString('it-IT')}`)
      .setColor(0x8b0000)
      .setDescription(
        `**Partecipazione**\n` +
        `:white_check_mark: Presenti: **${present}**\n` +
        `:hourglass: In ritardo: **${late}**\n` +
        `:x: Assenti: **${absent}**\n` +
        `:busts_in_silhouette: Totale registrati: **${total}**\n\n` +
        `**Bloods Points**\n` +
        `:coin: BP assegnati (presenza): **${bpAwarded}**\n` +
        `:shopping_cart: BP spesi (loot): **${bpSpent}**\n\n` +
        `**Loot distribuito**\n${lootText}`
      )
      .setFooter({ text: 'Bloods Hub · Riepilogo automatico raid' })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
    logger.info(`RaidSummary: posted summary for ${dayName} (${present} present, ${lootRecords.length} loot).`);
  } catch (err) {
    logger.error(`RaidSummary error: ${err.message}`);
  }
}

function start(client) {
  // Run at 23:59 every day (checks if raid day internally)
  _task = cron.schedule('59 23 * * *', () => postRaidSummary(client), {
    timezone: 'Europe/Rome',
  });
  logger.info('RaidSummaryService: started (daily at 23:59 Europe/Rome).');
}

function stop() {
  if (_task) _task.stop();
  _task = null;
  logger.info('RaidSummaryService: stopped.');
}

module.exports = { start, stop, postRaidSummary };
