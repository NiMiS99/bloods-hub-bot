// src/server/routes/auditLog.js
const express = require('express');
const { AuditLog } = require('../../db');
const { Op } = require('sequelize');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/audit-log — admin activity log
  router.get('/:guildId/audit-log', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 1000);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
      const offset = (page - 1) * limit;
      const action = req.query.action;
      const actorId = req.query.actorId;

      const where = { guild_id: req.guild.id };
      if (action) where.action = { [Op.like]: `%${action}%` };
      if (actorId) where.actor_id = actorId;

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        raw: true,
      });

      // Batch fetch Discord members (avoid N+1)
      const actorIds = [...new Set(rows.map((r) => r.actor_id))];
      const memberCache = new Map();
      for (const aid of actorIds) {
        const m = await req.guild.members.fetch(aid, { force: false }).catch(() => null);
        if (m) memberCache.set(aid, m);
      }

      const logs = rows.map((r) => {
        const actor = memberCache.get(r.actor_id);
        return {
          id: r.id,
          action: r.action,
          actorId: r.actor_id,
          actorName: actor?.user?.username || 'Sconosciuto',
          actorAvatar: actor?.user?.displayAvatarURL({ size: 32 }) || null,
          targetType: r.target_type,
          targetId: r.target_id,
          details: r.details,
          createdAt: r.created_at,
        };
      });

      res.json({ logs, total: count, page, totalPages: Math.ceil(count / limit) });
    } catch (err) {
      res.status(500).json({ error: 'Errore recupero audit log' });
    }
  });

  return router;
};
