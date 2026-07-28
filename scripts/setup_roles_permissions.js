// scripts/setup_roles_permissions.js
// Complete roles & permissions overhaul
// PHASE 1: Delete "Membro fuori Gilda"
// PHASE 2: Reorder role hierarchy
// PHASE 3: Clean @everyone permissions (remove ViewChannel, SendMessages, etc.)
// PHASE 4: Clean custom role permissions (game roles, profession roles → 0 perms)
// PHASE 5: Set auto-role = "Membro della community"
// PHASE 6: Set category permissions per role group
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { Guild: GuildDB, Game } = require('../src/db');
const { toFraktur } = require('../src/utils/textFormatter');

const GUILD_ID = '1010226759817515018';

// Role IDs
const ROLE_IDS = {
  owner: '1418580128472240178',
  founder: '1461109465528143965',
  consigliere: '1418580069772951654',
  bloodsAdmin: '1529875116039606274',
  bot: '1422966848252805151',
  officer: '1012731374777663488',
  muted: '1530544414122840145',
  officerReclutatore: '1486107215302496327',
  wow: '1530547348139413684', // World of Warcraft
  giocatoreAttivo: '1530544444586066023',
  veterano: '1530544446452662362',
  leggenda: '1530544448134451413',
  officerInProva: '1452409084161691718',
  guidaIncursioni: '1420070512167620628',
  guidaSpedizioni: '1420070587354583222',
  capoFazioneTank: '1421488643054506045',
  capoFazioneDPS: '1421488359317962792',
  capoFazioneHealer: '1421488482970243217',
  capoFazionePvP: '1420070656594284584',
  nitroBooster: '1460043465877618739',
  streamer: '1459560583765561499',
  progress: '1424157979401388053',
  bloods: '1013186233993810100',
  membroCommunity: '1421545567179243550',
  membroFuoriGilda: '1421545935665893416', // TO DELETE
  pvp: '1424157924007346367',
  membroSocial: '1484592522209792070',
  // Professioni WoW
  alchimia: '1459337791799562393',
  forgiatura: '1459337864218411129',
  ingegneria: '1459337937186459689',
  oreficeria: '1459337982505914717',
  runografia: '1459338210005090406',
  conciatura: '1459338273099878574',
  sartoria: '1459338315479126241',
  erbalismo: '1459338416456990810',
  estrazione: '1459338462250401994',
  scuoiatura: '1459338508106862908',
  // Game roles
  valorant: '1529619863977463919',
  lol: '1529619868289204285',
  cs2: '1529619873192218695',
  dota2: '1529619886421049475',
  apex: '1529619890145218652',
  minecraft: '1529619895140339775',
  ffxiv: '1529619902070128680',
  wowGame: null, // will be set from DB
};

// Desired hierarchy (highest to lowest). Position in Discord = index from top.
// We'll set positions so that the order matches this array.
const HIERARCHY = [
  ROLE_IDS.owner,           // 52
  ROLE_IDS.founder,         // 51
  ROLE_IDS.consigliere,     // 50
  ROLE_IDS.bloodsAdmin,     // 49
  ROLE_IDS.bot,             // 48 — bot must be here to manage below
  ROLE_IDS.officer,         // 47
  ROLE_IDS.officerReclutatore, // 45
  ROLE_IDS.officerInProva,  // 40
  ROLE_IDS.guidaIncursioni, // 39
  ROLE_IDS.guidaSpedizioni, // 38
  ROLE_IDS.capoFazioneTank, // 37
  ROLE_IDS.capoFazioneDPS,  // 36
  ROLE_IDS.capoFazioneHealer, // 35
  ROLE_IDS.capoFazionePvP,  // 34
  ROLE_IDS.nitroBooster,    // 33 (boost, managed — can't move)
  ROLE_IDS.streamer,        // 32
  ROLE_IDS.progress,        // 31
  ROLE_IDS.giocatoreAttivo, // 43
  ROLE_IDS.veterano,        // 42
  ROLE_IDS.leggenda,        // 41
  ROLE_IDS.bloods,          // 30
  ROLE_IDS.membroCommunity, // 29
  ROLE_IDS.pvp,             // 27
  ROLE_IDS.membroSocial,    // 16
  // Professioni WoW
  ROLE_IDS.alchimia,
  ROLE_IDS.forgiatura,
  ROLE_IDS.ingegneria,
  ROLE_IDS.oreficeria,
  ROLE_IDS.runografia,
  ROLE_IDS.conciatura,
  ROLE_IDS.sartoria,
  ROLE_IDS.erbalismo,
  ROLE_IDS.estrazione,
  ROLE_IDS.scuoiatura,
  // Game roles (will be fetched from DB)
  // ... appended at runtime
];

// Roles that should have 0 permissions (placeholder/identifier roles)
const PLACEHOLDER_ROLES = [
  ROLE_IDS.giocatoreAttivo,
  ROLE_IDS.veterano,
  ROLE_IDS.leggenda,
  ROLE_IDS.officerInProva,
  ROLE_IDS.capoFazioneTank,
  ROLE_IDS.capoFazioneDPS,
  ROLE_IDS.capoFazioneHealer,
  ROLE_IDS.capoFazionePvP,
  ROLE_IDS.streamer,
  ROLE_IDS.progress,
  ROLE_IDS.pvp,
  ROLE_IDS.membroSocial,
  ROLE_IDS.alchimia,
  ROLE_IDS.forgiatura,
  ROLE_IDS.ingegneria,
  ROLE_IDS.oreficeria,
  ROLE_IDS.runografia,
  ROLE_IDS.conciatura,
  ROLE_IDS.sartoria,
  ROLE_IDS.erbalismo,
  ROLE_IDS.estrazione,
  ROLE_IDS.scuoiatura,
];

// Game roles: 0 permissions (access is via category overwrite)
const GAME_ROLE_PERMS = [];

// Staff roles: keep their management perms but we'll define them explicitly
const STAFF_PERMS = {
  [ROLE_IDS.owner]: PermissionsBitField.All, // Administrator
  [ROLE_IDS.founder]: PermissionsBitField.All,
  [ROLE_IDS.consigliere]: new PermissionsBitField([
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.ManageThreads,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.ManageNicknames,
    PermissionsBitField.Flags.ManageWebhooks,
    PermissionsBitField.Flags.ManageEvents,
    PermissionsBitField.Flags.ViewAuditLog,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.SendMessagesInThreads,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.UseExternalEmojis,
    PermissionsBitField.Flags.UseExternalStickers,
    PermissionsBitField.Flags.MentionEveryone,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.UseApplicationCommands,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.Stream,
    PermissionsBitField.Flags.UseVAD,
    PermissionsBitField.Flags.PrioritySpeaker,
    PermissionsBitField.Flags.MuteMembers,
    PermissionsBitField.Flags.DeafenMembers,
    PermissionsBitField.Flags.MoveMembers,
    PermissionsBitField.Flags.RequestToSpeak,
    PermissionsBitField.Flags.ChangeNickname,
    PermissionsBitField.Flags.CreateInstantInvite,
    PermissionsBitField.Flags.ViewChannel,
  ]).bitfield,
  [ROLE_IDS.bloodsAdmin]: new PermissionsBitField([
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.ViewAuditLog,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.UseExternalEmojis,
    PermissionsBitField.Flags.MentionEveryone,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.UseApplicationCommands,
  ]).bitfield,
  [ROLE_IDS.officer]: new PermissionsBitField([
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.ManageNicknames,
    PermissionsBitField.Flags.ManageEvents,
    PermissionsBitField.Flags.ViewAuditLog,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.SendMessagesInThreads,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.UseExternalEmojis,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.UseApplicationCommands,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.Stream,
    PermissionsBitField.Flags.UseVAD,
    PermissionsBitField.Flags.PrioritySpeaker,
    PermissionsBitField.Flags.MuteMembers,
    PermissionsBitField.Flags.DeafenMembers,
    PermissionsBitField.Flags.MoveMembers,
    PermissionsBitField.Flags.RequestToSpeak,
    PermissionsBitField.Flags.ChangeNickname,
    PermissionsBitField.Flags.CreateInstantInvite,
    PermissionsBitField.Flags.ViewChannel,
  ]).bitfield,
  [ROLE_IDS.officerReclutatore]: new PermissionsBitField([
    PermissionsBitField.Flags.ManageNicknames,
    PermissionsBitField.Flags.ManageEvents,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.SendMessagesInThreads,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.UseApplicationCommands,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.ChangeNickname,
    PermissionsBitField.Flags.CreateInstantInvite,
    PermissionsBitField.Flags.ViewChannel,
  ]).bitfield,
  [ROLE_IDS.officerInProva]: new PermissionsBitField([
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.UseApplicationCommands,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.ChangeNickname,
    PermissionsBitField.Flags.ViewChannel,
  ]).bitfield,
  [ROLE_IDS.guidaIncursioni]: new PermissionsBitField([
    PermissionsBitField.Flags.ManageEvents,
    PermissionsBitField.Flags.UseApplicationCommands,
    PermissionsBitField.Flags.PrioritySpeaker,
    PermissionsBitField.Flags.MuteMembers,
    PermissionsBitField.Flags.DeafenMembers,
    PermissionsBitField.Flags.MoveMembers,
    PermissionsBitField.Flags.RequestToSpeak,
    PermissionsBitField.Flags.ChangeNickname,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.ViewChannel,
  ]).bitfield,
  [ROLE_IDS.guidaSpedizioni]: new PermissionsBitField([
    PermissionsBitField.Flags.ManageEvents,
    PermissionsBitField.Flags.UseApplicationCommands,
    PermissionsBitField.Flags.PrioritySpeaker,
    PermissionsBitField.Flags.MuteMembers,
    PermissionsBitField.Flags.DeafenMembers,
    PermissionsBitField.Flags.MoveMembers,
    PermissionsBitField.Flags.RequestToSpeak,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.ViewChannel,
  ]).bitfield,
};

// Bloods role: base member perms (no admin)
const BLOODS_PERMS = new PermissionsBitField([
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.SendMessagesInThreads,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.AddReactions,
  PermissionsBitField.Flags.UseExternalEmojis,
  PermissionsBitField.Flags.UseExternalStickers,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.UseApplicationCommands,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
  PermissionsBitField.Flags.Stream,
  PermissionsBitField.Flags.UseVAD,
  PermissionsBitField.Flags.RequestToSpeak,
  PermissionsBitField.Flags.ChangeNickname,
  PermissionsBitField.Flags.ViewChannel,
]).bitfield;

// Membro Community: base community perms
const COMMUNITY_PERMS = new PermissionsBitField([
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.SendMessagesInThreads,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.AddReactions,
  PermissionsBitField.Flags.UseExternalEmojis,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.UseApplicationCommands,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
  PermissionsBitField.Flags.UseVAD,
  PermissionsBitField.Flags.RequestToSpeak,
  PermissionsBitField.Flags.ChangeNickname,
  PermissionsBitField.Flags.ViewChannel,
]).bitfield;

// @everyone: minimal perms (no ViewChannel, no SendMessages by default)
const EVERYONE_PERMS = new PermissionsBitField([
  PermissionsBitField.Flags.ChangeNickname,
  PermissionsBitField.Flags.ReadMessageHistory, // needed for visible channels
]).bitfield;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.fetch();
  await guild.roles.fetch();
  await guild.channels.fetch();

  const botMember = await guild.members.fetch(client.user.id);
  console.log('=== ROLES & PERMISSIONS OVERHAUL ===\n');
  console.log(`Bot highest role: ${botMember.roles.highest.name} (pos:${botMember.roles.highest.position})\n`);

  // ==========================================
  // PHASE 1: Delete "Membro fuori Gilda"
  // ==========================================
  console.log('--- PHASE 1: Delete Membro fuori Gilda ---');
  const membroFuoriGilda = guild.roles.cache.get(ROLE_IDS.membroFuoriGilda);
  if (membroFuoriGilda) {
    try {
      await membroFuoriGilda.delete('Reorganization: role no longer needed');
      console.log('  ✓ Deleted "Membro fuori Gilda"');
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message.substring(0, 80)}`);
    }
  } else {
    console.log('  - Already deleted');
  }

  // ==========================================
  // PHASE 2: Reorder hierarchy
  // ==========================================
  console.log('\n--- PHASE 2: Reorder hierarchy ---');
  // Get game roles from DB
  const games = await Game.findAll({ where: { is_active: true } });
  const gameRoleIds = games.map((g) => g.role_id).filter(Boolean);
  // Add WoW game role
  const wowGame = games.find((g) => g.name.toLowerCase().includes('warcraft'));
  if (wowGame?.role_id) ROLE_IDS.wowGame = wowGame.role_id;

  // Full hierarchy: HIERARCHY + game roles at the bottom
  const fullHierarchy = [...HIERARCHY, ...gameRoleIds].filter(Boolean);

  // Set positions from highest to lowest
  // Discord: higher position = higher in hierarchy
  // We need to set positions so that index 0 = highest
  // Discord max position = (total roles - 1) for @everyone = 0
  // We'll use setPositions which handles this

  // Build position map: role -> desired position (highest first)
  // Discord API: position 0 = lowest. We want HIERARCHY[0] = highest.
  // Total custom roles = fullHierarchy.length. @everyone = 0.
  // Highest custom role position = fullHierarchy.length (since @everyone is 0)
  const totalCustom = fullHierarchy.length;
  const positionMap = [];
  for (let i = 0; i < fullHierarchy.length; i++) {
    const roleId = fullHierarchy[i];
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      console.log(`  ⚠ Role ${roleId} not found — skipping`);
      continue;
    }
    if (role.managed) {
      console.log(`  - "${role.name}" is managed (bot/boost) — skipping position change`);
      continue;
    }
    positionMap.push({ role: roleId, position: totalCustom - i });
  }

  try {
    await guild.roles.setPositions(positionMap);
    console.log(`  ✓ Set positions for ${positionMap.length} roles`);
  } catch (err) {
    console.log(`  ✗ setPosition failed: ${err.message.substring(0, 100)}`);
    // Fallback: set positions one by one
    console.log('  → Trying one by one...');
    for (const { role: roleId, position } of positionMap) {
      try {
        const role = guild.roles.cache.get(roleId);
        await role.setPosition(position);
        console.log(`  ✓ "${role.name}" → pos ${position}`);
      } catch (err2) {
        console.log(`  ✗ "${roleId}": ${err2.message.substring(0, 60)}`);
      }
    }
  }

  // ==========================================
  // PHASE 3: Clean @everyone permissions
  // ==========================================
  console.log('\n--- PHASE 3: Clean @everyone permissions ---');
  const everyoneRole = guild.roles.everyone;
  try {
    await everyoneRole.setPermissions(EVERYONE_PERMS, 'Reorganization: restrict @everyone');
    console.log('  ✓ @everyone permissions set to minimal (ChangeNickname + ReadMessageHistory only)');
  } catch (err) {
    console.log(`  ✗ Failed: ${err.message.substring(0, 80)}`);
  }

  // ==========================================
  // PHASE 4: Clean custom role permissions
  // ==========================================
  console.log('\n--- PHASE 4: Clean custom role permissions ---');

  // 4a. Staff roles
  for (const [roleId, perms] of Object.entries(STAFF_PERMS)) {
    const role = guild.roles.cache.get(roleId);
    if (!role) { console.log(`  ⚠ ${roleId} not found`); continue; }
    if (role.position >= botMember.roles.highest.position) {
      console.log(`  ⚠ "${role.name}" above bot — CANNOT change perms`);
      continue;
    }
    try {
      await role.setPermissions(perms, 'Reorganization: staff perms');
      console.log(`  ✓ "${role.name}" → staff perms`);
    } catch (err) {
      console.log(`  ✗ "${role.name}": ${err.message.substring(0, 60)}`);
    }
  }

  // 4b. Bloods role
  const bloodsRole = guild.roles.cache.get(ROLE_IDS.bloods);
  if (bloodsRole) {
    try {
      await bloodsRole.setPermissions(BLOODS_PERMS, 'Reorganization: Bloods member perms');
      console.log(`  ✓ "Bloods" → member perms`);
    } catch (err) {
      console.log(`  ✗ "Bloods": ${err.message.substring(0, 60)}`);
    }
  }

  // 4c. Membro Community
  const communityRole = guild.roles.cache.get(ROLE_IDS.membroCommunity);
  if (communityRole) {
    try {
      await communityRole.setPermissions(COMMUNITY_PERMS, 'Reorganization: community perms');
      console.log(`  ✓ "Membro della community" → community perms`);
    } catch (err) {
      console.log(`  ✗ "Membro della community": ${err.message.substring(0, 60)}`);
    }
  }

  // 4d. Placeholder roles → 0 perms
  for (const roleId of PLACEHOLDER_ROLES) {
    const role = guild.roles.cache.get(roleId);
    if (!role) { continue; }
    try {
      await role.setPermissions(0n, 'Reorganization: placeholder role');
      console.log(`  ✓ "${role.name}" → 0 perms (placeholder)`);
    } catch (err) {
      console.log(`  ✗ "${role.name}": ${err.message.substring(0, 60)}`);
    }
  }

  // 4e. Game roles → 0 perms (access via category overwrite)
  for (const gameId of gameRoleIds) {
    const role = guild.roles.cache.get(gameId);
    if (!role) { continue; }
    try {
      await role.setPermissions(0n, 'Reorganization: game role (access via category)');
      console.log(`  ✓ "${role.name}" → 0 perms (game role)`);
    } catch (err) {
      console.log(`  ✗ "${role.name}": ${err.message.substring(0, 60)}`);
    }
  }

  // 4f. Muted role → 0 perms (already 0, but ensure)
  const mutedRole = guild.roles.cache.get(ROLE_IDS.muted);
  if (mutedRole) {
    try {
      await mutedRole.setPermissions(0n, 'Reorganization: Muted role');
      console.log(`  ✓ "Muted" → 0 perms`);
    } catch (err) {
      console.log(`  ✗ "Muted": ${err.message.substring(0, 60)}`);
    }
  }

  // ==========================================
  // PHASE 5: Set auto-role in DB
  // ==========================================
  console.log('\n--- PHASE 5: Set auto-role ---');
  const guildRow = await GuildDB.findOne({ where: { guild_id: GUILD_ID } });
  if (guildRow) {
    await guildRow.update({ auto_role_id: ROLE_IDS.membroCommunity });
    console.log(`  ✓ auto_role_id → "Membro della community" (${ROLE_IDS.membroCommunity})`);
  }

  // ==========================================
  // PHASE 6: Category permissions
  // ==========================================
  console.log('\n--- PHASE 6: Category permissions ---');

  // Helper: set category overwrites
  async function setCategoryPerms(catId, overwrites) {
    const cat = guild.channels.cache.get(catId);
    if (!cat) { console.log(`  ⚠ Category ${catId} not found`); return; }
    try {
      await cat.permissionOverwrites.set(overwrites, 'Reorganization: category perms');
      console.log(`  ✓ "${cat.name}" perms set`);
    } catch (err) {
      console.log(`  ✗ "${cat.name}": ${err.message.substring(0, 80)}`);
    }
  }

  const everyoneId = guild.roles.everyone.id;
  const VIEW = PermissionsBitField.Flags.ViewChannel;
  const SEND = PermissionsBitField.Flags.SendMessages;
  const READ = PermissionsBitField.Flags.ReadMessageHistory;
  const CONNECT = PermissionsBitField.Flags.Connect;
  const SPEAK = PermissionsBitField.Flags.Speak;
  const STREAM = PermissionsBitField.Flags.Stream;
  const USE_VAD = PermissionsBitField.Flags.UseVAD;
  const EMBED = PermissionsBitField.Flags.EmbedLinks;
  const ATTACH = PermissionsBitField.Flags.AttachFiles;
  const REACT = PermissionsBitField.Flags.AddReactions;
  const EXTERNAL_EMOJI = PermissionsBitField.Flags.UseExternalEmojis;
  const APP_CMD = PermissionsBitField.Flags.UseApplicationCommands;
  const SEND_THREADS = PermissionsBitField.Flags.SendMessagesInThreads;
  const EXTERNAL_STICKERS = PermissionsBitField.Flags.UseExternalStickers;
  const USE_SOUNDBOARD = PermissionsBitField.Flags.UseSoundboard;
  const USE_EXT_SOUNDS = PermissionsBitField.Flags.UseExternalSounds;
  const USE_EMBED_ACT = PermissionsBitField.Flags.UseEmbeddedActivities;
  const REQUEST_SPEAK = PermissionsBitField.Flags.RequestToSpeak;
  const CHANGE_NICK = PermissionsBitField.Flags.ChangeNickname;
  const CREATE_INVITE = PermissionsBitField.Flags.CreateInstantInvite;

  // Common allow sets
  const TEXT_ALLOW = [VIEW, READ, SEND, SEND_THREADS, EMBED, ATTACH, REACT, EXTERNAL_EMOJI, EXTERNAL_STICKERS, APP_CMD];
  const VOICE_ALLOW = [VIEW, CONNECT, SPEAK, STREAM, USE_VAD, REQUEST_SPEAK, USE_SOUNDBOARD, USE_EXT_SOUNDS, USE_EMBED_ACT];
  const ALL_ALLOW = [...TEXT_ALLOW, ...VOICE_ALLOW, CHANGE_NICK, CREATE_INVITE];

  // Staff roles that can see everything
  const STAFF_ROLES = [ROLE_IDS.owner, ROLE_IDS.founder, ROLE_IDS.consigliere, ROLE_IDS.bloodsAdmin, ROLE_IDS.officer, ROLE_IDS.officerReclutatore, ROLE_IDS.officerInProva];

  // 6a. INIZIO — visible to @everyone (but @everyone can only read, Membro Community can write)
  const inicio = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖨𝖭𝖨𝖹𝖨𝖮')
  );
  if (inicio) {
    await setCategoryPerms(inicio.id, [
      { id: everyoneId, allow: [VIEW, READ], deny: [SEND] }, // everyone can see & read but not write
      { id: ROLE_IDS.membroCommunity, allow: ALL_ALLOW },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW },
      { id: ROLE_IDS.muted, deny: [SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6b. GILDA divisore — hidden from @everyone, visible to Bloods+
  const gildaDiv = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('🏰 GILDA')
  );
  if (gildaDiv) {
    await setCategoryPerms(gildaDiv.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.bloods, allow: [VIEW] },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, CONNECT] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6c. Bloods Gilda (generale) — Bloods+ only
  const bloodsGilda = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name === '🏰 𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺'
  );
  if (bloodsGilda) {
    await setCategoryPerms(bloodsGilda.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6d. Bloods Gilda PvE — Bloods+ only
  const bloodsPvE = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖤')
  );
  if (bloodsPvE) {
    await setCategoryPerms(bloodsPvE.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW },
      // Guida Incursioni/Spedizioni get extra perms (PrioritySpeaker, MuteMembers)
      { id: ROLE_IDS.guidaIncursioni, allow: [...ALL_ALLOW, PermissionsBitField.Flags.PrioritySpeaker, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers, PermissionsBitField.Flags.MoveMembers] },
      { id: ROLE_IDS.guidaSpedizioni, allow: [...ALL_ALLOW, PermissionsBitField.Flags.PrioritySpeaker, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers, PermissionsBitField.Flags.MoveMembers] },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6e. Bloods Gilda PvP — Bloods+ only
  const bloodsPvP = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖯')
  );
  if (bloodsPvP) {
    await setCategoryPerms(bloodsPvP.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW },
      // Capo Fazione PvP + PvP role get access
      { id: ROLE_IDS.capoFazionePvP, allow: [...ALL_ALLOW, PermissionsBitField.Flags.PrioritySpeaker, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.MoveMembers] },
      { id: ROLE_IDS.pvp, allow: ALL_ALLOW },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6f. COMMUNITY divisore — visible to Membro Community+
  const communityDiv = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('🌐 COMMUNITY')
  );
  if (communityDiv) {
    await setCategoryPerms(communityDiv.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.membroCommunity, allow: [VIEW] },
      { id: ROLE_IDS.bloods, allow: [VIEW] },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, CONNECT] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6g. Community Hub — Membro Community+ (read for everyone, write for staff)
  const communityHub = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒 𝖧𝗎𝖻')
  );
  if (communityHub) {
    await setCategoryPerms(communityHub.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.membroCommunity, allow: [VIEW, READ] }, // read-only for community
      { id: ROLE_IDS.bloods, allow: [VIEW, READ] },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, CONNECT] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6h. Streaming Zone — visible to Membro Community+ (Streamers get extra)
  const streaming = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖲𝗍𝗋𝖾𝖺𝗆𝗂𝗇𝗍')
  );
  if (streaming) {
    await setCategoryPerms(streaming.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.membroCommunity, allow: ALL_ALLOW },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW },
      { id: ROLE_IDS.streamer, allow: [...ALL_ALLOW, STREAM, USE_EMBED_ACT] },
      { id: ROLE_IDS.nitroBooster, allow: [...ALL_ALLOW, STREAM, USE_EMBED_ACT] },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6i. Assistenza — visible to Membro Community+ (ticket system)
  const assistenza = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖠𝗌𝗌𝗂𝗌𝗍𝖾𝗇𝗓𝖺')
  );
  if (assistenza) {
    await setCategoryPerms(assistenza.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.membroCommunity, allow: ALL_ALLOW },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6j. Forum — visible to Membro Community+
  const forum = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name === '𝖥𝗈𝗋𝗎𝗆'
  );
  if (forum) {
    await setCategoryPerms(forum.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.membroCommunity, allow: ALL_ALLOW },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW },
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6k. Game categories — visible only to that game's role + Bloods + Staff
  for (const game of games) {
    if (!game.category_id || !game.role_id) continue;
    const cat = guild.channels.cache.get(game.category_id);
    if (!cat) continue;
    const gameRole = guild.roles.cache.get(game.role_id);
    if (!gameRole) continue;

    await setCategoryPerms(cat.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: game.role_id, allow: ALL_ALLOW },
      { id: ROLE_IDS.bloods, allow: ALL_ALLOW }, // Bloods members can see all games
      { id: ROLE_IDS.muted, deny: [VIEW, SEND, SEND_THREADS, CONNECT, SPEAK] },
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // 6l. Prigione — Staff only (hidden from everyone else)
  const prigione = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖯𝗋𝗂𝗀𝗂𝗈𝗇𝖾')
  );
  if (prigione) {
    await setCategoryPerms(prigione.id, [
      { id: everyoneId, deny: [VIEW] },
      { id: ROLE_IDS.muted, allow: [VIEW, CONNECT], deny: [SEND, SEND_THREADS, SPEAK] }, // muted can see & join but not speak
      ...STAFF_ROLES.map((id) => ({ id, allow: ALL_ALLOW })),
    ]);
  }

  // ==========================================
  // DONE
  // ==========================================
  console.log('\n=== OVERHAUL COMPLETE ===\n');

  // Print final role hierarchy
  await guild.roles.fetch();
  const finalRoles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
  console.log('--- FINAL HIERARCHY ---');
  for (const role of finalRoles) {
    if (role.id === everyoneId) {
      console.log(`  pos 0: @everyone (perms: ${role.permissions.toArray().length})`);
      continue;
    }
    const type = role.managed ? (role.tags?.botId ? 'BOT' : 'BOOST') : 'CUSTOM';
    console.log(`  pos ${role.position}: "${role.name}" (${type}, perms: ${role.permissions.toArray().length}, members: ${role.members.size})`);
  }

  process.exit(0);
});

client.login(config.discord.token);
