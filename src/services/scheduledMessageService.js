// src/services/scheduledMessageService.js
// Scheduled messages: post messages on cron schedules.
const cron = require('node-cron');
const { ScheduledMessage } = require('../db');
const { baseEmbed } = require('../utils/embed');
const logger = require('../utils/logger');

// Map: scheduledMessageId -> cron task
const _tasks = new Map();

/**
 * Start a single scheduled message.
 */
function startTask(scheduledMsg, client) {
  if (_tasks.has(scheduledMsg.id)) {
    _tasks.get(scheduledMsg.id).stop();
  }

  if (!scheduledMsg.is_active) return;
  if (!cron.validate(scheduledMsg.cron_expr)) {
    logger.warn(`ScheduledMessage #${scheduledMsg.id}: invalid cron "${scheduledMsg.cron_expr}"`);
    return;
  }

  const task = cron.schedule(scheduledMsg.cron_expr, async () => {
    try {
      const guild = client.guilds.cache.get(String(scheduledMsg.guild_id));
      if (!guild) return;
      const channel = guild.channels.cache.get(String(scheduledMsg.channel_id));
      if (!channel) {
        logger.warn(`ScheduledMessage #${scheduledMsg.id}: channel not found`);
        return;
      }

      const payload = {};
      if (scheduledMsg.content) payload.content = scheduledMsg.content;

      if (scheduledMsg.embed_title || scheduledMsg.embed_image) {
        const embed = baseEmbed(scheduledMsg.embed_title || 'Annuncio');
        if (scheduledMsg.content && !scheduledMsg.embed_title) embed.setDescription(scheduledMsg.content);
        if (scheduledMsg.embed_image) embed.setImage(scheduledMsg.embed_image);
        payload.embeds = [embed];
        if (scheduledMsg.content && scheduledMsg.embed_title) payload.content = scheduledMsg.content;
      }

      await channel.send(payload);
      await scheduledMsg.update({ last_sent_at: new Date() });
      logger.info(`ScheduledMessage #${scheduledMsg.id}: sent to #${channel.name}`);
    } catch (err) {
      logger.error(`ScheduledMessage #${scheduledMsg.id} send error: ${err.message}`);
    }
  });

  _tasks.set(scheduledMsg.id, task);
  logger.info(`ScheduledMessage #${scheduledMsg.id}: started (cron: ${scheduledMsg.cron_expr})`);
}

/**
 * Load and start all active scheduled messages from DB.
 */
async function start(client) {
  try {
    const messages = await ScheduledMessage.findAll({ where: { is_active: true } });
    for (const msg of messages) {
      startTask(msg, client);
    }
    logger.info(`ScheduledMessageService: started ${messages.length} tasks.`);
  } catch (err) {
    logger.error(`ScheduledMessageService start: ${err.message}`);
  }
}

/**
 * Reload a single scheduled message (after create/update/delete).
 */
async function reload(scheduledMsgId, client) {
  const msg = await ScheduledMessage.findByPk(scheduledMsgId);
  if (_tasks.has(scheduledMsgId)) {
    _tasks.get(scheduledMsgId).stop();
    _tasks.delete(scheduledMsgId);
  }
  if (msg && msg.is_active) {
    startTask(msg, client);
  }
}

/**
 * Stop all tasks.
 */
function stop() {
  for (const task of _tasks.values()) {
    task.stop();
  }
  _tasks.clear();
  logger.info('ScheduledMessageService: stopped all tasks.');
}

module.exports = { start, stop, reload, startTask };
