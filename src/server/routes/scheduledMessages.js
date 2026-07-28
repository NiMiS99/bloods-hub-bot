// src/server/routes/scheduledMessages.js
const express = require('express');
const { ScheduledMessage } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { validatePagination, isValidCron } = require('../middleware/validate');
const { recordAudit } = require('../../utils/auditLog');
const ScheduledMessageService = require('../../services/scheduledMessageService');
const logger = require('../../utils/logger');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/scheduled-messages
  router.get('/:guildId/scheduled-messages', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), validatePagination, async (req, res) => {
    try {
      const { count, rows } = await ScheduledMessage.findAndCountAll({
        where: { guild_id: req.guild.id },
        order: [['id', 'ASC']],
        limit: req.query.limit,
        offset: (req.query.page - 1) * req.query.limit,
        raw: true,
      });
      res.json({
        messages: rows,
        pagination: { page: req.query.page, totalPages: Math.ceil(count / req.query.limit), total: count },
      });
    } catch (err) {
      logger.error('Scheduled messages list:', err.message);
      res.status(500).json({ error: 'Errore recupero messaggi programmati' });
    }
  });

  // POST /api/guilds/:guildId/scheduled-messages
  router.post('/:guildId/scheduled-messages', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { channelId, content, embedTitle, embedImage, cronExpr } = req.body;
      if (!channelId || !content || !cronExpr) {
        return res.status(400).json({ error: 'channelId, content e cronExpr sono obbligatori' });
      }
      if (!isValidCron(cronExpr)) {
        return res.status(400).json({ error: 'Espressione cron non valida' });
      }

      const msg = await ScheduledMessage.create({
        guild_id: req.guild.id,
        channel_id: channelId,
        content,
        embed_title: embedTitle || null,
        embed_image: embedImage || null,
        cron_expr: cronExpr,
        created_by: req.user.id,
      });

      await ScheduledMessageService.startTask(msg, client);

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.schedule.create',
        targetType: 'scheduled_message',
        targetId: String(msg.id),
        details: { channel: channelId, cron: cronExpr },
      });

      res.json({ message: msg });
    } catch (err) {
      logger.error('Scheduled message create:', err.message);
      res.status(500).json({ error: 'Errore creazione messaggio programmato' });
    }
  });

  // PUT /api/guilds/:guildId/scheduled-messages/:id/toggle
  router.put('/:guildId/scheduled-messages/:id/toggle', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const msg = await ScheduledMessage.findByPk(req.params.id);
      if (!msg || msg.guild_id !== req.guild.id) {
        return res.status(404).json({ error: 'Messaggio non trovato' });
      }
      const newState = !msg.is_active;
      await msg.update({ is_active: newState });
      await ScheduledMessageService.reload(msg.id, client);

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.schedule.toggle',
        targetType: 'scheduled_message',
        targetId: String(msg.id),
        details: { active: newState },
      });

      res.json({ success: true, active: newState });
    } catch (err) {
      logger.error('Scheduled message toggle:', err.message);
      res.status(500).json({ error: 'Errore toggle messaggio' });
    }
  });

  // DELETE /api/guilds/:guildId/scheduled-messages/:id
  router.delete('/:guildId/scheduled-messages/:id', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const msg = await ScheduledMessage.findByPk(req.params.id);
      if (!msg || msg.guild_id !== req.guild.id) {
        return res.status(404).json({ error: 'Messaggio non trovato' });
      }
      await msg.update({ is_active: false });
      await ScheduledMessageService.reload(msg.id, client); // stops existing task
      await msg.destroy();

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.schedule.delete',
        targetType: 'scheduled_message',
        targetId: String(req.params.id),
      });

      res.json({ success: true });
    } catch (err) {
      logger.error('Scheduled message delete:', err.message);
      res.status(500).json({ error: 'Errore eliminazione messaggio' });
    }
  });

  return router;
};
