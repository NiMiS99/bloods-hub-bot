// src/services/reputationService.js
// Reputation system — users can thank each other, building reputation points.
const { Reputation, User } = require('../db');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const COOLDOWN_MS = 3600000; // 1 hour between thanks to same user
const DAILY_LIMIT = 5; // Max 5 thanks per day
const _cooldowns = new Map(); // key: fromId:toId -> timestamp

// Cleanup expired cooldowns every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of _cooldowns) {
    if (now - ts > COOLDOWN_MS) _cooldowns.delete(key);
  }
}, 600000).unref();

/**
 * Thank a user — adds reputation.
 */
async function thankUser(fromId, toId, guildId, reason = '') {
  if (fromId === toId) return { error: 'Non puoi ringraziare te stesso.' };

  // Check cooldown
  const key = `${fromId}:${toId}`;
  const lastTime = _cooldowns.get(key);
  if (lastTime && Date.now() - lastTime < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastTime)) / 60000);
    return { error: `Devi aspettare ${remaining} minuti prima di ringraziare di nuovo questa persona.` };
  }

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await Reputation.count({
    where: { from_user_id: fromId, guild_id: guildId, created_at: { [Op.gte]: today } },
  });
  if (todayCount >= DAILY_LIMIT) {
    return { error: `Hai raggiunto il limite di ${DAILY_LIMIT} ringraziamenti giornalieri.` };
  }

  // Create reputation record
  const rep = await Reputation.create({
    guild_id: guildId,
    from_user_id: fromId,
    to_user_id: toId,
    reason,
    amount: 1,
  });

  _cooldowns.set(key, Date.now());

  // Award XP to the thanked user
  try {
    const { awardXp } = require('./xpService');
    const [user] = await User.findOrCreate({
      where: { user_id: toId, guild_id: guildId },
      defaults: { user_id: toId, guild_id: guildId },
    });
    await awardXp(user, 15); // 15 XP per thank
  } catch {}

  // Get total reputation
  const totalRep = await Reputation.sum('amount', {
    where: { to_user_id: toId, guild_id: guildId },
  }) || 0;

  logger.info(`Reputation: ${fromId} thanked ${toId} (total: ${totalRep})`);
  return { success: true, totalRep, rep };
}

/**
 * Get reputation for a user.
 */
async function getReputation(userId, guildId) {
  const received = await Reputation.sum('amount', {
    where: { to_user_id: userId, guild_id: guildId },
  }) || 0;
  const given = await Reputation.sum('amount', {
    where: { from_user_id: userId, guild_id: guildId },
  }) || 0;
  const recent = await Reputation.findAll({
    where: { to_user_id: userId, guild_id: guildId },
    order: [['created_at', 'DESC']],
    limit: 5,
    raw: true,
  });
  return { received, given, recent };
}

/**
 * Get top reputation users.
 */
async function getTopReputation(guildId, limit = 10) {
  const results = await Reputation.findAll({
    where: { guild_id: guildId },
    attributes: [
      'to_user_id',
      [User.sequelize.fn('SUM', User.sequelize.col('amount')), 'total'],
    ],
    group: ['to_user_id'],
    order: [[User.sequelize.literal('total'), 'DESC']],
    limit,
    raw: true,
  });
  return results;
}

module.exports = { thankUser, getReputation, getTopReputation, COOLDOWN_MS, DAILY_LIMIT };
