// src/utils/auditLog.js
// Helper to write audit log entries for admin actions.
const { AuditLog } = require('../db');
const logger = require('./logger');

/**
 * Record an admin action in the audit_log table.
 * @param {object} params
 * @param {string} params.guildId - Guild ID
 * @param {string} params.actorId - User ID who performed the action
 * @param {string} params.action - Action name (e.g. 'game.add', 'game.remove', 'setup.run')
 * @param {string} [params.targetType] - Type of target (e.g. 'game', 'channel', 'role')
 * @param {string} [params.targetId] - ID of the target
 * @param {object} [params.details] - Additional JSON details
 */
async function recordAudit({ guildId, actorId, action, targetType, targetId, details }) {
  try {
    await AuditLog.create({
      guild_id: guildId,
      actor_id: actorId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      details: details ?? null,
    });
  } catch (err) {
    logger.error(`Failed to write audit log: ${err.message}`);
  }
}

module.exports = { recordAudit };
