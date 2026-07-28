// src/server/routes/raid.js
// API routes for raid config, eligibility, and attendance.
const express = require('express');
const { RaidConfig, RaidEligibility, RaidAttendance, User, ExternalAccount } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/raid/config — raid configuration
  router.get('/:guildId/raid/config', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const cfg = await RaidConfig.findOne({ where: { guild_id: req.guild.id } });
      res.json({
        config: cfg ? {
          minIlvl: cfg.min_ilvl,
          minRaidAttendance: cfg.min_raid_attendance,
          requireTierBonus: cfg.require_tier_bonus,
          requireAchievement: cfg.require_achievement,
          raidDays: cfg.raid_days,
          raidTime: cfg.raid_time,
          raidName: cfg.raid_name,
          eligibleRoleId: cfg.eligible_role_id,
          announceChannelId: cfg.announce_channel_id,
        } : null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/guilds/:guildId/raid/config — update raid configuration (admin only)
  router.put('/:guildId/raid/config', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { minIlvl, minRaidAttendance, requireTierBonus, requireAchievement, raidDays, raidTime, raidName, eligibleRoleId, announceChannelId } = req.body;
      const updates = {};
      if (minIlvl !== undefined) updates.min_ilvl = minIlvl;
      if (minRaidAttendance !== undefined) updates.min_raid_attendance = minRaidAttendance;
      if (requireTierBonus !== undefined) updates.require_tier_bonus = requireTierBonus;
      if (requireAchievement !== undefined) updates.require_achievement = requireAchievement;
      if (raidDays !== undefined) updates.raid_days = raidDays;
      if (raidTime !== undefined) updates.raid_time = raidTime;
      if (raidName !== undefined) updates.raid_name = raidName;
      if (eligibleRoleId !== undefined) updates.eligible_role_id = eligibleRoleId;
      if (announceChannelId !== undefined) updates.announce_channel_id = announceChannelId;

      const [cfg] = await RaidConfig.findOrCreate({
        where: { guild_id: req.guild.id },
        defaults: { guild_id: req.guild.id, ...updates },
      });
      if (!cfg.isNewRecord) {
        await cfg.update(updates);
      }

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.raid.config.update',
        targetType: 'raid_config',
        targetId: req.guild.id,
        details: updates,
      }).catch(() => {});

      res.json({ config: { minIlvl: cfg.min_ilvl, minRaidAttendance: cfg.min_raid_attendance, requireTierBonus: cfg.require_tier_bonus, requireAchievement: cfg.require_achievement, raidDays: cfg.raid_days, raidTime: cfg.raid_time, raidName: cfg.raid_name, eligibleRoleId: cfg.eligible_role_id, announceChannelId: cfg.announce_channel_id } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/raid/eligibility — all eligibility records
  router.get('/:guildId/raid/eligibility', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const records = await RaidEligibility.findAll({
        where: { guild_id: req.guild.id },
        include: [{ model: User, attributes: ['username', 'user_id'] }],
        order: [['is_eligible', 'DESC'], ['updated_at', 'DESC']],
      });
      res.json({
        eligibility: records.map((r) => ({
          userId: r.user_id,
          username: r.User?.username || 'Sconosciuto',
          isEligible: r.is_eligible,
          ilvl: r.ilvl,
          tierBonus: r.tier_bonus,
          hasAchievement: r.has_achievement,
          attendance: r.attendance_count,
          failureReasons: r.failure_reasons,
          lastChecked: r.updated_at,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/raid/stats — raid stats summary
  router.get('/:guildId/raid/stats', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const cfg = await RaidConfig.findOne({ where: { guild_id: req.guild.id } });
      const eligible = await RaidEligibility.count({ where: { guild_id: req.guild.id, is_eligible: true } });
      const ineligible = await RaidEligibility.count({ where: { guild_id: req.guild.id, is_eligible: false } });
      const totalAttendance = await RaidAttendance.count({ where: { guild_id: req.guild.id } });
      res.json({
        stats: {
          eligible,
          ineligible,
          totalAttendance,
          minIlvl: cfg?.min_ilvl || 0,
          raidDays: cfg?.raid_days || [3, 4],
          raidTime: cfg?.raid_time || '21:00',
          requireTierBonus: cfg?.require_tier_bonus || false,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
