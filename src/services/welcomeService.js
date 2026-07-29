// src/services/welcomeService.js
// Generates welcome card images and sends welcome messages.
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const _path = require('path');
const logger = require('../utils/logger');

// Brand colors
const _BG_COLOR = '#0a0a12';
const CARD_GRADIENT_TOP = '#1a0a0a';
const CARD_GRADIENT_BOT = '#0a0a12';
const ACCENT = '#8b0000';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#aab2c5';

/**
 * Generate a welcome card image for a new member.
 * @param {object} member - Discord GuildMember
 * @param {string} guildName - Guild name
 * @param {number} memberCount - Total member count
 * @returns {Promise<AttachmentBuilder>} - Image attachment
 */
async function generateWelcomeCard(member, guildName, memberCount) {
  const width = 800;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, CARD_GRADIENT_TOP);
  grad.addColorStop(1, CARD_GRADIENT_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Accent bar on left
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, 6, height);

  // Avatar circle
  const avatarX = 110;
  const avatarY = 125;
  const avatarR = 60;

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();

    // Avatar border
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR + 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (err) {
    logger.warn(`Welcome card: failed to load avatar: ${err.message}`);
    // Draw placeholder circle
    ctx.fillStyle = '#2a2a3e';
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fill();
  }

  // "BENVENUTO" title
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = 'bold 32px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('BENVENUTO', 210, 75);

  // Username
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 28px sans-serif';
  const username = member.user.globalName || member.user.username;
  ctx.fillText(username, 210, 115);

  // Guild name
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = '20px sans-serif';
  ctx.fillText(`in ${guildName}`, 210, 150);

  // Member count
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = '16px sans-serif';
  ctx.fillText(`Sei il membro #${memberCount}`, 210, 185);

  const buffer = await canvas.toBuffer('png');
  return new AttachmentBuilder(buffer, { name: 'welcome.png' });
}

/**
 * Send welcome message to the configured channel.
 * @param {object} member - Discord GuildMember
 * @param {object} guildRow - Guild DB row with welcome settings
 */
async function sendWelcome(member, guildRow) {
  if (!guildRow || !guildRow.welcome_enabled) return;
  if (!guildRow.welcome_channel_id) return;

  const channel = member.guild.channels.cache.get(guildRow.welcome_channel_id);
  if (!channel) return;

  try {
    const content = (guildRow.welcome_message || 'Benvenuto {user} in **{server}**!')
      .replace('{user}', `<@${member.id}>`)
      .replace('{server}', member.guild.name)
      .replace('{count}', member.guild.memberCount.toString());

    if (guildRow.welcome_image_enabled) {
      const attachment = await generateWelcomeCard(member, member.guild.name, member.guild.memberCount);
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle(`Benvenuto ${member.user.username}!`)
        .setDescription(
          `Ciao <@${member.id}>! Sei il **membro #${member.guild.memberCount}** di **${member.guild.name}**!\n\n` +
          `**Prossimi passi:**\n` +
          `1. Clicca **Verifica** in <#${guildRow.welcome_channel_id}>\n` +
          `2. Leggi il regolamento\n` +
          `3. Seleziona i tuoi giochi in #selezione-giochi\n` +
          `4. Esplora i canali della community!\n\n` +
          `Buon divertimento! 🎮`
        )
        .setImage('attachment://welcome.png')
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `Membro dal ${new Date().toLocaleDateString('it-IT')}` });
      await channel.send({ content, embeds: [embed], files: [attachment] });
    } else {
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle(`Benvenuto ${member.user.username}!`)
        .setDescription(content)
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `Membro #${member.guild.memberCount}` });
      await channel.send({ embeds: [embed] });
    }

    logger.info(`Welcome sent for ${member.user.username} in ${member.guild.name}`);
  } catch (err) {
    logger.error(`Welcome send failed: ${err.message}`);
  }
}

module.exports = { generateWelcomeCard, sendWelcome };
