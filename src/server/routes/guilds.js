// src/server/routes/guilds.js
const express = require('express');
const { User, Game, UserGame, ActivityLog, Guild } = require('../../db');
const { Op } = require('sequelize');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');

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

  return router;
};
