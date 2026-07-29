// scripts/fix_log_channel.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const { Guild } = require('../src/db');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();

  // Find the Log Bot channel
  const logChannels = [...guild.channels.cache.values()].filter(
    (c) => c.name.includes('Log') || c.name.includes('log') || c.name.includes('𝖫𝗈𝗀')
  );
  console.log('=== LOG CHANNELS ===');
  for (const ch of logChannels) {
    console.log(`  #${ch.name} (id:${ch.id}) parent:${ch.parent?.name || 'none'} type:${ch.type}`);
  }

  // The mod_log_channel_id was 1459341780607700992 — check if it exists
  const oldLog = guild.channels.cache.get('1459341780607700992');
  console.log(`\nOld log channel 1459341780607700992: ${oldLog ? `#${oldLog.name}` : 'NOT FOUND'}`);

  // Find the actual Log Bot text channel (not category)
  const logBot = logChannels.find((c) => c.type === 0 && (c.name.includes('𝖫𝗈𝗀-𝖡𝗈𝗍') || c.name.includes('Log-Bot')));
  if (logBot) {
    console.log(`\nUsing: #${logBot.name} (${logBot.id})`);
    const guildRow = await Guild.findOne({ where: { guild_id: '1010226759817515018' } });
    await guildRow.update({
      log_channel_id: logBot.id,
      automod_log_channel_id: logBot.id,
    });
    console.log('✓ DB updated with correct log channel IDs');
  } else {
    // Try the category's first text channel
    const logCat = logChannels.find((c) => c.type === 4);
    if (logCat) {
      const firstText = [...guild.channels.cache.values()].find(
        (c) => c.parentId === logCat.id && c.type === 0
      );
      if (firstText) {
        console.log(`\nUsing first text channel in log category: #${firstText.name} (${firstText.id})`);
        const guildRow = await Guild.findOne({ where: { guild_id: '1010226759817515018' } });
        await guildRow.update({
          log_channel_id: firstText.id,
          automod_log_channel_id: firstText.id,
        });
        console.log('✓ DB updated');
      }
    }
  }

  // Also check mod_log_channel_id
  const guildRow = await Guild.findOne({ where: { guild_id: '1010226759817515018' } });
  console.log(`\nFinal values:`);
  console.log(`  mod_log_channel_id: ${guildRow.mod_log_channel_id}`);
  console.log(`  log_channel_id: ${guildRow.log_channel_id}`);
  console.log(`  automod_log_channel_id: ${guildRow.automod_log_channel_id}`);

  process.exit(0);
});

client.login(config.discord.token);
