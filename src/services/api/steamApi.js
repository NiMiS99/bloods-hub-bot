// src/services/api/steamApi.js
// Steam Web API integration. Fetches owned-games playtime (minutes) per app.
const axios = require('axios');
const BaseGameApi = require('./baseApi');
const { acquire: rateLimit } = require('./rateLimiter');
const config = require('../../config');
const logger = require('../../utils/logger');

// Map our game codes -> Steam app ids.
const APP_IDS = {
  csgo: 730,
  dota2: 570,
  // add more as needed
};

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
    await rateLimit('steam');
    const url = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/';
    const { data } = await axios.get(url, { params: { key: this.key, steamids: steamId } });
    return data?.response?.players?.[0] ?? null;
  }

  async fetchStats(steamId) {
    if (!this.enabled) throw new Error('Steam API key not configured');
    if (!this.appId) return []; // game not tracked on Steam
    await rateLimit('steam');
    const url = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/';
    const { data } = await axios.get(url, {
      params: { key: this.key, steamid: steamId, include_appinfo: 0, include_played_free_games: 1 },
    });
    const games = data?.response?.games ?? [];
    const entry = games.find((g) => g.appid === this.appId);
    if (!entry) return [];
    return [
      { metric: 'playtime_seconds', valueNum: (entry.playtime_forever || 0) * 60 },
      { metric: 'playtime_2weeks_seconds', valueNum: (entry.playtime_2weeks || 0) * 60 },
    ];
  }
}

module.exports = SteamApi;
