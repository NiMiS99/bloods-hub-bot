// src/ui/eventInteractions.js
// Handles button interactions for events (join/leave).
const { EventParticipant, CommunityEvent } = require('../db');
const { successEmbed, errorEmbed, baseEmbed } = require('../utils/embed');
const _logger = require('../utils/logger');

async function handleButton(interaction, client, action, rest) {
  // action === 'join' or 'leave', rest[0] === eventId
  const eventId = parseInt(rest[0], 10);
  if (!eventId) {
    return interaction.reply({ embeds: [errorEmbed('ID evento non valido.')], flags: 64 });
  }

  const event = await CommunityEvent.findByPk(eventId);
  if (!event || !event.is_active || event.guild_id !== interaction.guild.id) {
    return interaction.reply({ embeds: [errorEmbed('Evento non trovato o non più attivo.')], flags: 64 });
  }

  if (action === 'join') {
    const [_participant, created] = await EventParticipant.findOrCreate({
      where: { event_id: eventId, user_id: interaction.user.id },
      defaults: { event_id: eventId, user_id: interaction.user.id, guild_id: interaction.guild.id },
    });
    if (created) {
      const count = await EventParticipant.count({ where: { event_id: eventId } });
      await interaction.reply({ embeds: [successEmbed(`Ti sei iscritto a **${event.name}**! Partecipanti: ${count}`)], flags: 64 });
    } else {
      await interaction.reply({ embeds: [errorEmbed('Sei già iscritto a questo evento.')], flags: 64 });
    }
  } else if (action === 'leave') {
    const deleted = await EventParticipant.destroy({
      where: { event_id: eventId, user_id: interaction.user.id },
    });
    if (deleted > 0) {
      await interaction.reply({ embeds: [baseEmbed({ description: `Ti sei disiscritto da **${event.name}**.`, color: 0x95a5a6 })], flags: 64 });
    } else {
      await interaction.reply({ embeds: [errorEmbed('Non eri iscritto a questo evento.')], flags: 64 });
    }
  }
}

module.exports = { handleButton };
