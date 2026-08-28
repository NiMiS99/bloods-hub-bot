// scripts/fix_mplus_voice.js — recreate the M+ voice channel without topic
const path = require('path');
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const ROLES = {
  everyone: GUILD_ID,
  bloods: '1013186233993810100',
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();

  const mplusCat = guild.channels.cache.get('1541874220462772314');
  if (!mplusCat) {
    console.error('M+ category not found');
    client.destroy();
    return;
  }

  // Check if already exists
  const existing = guild.channels.cache.find(
    c => c.parentId === mplusCat.id && c.name === '🔊丨𝖬-𝖯𝗅𝗎𝗌'
  );
  if (existing) {
    console.log(`Already exists: ${existing.id}`);
    client.destroy();
    return;
  }

  try {
    const created = await guild.channels.create({
      name: '🔊丨𝖬-𝖯𝗅𝗎𝗌',
      type: ChannelType.GuildVoice,
      parent: mplusCat.id,
      permissionOverwrites: [
        { id: ROLES.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: ROLES.bloods, allow: [
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.UseVAD,
        ] },
      ],
    });
    console.log(`CREATED: 🔊丨𝖬-𝖯𝗅𝗎𝗌 (ID: ${created.id})`);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }

  client.destroy();
});

client.login(TOKEN);
