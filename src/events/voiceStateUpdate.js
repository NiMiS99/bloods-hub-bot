// src/events/voiceStateUpdate.js
const AdvancedLogger = require('../services/advancedLogger');
const TempVoiceService = require('../services/tempVoiceService');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    await AdvancedLogger.onVoiceStateUpdate(oldState, newState);
    await TempVoiceService.handleVoiceStateUpdate(oldState, newState, client);
  },
};
