// src/ui/lfgInteractions.js
// Handles LFG button interactions (join/leave/close) using persistent DB sessions.
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const {
  getSession, joinSession, leaveSession, closeSession,
  buildLfgEmbed, buildLfgButtons,
} = require('../services/lfgService');
const logger = require('../utils/logger');

async function handleButton(interaction, client, action, rest) {
  const session = await getSession(interaction.message.id);

  if (!session) {
    return interaction.reply({ embeds: [errorEmbed('Questa sessione LFG è scaduta o non trovata.')], flags: 64 });
  }

  if (action === 'join') {
    const result = await joinSession(interaction.message.id, interaction.user.id);
    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: 64 });
    }
    await interaction.message.edit({
      embeds: [buildLfgEmbed(result.session, interaction.guild)],
      components: [buildLfgButtons(result.session)],
    }).catch(() => {});
    await interaction.reply({ content: `Ti sei unito a **${session.game_name}**! 🎮`, flags: 64 });

    // Update daily challenge progress
    const { updateProgress } = require('../services/challengeService');
    await updateProgress(interaction.user.id, interaction.guild.id, 'lfg_join', 1).catch(() => {});

    // Notify captain if session is now full
    if (result.session.status === 'full') {
      try {
        const captain = await interaction.guild.members.fetch(session.captain_id).catch(() => null);
        if (captain) {
          await captain.send({
            content: `🎮 La tua sessione LFG per **${session.game_name}** è ora **completa**! Tutti i posti sono occupati.`,
          }).catch(() => {});
        }
      } catch {}
    }
  } else if (action === 'leave') {
    const result = await leaveSession(interaction.message.id, interaction.user.id);
    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: 64 });
    }
    if (result.closed) {
      await interaction.message.edit({ components: [] }).catch(() => {});
      await interaction.reply({ content: `Sessione **${session.game_name}** chiusa (il capitano ha lasciato).`, flags: 64 });
    } else {
      await interaction.message.edit({
        embeds: [buildLfgEmbed(result.session, interaction.guild)],
        components: [buildLfgButtons(result.session)],
      }).catch(() => {});
      await interaction.reply({ content: `Hai lasciato la sessione **${session.game_name}**.`, flags: 64 });
    }
  } else if (action === 'close') {
    if (interaction.user.id !== session.captain_id && !isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo il capitano o un admin può chiudere la sessione.')], flags: 64 });
    }
    const result = await closeSession(interaction.message.id, interaction.user.id);
    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: 64 });
    }
    await interaction.message.edit({ components: [] }).catch(() => {});
    await interaction.reply({ content: `Sessione **${session.game_name}** chiusa. Buon divertimento! 🎮`, flags: 64 });
  }
}

module.exports = { handleButton };
