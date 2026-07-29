// scripts/fix_muted_new_cats.js
// Adds Muted role deny to new categories (PvE, PvP, Prigione, etc.)
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();
  await guild.roles.fetch();

  const mutedRole = guild.roles.cache.find((r) => r.name === 'Muted');
  if (!mutedRole) { console.log('Muted role not found'); process.exit(1); }

  const categories = [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildCategory);
  console.log('=== FIX MUTED ROLE ON NEW CATEGORIES ===\n');

  for (const cat of categories) {
    const ow = cat.permissionOverwrites?.cache.get(mutedRole.id);
    const hasDeny = ow && ow.deny.has(PermissionsBitField.Flags.SendMessages);
    if (!hasDeny) {
      try {
        await cat.permissionOverwrites.edit(mutedRole.id, {
          SendMessages: false,
          SendMessagesInThreads: false,
          Connect: false,
          Speak: false,
        });
        console.log(`✓ Added Muted deny to "${cat.name}"`);
      } catch (err) {
        console.log(`✗ "${cat.name}": ${err.message.substring(0, 60)}`);
      }
    } else {
      console.log(`- "${cat.name}" (already has Muted deny)`);
    }
  }

  process.exit(0);
});

client.login(config.discord.token);
