// src/server/routes/auth.js
// Discord OAuth2 authentication routes.
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../../utils/logger');
const config = require('../../config');

const DISCORD_API = 'https://discord.com/api/v10';
const OAUTH_SCOPES = ['identify', 'guilds'];

module.exports = function (client, jwtSecret) {
  const router = express.Router();
  const { requireAuth } = require('../middleware/auth');

  // Get OAuth2 config
  function getOAuthConfig() {
    const clientId = config.discord.clientId;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const port = parseInt(process.env.DASHBOARD_PORT || '4567', 10);
    const host = process.env.DASHBOARD_URL || `http://localhost:${port}`;
    return {
      clientId,
      clientSecret,
      redirectUri: `${host}/api/auth/callback`,
    };
  }

  // GET /api/auth/discord — redirect to Discord OAuth2
  // Optional ?next=/path — internal path to redirect to after login (stored in a short-lived cookie)
  router.get('/discord', (req, res) => {
    const { clientId, redirectUri } = getOAuthConfig();
    if (!clientId || !process.env.DISCORD_CLIENT_SECRET) {
      return res.status(500).json({ error: 'OAuth2 non configurato. Imposta DISCORD_CLIENT_SECRET nel .env' });
    }
    const next = typeof req.query.next === 'string' && req.query.next.startsWith('/') && !req.query.next.startsWith('//')
      ? req.query.next
      : '/';
    res.cookie('login_next', next, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: OAUTH_SCOPES.join(' '),
      prompt: 'consent',
    });
    res.redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
  });

  // GET /api/auth/callback — OAuth2 callback
  router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code parameter');

    const { clientId, clientSecret, redirectUri } = getOAuthConfig();
    if (!clientSecret) {
      return res.status(500).send('DISCORD_CLIENT_SECRET non configurato');
    }

    try {
      // Exchange code for token
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      });

      const tokenRes = await axios.post(`${DISCORD_API}/oauth2/token`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, refresh_token } = tokenRes.data;

      // Get user info
      const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const user = userRes.data;

      // Get user's guilds
      const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      // Filter guilds where the bot is present
      const _botGuilds = guildsRes.data.filter((g) => client.guilds.cache.has(g.id));

      // Create JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          global_name: user.global_name,
          access_token,
          refresh_token,
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Set cookie and redirect to dashboard
      // NOTE: secure=false because we serve over HTTP (no TLS/reverse proxy yet).
      // When adding HTTPS, set secure=true via DASHBOARD_SECURE env var.
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.DASHBOARD_SECURE === 'true',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const next = typeof req.cookies?.login_next === 'string' && req.cookies.login_next.startsWith('/') && !req.cookies.login_next.startsWith('//')
        ? req.cookies.login_next
        : '/';
      res.clearCookie('login_next');
      logger.info(`OAuth2 login success: user=${user.username} (${user.id}), redirecting to ${next}`);
      res.redirect(next);
    } catch (err) {
      logger.error('OAuth2 callback error:', err.response?.data || err.message);
      res.status(500).send('Errore durante il login Discord. Controlla i log.');
    }
  });

  // GET /api/auth/me — current user info
  router.get('/me', requireAuth(jwtSecret), (req, res) => {
    const avatar = req.user.avatar
      ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(req.user.id.slice(-2)) || 0) % 5}.png`;
    res.json({
      id: req.user.id,
      username: req.user.username,
      global_name: req.user.global_name,
      avatar,
    });
  });

  // GET /api/auth/guilds — list guilds where bot is present and user is a member
  router.get('/guilds', requireAuth(jwtSecret), async (req, res) => {
    try {
      const { PermissionsBitField } = require('discord.js');
      const guilds = [];
      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch(req.user.id, { force: false }).catch(() => null);
        if (member) {
          const isAdmin = member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
            member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            (config.admin?.roleId && member.roles.cache.has(config.admin.roleId));
          const isMod = member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
            member.permissions.has(PermissionsBitField.Flags.ManageMessages);
          guilds.push({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 128 }),
            memberCount: guild.memberCount,
            isAdmin,
            isMod,
          });
        }
      }
      res.json({ guilds });
    } catch (err) {
      logger.error('Auth guilds error:', err.message);
      res.status(500).json({ error: 'Errore recupero server' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  return router;
};
