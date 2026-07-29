// src/services/challengeService.js
// Daily and weekly challenges with streak tracking and XP rewards.
const { DailyChallenge, UserStreak, User } = require('../db');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Challenge templates — randomly assigned
const DAILY_CHALLENGES = [
  { type: 'voice', desc: 'Trascorri 30 minuti in un canale vocale', target: 30, rewardXp: 50, metric: 'voice_seconds', divisor: 60 },
  { type: 'messages', desc: 'Invia 20 messaggi in chat', target: 20, rewardXp: 40, metric: 'message', divisor: 1 },
  { type: 'lfg', desc: 'Crea o unisciti a 1 sessione LFG', target: 1, rewardXp: 60, metric: 'lfg_join', divisor: 1 },
  { type: 'reactions', desc: 'Reagisci a 10 messaggi', target: 10, rewardXp: 30, metric: 'reaction', divisor: 1 },
  { type: 'voice_game', desc: 'Trascorri 20 minuti in un canale vocale di gioco', target: 20, rewardXp: 70, metric: 'voice_seconds_game', divisor: 60 },
  { type: 'messages_game', desc: 'Invia 5 messaggi in un canale di gioco', target: 5, rewardXp: 45, metric: 'message_game', divisor: 1 },
];

const WEEKLY_CHALLENGES = [
  { type: 'voice', desc: 'Trascorri 3 ore in canale vocale questa settimana', target: 180, rewardXp: 200, metric: 'voice_seconds', divisor: 60 },
  { type: 'messages', desc: 'Invia 100 messaggi questa settimana', target: 100, rewardXp: 150, metric: 'message', divisor: 1 },
  { type: 'lfg', desc: 'Partecipa a 3 sessioni LFG questa settimana', target: 3, rewardXp: 250, metric: 'lfg_join', divisor: 1 },
  { type: 'streak', desc: 'Completa le sfide daily per 5 giorni di fila', target: 5, rewardXp: 300, metric: 'daily_completed', divisor: 1 },
];

/**
 * Assign daily challenges to a user (if not already assigned today).
 */
async function assignDailyChallenges(userId, guildId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if already assigned today
  const existing = await DailyChallenge.count({
    where: {
      user_id: userId,
      guild_id: guildId,
      scope: 'daily',
      assigned_at: { [Op.gte]: today },
    },
  });

  if (existing >= 2) return []; // Already assigned

  // Pick 2 random daily challenges
  const shuffled = [...DAILY_CHALLENGES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 2);
  const created = [];

  for (const tmpl of selected) {
    const challenge = await DailyChallenge.create({
      guild_id: guildId,
      user_id: userId,
      challenge_type: tmpl.type,
      challenge_desc: tmpl.desc,
      target_amount: tmpl.target,
      current_amount: 0,
      reward_xp: tmpl.rewardXp,
      scope: 'daily',
      status: 'active',
      assigned_at: new Date(),
      expires_at: tomorrow,
    });
    created.push(challenge);
  }

  return created;
}

/**
 * Assign weekly challenges (if not already assigned this week).
 */
async function assignWeeklyChallenges(userId, guildId) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const existing = await DailyChallenge.count({
    where: {
      user_id: userId,
      guild_id: guildId,
      scope: 'weekly',
      assigned_at: { [Op.gte]: weekStart },
    },
  });

  if (existing >= 1) return [];

  const tmpl = WEEKLY_CHALLENGES[Math.floor(Math.random() * WEEKLY_CHALLENGES.length)];
  const challenge = await DailyChallenge.create({
    guild_id: guildId,
    user_id: userId,
    challenge_type: tmpl.type,
    challenge_desc: tmpl.desc,
    target_amount: tmpl.target,
    current_amount: 0,
    reward_xp: tmpl.rewardXp,
    scope: 'weekly',
    status: 'active',
    assigned_at: new Date(),
    expires_at: weekEnd,
  });

  return [challenge];
}

/**
 * Get active challenges for a user.
 */
async function getActiveChallenges(userId, guildId) {
  return DailyChallenge.findAll({
    where: {
      user_id: userId,
      guild_id: guildId,
      status: 'active',
      expires_at: { [Op.gt]: new Date() },
    },
    order: [['scope', 'DESC'], ['assigned_at', 'DESC']],
  });
}

/**
 * Update challenge progress based on activity.
 */
async function updateProgress(userId, guildId, metric, amount = 1) {
  const challenges = await DailyChallenge.findAll({
    where: {
      user_id: userId,
      guild_id: guildId,
      status: 'active',
      expires_at: { [Op.gt]: new Date() },
    },
  });

  for (const ch of challenges) {
    const tmpl = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].find((t) => t.desc === ch.challenge_desc);
    if (tmpl && tmpl.metric === metric) {
      ch.current_amount = Math.min(ch.target_amount, ch.current_amount + amount);
      if (ch.current_amount >= ch.target_amount) {
        ch.status = 'completed';
        ch.completed_at = new Date();
        // Award XP
        try {
          const { awardXp } = require('./xpService');
          const [user] = await User.findOrCreate({
            where: { user_id: userId, guild_id: guildId },
            defaults: { user_id: userId, guild_id: guildId },
          });
          await awardXp(user, ch.reward_xp);
        } catch {}
        // Update streak if daily
        if (ch.scope === 'daily') {
          await updateStreak(userId, guildId);
        }
      }
      await ch.save();
    }
  }
}

/**
 * Update daily completion streak.
 */
async function updateStreak(userId, guildId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let streak = await UserStreak.findOne({
    where: { user_id: userId, guild_id: guildId, streak_type: 'daily' },
  });

  if (!streak) {
    streak = await UserStreak.create({
      user_id: userId,
      guild_id: guildId,
      streak_type: 'daily',
      current_streak: 1,
      longest_streak: 1,
      last_claimed_at: today,
      total_claimed: 1,
    });
    return streak;
  }

  const lastClaimed = streak.last_claimed_at ? new Date(streak.last_claimed_at) : null;
  if (lastClaimed) {
    lastClaimed.setHours(0, 0, 0, 0);
    if (lastClaimed.getTime() === yesterday.getTime()) {
      streak.current_streak += 1;
    } else if (lastClaimed.getTime() === today.getTime()) {
      // Already claimed today — don't increment
      return streak;
    } else {
      streak.current_streak = 1; // Reset
    }
  } else {
    streak.current_streak = 1;
  }

  streak.longest_streak = Math.max(streak.longest_streak, streak.current_streak);
  streak.last_claimed_at = today;
  streak.total_claimed += 1;
  await streak.save();

  // Bonus XP for streak milestones
  if (streak.current_streak === 7 || streak.current_streak === 14 || streak.current_streak === 30) {
    try {
      const { awardXp } = require('./xpService');
      const [user] = await User.findOrCreate({
        where: { user_id: userId, guild_id: guildId },
        defaults: { user_id: userId, guild_id: guildId },
      });
      const bonus = streak.current_streak === 30 ? 500 : streak.current_streak === 14 ? 200 : 100;
      await awardXp(user, bonus);
      logger.info(`Streak bonus: ${userId} reached ${streak.current_streak} days (+${bonus} XP)`);
    } catch {}
  }

  return streak;
}

/**
 * Get streak info for a user.
 */
async function getStreak(userId, guildId) {
  let streak = await UserStreak.findOne({
    where: { user_id: userId, guild_id: guildId, streak_type: 'daily' },
  });
  if (!streak) {
    streak = { current_streak: 0, longest_streak: 0, total_claimed: 0 };
  }
  return streak;
}

/**
 * Expire old challenges (called by scheduler).
 */
async function expireOldChallenges() {
  const expired = await DailyChallenge.update(
    { status: 'expired' },
    { where: { status: 'active', expires_at: { [Op.lt]: new Date() } } }
  );
  return expired[0];
}

module.exports = {
  assignDailyChallenges,
  assignWeeklyChallenges,
  getActiveChallenges,
  updateProgress,
  updateStreak,
  getStreak,
  expireOldChallenges,
  DAILY_CHALLENGES,
  WEEKLY_CHALLENGES,
};
