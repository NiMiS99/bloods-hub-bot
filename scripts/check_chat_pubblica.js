// scripts/check_chat_pubblica.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();

  const channels = [
    { id: '1529853397455474798', label: 'Community Hub' },
    { id: '1013188356244508775', label: 'Regno dei Bloods' },
  ];

  for (const { id, label } of channels) {
    const ch = guild.channels.cache.get(id);
    if (!ch) { console.log(`${label}: not found`); continue; }
    const messages = await ch.messages.fetch({ limit: 20 });
    console.log(`\n=== #${ch.name} (${label}) — ${messages.size} recent messages ===`);
    for (const m of [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp)) {
      console.log(`  [${m.createdAt.toISOString().split('T')[0]}] ${m.author.username}: ${m.content.substring(0, 80) || '[embed/attachment]'}`);
    }
  }

  process.exit(0);
});

client.login(config.discord.token);
