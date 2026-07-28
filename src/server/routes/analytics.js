// src/server/routes/analytics.js
const express = require('express');
const { User, ActivityLog, UserGame, Game } = require('../../db');
const { Op, Sequelize } = require('sequelize');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/analytics — analytics data for charts
  router.get('/:guildId/analytics', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const gid = req.guild.id;
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
      const startDate = new Date(Date.now() - days * 86400 * 1000);

      // Activity over time (messages + voice per day)
      const activityData = await ActivityLog.findAll({
        attributes: [
          [Sequelize.fn('DATE', Sequelize.col('occurred_at')), 'date'],
          'event_type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        where: {
          guild_id: gid,
          occurred_at: { [Op.gte]: startDate },
        },
        group: ['date', 'event_type'],
        order: [['date', 'ASC']],
        raw: true,
      });

      // Format for charts
      const activityByDay = {};
      activityData.forEach((r) => {
        if (!activityByDay[r.date]) activityByDay[r.date] = { date: r.date, messages: 0, voice: 0 };
        if (r.event_type === 'message') activityByDay[r.date].messages = parseInt(r.count);
        if (r.event_type === 'voice_seconds') activityByDay[r.date].voice = parseInt(r.count);
      });

      // Member growth (users created per day)
      const memberGrowth = await User.findAll({
        attributes: [
          [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
          [Sequelize.fn('COUNT', Sequelize.col('user_id')), 'count'],
        ],
        where: { guild_id: gid, created_at: { [Op.gte]: startDate } },
        group: ['date'],
        order: [['date', 'ASC']],
        raw: true,
      });

      // Game distribution
      const gameDistribution = await UserGame.findAll({
        attributes: ['game_id', [Sequelize.fn('COUNT', Sequelize.col('user_id')), 'count']],
        where: { guild_id: gid },
        group: ['game_id'],
        include: [{ model: Game, attributes: ['name', 'code', 'color_hex'] }],
        raw: true,
      });

      // Top 10 by XP
      const topXp = await User.findAll({
        where: { guild_id: gid },
        order: [['xp', 'DESC']],
        limit: 10,
        raw: true,
      });

      // Level distribution
      const levelDistribution = await User.findAll({
        attributes: ['level', [Sequelize.fn('COUNT', Sequelize.col('user_id')), 'count']],
        where: { guild_id: gid },
        group: ['level'],
        order: [['level', 'ASC']],
        raw: true,
      });

      res.json({
        activity: Object.values(activityByDay),
        memberGrowth: memberGrowth.map((r) => ({ date: r.date, count: parseInt(r.count) })),
        gameDistribution: gameDistribution.map((g) => ({
          game: g['Game.name'],
          code: g['Game.code'],
          count: parseInt(g.count),
          color: g['Game.color_hex'],
        })),
        topXp: topXp.map((u, i) => ({
          rank: i + 1,
          userId: u.user_id,
          username: u.username,
          xp: u.xp,
          level: u.level,
        })),
        levelDistribution: levelDistribution.map((l) => ({
          level: l.level,
          count: parseInt(l.count),
        })),
      });
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: 'Errore recupero analytics' });
    }
  });

  return router;
};
