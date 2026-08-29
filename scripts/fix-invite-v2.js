require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const GUILD_ID = '1010226759817515018';
const DISCORD_INVITE = 'https://discord.gg/DrGMeEMxF6';
const WEBSITE = 'https://bloodswow.it';

client.on('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.channels.fetch();
  const text = [...guild.channels.cache.values()].filter(c => c.type === 0);

  // Find all invito channels
  const invitoChannels = text.filter(c => c.name.toLowerCase().includes('invito') || c.name.includes('𝖨𝗇𝗏𝗂𝗍𝗈'));
  console.log('Found invito channels:', invitoChannels.map(c => `"${c.name}" (${c.id})`).join(', '));

  for (const ch of invitoChannels) {
    // Delete old messages
    try {
      const old = await ch.messages.fetch({ limit: 10 });
      if (old.size > 0) await ch.bulkDelete(old);
    } catch (e) { console.log(`Couldn't clear #${ch.name}: ${e.message}`); }

    const isWow = ch.name.includes('wow') || ch.name.includes('𝗐𝗈𝗐');

    const embed = new EmbedBuilder()
      .setTitle(isWow ? '🎮 WoW Community Bloods — Reclutamento Aperto' : '🩸 Unisciti ai Bloods — Discord Ufficiale')
      .setColor(0x8b0000)
      .setDescription(
        isWow
          ? '**I Bloods cercano giocatori!** 🩸\n\n' +
            '**Chi siamo:**\n' +
            '• Gilda WoW Pozzo dell\'Eternità EU — Orda\n' +
            '• Soft-progress: raid Mythic Mar+Gio 21:00-24:00\n' +
            '• PvP Mer 21:00-23:00 · Social Dom 21:00-23:00\n\n' +
            '**Cosa offriamo:**\n' +
            '• Sistema Bloods Points (BP) per loot equo\n' +
            '• Mentor per nuovi membri\n' +
            '• Eventi community settimanali\n' +
            '• Bot Discord personalizzato\n\n' +
            '**👉 LINK INVITO DISCORD:**\n' +
            `**${DISCORD_INVITE}**\n\n` +
            `🌐 Sito web: **${WEBSITE}**`
          : '**Siamo i Bloods** — Gilda WoW Pozzo dell\'Eternità EU (Orda)\n\n' +
            '🛡️ Soft-progress · Raid · M+ · PvP · Social\n' +
            '🏰 Housing di gilda & eventi community\n' +
            '🎙️ Discord obbligatorio, zero drama\n\n' +
            '**👉 LINK INVITO DISCORD:**\n' +
            `**${DISCORD_INVITE}**\n\n` +
            `🌐 Sito web: **${WEBSITE}**`
      )
      .setFooter({ text: isWow ? 'Bloods Community · Reclutamento WoW' : 'Bloods Community · Pozzo dell\'Eternità EU · Orda' })
      .setTimestamp();

    await ch.send({ embeds: [embed] });
    console.log(`Posted embed in #${ch.name} (${ch.id})`);
  }

  // Also find any channel with "wow-community" in name
  const wowComm = text.filter(c => c.name.includes('wow-community') || c.name.includes('𝗐𝗈𝗐-𝖼𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒'));
  console.log('\nWow-community channels:', wowComm.map(c => `"${c.name}" (${c.id})`).join(', ') || 'none');

  client.destroy();
});
client.login(process.env.DISCORD_TOKEN);
