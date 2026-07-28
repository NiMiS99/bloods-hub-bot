// src/services/giveawayService.js
// Giveaway system: create, end, pick winners, schedule auto-end.
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Giveaway } = require('../db');
const logger = require('../utils/logger');

const GIVEAWAY_BUTTON_ID = 'giveaway:join';

// In-memory participant tracking: giveawayId -> Set of userIds
const _participants = new Map();

/**
 * Build the giveaway embed + button.
 */
function buildGiveawayMessage(giveaway, participantCount = 0) {
  const endsAt = Math.floor(new Date(giveaway.ends_at).getTime() / 1000);
  const embed = new EmbedBuilder()
    .setTitle(`GIVEAWAY: ${giveaway.title}`)
    .setColor(0xf1c40f)
    .setDescription(
      (giveaway.description ? `${giveaway.description}\n\n` : '') +
      `**Premio:** ${giveaway.prize}\n` +
      `**Vincitori:** ${giveaway.winner_count}\n` +
      `**Partecipanti:** ${participantCount}\n` +
      `**Scade:** <t:${endsAt}:F> (<t:${endsAt}:R>)\n` +
      (giveaway.required_role_id ? `**Ruolo richiesto:** <@&${giveaway.required_role_id}>\n` : '') +
      `\n*Clicca il pulsante per partecipare!*`
    )
    .setFooter({ text: `Giveaway #${giveaway.id} • Bloods Community` })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId(GIVEAWAY_BUTTON_ID)
    .setLabel('Partecipa!')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🎉');

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}

/**
 * Build the ended giveaway embed (winners announced).
 */
function buildEndedGiveawayMessage(giveaway, winners) {
  const embed = new EmbedBuilder()
    .setTitle(`GIVEAWAY TERMINATO: ${giveaway.title}`)
    .setColor(0x95a5a6)
    .setDescription(
      `**Premio:** ${giveaway.prize}\n` +
      `**Vincitori:** ${winners.length > 0 ? winners.map((w) => `<@${w}>`).join(', ') : 'Nessun partecipante'}\n` +
      `**Host:** <@${giveaway.hosted_by}>\n` +
      `\n*Giveaway terminato.*`
    )
    .setFooter({ text: `Giveaway #${giveaway.id} • Terminato` })
    .setTimestamp();

  return { embeds: [embed], components: [] };
}

/**
 * End a giveaway: pick random winners from participants (reactions).
 */
async function endGiveaway(giveawayId, client) {
  try {
    const giveaway = await Giveaway.findByPk(giveawayId);
    if (!giveaway || giveaway.is_ended) return;

    const guild = client.guilds.cache.get(String(giveaway.guild_id));
    if (!guild) {
      await giveaway.update({ is_ended: true, is_active: false });
      return;
    }

    const channel = guild.channels.cache.get(String(giveaway.channel_id));
    if (!channel) {
      await giveaway.update({ is_ended: true, is_active: false });
      return;
    }

    // Fetch the giveaway message
    let message = null;
    if (giveaway.message_id) {
      try {
        message = await channel.messages.fetch(String(giveaway.message_id));
      } catch {}
    }

    // Get participants from in-memory tracking
    let participants = [];
    const participantIds = getParticipants(giveaway.id);
    if (participantIds.length > 0) {
      participants = participantIds.map((id) => ({ id }));
    }

    // Pick random winners
    const winners = [];
    const pool = [...participants];
    for (let i = 0; i < giveaway.winner_count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      winners.push(pool[idx].id);
      pool.splice(idx, 1);
    }
    // Clear participants from memory
    _participants.delete(giveaway.id);

    // Update giveaway in DB
    await giveaway.update({
      is_ended: true,
      is_active: false,
      winners: JSON.stringify(winners),
    });

    // Edit the message
    if (message) {
      await message.edit(buildEndedGiveawayMessage(giveaway, winners)).catch(() => {});
    }

    // Announce winners
    if (winners.length > 0) {
      await channel.send({
        content: `🎉 **Giveaway terminato!**\nCongratulazioni a ${winners.map((w) => `<@${w}>`).join(', ')}! Hai vinto **${giveaway.prize}**!`,
      }).catch(() => {});
    } else {
      await channel.send({
        content: `🎉 **Giveaway terminato!**\nNessun partecipante per **${giveaway.prize}**.`,
      }).catch(() => {});
    }

    logger.info(`Giveaway #${giveawayId} ended. Winners: ${winners.length}`);
  } catch (err) {
    logger.error(`End giveaway #${giveawayId} failed: ${err.message}`);
  }
}

/**
 * Check all active giveaways and end expired ones.
 */
async function checkExpiredGiveaways(client) {
  try {
    const expired = await Giveaway.findAll({
      where: { is_active: true, is_ended: false, ends_at: { [require('sequelize').Op.lte]: new Date() } },
    });
    for (const g of expired) {
      await endGiveaway(g.id, client);
    }
  } catch (err) {
    logger.debug(`Giveaway check failed: ${err.message}`);
  }
}

/**
 * Start the giveaway scheduler (checks every 30 seconds).
 */
let _interval = null;
function start(client) {
  checkExpiredGiveaways(client);
  _interval = setInterval(() => checkExpiredGiveaways(client), 30000);
  logger.info('GiveawayScheduler: started (checks every 30s).');
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  logger.info('GiveawayScheduler: stopped.');
}

module.exports = {
  buildGiveawayMessage,
  buildEndedGiveawayMessage,
  endGiveaway,
  checkExpiredGiveaways,
  start,
  stop,
  GIVEAWAY_BUTTON_ID,
  addParticipant,
  getParticipants,
};

/**
 * Add a participant to a giveaway.
 */
function addParticipant(giveawayId, userId) {
  if (!_participants.has(giveawayId)) _participants.set(giveawayId, new Set());
  const set = _participants.get(giveawayId);
  const isNew = !set.has(userId);
  set.add(userId);
  return { isNew, count: set.size };
}

/**
 * Get participants for a giveaway.
 */
function getParticipants(giveawayId) {
  const set = _participants.get(giveawayId);
  return set ? [...set] : [];
}
