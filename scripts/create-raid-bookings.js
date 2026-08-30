// scripts/create-raid-bookings.js
// Creates spedizione events for The Venomous Abyss (Normal) on Wed + Thu
// and posts interactive signup panels to the raid announcements channel.
const { Client, GatewayIntentBits } = require('discord.js');
const { WowEvent, WowEventSignup } = require('../src/db');
const config = require('../src/config');
const spedizione = require('../src/commands/spedizione');
const logger = require('../src/utils/logger');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const ANNOUNCE_CHANNEL_ID = '1530567858243895437'; // from RaidConfig

const RAID_TITLE = 'The Venomous Abyss (Normal)';
const RAID_NOTE = 'Raid Normal — 8 boss, final boss Ula\'tek.\n' +
  '**Orario:** 21:00 - 24:00\n' +
  '**Raid days:** Mercoledì e Giovedì\n' +
  '**Difficoltà:** Normal\n' +
  '**Requisiti:** ilvl 273+, Discord + mic, consumabili, addon (DBM/WA/Details)\n' +
  '**Iscrizione:** seleziona la tua classe dal menu sotto. Tutti possono iscriversi, anche senza ruolo Progress.';

function getNextWeekday(weekday, hour = 21, minute = 0) {
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

async function main() {
  const token = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    console.error('No Discord token found in env');
    process.exit(1);
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  await client.login(token);
  logger.info('Bot logged in for raid booking creation');

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error('Guild not found');
    process.exit(1);
  }

  const channel = await guild.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.error('Announce channel not found:', ANNOUNCE_CHANNEL_ID);
    process.exit(1);
  }
  console.log('Channel found:', channel.name);

  // Calculate next Wed (3) and Thu (4)
  const wedDate = getNextWeekday(3, 21, 0);
  const thuDate = getNextWeekday(4, 21, 0);

  const raids = [
    { date: wedDate, title: `${RAID_TITLE} — Mercoledì` },
    { date: thuDate, title: `${RAID_TITLE} — Giovedì` },
  ];

  for (const raid of raids) {
    const id = shortId();
    const whenIso = raid.date.toISOString();

    const evt = await WowEvent.create({
      id,
      guild_id: GUILD_ID,
      title: raid.title,
      note: RAID_NOTE,
      when_iso: whenIso,
      slots: 25,
      status: 'open',
      created_by: client.user.id,
      channel_id: ANNOUNCE_CHANNEL_ID,
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

    const dateStr = raid.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    console.log(`Created raid booking: ${raid.title} on ${dateStr} — ID: ${id} — Message: ${sent.url}`);
  }

  console.log('\nDone! 2 raid bookings created and posted to Discord.');
  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
