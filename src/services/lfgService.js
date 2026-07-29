// src/services/lfgService.js
// Persistent LFG (Looking For Group) service with DB backing.
const { LfgSession } = require('../db');
const logger = require('../utils/logger');

const DEFAULT_EXPIRY_HOURS = 4;

/**
 * Create a new LFG session.
 */
async function createSession({
  guildId, messageId, channelId, captainId,
  gameName, gameCode, mode, slots, notes,
}) {
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3600000);
  return LfgSession.create({
    guild_id: guildId,
    message_id: messageId,
    channel_id: channelId,
    captain_id: captainId,
    game_name: gameName,
    game_code: gameCode,
    mode,
    slots,
    notes,
    participants: [captainId.toString()],
    status: 'open',
    expires_at: expiresAt,
  });
}

/**
 * Get session by message ID.
 */
async function getSession(messageId) {
  return LfgSession.findOne({ where: { message_id: messageId } });
}

/**
 * Join a session.
 */
async function joinSession(messageId, userId) {
  const session = await getSession(messageId);
  if (!session) return { error: 'Sessione non trovata.' };
  if (session.status === 'closed' || session.status === 'expired') return { error: 'Sessione chiusa.' };
  if (session.status === 'full') return { error: 'Sessione piena.' };

  const participants = session.participants || [];
  if (participants.includes(userId.toString())) {
    return { error: 'Sei già in questa sessione.' };
  }
  if (participants.length >= session.slots) {
    return { error: 'Sessione piena.' };
  }

  participants.push(userId.toString());
  const newStatus = participants.length >= session.slots ? 'full' : 'open';
  await session.update({ participants, status: newStatus });
  return { session, joined: true };
}

/**
 * Leave a session.
 */
async function leaveSession(messageId, userId) {
  const session = await getSession(messageId);
  if (!session) return { error: 'Sessione non trovata.' };

  const participants = session.participants || [];
  if (!participants.includes(userId.toString())) {
    return { error: 'Non sei in questa sessione.' };
  }
  if (userId.toString() === session.captain_id.toString()) {
    // Captain leaving closes the session
    await session.update({ participants: [], status: 'closed' });
    return { session, closed: true };
  }

  const newParticipants = participants.filter((p) => p !== userId.toString());
  await session.update({ participants: newParticipants, status: 'open' });
  return { session, left: true };
}

/**
 * Close a session manually (captain only).
 */
async function closeSession(messageId, userId) {
  const session = await getSession(messageId);
  if (!session) return { error: 'Sessione non trovata.' };
  if (userId.toString() !== session.captain_id.toString()) {
    return { error: 'Solo il capitano può chiudere la sessione.' };
  }
  await session.update({ status: 'closed' });
  return { session, closed: true };
}

/**
 * Get active sessions for a guild.
 */
async function getActiveSessions(guildId) {
  return LfgSession.findAll({
    where: { guild_id: guildId, status: ['open', 'full'] },
    order: [['created_at', 'DESC']],
  });
}

/**
 * Get active sessions for a specific game.
 */
async function getSessionsByGame(guildId, gameName) {
  const sessions = await getActiveSessions(guildId);
  return sessions.filter((s) => s.game_name.toLowerCase().includes(gameName.toLowerCase()));
}

/**
 * Build the LFG embed from a session.
 */
function buildLfgEmbed(session, _guild) {
  const { EmbedBuilder } = require('discord.js');
  const participants = session.participants || [];
  const participantList = participants.map((id, _i) => {
    const isCaptain = id === session.captain_id.toString();
    return `• <@${id}>${isCaptain ? ' (capitano)' : ''}`;
  }).join('\n');

  const statusEmoji = session.status === 'full' ? '🔴' : session.status === 'closed' ? '⚫' : '🟢';
  const statusText = session.status === 'full' ? 'PIENA' : session.status === 'closed' ? 'CHIUSA' : 'APERTA';

  const embed = new EmbedBuilder()
    .setTitle(`🎮 LFG: ${session.game_name}`)
    .setColor(session.status === 'full' ? 0xed4245 : session.status === 'open' ? 0x57f287 : 0x95a5a6)
    .setDescription(
      `**Modalità:** ${session.mode}\n` +
      `**Posti:** ${participants.length}/${session.slots}\n` +
      (session.notes ? `**Note:** ${session.notes}\n` : '') +
      `\n${statusEmoji} **Stato:** ${statusText}\n\n` +
      `**Partecipanti:**\n${participantList || 'Nessuno'}`
    )
    .setFooter({ text: `Sessione LFG • ID: ${session.id}` })
    .setTimestamp();

  if (session.expires_at) {
    embed.addFields({
      name: '⏰ Scade',
      value: `<t:${Math.floor(new Date(session.expires_at).getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  return embed;
}

/**
 * Build the button row for an LFG session.
 */
function buildLfgButtons(session) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const isFull = session.status === 'full';
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lfg:btn:join')
      .setLabel(isFull ? 'Piena' : 'Unisciti')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isFull),
    new ButtonBuilder()
      .setCustomId('lfg:btn:leave')
      .setLabel('Lascia')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('lfg:btn:close')
      .setLabel('Chiudi')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Expire old sessions (called by scheduler).
 */
async function expireOldSessions() {
  const { Op } = require('sequelize');
  const expired = await LfgSession.update(
    { status: 'expired' },
    { where: { status: ['open', 'full'], expires_at: { [Op.lt]: new Date() } } }
  );
  if (expired[0] > 0) {
    logger.info(`LFG: expired ${expired[0]} old sessions`);
  }
  return expired[0];
}

module.exports = {
  createSession,
  getSession,
  joinSession,
  leaveSession,
  closeSession,
  getActiveSessions,
  getSessionsByGame,
  buildLfgEmbed,
  buildLfgButtons,
  expireOldSessions,
};
