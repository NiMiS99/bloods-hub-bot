// scripts/rebuild_missing.js
// Recreate missing Discord categories + channels for games where the category
// was deleted but the role still exists. Updates the DB with new category_id.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');
const { Sequelize } = require('sequelize');
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
    "SELECT id, code, name, role_id, category_id FROM games WHERE code != 'wow'"
  );

  const everyone = guild.roles.everyone;
  const botId = client.user.id;
  let rebuilt = 0;

  for (const g of games) {
    const role = guild.roles.cache.get(g.role_id);
    const cat = g.category_id ? guild.channels.cache.get(g.category_id) : null;
    if (cat) {
      console.log(`OK: ${g.name} — category exists (${cat.name})`);
      continue;
    }
    if (!role) {
      console.log(`SKIP: ${g.name} — role also missing, cannot rebuild`);
      continue;
    }

    console.log(`\n--- Rebuilding: ${g.name} (code=${g.code}) ---`);

    // 1. Recreate category
    const categoryName = toFraktur(g.name);
    const newCat = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.Connect,
          ],
        },
        {
          id: botId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ],
      reason: `Rebuild: categoria per ${g.name} (era stata cancellata)`,
    });
    console.log(`  Created category: ${newCat.name} (${newCat.id})`);

    // 2. Recreate #𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢
    const generalCh = await guild.channels.create({
      name: toFraktur('generale'),
      type: ChannelType.GuildText,
      parent: newCat.id,
      permissionOverwrites: [
        { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: botId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
      reason: `Rebuild: canale testo per ${g.name}`,
    });
    console.log(`  Created text channel: #${generalCh.name} (${generalCh.id})`);

    // 3. Recreate 🔊 𝔙𝔬𝔠𝔞𝔩𝔢 1
    const voiceCh = await guild.channels.create({
      name: `🔊 ${toFraktur('Vocale 1')}`,
      type: ChannelType.GuildVoice,
      parent: newCat.id,
      permissionOverwrites: [
        { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
        {
          id: botId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
        },
      ],
      reason: `Rebuild: canale vocale per ${g.name}`,
    });
    console.log(`  Created voice channel: ${voiceCh.name} (${voiceCh.id})`);

    // 4. Update DB with new category_id
    await sequelize.query(
      'UPDATE games SET category_id = ? WHERE id = ?',
      { replacements: [newCat.id, g.id] }
    );
    console.log(`  DB updated: category_id=${newCat.id}`);
    rebuilt++;
  }

  console.log(`\n✅ Rebuild complete: ${rebuilt} games rebuilt.`);
  await sequelize.close();
  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Rebuild failed:', err);
  process.exit(1);
});
