// src/events/messageUpdate.js
const AdvancedLogger = require('../services/advancedLogger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, _client) {
    await AdvancedLogger.onMessageUpdate(oldMessage, newMessage);
  },
};
