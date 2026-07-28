// src/server/routes/giveaway.js
const express = require('express');
const { Giveaway } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');
const { recordAudit } = require('../../utils/auditLog');
const GiveawayService = require('../../services/giveawayService');
const logger = require('../../utils/logger');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/giveaways — list giveaways
  router.get('/:guildId/giveaways', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), validatePagination, async (req, res) => {
    try {
      const { count, rows } = await Giveaway.findAndCountAll({
        where: { guild_id: req.guild.id },
        order: [['id', 'DESC']],
        limit: req.query.limit,
        offset: (req.query.page - 1) * req.query.limit,
        raw: true,
      });
      res.json({
        giveaways: rows,
        pagination: { page: req.query.page, totalPages: Math.ceil(count / req.query.limit), total: count },
      });
    } catch (err) {
      logger.error('Giveaway list:', err.message);
      res.status(500).json({ error: 'Errore recupero giveaway' });
    }
  });

  // POST /api/guilds/:guildId/giveaways — create giveaway
  router.post('/:guildId/giveaways', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { channelId, prize, title, description, durationMinutes, winnerCount, requiredRoleId } = req.body;
      if (!channelId || !prize || !durationMinutes) {
        return res.status(400).json({ error: 'channelId, prize e durationMinutes sono obbligatori' });
      }

      const endsAt = new Date(Date.now() + Math.min(Math.max(parseInt(durationMinutes), 1), 43200) * 60 * 1000);
      const giveaway = await Giveaway.create({
        guild_id: req.guild.id,
        channel_id: channelId,
        title: title || `Vinco: ${prize}`,
        description: description || null,
        prize,
        winner_count: Math.min(Math.max(parseInt(winnerCount) || 1, 1), 20),
        required_role_id: requiredRoleId || null,
        ends_at: endsAt,
        hosted_by: req.user.id,
      });

      // Post the giveaway message to the channel
      const guild = client.guilds.cache.get(String(req.guild.id));
      if (guild) {
        const channel = guild.channels.cache.get(String(channelId));
        if (channel) {
          const payload = GiveawayService.buildGiveawayMessage(giveaway, 0);
          const sent = await channel.send(payload);
          await giveaway.update({ message_id: sent.id });
        }
      }

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.giveaway.create',
        targetType: 'giveaway',
        targetId: String(giveaway.id),
        details: { prize, winnerCount: giveaway.winner_count },
      });

      res.json({ giveaway });
    } catch (err) {
      logger.error('Giveaway create:', err.message);
      res.status(500).json({ error: 'Errore creazione giveaway' });
    }
  });

  // POST /api/guilds/:guildId/giveaways/:id/end — end giveaway early
  router.post('/:guildId/giveaways/:id/end', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const giveaway = await Giveaway.findByPk(req.params.id);
      if (!giveaway || giveaway.guild_id !== req.guild.id) {
        return res.status(404).json({ error: 'Giveaway non trovato' });
      }
      if (giveaway.is_ended) {
        return res.status(400).json({ error: 'Giveaway già terminato' });
      }

      await GiveawayService.endGiveaway(giveaway.id, client);

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.giveaway.end',
        targetType: 'giveaway',
        targetId: String(giveaway.id),
      });

      res.json({ success: true });
    } catch (err) {
      logger.error('Giveaway end:', err.message);
      res.status(500).json({ error: 'Errore terminazione giveaway' });
    }
  });

  return router;
};
