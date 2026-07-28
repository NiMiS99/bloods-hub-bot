// scripts/check_members_roles.js
// Check which members are missing the "Membro della community" role
// and assign it to existing members who don't have it
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');

const GUILD_ID = '1010226759817515018';
const COMMUNITY_ROLE_ID = '1421545567179243550';
const BLOODS_ROLE_ID = '1013186233993810100';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.members.fetch({ withPresences: false });

  const communityRole = guild.roles.cache.get(COMMUNITY_ROLE_ID);
  const bloodsRole = guild.roles.cache.get(BLOODS_ROLE_ID);

  console.log('=== MEMBERS ROLE CHECK ===\n');
  console.log(`Total members: ${guild.memberCount}`);
  console.log(`"Membro della community" members: ${communityRole.members.size}`);
  console.log(`"Bloods" members: ${bloodsRole.members.size}\n`);

  // Find members who have neither community nor bloods nor any staff role
  const STAFF_ROLE_IDS = [
    '1418580128472240178', // Owner
    '1461109465528143965', // Founder
    '1418580069772951654', // Consigliere
    '1529875116039606274', // Bloods Admin
    '1012731374777663488', // Officer
    '1486107215302496327', // Officer Reclutatore
    '1452409084161691718', // Officer in Prova
  ];

  const members = [...guild.members.cache.values()];
  const missingCommunity = [];
  const staffWithoutCommunity = [];

  for (const member of members) {
    if (member.user.bot) continue;

    const hasCommunity = member.roles.cache.has(COMMUNITY_ROLE_ID);
    const hasBloods = member.roles.cache.has(BLOODS_ROLE_ID);
    const hasStaff = STAFF_ROLE_IDS.some((id) => member.roles.cache.has(id));

    if (!hasCommunity && !hasBloods && !hasStaff) {
      missingCommunity.push(member);
    }
    if (hasStaff && !hasCommunity && !hasBloods) {
      staffWithoutCommunity.push(member);
    }
  }

  console.log(`Members missing community role (no staff/bloods): ${missingCommunity.length}`);
  for (const m of missingCommunity.slice(0, 20)) {
    console.log(`  - ${m.user.tag} (joined: ${m.joinedAt?.toLocaleDateString() || '?'})`);
  }
  if (missingCommunity.length > 20) console.log(`  ... and ${missingCommunity.length - 20} more`);

  console.log(`\nStaff without community role: ${staffWithoutCommunity.length}`);
  for (const m of staffWithoutCommunity) {
    console.log(`  - ${m.user.tag}`);
  }

  // Assign "Membro della community" to all members who don't have it
  // (excluding bots and members who already have Bloods — they don't need it)
  console.log('\n--- Assigning Membro della community ---');
  let assigned = 0;
  let failed = 0;
  for (const member of members) {
    if (member.user.bot) continue;
    if (member.roles.cache.has(COMMUNITY_ROLE_ID)) continue;
    if (member.roles.cache.has(BLOODS_ROLE_ID)) continue; // Bloods members don't need community role

    try {
      await member.roles.add(COMMUNITY_ROLE_ID, 'Auto-assign: existing member needs community role');
      assigned++;
    } catch (err) {
      failed++;
      if (failed <= 3) console.log(`  ✗ ${member.user.tag}: ${err.message.substring(0, 60)}`);
    }
  }
  console.log(`\n✓ Assigned to ${assigned} members`);
  if (failed > 0) console.log(`✗ Failed for ${failed} members`);

  process.exit(0);
});

client.login(config.discord.token);
