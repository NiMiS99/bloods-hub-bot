// src/services/reminderService.js
// Reminder system: store user reminders and send them when due.
const { Op } = require('sequelize');
const { Reminder } = require('../db');
const { baseEmbed } = require('../utils/embed');
const logger = require('../utils/logger');

let _interval = null;

/**
 * Add a new reminder for a user.
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} channelId - Channel ID where the reminder was set (and will be sent)
 * @param {string} message - Reminder message
 * @param {Date} remindAt - When to send the reminder
 * @returns {Promise<object|null>} The created reminder, or null on failure
 */
async function addReminder(guildId, userId, channelId, message, remindAt) {
  try {
    const reminder = await Reminder.create({
      guild_id: guildId,
      user_id: userId,
      channel_id: channelId,
      message,
      remind_at: remindAt,
      is_sent: false,
    });
    logger.info(`Reminder #${reminder.id} created for user ${userId} at ${remindAt.toISOString()}.`);
    return reminder;
  } catch (err) {
    logger.error(`Reminder addReminder failed: ${err.message}`);
    return null;
  }
}

/**
 * Check for due reminders and send them.
 * @param {object} client - Discord client
 */
async function checkDueReminders(client) {
  try {
    const due = await Reminder.findAll({
      where: {
        is_sent: false,
        remind_at: { [Op.lte]: new Date() },
      },
      limit: 50,
    });

    for (const reminder of due) {
      try {
        const guild = client.guilds.cache.get(String(reminder.guild_id));
        if (!guild) {
          await reminder.update({ is_sent: true });
          continue;
        }

        const channel = guild.channels.cache.get(String(reminder.channel_id));
        if (!channel) {
          await reminder.update({ is_sent: true });
          continue;
        }

        const embed = baseEmbed({
          title: 'Promemoria',
          description: `<@${reminder.user_id}>, questo è il tuo promemoria!\n\n> ${reminder.message}`,
          footer: { text: `Reminder #${reminder.id} • Bloods Community` },
        });

        await channel.send({ content: `<@${reminder.user_id}>`, embeds: [embed] }).catch(() => {});
        await reminder.update({ is_sent: true });
        logger.info(`Reminder #${reminder.id} sent to user ${reminder.user_id}.`);
      } catch (err) {
        logger.error(`Reminder #${reminder.id} send failed: ${err.message}`);
        // Mark as sent to avoid retrying indefinitely
        await reminder.update({ is_sent: true }).catch(() => {});
      }
    }
  } catch (err) {
    logger.error(`Reminder checkDueReminders failed: ${err.message}`);
  }
}

/**
 * Start the reminder scheduler (checks every 30 seconds).
 * @param {object} client - Discord client
 */
function start(client) {
  checkDueReminders(client);
  _interval = setInterval(() => checkDueReminders(client), 30000);
  logger.info('ReminderService: started (checks every 30s).');
}

/**
 * Stop the reminder scheduler.
 */
function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  logger.info('ReminderService: stopped.');
}

/**
 * Get all reminders for a user (unsent ones first).
 * @param {string} userId - User ID
 * @returns {Promise<Array<object>>}
 */
async function getUserReminders(userId) {
  try {
    return await Reminder.findAll({
      where: { user_id: userId, is_sent: false },
      order: [['remind_at', 'ASC']],
    });
  } catch (err) {
    logger.error(`Reminder getUserReminders failed: ${err.message}`);
    return [];
  }
}

/**
 * Cancel a reminder by ID. Only the owner can cancel their own reminder.
 * @param {string|number} reminderId - Reminder ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<boolean>} True if cancelled, false otherwise
 */
async function cancelReminder(reminderId, userId) {
  try {
    const reminder = await Reminder.findByPk(reminderId);
    if (!reminder) return false;
    if (String(reminder.user_id) !== String(userId)) return false;
    if (reminder.is_sent) return false;

    await reminder.update({ is_sent: true });
    logger.info(`Reminder #${reminderId} cancelled by user ${userId}.`);
    return true;
  } catch (err) {
    logger.error(`Reminder cancelReminder failed: ${err.message}`);
    return false;
  }
}

module.exports = {
  addReminder,
  start,
  stop,
  getUserReminders,
  cancelReminder,
  checkDueReminders,
};
