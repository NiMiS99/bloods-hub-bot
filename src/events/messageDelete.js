// src/events/messageDelete.js
const AdvancedLogger = require('../services/advancedLogger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    await AdvancedLogger.onMessageDelete(message);
  },
};
