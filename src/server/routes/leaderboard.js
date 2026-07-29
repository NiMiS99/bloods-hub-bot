// src/server/routes/leaderboard.js
const express = require('express');
const { User, LeaderboardCache } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/leaderboard — leaderboard data
  router.get('/:guildId/leaderboard', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const metric = req.query.metric || 'xp';
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);

      let entries;
      if (metric === 'xp' || metric === 'total_messages' || metric === 'total_voice_seconds') {
        const users = await User.findAll({
          where: { guild_id: req.guild.id },
          order: [[metric, 'DESC']],
          limit,
          raw: true,
        });
        // Batch fetch members
        const { fetchMembersBatch } = require('../../utils/discordFetch');
        const memberMap = await fetchMembersBatch(req.guild, users.map((u) => u.user_id));

        entries = users.map((u, i) => {
          const member = memberMap.get(u.user_id);
          return {
            rank: i + 1,
            userId: u.user_id,
            username: member?.user?.username || u.username,
            avatar: member?.user?.displayAvatarURL({ size: 32 }) || null,
            value: u[metric],
          };
        });
      } else {
        // Game-specific leaderboard from cache
        const cached = await LeaderboardCache.findOne({
          where: { guild_id: req.guild.id, metric, scope: 'guild' },
          order: [['generated_at', 'DESC']],
        });
        if (cached && Array.isArray(cached.payload)) {
          entries = cached.payload.slice(0, limit);
        } else {
          entries = [];
        }
      }

      res.json({ metric, entries });
    } catch (_err) {
      res.status(500).json({ error: 'Errore recupero classifica' });
    }
  });

  return router;
};
