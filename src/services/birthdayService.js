// src/services/birthdayService.js
// Birthday system: store user birthdays, send daily announcements, list upcoming.
const cron = require('node-cron');
const { Op: _Op } = require('sequelize');
const { Birthday, Guild } = require('../db');
const { baseEmbed } = require('../utils/embed');
const logger = require('../utils/logger');

let _task = null;

/**
 * Set or update a user's birthday.
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {number} month - Birth month (1-12)
 * @param {number} day - Birth day (1-31)
 * @returns {Promise<object|null>} The birthday record, or null on failure
 */
async function setBirthday(guildId, userId, month, day) {
  try {
    const existing = await Birthday.findOne({ where: { guild_id: guildId, user_id: userId } });
    if (existing) {
      await existing.update({ birth_month: month, birth_day: day });
      logger.info(`Birthday updated for user ${userId}: ${day}/${month}.`);
      return existing;
    }
    const record = await Birthday.create({
      guild_id: guildId,
      user_id: userId,
      birth_month: month,
      birth_day: day,
    });
    logger.info(`Birthday set for user ${userId}: ${day}/${month}.`);
    return record;
  } catch (err) {
    logger.error(`Birthday setBirthday failed: ${err.message}`);
    return null;
  }
}

/**
 * Remove a user's birthday.
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if a birthday was removed
 */
async function removeBirthday(guildId, userId) {
  try {
    const deleted = await Birthday.destroy({
      where: { guild_id: guildId, user_id: userId },
    });
    if (deleted > 0) logger.info(`Birthday removed for user ${userId}.`);
    return deleted > 0;
  } catch (err) {
    logger.error(`Birthday removeBirthday failed: ${err.message}`);
    return false;
  }
}

/**
 * Get a user's birthday.
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>}
 */
async function getBirthday(guildId, userId) {
  try {
    return await Birthday.findOne({ where: { guild_id: guildId, user_id: userId } });
  } catch (err) {
    logger.error(`Birthday getBirthday failed: ${err.message}`);
    return null;
  }
}

/**
 * List upcoming birthdays (sorted by next occurrence from today).
 * @param {string} guildId - Guild ID
 * @param {number} [limit=10] - Max results
 * @returns {Promise<Array<object>>} Birthdays sorted by next occurrence
 */
async function listUpcoming(guildId, limit = 10) {
  try {
    const all = await Birthday.findAll({ where: { guild_id: guildId } });
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    // Compute days until next occurrence for each birthday
    const withDaysUntil = all.map((b) => {
      const month = b.birth_month;
      const day = b.birth_day;
      // Next occurrence year
      let year = now.getFullYear();
      // If birthday already passed this year, use next year
      if (month < currentMonth || (month === currentMonth && day < currentDay)) {
        year = now.getFullYear() + 1;
      }
      const nextDate = new Date(year, month - 1, day);
      const diffMs = nextDate.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { birthday: b, daysUntil, nextDate };
    });

    withDaysUntil.sort((a, b) => a.daysUntil - b.daysUntil);
    return withDaysUntil.slice(0, limit);
  } catch (err) {
    logger.error(`Birthday listUpcoming failed: ${err.message}`);
    return [];
  }
}

/**
 * Check today's birthdays and announce them in the birthday channel.
 * @param {object} client - Discord client
 */
async function checkTodaysBirthdays(client) {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const birthdays = await Birthday.findAll({
      where: { birth_month: month, birth_day: day },
    });

    if (birthdays.length === 0) return;

    for (const b of birthdays) {
      const guild = client.guilds.cache.get(String(b.guild_id));
      if (!guild) continue;

      const guildRow = await Guild.findByPk(b.guild_id);
      const channelId = guildRow?.birthday_channel_id;
      const roleId = guildRow?.birthday_role_id;

      let channel = null;
      if (channelId) {
        channel = guild.channels.cache.get(String(channelId));
      }

      // Assign birthday role if configured
      let roleAssigned = false;
      if (roleId) {
        const member = await guild.members.fetch(String(b.user_id)).catch(() => null);
        if (member) {
          const role = guild.roles.cache.get(String(roleId));
          if (role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role).catch((e) => {
              logger.warn(`Birthday: failed to assign role to ${b.user_id}: ${e.message}`);
            });
            roleAssigned = true;
          }
        }
      }

      // Send announcement
      if (channel) {
        const embed = baseEmbed({
          title: 'Compleanno!',
          description: `:tada: Oggi è il compleanno di <@${b.user_id}>!\n\nAuguri da tutta la community! :birthday:`,
          footer: { text: 'Bloods Community • Buon compleanno!' },
        });
        await channel.send({ content: `<@${b.user_id}>`, embeds: [embed] }).catch(() => {});
      }

      logger.info(`Birthday announced for user ${b.user_id} in guild ${b.guild_id} (role: ${roleAssigned}).`);
    }
  } catch (err) {
    logger.error(`Birthday checkTodaysBirthdays failed: ${err.message}`);
  }
}

/**
 * Start the birthday scheduler (daily at 9:00 AM server time).
 * @param {object} client - Discord client
 */
function start(client) {
  // Cron: every day at 09:00
  _task = cron.schedule('0 9 * * *', () => checkTodaysBirthdays(client), {
    timezone: 'Europe/Rome',
  });
  logger.info('BirthdayService: started (daily at 09:00 Europe/Rome).');
}

/**
 * Stop the birthday scheduler.
 */
function stop() {
  if (_task) _task.stop();
  _task = null;
  logger.info('BirthdayService: stopped.');
}

module.exports = {
  setBirthday,
  removeBirthday,
  getBirthday,
  listUpcoming,
  checkTodaysBirthdays,
  start,
  stop,
};
