// src/services/captchaService.js
// Simple math captcha for verification — anti-bot measure.
// Generates a math problem that the user must solve before being verified.
const { ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');
const _logger = require('../utils/logger');

// In-memory store: userId -> { question, answer, expiresAt }
const _pending = new Map();
const CAPTCHA_TTL_MS = 120000; // 2 minutes to solve

/**
 * Generate a random math captcha.
 */
function generateCaptcha() {
  const operations = [
    () => {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      return { question: `Quanto fa **${a} + ${b}**?`, answer: a + b };
    },
    () => {
      const a = Math.floor(Math.random() * 10) + 5;
      const b = Math.floor(Math.random() * 5) + 1;
      return { question: `Quanto fa **${a} - ${b}**?`, answer: a - b };
    },
    () => {
      const a = Math.floor(Math.random() * 5) + 2;
      const b = Math.floor(Math.random() * 5) + 2;
      return { question: `Quanto fa **${a} × ${b}**?`, answer: a * b };
    },
  ];
  return operations[Math.floor(Math.random() * operations.length)]();
}

/**
 * Start captcha verification for a user.
 * Sends a modal with the math question.
 */
async function startCaptcha(interaction, _client) {
  const captcha = generateCaptcha();
  _pending.set(interaction.user.id, {
    question: captcha.question,
    answer: captcha.answer,
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
  });

  const modal = new ModalBuilder()
    .setCustomId('captcha:modal')
    .setTitle('Verifica Anti-Bot');

  const input = new TextInputBuilder()
    .setCustomId('captcha:answer')
    .setLabel(captcha.question)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Inserisci la risposta (solo numeri)')
    .setRequired(true)
    .setMaxLength(3);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Verify captcha answer from modal submission.
 */
async function verifyCaptcha(interaction, _client) {
  const pending = _pending.get(interaction.user.id);

  if (!pending) {
    return { success: false, error: 'Nessuna verifica in corso. Riprova cliccando Verifica.' };
  }

  if (Date.now() > pending.expiresAt) {
    _pending.delete(interaction.user.id);
    return { success: false, error: 'Tempo scaduto. Riprova cliccando Verifica.' };
  }

  const userAnswer = parseInt(interaction.fields.getTextInputValue('captcha:answer'), 10);
  _pending.delete(interaction.user.id);

  if (isNaN(userAnswer) || userAnswer !== pending.answer) {
    return { success: false, error: `Risposta errata. La risposta corretta era ${pending.answer}. Riprova.` };
  }

  return { success: true };
}

/**
 * Clean expired captchas.
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of _pending) {
    if (now > value.expiresAt) _pending.delete(key);
  }
}

// Auto cleanup every 5 minutes
setInterval(cleanupExpired, 300000);

module.exports = { startCaptcha, verifyCaptcha, generateCaptcha };
