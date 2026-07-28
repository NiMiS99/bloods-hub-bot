// scripts/find_empty_channels.js
// Finds all text channels with 0 or very few messages
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');

const GUILD_ID = '1010226759817515018';
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.fetch();
  await guild.channels.fetch();

  const games = await Game.findAll({ where: { is_active: true } });
  const gameCatIds = new Set(games.map((g) => g.category_id).filter(Boolean));

  const allChannels = [...guild.channels.cache.values()];
  const textChannels = allChannels.filter(
    (c) => c.type === 0 || c.type === 5 || c.type === 15 // text, announcement, forum
  );

  console.log('=== EMPTY / LOW-MESSAGE CHANNELS ===\n');
  console.log('Checking ' + textChannels.length + ' text channels...\n');

  const results = [];
  for (const ch of textChannels) {
    try {
      // Fetch last message — if none, channel is empty
      const messages = await ch.messages.fetch({ limit: 1 });
      const count = messages.size;
      const lastMsg = messages.first();
      const parent = ch.parent ? ch.parent.name : '—';
      const isGame = gameCatIds.has(ch.parentId);

      results.push({
        name: ch.name,
        id: ch.id,
        parentId: ch.parentId,
        parent,
        isGame,
        isEmpty: count === 0,
        lastMsgDate: lastMsg ? lastMsg.createdAt.toISOString().split('T')[0] : 'MAI',
        lastMsgAuthor: lastMsg ? (lastMsg.author?.tag || '?') : '—',
      });
    } catch (err) {
      // No permission or error
      results.push({
        name: ch.name,
        id: ch.id,
        parentId: ch.parentId,
        parent: ch.parent ? ch.parent.name : '—',
        isGame: gameCatIds.has(ch.parentId),
        isEmpty: false,
        lastMsgDate: 'ERROR',
        lastMsgAuthor: err.message.substring(0, 40),
      });
    }
  }

  // Sort by category position then channel position
  results.sort((a, b) => {
    const catA = guild.channels.cache.get(a.parentId);
    const catB = guild.channels.cache.get(b.parentId);
    const posA = catA?.rawPosition || 999;
    const posB = catB?.rawPosition || 999;
    if (posA !== posB) return posA - posB;
    const chA = guild.channels.cache.get(a.id);
    const chB = guild.channels.cache.get(b.id);
    return (chA?.rawPosition || 999) - (chB?.rawPosition || 999);
  });

  // Print all channels grouped by category
  let currentParent = null;
  const emptyChannels = [];
  const lowChannels = [];

  for (const r of results) {
    if (r.parent !== currentParent) {
      currentParent = r.parent;
      console.log(`\n📁 ${r.parent}${r.isGame ? ' [GAME]' : ''}`);
    }
    const status = r.isEmpty ? '🔴 EMPTY' : r.lastMsgDate === 'ERROR' ? '⚠ ERROR' : '✓';
    console.log(`  ${status}  #${r.name} — last: ${r.lastMsgDate} by ${r.lastMsgAuthor}`);

    if (r.isEmpty) emptyChannels.push(r);
  }

  // Summary
  console.log('\n\n=== SUMMARY ===\n');
  console.log(`Total text channels: ${results.length}`);
  console.log(`Empty channels (0 messages): ${emptyChannels.length}`);
  console.log(`\nEmpty channels list:`);
  for (const ch of emptyChannels) {
    console.log(`  #${ch.name} (parent: ${ch.parent}) — id:${ch.id}`);
  }

  process.exit(0);
});

client.login(config.discord.token);
