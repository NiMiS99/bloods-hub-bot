// src/server/routes/events.js
const express = require('express');
const { CommunityEvent, EventParticipant, Game } = require('../../db');
const { Op: _Op } = require('sequelize');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/events — list events
  router.get('/:guildId/events', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const events = await CommunityEvent.findAll({
        where: { guild_id: req.guild.id },
        order: [['scheduled_at', 'DESC']],
        limit: 50,
      });

      const result = await Promise.all(events.map(async (e) => {
        const count = await EventParticipant.count({ where: { event_id: e.id } });
        const game = e.game_id ? await Game.findByPk(e.game_id) : null;
        return {
          id: e.id,
          name: e.name,
          description: e.description,
          scheduledAt: e.scheduled_at,
          durationMinutes: e.duration_minutes,
          isActive: e.is_active,
          game: game ? { name: game.name, code: game.code } : null,
          participantCount: count,
          createdBy: e.created_by,
          createdAt: e.created_at,
        };
      }));

      res.json({ events: result });
    } catch {
      res.status(500).json({ error: 'Errore recupero eventi' });
    }
  });

  // POST /api/guilds/:guildId/events — create event
  router.post('/:guildId/events', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { name, description, scheduledAt, durationMinutes, gameCode } = req.body;
      if (!name || !scheduledAt) return res.status(400).json({ error: 'Nome e data sono obbligatori' });

      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) return res.status(400).json({ error: 'Data non valida' });

      let gameId = null;
      if (gameCode) {
        const game = await Game.findOne({ where: { code: gameCode } });
        if (game) gameId = game.id;
      }

      const event = await CommunityEvent.create({
        guild_id: req.guild.id,
        game_id: gameId,
        name,
        description,
        scheduled_at: date,
        duration_minutes: durationMinutes || 60,
        created_by: req.user.id,
      });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.event.create',
        targetType: 'event',
        targetId: event.id,
        details: { name, scheduledAt },
      });

      res.json({ success: true, event });
    } catch {
      res.status(500).json({ error: 'Errore creazione evento' });
    }
  });

  // DELETE /api/guilds/:guildId/events/:eventId — delete event
  router.delete('/:guildId/events/:eventId', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const event = await CommunityEvent.findByPk(req.params.eventId);
      if (!event || event.guild_id !== req.guild.id) return res.status(404).json({ error: 'Evento non trovato' });

      await event.update({ is_active: false });
      await EventParticipant.destroy({ where: { event_id: event.id } });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.event.delete',
        targetType: 'event',
        targetId: event.id,
        details: { name: event.name },
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Errore eliminazione evento' });
    }
  });

  return router;
};
