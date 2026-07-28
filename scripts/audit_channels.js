// scripts/audit_channels.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();
  await guild.roles.fetch();

  const channels = [...guild.channels.cache.values()];
  const cats = channels.filter((c) => c.type === 4);
  const texts = channels.filter((c) => c.type === 0 || c.type === 5);
  const voices = channels.filter((c) => c.type === 2);

  console.log('CATEGORIES:', cats.length, '| TEXT:', texts.length, '| VOICE:', voices.length, '| TOTAL:', channels.length);

  console.log('\n--- CATEGORIES ---');
  cats.sort((a, b) => a.rawPosition - b.rawPosition).forEach((c) => {
    const childCount = channels.filter((ch) => ch.parentId === c.id).length;
    console.log(`  [${c.rawPosition}] ${c.name} (id:${c.id}) children:${childCount}`);
  });

  console.log('\n--- TEXT CHANNELS (first 20) ---');
  texts.sort((a, b) => a.rawPosition - b.rawPosition).slice(0, 20).forEach((c) => {
    const parent = c.parent ? c.parent.name : 'none';
    console.log(`  #${c.name} (id:${c.id}) parent:${parent} pos:${c.rawPosition}`);
  });

  console.log('\n--- VOICE CHANNELS (first 10) ---');
  voices.sort((a, b) => a.rawPosition - b.rawPosition).slice(0, 10).forEach((c) => {
    const parent = c.parent ? c.parent.name : 'none';
    console.log(`  🔊${c.name} (id:${c.id}) parent:${parent} pos:${c.rawPosition}`);
  });

  const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
  console.log(`\n--- ROLES (total: ${roles.size}, showing top 25) ---`);
  roles.slice(0, 25).forEach((r) => {
    const managed = r.managed ? ' [managed]' : '';
    const color = r.color ? ` color:${r.color.toString(16)}` : '';
    console.log(`  #${r.position} "${r.name}" (id:${r.id}) members:${r.members.size}${managed}${color}`);
  });

  const muted = roles.find((r) => r.name.toLowerCase().includes('muted') || r.name.toLowerCase().includes('silenz') || r.name.toLowerCase().includes('mutato'));
  console.log('\n--- MUTED ROLE ---');
  console.log(muted ? `Found: "${muted.name}" (id:${muted.id}) pos:${muted.position}` : 'NOT FOUND');

  // Check game roles (roles that match game names)
  const gameKeywords = ['wow', 'valorant', 'lol', 'league', 'csgo', 'cs', 'dota', 'apex', 'minecraft', 'ffxiv', 'ff14', 'rocket', 'fortnite', 'overwatch', 'gta', 'rust'];
  const gameRoles = roles.filter((r) => gameKeywords.some((k) => r.name.toLowerCase().includes(k)));
  console.log(`\n--- GAME ROLES (${gameRoles.length} found) ---`);
  gameRoles.forEach((r) => console.log(`  "${r.name}" (id:${r.id}) members:${r.members.size} pos:${r.position}`));

  process.exit(0);
});

client.login(config.discord.token);
