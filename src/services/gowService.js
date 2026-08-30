// src/services/gowService.js
// Guilds of WoW API integration — sync roster and recruitment applications.
// Requires GOW_API_KEY in .env (obtainable from GoW Manage > API).
const axios = require('axios');
const { User, GameStat } = require('../db');
const logger = require('../utils/logger');

const BASE_URL = 'https://guildsofwow.com/api/v1';
const GUILD_NAME = 'Bloods';
const GUILD_SERVER = "Pozzo dell'Eternità";
const GUILD_REGION = 'EU';
const GUILD_ID = '1010226759817515018';

function getMgmtKey() {
  return process.env.GOW_API_KEY || null;
}

function getPublicKey() {
  return process.env.GOW_PUBLIC_KEY || null;
}

function getSheetKey() {
  return process.env.GOW_SHEET_KEY || null;
}

function isEnabled() {
  return Boolean(getMgmtKey() || getPublicKey());
}

function mgmtHeaders() {
  return {
    'X-API-Key': getMgmtKey(),
    'Authorization': `Bearer ${getMgmtKey()}`,
    'Accept': 'application/json',
    'User-Agent': 'BloodsHubBot/1.0 (https://bloodswow.it)',
  };
}

function publicHeaders() {
  return {
    'X-API-Key': getPublicKey(),
    'Authorization': `Bearer ${getPublicKey()}`,
    'Accept': 'application/json',
    'User-Agent': 'BloodsHubBot/1.0 (https://bloodswow.it)',
  };
}

/**
 * Fetch guild roster from GoW.
 * Returns array of members with: name, rank, class, spec, ilvl, lastOnline, mythicPlusScore.
 */
async function fetchRoster() {
  if (!isEnabled()) {
    logger.warn('GoW: API key not configured, skipping roster fetch.');
    return [];
  }
  try {
    const slug = GUILD_SERVER.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    const urls = [
      `${BASE_URL}/guilds/${GUILD_NAME}/${slug}/${GUILD_REGION}/members`,
      `${BASE_URL}/guild/${GUILD_NAME}/${slug}/${GUILD_REGION}/members`,
    ];
    for (const url of urls) {
      try {
        const res = await axios.get(url, { headers: mgmtHeaders(), timeout: 15000 });
        return res.data?.members || res.data || [];
      } catch (err) {
        if (err.response?.status === 404) continue;
        throw err;
      }
    }
    return [];
  } catch (err) {
    logger.error(`GoW fetchRoster failed: ${err.message}`);
    return [];
  }
}

/**
 * Fetch recruitment applications from GoW.
 * Returns array of applications with: name, class, spec, ilvl, message, appliedAt.
 */
async function fetchRecruitmentApplications() {
  if (!isEnabled()) {
    logger.warn('GoW: API key not configured, skipping recruitment fetch.');
    return [];
  }
  try {
    const slug = GUILD_SERVER.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    const urls = [
      `${BASE_URL}/guilds/${GUILD_NAME}/${slug}/${GUILD_REGION}/applications`,
      `${BASE_URL}/guild/${GUILD_NAME}/${slug}/${GUILD_REGION}/applications`,
    ];
    for (const url of urls) {
      try {
        const res = await axios.get(url, { headers: mgmtHeaders(), timeout: 15000 });
        return res.data?.applications || res.data || [];
      } catch (err) {
        if (err.response?.status === 404) continue;
        throw err;
      }
    }
    return [];
  } catch (err) {
    logger.error(`GoW fetchRecruitmentApplications failed: ${err.message}`);
    return [];
  }
}

/**
 * Sync GoW roster data into the bot's database.
 * Updates: users table (last_login), game_stats (ilvl, m+ score).
 * @param {object} models - DB models
 */
async function syncRosterToDb(models) {
  const roster = await fetchRoster();
  if (roster.length === 0) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  for (const member of roster) {
    try {
      // GoW provides Battle.net character data, not Discord IDs.
      // We store as external account / game stats.
      if (member.ilvl) {
        await GameStat.upsert({
          guild_id: GUILD_ID,
          user_id: null, // GoW data is per-character, not per-Discord-user
          game_id: null, // WoW game ID if configured
          metric: 'ilvl',
          value_num: member.ilvl,
          metadata: {
            source: 'gow',
            character_name: member.name,
            class: member.class,
            spec: member.spec,
            rank: member.rank,
            last_online: member.lastOnline,
          },
        });
      }
      if (member.mythicPlusScore) {
        await GameStat.upsert({
          guild_id: GUILD_ID,
          user_id: null,
          game_id: null,
          metric: 'mythic_plus_score',
          value_num: member.mythicPlusScore,
          metadata: {
            source: 'gow',
            character_name: member.name,
          },
        });
      }
      synced++;
    } catch (err) {
      errors++;
      logger.warn(`GoW syncRoster: failed for ${member.name}: ${err.message}`);
    }
  }

  logger.info(`GoW syncRoster: ${synced} synced, ${errors} errors.`);
  return { synced, errors };
}

module.exports = {
  isEnabled,
  fetchRoster,
  fetchRecruitmentApplications,
  syncRosterToDb,
  getMgmtKey,
  getPublicKey,
  getSheetKey,
};
