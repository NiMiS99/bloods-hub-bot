// src/services/api/raiderIoApi.js
// Raider.IO API client — fetches M+ score, raid progress, and best runs.
// Public API, no key required (rate-limited).
const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://raider.io/api/v1';
const TIMEOUT = 10000;

/**
 * Fetch character profile from Raider.IO.
 * @param {string} name - Character name
 * @param {string} realm - Realm name (e.g. "Pozzo dell'Eternità")
 * @param {string} region - Region (EU, US, etc.)
 * @returns {Promise<object|null>} Profile data or null on failure
 */
async function fetchProfile(name, realm = "Pozzo dell'Eternità", region = 'EU') {
  try {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    const res = await axios.get(`${BASE_URL}/characters/profile`, {
      params: {
        region: region.toLowerCase(),
        realm: realmSlug,
        name: name.toLowerCase(),
        fields: 'mythic_plus_scores,raid_progression,gear',
      },
      timeout: TIMEOUT,
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      logger.warn(`Raider.IO: character ${name} not found on ${realm}.`);
    } else {
      logger.error(`Raider.IO fetchProfile failed: ${err.message}`);
    }
    return null;
  }
}

/**
 * Fetch M+ score for a character.
 * @param {string} name
 * @param {string} realm
 * @param {string} region
 * @returns {Promise<number>} M+ score (0 on failure)
 */
async function fetchMythicPlusScore(name, realm, region = 'EU') {
  const profile = await fetchProfile(name, realm, region);
  if (!profile) return 0;
  return profile.mythic_plus_scores?.all || 0;
}

/**
 * Fetch raid progress for a character.
 * @param {string} name
 * @param {string} realm
 * @param {string} region
 * @returns {Promise<object>} Raid progress keyed by raid name
 */
async function fetchRaidProgress(name, realm, region = 'EU') {
  const profile = await fetchProfile(name, realm, region);
  if (!profile) return {};
  return profile.raid_progression || {};
}

/**
 * Fetch item level for a character.
 * @param {string} name
 * @param {string} realm
 * @param {string} region
 * @returns {Promise<number>} Item level (0 on failure)
 */
async function fetchItemLevel(name, realm, region = 'EU') {
  const profile = await fetchProfile(name, realm, region);
  if (!profile) return 0;
  return profile.gear?.item_level_equipped || 0;
}

/**
 * Fetch guild roster summary from Raider.IO.
 * @param {string} guildName
 * @param {string} realm
 * @param {string} region
 * @returns {Promise<object|null>}
 */
async function fetchGuildRoster(guildName = 'Bloods', realm = "Pozzo dell'Eternità", region = 'EU') {
  try {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    const res = await axios.get(`${BASE_URL}/guilds/profile`, {
      params: {
        region: region.toLowerCase(),
        realm: realmSlug,
        name: guildName.toLowerCase(),
        fields: 'members',
      },
      timeout: TIMEOUT,
    });
    return res.data;
  } catch (err) {
    logger.error(`Raider.IO fetchGuildRoster failed: ${err.message}`);
    return null;
  }
}

module.exports = {
  fetchProfile,
  fetchMythicPlusScore,
  fetchRaidProgress,
  fetchItemLevel,
  fetchGuildRoster,
};
