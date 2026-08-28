// scripts/extract_categories.js
// Read-only: estrae tutte le categorie con ID e canali figli
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('ERROR: DISCORD_TOKEN and GUILD_ID must be set in .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();

  const categories = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  console.log('=== CATEGORIE ===');
  for (const cat of categories.values()) {
    const children = guild.channels.cache
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => a.position - b.position);

    console.log(`\n[${cat.position}] ${cat.name} (ID: ${cat.id}) — ${children.size} canali`);
    for (const ch of children.values()) {
      const type = ch.type === ChannelType.GuildText ? 'TEXT'
        : ch.type === ChannelType.GuildVoice ? 'VOICE'
        : ch.type === ChannelType.GuildStageVoice ? 'STAGE'
        : ch.type === ChannelType.GuildForum ? 'FORUM'
        : 'OTHER';
      console.log(`  ${type}: ${ch.name} (ID: ${ch.id})`);
    }
  }

  // Also extract staff role IDs
  console.log('\n=== RUOLI STAFF ===');
  const roles = guild.roles.cache.sort((a, b) => b.position - a.position);
  for (const role of roles.values()) {
    if (role.name === '@everyone') continue;
    const isStaff = ['Owner', 'Founder', 'Consigliere', 'Bloods Admin', 'Officer',
      'Officer Reclutatore', 'Officer in Prova', 'Bot', 'Bloods Bot',
      'Guida Incursioni', 'Guida Spedizioni', 'Admin', 'Moderator'].some(
      n => role.name.toLowerCase().includes(n.toLowerCase())
    );
    if (isStaff || role.position > 10) {
      console.log(`  [${role.position}] ${role.name} (ID: ${role.id}) — ${role.members.size} membri`);
    }
  }

  client.destroy();
});

client.login(TOKEN);
