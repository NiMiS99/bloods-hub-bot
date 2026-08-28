// src/services/dynamicStatusService.js
// Rotates bot presence status every 60s with dynamic info:
// member count, online count, BP leaderboard, raid schedule, voice activity.
const { ActivityType } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const ROTATION_INTERVAL_MS = 60_000;

let _interval = null;
let _index = 0;

async function getStatuses(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return [{ text: 'la community Bloods', type: ActivityType.Watching }];

  const memberCount = guild.memberCount;
  const onlineCount = guild.presences.cache.filter((p) => p.status !== 'offline').size;
  const voiceCount = [...guild.voiceStates.cache.values()].filter((vs) => vs.channelId && !vs.member?.user?.bot).length;

  const statuses = [
    { text: `${memberCount} membri`, type: ActivityType.Watching },
    { text: `${onlineCount} online`, type: ActivityType.Watching },
    { text: `${voiceCount} in vocale`, type: ActivityType.Listening },
    { text: 'bloodswow.it', type: ActivityType.Playing },
    { text: '/help per comandi', type: ActivityType.Listening },
  ];

  // Check if today is a raid day
  const now = new Date();
  const day = now.getDay();
  const raidDays = [2, 4]; // Mar=2, Gio=4
  if (raidDays.includes(day)) {
    const hour = now.getHours();
    if (hour >= 20 && hour <= 23) {
      statuses.unshift({ text: 'Raid in corso!', type: ActivityType.Competing });
    } else if (hour < 21) {
      statuses.unshift({ text: 'Raid stasera 21:00', type: ActivityType.Competing });
    }
  }

  // PvP Wednesday
  if (day === 3 && now.getHours() >= 20) {
    statuses.unshift({ text: 'PvP Night in corso!', type: ActivityType.Competing });
  }

  return statuses;
}

async function rotate(client) {
  try {
    if (!client?.user) return;
    const statuses = await getStatuses(client);
    const status = statuses[_index % statuses.length];
    _index++;
    await client.user.setActivity(status.text, { type: status.type });
  } catch (err) {
    logger.warn(`DynamicStatus: rotation error: ${err.message}`);
  }
}

function start(client) {
  _interval = setInterval(() => rotate(client).catch(() => {}), ROTATION_INTERVAL_MS);
  setTimeout(() => rotate(client).catch(() => {}), 10000);
  logger.info('DynamicStatusService: started (rotation every 60s).');
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  logger.info('DynamicStatusService: stopped.');
}

module.exports = { start, stop };
