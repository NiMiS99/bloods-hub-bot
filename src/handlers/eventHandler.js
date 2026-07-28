// src/handlers/eventHandler.js
// Dynamically loads event listeners from src/events/<file>.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class EventHandler {
  constructor(eventsDir, client) {
    this.eventsDir = eventsDir;
    this.client = client;
  }

  load() {
    if (!fs.existsSync(this.eventsDir)) return;
    const files = fs.readdirSync(this.eventsDir).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      try {
        delete require.cache[require.resolve(path.join(this.eventsDir, file))];
        const event = require(path.join(this.eventsDir, file));
        if (!event.name || typeof event.execute !== 'function') {
          logger.warn(`Skipping invalid event file: ${file}`);
          continue;
        }
        const handler = (...args) => event.execute(...args, this.client);
        if (event.once) this.client.once(event.name, handler);
        else this.client.on(event.name, handler);
      } catch (err) {
        logger.error(`Failed to load event ${file}:`, err);
      }
    }
    logger.info(`Loaded event listeners.`);
  }
}

module.exports = EventHandler;
