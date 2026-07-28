// scripts/fix_order_and_duello.js
// 1. Find the "Pubblica" duello VC channel and move it to PvP
// 2. Reorder all categories properly
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');

const GUILD_ID = '1010226759817515018';
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.channels.fetch();

  // 1. Find Pubblica duello VC — it's a VC with "Pubblica" in name, in Bloods Gilda currently
  const bloodsGilda = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺') && !c.name.includes('PvE') && !c.name.includes('PvP')
  );
  const pvpCat = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖯')
  );

  console.log('=== FIX ORDER + DUELLO ===\n');

  // Find the "Pubblica" VC that's a duello channel (not "Pubblica Bloods")
  const allChannels = [...guild.channels.cache.values()];
  const pubblicVCs = allChannels.filter(
    (c) => c.type === 2 && c.name.includes('Pubblica') && !c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌')
  );
  console.log('Pubblica VCs (non-Bloods):');
  for (const ch of pubblicVCs) {
    console.log(`  #${ch.name} (id:${ch.id}) parent:${ch.parent?.name || 'none'}`);
    if (pvpCat && ch.parentId !== pvpCat.id) {
      await ch.setParent(pvpCat.id, { lockPermissions: false });
      console.log(`  ✓ Moved to PvP`);
    }
  }

  // 2. Reorder categories
  const desiredOrder = [
    { match: '𝖨𝖭𝖨𝖹𝖨𝖮', pos: 0 },
    { match: '═══ 🏰 GILDA', pos: 1 },
    { match: '𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺', pos: 2, exclude: ['PvE', 'PvP'] },
    { match: '𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖤', pos: 3 },
    { match: '𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖯', pos: 4 },
    { match: '═══ 🌐 COMMUNITY', pos: 5 },
    { match: '𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒 𝖧𝗎𝖻', pos: 6 },
    { match: '𝖲𝗍𝗋𝖾𝖺𝗆𝗂𝗇𝗍', pos: 7 },
    { match: '𝖠𝗌𝗌𝗂𝗌𝗍𝖾𝗇𝗓𝖺', pos: 8 },
    { match: '𝖥𝗈𝗋𝗎𝗆', pos: 9 },
  ];

  console.log('\n--- Reordering categories ---');
  const cats = [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildCategory);

  for (const { match, pos, exclude } of desiredOrder) {
    const cat = cats.find((c) =>
      c.name.includes(match) &&
      (!exclude || !exclude.some((e) => c.name.includes(e)))
    );
    if (cat) {
      await cat.setPosition(pos);
      console.log(`  ✓ "${cat.name}" → pos ${pos}`);
    } else {
      console.log(`  ⚠ "${match}" not found`);
    }
  }

  // Game categories after Forum
  const games = await Game.findAll({ where: { is_active: true } });
  const gameCats = games
    .map((g) => guild.channels.cache.get(g.category_id))
    .filter(Boolean)
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

  let gamePos = 10;
  for (const cat of gameCats) {
    await cat.setPosition(gamePos);
    console.log(`  ✓ "${cat.name}" → pos ${gamePos}`);
    gamePos++;
  }

  // Prigione at the very end
  const prigione = cats.find((c) => c.name.includes('𝖯𝗋𝗂𝗀𝗂𝗈𝗇𝖾'));
  if (prigione) {
    await prigione.setPosition(gamePos);
    console.log(`  ✓ "Prigione" → pos ${gamePos}`);
  }

  // 3. Print final structure
  console.log('\n=== FINAL STRUCTURE ===\n');
  await guild.channels.fetch();
  const all = [...guild.channels.cache.values()];
  const allCats = all
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

  for (const cat of allCats) {
    const children = all
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
    console.log(`📁 "${cat.name}" (pos:${cat.rawPosition}) — ${children.length} channels`);
    for (const ch of children) {
      const typeStr = ch.type === 2 ? 'VC' : ch.type === 15 ? 'FOR' : ch.type === 13 ? 'STG' : 'TXT';
      console.log(`  [${typeStr}] #${ch.name}`);
    }
  }

  process.exit(0);
});

client.login(config.discord.token);
