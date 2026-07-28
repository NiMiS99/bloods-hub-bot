// src/server/routes/customCommands.js
const express = require('express');
const { CustomCommand } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');
const { recordAudit } = require('../../utils/auditLog');
const logger = require('../../utils/logger');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/custom-commands
  router.get('/:guildId/custom-commands', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), validatePagination, async (req, res) => {
    try {
      const { count, rows } = await CustomCommand.findAndCountAll({
        where: { guild_id: req.guild.id },
        order: [['name', 'ASC']],
        limit: req.query.limit,
        offset: (req.query.page - 1) * req.query.limit,
        raw: true,
      });
      res.json({
        commands: rows,
        pagination: { page: req.query.page, totalPages: Math.ceil(count / req.query.limit), total: count },
      });
    } catch (err) {
      logger.error('Custom commands list:', err.message);
      res.status(500).json({ error: 'Errore recupero comandi personalizzati' });
    }
  });

  // POST /api/guilds/:guildId/custom-commands
  router.post('/:guildId/custom-commands', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { name, response, embedTitle, embedImage } = req.body;
      if (!name || !response) {
        return res.status(400).json({ error: 'name e response sono obbligatori' });
      }

      const cleanName = String(name).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (cleanName.length < 1 || cleanName.length > 32) {
        return res.status(400).json({ error: 'Nome non valido (1-32 caratteri alfanumerici, _ e -)' });
      }

      const existing = await CustomCommand.findOne({ where: { guild_id: req.guild.id, name: cleanName } });
      if (existing) {
        await existing.update({
          response,
          embed_title: embedTitle || null,
          embed_image: embedImage || null,
        });
        await recordAudit({
          guildId: req.guild.id,
          actorId: req.user.id,
          action: 'dashboard.cmd.update',
          targetType: 'custom_command',
          targetId: cleanName,
        });
        return res.json({ command: existing });
      }

      const cmd = await CustomCommand.create({
        guild_id: req.guild.id,
        name: cleanName,
        response,
        embed_title: embedTitle || null,
        embed_image: embedImage || null,
        created_by: req.user.id,
      });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.cmd.create',
        targetType: 'custom_command',
        targetId: cleanName,
      });

      res.json({ command: cmd });
    } catch (err) {
      logger.error('Custom command create:', err.message);
      res.status(500).json({ error: 'Errore creazione comando' });
    }
  });

  // DELETE /api/guilds/:guildId/custom-commands/:id
  router.delete('/:guildId/custom-commands/:id', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const cmd = await CustomCommand.findByPk(req.params.id);
      if (!cmd || cmd.guild_id !== req.guild.id) {
        return res.status(404).json({ error: 'Comando non trovato' });
      }
      await cmd.destroy();

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.cmd.delete',
        targetType: 'custom_command',
        targetId: cmd.name,
      });

      res.json({ success: true });
    } catch (err) {
      logger.error('Custom command delete:', err.message);
      res.status(500).json({ error: 'Errore eliminazione comando' });
    }
  });

  return router;
};
