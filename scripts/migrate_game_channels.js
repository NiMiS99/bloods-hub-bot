// scripts/migrate_game_channels.js
// Add missing channels to existing game categories using the standard template.
// For each active game with a category_id, ensures all 6 template channels exist.
// Also fixes permission overwrites on existing channels to match the template.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const { Sequelize } = require('sequelize');
const { createGameChannels, buildOverwrites, CHANNEL_TEMPLATE } = require('../src/utils/gameChannels');
const { toFraktur } = require('../src/utils/textFormatter');

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  console.log(`Connected as ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID, { force: true });
  await guild.channels.fetch();
  await guild.roles.fetch();

  const sequelize = new Sequelize(
    process.env.DB_NAME || 'bloods_hub_db',
    process.env.DB_USER || 'nimis99',
    process.env.DB_PASSWORD || '',
    { host: '127.0.0.1', dialect: 'mysql', logging: false }
  );
  const [games] = await sequelize.query(
    "SELECT id, code, name, role_id, category_id FROM games WHERE code != 'wow' AND is_active = 1 AND category_id IS NOT NULL AND role_id IS NOT NULL"
  );

  console.log(`\nMigrating ${games.length} game categories...\n`);

  for (const g of games) {
    console.log(`--- ${g.name} (code=${g.code}) ---`);
    const cat = guild.channels.cache.get(g.category_id);
    if (!cat) {
      console.log(`  SKIP: category ${g.category_id} not found`);
      continue;
    }

    // 1. Add missing channels using the shared template.
    const { created, skipped } = await createGameChannels(guild, cat.id, g.role_id, g.name);
    if (created.length > 0) {
      console.log(`  Created: ${created.join(', ')}`);
    }
    if (skipped.length > 0) {
      console.log(`  Already exist: ${skipped.join(', ')}`);
    }

    // 2. Fix permission overwrites on existing channels to match template.
    //    This ensures the #𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢 and 🔊𝔙𝔬𝔠𝔞𝔩𝔢 1 that were created earlier
    //    get the correct overwrites (they were already correct, but just in case).
    await guild.channels.fetch(); // re-fetch to get newly created channels
    const children = [...guild.channels.cache.values()].filter((c) => c.parentId === cat.id);
    const everyoneId = guild.roles.everyone.id;
    const botId = client.user.id;

    for (const ch of children) {
      // Find matching template definition by name.
      const def = CHANNEL_TEMPLATE.find((d) => {
        const expectedName = d.prefix
          ? `${d.prefix}${d.fraktur ? toFraktur(d.name) : d.name}`
          : (d.fraktur ? toFraktur(d.name) : d.name);
        return expectedName === ch.name;
      });
      if (!def) {
        console.log(`  Unknown channel (not in template): ${ch.name} — skipping`);
        continue;
      }

      // Check if overwrites already match. If not, reapply.
      const expectedOverwrites = buildOverwrites(everyoneId, g.role_id, botId, def.permType);
      const currentOverwrites = [...ch.permissionOverwrites.cache.values()];

      // Simple check: do we have the right number of overwrites?
      let needsFix = currentOverwrites.length !== expectedOverwrites.length;
      if (!needsFix) {
        // Check if the game role has the right permissions.
        const roleOW = ch.permissionOverwrites.cache.get(g.role_id);
        if (!roleOW) {
          needsFix = true;
        } else {
          const expectedRoleOW = expectedOverwrites.find((o) => o.id === g.role_id);
          const expectedAllow = expectedRoleOW.allow || [];
          const expectedDeny = expectedRoleOW.deny || [];
          const actualAllow = roleOW.allow.toArray();
          const actualDeny = roleOW.deny.toArray();
          if (actualAllow.length !== expectedAllow.length || actualDeny.length !== expectedDeny.length) {
            needsFix = true;
          }
        }
      }

      if (needsFix) {
        console.log(`  Fixing permissions on: ${ch.name}`);
        await ch.permissionOverwrites.set(expectedOverwrites).catch((err) => {
          console.log(`    ERROR fixing ${ch.name}: ${err.message}`);
        });
      }
    }
    console.log('');
  }

  console.log('✅ Migration complete.');
  await sequelize.close();
  await client.destroy();
  process.exit(0);
}

main().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
