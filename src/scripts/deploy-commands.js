// src/scripts/deploy-commands.js
// Registers slash commands with Discord (guild-scoped if GUILD_ID is set,
// otherwise global — note: global commands can take up to 1h to propagate).
const { REST, Routes } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');
const CommandHandler = require('../handlers/commandHandler');
const path = require('path');

(async () => {
  const handler = new CommandHandler(path.join(__dirname, '..', 'commands'));
  handler.load();
  const commands = handler.toJSON();
  if (commands.length === 0) {
    logger.warn('No commands to register.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.discord.token);
  try {
    logger.info(`Registering ${commands.length} commands...`);
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      logger.info(`Registered guild commands for ${config.discord.guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
      logger.info('Registered global commands.');
    }
  } catch (err) {
    logger.error('Command registration failed:', err);
    process.exit(1);
  }
})();
