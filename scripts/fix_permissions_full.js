// scripts/fix_permissions_full.js
// Comprehensive permission fix for all categories and channels.
// Categorizes by DB game match + existing permission structure, not by name.
const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { connectDB, Game, Guild } = require('../src/db');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel, Partials.GuildMember],
});

// Staff roles that see EVERYTHING
const STAFF_ROLE_NAMES = [
  'Owner', 'Founder', 'Consigliere', 'Bloods Admin',
  'Officer', 'Officer Reclutatore', 'Officer in Prova',
];

const GAME_ROLE_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
  PermissionsBitField.Flags.UseVAD,
  PermissionsBitField.Flags.Stream,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.AddReactions,
  PermissionsBitField.Flags.UseExternalEmojis,
  PermissionsBitField.Flags.UseApplicationCommands,
];

const STAFF_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
  PermissionsBitField.Flags.MuteMembers,
  PermissionsBitField.Flags.MoveMembers,
  PermissionsBitField.Flags.ManageMessages,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.AddReactions,
  PermissionsBitField.Flags.UseApplicationCommands,
];

const MEMBER_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
  PermissionsBitField.Flags.UseVAD,
  PermissionsBitField.Flags.Stream,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.AddReactions,
  PermissionsBitField.Flags.UseExternalEmojis,
  PermissionsBitField.Flags.UseApplicationCommands,
];

const PUBLIC_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
];

const DRY_RUN = process.argv.includes('--dry-run');

// Normalize Sans-Serif/Mathematical Unicode to ASCII for name matching
function normalize(str) {
  if (!str) return '';
  return str
    // Remove decorative characters
    .replace(/[═🦅🏰🌐🎮]/g, '')
    // Mathematical Sans-Serif Uppercase A-Z: U+1D5A0 .. U+1D5B9
    .replace(/[\u{1D5A0}-\u{1D5B9}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D5A0 + 65))
    // Mathematical Sans-Serif Lowercase a-z: U+1D5BA .. U+1D5D3
    .replace(/[\u{1D5BA}-\u{1D5D3}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D5BA + 97))
    // Mathematical Sans-Serif Digits 0-9: U+1D7EC .. U+1D7F5
    .replace(/[\u{1D7EC}-\u{1D7F5}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D7EC + 48))
    .trim()
    .toLowerCase();
}

async function fix() {
  await connectDB();
  await client.login(config.discord.token);
  await new Promise((r) => client.once('clientReady', r));
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (applying fixes)'}\n`);

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) { console.error('Guild not found!'); process.exit(1); }

  await guild.roles.fetch();
  await guild.channels.fetch();

  // Build role maps
  const staffRoles = {};
  for (const name of STAFF_ROLE_NAMES) {
    const role = guild.roles.cache.find(r => r.name.toLowerCase().includes(name.toLowerCase()));
    if (role) staffRoles[name] = role;
    else console.log(`WARN: Staff role "${name}" not found`);
  }

  const memberRole = guild.roles.cache.find(r => r.name === 'Membro della community');
  const nitroRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('nitro'));
  const streamerRole = guild.roles.cache.find(r => r.name === 'Streamer');
  const everyoneRole = guild.roles.everyone;

  // Get games from DB
  const games = await Game.findAll({ where: { is_active: true }, raw: true });
  console.log(`Found ${games.length} active games in DB\n`);

  const categories = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  let fixed = 0;
  let errors = 0;
  const allChanges = [];

  for (const cat of categories) {
    const game = games.find(g => g.category_id === cat.id);
    const isGameCategory = !!game;
    const gameRole = game ? guild.roles.cache.get(game.role_id) : null;
    const normName = normalize(cat.name);

    // Determine category type by normalized name
    const isPublic = normName.includes('iniziale') || normName.includes('info') || normName.includes('riunion');
    const isStaffOnly = normName.includes('forum') ||
      (normName.includes('gilda') && !normName.includes('info') && !normName.includes('riunion')) ||
      normName.includes('prigione') || normName.includes('assisten') || normName.includes('streaming');
    const isCommunity = normName.includes('community') || normName.includes('hub');
    const isSeparator = normName.startsWith('===') || normName.includes('===') || cat.children.size === 0;

    // Skip separators (empty categories used as dividers)
    if (isSeparator && !isGameCategory) {
      // For separator categories, just set @everyone deny + staff allow
      console.log(`\n--- ${cat.name} --- (SEPARATOR)`);
      const overwrites = [{
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      }];
      for (const [, staffRole] of Object.entries(staffRoles)) {
        overwrites.push({ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] });
      }
      if (!DRY_RUN) {
        try {
          await cat.permissionOverwrites.set(overwrites, 'Permission audit fix - separator');
          fixed++;
        } catch (err) { console.log(`  ERROR: ${err.message}`); errors++; }
      }
      continue;
    }

    const catType = isGameCategory ? 'GAME' : isPublic ? 'PUBLIC' : isStaffOnly ? 'STAFF-ONLY' : isCommunity ? 'COMMUNITY' : 'STAFF-ONLY';
    console.log(`\n--- ${cat.name} --- (${catType})`);
    if (game) console.log(`  Game: ${game.name} (role: ${gameRole?.name || 'NOT FOUND'})`);

    const overwrites = [];

    if (isGameCategory) {
      // GAME: @everyone denied, game role allowed, nitro see, staff full
      overwrites.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      if (gameRole) {
        overwrites.push({ id: gameRole.id, allow: GAME_ROLE_PERMS });
      } else {
        console.log(`  ERROR: Game role not found!`);
        errors++;
      }
      if (nitroRole) overwrites.push({ id: nitroRole.id, allow: [PermissionsBitField.Flags.ViewChannel] });
      for (const [, staffRole] of Object.entries(staffRoles)) {
        overwrites.push({ id: staffRole.id, allow: STAFF_PERMS });
      }
    } else if (isPublic) {
      // PUBLIC: everyone can see
      overwrites.push({ id: everyoneRole.id, allow: PUBLIC_PERMS });
      if (memberRole) overwrites.push({ id: memberRole.id, allow: MEMBER_PERMS });
      if (nitroRole) overwrites.push({ id: nitroRole.id, allow: MEMBER_PERMS });
    } else if (isCommunity) {
      // COMMUNITY: @everyone denied, member allowed, nitro allowed, staff allowed
      overwrites.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      if (memberRole) overwrites.push({ id: memberRole.id, allow: MEMBER_PERMS });
      if (nitroRole) overwrites.push({ id: nitroRole.id, allow: MEMBER_PERMS });
      for (const [, staffRole] of Object.entries(staffRoles)) {
        overwrites.push({ id: staffRole.id, allow: STAFF_PERMS });
      }
    } else {
      // STAFF-ONLY: @everyone denied, staff allowed
      overwrites.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      for (const [, staffRole] of Object.entries(staffRoles)) {
        overwrites.push({ id: staffRole.id, allow: STAFF_PERMS });
      }
      // Streaming Zone: also allow Streamer role
      if (normName.includes('streaming') && streamerRole) {
        overwrites.push({
          id: streamerRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream],
        });
      }
      // Gilda PvE/PvP: also allow "Progress" role and WoW role
      if (normName.includes('gilda') && !normName.includes('info') && !normName.includes('riunion')) {
        const wowGame = games.find(g => g.code === 'wow');
        const wowRole = wowGame ? guild.roles.cache.get(wowGame.role_id) : null;
        if (wowRole) overwrites.push({ id: wowRole.id, allow: GAME_ROLE_PERMS });
        const progressRole = guild.roles.cache.find(r => r.name === 'Progress');
        if (progressRole) overwrites.push({ id: progressRole.id, allow: GAME_ROLE_PERMS });
      }
    }

    // Apply
    if (DRY_RUN) {
      console.log(`  DRY RUN: Would set ${overwrites.length} overwrites`);
      for (const ow of overwrites) {
        const role = guild.roles.cache.get(ow.id);
        const name = role ? role.name : '@everyone';
        console.log(`    ${name}: allow=${ow.allow?.length || 0} deny=${ow.deny?.length || 0}`);
      }
    } else {
      try {
        await cat.permissionOverwrites.set(overwrites, 'Permission audit fix');
        console.log(`  OK: Set ${overwrites.length} overwrites`);
        fixed++;
        allChanges.push({ category: cat.name, overwrites: overwrites.length });
      } catch (err) {
        console.log(`  ERROR: ${err.message}`);
        errors++;
      }
    }

    // Fix child channels: remove @everyone ViewChannel allow on game channels
    const children = [...guild.channels.cache.values()].filter(c => c.parentId === cat.id);
    for (const child of children) {
      const childEveryone = child.permissionOverwrites.cache.get(everyoneRole.id);
      if (childEveryone && childEveryone.allow.has(PermissionsBitField.Flags.ViewChannel) && isGameCategory) {
        if (DRY_RUN) {
          console.log(`  DRY RUN: Would remove @everyone ViewChannel override on #${child.name}`);
        } else {
          try {
            await child.permissionOverwrites.delete(everyoneRole.id, 'Permission audit - remove game override');
            console.log(`  Fixed: removed @everyone override on #${child.name}`);
          } catch (err) { console.log(`  ERROR on #${child.name}: ${err.message}`); }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  SUMMARY: ${fixed} categories fixed, ${errors} errors`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('='.repeat(60));

  await client.destroy();
  process.exit(0);
}

fix().catch(err => { console.error('Fix failed:', err); process.exit(1); });
