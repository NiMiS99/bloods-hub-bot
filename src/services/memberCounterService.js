// src/services/memberCounterService.js
// Live member counter in a voice channel. Updates every 5 minutes.
const { ChannelType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

const _GUILD_ID = config.discord.guildId || '1010226759817515018';
const COUNTER_CHANNEL_NAME = 'Membri Totali';
const COUNTER_CATEGORY_ID = '1530567851839062077'; // Area Iniziale
const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let _interval = null;
let _client = null;

/**
 * Find or create the member counter voice channel.
 */
async function getCounterChannel(guild) {
  let channel = [...guild.channels.cache.values()].find(
    (c) => c.name.startsWith('Membri') && c.type === ChannelType.GuildVoice
  );
  if (!channel) {
    channel = await guild.channels.create({
      name: COUNTER_CHANNEL_NAME,
      type: ChannelType.GuildVoice,
      parent: COUNTER_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: ['Connect'],
          allow: ['ViewChannel'],
        },
      ],
    });
    logger.info(`MemberCounter: created "${COUNTER_CHANNEL_NAME}" channel.`);
  }
  return channel;
}

/**
 * Update the counter channel name with current member count for ALL guilds.
 */
async function updateCounter(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const channel = await getCounterChannel(guild);
      const count = guild.memberCount;
      await channel.setName(`Membri Totali: ${count}`).catch(() => {});
    } catch (err) {
      logger.debug(`MemberCounter update failed for ${guild.id}: ${err.message}`);
    }
  }
}

/**
 * Start the member counter service.
 */
function start(client) {
  _client = client;
  // Update immediately
  updateCounter(client);
  // Then every 5 minutes
  _interval = setInterval(() => updateCounter(client), UPDATE_INTERVAL_MS);
  logger.info('MemberCounter: started (updates every 5 min).');
}

/**
 * Stop the member counter service.
 */
function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  logger.info('MemberCounter: stopped.');
}

module.exports = { start, stop, updateCounter };
