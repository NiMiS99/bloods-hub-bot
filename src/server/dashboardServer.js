// src/server/dashboardServer.js
// Express server integrated in the bot process.
// Serves the dashboard frontend (static) + REST API on port 4567.
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');
const { recordAudit } = require('../utils/auditLog');

// API routes
const authRoutes = require('./routes/auth');
const guildRoutes = require('./routes/guilds');
const gameRoutes = require('./routes/games');
const memberRoutes = require('./routes/members');
const moderationRoutes = require('./routes/moderation');
const eventRoutes = require('./routes/events');
const leaderboardRoutes = require('./routes/leaderboard');
const analyticsRoutes = require('./routes/analytics');
const auditLogRoutes = require('./routes/auditLog');
const badgeRoutes = require('./routes/badges');
const settingsRoutes = require('./routes/settings');
const levelRewardRoutes = require('./routes/levelRewards');
const automodRoutes = require('./routes/automod');
const discordLogRoutes = require('./routes/discordLogs');
const raidRoutes = require('./routes/raid');
const giveawayRoutes = require('./routes/giveaway');
const scheduledMessageRoutes = require('./routes/scheduledMessages');
const customCommandRoutes = require('./routes/customCommands');
const communityRoutes = require('./routes/community');

class DashboardServer {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.port = parseInt(process.env.DASHBOARD_PORT || '4567', 10);
    this.server = null;
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET non impostato! Uso secret casuale — sessioni non persistenti dopo restart.');
    }
  }

  start() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for dashboard SPA
      crossOriginEmbedderPolicy: false,
    }));

    // Rate limiting: general API (100 req / 15 min per IP)
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Troppi tentativi. Riprova tra qualche minuto.' },
    });
    this.app.use('/api/', apiLimiter);

    // Rate limiting: auth endpoints (5 attempts / 15 min — anti brute-force)
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Troppi tentativi di login. Riprova tra 15 minuti.' },
    });
    this.app.use('/api/auth/login', authLimiter);
    this.app.use('/api/auth/callback', authLimiter);

    // Standard middleware
    this.app.use(cors({ origin: true, credentials: true }));
    this.app.use(express.json({ limit: '1mb' })); // Limit body size
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    this.app.use(cookieParser());

    // Trust proxy (for reverse proxy behind nginx)
    this.app.set('trust proxy', 1);

    // API routes
    try {
      this.app.use('/api/auth', authRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', guildRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', gameRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', memberRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', moderationRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', eventRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', leaderboardRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', analyticsRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', auditLogRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', badgeRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', settingsRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', levelRewardRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', automodRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', discordLogRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', raidRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', giveawayRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', scheduledMessageRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', customCommandRoutes(this.client, this.jwtSecret));
      this.app.use('/api/guilds', communityRoutes(this.client, this.jwtSecret));
    } catch (err) {
      logger.error('Failed to register API routes:', err.message);
    }

    // Health check
    this.app.get('/api/health', (req, res) => {
      const mem = process.memoryUsage();
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        memory: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size,
        ping: Math.round(this.client.ws.ping),
        ready: this.client.isReady(),
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });
    });

    // Serve static frontend (built Next.js / React app)
    const dashboardDist = path.join(__dirname, '..', '..', 'dashboard', 'out');
    if (fs.existsSync(dashboardDist)) {
      this.app.use(express.static(dashboardDist));
      // SPA fallback — serve index.html for all non-API routes
      this.app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(dashboardDist, 'index.html'));
        }
      });
      logger.info(`Dashboard frontend served from ${dashboardDist}`);
    } else {
      logger.warn(`Dashboard frontend not built yet. Run: cd dashboard && npm run build`);
      // Serve a placeholder
      this.app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.status(200).send(`
            <html><body style="font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
              <h1>🔧 Dashboard non ancora compilata</h1>
              <p>Esegui: <code>cd dashboard && npm install && npm run build</code></p>
              <p>API attiva su <a href="/api/health" style="color:#5865f2">/api/health</a></p>
            </body></html>
          `);
        }
      });
    }

    this.server = this.app.listen(this.port, '0.0.0.0', () => {
      logger.info(`Dashboard server listening on port ${this.port} (http://0.0.0.0:${this.port})`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = DashboardServer;
