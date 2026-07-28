// src/ui/lfgInteractions.js
// Handles LFG button interactions (join/leave/full).
const { PermissionsBitField } = require('discord.js');
const { lfgSessions } = require('../commands/lfg');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const logger = require('../utils/logger');

async function handleButton(interaction, client, action, rest) {
  const session = lfgSessions.get(interaction.message.id);
  if (!session) {
    return interaction.reply({ embeds: [errorEmbed('Questa sessione LFG è scaduta.')], flags: 64 });
  }

  if (action === 'join') {
    if (session.participants.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Sei già in questa sessione.')], flags: 64 });
    }
    if (session.participants.length >= session.slots) {
      return interaction.reply({ embeds: [errorEmbed('La sessione è piena!')], flags: 64 });
    }
    session.participants.push(interaction.user.id);
    await _updateMessage(interaction, session);
    await interaction.reply({ content: `Ti sei unito a **${session.game}**!`, flags: 64 });
  } else if (action === 'leave') {
    if (interaction.user.id === session.captain) {
      return interaction.reply({ embeds: [errorEmbed('Il capitano non può lasciare. Usa "Completo" per chiudere.')], flags: 64 });
    }
    if (!session.participants.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Non sei in questa sessione.')], flags: 64 });
    }
    session.participants = session.participants.filter((id) => id !== interaction.user.id);
    await _updateMessage(interaction, session);
    await interaction.reply({ content: `Hai lasciato la sessione **${session.game}**.`, flags: 64 });
  } else if (action === 'full') {
    if (interaction.user.id !== session.captain && !isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo il capitano o un admin può chiudere la sessione.')], flags: 64 });
    }
    lfgSessions.delete(interaction.message.id);
    await interaction.message.edit({ components: [] }).catch(() => {});
    await interaction.reply({ content: `Sessione **${session.game}** chiusa. Buon divertimento!`, flags: 64 });
  }
}

async function _updateMessage(interaction, session) {
  const embed = baseEmbed({
    title: `🎮 LFG: ${session.game}`,
    description:
      `**Modalità:** ${session.mode}\n` +
      `**Posti:** ${session.participants.length}/${session.slots} ${session.participants.length >= session.slots ? '(PIENO)' : ''}\n` +
      (session.notes ? `**Note:** ${session.notes}\n` : '') +
      `\n**Capitano:** <@${session.captain}>\n\n` +
      `**Partecipanti:**\n${session.participants.map((id) => `• <@${id}>${id === session.captain ? ' (capitano)' : ''}`).join('\n')}`,
    color: session.participants.length >= session.slots ? 0xed4245 : 0x57f287,
    footer: { text: 'Clicca "Unisciti" per partecipare' },
  });
  await interaction.message.edit({ embeds: [embed] }).catch(() => {});
}

module.exports = { handleButton };
