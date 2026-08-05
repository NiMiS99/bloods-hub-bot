// src/server/routes/community.js
// Routes for suggestions, polls, LFG, XP events, tournaments, game nights, tags.
const express = require('express');
const {
  Suggestion, Poll, LfgSession, Tournament, GameNight, Tag, Guild,
  Birthday, Reminder, Starboard,
} = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');
const { recordAudit } = require('../../utils/auditLog');
const XpEventService = require('../../services/xpEventService');
const _logger = require('../../utils/logger');
const { Op: _Op } = require('sequelize');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // ============ SUGGESTIONS ============

  router.get('/:guildId/suggestions', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), validatePagination, async (req, res) => {
    try {
      const where = { guild_id: req.guild.id };
      if (req.query.status && req.query.status !== 'all') where.status = req.query.status;
      const { count, rows } = await Suggestion.findAndCountAll({
        where, order: [['created_at', 'DESC']],
        limit: req.query.limit, offset: (req.query.page - 1) * req.query.limit, raw: true,
      });
      res.json({
        suggestions: rows,
        pagination: { page: req.query.page, totalPages: Math.ceil(count / req.query.limit), total: count },
      });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  router.put('/:guildId/suggestions/:id/status', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { status } = req.body;
      if (!['open', 'approved', 'rejected', 'implemented'].includes(status)) {
        return res.status(400).json({ error: 'Status non valido' });
      }
      await Suggestion.update({ status }, { where: { id: req.params.id, guild_id: req.guild.id } });
      await recordAudit({ guildId: req.guild.id, actorId: req.user.id, action: 'dashboard.suggestion.status', targetType: 'suggestion', targetId: req.params.id, details: { status } });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ POLLS ============

  router.get('/:guildId/polls', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), validatePagination, async (req, res) => {
    try {
      const { count, rows } = await Poll.findAndCountAll({
        where: { guild_id: req.guild.id }, order: [['created_at', 'DESC']],
        limit: req.query.limit, offset: (req.query.page - 1) * req.query.limit, raw: true,
      });
      res.json({
        polls: rows,
        pagination: { page: req.query.page, totalPages: Math.ceil(count / req.query.limit), total: count },
      });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  router.post('/:guildId/polls/:id/close', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { closePoll } = require('../../commands/poll');
      await closePoll(client, req.guild.id, req.params.id);
      await recordAudit({ guildId: req.guild.id, actorId: req.user.id, action: 'dashboard.poll.close', targetType: 'poll', targetId: req.params.id });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ LFG SESSIONS ============

  router.get('/:guildId/lfg-sessions', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const sessions = await LfgSession.findAll({
        where: { guild_id: req.guild.id, status: ['open', 'full'] },
        order: [['created_at', 'DESC']], raw: true,
      });
      res.json({ sessions });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ XP EVENTS ============

  router.get('/:guildId/xp-events', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const active = XpEventService.getActiveEvent();
      const guild = await Guild.findOne({ where: { guild_id: req.guild.id } });
      const settings = guild?.settings || {};
      const events = settings.xpEventHistory || [];
      res.json({ events, active });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  router.post('/:guildId/xp-events', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { multiplier, durationHours } = req.body;
      if (!multiplier || !durationHours) return res.status(400).json({ error: 'multiplier e durationHours obbligatori' });
      await XpEventService.startEvent(req.guild.id, multiplier, durationHours, req.user.id);
      await recordAudit({ guildId: req.guild.id, actorId: req.user.id, action: 'dashboard.xpevent.start', targetType: 'guild', details: { multiplier, durationHours } });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  router.post('/:guildId/xp-events/stop', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      await XpEventService.stopEvent(req.guild.id);
      await recordAudit({ guildId: req.guild.id, actorId: req.user.id, action: 'dashboard.xpevent.stop', targetType: 'guild' });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ TOURNAMENTS ============

  router.get('/:guildId/tournaments', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const tournaments = await Tournament.findAll({
        where: { guild_id: req.guild.id }, order: [['created_at', 'DESC']], raw: true,
      });
      res.json({ tournaments });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ GAME NIGHTS ============

  router.get('/:guildId/game-nights', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const nights = await GameNight.findAll({
        where: { guild_id: req.guild.id }, order: [['created_at', 'DESC']], raw: true,
      });
      res.json({ gameNights: nights });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ TAGS ============

  router.get('/:guildId/tags', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const tags = await Tag.findAll({
        where: { guild_id: req.guild.id, is_active: true }, order: [['name', 'ASC']], raw: true,
      });
      res.json({ tags });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ BIRTHDAYS ============

  router.get('/:guildId/birthdays', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const birthdays = await Birthday.findAll({
        where: { guild_id: req.guild.id },
        order: [['month', 'ASC'], ['day', 'ASC']],
        raw: true,
      });
      res.json({ birthdays });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ REMINDERS ============

  router.get('/:guildId/reminders', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), validatePagination, async (req, res) => {
    try {
      const { count, rows } = await Reminder.findAndCountAll({
        where: { guild_id: req.guild.id },
        order: [['remind_at', 'ASC']],
        limit: req.query.limit,
        offset: req.query.offset,
        raw: true,
      });
      res.json({ reminders: rows, total: count });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  router.delete('/:guildId/reminders/:id', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const deleted = await Reminder.destroy({ where: { id: req.params.id, guild_id: req.guild.id } });
      if (!deleted) return res.status(404).json({ error: 'Promemoria non trovato' });
      await recordAudit({ guildId: req.guild.id, actorId: req.user.id, action: 'dashboard.reminder.delete', targetType: 'reminder', targetId: req.params.id });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  // ============ STARBOARD ============

  router.get('/:guildId/starboard', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), validatePagination, async (req, res) => {
    try {
      const { count, rows } = await Starboard.findAndCountAll({
        where: { guild_id: req.guild.id },
        order: [['star_count', 'DESC']],
        limit: req.query.limit,
        offset: req.query.offset,
        raw: true,
      });
      res.json({ starboard: rows, total: count });
    } catch { res.status(500).json({ error: 'Errore' }); }
  });

  return router;
};
