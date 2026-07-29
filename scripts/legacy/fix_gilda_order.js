// scripts/fix_gilda_order.js
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();

  const cats = [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildCategory);

  // Desired order for gilda categories
  const gildaGenerale = cats.find((c) => c.name === '🏰 𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺');
  const gildaPvE = cats.find((c) => c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖤'));
  const gildaPvP = cats.find((c) => c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖯'));
  const divisorGilda = cats.find((c) => c.name.includes('🏰 GILDA'));
  const divisorCommunity = cats.find((c) => c.name.includes('🌐 COMMUNITY'));

  console.log('=== FIX GILDA ORDER ===');
  // Order: divisor GILDA (1) → generale (2) → PvE (3) → PvP (4) → divisor COMMUNITY (5)
  if (divisorGilda) { await divisorGilda.setPosition(1); console.log('✓ divisor GILDA → 1'); }
  if (gildaGenerale) { await gildaGenerale.setPosition(2); console.log('✓ Bloods Gilda → 2'); }
  if (gildaPvE) { await gildaPvE.setPosition(3); console.log('✓ Bloods Gilda PvE → 3'); }
  if (gildaPvP) { await gildaPvP.setPosition(4); console.log('✓ Bloods Gilda PvP → 4'); }
  if (divisorCommunity) { await divisorCommunity.setPosition(5); console.log('✓ divisor COMMUNITY → 5'); }

  // Community Hub after COMMUNITY divisor
  const communityHub = cats.find((c) => c.name.includes('𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒 𝖧𝗎𝖻'));
  if (communityHub) { await communityHub.setPosition(6); console.log('✓ Community Hub → 6'); }

  // Streaming Zone
  const streaming = cats.find((c) => c.name.includes('𝖲𝗍𝗋𝖾𝖺𝗆𝗂𝗇𝗍'));
  if (streaming) { await streaming.setPosition(7); console.log('✓ Streaming Zone → 7'); }

  // Assistenza
  const assistenza = cats.find((c) => c.name.includes('𝖠𝗌𝗌𝗂𝗌𝗍𝖾𝗇𝗓𝖺'));
  if (assistenza) { await assistenza.setPosition(8); console.log('✓ Assistenza → 8'); }

  // Forum
  const forum = cats.find((c) => c.name === '𝖥𝗈𝗋𝗎𝗆');
  if (forum) { await forum.setPosition(9); console.log('✓ Forum → 9'); }

  // Game categories
  const { Game } = require('../src/db');
  const games = await Game.findAll({ where: { is_active: true } });
  const gameCats = games
    .map((g) => guild.channels.cache.get(g.category_id))
    .filter(Boolean)
    .sort((a, b) => (a.name > b.name ? 1 : -1));
  let pos = 10;
  for (const cat of gameCats) {
    await cat.setPosition(pos);
    console.log(`✓ "${cat.name}" → ${pos}`);
    pos++;
  }

  // Prigione at the end
  const prigione = cats.find((c) => c.name.includes('𝖯𝗋𝗂𝗀𝗂𝗈𝗇𝖾'));
  if (prigione) { await prigione.setPosition(pos); console.log(`✓ Prigione → ${pos}`); }

  // Print final
  console.log('\n=== FINAL ORDER ===');
  await guild.channels.fetch();
  const allCats = [...guild.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
  for (const cat of allCats) {
    const children = [...guild.channels.cache.values()].filter((c) => c.parentId === cat.id);
    console.log(`  pos ${cat.rawPosition}: "${cat.name}" (${children.length} ch)`);
  }

  process.exit(0);
});

client.login(config.discord.token);
