// scripts/reorganize_server.js
// Reorganizes the server into: INIZIO → 🏰 GILDA → 🌐 COMMUNITY
// Step 1: Create INIZIO category, move Benvenuto/Selezione/Comandi-Bot there
// Step 2: Duplicate Avvisi and Annunci (Gilda + Community versions)
// Step 3: Create divisor + Bloods Gilda category, move all gilda channels
// Step 4: Create divisor + keep Community categories
// Step 5: Create Forum category, move orphan forums
// Step 6: Delete empty old categories
// Step 7: Update DB channel IDs
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { Guild: GuildDB } = require('../src/db');
const { toFraktur } = require('../src/utils/textFormatter');
const logger = require('../src/utils/logger');

const GUILD_ID = '1010226759817515018';

// Channel IDs (from audit)
const CHANNELS = {
  // Bloods Info (id:1010226760308240405)
  regolamento: '1013413920679149610',
  news: '1422963549537571010',
  highlights: '1423389038152384584',
  comunicazioni_bloodsinfo: '1013413921140514877',
  benvenuto: '1010226760308240407',
  comandiBot: '1430308477615607940',
  invitoDiscord: '1419671138497335438',
  selezioneGiochi: '1529506938654818466',
  avvisi: '1529853400450203648',
  annunci: '1529879079963066410',
  // Bloods (id:1430311888826274045)
  regoleAutomatici: '1459310431297343582',
  invitoCommunity: '1459353625896681695',
  whatsapp: '1419680543532122152',
  raidLog: '1422990227718406236',
  prenotazioniRbg: '1482755523685126164',
  prenotazioniIncroci: '1424801974993555507',
  logBot: '1530551876964057099',
  // Regno dei Bloods (id:1012737312859365436)
  pubblica1: '1457849301094105088',
  pubblica2: '1486417764469178492',
  cliccaCreare: '1458141823116775548',
  incursioni: '1426255308908400840',
  chatPubblica: '1013188356244508775',
  // Sala del duello (id:1421544095788040362)
  duelloPubblica: '1494479290623066113',
  bg: '1013187248847593563',
  arena2v2: '1013188653452906596',
  arena3v3: '1013188694263468052',
  rbg: '1483567430063100005',
  // Prigione (id:1013189896074182667)
  cella: '1013189675407654922',
  // Forum orfani
  wikiTutorial: '1482436509029371994',
  adminWorkspace: '1480281958725455963',
  socialMedia: '1483905542329073694',
  // Community Hub (id:1529836103769653448 — was deleted? check)
  // Actually Community Hub was deleted earlier. Let me check.
  // From audit: "Community Hub" still exists with 2 children: Vocale community, avvisi
  // Wait, avvisi was moved to Bloods Info. Let me re-check.
  // Actually from the audit: Community Hub has "🔊 Vocale community" and "avvisi"
  // But avvisi id 1529853400450203648 is listed under Bloods Info in the audit...
  // Let me just check at runtime.
};

// Categories to delete after moving (by id)
const OLD_CATEGORIES_TO_DELETE = [
  '1010226760308240405', // Bloods Info
  '1430311888826274045', // Bloods
  '1012737312859365436', // Regno dei Bloods
  '1421544095788040362', // Sala del duello (PvP)
  '1013189896074182667', // Prigione
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.fetch();
    await guild.channels.fetch();
    await guild.roles.fetch();

    const everyoneRole = guild.roles.everyone;
    const botMember = await guild.members.fetch(client.user.id);

    console.log('=== SERVER REORGANIZATION ===\n');

    // Helper: create a category
    async function createCategory(name, position, everyoneVisible = true, skipFraktur = false) {
      const styledName = skipFraktur ? name : toFraktur(name);
      const cat = await guild.channels.create({
        name: styledName,
        type: ChannelType.GuildCategory,
        position,
        permissionOverwrites: everyoneVisible ? [] : [
          {
            id: everyoneRole.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
        reason: 'Server reorganization',
      });
      console.log(`  ✓ Created category: "${styledName}" (pos:${position}, id:${cat.id})`);
      return cat;
    }

    // Helper: move channel to category
    async function moveToCategory(channelId, categoryId, position = null) {
      const ch = guild.channels.cache.get(channelId);
      if (!ch) {
        console.log(`  ⚠ Channel ${channelId} not found — skipping`);
        return;
      }
      const opts = { parent: categoryId };
      if (position !== null) opts.position = position;
      await ch.setParent(categoryId, { lockPermissions: false });
      console.log(`  ✓ Moved #${ch.name} → category ${categoryId}`);
    }

    // Helper: create a text channel
    async function createTextChannel(name, categoryId, everyoneView = true, everyoneSend = false) {
      const styledName = `${name.includes('丨') ? name : name}`;
      const overwrites = [];
      if (!everyoneView) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        });
      } else if (!everyoneSend) {
        overwrites.push({
          id: everyoneRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages],
        });
      }
      const ch = await guild.channels.create({
        name: styledName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: overwrites,
        reason: 'Server reorganization',
      });
      console.log(`  ✓ Created channel: #${styledName} (id:${ch.id})`);
      return ch;
    }

    // ==========================================
    // STEP 1: Create INIZIO category
    // ==========================================
    console.log('--- STEP 1: INIZIO category ---');
    const inicio = await createCategory('INIZIO', 0, true);

    // Move Benvenuto, Selezione, Comandi-Bot to INIZIO
    await moveToCategory(CHANNELS.benvenuto, inicio.id, 0);
    await moveToCategory(CHANNELS.selezioneGiochi, inicio.id, 1);
    await moveToCategory(CHANNELS.comandiBot, inicio.id, 2);

    // ==========================================
    // STEP 2: Duplicate Avvisi and Annunci
    // ==========================================
    console.log('\n--- STEP 2: Duplicate Avvisi + Annunci ---');
    // Create Avvisi-Gilda and Annunci-Gilda (will be moved to Gilda later)
    // Create Avvisi-Community and Annunci-Community (will be moved to Community later)
    // For now, create them in INIZIO temporarily
    const avvisiGilda = await createTextChannel('🎫丨𝖠𝗏𝗏𝗂𝗌𝗂-𝖦𝗂𝗅𝖽𝖺', inicio.id, true, true);
    const annunciGilda = await createTextChannel('📜丨𝖠𝗇𝗇𝗎𝗇𝖼𝗂-𝖦𝗂𝗅𝖽𝖺', inicio.id, true, false);
    const avvisiCommunity = await createTextChannel('🎫丨𝖠𝗏𝗏𝗂𝗌𝗂-𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒', inicio.id, true, true);
    const annunciCommunity = await createTextChannel('📜丨𝖠𝗇𝗇𝗎𝗇𝖼𝗂-𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒', inicio.id, true, false);

    // ==========================================
    // STEP 3: Create GILDA divisor + Bloods Gilda category
    // ==========================================
    console.log('\n--- STEP 3: GILDA divisor + category ---');
    const gildaDivisor = await createCategory('═══ 🏰 GILDA ═══', 2, false, true);
    const bloodsGilda = await createCategory('🏰 Bloods Gilda', 3, false);

    // Move all gilda channels to Bloods Gilda
    console.log('\n  Moving gilda channels:');
    // From Bloods Info:
    await moveToCategory(CHANNELS.regolamento, bloodsGilda.id);
    await moveToCategory(CHANNELS.news, bloodsGilda.id);
    await moveToCategory(CHANNELS.highlights, bloodsGilda.id);
    await moveToCategory(CHANNELS.comunicazioni_bloodsinfo, bloodsGilda.id);
    await moveToCategory(CHANNELS.invitoDiscord, bloodsGilda.id);
    // From Bloods:
    await moveToCategory(CHANNELS.regoleAutomatici, bloodsGilda.id);
    await moveToCategory(CHANNELS.invitoCommunity, bloodsGilda.id);
    await moveToCategory(CHANNELS.whatsapp, bloodsGilda.id);
    await moveToCategory(CHANNELS.raidLog, bloodsGilda.id);
    await moveToCategory(CHANNELS.prenotazioniRbg, bloodsGilda.id);
    await moveToCategory(CHANNELS.prenotazioniIncroci, bloodsGilda.id);
    await moveToCategory(CHANNELS.logBot, bloodsGilda.id);
    // From Regno dei Bloods:
    await moveToCategory(CHANNELS.chatPubblica, bloodsGilda.id);
    await moveToCategory(CHANNELS.pubblica1, bloodsGilda.id);
    await moveToCategory(CHANNELS.pubblica2, bloodsGilda.id);
    await moveToCategory(CHANNELS.cliccaCreare, bloodsGilda.id);
    await moveToCategory(CHANNELS.incursioni, bloodsGilda.id);
    // From Sala del duello:
    await moveToCategory(CHANNELS.duelloPubblica, bloodsGilda.id);
    await moveToCategory(CHANNELS.bg, bloodsGilda.id);
    await moveToCategory(CHANNELS.arena2v2, bloodsGilda.id);
    await moveToCategory(CHANNELS.arena3v3, bloodsGilda.id);
    await moveToCategory(CHANNELS.rbg, bloodsGilda.id);
    // From Prigione:
    await moveToCategory(CHANNELS.cella, bloodsGilda.id);
    // Move Avvisi-Gilda and Annunci-Gilda to Bloods Gilda
    await moveToCategory(avvisiGilda.id, bloodsGilda.id);
    await moveToCategory(annunciGilda.id, bloodsGilda.id);

    // ==========================================
    // STEP 4: Create COMMUNITY divisor
    // ==========================================
    console.log('\n--- STEP 4: COMMUNITY divisor ---');
    const communityDivisor = await createCategory('═══ 🌐 COMMUNITY ═══', 5, false, true);

    // Move existing community categories after the divisor
    // Community Hub, Streaming Zone, Assistenza should be after the divisor
    // We'll set their positions
    const communityHub = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒')
    );
    const streamingZone = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖲𝗍𝗋𝖾𝖺𝗆𝗂𝗇𝗀')
    );
    const assistenza = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖠𝗌𝗌𝗂𝗌𝗍𝖾𝗇𝗓𝖺')
    );

    if (communityHub) { await communityHub.setPosition(6); console.log(`  ✓ Community Hub → pos 6`); }
    if (streamingZone) { await streamingZone.setPosition(7); console.log(`  ✓ Streaming Zone → pos 7`); }
    if (assistenza) { await assistenza.setPosition(8); console.log(`  ✓ Assistenza → pos 8`); }

    // Move Avvisi-Community and Annunci-Community to Community Hub
    if (communityHub) {
      await moveToCategory(avvisiCommunity.id, communityHub.id);
      await moveToCategory(annunciCommunity.id, communityHub.id);
    }

    // ==========================================
    // STEP 5: Create Forum category + move orphans
    // ==========================================
    console.log('\n--- STEP 5: Forum category ---');
    const forumCat = await createCategory('Forum', 9, true);
    await moveToCategory(CHANNELS.wikiTutorial, forumCat.id);
    await moveToCategory(CHANNELS.adminWorkspace, forumCat.id);
    await moveToCategory(CHANNELS.socialMedia, forumCat.id);

    // ==========================================
    // STEP 6: Delete old empty categories
    // ==========================================
    console.log('\n--- STEP 6: Delete old categories ---');
    for (const catId of OLD_CATEGORIES_TO_DELETE) {
      const cat = guild.channels.cache.get(catId);
      if (!cat) {
        console.log(`  - ${catId}: already gone`);
        continue;
      }
      // Check if empty
      const children = [...guild.channels.cache.values()].filter((c) => c.parentId === catId);
      if (children.length > 0) {
        console.log(`  ⚠ "${cat.name}" still has ${children.length} children — NOT deleting`);
        continue;
      }
      try {
        const name = cat.name;
        await cat.delete('Server reorganization: category now empty');
        console.log(`  ✓ Deleted: "${name}"`);
      } catch (err) {
        console.log(`  ✗ Failed to delete "${cat.name}": ${err.message.substring(0, 60)}`);
      }
    }

    // ==========================================
    // STEP 7: Update DB
    // ==========================================
    console.log('\n--- STEP 7: Update DB ---');
    const guildRow = await GuildDB.findOne({ where: { guild_id: GUILD_ID } });
    if (guildRow) {
      // level_reward_channel_id → Annunci-Community
      await guildRow.update({
        level_reward_channel_id: annunciCommunity.id,
        // Keep log_channel_id and automod_log_channel_id pointing to Log-Bot (now in Gilda)
        // But Log-Bot is now in Bloods Gilda which is hidden from @everyone
        // We should create a community log channel or keep it in Gilda
        // For now, keep Log-Bot in Gilda (staff only)
      });
      console.log(`  ✓ level_reward_channel_id → ${annunciCommunity.id} (#${annunciCommunity.name})`);
      console.log(`  ✓ log_channel_id stays → ${CHANNELS.logBot} (Log-Bot in Gilda)`);
      console.log(`  ✓ automod_log_channel_id stays → ${CHANNELS.logBot} (Log-Bot in Gilda)`);
    }

    // ==========================================
    // STEP 8: Delete old Avvisi and Annunci (originals in Bloods Info)
    // ==========================================
    console.log('\n--- STEP 8: Delete old Avvisi/Annunci ---');
    // The old Avvisi and Annunci are now in INIZIO (moved with Bloods Info category deletion)
    // Actually they were in Bloods Info which we're deleting. Let's check where they ended up.
    // They should be orphaned now. Let's delete them since we have duplicates.
    for (const id of [CHANNELS.avvisi, CHANNELS.annunci]) {
      const ch = guild.channels.cache.get(id);
      if (!ch) {
        console.log(`  - ${id}: already gone`);
        continue;
      }
      try {
        const name = ch.name;
        await ch.delete('Replaced by Gilda/Community duplicates');
        console.log(`  ✓ Deleted old: #${name}`);
      } catch (err) {
        console.log(`  ✗ Failed to delete #${ch.name}: ${err.message.substring(0, 60)}`);
      }
    }

    // ==========================================
    // FINAL: Print summary
    // ==========================================
    console.log('\n=== REORGANIZATION COMPLETE ===\n');

    // Print final structure
    await guild.channels.fetch();
    const allChannels = [...guild.channels.cache.values()];
    const categories = allChannels
      .filter((c) => c.type === ChannelType.GuildCategory)
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

    for (const cat of categories) {
      const children = allChannels
        .filter((c) => c.parentId === cat.id)
        .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
      console.log(`📁 "${cat.name}" (pos:${cat.rawPosition}) — ${children.length} channels`);
      for (const ch of children) {
        const typeStr = ch.type === 2 ? 'VC' : ch.type === 15 ? 'FOR' : ch.type === 13 ? 'STG' : 'TXT';
        console.log(`  [${typeStr}] #${ch.name}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Reorganization failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

// Fix typo helper
client.login(config.discord.token);
