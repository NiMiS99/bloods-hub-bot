// scripts/cleanup_voice_channels.js
// Delete non-Fraktur duplicate voice channels created by the first migration
// run, and create the missing Fraktur "🔊 𝔙𝔬𝔠𝔞𝔩𝔢 2" in each game category.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const { Sequelize } = require('sequelize');
const { toFraktur } = require('../src/utils/textFormatter');
const { buildOverwrites } = require('../src/utils/gameChannels');

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
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

  const everyoneId = guild.roles.everyone.id;
  const botId = client.user.id;
  let deleted = 0;
  let created = 0;

  for (const g of games) {
    const cat = guild.channels.cache.get(g.category_id);
    if (!cat) continue;

    const children = [...guild.channels.cache.values()].filter((c) => c.parentId === cat.id);
    const voiceChannels = children.filter((c) => c.type === ChannelType.GuildVoice);

    console.log(`\n--- ${g.name} ---`);
    console.log(`  Voice channels: ${voiceChannels.map((c) => c.name).join(', ')}`);

    // Delete non-Fraktur duplicates: "🔊 Vocale 1" and "🔊 Vocale 2" (no Fraktur)
    for (const vc of voiceChannels) {
      if (vc.name === '🔊 Vocale 1' || vc.name === '🔊 Vocale 2') {
        console.log(`  Deleting duplicate: ${vc.name} (${vc.id})`);
        await vc.delete('Cleanup: duplicate non-Fraktur voice channel').catch((e) => console.log(`    ERROR: ${e.message}`));
        deleted++;
      }
    }

    // Re-fetch children
    await guild.channels.fetch();
    const currentChildren = [...guild.channels.cache.values()].filter((c) => c.parentId === cat.id);
    const hasVocale1Fraktur = currentChildren.some((c) => c.name === `🔊 ${toFraktur('Vocale 1')}`);
    const hasVocale2Fraktur = currentChildren.some((c) => c.name === `🔊 ${toFraktur('Vocale 2')}`);

    // Create missing Fraktur voice channels
    if (!hasVocale1Fraktur) {
      const overwrites = buildOverwrites(everyoneId, g.role_id, botId, 'voice');
      await guild.channels.create({
        name: `🔊 ${toFraktur('Vocale 1')}`,
        type: ChannelType.GuildVoice,
        parent: cat.id,
        permissionOverwrites: overwrites,
        reason: `Vocale 1 per ${g.name}`,
      });
      console.log(`  Created: 🔊 ${toFraktur('Vocale 1')}`);
      created++;
    }
    if (!hasVocale2Fraktur) {
      const overwrites = buildOverwrites(everyoneId, g.role_id, botId, 'voice');
      await guild.channels.create({
        name: `🔊 ${toFraktur('Vocale 2')}`,
        type: ChannelType.GuildVoice,
        parent: cat.id,
        permissionOverwrites: overwrites,
        reason: `Vocale 2 per ${g.name}`,
      });
      console.log(`  Created: 🔊 ${toFraktur('Vocale 2')}`);
      created++;
    }
  }

  console.log(`\n✅ Cleanup complete: ${deleted} deleted, ${created} created.`);
  await sequelize.close();
  await client.destroy();
  process.exit(0);
}

main().catch((err) => { console.error('Cleanup failed:', err); process.exit(1); });
