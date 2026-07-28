// src/utils/embed.js
// Shared embed helpers for consistent branding.
const { EmbedBuilder } = require('discord.js');

const BRAND_COLOR = 0x8b0000; // Bloods dark-red brand

function baseEmbed({ title, description, color, thumbnail, footer } = {}) {
  const embed = new EmbedBuilder()
    .setColor(color ?? BRAND_COLOR)
    .setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (footer) embed.setFooter({ text: footer.text, iconURL: footer.iconURL });
  return embed;
}

function errorEmbed(message) {
  return baseEmbed({
    title: 'Errore',
    description: `:x: ${message}`,
    color: 0xed4245,
  });
}

function successEmbed(message) {
  return baseEmbed({
    title: 'Operazione completata',
    description: `:white_check_mark: ${message}`,
    color: 0x57f287,
  });
}

module.exports = { baseEmbed, errorEmbed, successEmbed, BRAND_COLOR };
