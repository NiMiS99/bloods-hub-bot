// src/services/reactionRoleService.js
// Reaction role system: post panels with emoji->role mappings and handle reactions.
const { ReactionRole } = require('../db');
const { baseEmbed } = require('../utils/embed');
const logger = require('../utils/logger');

/**
 * Post a reaction role panel in a channel.
 * @param {object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Target channel ID
 * @param {string} title - Panel title
 * @param {string} description - Panel description
 * @param {Array<{emoji: string, roleId: string, label?: string}>} pairs - Emoji/role pairs
 * @returns {Promise<object|null>} The created message, or null on failure
 */
async function postPanel(client, guildId, channelId, title, description, pairs) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`ReactionRole postPanel: guild ${guildId} not found`);
      return null;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      logger.warn(`ReactionRole postPanel: channel ${channelId} not found`);
      return null;
    }

    if (!pairs || pairs.length === 0) {
      logger.warn('ReactionRole postPanel: no emoji/role pairs provided');
      return null;
    }

    // Build the embed description with the role list
    const lines = [];
    for (const pair of pairs) {
      const label = pair.label || `<@&${pair.roleId}>`;
      lines.push(`${pair.emoji} — ${label}`);
    }

    const embed = baseEmbed({
      title: title || 'Scegli i tuoi ruoli',
      description: (description ? description + '\n\n' : '') + lines.join('\n') +
        '\n\n*Reagisci con le emoji qui sotto per ottenere o rimuovere il ruolo corrispondente.*',
      footer: { text: 'Bloods Community • Reaction Roles' },
    });

    const message = await channel.send({ embeds: [embed] });

    // Add reactions to the message
    for (const pair of pairs) {
      try {
        await message.react(pair.emoji);
      } catch (err) {
        logger.warn(`ReactionRole postPanel: failed to react with ${pair.emoji}: ${err.message}`);
      }
    }

    // Save each pair in the DB
    for (const pair of pairs) {
      await ReactionRole.create({
        guild_id: guildId,
        channel_id: channelId,
        message_id: message.id,
        emoji: pair.emoji,
        role_id: pair.roleId,
        description: pair.label || null,
      });
    }

    logger.info(`ReactionRole panel posted in #${channel.name} (msg ${message.id}) with ${pairs.length} roles.`);
    return message;
  } catch (err) {
    logger.error(`ReactionRole postPanel failed: ${err.message}`);
    return null;
  }
}

/**
 * Handle a reaction add: assign the corresponding role.
 * @param {object} reaction - Discord MessageReaction
 * @param {object} user - Discord User who reacted
 * @param {object} client - Discord client
 */
async function handleReactionAdd(reaction, user, client) {
  try {
    // Partial reactions/messages need to be fetched
    if (reaction.partial) {
      await reaction.fetch().catch(() => null);
    }
    if (reaction.message.partial) {
      await reaction.message.fetch().catch(() => null);
    }

    if (user.bot) return;

    const messageId = reaction.message.id;
    const guildId = reaction.message.guildId;
    if (!guildId) return;

    // Determine the emoji identifier (unicode or custom emoji id)
    const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

    const rr = await ReactionRole.findOne({
      where: { guild_id: guildId, message_id: messageId, emoji: emojiKey },
    });
    if (!rr) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = guild.roles.cache.get(String(rr.role_id));
    if (!role) {
      logger.warn(`ReactionRole: role ${rr.role_id} not found in guild ${guildId}`);
      return;
    }

    if (member.roles.cache.has(role.id)) return;

    await member.roles.add(role).catch((e) => {
      logger.warn(`ReactionRole: failed to add role ${role.name} to ${user.username}: ${e.message}`);
    });

    logger.info(`ReactionRole: added role "${role.name}" to ${user.username} (${user.id}).`);
  } catch (err) {
    logger.error(`ReactionRole handleReactionAdd failed: ${err.message}`);
  }
}

/**
 * Handle a reaction remove: remove the corresponding role.
 * @param {object} reaction - Discord MessageReaction
 * @param {object} user - Discord User who removed the reaction
 * @param {object} client - Discord client
 */
async function handleReactionRemove(reaction, user, client) {
  try {
    if (reaction.partial) {
      await reaction.fetch().catch(() => null);
    }
    if (reaction.message.partial) {
      await reaction.message.fetch().catch(() => null);
    }

    if (user.bot) return;

    const messageId = reaction.message.id;
    const guildId = reaction.message.guildId;
    if (!guildId) return;

    const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

    const rr = await ReactionRole.findOne({
      where: { guild_id: guildId, message_id: messageId, emoji: emojiKey },
    });
    if (!rr) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = guild.roles.cache.get(String(rr.role_id));
    if (!role) {
      logger.warn(`ReactionRole: role ${rr.role_id} not found in guild ${guildId}`);
      return;
    }

    if (!member.roles.cache.has(role.id)) return;

    await member.roles.remove(role).catch((e) => {
      logger.warn(`ReactionRole: failed to remove role ${role.name} from ${user.username}: ${e.message}`);
    });

    logger.info(`ReactionRole: removed role "${role.name}" from ${user.username} (${user.id}).`);
  } catch (err) {
    logger.error(`ReactionRole handleReactionRemove failed: ${err.message}`);
  }
}

/**
 * List all reaction role panels for a guild (grouped by message).
 * @param {string} guildId - Guild ID
 * @returns {Promise<Array<object>>} Array of panel objects
 */
async function listPanels(guildId) {
  try {
    const rows = await ReactionRole.findAll({
      where: { guild_id: guildId },
      order: [['created_at', 'DESC']],
    });

    // Group by message_id
    const panelsMap = new Map();
    for (const row of rows) {
      const key = String(row.message_id);
      if (!panelsMap.has(key)) {
        panelsMap.set(key, {
          messageId: String(row.message_id),
          channelId: String(row.channel_id),
          pairs: [],
          createdAt: row.created_at,
        });
      }
      panelsMap.get(key).pairs.push({
        emoji: row.emoji,
        roleId: String(row.role_id),
        label: row.description,
      });
    }

    return [...panelsMap.values()];
  } catch (err) {
    logger.error(`ReactionRole listPanels failed: ${err.message}`);
    return [];
  }
}

/**
 * Remove a reaction role panel and delete all DB entries for that message.
 * @param {string} guildId - Guild ID
 * @param {string} messageId - Panel message ID
 * @returns {Promise<number>} Number of deleted rows
 */
async function removePanel(guildId, messageId) {
  try {
    const deleted = await ReactionRole.destroy({
      where: { guild_id: guildId, message_id: messageId },
    });
    logger.info(`ReactionRole: removed panel ${messageId} (${deleted} entries deleted).`);
    return deleted;
  } catch (err) {
    logger.error(`ReactionRole removePanel failed: ${err.message}`);
    return 0;
  }
}

// --- Draft pair management (for /reactionrole add + post flow) ---
// In-memory drafts: guildId -> Array<{ emoji, roleId, label }>
const _drafts = new Map();

/**
 * Add an emoji→role pair to the current guild draft (unposted panel).
 * @param {string} guildId - Guild ID
 * @param {string} emoji - Emoji identifier (unicode or custom emoji string)
 * @param {string} roleId - Role ID
 * @param {string} [label] - Optional description/label
 * @returns {Array<object>} The current draft pairs for this guild
 */
function addDraftPair(guildId, emoji, roleId, label) {
  if (!_drafts.has(guildId)) _drafts.set(guildId, []);
  const pairs = _drafts.get(guildId);
  // Avoid duplicates with same emoji
  const existing = pairs.findIndex((p) => p.emoji === emoji);
  if (existing !== -1) {
    pairs[existing] = { emoji, roleId, label: label || null };
  } else {
    pairs.push({ emoji, roleId, label: label || null });
  }
  return pairs;
}

/**
 * Get the current draft pairs for a guild.
 * @param {string} guildId - Guild ID
 * @returns {Array<object>}
 */
function getDraftPairs(guildId) {
  return _drafts.get(guildId) || [];
}

/**
 * Clear the draft pairs for a guild.
 * @param {string} guildId - Guild ID
 */
function clearDraft(guildId) {
  _drafts.delete(guildId);
}

/**
 * Post the current draft panel for a guild, then clear the draft.
 * @param {object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Target channel ID
 * @param {string} title - Panel title
 * @param {string} description - Panel description
 * @returns {Promise<object|null>} The created message, or null on failure
 */
async function postDraftPanel(client, guildId, channelId, title, description) {
  const pairs = getDraftPairs(guildId);
  if (pairs.length === 0) return null;
  const message = await postPanel(client, guildId, channelId, title, description, pairs);
  if (message) clearDraft(guildId);
  return message;
}

/**
 * Add an emoji→role pair to an already-posted panel (adds reaction + DB row).
 * @param {object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} messageId - Existing panel message ID
 * @param {string} channelId - Channel ID of the panel
 * @param {string} emoji - Emoji identifier
 * @param {string} roleId - Role ID
 * @param {string} [label] - Optional description
 * @returns {Promise<boolean>} True on success
 */
async function addPairToPanel(client, guildId, messageId, channelId, emoji, roleId, label) {
  try {
    // Check for duplicate on same message
    const existing = await ReactionRole.findOne({
      where: { guild_id: guildId, message_id: messageId, emoji },
    });
    if (existing) {
      await existing.update({ role_id: roleId, description: label || null });
    } else {
      await ReactionRole.create({
        guild_id: guildId,
        channel_id: channelId,
        message_id: messageId,
        emoji,
        role_id: roleId,
        description: label || null,
      });
    }

    // Add the reaction to the message
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      const channel = guild.channels.cache.get(channelId);
      if (channel) {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) {
          await message.react(emoji).catch((e) => {
            logger.warn(`ReactionRole addPairToPanel: failed to react with ${emoji}: ${e.message}`);
          });
        }
      }
    }

    logger.info(`ReactionRole: added pair ${emoji} -> role ${roleId} to panel ${messageId}.`);
    return true;
  } catch (err) {
    logger.error(`ReactionRole addPairToPanel failed: ${err.message}`);
    return false;
  }
}

module.exports = {
  postPanel,
  handleReactionAdd,
  handleReactionRemove,
  listPanels,
  removePanel,
  addDraftPair,
  getDraftPairs,
  clearDraft,
  postDraftPanel,
  addPairToPanel,
};
