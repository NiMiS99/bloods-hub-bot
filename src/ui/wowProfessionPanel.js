// src/ui/wowProfessionPanel.js
// WoW profession selection panel — users pick professions, get roles + channel access.
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { Guild } = require('../db');
const { baseEmbed } = require('../utils/embed');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

// WoW professions
const PROFESSIONS = [
  { id: 'alchemy', name: 'Alchimia', emoji: '🧪' },
  { id: 'blacksmithing', name: 'Forgiatura', emoji: '🔨' },
  { id: 'enchanting', name: 'Incantamento', emoji: '✨' },
  { id: 'engineering', name: 'Ingegneria', emoji: '⚙️' },
  { id: 'inscription', name: 'Runografia', emoji: '📜' },
  { id: 'jewelcrafting', name: 'Oreficeria', emoji: '💎' },
  { id: 'leatherworking', name: 'Conciatura', emoji: '🟤' },
  { id: 'tailoring', name: 'Sartoria', emoji: '🧵' },
  { id: 'herbalism', name: 'Erbalismo', emoji: '🌿' },
  { id: 'mining', name: 'Estrazione', emoji: '⛏️' },
  { id: 'skinning', name: 'Scuoiatura', emoji: '🔪' },
  { id: 'cooking', name: 'Cucina', emoji: '🍳' },
  { id: 'fishing', name: 'Pesca', emoji: '🎣' },
  { id: 'first_aid', name: 'Pronto Soccorso', emoji: '➕' },
];

/**
 * Build the WoW profession panel.
 */
async function buildProfessionPanel(guild) {
  const embed = new EmbedBuilder()
    .setTitle('⚒️ Professioni WoW')
    .setColor(0x8b0000)
    .setDescription(
      'Seleziona le tue professioni WoW dal menu qui sotto.\n\n' +
      'Otterrai:\n' +
      '• Il ruolo della professione\n' +
      '• Accesso ai canali dedicati alle professioni\n' +
      '• Notifiche per eventi di crafting\n\n' +
      '*Puoi selezionare fino a 2 professioni principali + 3 raccolta.*'
    )
    .setFooter({ text: 'Bloods WoW · Selezione Professioni' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('wowprof:select')
    .setPlaceholder('Seleziona le tue professioni...')
    .setMinValues(0)
    .setMaxValues(5)
    .addOptions(
      PROFESSIONS.map((p) => ({
        label: p.name,
        value: p.id,
        emoji: p.emoji,
        description: `Ottieni il ruolo ${p.name}`,
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);
  const clearRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wowprof:clear')
      .setLabel('Rimuovi tutte')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row, clearRow] };
}

/**
 * Handle profession selection.
 */
async function handleProfessionSelect(interaction, guild) {
  const selected = interaction.values || [];
  const member = interaction.member;

  const added = [];
  const removed = [];

  for (const prof of PROFESSIONS) {
    const roleName = `WoW ${prof.name}`;
    let role = guild.roles.cache.find((r) => r.name === roleName);

    // Create role if missing
    if (!role && selected.includes(prof.id)) {
      role = await guild.roles.create({
        name: roleName,
        color: 0x8b0000,
        hoist: false,
        mentionable: true,
        reason: 'WoW profession role auto-created',
      }).catch(() => null);
    }

    if (!role) continue;

    const hasRole = member.roles.cache.has(role.id);
    const wantsRole = selected.includes(prof.id);

    if (wantsRole && !hasRole) {
      await member.roles.add(role).catch(() => {});
      added.push(prof.name);
    } else if (!wantsRole && hasRole) {
      await member.roles.remove(role).catch(() => {});
      removed.push(prof.name);
    }
  }

  const msg = [];
  if (added.length > 0) msg.push(`✅ Aggiunte: ${added.join(', ')}`);
  if (removed.length > 0) msg.push(`❌ Rimosse: ${removed.join(', ')}`);
  if (msg.length === 0) msg.push('Nessuna modifica.');

  await interaction.reply({ content: msg.join('\n'), flags: 64 });
  logger.info(`WoW prof: ${member.user.tag} — added ${added.length}, removed ${removed.length}`);
}

/**
 * Handle clear button.
 */
async function handleClear(interaction, guild) {
  const member = interaction.member;
  const removed = [];

  for (const prof of PROFESSIONS) {
    const roleName = `WoW ${prof.name}`;
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (role && member.roles.cache.has(role.id)) {
      await member.roles.remove(role).catch(() => {});
      removed.push(prof.name);
    }
  }

  await interaction.reply({
    content: removed.length > 0 ? `Rimosse: ${removed.join(', ')}` : 'Non avevi professioni selezionate.',
    flags: 64,
  });
}

/**
 * Post the profession panel in the WoW category.
 */
async function postProfessionPanel(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  // Find WoW category
  const wowCategory = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name && c.name.toLowerCase().includes('wow')
  );
  if (!wowCategory) {
    logger.warn('WoW profession panel: WoW category not found');
    return;
  }

  // Find or create a profession-selection channel
  let channel = [...guild.channels.cache.values()].find(
    (c) => c.parentId === wowCategory.id && c.name === 'selezione-professioni'
  );
  if (!channel) {
    channel = await guild.channels.create({
      name: 'selezione-professioni',
      type: ChannelType.GuildText,
      parent: wowCategory.id,
      topic: 'Selezione professioni WoW — scegli le tue dal menu.',
    });
  }

  // Delete old bot messages
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const oldBotMsgs = messages.filter((m) => m.author.id === client.user.id);
    if (oldBotMsgs.size > 0) await channel.bulkDelete(oldBotMsgs);
  } catch {}

  const payload = await buildProfessionPanel(guild);
  await channel.send(payload);
  logger.info('WoW profession panel posted.');
}

module.exports = {
  PROFESSIONS,
  buildProfessionPanel,
  handleProfessionSelect,
  handleClear,
  postProfessionPanel,
};
