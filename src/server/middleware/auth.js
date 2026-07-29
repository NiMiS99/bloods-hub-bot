// src/server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { Guild: _Guild } = require('../../db');

/**
 * Verify JWT token from cookie or Authorization header.
 * Attaches req.user = { id, username, avatar, discriminator } if valid.
 */
function requireAuth(jwtSecret) {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Non autenticato' });
      }
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }
  };
}

/**
 * Require the user to be a member of the guild specified in :guildId.
 * Attaches req.guild (Discord guild) and req.member (Discord guild member).
 */
function requireGuildMember(client) {
  return async (req, res, next) => {
    try {
      const guildId = req.params.guildId;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Server non trovato' });
      }

      const member = await guild.members.fetch(req.user.id, { force: false }).catch(() => null);
      if (!member) {
        return res.status(403).json({ error: 'Non sei un membro di questo server' });
      }

      req.guild = guild;
      req.member = member;
      next();
    } catch {
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  };
}

/**
 * Require the user to have admin permissions in the guild.
 * Uses the same logic as isAdmin() from utils/permissions.js.
 */
function requireAdmin() {
  return async (req, res, next) => {
    try {
      const { PermissionsBitField } = require('discord.js');
      const config = require('../../config');

      // Check Administrator permission
      if (req.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        req.isAdmin = true;
        return next();
      }

      // Check ManageGuild permission
      if (req.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        req.isAdmin = true;
        return next();
      }

      // Check Bloods Admin role
      const adminRoleId = config.admin?.roleId;
      if (adminRoleId && req.member.roles.cache.has(adminRoleId)) {
        req.isAdmin = true;
        return next();
      }

      // Check moderator permissions for mod-only routes
      const modPerms = [
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.BanMembers,
      ];
      const hasModPerms = modPerms.some((p) => req.member.permissions.has(p));
      if (hasModPerms) {
        req.isMod = true;
        return next();
      }

      return res.status(403).json({ error: 'Permessi insufficienti' });
    } catch {
      return res.status(500).json({ error: 'Errore verifica permessi' });
    }
  };
}

/**
 * Require admin specifically (not just mod).
 */
function requireAdminOnly() {
  return async (req, res, next) => {
    if (req.isAdmin) return next();
    return res.status(403).json({ error: 'Richiesti permessi amministrativi' });
  };
}

module.exports = { requireAuth, requireGuildMember, requireAdmin, requireAdminOnly };
