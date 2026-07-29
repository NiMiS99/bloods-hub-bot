// src/services/antiRaidService.js
// Anti-raid protection: detects mass joins and auto-locks the server.
// If more than N members join within M seconds, enables verification-only mode.
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

// Thresholds
const JOIN_THRESHOLD = 5;       // Max joins allowed
const JOIN_WINDOW_MS = 10000;   // Within 10 seconds
const LOCKDOWN_DURATION_MS = 300000; // 5 minutes lockdown

// In-memory tracking — per guild
const _recentJoinsByGuild = new Map(); // guildId -> [{ id, tag, ts }]
const _lockdownByGuild = new Map(); // guildId -> { active, timer }

/**
 * Track a new member join. If threshold exceeded, trigger lockdown.
 */
async function trackJoin(member, client) {
  const guildId = member.guild.id;
  if (_lockdownByGuild.get(guildId)?.active) return; // Already in lockdown

  const now = Date.now();
  if (!_recentJoinsByGuild.has(guildId)) _recentJoinsByGuild.set(guildId, []);
  const _recentJoins = _recentJoinsByGuild.get(guildId);
  _recentJoins.push({ id: member.id, tag: member.user.tag, ts: now });

  // Clean old entries
  while (_recentJoins.length > 0 && now - _recentJoins[0].ts > JOIN_WINDOW_MS) {
    _recentJoins.shift();
  }

  // Check threshold
  if (_recentJoins.length >= JOIN_THRESHOLD) {
    await triggerLockdown(member.guild, client, _recentJoins.slice());
  }
}

/**
 * Trigger server lockdown: enable "Non Verificato" verification gate strictly.
 */
async function triggerLockdown(guild, client, joiners) {
  const guildId = guild.id;
  if (!_lockdownByGuild.has(guildId)) _lockdownByGuild.set(guildId, { active: false, timer: null });
  const state = _lockdownByGuild.get(guildId);
  state.active = true;
  logger.warn(`Anti-raid: LOCKDOWN triggered for ${guild.name}! ${joiners.length} joins in ${JOIN_WINDOW_MS / 1000}s`);

  // Log to #log-staff
  const AdvancedLogger = require('./advancedLogger');
  const logChannel = await AdvancedLogger.getLogChannel(guild).catch(() => null);
  if (logChannel) {
    const embed = new EmbedBuilder()
      .setTitle('ALLARME RAID — Lockdown attivato')
      .setColor(0xff0000)
      .setDescription(
        `**Rilevati ${joiners.length} join in ${JOIN_WINDOW_MS / 1000} secondi!**\n\n` +
        '**Account sospetti:**\n' +
        joiners.map((j) => `• <@${j.id}> (${j.tag})`).join('\n') +
        '\n\n**Lockdown attivo per 5 minuti.**\n' +
        'I nuovi membri riceveranno solo "Non Verificato" e non potranno accedere finché non si sblocca.'
      )
      .setTimestamp();
    await logChannel.send({ content: '@here', embeds: [embed] }).catch(() => {});
  }

  // Auto-clear lockdown after duration
  if (state.timer) clearTimeout(state.timer);
  const savedChannel = logChannel;
  state.timer = setTimeout(async () => {
    state.active = false;
    _recentJoinsByGuild.get(guildId).length = 0;
    logger.info(`Anti-raid: lockdown ended for ${guild.name}.`);
    if (savedChannel) {
      await savedChannel.send({ embeds: [new EmbedBuilder().setTitle('Lockdown terminato').setColor(0x57f287).setDescription('Il server è tornato alla normalità.').setTimestamp()] }).catch(() => {});
    }
  }, LOCKDOWN_DURATION_MS);
}

/**
 * Check if a guild is currently in lockdown mode.
 */
function isLockdownActive(guildId) {
  if (guildId) return _lockdownByGuild.get(guildId)?.active || false;
  // Check any guild
  for (const state of _lockdownByGuild.values()) {
    if (state.active) return true;
  }
  return false;
}

/**
 * Manually end lockdown (admin command).
 */
function endLockdown(guildId) {
  if (guildId) {
    const state = _lockdownByGuild.get(guildId);
    if (state) {
      if (state.timer) clearTimeout(state.timer);
      state.active = false;
      const joins = _recentJoinsByGuild.get(guildId);
      if (joins) joins.length = 0;
    }
  } else {
    // End all
    for (const [gid, state] of _lockdownByGuild) {
      if (state.timer) clearTimeout(state.timer);
      state.active = false;
      const joins = _recentJoinsByGuild.get(gid);
      if (joins) joins.length = 0;
    }
  }
  logger.info('Anti-raid: lockdown ended manually.');
}

module.exports = { trackJoin, triggerLockdown, isLockdownActive, endLockdown };
