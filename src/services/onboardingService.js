// src/services/onboardingService.js
// Manages the verification gate and step-by-step onboarding flow.
// New users get "Non Verificato" role → can only see #Benvenuto.
// Click "Verifica" → get "Membro della community" → unlock server.
// Then see: rules panel → game selection → profession selection.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');
const { toFraktur } = require('../utils/textFormatter');

const GUILD_ID = '1010226759817515018';
const WELCOME_CHANNEL_ID = '1010226760308240407';
const ROLE_PANEL_CHANNEL_ID = '1529506938654818466';
const RULES_CHANNEL_ID = '1013413920679149610';

// Role names
const NON_VERIFICATO = 'Non Verificato';
const MEMBRO_COMMUNITY = 'Membro della community';
const BLOODS = 'Bloods';

// Custom IDs
const CID = {
  verify: 'onboard:verify',
  toRules: 'onboard:torules',
  toGames: 'onboard:togames',
  toProfs: 'onboard:toprofs',
  done: 'onboard:done',
  ticket: 'ticket:open',
  ticketClose: 'ticket:close',
};

/**
 * Post the verification gate message in #Benvenuto.
 */
async function postVerificationGate(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  const channel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  // Delete previous bot messages in the channel (avoid duplicates)
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const oldBotMsgs = messages.filter((m) => m.author.id === client.user.id);
    if (oldBotMsgs.size > 0) await channel.bulkDelete(oldBotMsgs);
  } catch (e) {
    logger.warn(`Onboarding bulkDelete: ${e.message}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('Benvenuto nei Bloods!')
    .setColor(0x8b0000)
    .setDescription(
      '**Benvenuto nel server Discord dei Bloods!**\n\n' +
      'Per accedere al server e vedere tutti i canali, **devi verificarti**.\n\n' +
      'Clicca il bottone **Verifica** qui sotto per iniziare.\n' +
      'Dopo la verifica potrai:\n' +
      '• Leggere il regolamento\n' +
      '• Selezionare i giochi a cui sei interessato\n' +
      '• Scegliere le professioni WoW\n' +
      '• Accedere a tutti i canali della community\n\n' +
      '*(Anti-bot, anti-raid — la verifica è istantanea)*'
    )
    .setFooter({ text: 'Bloods Hub · Sistema di Onboarding' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CID.verify)
      .setLabel('Verifica')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
  logger.info('Onboarding: verification gate posted.');
}

/**
 * Set up the "Non Verificato" role with proper permissions.
 * Users with this role can only see #Benvenuto and #Regolamento.
 */
async function setupNonVerificatoRole(guild) {
  // Find or create the role
  let role = guild.roles.cache.find((r) => r.name === NON_VERIFICATO);
  if (!role) {
    role = await guild.roles.create({
      name: NON_VERIFICATO,
      colors: [0x555555],
      hoist: false,
      mentionable: false,
      position: 1,
      permissions: [],
      reason: 'Onboarding system: verification gate role',
    });
    logger.info(`Onboarding: created role "${NON_VERIFICATO}" (${role.id})`);
  }

  // Set channel permissions: Non Verificato can only see #Benvenuto
  const welcomeCh = guild.channels.cache.get(WELCOME_CHANNEL_ID);
  const rulesCh = guild.channels.cache.get(RULES_CHANNEL_ID);

  // Lock all categories from Non Verificato, except Area Iniziale
  const categories = [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildCategory);
  for (const cat of categories) {
    const name = cat.name;
    // Allow Area Iniziale (where #Benvenuto is)
    if (name && name.includes('Iniziale')) continue;
    // Deny view for Non Verificato
    await cat.permissionOverwrites.edit(role.id, {
      ViewChannel: false,
    }).catch(() => {});
  }

  // Allow Non Verificato to see #Benvenuto
  if (welcomeCh) {
    await welcomeCh.permissionOverwrites.edit(role.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false, // can't chat, only click button
    }).catch(() => {});
  }

  // Allow Non Verificato to see #Regolamento (read only)
  if (rulesCh) {
    await rulesCh.permissionOverwrites.edit(role.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
    }).catch(() => {});
  }

  return role;
}

/**
 * Handle the verify button click.
 * Removes "Non Verificato" and adds "Membro della community".
 */
async function handleVerify(interaction, client) {
  const member = interaction.member;
  const guild = interaction.guild;

  // Check if already verified
  const hasCommunity = member.roles.cache.some((r) => r.name === MEMBRO_COMMUNITY);
  const hasBloods = member.roles.cache.some((r) => r.name === BLOODS);

  if (hasCommunity || hasBloods) {
    await interaction.reply({
      content: 'Sei già verificato! Puoi accedere a tutti i canali.',
      flags: 64,
    });
    return;
  }

  // Find roles
  const nvRole = guild.roles.cache.find((r) => r.name === NON_VERIFICATO);
  const communityRole = guild.roles.cache.find((r) => r.name === MEMBRO_COMMUNITY);

  if (!communityRole) {
    await interaction.reply({
      content: 'Errore: ruolo "Membro della community" non trovato. Contatta un admin.',
      flags: 64,
    });
    return;
  }

  // Remove Non Verificato, add Membro della community
  if (nvRole) await member.roles.remove(nvRole).catch(() => {});
  await member.roles.add(communityRole).catch(() => {});

  logger.info(`Onboarding: ${member.user.tag} verified.`);

  // Send welcome DM with next steps
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('Benvenuto nei Bloods!')
      .setColor(0x8b0000)
      .setDescription(
        `**Ciao ${member.user.username}!**\n\n` +
        'Sei stato verificato con successo! Ora puoi accedere a tutti i canali della community.\n\n' +
        '**Prossimi passi consigliati:**\n' +
        `1. Leggi il <#${RULES_CHANNEL_ID}> per conoscere le regole\n` +
        `2. Vai in <#${ROLE_PANEL_CHANNEL_ID}> per selezionare:\n` +
        '   • I giochi a cui sei interessato\n' +
        '   • Le professioni WoW\n' +
        '3. Usa i comandi in #Comandi-Bot per esplorare le funzionalità\n\n' +
        'Buon divertimento! 🎮'
      )
      .setFooter({ text: 'Bloods Hub · Benvenuto nella community' });

    await member.send({ embeds: [dmEmbed] });
  } catch {
    // DM might be closed — not critical
  }

  await interaction.reply({
    content: `✅ **Verifica completata!** Benvenuto ${member.user.username}!\nControlla i tuoi messaggi privati per i prossimi passi.`,
    flags: 64,
  });
}

/**
 * Auto-assign "Non Verificato" role to new members.
 */
async function handleNewMember(member) {
  const communityRole = member.guild.roles.cache.find((r) => r.name === MEMBRO_COMMUNITY);
  const bloodsRole = member.guild.roles.cache.find((r) => r.name === BLOODS);

  // If already has a role, don't assign Non Verificato
  if (member.roles.cache.some((r) => r.name === MEMBRO_COMMUNITY || r.name === BLOODS)) return;

  const nvRole = member.guild.roles.cache.find((r) => r.name === NON_VERIFICATO);
  if (nvRole) {
    await member.roles.add(nvRole).catch(() => {});
    logger.info(`Onboarding: assigned "Non Verificato" to ${member.user.tag}.`);
  }
}

module.exports = {
  CID,
  postVerificationGate,
  setupNonVerificatoRole,
  handleVerify,
  handleNewMember,
  GUILD_ID,
  WELCOME_CHANNEL_ID,
  NON_VERIFICATO,
  MEMBRO_COMMUNITY,
};
