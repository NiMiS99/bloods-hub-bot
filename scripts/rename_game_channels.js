// scripts/rename_game_channels.js
// Renames all existing game channels to the unified format: emoji丨Fraktur
// Also sets up WoW role + category + channels.
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');
const { toFraktur } = require('../src/utils/textFormatter');
const { createGameCategory, createGameChannels } = require('../src/utils/gameChannels');

const GUILD_ID = '1010226759817515018';

// Mapping: old name pattern → new name (emoji丨Fraktur)
const RENAME_MAP = [
  { match: /^𝔫𝔢𝔴𝔰$/, newName: '📰丨𝔑𝔢𝔴𝔰' },
  { match: /^𝔠𝔬𝔪𝔲𝔫𝔦𝔠𝔞𝔷𝔦𝔬𝔫𝔦$/, newName: '📣丨ℭ𝔬𝔪𝔲𝔫𝔦𝔠𝔞𝔷𝔦𝔬𝔫𝔦' },
  { match: /^𝔠𝔬𝔪𝔭𝔬𝔰𝔦𝔷𝔦𝔬𝔫𝔦$/, newName: '⚔️丨ℭ𝔬𝔪𝔭𝔬𝔰𝔦𝔷𝔦𝔬𝔫𝔦' },
  { match: /^💬丨𝔊𝔢𝔫𝔢𝔯𝔞𝔩𝔢$/, newName: '💬丨𝔊𝔢𝔫𝔢𝔯𝔞𝔩𝔢' }, // already ok
  { match: /^💭丨𝖢𝗁𝖺𝗍-𝖯𝗎𝖻𝖻𝗅𝗂𝖼𝖺$/, newName: '💬丨𝔊𝔢𝔫𝔢𝔯𝔞𝔩𝔢' },
  { match: /^🔊 𝔙𝔬𝔠𝔞𝔩𝔢 1$/, newName: '🔊丨𝔙𝔬𝔠𝔞𝔩𝔢 1' },
  { match: /^🔊 𝔙𝔬𝔠𝔞𝔩𝔢 2$/, newName: '🔊丨𝔙𝔬𝔠𝔞𝔩𝔢 2' },
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
    const botMember = await guild.members.fetch(client.user.id);

    console.log('=== RENAMING GAME CHANNELS ===\n');
    const games = await Game.findAll();
    let totalRenamed = 0;
    let totalSkipped = 0;

    for (const game of games) {
      if (!game.category_id) {
        console.log(`[${game.name}] No category — skipping`);
        continue;
      }
      const cat = guild.channels.cache.get(game.category_id);
      if (!cat) {
        console.log(`[${game.name}] Category ${game.category_id} not found — skipping`);
        continue;
      }

      console.log(`\n[${game.name}] Category: "${cat.name}"`);
      const children = [...guild.channels.cache.values()]
        .filter((c) => c.parentId === cat.id)
        .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

      for (const ch of children) {
        let newName = null;
        for (const rule of RENAME_MAP) {
          if (rule.match.test(ch.name)) {
            // Don't rename if already matches the target
            if (ch.name === rule.newName) {
              newName = null;
            } else {
              newName = rule.newName;
            }
            break;
          }
        }

        if (newName) {
          try {
            await ch.setName(newName, 'Unificazione font canali');
            console.log(`  ✓ "${ch.name}" → "${newName}"`);
            totalRenamed++;
          } catch (err) {
            console.log(`  ✗ "${ch.name}" → "${newName}": ${err.message.substring(0, 60)}`);
          }
        } else {
          console.log(`  - "${ch.name}" (already ok)`);
          totalSkipped++;
        }
      }
    }

    console.log(`\n=== RENAME SUMMARY ===`);
    console.log(`  Renamed: ${totalRenamed}`);
    console.log(`  Already ok: ${totalSkipped}`);

    // === SETUP WOW ===
    console.log('\n=== SETTING UP WoW ===');
    const wow = await Game.findOne({ where: { code: 'wow' } });
    if (wow && !wow.role_id) {
      console.log('  Creating WoW role...');
      const role = await guild.roles.create({
        name: 'World of Warcraft',
        mentionable: true,
        position: Math.max(1, botMember.roles.highest.position - 3),
        reason: 'WoW setup — role for game channels',
      });
      console.log(`  ✓ Role: "${role.name}" (${role.id})`);

      console.log('  Creating WoW category...');
      const cat = await createGameCategory(guild, 'World of Warcraft', role.id);
      console.log(`  ✓ Category: "${cat.name}" (${cat.id})`);

      console.log('  Creating WoW channels...');
      const { created, skipped } = await createGameChannels(guild, cat.id, role.id, 'World of Warcraft');
      console.log(`  ✓ Created: ${created.join(', ')}`);
      if (skipped.length) console.log(`  Skipped: ${skipped.join(', ')}`);

      await wow.update({ role_id: role.id, category_id: cat.id });
      console.log('  ✓ DB updated');
    } else if (wow && wow.role_id) {
      console.log('  WoW already has role + category');
    } else {
      console.log('  WoW not in DB — creating...');
      const role = await guild.roles.create({
        name: 'World of Warcraft',
        mentionable: true,
        position: Math.max(1, botMember.roles.highest.position - 3),
        reason: 'WoW setup',
      });
      const cat = await createGameCategory(guild, 'World of Warcraft', role.id);
      const { created } = await createGameChannels(guild, cat.id, role.id, 'World of Warcraft');
      await Game.create({
        code: 'wow',
        name: 'World of Warcraft',
        category: 'mmo',
        api_provider: 'battlenet',
        role_id: role.id,
        category_id: cat.id,
        is_active: true,
      });
      console.log(`  ✓ Role: ${role.id}, Category: ${cat.id}, Channels: ${created.length}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

client.login(config.discord.token);
