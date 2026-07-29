// src/services/raidEligibilityChecker.js
// Checks raid eligibility for guild members based on Blizzard API data.
// Assigns/removes Discord "Raid Eligible" role automatically.
const { ExternalAccount, RaidConfig, RaidEligibility, RaidAttendance, Guild } = require('../db');
const { getApi } = require('./api');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

/**
 * Get or create raid config for a guild.
 */
async function getRaidConfig(guildId) {
  const [cfg] = await RaidConfig.findOrCreate({
    where: { guild_id: guildId },
    defaults: { guild_id: guildId },
  });
  return cfg;
}

/**
 * Check a single user's raid eligibility.
 * @param {string} guildId
 * @param {string} userId
 * @param {object} raidConfig - RaidConfig row
 * @returns {Promise<object>} - { isEligible, failureReasons, stats }
 */
async function checkUser(guildId, userId, raidConfig) {
  // Find linked Battle.net account
  const ext = await ExternalAccount.findOne({
    where: { user_id: userId, guild_id: guildId, provider: 'battlenet' },
  });

  if (!ext) {
    await saveEligibility(guildId, userId, {
      isEligible: false,
      failureReasons: ['Account Battle.net non collegato. Usa /link battlenet Nome#1234'],
      lastCheckedAt: new Date(),
    });
    return { isEligible: false, failureReasons: ['no_battlenet_link'] };
  }

  // Get Battle.net API client
  const api = getApi('battlenet', 'wow');
  if (!api?.enabled) {
    return { isEligible: false, failureReasons: ['API Blizzard non configurata'] };
  }

  try {
    const raidData = await api.fetchRaidData(ext.external_id, ext.region || 'eu');
    if (!raidData) {
      await saveEligibility(guildId, userId, {
        isEligible: false,
        failureReasons: ['Personaggio non trovato su Blizzard API'],
        battleTag: ext.external_id,
        lastCheckedAt: new Date(),
      });
      return { isEligible: false, failureReasons: ['char_not_found'] };
    }

    const failureReasons = [];

    // 1. Item level check
    const ilvl = raidData.equippedIlvl || raidData.avgIlvl || 0;
    if (ilvl < (raidConfig.min_ilvl || 0)) {
      failureReasons.push(`Item level troppo basso: **${ilvl}** (minimo: ${raidConfig.min_ilvl})`);
    }

    // 2. Tier set bonus check
    if (raidConfig.require_tier_bonus && !raidData.hasTierBonus) {
      failureReasons.push('Tier set bonus non equipaggiato (minimo 2 pezzi)');
    }

    // 3. Achievement check
    if (raidConfig.require_achievement) {
      if (raidData.achievements && typeof raidData.achievements.hasAchievement === 'function') {
        const hasAch = raidData.achievements.hasAchievement(Number(raidConfig.require_achievement));
        if (!hasAch) {
          failureReasons.push(`Achievement raid non completato (ID: ${raidConfig.require_achievement})`);
        }
      } else {
        failureReasons.push('Dati achievement non disponibili — impossibile verificare');
      }
    }

    // 4. Raid attendance check
    const attendanceCount = await RaidAttendance.count({
      where: { guild_id: guildId, user_id: userId, attended: true },
    });
    if (attendanceCount < (raidConfig.min_raid_attendance || 0)) {
      failureReasons.push(`Presenze raid insufficienti: **${attendanceCount}** (minimo: ${raidConfig.min_raid_attendance})`);
    }

    const isEligible = failureReasons.length === 0;

    await saveEligibility(guildId, userId, {
      isEligible,
      failureReasons,
      ilvlEquipped: raidData.equippedIlvl,
      ilvlAvg: raidData.avgIlvl,
      hasTierBonus: raidData.hasTierBonus,
      tierBonusCount: raidData.tierBonusCount,
      hasAchievement: raidConfig.require_achievement ? raidData.achievements?.hasAchievement(Number(raidConfig.require_achievement)) : null,
      raidAttendance: attendanceCount,
      lastCheckedAt: new Date(),
      battleTag: ext.external_id,
      characterName: raidData.characterName,
      characterClass: raidData.characterClass,
      characterLevel: raidData.level,
    });

    return { isEligible, failureReasons, stats: raidData, attendanceCount };
  } catch (err) {
    logger.error(`Raid eligibility check failed for ${userId}: ${err.message}`);
    return { isEligible: false, failureReasons: [`Errore API: ${err.message}`] };
  }
}

/**
 * Save eligibility snapshot to DB.
 */
async function saveEligibility(guildId, userId, data) {
  await RaidEligibility.upsert({
    guild_id: guildId,
    user_id: userId,
    is_eligible: data.isEligible,
    failure_reasons: data.failureReasons || [],
    ilvl_equipped: data.ilvlEquipped ?? null,
    ilvl_avg: data.ilvlAvg ?? null,
    has_tier_bonus: data.hasTierBonus ?? null,
    tier_bonus_count: data.tierBonusCount ?? null,
    has_achievement: data.hasAchievement ?? null,
    raid_attendance: data.raidAttendance ?? null,
    last_checked_at: data.lastCheckedAt || new Date(),
    battle_tag: data.battleTag ?? null,
    character_name: data.characterName ?? null,
    character_class: data.characterClass ?? null,
    character_level: data.characterLevel ?? null,
  });
}

/**
 * Check all guild members with Bloods role and update Discord roles.
 * Members with "Progress" role are current raiders — they get checked and
 * the Progress role is kept only if eligible, removed if not.
 * Members with "Bloods" role but without Progress are checked for eligibility
 * and Progress is added if they qualify.
 * @param {Guild} discordGuild - Discord guild object
 */
async function checkAllMembers(discordGuild) {
  const cfg = await getRaidConfig(discordGuild.id);
  let eligible = 0;
  let ineligible = 0;
  let noLink = 0;
  let promoted = 0; // Bloods without Progress who became eligible
  let demoted = 0; // Progress members who lost eligibility

  // Get all members with "Bloods" role (gilda members — potential raiders)
  await discordGuild.members.fetch();
  const bloodsMembers = [...discordGuild.members.cache.values()].filter(
    (m) => !m.user.bot && m.roles.cache.some((r) => r.name === 'Bloods')
  );

  for (const member of bloodsMembers) {
    const hasProgress = member.roles.cache.some((r) => r.name === 'Progress');
    const result = await checkUser(discordGuild.id, member.user.id, cfg);

    if (result.isEligible) {
      eligible++;
      // Add Progress role if not already present
      if (!hasProgress && cfg.eligible_role_id) {
        await member.roles.add(cfg.eligible_role_id).catch(() => {});
        promoted++;
      }
    } else {
      ineligible++;
      // Remove Progress role if they had it — no longer eligible
      if (hasProgress && cfg.eligible_role_id) {
        await member.roles.remove(cfg.eligible_role_id).catch(() => {});
        demoted++;
      }
      if (result.failureReasons[0] === 'no_battlenet_link') noLink++;
    }
  }

  logger.info(
    `Raid eligibility check: ${eligible} eligible, ${ineligible} ineligible ` +
    `(${noLink} without Battle.net link, ${promoted} promoted, ${demoted} demoted)`
  );
  return { eligible, ineligible, noLink, promoted, demoted, total: bloodsMembers.length };
}

/**
 * Get eligibility for a user (cached, from DB).
 */
async function getUserEligibility(guildId, userId) {
  return await RaidEligibility.findOne({ where: { guild_id: guildId, user_id: userId } });
}

module.exports = {
  getRaidConfig,
  checkUser,
  checkAllMembers,
  getUserEligibility,
  saveEligibility,
};
