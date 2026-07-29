// src/server/routes/levelRewards.js
const express = require('express');
const { LevelReward } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin, requireAdminOnly } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/level-rewards
  router.get('/:guildId/level-rewards', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const rewards = await LevelReward.findAll({
        where: { guild_id: req.guild.id },
        order: [['level', 'ASC']],
        raw: true,
      });

      // Enrich with role names
      const enriched = rewards.map((r) => {
        const role = req.guild.roles.cache.get(r.role_id);
        return {
          id: r.id,
          level: r.level,
          roleId: r.role_id,
          roleName: role?.name || 'Ruolo non trovato',
          message: r.message,
        };
      });

      res.json({ rewards: enriched });
    } catch (_err) {
      res.status(500).json({ error: 'Errore recupero ricompense' });
    }
  });

  // POST /api/guilds/:guildId/level-rewards
  router.post('/:guildId/level-rewards', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const { level, roleId, message } = req.body;
      if (!level || level < 1) return res.status(400).json({ error: 'Livello non valido' });

      const reward = await LevelReward.create({
        guild_id: req.guild.id,
        level,
        role_id: roleId || null,
        message: message || null,
      });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.levelreward.add',
        targetType: 'level_reward',
        targetId: reward.id.toString(),
        details: { level, role_id: roleId },
      });

      res.json({ success: true, reward });
    } catch (_err) {
      res.status(500).json({ error: 'Errore creazione ricompensa' });
    }
  });

  // DELETE /api/guilds/:guildId/level-rewards/:id
  router.delete('/:guildId/level-rewards/:id', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const reward = await LevelReward.findOne({
        where: { id: req.params.id, guild_id: req.guild.id },
      });
      if (!reward) return res.status(404).json({ error: 'Ricompensa non trovata' });

      await reward.destroy();

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.levelreward.delete',
        targetType: 'level_reward',
        targetId: req.params.id,
        details: { level: reward.level },
      });

      res.json({ success: true });
    } catch (_err) {
      res.status(500).json({ error: 'Errore eliminazione ricompensa' });
    }
  });

  return router;
};
