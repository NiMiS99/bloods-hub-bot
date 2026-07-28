// scripts/fix_audit_issues.js
// Fixes issues found by the full audit:
// 1. Deletes 9 empty Fraktur-style categories
// 2. Marks all existing GameMeta entries as posted_to_channel=true
// 3. Checks the duplicate Chat-Pubblica channel
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const { GameMeta } = require('../src/db');
const { Op } = require('sequelize');

const GUILD_ID = '1010226759817515018';

// Empty categories to delete (from audit)
const EMPTY_CATEGORIES = [
  '1483562338593280302', // 𝓘 𝓝 𝓕 𝓞
  '1483563991841243368', // 𝓐 𝓢 𝓢 𝓘 𝓢 𝓣 𝓔 𝓝 𝓩 𝓐
  '1483563383587344415', // 𝓑 𝓛 𝓞 𝓞 𝓓 𝓢
  '1483564105758412810', // 𝓡 𝓔 𝓖 𝓝 𝓞 - 𝓓 𝓔 𝓘 - 𝓑 𝓛 𝓞 𝓞 𝓓 𝓢
  '1483564606155784284', // 𝓟 𝓥 𝓟
  '1529836103769653448', // 𝓑𝓵𝓸𝓸𝓭𝓼 𝓒𝓸𝓶𝓶𝓾𝓷𝓲𝓽𝔂
  '1483566405239570512', // 𝓢 𝓣 𝓡 𝓔 𝓐 𝓜 𝓘 𝓝 𝓖 - 𝓩 𝓞 𝓝 𝓔
  '1483564839166017676', // 𝓑 𝓛 𝓞 𝓞 𝓓 𝓢 - 𝓑 𝓞 𝓣
  '1483564729858265098', // 𝓟 𝓡 𝓘 𝓖 𝓘 𝓞 𝓝 𝓔
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.fetch();
    await guild.channels.fetch();

    // === 1. DELETE EMPTY CATEGORIES ===
    console.log('=== 1. DELETING EMPTY CATEGORIES ===');
    for (const catId of EMPTY_CATEGORIES) {
      const cat = guild.channels.cache.get(catId);
      if (!cat) {
        console.log(`  SKIP ${catId}: not found (already deleted?)`);
        continue;
      }
      // Double-check it's actually empty
      const children = [...guild.channels.cache.values()].filter((c) => c.parentId === catId);
      if (children.length > 0) {
        console.log(`  SKIP "${cat.name}": has ${children.length} children — NOT empty!`);
        continue;
      }
      try {
        const name = cat.name;
        await cat.delete('Cleanup: empty category from old server structure');
        console.log(`  ✓ Deleted: "${name}" (${catId})`);
      } catch (err) {
        console.log(`  ✗ Failed to delete "${cat.name}": ${err.message.substring(0, 60)}`);
      }
    }

    // === 2. MARK META ENTRIES AS POSTED ===
    console.log('\n=== 2. MARKING META ENTRIES AS POSTED ===');
    const unposted = await GameMeta.update(
      { posted_to_channel: true },
      { where: { posted_to_channel: false } }
    );
    console.log(`  ✓ Marked ${unposted[0]} entries as posted`);

    // === 3. CHECK DUPLICATE CHAT-PUBBLICA ===
    console.log('\n=== 3. DUPLICATE CHAT-PUBBLICA CHECK ===');
    const allChannels = [...guild.channels.cache.values()];
    const chatPubblica = allChannels.filter((c) => c.name.includes('Chat-Pubblica') || c.name.includes('𝖢𝗁𝖺𝗍-𝖯𝗎𝖻𝖻𝗅𝗂𝖼𝖺'));
    for (const ch of chatPubblica) {
      const parent = ch.parent ? ch.parent.name : 'none';
      const msgCount = ch.type === 0 ? (await ch.messages.fetch({ limit: 1 }).catch(() => ({ size: 0 }))).size : 0;
      console.log(`  #${ch.name} (id:${ch.id}) parent:"${parent}" type:${ch.type} recent_msgs:${msgCount}`);
    }

    // If there's a duplicate, we should keep the one in "Regno dei Bloods" (main category)
    // and consider removing the one in "Community Hub" if it's unused
    if (chatPubblica.length > 1) {
      const communityHub = chatPubblica.find((c) => c.parent?.name?.includes('Community'));
      const regnoBloods = chatPubblica.find((c) => c.parent?.name?.includes('Regno') || c.parent?.name?.includes('𝔅𝔩𝔬𝔬𝔡𝔰'));
      console.log(`  → Community Hub: ${communityHub ? communityHub.id : 'none'}`);
      console.log(`  → Regno dei Bloods: ${regnoBloods ? regnoBloods.id : 'none'}`);
      // Don't auto-delete — just report, user should decide
      console.log('  ⚠ Both channels exist — manual decision needed (check which is more active)');
    }

    // === 4. VERIFY NO BOT-CREATED DUPLICATE CATEGORIES ===
    console.log('\n=== 4. GAME CATEGORIES VERIFICATION ===');
    const { Game } = require('../src/db');
    const games = await Game.findAll({ where: { is_active: true } });
    const gameCatIds = new Set(games.map((g) => g.category_id).filter(Boolean));

    // Check there are no duplicate categories for the same game
    const categories = allChannels.filter((c) => c.type === ChannelType.GuildCategory);
    for (const game of games) {
      if (!game.category_id) continue;
      const gameCat = guild.channels.cache.get(game.category_id);
      if (!gameCat) continue;
      // Check if there's another category with a similar name
      const similar = categories.filter(
        (c) => c.id !== game.category_id &&
        c.name.toLowerCase().replace(/\s/g, '').includes(game.name.toLowerCase().replace(/\s/g, ''))
      );
      if (similar.length > 0) {
        for (const s of similar) {
          const children = allChannels.filter((c) => c.parentId === s.id);
          if (children.length === 0) {
            console.log(`  ⚠ "${s.name}" (${s.id}) is a duplicate of "${game.name}" category and is empty — deleting`);
            try {
              await s.delete('Cleanup: duplicate empty category');
              console.log(`  ✓ Deleted duplicate: "${s.name}"`);
            } catch (e) {
              console.log(`  ✗ Failed: ${e.message.substring(0, 60)}`);
            }
          } else {
            console.log(`  ⚠ "${s.name}" (${s.id}) is similar to "${game.name}" but has ${children.length} children — keeping`);
          }
        }
      }
    }

    console.log('\n=== DONE ===');
    process.exit(0);
  } catch (err) {
    console.error('Fix failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

client.login(config.discord.token);
