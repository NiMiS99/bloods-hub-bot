// scripts/cleanup_test_roles.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');

const GUILD_ID = '1010226759817515018';
const BOT_ID = config.discord.token.split('.')[0]; // not reliable, use client.user.id instead

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.members.fetch();
  await guild.roles.fetch();

  // Remove game roles from the bot
  const botMember = guild.members.cache.get(client.user.id);
  const games = await Game.findAll({ where: { is_active: true } });

  console.log('=== Cleaning up game roles from bot ===');
  for (const g of games) {
    if (g.role_id && botMember.roles.cache.has(g.role_id)) {
      await botMember.roles.remove(g.role_id, 'Cleanup: test roles');
      console.log(`  ✓ Removed ${g.name} from bot`);
    }
  }

  // Check role selection panel includes WoW
  console.log('\n=== Role Selection Panel Check ===');
  const { Guild } = require('../src/db');
  const guildRow = await Guild.findOne({ where: { guild_id: GUILD_ID } });
  if (guildRow?.role_selection_channel_id) {
    const ch = guild.channels.cache.get(guildRow.role_selection_channel_id);
    if (ch) {
      const messages = await ch.messages.fetch({ limit: 5 });
      const panel = messages.first();
      if (panel) {
        console.log(`  Panel message ID: ${panel.id}`);
        console.log(`  Components: ${panel.components.length}`);
        // Check if WoW is in the select menu
        for (const row of panel.components) {
          for (const comp of row.components) {
            if (comp.data?.type === 3) { // SelectMenu
              const options = comp.data.options || [];
              console.log(`  Select menu options (${options.length}):`);
              for (const opt of options) {
                const game = games.find((g) => g.code === opt.value);
                console.log(`    - ${opt.label} (value: ${opt.value}) ${game ? '✓' : '✗ NOT IN DB'}`);
              }
            }
            if (comp.data?.type === 2) { // Button
              console.log(`  Button: ${comp.data.label} (customId: ${comp.data.custom_id})`);
            }
          }
        }
      }
    }
  }

  // Final game summary
  console.log('\n=== FINAL GAME SUMMARY ===');
  for (const g of games) {
    const role = g.role_id ? guild.roles.cache.get(g.role_id) : null;
    const cat = g.category_id ? guild.channels.cache.get(g.category_id) : null;
    const metaCount = await require('../src/db').GameMeta.count({ where: { game_id: g.id } });
    console.log(`  ${g.is_active ? '✓' : '✗'} ${g.name} (${g.code}) — role:${role ? role.members.size + ' members' : 'NONE'} — cat:${cat ? '✓' : 'NONE'} — meta:${metaCount}`);
  }

  process.exit(0);
});

client.login(config.discord.token);
