// scripts/split_gilda.js
// Splits Bloods Gilda into 3 categories: generale, PvE, PvP
// Moves Cella back to a separate Prigione category
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { toFraktur } = require('../src/utils/textFormatter');

const GUILD_ID = '1010226759817515018';

// Channel IDs to move
const PVE_CHANNELS = [
  '1422990227718406236', // 📑 Raid-Log
  '1424801974993555507', // 🧾 Prenotazioni-Incroci
  '1426255308908400840', // 💀 Incursioni
  '1423389038152384584', // 🎥 Highlights
  '1422963549537571010', // 🎥 News
];

const PVP_CHANNELS = [
  '1494479290623066113', // 🎮 Pubblica (duello)
  '1013187248847593563', // ⚒ BG
  '1013188653452906596', // ⭐ Arena 2v2
  '1013188694263468052', // ⭐ Arena 3v3
  '1483567430063100005', // ⚒ RBG
  '1482755523685126164', // 🧾 Prenotazioni-rbg
];

const CELLA_ID = '1013189675407654922';

// Bloods Gilda category ID (current)
const BLOODS_GILDA_ID = '1530567864137027596';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.fetch();
  await guild.channels.fetch();

  const everyoneRole = guild.roles.everyone;
  console.log('=== SPLIT GILDA + PRIGIONE ===\n');

  // 1. Create Bloods Gilda PvE (after Bloods Gilda)
  const bloodsGilda = guild.channels.cache.get(BLOODS_GILDA_ID);
  const gildaPos = bloodsGilda ? bloodsGilda.rawPosition : 2;

  const pveCat = await guild.channels.create({
    name: toFraktur('🏰 Bloods Gilda PvE'),
    type: ChannelType.GuildCategory,
    position: gildaPos + 1,
    permissionOverwrites: [
      { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    ],
    reason: 'Split gilda: PvE category',
  });
  console.log(`✓ Created "🏰 Bloods Gilda PvE" at pos ${gildaPos + 1}`);

  // 2. Create Bloods Gilda PvP (after PvE)
  const pvpCat = await guild.channels.create({
    name: toFraktur('🏰 Bloods Gilda PvP'),
    type: ChannelType.GuildCategory,
    position: gildaPos + 2,
    permissionOverwrites: [
      { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    ],
    reason: 'Split gilda: PvP category',
  });
  console.log(`✓ Created "🏰 Bloods Gilda PvP" at pos ${gildaPos + 2}`);

  // 3. Move PvE channels
  console.log('\n--- Moving PvE channels ---');
  for (const id of PVE_CHANNELS) {
    const ch = guild.channels.cache.get(id);
    if (!ch) { console.log(`  ⚠ ${id} not found`); continue; }
    await ch.setParent(pveCat.id, { lockPermissions: false });
    console.log(`  ✓ #${ch.name} → PvE`);
  }

  // 4. Move PvP channels
  console.log('\n--- Moving PvP channels ---');
  for (const id of PVP_CHANNELS) {
    const ch = guild.channels.cache.get(id);
    if (!ch) { console.log(`  ⚠ ${id} not found`); continue; }
    await ch.setParent(pvpCat.id, { lockPermissions: false });
    console.log(`  ✓ #${ch.name} → PvP`);
  }

  // 5. Move Cella out of Bloods Gilda → new Prigione category at the bottom
  console.log('\n--- Moving Cella to Prigione ---');
  const cella = guild.channels.cache.get(CELLA_ID);
  if (cella) {
    // Find the last category position
    const allCats = [...guild.channels.cache.values()]
      .filter((c) => c.type === ChannelType.GuildCategory)
      .sort((a, b) => (b.rawPosition || 0) - (a.rawPosition || 0));
    const lastPos = allCats[0] ? allCats[0].rawPosition + 1 : 100;

    const prigione = await guild.channels.create({
      name: toFraktur('Prigione'),
      type: ChannelType.GuildCategory,
      position: lastPos,
      permissionOverwrites: [
        { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      ],
      reason: 'Restore Prigione category',
    });
    console.log(`✓ Created "Prigione" at pos ${lastPos}`);

    await cella.setParent(prigione.id, { lockPermissions: false });
    console.log(`  ✓ #${cella.name} → Prigione`);
  } else {
    console.log('  ⚠ Cella not found');
  }

  // 6. Print final structure (non-game categories only)
  console.log('\n=== FINAL STRUCTURE (non-game) ===\n');
  await guild.channels.fetch();
  const allChannels = [...guild.channels.cache.values()];
  const { Game } = require('../src/db');
  const games = await Game.findAll({ where: { is_active: true } });
  const gameCatIds = new Set(games.map((g) => g.category_id).filter(Boolean));

  const categories = allChannels
    .filter((c) => c.type === ChannelType.GuildCategory && !gameCatIds.has(c.id))
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

  for (const cat of categories) {
    const children = allChannels
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
    console.log(`📁 "${cat.name}" (pos:${cat.rawPosition}) — ${children.length} channels`);
    for (const ch of children) {
      const typeStr = ch.type === 2 ? 'VC' : ch.type === 13 ? 'STG' : 'TXT';
      console.log(`  [${typeStr}] #${ch.name}`);
    }
  }

  process.exit(0);
});

client.login(config.discord.token);
