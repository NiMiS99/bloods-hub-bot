// src/handlers/commandHandler.js
// Dynamically loads slash commands from src/commands/**/<file>.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class CommandHandler {
  constructor(commandsDir) {
    this.commands = new Map();
    this.commandsDir = commandsDir;
  }

  load() {
    const entries = fs.readdirSync(this.commandsDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(this.commandsDir, entry.name);
      if (entry.isDirectory()) {
        // Recurse one level (category folders)
        const sub = fs.readdirSync(fullPath).filter((f) => f.endsWith('.js'));
        for (const file of sub) this._loadFile(path.join(fullPath, file));
      } else if (entry.name.endsWith('.js')) {
        this._loadFile(fullPath);
      }
    }
    logger.info(`Loaded ${this.commands.size} slash commands.`);
    return this.commands;
  }

  _loadFile(file) {
    try {
      delete require.cache[require.resolve(file)];
      const cmd = require(file);
      if (!cmd.data || !cmd.execute) {
        logger.warn(`Skipping invalid command file: ${file}`);
        return;
      }
      this.commands.set(cmd.data.name, cmd);
    } catch (err) {
      logger.error(`Failed to load command ${file}:`, err);
    }
  }

  get(name) {
    return this.commands.get(name);
  }

  all() {
    return [...this.commands.values()];
  }

  toJSON() {
    return this.all().map((c) => c.data.toJSON());
  }
}

module.exports = CommandHandler;
