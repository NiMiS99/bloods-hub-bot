// src/server/routes/moderation.js
const express = require('express');
const { Warning, AuditLog } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');
const { PermissionsBitField } = require('discord.js');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/warnings — list all warnings with pagination
  router.get('/:guildId/warnings', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 1000);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
      const offset = (page - 1) * limit;

      const { count, rows } = await Warning.findAndCountAll({
        where: { guild_id: req.guild.id },
        order: [['created_at', 'DESC']],
        limit,
        offset,
        raw: true,
      });

      // Batch fetch all members (users + issuers)
      const { fetchMembersBatch } = require('../../utils/discordFetch');
      const allIds = [];
      for (const w of rows) {
        if (w.user_id) allIds.push(w.user_id);
        if (w.issued_by) allIds.push(w.issued_by);
      }
      const memberMap = await fetchMembersBatch(req.guild, allIds);

      const warnings = rows.map((w) => {
        const member = w.user_id ? memberMap.get(w.user_id) : null;
        const issuer = w.issued_by ? memberMap.get(w.issued_by) : null;
        return {
          id: w.id,
          userId: w.user_id,
          username: member?.user?.username || 'Sconosciuto',
          avatar: member?.user?.displayAvatarURL({ size: 32 }) || null,
          reason: w.reason,
          severity: w.severity,
          issuedBy: w.issued_by,
          issuedByUsername: issuer?.user?.username || 'Sconosciuto',
          createdAt: w.created_at,
        };
      });

      res.json({ warnings, total: count, page, totalPages: Math.ceil(count / limit) });
    } catch (err) {
      res.status(500).json({ error: 'Errore recupero warning' });
    }
  });

  // POST /api/guilds/:guildId/warnings — create warning from dashboard
  router.post('/:guildId/warnings', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { userId, reason, severity } = req.body;
      if (!userId || !reason) return res.status(400).json({ error: 'UserId e reason sono obbligatori' });

      const warning = await Warning.create({
        user_id: userId,
        guild_id: req.guild.id,
        issued_by: req.user.id,
        reason,
        severity: severity || 'low',
      });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.mod.warn',
        targetType: 'user',
        targetId: userId,
        details: { reason, severity, warningId: warning.id },
      });

      // Try to DM the user
      try {
        const member = await req.guild.members.fetch(userId);
        await member.send({ content: `⚠️ Hai ricevuto un warning in **${req.guild.name}**.\nMotivo: ${reason}\nSeverità: ${severity || 'low'}` });
      } catch {}

      res.json({ success: true, warning });
    } catch (err) {
      res.status(500).json({ error: 'Errore creazione warning' });
    }
  });

  // POST /api/guilds/:guildId/mute — mute user from dashboard
  router.post('/:guildId/mute', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { userId, durationMinutes, reason } = req.body;
      if (!userId || !durationMinutes) return res.status(400).json({ error: 'UserId e durata sono obbligatori' });

      const member = await req.guild.members.fetch(userId, { force: false }).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Membro non trovato' });
      if (!member.moderatable) return res.status(403).json({ error: 'Non posso mutare questo membro' });

      await member.timeout(durationMinutes * 60 * 1000, reason || 'Muted via dashboard');

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.mod.mute',
        targetType: 'user',
        targetId: userId,
        details: { durationMinutes, reason },
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore mute' });
    }
  });

  // POST /api/guilds/:guildId/unmute — unmute user
  router.post('/:guildId/unmute', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { userId } = req.body;
      const member = await req.guild.members.fetch(userId, { force: false }).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Membro non trovato' });

      await member.timeout(null, 'Unmuted via dashboard');

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.mod.unmute',
        targetType: 'user',
        targetId: userId,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore unmute' });
    }
  });

  // POST /api/guilds/:guildId/kick — kick user
  router.post('/:guildId/kick', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { userId, reason } = req.body;
      const member = await req.guild.members.fetch(userId, { force: false }).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Membro non trovato' });
      if (!member.kickable) return res.status(403).json({ error: 'Non posso kickare questo membro' });

      await member.kick(reason || 'Kicked via dashboard');

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.mod.kick',
        targetType: 'user',
        targetId: userId,
        details: { reason },
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore kick' });
    }
  });

  // POST /api/guilds/:guildId/ban — ban user
  router.post('/:guildId/ban', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const { userId, reason, deleteMessageDays } = req.body;
      const member = await req.guild.members.fetch(userId, { force: false }).catch(() => null);
      if (member && !member.bannable) return res.status(403).json({ error: 'Non posso bannare questo membro' });

      await req.guild.bans.create(userId, {
        reason: reason || 'Banned via dashboard',
        deleteMessageSeconds: (deleteMessageDays || 0) * 86400,
      });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.mod.ban',
        targetType: 'user',
        targetId: userId,
        details: { reason, deleteMessageDays },
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore ban' });
    }
  });

  return router;
};
