// src/server/routes/memberArea.js
// Member-level endpoints (any guild member, no admin required).
// Powers the public site's personal area (/area).
const express = require('express');
const { Op } = require('sequelize');
const {
  User, UserBadge, CommunityEvent, EventParticipant, Game,
  BpUser, BpLootHistory, RaidEligibility, RaidConfig, RaidAttendance, ExternalAccount,
} = require('../../db');
const { requireAuth, requireGuildMember } = require('../middleware/auth');
const { xpToNextLevel, xpForLevel } = require('../../services/xpService');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/me/profile — personal profile, stats, badges, rank
  router.get('/:guildId/me/profile', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const gid = req.guild.id;
      const uid = req.user.id;

      const user = await User.findOne({ where: { guild_id: gid, user_id: uid }, raw: true });
      const badges = await UserBadge.findAll({
        where: { guild_id: gid, user_id: uid },
        order: [['awarded_at', 'DESC']],
        raw: true,
      });

      const xp = user?.xp || 0;
      const { currentLevel, nextLevel, progress } = xpToNextLevel(xp);
      const xpForCurrent = xpForLevel(currentLevel);
      const xpForNext = xpForLevel(nextLevel);
      const xpRange = xpForNext - xpForCurrent;
      const progressPct = xpRange > 0 ? Math.round((progress / xpRange) * 100) : 0;

      // XP rank position
      const higher = await User.count({ where: { guild_id: gid, xp: { [Op.gt]: xp } } });

      // Admin/mod flags (to show dashboard link in the UI)
      const { PermissionsBitField } = require('discord.js');
      const config = require('../../config');
      const m = req.member;
      const isAdmin =
        m.permissions.has(PermissionsBitField.Flags.Administrator) ||
        m.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        (config.admin?.roleId && m.roles.cache.has(config.admin.roleId));
      const isMod =
        isAdmin ||
        m.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
        m.permissions.has(PermissionsBitField.Flags.ManageMessages);

      const roles = m.roles.cache
        .filter((r) => r.id !== gid)
        .sort((a, b) => b.position - a.position)
        .slice(0, 10)
        .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));

      res.json({
        userId: uid,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.displayAvatarURL({ size: 128 }),
        joinedDiscordAt: user?.joined_discord_at || null,
        level: currentLevel,
        xp,
        xpForCurrent,
        xpForNext,
        progressPct,
        rank: higher + 1,
        totalMessages: user?.total_messages || 0,
        totalVoiceSeconds: user?.total_voice_seconds || 0,
        badges: badges.map((b) => ({ code: b.badge_code, awardedAt: b.awarded_at })),
        roles,
        isAdmin,
        isMod,
      });
    } catch {
      res.status(500).json({ error: 'Errore recupero profilo' });
    }
  });

  // GET /api/guilds/:guildId/me/events — upcoming events with joined flag
  router.get('/:guildId/me/events', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const gid = req.guild.id;
      const events = await CommunityEvent.findAll({
        where: {
          guild_id: gid,
          is_active: true,
          scheduled_at: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) },
        },
        order: [['scheduled_at', 'ASC']],
        limit: 20,
      });

      const result = await Promise.all(
        events.map(async (e) => {
          const [count, joined, game] = await Promise.all([
            EventParticipant.count({ where: { event_id: e.id } }),
            EventParticipant.findOne({ where: { event_id: e.id, user_id: req.user.id } }),
            e.game_id ? Game.findByPk(e.game_id) : null,
          ]);
          return {
            id: e.id,
            name: e.name,
            description: e.description,
            scheduledAt: e.scheduled_at,
            durationMinutes: e.duration_minutes,
            game: game ? { name: game.name, code: game.code } : null,
            participantCount: count,
            joined: !!joined,
          };
        })
      );

      res.json({ events: result });
    } catch {
      res.status(500).json({ error: 'Errore recupero eventi' });
    }
  });

  // POST /api/guilds/:guildId/me/events/:eventId/join
  router.post('/:guildId/me/events/:eventId/join', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const event = await CommunityEvent.findByPk(req.params.eventId);
      if (!event || event.guild_id !== req.guild.id || !event.is_active) {
        return res.status(404).json({ error: 'Evento non trovato' });
      }
      await EventParticipant.findOrCreate({
        where: { event_id: event.id, user_id: req.user.id },
        defaults: { guild_id: req.guild.id },
      });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Errore iscrizione evento' });
    }
  });

  // POST /api/guilds/:guildId/me/events/:eventId/leave
  router.post('/:guildId/me/events/:eventId/leave', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      await EventParticipant.destroy({
        where: { event_id: req.params.eventId, user_id: req.user.id },
      });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Errore annullamento iscrizione' });
    }
  });

  // GET /api/guilds/:guildId/me/bp — personal BP balance and recent loot
  router.get('/:guildId/me/bp', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const gid = req.guild.id;
      const uid = req.user.id;

      const bpUser = await BpUser.findOne({
        where: { guild_id: gid, user_id: uid },
        raw: true,
      });

      const recentLoot = await BpLootHistory.findAll({
        where: { guild_id: gid, winner_id: uid },
        order: [['closed_at', 'DESC']],
        limit: 10,
        raw: true,
      });

      // BP rank
      const myDkp = bpUser?.dkp || 0;
      const higherCount = await BpUser.count({
        where: { guild_id: gid, dkp: { [Op.gt]: myDkp } },
      });

      res.json({
        dkp: myDkp,
        rank: higherCount + 1,
        recentLoot: recentLoot.map((l) => ({
          id: l.id,
          itemName: l.item_name,
          boss: l.boss,
          bid: l.bid,
          roll: l.roll,
          score: l.score,
          participants: l.participants,
          closedAt: l.closed_at,
        })),
      });
    } catch {
      res.status(500).json({ error: 'Errore recupero BP' });
    }
  });

  // GET /api/guilds/:guildId/me/raid — personal raid eligibility and attendance
  router.get('/:guildId/me/raid', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const gid = req.guild.id;
      const uid = req.user.id;

      const config = await RaidConfig.findOne({ where: { guild_id: gid }, raw: true });
      const eligibility = await RaidEligibility.findOne({
        where: { guild_id: gid, user_id: uid },
        raw: true,
      });

      // Attendance stats (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const attendedCount = await RaidAttendance.count({
        where: {
          guild_id: gid,
          user_id: uid,
          attended: true,
          raid_date: { [Op.gte]: thirtyDaysAgo },
        },
      });

      const totalRaids = await RaidAttendance.count({
        where: {
          guild_id: gid,
          raid_date: { [Op.gte]: thirtyDaysAgo },
        },
        distinct: true,
        col: 'raid_date',
      });

      // Linked WoW accounts
      const wowAccounts = await ExternalAccount.findAll({
        where: { guild_id: gid, user_id: uid, provider: 'battlenet' },
        raw: true,
      });

      // Parse failure_reasons JSON (raw: true skips Sequelize getters)
      let failureReasons = [];
      if (eligibility?.failure_reasons) {
        if (Array.isArray(eligibility.failure_reasons)) {
          failureReasons = eligibility.failure_reasons;
        } else if (typeof eligibility.failure_reasons === 'string') {
          try { failureReasons = JSON.parse(eligibility.failure_reasons); } catch { failureReasons = []; }
        }
      }

      res.json({
        configured: !!config,
        requirements: config
          ? {
              minIlvl: config.min_ilvl,
              minAttendance: config.min_raid_attendance,
              requireTierBonus: !!config.require_tier_bonus,
              requireAchievement: config.require_achievement,
            }
          : null,
        eligibility: eligibility
          ? {
              isEligible: !!eligibility.is_eligible,
              ilvlEquipped: eligibility.ilvl_equipped,
              ilvlAvg: eligibility.ilvl_avg,
              hasTierBonus: !!eligibility.has_tier_bonus,
              tierBonusCount: eligibility.tier_bonus_count,
              hasAchievement: !!eligibility.has_achievement,
              raidAttendance: eligibility.raid_attendance,
              failureReasons,
              lastCheckedAt: eligibility.last_checked_at,
              characterName: eligibility.character_name,
              characterClass: eligibility.character_class,
              battleTag: eligibility.battle_tag,
            }
          : null,
        attendance: {
          attendedLast30: attendedCount,
          totalRaidsLast30: totalRaids,
          attendancePct: totalRaids > 0 ? Math.round((attendedCount / totalRaids) * 100) : 0,
        },
        wowAccounts: wowAccounts.map((a) => ({
          externalId: a.external_id,
          region: a.region,
          verified: a.verified,
        })),
      });
    } catch {
      res.status(500).json({ error: 'Errore recupero info raid' });
    }
  });

  return router;
};
