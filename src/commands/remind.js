// src/commands/remind.js
// /remind — set a personal reminder that the bot sends after a delay.
const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embed');
const reminderService = require('../services/reminderService');

/**
 * Parse a duration string like "1h30m", "2d", "10m", "45s", "1d6h".
 * Supports: d (days), h (hours), m (minutes), s (seconds).
 * @param {string} str
 * @returns {number|null} Duration in milliseconds, or null if invalid
 */
function parseDuration(str) {
  const match = str.match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return null;
  const [, d, h, m, s] = match;
  const total =
    (parseInt(d) || 0) * 86400 +
    (parseInt(h) || 0) * 3600 +
    (parseInt(m) || 0) * 60 +
    (parseInt(s) || 0);
  return total > 0 ? total * 1000 : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Imposta un promemoria che il bot ti invierà dopo il tempo specificato.')
    .addStringOption((o) =>
      o.setName('time')
        .setDescription('Tempo (es. 1h30m, 2d, 10m, 45s). Massimo 30 giorni.')
        .setRequired(true).setMaxLength(100))
    .addStringOption((o) =>
      o.setName('message')
        .setDescription('Il messaggio del promemoria.')
        .setRequired(true).setMaxLength(4000)),

  async execute(interaction) {
    const timeStr = interaction.options.getString('time');
    const message = interaction.options.getString('message');

    const durationMs = parseDuration(timeStr);
    if (!durationMs) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Formato tempo non valido. Usa formati come: `1h30m`, `2d`, `10m`, `45s`.\n' +
          'Unità supportate: `d` (giorni), `h` (ore), `m` (minuti), `s` (secondi).'
        )],
        flags: 64,
      });
    }

    // Max 30 days
    const MAX_DURATION = 30 * 24 * 60 * 60 * 1000;
    if (durationMs > MAX_DURATION) {
      return interaction.reply({
        embeds: [errorEmbed('La durata massima di un promemoria è 30 giorni.')],
        flags: 64,
      });
    }

    // Min 10 seconds
    if (durationMs < 10000) {
      return interaction.reply({
        embeds: [errorEmbed('La durata minima di un promemoria è 10 secondi.')],
        flags: 64,
      });
    }

    // Limit message length
    if (message.length > 1500) {
      return interaction.reply({
        embeds: [errorEmbed('Il messaggio del promemoria non può superare i 1500 caratteri.')],
        flags: 64,
      });
    }

    const remindAt = new Date(Date.now() + durationMs);
    const remindTimestamp = Math.floor(remindAt.getTime() / 1000);

    const reminder = await reminderService.addReminder(
      interaction.guild.id,
      interaction.user.id,
      interaction.channel.id,
      message,
      remindAt
    );

    if (!reminder) {
      return interaction.reply({
        embeds: [errorEmbed('Impossibile creare il promemoria. Riprova più tardi.')],
        flags: 64,
      });
    }

    // Human-readable duration
    const totalSec = Math.floor(durationMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts = [];
    if (d > 0) parts.push(`${d} giorn${d === 1 ? 'o' : 'i'}`);
    if (h > 0) parts.push(`${h} or${h === 1 ? 'a' : 'e'}`);
    if (m > 0) parts.push(`${m} minut${m === 1 ? 'o' : 'i'}`);
    if (s > 0) parts.push(`${s} second${s === 1 ? 'o' : 'i'}`);
    const humanDuration = parts.join(', ') || '0 secondi';

    return interaction.reply({
      embeds: [successEmbed(
        `Promemoria impostato!\n\n` +
        `**Messaggio:** ${message}\n` +
        `**Tra:** ${humanDuration}\n` +
        `**Quando:** <t:${remindTimestamp}:F> (<t:${remindTimestamp}:R>)\n` +
        `**ID:** #${reminder.id}\n\n` +
        `Ti invierò il promemoria in questo canale al momento giusto.`
      )],
      flags: 64,
    });
  },
};
