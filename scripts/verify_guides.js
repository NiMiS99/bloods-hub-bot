// scripts/verify_guides.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const { GuideMessage, Game } = require('../src/db');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();

  const guides = await GuideMessage.findAll({ where: { guild_id: guild.id } });
  console.log(`=== GUIDE MESSAGES: ${guides.length} ===\n`);

  const games = await Game.findAll({ where: { is_active: true } });

  for (const g of guides) {
    const ch = guild.channels.cache.get(g.channel_id);
    const game = g.game_id ? games.find((gm) => gm.id === g.game_id) : null;
    let status = '?';
    let pinned = '';
    try {
      const msg = await ch.messages.fetch(g.message_id);
      status = msg ? '✓' : '✗';
      pinned = msg?.pinned ? '📌' : '';
    } catch {
      status = '✗ (deleted)';
    }
    const label = g.guide_type === 'game_selection' ? 'Selezione Giochi' : `${g.guide_type} (${game?.name || '?'})`;
    console.log(`  ${status} ${pinned} [${label}] #${ch?.name || 'missing'} (msg:${g.message_id})`);
  }

  console.log(`\nTotal: ${guides.length} guide messages`);
  process.exit(0);
});

client.login(config.discord.token);
