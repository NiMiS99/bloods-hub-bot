// src/events/messageReactionRemove.js
// Handles reaction role removal and starboard count update.
const logger = require('../utils/logger');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user, client) {
    if (user.bot) return;

    if (reaction.partial) {
      try { await reaction.fetch(); } catch (e) { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch (e) { return; }
    }

    // --- Reaction Roles ---
    try {
      const reactionRoleService = client.reactionRoleService || require('../services/reactionRoleService');
      await reactionRoleService.handleReactionRemove(reaction, user, client);
    } catch (e) {
      logger.warn(`Reaction role remove failed: ${e.message}`);
    }

    // --- Starboard ---
    try {
      const starboardService = client.starboardService || require('../services/starboardService');
      await starboardService.handleStarRemove(reaction, user, client);
    } catch (e) {
      logger.warn(`Starboard remove failed: ${e.message}`);
    }
  },
};
