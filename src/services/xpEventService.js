// src/services/xpEventService.js
// XP multiplier events — admin can start/stop XP boost periods.
const { Guild } = require('../db');
const logger = require('../utils/logger');

// In-memory state: { multiplier, endsAt, startedBy }
let _activeEvent = null;

/**
 * Start an XP multiplier event.
 */
async function startEvent(guildId, multiplier, durationHours, startedBy) {
  _activeEvent = {
    multiplier,
    endsAt: new Date(Date.now() + durationHours * 3600000),
    startedBy,
    startedAt: new Date(),
  };

  // Save to guild settings
  const guild = await Guild.findOne({ where: { guild_id: guildId } });
  if (guild) {
    const settings = guild.settings || {};
    settings.xpEvent = _activeEvent;
    await guild.update({ settings });
  }

  logger.info(`XP event started: x${multiplier} for ${durationHours}h by ${startedBy}`);
  return _activeEvent;
}

/**
 * Stop the active XP event.
 */
async function stopEvent(guildId) {
  _activeEvent = null;
  const guild = await Guild.findOne({ where: { guild_id: guildId } });
  if (guild) {
    const settings = guild.settings || {};
    delete settings.xpEvent;
    await guild.update({ settings });
  }
  logger.info('XP event stopped');
}

/**
 * Get the current XP multiplier (1 if no event active).
 */
function getMultiplier() {
  if (!_activeEvent) return 1;
  if (new Date() > new Date(_activeEvent.endsAt)) {
    _activeEvent = null;
    return 1;
  }
  return _activeEvent.multiplier;
}

/**
 * Get active event info.
 */
function getActiveEvent() {
  if (!_activeEvent) return null;
  if (new Date() > new Date(_activeEvent.endsAt)) {
    _activeEvent = null;
    return null;
  }
  return _activeEvent;
}

/**
 * Load active event from DB on startup.
 */
async function loadFromDB(guildId) {
  const guild = await Guild.findOne({ where: { guild_id: guildId } });
  if (guild && guild.settings && guild.settings.xpEvent) {
    const evt = guild.settings.xpEvent;
    if (new Date(evt.endsAt) > new Date()) {
      _activeEvent = evt;
      logger.info(`XP event loaded from DB: x${evt.multiplier} until ${evt.endsAt}`);
    }
  }
}

module.exports = { startEvent, stopEvent, getMultiplier, getActiveEvent, loadFromDB };
