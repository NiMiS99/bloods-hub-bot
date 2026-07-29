// src/utils/bpHelpers.js
// Helpers for BP (Bloods Points / DKP) system.
const { BpUser, BpRaidRoster, BpActiveRoll } = require('../db');
const { Op: _Op } = require('sequelize');

// Role names that can use BP admin commands (Guida + staff)
const RAID_LEADER_ROLES = [
  'Guida Incursioni',
  'Guida Spedizioni',
  'Officer',
  'Officer Reclutatore',
  'Officer in Prova',
  'Bloods Admin',
  'Consigliere',
  'Founder',
  'Owner',
];

/**
 * Check if member can use BP admin commands.
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isRaidLeader(member) {
  if (!member) return false;
  if (member.permissions?.has?.('Administrator')) return true;
  return RAID_LEADER_ROLES.some((name) => member.roles?.cache?.some((r) => r.name === name));
}

/**
 * Get or create a BpUser row.
 */
async function getBpUser(guildId, userId) {
  const [row] = await BpUser.findOrCreate({
    where: { guild_id: guildId, user_id: userId },
    defaults: { guild_id: guildId, user_id: userId, dkp: 0 },
  });
  return row;
}

/**
 * Get or create the raid roster singleton for a guild.
 */
async function getRoster(guildId) {
  const [row] = await BpRaidRoster.findOrCreate({
    where: { guild_id: guildId },
    defaults: { guild_id: guildId, is_active: false, members: [] },
  });
  return row;
}

/**
 * Get or create the active roll singleton for a guild.
 */
async function getActiveRoll(guildId) {
  const [row] = await BpActiveRoll.findOrCreate({
    where: { guild_id: guildId },
    defaults: { guild_id: guildId, is_open: false, bids: {} },
  });
  return row;
}

/**
 * Random integer between min and max (inclusive).
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Compute score: roll * (1 + bid / K).
 * K=50 means bid of 50 gives 2x, bid of 100 gives 3x.
 */
function computeScore(roll, bid, K = 50) {
  return Number((roll * (1 + bid / K)).toFixed(2));
}

/**
 * Extract user IDs from mention strings.
 */
function extractUserIdsFromMentions(text) {
  const ids = new Set();
  const re = /<@!?(\d+)>/g;
  let m;
  while ((m = re.exec(text)) !== null) ids.add(m[1]);
  return [...ids];
}

module.exports = {
  RAID_LEADER_ROLES,
  isRaidLeader,
  getBpUser,
  getRoster,
  getActiveRoll,
  randInt,
  computeScore,
  extractUserIdsFromMentions,
};
