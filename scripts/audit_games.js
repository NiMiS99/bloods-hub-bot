// scripts/audit_games.js
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const { Game, GameMeta } = require('../src/db');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();
  await guild.roles.fetch();

  // 1. Games in DB
  const games = await Game.findAll({ order: [['name', 'ASC']] });
  console.log('=== GAMES IN DB ===');
  for (const g of games) {
    const role = g.role_id ? guild.roles.cache.get(g.role_id) : null;
    const cat = g.category_id ? guild.channels.cache.get(g.category_id) : null;
    const metaCount = await GameMeta.count({ where: { game_id: g.id } });
    console.log(`  ${g.is_active ? '✓' : '✗'} "${g.name}" (code:${g.code}) cat:${g.category} api:${g.api_provider || 'none'}`);
    console.log(`    role: ${role ? `"${role.name}" (${role.id}) members:${role.members.size}` : 'NOT SET'}`);
    console.log(`    category: ${cat ? `"${cat.name}" (${cat.id}) children:${[...guild.channels.cache.values()].filter(c => c.parentId === cat.id).length}` : 'NOT SET'}`);
    console.log(`    meta entries: ${metaCount}`);

    // List channels in this category
    if (cat) {
      const children = [...guild.channels.cache.values()]
        .filter((c) => c.parentId === cat.id)
        .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
      for (const ch of children) {
        const typeStr = ch.type === 4 ? 'CAT' : ch.type === 0 || ch.type === 5 ? 'TXT' : ch.type === 2 ? 'VC' : `T${ch.type}`;
        console.log(`      [${typeStr}] "${ch.name}" (id:${ch.id})`);
      }
    }
  }

  // 2. Check which game channels have news content
  console.log('\n=== NEWS CHANNEL CONTENT ===');
  for (const g of games) {
    if (!g.category_id) continue;
    const cat = guild.channels.cache.get(g.category_id);
    if (!cat) continue;
    const newsCh = [...guild.channels.cache.values()].find(
      (c) => c.parentId === cat.id && c.name.toLowerCase().includes('news')
    );
    if (newsCh) {
      try {
        const messages = await newsCh.messages.fetch({ limit: 5 });
        console.log(`  ${g.name} #${newsCh.name}: ${messages.size} recent messages`);
        if (messages.size > 0) {
          const last = messages.first();
          console.log(`    Last: ${last.author.username} — "${last.content.substring(0, 80)}" (${last.createdAt.toISOString().split('T')[0]})`);
        }
      } catch (e) {
        console.log(`  ${g.name} #${newsCh.name}: cannot fetch messages (${e.message.substring(0, 50)})`);
      }
    }
  }

  // 3. Check role selection panel
  console.log('\n=== ROLE SELECTION PANEL ===');
  const { Guild } = require('../src/db');
  const guildRow = await Guild.findOne({ where: { guild_id: guild.id } });
  if (guildRow?.role_selection_channel_id) {
    const ch = guild.channels.cache.get(guildRow.role_selection_channel_id);
    if (ch) {
      console.log(`  Channel: #${ch.name} (${ch.id})`);
      const messages = await ch.messages.fetch({ limit: 5 });
      console.log(`  Messages: ${messages.size}`);
      for (const m of messages.values()) {
        console.log(`    ${m.author.username}: components=${m.components.length} embeds=${m.embeds.length}`);
      }
    }
  }

  process.exit(0);
});

client.login(config.discord.token);
