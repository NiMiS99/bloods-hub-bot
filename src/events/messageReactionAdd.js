// src/events/messageReactionAdd.js
// Handles reaction role assignment and starboard tracking.
const logger = require('../utils/logger');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    // Ignore bot reactions
    if (user.bot) return;

    // Partial reactions need fetching
    if (reaction.partial) {
      try { await reaction.fetch(); } catch (_e) { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch (_e) { return; }
    }

    // --- Reaction Roles ---
    try {
      const reactionRoleService = client.reactionRoleService || require('../services/reactionRoleService');
      await reactionRoleService.handleReactionAdd(reaction, user, client);
    } catch (e) {
      logger.warn(`Reaction role add failed: ${e.message}`);
    }

    // --- Starboard ---
    try {
      const starboardService = client.starboardService || require('../services/starboardService');
      await starboardService.handleStarAdd(reaction, user, client);
    } catch (e) {
      logger.warn(`Starboard add failed: ${e.message}`);
    }
  },
};
