// scripts/fix_reorganization.js
// Fixes remaining issues after reorganization:
// 1. Delete empty "Bloods Info" category
// 2. Find/recreate Community Hub with Vocale community
// 3. Move Avvisi-Community and Annunci-Community to Community Hub
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { toFraktur } = require('../src/utils/textFormatter');

const GUILD_ID = '1010226759817515018';
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.channels.fetch();

  // 1. Delete empty Bloods Info
  console.log('=== FIX REORGANIZATION ===\n');
  const bloodsInfo = guild.channels.cache.get('1010226760308240405');
  if (bloodsInfo) {
    const children = [...guild.channels.cache.values()].filter((c) => c.parentId === bloodsInfo.id);
    if (children.length === 0) {
      await bloodsInfo.delete('Cleanup: empty after reorganization');
      console.log('✓ Deleted empty "Bloods Info" category');
    } else {
      console.log(`⚠ Bloods Info still has ${children.length} children: ${children.map(c=>c.name).join(', ')}`);
    }
  }

  // 2. Find "Vocale community" channel (was in Community Hub)
  const vocaleCommunity = [...guild.channels.cache.values()].find(
    (c) => c.name.includes('𝖵𝗈𝖼𝖺𝗅𝖾 𝖼𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒') || c.name.toLowerCase().includes('vocale community')
  );
  console.log(`Vocale community: ${vocaleCommunity ? `#${vocaleCommunity.name} (parent: ${vocaleCommunity.parent?.name || 'none'})` : 'NOT FOUND'}`);

  // 3. Find Avvisi-Community and Annunci-Community (currently in INIZIO)
  const avvisiCommunity = [...guild.channels.cache.values()].find(
    (c) => c.name.includes('𝖠𝗏𝗏𝗂𝗌𝗂-𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒')
  );
  const annunciCommunity = [...guild.channels.cache.values()].find(
    (c) => c.name.includes('𝖠𝗇𝗇𝗎𝗇𝖼𝗂-𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒')
  );

  // 4. Check if Community Hub category still exists
  let communityHub = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒')
  );

  if (!communityHub) {
    // Recreate Community Hub after the COMMUNITY divisor
    const communityDivisor = [...guild.channels.cache.values()].find(
      (c) => c.type === ChannelType.GuildCategory && c.name.includes('COMMUNITY')
    );
    const pos = communityDivisor ? (communityDivisor.rawPosition || 5) + 1 : 6;
    communityHub = await guild.channels.create({
      name: toFraktur('Community Hub'),
      type: ChannelType.GuildCategory,
      position: pos,
      reason: 'Recreate Community Hub after reorganization',
    });
    console.log(`✓ Created "Community Hub" category at pos ${pos}`);
  } else {
    console.log(`✓ Community Hub exists: "${communityHub.name}" at pos ${communityHub.rawPosition}`);
  }

  // 5. Move Vocale community to Community Hub
  if (vocaleCommunity && communityHub) {
    if (vocaleCommunity.parentId !== communityHub.id) {
      await vocaleCommunity.setParent(communityHub.id, { lockPermissions: false });
      console.log(`✓ Moved #${vocaleCommunity.name} → Community Hub`);
    }
  }

  // 6. Move Avvisi-Community and Annunci-Community to Community Hub
  if (avvisiCommunity && communityHub) {
    await avvisiCommunity.setParent(communityHub.id, { lockPermissions: false });
    console.log(`✓ Moved #${avvisiCommunity.name} → Community Hub`);
  }
  if (annunciCommunity && communityHub) {
    await annunciCommunity.setParent(communityHub.id, { lockPermissions: false });
    console.log(`✓ Moved #${annunciCommunity.name} → Community Hub`);
  }

  // 7. Reorder: Community Hub should be right after COMMUNITY divisor
  const communityDivisor = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes('COMMUNITY')
  );
  if (communityDivisor && communityHub) {
    await communityHub.setPosition((communityDivisor.rawPosition || 5) + 1);
    console.log(`✓ Community Hub positioned after COMMUNITY divisor`);
  }

  // 8. Print final structure
  console.log('\n=== FINAL STRUCTURE ===\n');
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
});

client.login(config.discord.token);
