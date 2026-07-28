// src/services/antiRaidService.js
// Anti-raid protection: detects mass joins and auto-locks the server.
// If more than N members join within M seconds, enables verification-only mode.
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

const GUILD_ID = '1010226759817515018';

// Thresholds
const JOIN_THRESHOLD = 5;       // Max joins allowed
const JOIN_WINDOW_MS = 10000;   // Within 10 seconds
const LOCKDOWN_DURATION_MS = 300000; // 5 minutes lockdown

// In-memory tracking
const _recentJoins = [];
let _lockdownActive = false;
let _lockdownTimer = null;

/**
 * Track a new member join. If threshold exceeded, trigger lockdown.
 */
async function trackJoin(member, client) {
  if (member.guild.id !== GUILD_ID) return;
  if (_lockdownActive) return; // Already in lockdown

  const now = Date.now();
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
  _lockdownActive = true;
  logger.warn(`Anti-raid: LOCKDOWN triggered! ${joiners.length} joins in ${JOIN_WINDOW_MS / 1000}s`);

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
  if (_lockdownTimer) clearTimeout(_lockdownTimer);
  const savedChannel = logChannel; // capture in scope
  _lockdownTimer = setTimeout(async () => {
    _lockdownActive = false;
    _recentJoins.length = 0;
    logger.info('Anti-raid: lockdown ended automatically.');
    if (savedChannel) {
      await savedChannel.send({ embeds: [new EmbedBuilder().setTitle('Lockdown terminato').setColor(0x57f287).setDescription('Il server è tornato alla normalità.').setTimestamp()] }).catch(() => {});
    }
  }, LOCKDOWN_DURATION_MS);
}

/**
 * Check if the server is currently in lockdown mode.
 */
function isLockdownActive() {
  return _lockdownActive;
}

/**
 * Manually end lockdown (admin command).
 */
function endLockdown() {
  if (_lockdownTimer) clearTimeout(_lockdownTimer);
  _lockdownActive = false;
  _recentJoins.length = 0;
  logger.info('Anti-raid: lockdown ended manually.');
}

module.exports = { trackJoin, isLockdownActive, endLockdown };
