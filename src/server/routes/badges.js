// src/server/routes/badges.js
const express = require('express');
const { UserBadge } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { BADGES } = require('../../services/badgeService');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/badges — badge definitions + stats
  router.get('/:guildId/badges', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const badgeStats = await Promise.all(
        Object.values(BADGES).map(async (b) => {
          const count = await UserBadge.count({
            where: { guild_id: req.guild.id, badge_code: b.code },
          });
          return {
            code: b.code,
            name: b.name,
            icon: b.icon,
            description: b.description,
            awardedCount: count,
          };
        })
      );

      // Recent badge awards
      const recent = await UserBadge.findAll({
        where: { guild_id: req.guild.id },
        order: [['awarded_at', 'DESC']],
        limit: 20,
        raw: true,
      });

      // Batch fetch members
      const { fetchMembersBatch } = require('../../utils/discordFetch');
      const memberMap = await fetchMembersBatch(req.guild, recent.map((r) => r.user_id));

      const recentAwards = recent.map((r) => {
        const member = memberMap.get(r.user_id);
        return {
          userId: r.user_id,
          username: member?.user?.username || 'Sconosciuto',
          avatar: member?.user?.displayAvatarURL({ size: 32 }) || null,
          badgeCode: r.badge_code,
          awardedAt: r.awarded_at,
        };
      });

      res.json({ badges: badgeStats, recentAwards });
    } catch {
      res.status(500).json({ error: 'Errore recupero badge' });
    }
  });

  return router;
};
