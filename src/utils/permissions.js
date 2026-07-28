// src/utils/permissions.js
// Permission helpers for admin commands.
// Supports both Discord Administrator permission and the "Bloods Admin" role.
const { PermissionsBitField } = require('discord.js');
const config = require('../config');

/**
 * Check if a member can use bot admin commands.
 * Returns true if ANY of:
 *   - Member has Administrator permission (Discord native)
 *   - Member has ManageGuild permission
 *   - Member has the "Bloods Admin" role (config.admin.roleId)
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isAdmin(member) {
  if (!member) return false;
  // Discord Administrator or ManageGuild always pass.
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
  // Check for the Bloods Admin role.
  const adminRoleId = config.admin?.roleId;
  if (adminRoleId && member.roles.cache.has(adminRoleId)) return true;
  return false;
}

/**
 * Check if a member can use moderation commands (warn, mute, kick, ban).
 * Requires specific permissions OR the Bloods Admin role.
 * @param {GuildMember} member
 * @param {string[]} requiredPerms - Array of PermissionsBitField.Flags
 * @returns {boolean}
 */
function canModerate(member, requiredPerms = []) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const adminRoleId = config.admin?.roleId;
  if (adminRoleId && member.roles.cache.has(adminRoleId)) return true;
  return requiredPerms.every((p) => member.permissions.has(p));
}

module.exports = { isAdmin, canModerate };
