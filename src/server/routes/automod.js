// src/server/routes/automod.js
const express = require('express');
const { AutomodRule } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin, requireAdminOnly } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/automod/rules
  router.get('/:guildId/automod/rules', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const rules = await AutomodRule.findAll({
        where: { guild_id: req.guild.id },
        order: [['rule_type', 'ASC']],
        raw: true,
      });

      const enriched = rules.map((r) => ({
        id: r.id,
        ruleType: r.rule_type,
        isEnabled: r.is_enabled,
        threshold: r.threshold,
        words: r.words || [],
        action: r.action,
        muteDuration: r.mute_duration,
        exemptRoles: r.exempt_roles || [],
      }));

      res.json({ rules: enriched });
    } catch {
      res.status(500).json({ error: 'Errore recupero regole automod' });
    }
  });

  // POST /api/guilds/:guildId/automod/rules
  router.post('/:guildId/automod/rules', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const { ruleType, action, threshold, words, muteDuration, exemptRoles } = req.body;
      if (!ruleType) return res.status(400).json({ error: 'Tipo regola obbligatorio' });

      const rule = await AutomodRule.create({
        guild_id: req.guild.id,
        rule_type: ruleType,
        is_enabled: true,
        threshold: threshold || null,
        words: words || null,
        action: action || 'delete',
        mute_duration: muteDuration || null,
        exempt_roles: exemptRoles || null,
      });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.automod.add',
        targetType: 'automod_rule',
        targetId: rule.id.toString(),
        details: { rule_type: ruleType, action },
      });

      res.json({ success: true, rule });
    } catch {
      res.status(500).json({ error: 'Errore creazione regola' });
    }
  });

  // PUT /api/guilds/:guildId/automod/rules/:id
  router.put('/:guildId/automod/rules/:id', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const rule = await AutomodRule.findOne({
        where: { id: req.params.id, guild_id: req.guild.id },
      });
      if (!rule) return res.status(404).json({ error: 'Regola non trovata' });

      const { isEnabled, threshold, words, action, muteDuration, exemptRoles } = req.body;
      const updates = {};
      if (isEnabled !== undefined) updates.is_enabled = isEnabled;
      if (threshold !== undefined) updates.threshold = threshold;
      if (words !== undefined) updates.words = words;
      if (action !== undefined) updates.action = action;
      if (muteDuration !== undefined) updates.mute_duration = muteDuration;
      if (exemptRoles !== undefined) updates.exempt_roles = exemptRoles;

      await rule.update(updates);

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.automod.update',
        targetType: 'automod_rule',
        targetId: req.params.id,
        details: updates,
      });

      res.json({ success: true, rule });
    } catch {
      res.status(500).json({ error: 'Errore aggiornamento regola' });
    }
  });

  // DELETE /api/guilds/:guildId/automod/rules/:id
  router.delete('/:guildId/automod/rules/:id', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const rule = await AutomodRule.findOne({
        where: { id: req.params.id, guild_id: req.guild.id },
      });
      if (!rule) return res.status(404).json({ error: 'Regola non trovata' });

      await rule.destroy();

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.automod.delete',
        targetType: 'automod_rule',
        targetId: req.params.id,
        details: { rule_type: rule.rule_type },
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Errore eliminazione regola' });
    }
  });

  return router;
};
