// src/services/api/riotApi.js
// Riot API integration. Supports Valorant & LoL. Uses PUUID-based endpoints.
const axios = require('axios');
const BaseGameApi = require('./baseApi');
const { acquire: rateLimit } = require('./rateLimiter');
const config = require('../../config');
const logger = require('../../utils/logger');

const REGIONAL = { eu: 'europe', na: 'americas', kr: 'asia', sea: 'sea' };
const PLATFORM = { eu: 'euw1', na: 'na1', kr: 'kr', sea: 'sea1' };

class RiotApi extends BaseGameApi {
  constructor(gameCode) {
    super({ provider: 'riot', gameCode });
    this.key = config.api.riot;
  }

  get enabled() {
    return Boolean(this.key);
  }

  _headers() {
    return { 'X-Riot-Token': this.key };
  }

  async fetchProfile(accountId, region = 'eu') {
    if (!this.enabled) throw new Error('Riot API key not configured');
    // accountId can be a PUUID already, or "GameName#TAG"
    let puuid = accountId;
    if (accountId.includes('#')) {
      const [name, tag] = accountId.split('#');
      const reg = REGIONAL[region] || 'europe';
      await rateLimit('riot');
      const { data } = await axios.get(
        `https://${reg}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
        { headers: this._headers() }
      );
      puuid = data.puuid;
    }
    return { puuid };
  }

  async fetchStats(accountId, region = 'eu') {
    if (!this.enabled) return [];
    const { puuid } = await this.fetchProfile(accountId, region).catch(() => ({ puuid: accountId }));
    const plat = PLATFORM[region] || 'euw1';
    const reg = REGIONAL[region] || 'europe';
    const stats = [];

    if (this.gameCode === 'valorant') {
      try {
        await rateLimit('riot');
        const { data } = await axios.get(
          `https://${plat}.api.riotgames.com/val/ranked/v1/players/by-puuid/${puuid}`,
          { headers: this._headers() }
        );
        if (data?.competitive_tier) stats.push({ metric: 'rank_tier', valueNum: data.competitive_tier });
        if (data?.ranked_rating) stats.push({ metric: 'ranked_rating', valueNum: data.ranked_rating });
      } catch (err) {
        logger.warn(`[riot] valorant stats failed for ${puuid}: ${err.response?.status}`);
      }
    }

    if (this.gameCode === 'lol') {
      try {
        await rateLimit('riot');
        const { data: summoner } = await axios.get(
          `https://${plat}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
          { headers: this._headers() }
        );
        if (summoner?.summonerLevel) stats.push({ metric: 'level', valueNum: summoner.summonerLevel });
        const { data: rank } = await axios.get(
          `https://${plat}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
          { headers: this._headers() }
        );
        const solo = rank.find((e) => e.queueType === 'RANKED_SOLO_5x5');
        if (solo) {
          stats.push({ metric: 'rank', valueStr: `${solo.tier} ${solo.rank}` });
          stats.push({ metric: 'league_points', valueNum: solo.leaguePoints });
          stats.push({ metric: 'wins', valueNum: solo.wins });
          stats.push({ metric: 'losses', valueNum: solo.losses });
        }
      } catch (err) {
        logger.warn(`[riot] lol stats failed for ${puuid}: ${err.response?.status}`);
      }
    }

    return stats;
  }
}

module.exports = RiotApi;
