// src/server/routes/feedback.js
// API routes for admin feedback tickets.
const express = require('express');
const { Feedback } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/feedback — list tickets
  router.get('/:guildId/feedback', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const status = req.query.status;
      const where = { guild_id: req.guild.id };
      if (status && status !== 'all') {
        where.status = status;
      }
      const tickets = await Feedback.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 100,
      });
      res.json({ tickets });
    } catch (err) {
      res.status(500).json({ error: 'Errore recupero feedback' });
    }
  });

  // GET /api/guilds/:guildId/feedback/stats — statistics
  router.get('/:guildId/feedback/stats', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const open = await Feedback.count({ where: { guild_id: req.guild.id, status: 'open' } });
      const approved = await Feedback.count({ where: { guild_id: req.guild.id, status: 'approved' } });
      const inProgress = await Feedback.count({ where: { guild_id: req.guild.id, status: 'in_progress' } });
      const resolved = await Feedback.count({ where: { guild_id: req.guild.id, status: 'resolved' } });
      const closed = await Feedback.count({ where: { guild_id: req.guild.id, status: 'closed' } });
      res.json({ total: open + approved + inProgress + resolved + closed, open, approved, inProgress, resolved, closed });
    } catch (err) {
      res.status(500).json({ error: 'Errore statistiche feedback' });
    }
  });

  // GET /api/guilds/:guildId/feedback/:id — single ticket
  router.get('/:guildId/feedback/:id', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const ticket = await Feedback.findByPk(req.params.id);
      if (!ticket || ticket.guild_id !== req.guild.id) {
        return res.status(404).json({ error: 'Ticket non trovato' });
      }
      res.json({ ticket });
    } catch (err) {
      res.status(500).json({ error: 'Errore recupero ticket' });
    }
  });

  // PUT /api/guilds/:guildId/feedback/:id/status — update status
  router.put('/:guildId/feedback/:id/status', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['open', 'approved', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status non valido' });
      }
      const ticket = await Feedback.findByPk(req.params.id);
      if (!ticket || ticket.guild_id !== req.guild.id) {
        return res.status(404).json({ error: 'Ticket non trovato' });
      }
      ticket.status = status;
      if (status === 'resolved' || status === 'closed') {
        ticket.resolved_at = new Date();
        ticket.resolved_by = req.user.id;
      }
      await ticket.save();
      res.json({ ticket });
    } catch (err) {
      res.status(500).json({ error: 'Errore aggiornamento ticket' });
    }
  });

  return router;
};
