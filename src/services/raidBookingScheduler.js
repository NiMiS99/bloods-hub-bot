// src/services/raidBookingScheduler.js
// Auto-creates weekly raid booking events (incursioni) for Wed + Thu.
// Runs daily at 09:00 — creates events for the upcoming week's raid days.
const cron = require('node-cron');
const { WowEvent, WowEventSignup, RaidConfig } = require('../db');
const logger = require('../utils/logger');
const config = require('../config');
const spedizione = require('../commands/spedizione');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
let _task = null;

function getNextWeekday(weekday, hour, minute) {
  const now = new Date();
  const result = new Date(now);
  const currentDay = now.getDay();
  let daysUntil = (weekday - currentDay + 7) % 7;
  if (daysUntil === 0 && now.getHours() >= hour) daysUntil = 7;
  result.setDate(now.getDate() + daysUntil);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function shortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createWeeklyBookings(client) {
  try {
    const cfg = await RaidConfig.findOne({ where: { guild_id: GUILD_ID } });
    if (!cfg || !cfg.announce_channel_id) {
      logger.warn('RaidBookingScheduler: no config or announce channel, skipping.');
      return;
    }

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;
    const channel = await guild.channels.fetch(cfg.announce_channel_id).catch(() => null);
    if (!channel) return;

    const raidDays = cfg.raid_days || [3, 4];
    const [hours, minutes] = (cfg.raid_time || '21:00').split(':').map(Number);
    const raidName = cfg.raid_name || 'Incursione Gilda';

    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const created = [];

    for (const day of raidDays) {
      const raidDate = getNextWeekday(day, hours || 21, minutes || 0);
      const dateStr = raidDate.toISOString().split('T')[0];

      // Check if event already exists for this date
      const existing = await WowEvent.findOne({
        where: {
          guild_id: GUILD_ID,
          status: 'open',
          when_iso: {
            [require('sequelize').Op.between]: [
              new Date(raidDate.getFullYear(), raidDate.getMonth(), raidDate.getDate()),
              new Date(raidDate.getFullYear(), raidDate.getMonth(), raidDate.getDate() + 1),
            ],
          },
        },
      });

      if (existing) {
        logger.info(`RaidBookingScheduler: event already exists for ${dateStr}, skipping.`);
        continue;
      }

      const id = shortId();
      const dayName = dayNames[day];
      const note = `Incursione Normal — 8 boss, final boss Ula'tek.\n` +
        `**Orario:** ${cfg.raid_time} - 24:00\n` +
        `**Difficoltà:** Normal\n` +
        `**Requisiti:** ilvl ${cfg.min_ilvl}+, Discord + mic, consumabili, addon (DBM/WA/Details)\n` +
        `**Iscrizione:** seleziona la tua classe dal menu sotto.`;

      const evt = await WowEvent.create({
        id,
        guild_id: GUILD_ID,
        title: `${raidName} — ${dayName}`,
        note,
        when_iso: raidDate.toISOString(),
        slots: 10,
        status: 'open',
        created_by: client.user.id,
        channel_id: channel.id,
        message_id: null,
      });

      const embed = spedizione.buildEventEmbed(evt, []);
      const classMenu = spedizione.buildClassMenu(evt.id);
      const unsubBtn = spedizione.buildUnsubButton(evt.id, false);

      const sent = await channel.send({
        content: '@everyone',
        embeds: [embed],
        components: [classMenu, unsubBtn],
      });

      await evt.update({ message_id: sent.id });
      created.push({ day: dayName, date: dateStr, id });

      logger.info(`RaidBookingScheduler: created ${raidName} — ${dayName} (${dateStr}) ID: ${id}`);
    }

    if (created.length > 0) {
      logger.info(`RaidBookingScheduler: created ${created.length} raid bookings for next week.`);
    }
  } catch (err) {
    logger.error(`RaidBookingScheduler error: ${err.message}`);
  }
}

function start(client) {
  // Run daily at 09:00
  _task = cron.schedule('0 9 * * *', () => {
    createWeeklyBookings(client).catch((err) => logger.error(`RaidBookingScheduler: ${err.message}`));
  });
  logger.info('RaidBookingScheduler started (daily 09:00).');
}

function stop() {
  if (_task) _task.stop();
}

module.exports = { start, stop, createWeeklyBookings };
