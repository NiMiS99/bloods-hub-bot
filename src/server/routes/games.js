// src/server/routes/games.js
const express = require('express');
const { Game, UserGame } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin, requireAdminOnly } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/games — list all games
  router.get('/:guildId/games', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const games = await Game.findAll({ order: [['name', 'ASC']] });
      const result = await Promise.all(games.map(async (g) => {
        const memberCount = await UserGame.count({ where: { game_id: g.id, guild_id: req.guild.id } });
        return {
          id: g.id,
          code: g.code,
          name: g.name,
          isActive: g.is_active,
          apiProvider: g.api_provider,
          roleId: g.role_id,
          categoryId: g.category_id,
          iconUrl: g.icon_url,
          colorHex: g.color_hex,
          memberCount,
        };
      }));
      res.json({ games: result });
    } catch {
      res.status(500).json({ error: 'Errore recupero giochi' });
    }
  });

  // POST /api/guilds/:guildId/games — add game
  router.post('/:guildId/games', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const { code, name, apiProvider, colorHex } = req.body;
      if (!code || !name) return res.status(400).json({ error: 'Codice e nome sono obbligatori' });

      const existing = await Game.findOne({ where: { code } });
      if (existing) return res.status(409).json({ error: 'Gioco con questo codice già esiste' });

      const game = await Game.create({ code, name, api_provider: apiProvider || 'manual', color_hex: colorHex || null, is_active: true });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.game.add',
        targetType: 'game',
        targetId: game.id,
        details: { code, name },
      });

      res.json({ success: true, game });
    } catch {
      res.status(500).json({ error: 'Errore creazione gioco' });
    }
  });

  // PUT /api/guilds/:guildId/games/:code — update game
  router.put('/:guildId/games/:code', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const game = await Game.findOne({ where: { code: req.params.code } });
      if (!game) return res.status(404).json({ error: 'Gioco non trovato' });

      const { name, isActive, colorHex, iconUrl } = req.body;
      await game.update({
        ...(name && { name }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(colorHex !== undefined && { color_hex: colorHex }),
        ...(iconUrl !== undefined && { icon_url: iconUrl }),
      });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.game.update',
        targetType: 'game',
        targetId: game.id,
        details: { code: game.code, changes: req.body },
      });

      res.json({ success: true, game });
    } catch {
      res.status(500).json({ error: 'Errore aggiornamento gioco' });
    }
  });

  // DELETE /api/guilds/:guildId/games/:code — deactivate game
  router.delete('/:guildId/games/:code', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const game = await Game.findOne({ where: { code: req.params.code } });
      if (!game) return res.status(404).json({ error: 'Gioco non trovato' });

      await game.update({ is_active: false });

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.game.remove',
        targetType: 'game',
        targetId: game.id,
        details: { code: game.code, name: game.name },
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Errore rimozione gioco' });
    }
  });

  return router;
};
