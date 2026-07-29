// scripts/audit_permissions_full.js
// Full permission audit: roles hierarchy, channel visibility, game role coherence.
const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { connectDB } = require('../src/db');
const { Game } = require('../src/db');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel, Partials.GuildMember],
});

// Expected role hierarchy (top = highest)
const EXPECTED_HIERARCHY = [
  'Owner',
  'Founder',
  'Consigliere',
  'Bloods Admin',
  'Officer',
  'Officer Reclutatore',
  'Officer in Prova',
  'Nitro Booster',
  'Membro della community',
  'Non Verificato',
];

// Staff roles that should see ALL channels
const STAFF_ROLES = ['Owner', 'Founder', 'Consigliere', 'Bloods Admin', 'Officer', 'Officer Reclutatore', 'Officer in Prova'];

// Game roles (will be fetched from DB)
let gameRoles = [];

function permsToString(perms) {
  const flags = [];
  if (perms.has(PermissionsBitField.Flags.ViewChannel)) flags.push('View');
  if (perms.has(PermissionsBitField.Flags.SendMessages)) flags.push('Send');
  if (perms.has(PermissionsBitField.Flags.Connect)) flags.push('Connect');
  if (perms.has(PermissionsBitField.Flags.Speak)) flags.push('Speak');
  if (perms.has(PermissionsBitField.Flags.ManageChannels)) flags.push('ManageCh');
  if (perms.has(PermissionsBitField.Flags.ManageRoles)) flags.push('ManageRoles');
  if (perms.has(PermissionsBitField.Flags.Administrator)) flags.push('ADMIN');
  return flags.length ? flags.join(',') : '(nessuno)';
}

async function audit() {
  await connectDB();
  await client.login(config.discord.token);
  await new Promise((r) => client.once('ready', r));
  console.log(`\nLogged in as ${client.user.tag}\n`);

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error('Guild not found!');
    process.exit(1);
  }

  // Fetch all members and roles
  await guild.members.fetch();
  const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);

  // Get game roles from DB
  const games = await Game.findAll({ where: { is_active: true }, raw: true });
  gameRoles = games.map(g => ({ name: g.name, roleId: g.role_id, code: g.code }));

  // ============================================
  // 1. ROLE HIERARCHY AUDIT
  // ============================================
  console.log('='.repeat(80));
  console.log('  1. ROLE HIERARCHY AUDIT');
  console.log('='.repeat(80));
  console.log('\nCurrent role order (top = highest):');
  console.log('-'.repeat(60));

  const issues = [];
  let expectedPos = 0;
  for (const role of roles) {
    if (role.name === '@everyone') continue;
    const isExpected = EXPECTED_HIERARCHY.find(h => role.name.toLowerCase().includes(h.toLowerCase()));
    const isGame = gameRoles.find(g => g.roleId === role.id);
    const tag = isExpected ? `[${EXPECTED_HIERARCHY.indexOf(isExpected) + 1}]` : isGame ? '[GAME]' : '[OTHER]';
    const managed = role.managed ? ' (managed)' : '';
    const perms = role.permissions;
    const hasAdmin = perms.has(PermissionsBitField.Flags.Administrator);
    console.log(`  ${tag.padEnd(8)} ${role.name.padEnd(35)} pos=${role.position}${managed}${hasAdmin ? ' [ADMINISTRATOR]' : ''}`);

    if (hasAdmin && !STAFF_ROLES.some(s => role.name.toLowerCase().includes(s.toLowerCase()))) {
      issues.push(`RUOLO CON ADMIN NON STAFF: ${role.name} ha Administrator ma non è staff`);
    }
  }

  // Check hierarchy order
  console.log('\nHierarchy check:');
  let lastStaffPos = 999;
  for (const expected of EXPECTED_HIERARCHY) {
    const role = roles.find(r => r.name.toLowerCase().includes(expected.toLowerCase()));
    if (role) {
      const ok = role.position <= lastStaffPos;
      console.log(`  ${ok ? 'OK' : 'WARN'} ${expected.padEnd(25)} pos=${role.position}`);
      if (!ok) issues.push(`GERARCHIA: ${expected} (pos=${role.position}) non è in ordine corretto`);
      lastStaffPos = role.position;
    } else {
      console.log(`  MISSING ${expected}`);
      issues.push(`RUOLO MANCANTE: ${expected} non trovato`);
    }
  }

  // ============================================
  // 2. CHANNEL VISIBILITY AUDIT
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('  2. CHANNEL VISIBILITY AUDIT');
  console.log('='.repeat(80));

  const channels = [...guild.channels.cache.values()].sort((a, b) => a.position - b.position);
  const categories = channels.filter(c => c.type === ChannelType.GuildCategory);
  const textAndVoice = channels.filter(c => c.type !== ChannelType.GuildCategory && c.type !== ChannelType.GuildAnnouncement);

  console.log(`\nTotal channels: ${channels.length} (${categories.length} categories, ${textAndVoice.length} text/voice)`);

  // Audit each category
  console.log('\nCategory permissions:');
  console.log('-'.repeat(80));

  for (const cat of categories) {
    const children = channels.filter(c => c.parentId === cat.id);
    const isGameCategory = gameRoles.find(g => g.category_id === cat.id);
    const gameName = isGameCategory ? isGameCategory.name : null;

    // Check @everyone permission
    const everyoneOverwrite = cat.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const everyoneView = everyoneOverwrite ? 
      everyoneOverwrite.allow.has(PermissionsBitField.Flags.ViewChannel) : 
      !cat.permissionsFor(guild.roles.everyone)?.has(PermissionsBitField.Flags.ViewChannel);

    // Check game role permission
    let gameRoleView = null;
    if (isGameCategory) {
      const gameOverwrite = cat.permissionOverwrites.cache.get(isGameCategory.roleId);
      gameRoleView = gameOverwrite ? gameOverwrite.allow.has(PermissionsBitField.Flags.ViewChannel) : null;
    }

    // Check staff roles
    const staffViews = [];
    for (const staffName of STAFF_ROLES) {
      const staffRole = roles.find(r => r.name.toLowerCase().includes(staffName.toLowerCase()));
      if (staffRole) {
        const ow = cat.permissionOverwrites.cache.get(staffRole.id);
        if (ow) {
          staffViews.push(`${staffName}:${ow.allow.has(PermissionsBitField.Flags.ViewChannel) ? 'Y' : 'N'}`);
        }
      }
    }

    const status = isGameCategory ? 
      (!everyoneView && gameRoleView === true ? 'OK' : 'ISSUE') :
      (everyoneView !== false ? 'OK' : 'CHECK');

    console.log(`\n  [${status}] ${cat.name} (${children.length} channels)${gameName ? ` → GAME: ${gameName}` : ''}`);
    console.log(`    @everyone View: ${everyoneView ? 'YES' : 'NO (hidden)'}`);
    if (isGameCategory) {
      console.log(`    Game role View: ${gameRoleView === true ? 'YES' : gameRoleView === false ? 'NO' : 'NOT SET'}`);
    }
    if (staffViews.length) console.log(`    Staff: ${staffViews.join(', ')}`);

    if (isGameCategory && (!everyoneView !== true && gameRoleView !== true)) {
      issues.push(`CATEGORIA GIOCO: ${cat.name} - @everyone dovrebbe essere nascosto, ruolo gioco dovrebbe vedere`);
    }
    if (isGameCategory && everyoneView === true) {
      issues.push(`CATEGORIA GIOCO ESPOSTA: ${cat.name} - @everyone può vedere (dovrebbe essere nascosta)`);
    }
    if (isGameCategory && gameRoleView === false) {
      issues.push(`CATEGORIA GIOCO BLOCCATA: ${cat.name} - ruolo gioco non può vedere`);
    }

    // Check children channels
    for (const child of children) {
      const childEveryone = child.permissionOverwrites.cache.get(guild.roles.everyone.id);
      const childEveryoneView = childEveryone ?
        childEveryone.allow.has(PermissionsBitField.Flags.ViewChannel) :
        null; // null = inherit from parent

      if (isGameCategory && childEveryoneView === true) {
        issues.push(`CANALE GIOCO ESPOSTO: ${child.name} in ${cat.name} - @everyone può vedere (override)`);
        console.log(`    WARN: #${child.name} ha override @everyone View=YES`);
      }
    }
  }

  // ============================================
  // 3. GAME ROLE COHERENCE
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('  3. GAME ROLE / CATEGORY COHERENCE');
  console.log('='.repeat(80));

  for (const game of games) {
    console.log(`\n  Game: ${game.name} (${game.code})`);
    console.log(`    Role ID: ${game.role_id || 'NOT SET'}`);
    console.log(`    Category ID: ${game.category_id || 'NOT SET'}`);

    const role = guild.roles.cache.get(game.role_id);
    const cat = guild.channels.cache.get(game.category_id);

    if (!role) {
      issues.push(`GIOCO: ${game.name} - ruolo ${game.role_id} non esiste su Discord`);
      console.log(`    ERROR: Role not found on Discord!`);
    } else {
      console.log(`    Role: ${role.name} (pos=${role.position}, members=${role.members.size})`);
    }

    if (!cat) {
      issues.push(`GIOCO: ${game.name} - categoria ${game.category_id} non esiste su Discord`);
      console.log(`    ERROR: Category not found on Discord!`);
    } else {
      console.log(`    Category: ${cat.name} (${cat.children.size} channels)`);
    }

    if (role && cat) {
      const ow = cat.permissionOverwrites.cache.get(role.id);
      if (!ow || !ow.allow.has(PermissionsBitField.Flags.ViewChannel)) {
        issues.push(`GIOCO: ${game.name} - ruolo non ha ViewChannel sulla categoria`);
        console.log(`    WARN: Role does NOT have ViewChannel on category!`);
      }
    }
  }

  // ============================================
  // 4. COMMUNITY / VOICE CHANNELS
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('  4. COMMUNITY & VOICE CHANNELS');
  console.log('='.repeat(80));

  const nonGameCategories = categories.filter(c => !gameRoles.find(g => g.category_id === c.id));
  for (const cat of nonGameCategories) {
    const everyoneOW = cat.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const hidden = everyoneOW?.deny.has(PermissionsBitField.Flags.ViewChannel);
    console.log(`  ${hidden ? 'HIDDEN' : 'VISIBLE'} ${cat.name} (${cat.children.size} channels)`);

    if (cat.name.toLowerCase().includes('staff') || cat.name.toLowerCase().includes('admin') || cat.name.toLowerCase().includes('log')) {
      if (!hidden) {
        issues.push(`CATEGORIA STAFF VISIBILE: ${cat.name} dovrebbe essere nascosta a @everyone`);
        console.log(`    WARN: Staff category is visible to @everyone!`);
      }
    }
  }

  // ============================================
  // 5. SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('  5. SUMMARY');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('\n  No issues found! All permissions look correct.\n');
  } else {
    console.log(`\n  Found ${issues.length} issue(s):\n`);
    for (let i = 0; i < issues.length; i++) {
      console.log(`  ${i + 1}. ${issues[i]}`);
    }
    console.log('');
  }

  // Write full report to file
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    guild: guild.name,
    totalRoles: roles.length,
    totalChannels: channels.length,
    totalCategories: categories.length,
    games: games.length,
    issues,
  };
  fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2));
  console.log('  Full report saved to audit_report.json');

  await client.destroy();
  process.exit(0);
}

audit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
