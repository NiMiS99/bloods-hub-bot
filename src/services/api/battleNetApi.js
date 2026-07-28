// src/services/api/battleNetApi.js
// Battle.net API integration (OAuth client-credentials flow + profile/stats).
// Used for WoW. Implements a small in-memory token cache with auto-refresh.
//
// IMPORTANT: WoW character API requires BOTH character name AND realm.
// The accountId format for WoW is: "CharacterName-RealmName"
// Example: "Nimis-Antonidas"
// The realm can be either the full name (Antonidas) or slug (antonidas).
const axios = require('axios');
const BaseGameApi = require('./baseApi');
const { acquire: rateLimit } = require('./rateLimiter');
const config = require('../../config');
const logger = require('../../utils/logger');

class BattleNetApi extends BaseGameApi {
  constructor(gameCode) {
    super({ provider: 'battlenet', gameCode });
    this.clientId = config.api.battleNet.clientId;
    this.clientSecret = config.api.battleNet.clientSecret;
    this._token = null;
    this._tokenExpires = 0;
    this._realmCache = null; // cached realm index
  }

  get enabled() {
    return Boolean(this.clientId && this.clientSecret);
  }

  async _getToken(region = 'eu') {
    if (this._token && Date.now() < this._tokenExpires - 60_000) return this._token;
    if (!this.enabled) throw new Error('Battle.net credentials not configured');
    const url = `https://${region}.battle.net/oauth/token`;
    const { data } = await axios.post(
      url,
      'grant_type=client_credentials',
      { auth: { username: this.clientId, password: this.clientSecret } }
    );
    this._token = data.access_token;
    this._tokenExpires = Date.now() + (data.expires_in ?? 86400) * 1000;
    return this._token;
  }

  /**
   * Parse accountId into { charName, realmInput }.
   * Accepted formats:
   *   "CharacterName-RealmName"  (e.g. "Bäba-Pozzo dell'Eternità")
   *   "CharacterName-Realm Slug" (e.g. "Bäba-pozzo-delleternità")
   * The character name keeps accented characters (Blizzard API accepts them).
   * The realm is resolved via the realm index in _resolveRealmSlug.
   */
  parseCharacterId(accountId) {
    const raw = String(accountId ?? '').trim();
    // Split on the LAST hyphen (character names don't have hyphens, but realms might)
    const idx = raw.lastIndexOf('-');
    if (idx < 1) {
      // No realm provided — can't work
      return { charName: raw.toLowerCase(), realmInput: null, raw };
    }
    const charName = raw.slice(0, idx).trim().toLowerCase();
    const realmInput = raw.slice(idx + 1).trim();
    return { charName, realmInput, raw };
  }

  /**
   * Fetch the realm index to validate/autocomplete realm slugs.
   * Cached for 24h.
   */
  async _getRealmIndex(region = 'eu') {
    if (this._realmCache && Date.now() < this._realmCache.expiresAt) return this._realmCache.data;
    const token = await this._getToken(region);
    await rateLimit('battlenet');
    const url = `https://${region}.api.blizzard.com/data/wow/realm/index?namespace=dynamic-${region}&locale=en_${region}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch((err) => {
      logger.warn(`[battlenet] realm index failed: ${err.response?.status}`);
      return { data: null };
    });
    this._realmCache = { data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
    return data;
  }

  /**
   * Try to resolve a realm name to its slug via the realm index.
   * Handles accented characters (à, è, é, ì, ò, ù, ä, ö, ü).
   * Falls back to a slugified version if the API call fails.
   */
  async _resolveRealmSlug(realmInput, region = 'eu') {
    if (!realmInput) return null;

    const index = await this._getRealmIndex(region);
    if (index?.realms) {
      const inputLower = realmInput.toLowerCase().trim();
      // Try exact name match, then slug match, then partial slug match
      let match = index.realms.find(
        (r) => r.name && r.name.toLowerCase() === inputLower
      );
      if (!match) match = index.realms.find((r) => r.slug === inputLower);
      if (!match) {
        // Try matching slug with spaces->hyphens and apostrophes removed
        const normalized = inputLower.replace(/\s+/g, '-').replace(/'/g, '');
        match = index.realms.find((r) => r.slug === normalized);
      }
      if (match?.slug) return match.slug;
    }
    // Fallback: slugify manually (keep accented chars, spaces->hyphens, remove apostrophes)
    return realmInput.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
  }

  async fetchProfile(accountId, region = 'eu') {
    const token = await this._getToken(region);
    await rateLimit('battlenet');
    const { charName, realmInput } = this.parseCharacterId(accountId);
    if (!realmInput) {
      logger.warn(`[battlenet] no realm in accountId: ${accountId}`);
      return null;
    }
    const realmSlug = await this._resolveRealmSlug(realmInput, region);
    const url = `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}?namespace=profile-${region}&locale=en_${region}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch((err) => {
      logger.warn(`[battlenet] profile fetch failed for ${accountId} (${realmSlug}/${charName}): ${err.response?.status} ${err.response?.statusText}`);
      return { data: null };
    });
    return data;
  }

  /**
   * Fetch character equipment summary — includes equipped items with ilvl.
   */
  async fetchEquipment(accountId, region = 'eu') {
    const token = await this._getToken(region);
    await rateLimit('battlenet');
    const { charName, realmInput } = this.parseCharacterId(accountId);
    if (!realmInput) return null;
    const realmSlug = await this._resolveRealmSlug(realmInput, region);
    const url = `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}/equipment?namespace=profile-${region}&locale=en_${region}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch((err) => {
      logger.warn(`[battlenet] equipment fetch failed for ${accountId}: ${err.response?.status}`);
      return { data: null };
    });
    if (!data?.equipped_items) return null;

    const items = data.equipped_items.map((it) => ({
      slot: it.slot?.type || null,
      name: it.name || null,
      ilvl: it.level?.value || 0,
      quality: it.quality?.type || null,
      setBonus: it.set?.id ? { setId: it.set.id, setName: it.set.name, bonuses: it.set.bonuses || [] } : null,
    }));

    // Use the API's own average if available, otherwise compute
    const equippedIlvl = items.reduce((sum, it) => sum + (it.ilvl || 0), 0);
    const avgIlvl = items.length > 0 ? Math.round(equippedIlvl / items.length) : 0;

    // Count tier set bonus pieces (items with setBonus)
    const tierPieces = items.filter((it) => it.setBonus);
    const tierSetMap = {};
    for (const it of tierPieces) {
      const setId = it.setBonus.setId;
      if (!tierSetMap[setId]) tierSetMap[setId] = { setId, setName: it.setBonus.setName, count: 0 };
      tierSetMap[setId].count++;
    }

    const tierSets = Object.values(tierSetMap);
    const bestTier = tierSets.sort((a, b) => b.count - a.count)[0] || null;

    return { items, equippedIlvl, avgIlvl, tierSets, bestTier };
  }

  /**
   * Fetch character achievements.
   */
  async fetchAchievements(accountId, region = 'eu') {
    const token = await this._getToken(region);
    await rateLimit('battlenet');
    const { charName, realmInput } = this.parseCharacterId(accountId);
    if (!realmInput) return null;
    const realmSlug = await this._resolveRealmSlug(realmInput, region);
    const url = `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}/achievements?namespace=profile-${region}&locale=en_${region}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch((err) => {
      logger.warn(`[battlenet] achievements fetch failed for ${accountId}: ${err.response?.status}`);
      return { data: null };
    });
    if (!data?.achievements) return null;

    const completed = new Set();
    for (const a of data.achievements) {
      if (a.id) completed.add(a.id);
      if (a.criteria?.child_criteria) {
        for (const c of a.criteria.child_criteria) {
          if (c.is_completed && c.id) completed.add(c.id);
        }
      }
    }

    return {
      achievementPoints: data.total_achievement_points || 0,
      hasAchievement: (achievementId) => completed.has(Number(achievementId)),
      completedIds: [...completed],
    };
  }

  /**
   * Fetch full raid eligibility data: ilvl, tier bonus, achievements, class.
   */
  async fetchRaidData(accountId, region = 'eu') {
    const profile = await this.fetchProfile(accountId, region);
    if (!profile) return null;

    const equipment = await this.fetchEquipment(accountId, region);
    const achievements = await this.fetchAchievements(accountId, region);

    // The profile API returns avg_item_level and equipped_item_level directly
    const avgIlvl = profile.average_item_level || equipment?.avgIlvl || 0;
    const equippedIlvl = profile.equipped_item_level || equipment?.equippedIlvl || avgIlvl;

    return {
      characterName: profile.name || null,
      characterClass: profile.character_class?.name || profile.active_spec?.name || null,
      level: profile.level || null,
      realm: profile.realm?.name || null,
      avgIlvl,
      equippedIlvl,
      equipment,
      achievements,
      hasTierBonus: equipment?.bestTier?.count >= 2 || false,
      tierBonusCount: equipment?.bestTier?.count || 0,
      tierSetName: equipment?.bestTier?.setName || null,
    };
  }

  async fetchStats(accountId, region = 'eu') {
    const profile = await this.fetchProfile(accountId, region);
    if (!profile) return [];
    const stats = [];
    if (profile.level) stats.push({ metric: 'level', valueNum: profile.level });
    if (profile.achievement_points) stats.push({ metric: 'achievement_points', valueNum: profile.achievement_points });
    if (profile.average_item_level) stats.push({ metric: 'avg_item_level', valueNum: profile.average_item_level });
    if (profile.equipped_item_level) stats.push({ metric: 'equipped_item_level', valueNum: profile.equipped_item_level });
    return stats;
  }
}

module.exports = BattleNetApi;
