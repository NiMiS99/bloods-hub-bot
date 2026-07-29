// src/services/api/steamApi.js
// Steam Web API integration. Fetches owned-games playtime (minutes) per app.
const axios = require('axios');
const BaseGameApi = require('./baseApi');
const { acquire: rateLimit } = require('./rateLimiter');
const config = require('../../config');
const _logger = require('../../utils/logger');

// Map our game codes -> Steam app ids.
const APP_IDS = {
  csgo: 730,
  dota2: 570,
  apex: 1172470,        // Apex Legends (Steam version)
  valorant: 0,          // Not on Steam (Riot client)
  lol: 0,               // Not on Steam (Riot client)
  minecraft: 0,         // Not on Steam (separate launcher)
  ffxiv: 39210,         // Final Fantasy XIV
  wow: 0,               // Not on Steam (Battle.net)
  deltaforce: 2703680,  // Delta Force
  diablo4: 0,           // Not on Steam (Battle.net)
  palworld: 1623730,    // Palworld
  pokemonchampions: 0,  // Not on Steam
  starcraft2: 0,        // Not on Steam (Battle.net)
  metin2: 0,            // Not on Steam
  rocketleague: 0,      // Free to play — Epic Games
  callofduty: 0,        // Battle.net
  pathofexile: 238960,  // Path of Exile
  dayz: 221100,         // DayZ
};

// Simple in-memory cache: key -> { data, expires }
const _cache = new Map();
const CACHE_TTL_MS = 3600000; // 1 hour

function getCached(key) {
  const entry = _cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  _cache.delete(key);
  return null;
}

function setCached(key, data) {
  _cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

class SteamApi extends BaseGameApi {
  constructor(gameCode) {
    super({ provider: 'steam', gameCode });
    this.key = config.api.steam;
    this.appId = APP_IDS[gameCode];
  }

  get enabled() {
    return Boolean(this.key);
  }

  async fetchProfile(steamId) {
    if (!this.enabled) throw new Error('Steam API key not configured');
    const cacheKey = `profile:${steamId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    await rateLimit('steam');
    const url = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/';
    const { data } = await axios.get(url, { params: { key: this.key, steamids: steamId } });
    const result = data?.response?.players?.[0] ?? null;
    setCached(cacheKey, result);
    return result;
  }

  async fetchStats(steamId) {
    if (!this.enabled) throw new Error('Steam API key not configured');
    if (!this.appId) return []; // game not tracked on Steam
    const cacheKey = `stats:${steamId}:${this.appId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    await rateLimit('steam');
    const url = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/';
    const { data } = await axios.get(url, {
      params: { key: this.key, steamid: steamId, include_appinfo: 0, include_played_free_games: 1 },
    });
    const games = data?.response?.games ?? [];
    const entry = games.find((g) => g.appid === this.appId);
    if (!entry) return [];
    const result = [
      { metric: 'playtime_seconds', valueNum: (entry.playtime_forever || 0) * 60 },
      { metric: 'playtime_2weeks_seconds', valueNum: (entry.playtime_2weeks || 0) * 60 },
    ];
    setCached(cacheKey, result);
    return result;
  }
}

module.exports = SteamApi;
