// src/scripts/setupPermissions.js
// Sets up Discord guild permissions coherently:
//
// STRUCTURE:
//   @everyone: Can see only Area Iniziale (welcome, rules)
//   Non Verificato: Same as @everyone (can only see welcome + rules)
//   Membro della community: Can see all COMMUNITY areas + game channels
//   Bloods: Can see everything community + GILDA areas
//   Staff (Officer+): Can see everything + log-staff + admin areas
//   Nitro Booster: Gets "Membro della community" automatically
//
// USAGE: node src/scripts/setupPermissions.js [--dry-run]
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

const DRY_RUN = process.argv.includes('--dry-run');

// Role IDs (from guild analysis)
const ROLES = {
  everyone: '1010226759817515018',
  nonVerificato: '1530605744335093784',
  membroCommunity: '1421545567179243550',
  bloods: '1013186233993810100',
  nitroBooster: '1460043465877618739',
  officer: '1012731374777663488',
  officerReclutatore: '1486107215302496327',
  officerInProva: '1452409084161691718',
  bloodsAdmin: '1529875116039606274',
  consigliere: '1418580069772951654',
  founder: '1461109465528143965',
  owner: '1418580128472240178',
  muted: '1530544414122840145',
  bot: '1422966848252805151',
  bloodsBot: '1466931735789830206',
};

// Category IDs
const CATEGORIES = {
  forum: '1530567893366870066',
  areaIniziale: '1530567851839062077',
  gildaDiv: '1530567862375284747',
  bloodsInfo: '1530573540535832667',
  bloodsRiunioni: '1530574936811245680',
  bloodsGilda: '1530567864137027596',
  bloodsGildaPvE: '1530571762532745376',
  bloodsGildaPvP: '1530571764072190022',
  communityDiv: '1530567889529077890',
  communityHub: '1530568100842442854',
  streamingZone: '1459554999653896242',
  assistenza: '1421540995828289596',
  // Game categories
  apex: '1529823034603601941',
  cs2: '1529619883036246049',
  dota2: '1529619887687729202',
  ffxiv: '1529823048734347355',
  lol: '1529619869279195157',
  minecraft: '1529823043944317029',
  valorant: '1529619865319772313',
  wow: '1530547350307868863',
  deltaForce: '1530959458123911361',
  diablo4: '1530968986827620402',
  palword: '1530969137042559209',
  pokemon: '1530969301895614715',
  starcraft2: '1530969387585114302',
  metin2: '1530969534859837571',
  rocketLeague: '1530969731379761365',
  cod: '1530969961835528214',
  poe: '1530970247212040242',
  dayz: '1530972761793761390',
  prigione: '1530571776470421734',
};

// Permission sets
const PERMS = {
  // Base community permissions (view, send, react, voice)
  community: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.UseVAD,
    PermissionFlagsBits.ChangeNickname,
    PermissionFlagsBits.UseApplicationCommands,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.CreatePublicThreads,
  ],
  // Bloods = community + stream + external stickers
  bloods: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.Stream,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.UseExternalStickers,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.UseVAD,
    PermissionFlagsBits.ChangeNickname,
    PermissionFlagsBits.UseApplicationCommands,
    PermissionFlagsBits.RequestToSpeak,
    PermissionFlagsBits.SendMessagesInThreads,
  ],
  // Staff = bloods + moderate + manage messages
  staff: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.MentionEveryone,
    PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.MuteMembers,
    PermissionFlagsBits.DeafenMembers,
    PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.UseVAD,
    PermissionFlagsBits.ChangeNickname,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.UseApplicationCommands,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.ModerateMembers,
  ],
  // Muted: deny send + speak
  muted: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.AddReactions,
  ],
  // Non verificato: deny view everything except Area Iniziale
  denyView: [PermissionFlagsBits.ViewChannel],
};

// Staff role IDs (for admin areas)
const STAFF_ROLES = [ROLES.owner, ROLES.founder, ROLES.consigliere, ROLES.bloodsAdmin, ROLES.officer, ROLES.officerReclutatore, ROLES.officerInProva];
const ADMIN_ROLES = [ROLES.owner, ROLES.founder, ROLES.consigliere, ROLES.bloodsAdmin];

// Game role IDs (for game categories)
const GAME_CATEGORIES = [
  { catId: CATEGORIES.apex, roleId: '1529619891957792898' },
  { catId: CATEGORIES.cs2, roleId: '1529619873192218695' },
  { catId: CATEGORIES.dota2, roleId: '1529619886421049475' },
  { catId: CATEGORIES.ffxiv, roleId: '1529619902070128680' },
  { catId: CATEGORIES.lol, roleId: '1529619868289204285' },
  { catId: CATEGORIES.minecraft, roleId: '1529619896990699621' },
  { catId: CATEGORIES.valorant, roleId: '1529619863977463919' },
  { catId: CATEGORIES.wow, roleId: '1530547348139413684' },
  { catId: CATEGORIES.deltaForce, roleId: '1530959456421023926' },
  { catId: CATEGORIES.diablo4, roleId: '1530968985024335963' },
  { catId: CATEGORIES.palword, roleId: '1530969134731362375' },
  { catId: CATEGORIES.pokemon, roleId: '1530969300297322627' },
  { catId: CATEGORIES.starcraft2, roleId: '1530969386142400582' },
  { catId: CATEGORIES.metin2, roleId: '1530969524604502059' },
  { catId: CATEGORIES.rocketLeague, roleId: '1530969729345388565' },
  { catId: CATEGORIES.cod, roleId: '1530969959604293663' },
  { catId: CATEGORIES.poe, roleId: '1530970237690974462' },
  { catId: CATEGORIES.dayz, roleId: '1530972759956656456' },
];

// Gilda categories (Bloods only)
const GILDA_CATEGORIES = [
  CATEGORIES.gildaDiv,
  CATEGORIES.bloodsInfo,
  CATEGORIES.bloodsRiunioni,
  CATEGORIES.bloodsGilda,
  CATEGORIES.bloodsGildaPvE,
  CATEGORIES.bloodsGildaPvP,
  CATEGORIES.prigione,
];

// Community categories (Membro della community +)
const COMMUNITY_CATEGORIES = [
  CATEGORIES.communityDiv,
  CATEGORIES.communityHub,
  CATEGORIES.streamingZone,
  CATEGORIES.assistenza,
];

async function setupCategory(guild, categoryId, config) {
  const category = guild.channels.cache.get(categoryId);
  if (!category) {
    logger.warn(`Category ${categoryId} not found, skipping`);
    return;
  }

  console.log(`  Setting up: ${category.name}`);

  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would apply ${config.overwrites.length} overwrites`);
    return;
  }

  try {
    await category.permissionOverwrites.set(config.overwrites);
    console.log(`    ✓ Applied ${config.overwrites.length} overwrites`);
  } catch (err) {
    console.error(`    ✗ Failed: ${err.message}`);
  }
}

async function setupAllChannels(guild, categoryId, overwrites) {
  const channels = [...guild.channels.cache.values()]
    .filter((c) => c.parentId === categoryId);

  for (const ch of channels) {
    // Skip channels that have specific overrides (like log-staff, dashboard-admin)
    // We only auto-set channels that don't have custom overwrites
    if (DRY_RUN) {
      console.log(`    [DRY RUN] ${ch.name}: would inherit from category`);
      continue;
    }
    // Channels inherit from category by default — no need to set per-channel
    // unless they have specific overrides
  }
}

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  await client.login(config.discord.token);
  const guild = client.guilds.cache.get(config.discord.guildId);
  if (!guild) {
    console.error('Guild not found!');
    process.exit(1);
  }

  await guild.channels.fetch();
  console.log(`\n=== Setting up permissions for ${guild.name} ===\n`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will apply changes)'}\n`);

  // === 1. FORUM (Admin only) ===
  console.log('--- FORUM (Admin + Staff) ---');
  await setupCategory(guild, CATEGORIES.forum, {
    overwrites: [
      { id: ROLES.everyone, deny: PERMS.denyView },
      { id: ROLES.nonVerificato, deny: PERMS.denyView },
      ...STAFF_ROLES.map((id) => ({ id, allow: PERMS.staff })),
    ],
  });

  // === 2. AREA INIZIALE (Everyone can see, but limited) ===
  console.log('\n--- AREA INIZIALE (Everyone) ---');
  await setupCategory(guild, CATEGORIES.areaIniziale, {
    overwrites: [
      { id: ROLES.everyone, allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ]},
      { id: ROLES.membroCommunity, allow: PERMS.community },
      { id: ROLES.bloods, allow: PERMS.bloods },
      { id: ROLES.nitroBooster, allow: PERMS.community },
      { id: ROLES.muted, deny: PERMS.muted },
    ],
  });

  // === 3. GILDA CATEGORIES (Bloods only) ===
  console.log('\n--- GILDA (Bloods only) ---');
  for (const catId of GILDA_CATEGORIES) {
    await setupCategory(guild, catId, {
      overwrites: [
        { id: ROLES.everyone, deny: PERMS.denyView },
        { id: ROLES.nonVerificato, deny: PERMS.denyView },
        { id: ROLES.membroCommunity, deny: PERMS.denyView }, // Community members can't see gilda
        { id: ROLES.bloods, allow: PERMS.bloods },
        ...STAFF_ROLES.map((id) => ({ id, allow: PERMS.staff })),
        { id: ROLES.muted, deny: PERMS.muted },
      ],
    });
  }

  // === 4. COMMUNITY CATEGORIES (Membro della community +) ===
  console.log('\n--- COMMUNITY (Membro della community +) ---');
  for (const catId of COMMUNITY_CATEGORIES) {
    await setupCategory(guild, catId, {
      overwrites: [
        { id: ROLES.everyone, deny: PERMS.denyView },
        { id: ROLES.nonVerificato, deny: PERMS.denyView },
        { id: ROLES.membroCommunity, allow: PERMS.community },
        { id: ROLES.bloods, allow: PERMS.bloods }, // Bloods also see community
        { id: ROLES.nitroBooster, allow: PERMS.community }, // Nitro = community
        ...STAFF_ROLES.map((id) => ({ id, allow: PERMS.staff })),
        { id: ROLES.muted, deny: PERMS.muted },
      ],
    });
  }

  // === 5. GAME CATEGORIES (Game role +) ===
  console.log('\n--- GAME CATEGORIES (Game role +) ---');
  for (const { catId, roleId } of GAME_CATEGORIES) {
    await setupCategory(guild, catId, {
      overwrites: [
        { id: ROLES.everyone, deny: PERMS.denyView },
        { id: ROLES.nonVerificato, deny: PERMS.denyView },
        { id: roleId, allow: PERMS.community },
        { id: ROLES.bloods, allow: PERMS.bloods }, // Bloods see all game channels
        { id: ROLES.nitroBooster, allow: PERMS.community }, // Nitro sees all games
        ...STAFF_ROLES.map((id) => ({ id, allow: PERMS.staff })),
        { id: ROLES.muted, deny: PERMS.muted },
      ],
    });
  }

  // === 6. NITRO BOOSTER ===
  // Note: Nitro Booster role is managed by Discord automatically.
  // "Membro della community" is given to ALL new users via verification (onboardingService).
  // Nitro Boost only gives XP bonus + thank you message (guildMemberUpdate event).
  // No role assignment needed here.
  console.log('\n--- NITRO BOOSTER (no role changes needed) ---');
  console.log('  Nitro Booster role is managed by Discord.');
  console.log('  Membro della community is given to all new users via verification.');

  // === 7. Set up guild settings: auto-role for Nitro Booster ===
  // Discord doesn't support "if nitro then role" natively, but we can use
  // guildMemberUpdate event to detect boost and add community role
  console.log('\n--- DONE ---');
  console.log(`\nSummary:`);
  console.log(`  - Forum: Admin + Staff only`);
  console.log(`  - Area Iniziale: Everyone (limited)`);
  console.log(`  - Gilda (${GILDA_CATEGORIES.length} categories): Bloods + Staff`);
  console.log(`  - Community (${COMMUNITY_CATEGORIES.length} categories): Membro community + Bloods + Nitro + Staff`);
  console.log(`  - Games (${GAME_CATEGORIES.length} categories): Game role + Bloods + Nitro + Staff`);
  console.log(`  - Nitro Boosters: XP bonus only (community role via verification)`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
