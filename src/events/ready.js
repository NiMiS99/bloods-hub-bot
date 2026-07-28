// src/events/ready.js
const logger = require('../utils/logger');
const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag} in ${client.guilds.cache.size} guild(s).`);
    client.user.setActivity('the Bloods community', { type: ActivityType.Watching });

    // Ensure every guild has a config row.
    const { Guild } = require('../db');
    for (const guild of client.guilds.cache.values()) {
      await Guild.findOrCreate({
        where: { guild_id: guild.id },
        defaults: { guild_id: guild.id, name: guild.name },
      });
    }
  },
};
