// scripts/fix_log_channel2.js
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const { Guild } = require('../src/db');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();

  // Find Log Bot category
  const logCat = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && (c.name.includes('Log') || c.name.includes('𝔏𝔬𝔤'))
  );
  if (logCat) {
    console.log(`Log category: "${logCat.name}" (${logCat.id})`);
    const children = [...guild.channels.cache.values()]
      .filter((c) => c.parentId === logCat.id)
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
    for (const ch of children) {
      console.log(`  [type:${ch.type}] #${ch.name} (id:${ch.id})`);
    }
    // Use the first text channel
    const firstText = children.find((c) => c.type === 0);
    if (firstText) {
      console.log(`\nUsing: #${firstText.name} (${firstText.id})`);
      const guildRow = await Guild.findOne({ where: { guild_id: '1010226759817515018' } });
      await guildRow.update({
        mod_log_channel_id: firstText.id,
        log_channel_id: firstText.id,
        automod_log_channel_id: firstText.id,
      });
      console.log('✓ DB updated: mod_log, log, automod_log all set to ' + firstText.id);
    }
  } else {
    // Create a new log channel in the Bloods category
    console.log('No Log Bot category found — creating a new log channel');
    const bloodsCat = [...guild.channels.cache.values()].find(
      (c) => c.type === ChannelType.GuildCategory && c.name === '𝔅𝔩𝔬𝔬𝔡𝔰'
    );
    const ch = await guild.channels.create({
      name: '🤖丨𝔏𝔬𝔤-𝔅𝔬𝔱',
      type: ChannelType.GuildText,
      parent: bloodsCat?.id || null,
      reason: 'Bot log channel for Discord events + automod',
    });
    console.log(`✓ Created: #${ch.name} (${ch.id})`);
    const guildRow = await Guild.findOne({ where: { guild_id: '1010226759817515018' } });
    await guildRow.update({
      mod_log_channel_id: ch.id,
      log_channel_id: ch.id,
      automod_log_channel_id: ch.id,
    });
    console.log('✓ DB updated');
  }

  // Verify
  const guildRow = await Guild.findOne({ where: { guild_id: '1010226759817515018' } });
  console.log(`\nFinal: mod_log=${guildRow.mod_log_channel_id} log=${guildRow.log_channel_id} automod_log=${guildRow.automod_log_channel_id}`);
  for (const id of [guildRow.mod_log_channel_id, guildRow.log_channel_id, guildRow.automod_log_channel_id]) {
    const ch = guild.channels.cache.get(id);
    console.log(`  ${id}: ${ch ? '#' + ch.name : 'NOT FOUND'}`);
  }

  process.exit(0);
});

client.login(config.discord.token);
