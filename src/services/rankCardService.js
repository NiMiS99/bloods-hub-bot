// src/services/rankCardService.js
// Generates a rank card image using @napi-rs/canvas.
// Shows: avatar, username, level, XP, progress bar, rank position.
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { User } = require('../db');
const { xpToNextLevel, xpForLevel } = require('./xpService');
const logger = require('../utils/logger');

const CARD_WIDTH = 900;
const CARD_HEIGHT = 280;
const BRAND_COLOR = '#8b0000';
const ACCENT_COLOR = '#ff4444';
const BG_COLOR = '#1a1a1a';
const TEXT_COLOR = '#ffffff';
const TEXT_MUTED = '#aaaaaa';

/**
 * Round a rectangle path (for rounded rectangles).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r - Radius
 */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Get the guild rank position for a user (by XP, descending).
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
async function getRankPosition(guildId, userId) {
  try {
    const allUsers = await User.findAll({
      where: { guild_id: guildId },
      order: [['xp', 'DESC']],
      attributes: ['user_id'],
    });
    const pos = allUsers.findIndex((u) => String(u.user_id) === String(userId));
    return pos >= 0 ? pos + 1 : 0;
  } catch (err) {
    logger.error(`RankCard getRankPosition failed: ${err.message}`);
    return 0;
  }
}

/**
 * Generate a rank card image for a user.
 * @param {object} guild - Discord Guild
 * @param {object} targetUser - Discord User (the target)
 * @param {object} [member] - Discord GuildMember (optional, for display name / color)
 * @returns {Promise<Buffer|null>} PNG image buffer, or null on failure
 */
async function generateRankCard(guild, targetUser, member) {
  try {
    const user = await User.findOne({
      where: { user_id: targetUser.id, guild_id: guild.id },
    });

    // If user not in DB, use defaults (level 0, 0 XP)
    const xp = user?.xp || 0;
    const { currentLevel, nextLevel, progress: _progress } = xpToNextLevel(xp);
    const xpForCurrent = xpForLevel(currentLevel);
    const xpForNext = xpForLevel(nextLevel);
    const xpRange = xpForNext - xpForCurrent;
    const progressPct = xpRange > 0 ? Math.round(((xp - xpForCurrent) / xpRange) * 100) : 0;

    const rankPos = await getRankPosition(guild.id, targetUser.id);

    // Display name: member displayName > user username
    const displayName = member?.displayName || targetUser.username || 'Utente';

    // Member role color (if any)
    const roleColor = member?.displayHexColor && member.displayHexColor !== '#000000'
      ? member.displayHexColor
      : ACCENT_COLOR;

    // Create canvas
    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    // --- Background ---
    ctx.fillStyle = BG_COLOR;
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 20);
    ctx.fill();

    // Subtle brand accent bar on the left
    ctx.fillStyle = BRAND_COLOR;
    roundRect(ctx, 0, 0, 12, CARD_HEIGHT, 6);
    ctx.fill();

    // --- Avatar ---
    const avatarSize = 180;
    const avatarX = 40;
    const avatarY = (CARD_HEIGHT - avatarSize) / 2;

    try {
      const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png' });
      const avatar = await loadImage(avatarUrl);

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Avatar border ring
      ctx.strokeStyle = roleColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      // Fallback: draw a placeholder circle
      ctx.fillStyle = '#333333';
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Text area ---
    const textX = avatarX + avatarSize + 40;
    const textWidth = CARD_WIDTH - textX - 40;

    // Username
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 42px sans-serif';
    ctx.textBaseline = 'top';
    let name = displayName;
    // Truncate if too long
    while (ctx.measureText(name).width > textWidth && name.length > 3) {
      name = name.slice(0, -1);
    }
    if (name !== displayName) name = name.slice(0, -1) + '…';
    ctx.fillText(name, textX, 40);

    // Level + Rank
    ctx.fillStyle = roleColor;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`Livello ${currentLevel}`, textX, 95);

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '24px sans-serif';
    const levelText = `Livello ${currentLevel}`;
    const levelWidth = ctx.measureText(levelText).width;
    ctx.fillText(`• Classifica #${rankPos || '?'}`, textX + levelWidth + 12, 98);

    // --- XP progress bar ---
    const barX = textX;
    const barY = 160;
    const barWidth = textWidth;
    const barHeight = 28;

    // Bar background
    ctx.fillStyle = '#333333';
    roundRect(ctx, barX, barY, barWidth, barHeight, 14);
    ctx.fill();

    // Bar fill
    const fillWidth = Math.max(barHeight, (progressPct / 100) * barWidth);
    ctx.fillStyle = roleColor;
    roundRect(ctx, barX, barY, fillWidth, barHeight, 14);
    ctx.fill();

    // XP text on bar
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 18px sans-serif';
    ctx.textBaseline = 'middle';
    const xpText = `${xp.toLocaleString('it-IT')} / ${xpForNext.toLocaleString('it-IT')} XP`;
    const xpTextWidth = ctx.measureText(xpText).width;
    ctx.fillText(xpText, barX + (barWidth - xpTextWidth) / 2, barY + barHeight / 2 + 1);

    // Progress percentage below
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '18px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`${progressPct}% al livello ${nextLevel}`, textX, barY + barHeight + 12);

    // --- Footer ---
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Bloods Community', CARD_WIDTH - 160, CARD_HEIGHT - 16);

    return canvas.toBuffer('image/png');
  } catch (err) {
    logger.error(`RankCard generateRankCard failed: ${err.message}`);
    return null;
  }
}

module.exports = {
  generateRankCard,
  getRankPosition,
};
