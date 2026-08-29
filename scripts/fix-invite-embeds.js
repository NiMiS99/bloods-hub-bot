require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const GUILD_ID = '1010226759817515018';
const DISCORD_INVITE = 'https://discord.gg/DrGMeEMxF6';
const WEBSITE = 'https://bloodswow.it';

client.on('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.channels.fetch();

    // 1. Fix #invito-discord
    const inviteCh = [...guild.channels.cache.values()].find(
      c => c.name && c.name.includes('Invito') && c.name.includes('Discord') && !c.name.includes('wow')
    );
    if (inviteCh) {
      const old = await inviteCh.messages.fetch({ limit: 10 });
      if (old.size > 0) await inviteCh.bulkDelete(old).catch(() => {});
      const embed = new EmbedBuilder()
        .setTitle('🩸 Unisciti ai Bloods — Discord Ufficiale')
        .setColor(0x8b0000)
        .setDescription(
          '**Siamo i Bloods** — Gilda WoW Pozzo dell\'Eternità EU (Orda)\n\n' +
          '🛡️ Soft-progress · Raid · M+ · PvP · Social\n' +
          '🏰 Housing di gilda & eventi community\n' +
          '🎙️ Discord obbligatorio, zero drama\n\n' +
          '**👉 LINK INVITO DISCORD:**\n' +
          `**${DISCORD_INVITE}**\n\n` +
          `🌐 Sito web: **${WEBSITE}**`
        )
        .setFooter({ text: 'Bloods Community · Pozzo dell\'Eternità EU · Orda' })
        .setTimestamp();
      await inviteCh.send({ embeds: [embed] });
      console.log('Fixed #invito-discord');
    }

    // 2. Fix #invito-wow-community
    const wowCh = [...guild.channels.cache.values()].find(
      c => c.name && c.name.includes('Invito') && c.name.includes('wow-community')
    );
    if (wowCh) {
      const old2 = await wowCh.messages.fetch({ limit: 10 });
      if (old2.size > 0) await wowCh.bulkDelete(old2).catch(() => {});
      const embed2 = new EmbedBuilder()
        .setTitle('🎮 WoW Community Bloods — Reclutamento Aperto')
        .setColor(0x8b0000)
        .setDescription(
          '**I Bloods cercano giocatori!** 🩸\n\n' +
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
        )
        .setFooter({ text: 'Bloods Community · Reclutamento WoW' })
        .setTimestamp();
      await wowCh.send({ embeds: [embed2] });
      console.log('Fixed #invito-wow-community');
    }

    console.log('Done!');
    client.destroy();
  } catch (err) {
    console.error('Error:', err.message);
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
