// src/events/guildMemberUpdate.js
const AdvancedLogger = require('../services/advancedLogger');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    await AdvancedLogger.onGuildMemberUpdate(oldMember, newMember);
  },
};
