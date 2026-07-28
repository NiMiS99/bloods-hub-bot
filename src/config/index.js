// src/config/index.js
// Centralized, validated configuration loaded from environment variables.
require('dotenv').config();

const required = (key) => {
  const v = process.env[key];
  if (!v || v.length === 0) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: process.env.GUILD_ID || null, // null = global command registration
  },
  channels: {
    // Existing onboarding channel IDs — mapped by ID to avoid duplication
    // from emoji/Fraktur font mismatch in name-based search.
    welcome: process.env.WELCOME_CHANNEL_ID || null,
    rules: process.env.RULES_CHANNEL_ID || null,
    rolePanel: process.env.ROLE_PANEL_CHANNEL_ID || null,
  },
  admin: {
    // Discord role ID for "Bloods Admin" — users with this role can use
    // admin commands. Falls back to ManageGuild permission if not set.
    roleId: process.env.ADMIN_ROLE_ID || null,
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'bloods_hub',
    user: process.env.DB_USER || 'bloods_bot',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.DB_LOGGING === 'true',
  },
  api: {
    steam: process.env.STEAM_API_KEY || null,
    battleNet: {
      clientId: process.env.BATTLE_NET_CLIENT_ID || null,
      clientSecret: process.env.BATTLE_NET_CLIENT_SECRET || null,
    },
    riot: process.env.RIOT_API_KEY || null,
  },
  misc: {
    logLevel: process.env.LOG_LEVEL || 'info',
    locale: process.env.DEFAULT_LOCALE || 'it',
    activityTrackIntervalMs: parseInt(process.env.ACTIVITY_TRACK_INTERVAL_MS || '60000', 10),
    leaderboardCacheTtlMs: parseInt(process.env.LEADERBOARD_CACHE_TTL_MS || '300000', 10),
  },
};

module.exports = config;
