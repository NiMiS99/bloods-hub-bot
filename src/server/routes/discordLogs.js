// src/server/routes/discordLogs.js
const express = require('express');
const { DiscordLog } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { fetchMembersBatch } = require('../../utils/discordFetch');
const logger = require('../../utils/logger');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/discord-logs
  router.get('/:guildId/discord-logs', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 1000);
      const limit = 50;
      const offset = (page - 1) * limit;
      const eventType = req.query.type;

      const where = { guild_id: req.guild.id };
      if (eventType && eventType !== 'all') where.event_type = eventType;

      const { count, rows } = await DiscordLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        raw: true,
      });

      // Batch fetch all member IDs (actors + targets)
      const allIds = [];
      for (const r of rows) {
        if (r.actor_id) allIds.push(r.actor_id);
        if (r.target_id) allIds.push(r.target_id);
      }
      const memberMap = await fetchMembersBatch(req.guild, allIds);

      const enriched = rows.map((r) => {
        const actorM = r.actor_id ? memberMap.get(r.actor_id) : null;
        const targetM = r.target_id ? memberMap.get(r.target_id) : null;
        return {
          id: r.id,
          eventType: r.event_type,
          actorId: r.actor_id,
          actorName: actorM?.user?.username || null,
          targetId: r.target_id,
          targetName: targetM?.user?.username || null,
          targetType: r.target_type,
          details: r.details,
          createdAt: r.created_at,
        };
      });

      res.json({
        logs: enriched,
        pagination: {
          page,
          totalPages: Math.ceil(count / limit),
          total: count,
        },
      });
    } catch (err) {
      logger.error('Discord logs route:', err.message);
      res.status(500).json({ error: 'Errore recupero log Discord' });
    }
  });

  return router;
};
