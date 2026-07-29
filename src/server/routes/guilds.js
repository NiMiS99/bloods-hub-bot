// src/server/routes/guilds.js
const express = require('express');
const { User, Game, UserGame } = require('../../db');
const { Op: _Op } = require('sequelize');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { recordAudit: _recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId — guild overview
  router.get('/:guildId', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const gid = req.guild.id;
      const [totalUsers, legacyUsers, totalMessages, totalVoice, games, memberships, warnings, events, badges] = await Promise.all([
        User.count({ where: { guild_id: gid } }),
        User.count({ where: { guild_id: gid, legacy_wow_member: true } }),
        User.sum('total_messages', { where: { guild_id: gid } }) || 0,
        User.sum('total_voice_seconds', { where: { guild_id: gid } }) || 0,
        Game.count({ where: { is_active: true } }),
        UserGame.count({ where: { guild_id: gid } }),
        require('../../db').Warning.count({ where: { guild_id: gid } }),
        require('../../db').CommunityEvent.count({ where: { guild_id: gid, is_active: true } }),
        require('../../db').UserBadge.count({ where: { guild_id: gid } }),
      ]);

      res.json({
        id: req.guild.id,
        name: req.guild.name,
        icon: req.guild.iconURL({ size: 256 }),
        memberCount: req.guild.memberCount,
        stats: {
          totalUsers,
          legacyUsers,
          totalMessages,
          totalVoice,
          games,
          memberships,
          warnings,
          events,
          badges,
        },
        botInGuild: true,
      });
    } catch (err) {
      console.error('Guild overview error:', err);
      res.status(500).json({ error: 'Errore recupero dati server' });
    }
  });

  // GET /api/guilds/:guildId/resolve-users?ids=123,456,789
  // Resolves Discord user IDs to { id, username, avatar } for dashboard display.
  router.get('/:guildId/resolve-users', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100);
      if (ids.length === 0) return res.json({ users: [] });

      const results = [];
      for (const id of ids) {
        try {
          const member = await req.guild.members.fetch(id).catch(() => null);
          if (member) {
            results.push({
              id,
              username: member.user.username,
              displayName: member.displayName,
              avatar: member.user.displayAvatarURL({ size: 64 }),
            });
          } else {
            // Try fetching as a user (not a member)
            const user = await client.users.fetch(id).catch(() => null);
            if (user) {
              results.push({ id, username: user.username, displayName: user.username, avatar: user.displayAvatarURL({ size: 64 }) });
            } else {
              results.push({ id, username: null, displayName: null, avatar: null });
            }
          }
        } catch {
          results.push({ id, username: null, displayName: null, avatar: null });
        }
      }
      res.json({ users: results });
    } catch (_err) {
      res.status(500).json({ error: 'Errore risoluzione utenti' });
    }
  });

  return router;
};
