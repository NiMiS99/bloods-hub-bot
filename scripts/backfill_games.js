// scripts/backfill_games.js
// One-off script: for each game in the DB with role_id = NULL (seeded games
// that never had a Discord role/category created), create:
//   - Discord role @<GameName>
//   - Fraktur category (e.g. 𝔙𝔞𝔩𝔬𝔯𝔞𝔫𝔱)
//   - #𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢 text channel
//   - 🔊 𝔙𝔬𝔠𝔞𝔩𝔢 1 voice channel
// Then update the DB row with role_id and category_id.
//
// Usage: node scripts/backfill_games.js
// Read-only on WoW legacy — skips code='wow'.
const fs = require('fs');
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

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const DB_NAME = process.env.DB_NAME || 'bloods_hub_db';
const DB_USER = process.env.DB_USER || 'nimis99';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
  await client.login(TOKEN);
  console.log(`Connected as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID, { force: true });
  await guild.channels.fetch();
  console.log(`Guild: ${guild.name} (${guild.id})`);

  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false,
  });

  const [games] = await sequelize.query(
    "SELECT id, code, name, category, api_provider, icon_url FROM games WHERE role_id IS NULL AND code != 'wow' AND is_active = 1"
  );
  console.log(`Games to backfill: ${games.length}`);
  if (games.length === 0) {
    console.log('Nothing to do — all active games already have a role_id.');
    await sequelize.close();
    await client.destroy();
    return;
  }

  const everyone = guild.roles.everyone;
  const botId = client.user.id;

  for (const game of games) {
    console.log(`\n--- Backfilling: ${game.name} (code=${game.code}) ---`);

    // 1. Create role
    const role = await guild.roles.create({
      name: game.name,
      mentionable: true,
      reason: `Backfill: ruolo per ${game.name}`,
    });
    console.log(`  Created role: @${role.name} (${role.id})`);

    // 2. Create category
    const categoryName = toFraktur(game.name);
    const cat = await guild.channels.create({
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
      reason: `Backfill: categoria per ${game.name}`,
    });
    console.log(`  Created category: ${cat.name} (${cat.id})`);

    // 3. Create #𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢 text channel
    const generalCh = await guild.channels.create({
      name: toFraktur('generale'),
      type: ChannelType.GuildText,
      parent: cat.id,
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
      reason: `Backfill: canale testo per ${game.name}`,
    });
    console.log(`  Created text channel: #${generalCh.name} (${generalCh.id})`);

    // 4. Create 🔊 𝔙𝔬𝔠𝔞𝔩𝔢 1 voice channel
    const voiceCh = await guild.channels.create({
      name: `🔊 ${toFraktur('Vocale 1')}`,
      type: ChannelType.GuildVoice,
      parent: cat.id,
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
      reason: `Backfill: canale vocale per ${game.name}`,
    });
    console.log(`  Created voice channel: ${voiceCh.name} (${voiceCh.id})`);

    // 5. Update DB
    await sequelize.query(
      'UPDATE games SET role_id = ?, category_id = ? WHERE id = ?',
      { replacements: [role.id, cat.id, game.id] }
    );
    console.log(`  DB updated: role_id=${role.id}, category_id=${cat.id}`);
  }

  console.log(`\n✅ Backfill complete: ${games.length} games processed.`);
  await sequelize.close();
  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
