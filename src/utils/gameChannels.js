// src/utils/gameChannels.js
// Shared template for creating game category channels.
// Used by /game add and migration scripts to ensure consistency.
const { ChannelType, PermissionsBitField } = require('discord.js');
const { toFraktur } = require('./textFormatter');

/**
 * Permission overwrite sets for each channel type.
 * @everyone is always denied ViewChannel.
 * The game role gets different perms depending on channel type.
 * The bot always gets full access.
 */
function buildOverwrites(everyoneId, gameRoleId, botId, type) {
  const everyone = { id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] };
  const bot = {
    id: botId,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ManageChannels,
    ],
  };

  switch (type) {
    case 'writable_text':
      // Members can view, send, read history (e.g. generale, composizioni)
      return [
        everyone,
        {
          id: gameRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        bot,
      ];

    case 'readonly_text':
      // Members can view + read history, but NOT send (e.g. news, comunicazioni)
      // Admins bypass this automatically via Administrator permission.
      return [
        everyone,
        {
          id: gameRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
          deny: [
            PermissionsBitField.Flags.SendMessages,
          ],
        },
        bot,
      ];

    case 'voice':
      // Members can view, connect, speak
      return [
        everyone,
        {
          id: gameRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
        {
          id: botId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
          ],
        },
      ];

    default:
      throw new Error(`Unknown channel type: ${type}`);
  }
}

/**
 * Channel template definition for each game category.
 * Order matters — channels are created in this order.
 * Format: emoji丨Fraktur — matches the guild's native channel naming style.
 */
const CHANNEL_TEMPLATE = [
  { name: 'Generale',      type: ChannelType.GuildText,  permType: 'writable_text',  fraktur: true,  emoji: '💬', separator: '丨' },
  { name: 'News',          type: ChannelType.GuildText,  permType: 'readonly_text',  fraktur: true,  emoji: '📰', separator: '丨' },
  { name: 'Comunicazioni', type: ChannelType.GuildText,  permType: 'readonly_text',  fraktur: true,  emoji: '📣', separator: '丨' },
  { name: 'Composizioni',  type: ChannelType.GuildText,  permType: 'writable_text',  fraktur: true,  emoji: '⚔️', separator: '丨' },
  { name: 'Vocale 1',      type: ChannelType.GuildVoice, permType: 'voice',          fraktur: true,  emoji: '🔊', separator: '丨' },
  { name: 'Vocale 2',      type: ChannelType.GuildVoice, permType: 'voice',          fraktur: true,  emoji: '🔊', separator: '丨' },
];

/**
 * Create all channels for a game category using the standard template.
 * Skips channels that already exist (by name match within the category).
 * @param {Guild} guild - Discord guild
 * @param {string} categoryId - Parent category ID
 * @param {string} gameRoleId - Game role ID for permission overwrites
 * @param {string} gameName - Game name (for reason strings)
 * @returns {Promise<{created: Array, skipped: Array}>} - Lists of created and skipped channel names
 */
async function createGameChannels(guild, categoryId, gameRoleId, gameName) {
  const everyoneId = guild.roles.everyone.id;
  const botId = guild.client.user.id;

  // Fetch existing children of this category.
  await guild.channels.fetch();
  const existing = new Set(
    [...guild.channels.cache.values()]
      .filter((c) => c.parentId === categoryId)
      .map((c) => c.name)
  );

  const created = [];
  const skipped = [];

  for (const def of CHANNEL_TEMPLATE) {
    // Build channel name: emoji丨Fraktur (e.g. "📰丨𝔑𝔢𝔴𝔰")
    const styledName = def.fraktur ? toFraktur(def.name) : def.name;
    const channelName = def.emoji
      ? `${def.emoji}${def.separator || '丨'}${styledName}`
      : styledName;

    if (existing.has(channelName)) {
      skipped.push(channelName);
      continue;
    }

    const overwrites = buildOverwrites(everyoneId, gameRoleId, botId, def.permType);

    await guild.channels.create({
      name: channelName,
      type: def.type,
      parent: categoryId,
      permissionOverwrites: overwrites,
      reason: `Canale ${def.name} per ${gameName}`,
    });
    created.push(channelName);
  }

  return { created, skipped };
}

/**
 * Create the game category with standard permission overwrites.
 * @returns {Promise<CategoryChannel>}
 */
async function createGameCategory(guild, gameName, gameRoleId) {
  const everyoneId = guild.roles.everyone.id;
  const botId = guild.client.user.id;
  const categoryName = toFraktur(gameName);

  return guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: gameRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.Connect,
        ],
      },
      {
        id: botId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
        ],
      },
    ],
    reason: `Categoria per ${gameName}`,
  });
}

module.exports = {
  CHANNEL_TEMPLATE,
  buildOverwrites,
  createGameChannels,
  createGameCategory,
};
