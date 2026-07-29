// src/services/gameNightService.js
// Recurring game night events — auto-creates LFG sessions on schedule.
const cron = require('node-cron');
const { GameNight, Game } = require('../db');
const { createSession } = require('./lfgService');
const logger = require('../utils/logger');

const _tasks = new Map(); // gameNightId -> cron task

/**
 * Start the game night scheduler — loads all active game nights from DB.
 */
async function start(client) {
  const nights = await GameNight.findAll({ where: { is_active: true } }).catch(() => []);
  for (const night of nights) {
    _scheduleNight(client, night);
  }
  logger.info(`GameNightService: started ${nights.length} recurring game nights.`);

  // Check every 10 minutes for new/updated game nights
  setInterval(() => _reloadAll(client), 600000);
}

/**
 * Stop all game night tasks.
 */
function stop() {
  for (const [, task] of _tasks) task.stop();
  _tasks.clear();
}

/**
 * Reload all game nights from DB.
 */
async function _reloadAll(client) {
  const nights = await GameNight.findAll({ where: { is_active: true } }).catch(() => []);
  const activeIds = new Set(nights.map((n) => n.id));

  // Stop removed nights
  for (const [id, task] of _tasks) {
    if (!activeIds.has(id)) {
      task.stop();
      _tasks.delete(id);
      logger.info(`GameNight: stopped ${id}`);
    }
  }

  // Start new nights
  for (const night of nights) {
    if (!_tasks.has(night.id)) {
      _scheduleNight(client, night);
    }
  }
}

/**
 * Schedule a single game night.
 */
function _scheduleNight(client, night) {
  if (!cron.validate(night.cron_schedule)) {
    logger.warn(`GameNight ${night.id}: invalid cron "${night.cron_schedule}"`);
    return;
  }

  const task = cron.schedule(night.cron_schedule, async () => {
    await _triggerNight(client, night);
  });

  _tasks.set(night.id, task);
  logger.info(`GameNight: scheduled "${night.name}" (${night.cron_schedule})`);
}

/**
 * Trigger a game night — create LFG session and notify.
 */
async function _triggerNight(client, night) {
  try {
    const guild = client.guilds.cache.get(night.guild_id);
    if (!guild) return;

    // Find the game role
    const game = await Game.findOne({ where: { code: night.game_code, is_active: true } });
    const role = game ? guild.roles.cache.get(game.role_id) : null;

    // Find or use LFG channel
    const channel = night.text_channel_id
      ? guild.channels.cache.get(night.text_channel_id)
      : guild.channels.cache.find((c) => c.name.toLowerCase().includes('lfg'));

    if (!channel) {
      logger.warn(`GameNight ${night.id}: no LFG channel found`);
      return;
    }

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Game Night: ${night.name}`)
      .setColor(0x8b0000)
      .setDescription(
        `**Gioco:** ${night.game_name}\n` +
        `**Posti:** 1/${night.slots}\n` +
        `**Modalità:** Game Night Community\n\n` +
        `🟢 **Stato:** APERTO\n\n` +
        `**Partecipanti:**\n• ${client.user} (bot)\n\n` +
        `> È ora di game night! Unisciti alla sessione community!`
      )
      .setFooter({ text: `Game Night automatico • ${night.name}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lfg:btn:join').setLabel('Unisciti').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('lfg:btn:leave').setLabel('Lascia').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('lfg:btn:close').setLabel('Chiudi').setStyle(ButtonStyle.Secondary),
    );

    const sent = await channel.send({
      content: role ? `🎮 **Game Night Time!** <@&${role.id}>` : '🎮 **Game Night Time!**',
      embeds: [embed],
      components: [row],
      allowedMentions: { roles: role ? [role.id] : [] },
    });

    // Create LFG session in DB (captain = bot owner or first admin)
    await createSession({
      guildId: guild.id,
      messageId: sent.id,
      channelId: channel.id,
      captainId: sent.author.id, // Bot is captain placeholder
      gameName: night.game_name,
      gameCode: night.game_code,
      mode: 'Game Night',
      slots: night.slots,
      notes: night.name,
    });

    await night.update({ last_triggered_at: new Date() });
    logger.info(`GameNight: triggered "${night.name}" in ${guild.name}`);
  } catch (err) {
    logger.error(`GameNight trigger error: ${err.message}`);
  }
}

/**
 * Create a new game night.
 */
async function createNight({ guildId, name, gameCode, gameName, cronSchedule, slots, textChannelId }) {
  return GameNight.create({
    guild_id: guildId,
    name,
    game_code: gameCode,
    game_name: gameName,
    cron_schedule: cronSchedule,
    slots: slots || 10,
    text_channel_id: textChannelId,
    is_active: true,
  });
}

/**
 * List all game nights.
 */
async function listNights(guildId) {
  return GameNight.findAll({ where: { guild_id: guildId }, order: [['created_at', 'DESC']] });
}

/**
 * Toggle game night active status.
 */
async function toggleNight(id, guildId) {
  const night = await GameNight.findOne({ where: { id, guild_id: guildId } });
  if (!night) return null;
  await night.update({ is_active: !night.is_active });
  return night;
}

/**
 * Delete a game night.
 */
async function deleteNight(id, guildId) {
  return GameNight.destroy({ where: { id, guild_id: guildId } });
}

module.exports = { start, stop, createNight, listNights, toggleNight, deleteNight };
