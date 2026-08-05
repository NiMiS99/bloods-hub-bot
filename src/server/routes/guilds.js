// src/server/routes/guilds.js
const express = require('express');
const { User, Game, UserGame } = require('../../db');
const { Op: _Op } = require('sequelize');
const { requireAuth, requireGuildMember, requireAdmin } = require('../middleware/auth');
const { recordAudit: _recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId — guild overview
  router.get('/:guildId', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const gid = req.guild.id;
      const [totalUsers, legacyUsers, totalMessages, totalVoice, games, memberships, warnings, events, badges] = await Promise.all([
        User.count({ where: { guild_id: gid } }),
        User.count({ where: { guild_id: gid, legacy_wow_member: true } }),
        User.sum('total_messages', { where: { guild_id: gid } }) || 0,
        User.sum('total_voice_seconds', { where: { guild_id: gid } }) || 0,
        Game.count({ where: { is_active: true } }),
        UserGame.count({ where: { guild_id: gid } }),
        require('../../db').Warning.count({ where: { guild_id: gid } }),
        require('../../db').CommunityEvent.count({ where: { guild_id: gid, is_active: true } }),
        require('../../db').UserBadge.count({ where: { guild_id: gid } }),
      ]);

      res.json({
        id: req.guild.id,
        name: req.guild.name,
        icon: req.guild.iconURL({ size: 256 }),
        memberCount: req.guild.memberCount,
        stats: {
          totalUsers,
          legacyUsers,
          totalMessages,
          totalVoice,
          games,
          memberships,
          warnings,
          events,
          badges,
        },
        botInGuild: true,
      });
    } catch (err) {
      console.error('Guild overview error:', err);
      res.status(500).json({ error: 'Errore recupero dati server' });
    }
  });

  // GET /api/guilds/:guildId/resolve-users?ids=123,456,789
  // Resolves Discord user IDs to { id, username, avatar } for dashboard display.
  router.get('/:guildId/resolve-users', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100);
      if (ids.length === 0) return res.json({ users: [] });

      const results = [];
      for (const id of ids) {
        try {
          const member = await req.guild.members.fetch(id).catch(() => null);
          if (member) {
            results.push({
              id,
              username: member.user.username,
              displayName: member.displayName,
              avatar: member.user.displayAvatarURL({ size: 64 }),
            });
          } else {
            // Try fetching as a user (not a member)
            const user = await client.users.fetch(id).catch(() => null);
            if (user) {
              results.push({ id, username: user.username, displayName: user.username, avatar: user.displayAvatarURL({ size: 64 }) });
            } else {
              results.push({ id, username: null, displayName: null, avatar: null });
            }
          }
        } catch {
          results.push({ id, username: null, displayName: null, avatar: null });
        }
      }
      res.json({ users: results });
    } catch {
      res.status(500).json({ error: 'Errore risoluzione utenti' });
    }
  });

  // GET /api/guilds/:guildId/commands — list registered slash commands
  router.get('/:guildId/commands', requireAuth(jwtSecret), requireGuildMember(client), async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.guild.guild_id);
      if (!guild) return res.status(404).json({ error: 'Guild non trovata' });

      const cmds = await guild.commands.fetch().catch(() => null);
      if (!cmds) return res.json({ commands: [] });

      // Categorize commands based on file location
      const path = require('path');
      const fs = require('fs');
      const cmdDir = path.join(__dirname, '..', '..', 'commands');
      const cmdFiles = {};
      function scanDir(dir, prefix = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            scanDir(path.join(dir, entry.name), entry.name + '/');
          } else if (entry.name.endsWith('.js')) {
            const name = entry.name.replace('.js', '');
            cmdFiles[name] = prefix;
          }
        }
      }
      scanDir(cmdDir);

      const commands = cmds.map(c => {
        const prefix = cmdFiles[c.name] || '';
        const category = prefix.includes('admin') ? 'admin'
          : prefix.includes('mod') ? 'mod'
          : ['bp', 'loot', 'spedizione', 'raidreq', 'raidstatus'].includes(c.name) ? 'raid'
          : 'user';
        return {
          name: c.name,
          description: c.description,
          category,
          options: c.options ? c.options.map(o => ({ name: o.name, description: o.description, type: o.type })) : [],
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      res.json({ commands });
    } catch (err) {
      console.error('Commands list error:', err);
      res.status(500).json({ error: 'Errore recupero comandi' });
    }
  });

  return router;
};
