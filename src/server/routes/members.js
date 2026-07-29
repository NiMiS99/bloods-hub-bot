// src/server/routes/members.js
const express = require('express');
const { User, UserGame, Game, UserBadge, Warning, ExternalAccount } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const logger = require('../../utils/logger');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/members — list members with pagination
  router.get('/:guildId/members', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 1000);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
      const offset = (page - 1) * limit;
      const search = req.query.search;

      const where = { guild_id: req.guild.id };
      if (search) {
        const { Op } = require('sequelize');
        where.username = { [Op.like]: `%${search}%` };
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        order: [['xp', 'DESC']],
        limit,
        offset,
        raw: true,
      });

      // Batch fetch Discord members (single API call if cached)
      const userIds = rows.map((u) => u.user_id);
      const discordMembers = new Map();
      for (const uid of userIds) {
        const m = await req.guild.members.fetch(uid, { force: false }).catch(() => null);
        if (m) discordMembers.set(uid, m);
      }

      // Batch count badges/warnings/games in parallel
      const [badgeCounts, warningCounts, gameCounts] = await Promise.all([
        UserBadge.findAll({
          where: { user_id: userIds, guild_id: req.guild.id },
          attributes: ['user_id', [require('sequelize').fn('COUNT', '*'), 'count']],
          group: ['user_id'],
          raw: true,
        }),
        Warning.findAll({
          where: { user_id: userIds, guild_id: req.guild.id },
          attributes: ['user_id', [require('sequelize').fn('COUNT', '*'), 'count']],
          group: ['user_id'],
          raw: true,
        }),
        UserGame.findAll({
          where: { user_id: userIds, guild_id: req.guild.id },
          attributes: ['user_id', [require('sequelize').fn('COUNT', '*'), 'count']],
          group: ['user_id'],
          raw: true,
        }),
      ]);

      const badgeMap = new Map(badgeCounts.map((b) => [b.user_id, parseInt(b.count)]));
      const warnMap = new Map(warningCounts.map((w) => [w.user_id, parseInt(w.count)]));
      const gameMap = new Map(gameCounts.map((g) => [g.user_id, parseInt(g.count)]));

      const members = rows.map((u) => {
        const dm = discordMembers.get(u.user_id);
        return {
          id: u.user_id,
          username: u.username,
          discordUsername: dm?.user?.username || u.username,
          avatar: dm?.user?.displayAvatarURL({ size: 64 }) || null,
          xp: u.xp,
          level: u.level,
          totalMessages: u.total_messages,
          totalVoiceSeconds: u.total_voice_seconds,
          legacyWow: u.legacy_wow_member,
          badges: badgeMap.get(u.user_id) || 0,
          warnings: warnMap.get(u.user_id) || 0,
          games: gameMap.get(u.user_id) || 0,
          joinedAt: dm?.joinedAt || null,
          isOnline: dm?.presence?.status || 'offline',
        };
      });

      res.json({
        members,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      });
    } catch (err) {
      logger.error('Members list error:', err.message);
      res.status(500).json({ error: 'Errore recupero membri' });
    }
  });

  // GET /api/guilds/:guildId/members/:userId — member detail
  router.get('/:guildId/members/:userId', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ where: { user_id: userId, guild_id: req.guild.id } });
      if (!user) return res.status(404).json({ error: 'Utente non trovato' });

      const [games, badges, warnings, extAccounts, discordMember] = await Promise.all([
        UserGame.findAll({ where: { user_id: userId, guild_id: req.guild.id }, include: [Game] }),
        UserBadge.findAll({ where: { user_id: userId, guild_id: req.guild.id } }),
        Warning.findAll({ where: { user_id: userId, guild_id: req.guild.id }, order: [['created_at', 'DESC']] }),
        ExternalAccount.findAll({ where: { user_id: userId, guild_id: req.guild.id } }),
        req.guild.members.fetch(userId, { force: false }).catch(() => null),
      ]);

      res.json({
        user: {
          id: user.user_id,
          username: user.username,
          xp: user.xp,
          level: user.level,
          totalMessages: user.total_messages,
          totalVoiceSeconds: user.total_voice_seconds,
          legacyWow: user.legacy_wow_member,
          legacyWowRank: user.legacy_wow_rank,
          joinedDiscordAt: user.joined_discord_at,
          lastSeenAt: user.last_seen_at,
        },
        discord: discordMember ? {
          username: discordMember.user.username,
          displayName: discordMember.displayName,
          avatar: discordMember.user.displayAvatarURL({ size: 256 }),
          joinedAt: discordMember.joinedAt,
          roles: discordMember.roles.cache.map((r) => ({ id: r.id, name: r.name, color: r.color })).filter((r) => r.name !== '@everyone'),
          isBot: discordMember.user.bot,
        } : null,
        games: games.map((ug) => ({ name: ug.Game?.name, code: ug.Game?.code })),
        badges: badges.map((b) => ({ code: b.badge_code, awardedAt: b.awarded_at })),
        warnings: warnings.map((w) => ({
          id: w.id,
          reason: w.reason,
          severity: w.severity,
          issuedBy: w.issued_by,
          createdAt: w.created_at,
        })),
        externalAccounts: extAccounts.map((e) => ({ provider: e.provider, externalId: e.external_id, verified: e.verified })),
      });
    } catch {
      res.status(500).json({ error: 'Errore recupero dettagli membro' });
    }
  });

  return router;
};
