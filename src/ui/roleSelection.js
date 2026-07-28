// src/ui/roleSelection.js
// ============================================================================
//  Interactive role-selection UI for the #role-selection channel.
//
//  Layout:
//   • A StringSelectMenu ("role:select:games") listing every active game.
//   • A row of Buttons ("role:btn:<gameCode>") for the most popular games,
//     giving users one-click access.
//   • A "Clear all game roles" button ("role:btn:clear").
//
//  Behaviour:
//   • Selecting a game in the menu grants the Discord role AND inserts a
//     user_games row (self_assigned=1). De-selecting removes both.
//   • Buttons toggle the corresponding role on/off.
//   • Legacy WoW roles are NEVER touched here — they are preserved as-is.
//
//  Posting the panel is done via the /rolepanel deploy slash command (admin).
// ============================================================================
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { Game, UserGame, User, Guild } = require('../db');
const { baseEmbed } = require('../utils/embed');
const { toFraktur } = require('../utils/textFormatter');
const config = require('../config');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const MAX_BUTTONS = 4; // Discord limit is 5 per row; reserve 1 for "Clear".
const MAX_SELECT_OPTIONS = 25; // Discord hard limit.

/**
 * Build the role-selection message payload (embed + components).
 * @param {import('discord.js').Guild} guild
 */
async function buildRolePanel(guild) {
  // Only show games that have a Discord role configured (role_id IS NOT NULL).
  // This excludes WoW (legacy, no bot-managed role) and any unconfigured game.
  const games = await Game.findAll({
    where: { is_active: true, role_id: { [Op.ne]: null } },
    order: [['name', 'ASC']],
  });

  if (games.length === 0) {
    return {
      embeds: [
        baseEmbed({
          // Fraktur applied to the title only, per the guild aesthetic.
          title: toFraktur('Selezione giochi'),
          description:
            ':information_source: Nessun gioco ancora configurato. Un amministratore può aggiungere giochi con `/game add`.',
        }),
      ],
      components: [],
    };
  }

  // Select menu — supports multi-select (toggle on/off).
  // Labels stay in a readable standard font (Italian) for accessibility.
  const selectOptions = games.slice(0, MAX_SELECT_OPTIONS).map((g) => ({
    label: g.name,
    value: g.code,
    description: `Ottieni accesso ai canali della community di ${g.name}`,
    emoji: undefined, // populate from g.icon_url if you have emoji ids
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('role:select:games')
    .setPlaceholder('Scegli i giochi a cui unirti…')
    .setMinValues(0)
    .setMaxValues(selectOptions.length)
    .addOptions(selectOptions);

  const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

  // Buttons — quick toggle for the first N games + a Clear button.
  // Button labels stay readable (standard font) but in Italian.
  const buttonGames = games.slice(0, MAX_BUTTONS);
  const rowButtons = new ActionRowBuilder().addComponents(
    ...buttonGames.map((g) =>
      new ButtonBuilder()
        .setCustomId(`role:btn:${g.code}`)
        .setLabel(g.name)
        .setStyle(ButtonStyle.Secondary)
    ),
    new ButtonBuilder()
      .setCustomId('role:btn:clear')
      .setLabel('Rimuovi tutto')
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    // Fraktur applied to the title only (e.g. "Seleziona i tuoi giochi" -> "𝔖𝔢𝔩𝔢𝔷𝔦𝔬𝔫𝔞 𝔦 𝔱𝔲𝔬𝔦 𝔤𝔦𝔬𝔠𝔥𝔦").
    .setTitle(`🎮 ${toFraktur('Seleziona i tuoi giochi')}`)
    .setColor(0x8b0000)
    .setDescription(
      [
        'Benvenuto nella community multigioco dei **Bloods**!',
        '',
        'Usa il **menu a tendina** qui sotto per scegliere i giochi a cui giochi — otterrai immediatamente accesso alla categoria e ai canali privati di quel gioco.',
        'Puoi selezionare più giochi e modificare la tua selezione in qualsiasi momento.',
        '',
        '⚡ I pulsanti di attivazione rapida sono disponibili per i nostri giochi più popolari.',
        '',
        '_I ruoli e i canali legacy della gilda WoW sono preservati e non gestiti qui._',
      ].join('\n')
    )
    .setFooter({ text: 'Bloods Community • Onboarding autonomo' });

  return { embeds: [embed], components: [rowSelect, rowButtons] };
}

/**
 * Grant a game role + record membership.
 */
async function addGameRole(member, game, guild) {
  if (!game.role_id) throw new Error(`Game "${game.code}" has no Discord role_id configured.`);
  await member.roles.add(game.role_id, 'Self-assigned via role-selection UI');

  await Guild.findOrCreate({
    where: { guild_id: guild.id },
    defaults: { guild_id: guild.id, name: guild.name },
  });
  await User.findOrCreate({
    where: { user_id: member.id, guild_id: guild.id },
    defaults: { user_id: member.id, guild_id: guild.id, username: member.user.username },
  });
  await UserGame.findOrCreate({
    where: { user_id: member.id, guild_id: guild.id, game_id: game.id },
    defaults: { user_id: member.id, guild_id: guild.id, game_id: game.id, self_assigned: true },
  });
  logger.info(`Role ${game.code} assigned to ${member.user.tag} (${member.id})`);
}

/**
 * Remove a game role + delete membership.
 */
async function removeGameRole(member, game) {
  if (game.role_id) {
    await member.roles.remove(game.role_id, 'Removed via role-selection UI')
      .catch((err) => logger.error(`Failed to remove Discord role ${game.code} from ${member.user.tag}: ${err.message || err}`));
  }
  await UserGame.destroy({
    where: { user_id: member.id, guild_id: member.guild.id, game_id: game.id },
  }).catch((err) => logger.error(`Failed to delete UserGame row for ${game.code}: ${err.message || err}`));
  logger.info(`Role ${game.code} removed from ${member.user.tag} (${member.id})`);
}

/**
 * Find the "Membro della community" role in the guild (NFKC-normalized match).
 * @param {import('discord.js').Guild} guild
 * @returns {import('discord.js').Role|null}
 */
function findCommunityRole(guild) {
  return guild.roles.cache.find((r) => {
    const n = r.name.normalize('NFKC').toLowerCase();
    return n === 'membro della community' || (n.includes('community') && !n.includes('bloods'));
  }) || null;
}

/**
 * Find the "Bloods" role in the guild (exact NFKC-normalized match).
 * @param {import('discord.js').Guild} guild
 * @returns {import('discord.js').Role|null}
 */
function findBloodsRole(guild) {
  return guild.roles.cache.find((r) => r.name.normalize('NFKC').toLowerCase() === 'bloods') || null;
}

/**
 * Check whether a member currently holds any active game role.
 * @param {import('discord.js').GuildMember} member
 * @param {Array} games — array of Game model instances
 * @returns {boolean}
 */
function hasAnyGameRole(member, games) {
  return games.some((g) => g.role_id && member.roles.cache.has(g.role_id));
}

/**
 * Ensure the "Membro della community" role is assigned/removed based on the
 * member's current game-role state.
 *  • If the member has ≥1 game role → add "Membro della community".
 *  • If the member has 0 game roles AND does NOT hold the "Bloods" role →
 *    remove "Membro della community".
 *  • If the member holds "Bloods", never strip "Membro della community"
 *    (they are a guild member and keep community access).
 *
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Guild} guild
 * @param {Array} games — active games
 * @returns {Promise<'added'|'removed'|'unchanged'>}
 */
async function syncCommunityRole(member, guild, games) {
  const communityRole = findCommunityRole(guild);
  if (!communityRole) return 'unchanged';

  const hasCommunity = member.roles.cache.has(communityRole.id);
  const hasGames = hasAnyGameRole(member, games);
  const bloodsRole = findBloodsRole(guild);
  const hasBloods = bloodsRole && member.roles.cache.has(bloodsRole.id);

  if (hasGames && !hasCommunity) {
    await member.roles.add(communityRole.id, 'Auto-assigned: user selected a game').catch(() => {});
    return 'added';
  }
  if (!hasGames && hasCommunity && !hasBloods) {
    await member.roles.remove(communityRole.id, 'Auto-removed: user has no game roles and is not a Bloods guild member').catch(() => {});
    return 'removed';
  }
  return 'unchanged';
}

/**
 * Refresh the role-selection panel in-place: find the last panel message sent
 * by the bot in the role_selection_channel and edit it with the current
 * game list. If no existing panel is found, send a new one.
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @returns {Promise<'edited'|'sent'|'skipped'>}
 */
async function refreshRolePanel(guild, client) {
  const g = await Guild.findByPk(guild.id);
  // Resolve the role-panel channel: DB config first, then env fallback.
  const channelId = (g && g.role_selection_channel_id) || config.channels.rolePanel;
  if (!channelId) return 'skipped';

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return 'skipped';

  const payload = await buildRolePanel(guild);

  // Fetch recent messages and find the last panel message from the bot.
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (messages) {
    const panelMsg = messages.find(
      (m) =>
        m.author.id === client.user.id &&
        m.components.length > 0 &&
        m.components.some((row) =>
          row.components.some((c) => c.customId && c.customId.startsWith('role:'))
        )
    );
    if (panelMsg) {
      await panelMsg.edit(payload).catch(() => {});
      return 'edited';
    }
  }

  // No existing panel found — send a new one.
  await channel.send(payload);
  return 'sent';
}

module.exports = {
  buildRolePanel,
  addGameRole,
  removeGameRole,
  refreshRolePanel,
  findCommunityRole,
  findBloodsRole,
  hasAnyGameRole,
  syncCommunityRole,
  MAX_BUTTONS,
  MAX_SELECT_OPTIONS,
};
