require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const GUILD_ID = '1010226759817515018';
const DISCORD_INVITE = 'https://discord.gg/DrGMeEMxF6';
const WEBSITE = 'https://bloodswow.it';

client.on('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.channels.fetch();

    // 1. Post invite embed in #invito-discord
    const inviteChannel = [...guild.channels.cache.values()].find(
      c => c.name && c.name.includes('Invito') && c.name.includes('Discord')
    );

    if (inviteChannel) {
      // Clear old messages first (keep none)
      const oldMsgs = await inviteChannel.messages.fetch({ limit: 10 });
      if (oldMsgs.size > 0) {
        await inviteChannel.bulkDelete(oldMsgs).catch(() => {});
      }

      const inviteEmbed = new EmbedBuilder()
        .setTitle('🩸 Unisciti ai Bloods — Discord Ufficiale')
        .setColor(0x8b0000)
        .setDescription(
          '**Siamo i Bloods** — Gilda WoW Pozzo dell\'Eternità EU (Orda)\n\n' +
          '🛡️ Soft-progress · Raid · M+ · PvP · Social\n' +
          '🏰 Housing di gilda & eventi community\n' +
          '🎙️ Discord obbligatorio, zero drama\n\n' +
          '**Clicca qui sotto per entrare:**\n' +
          `👉 [${DISCORD_INVITE}](${DISCORD_INVITE})\n\n` +
          `🌐 Sito web: [${WEBSITE}](${WEBSITE})`
        )
        .setImage('https://bloodswow.it/img/banner.png')
        .setFooter({ text: 'Bloods Community · Pozzo dell\'Eternità EU · Orda' })
        .setTimestamp();

      await inviteChannel.send({ embeds: [inviteEmbed] });
      console.log('Posted invite embed in #invito-discord');
    } else {
      console.log('Channel #invito-discord not found');
    }

    // 2. Post invite embed in #invito-wow-community
    const wowCommunityChannel = [...guild.channels.cache.values()].find(
      c => c.name && c.name.includes('Invito') && c.name.includes('wow-community')
    );

    if (wowCommunityChannel) {
      const oldMsgs2 = await wowCommunityChannel.messages.fetch({ limit: 10 });
      if (oldMsgs2.size > 0) {
        await wowCommunityChannel.bulkDelete(oldMsgs2).catch(() => {});
      }

      const wowEmbed = new EmbedBuilder()
        .setTitle('🎮 WoW Community Bloods — Reclutamento Aperto')
        .setColor(0x8b0000)
        .setDescription(
          '**I Bloods cercano giocatori!** 🩸\n\n' +
          '**Chi siamo:**\n' +
          '• Gilda WoW Pozzo dell\'Eternità EU — Orda\n' +
          '• Soft-progress: raid Mythic Mar+Gio 21:00-24:00\n' +
          '• PvP Mer 21:00-23:00 · Social Dom 21:00-23:00\n' +
          '• Discord obbligatorio, community attiva\n\n' +
          '**Cosa offriamo:**\n' +
          '• Sistema Bloods Points (BP) per loot equo\n' +
          '• Mentor per nuovi membri\n' +
          '• Eventi community settimanali\n' +
          '• Bot Discord personalizzato (statistiche, LFG, raid)\n' +
          '• Sito web: bloodswow.it\n\n' +
          '**Come entrare:**\n' +
          `👉 [${DISCORD_INVITE}](${DISCORD_INVITE})\n\n` +
          'Apri un ticket in Discord per il colloquio di 10 minuti!'
        )
        .setFooter({ text: 'Bloods Community · Reclutamento WoW' })
        .setTimestamp();

      await wowCommunityChannel.send({ embeds: [wowEmbed] });
      console.log('Posted recruit embed in #invito-wow-community');
    }

    // 3. Check all text channels for descriptions (topic)
    const textChannels = [...guild.channels.cache.values()].filter(c => c.type === 0);
    console.log('\n=== CHANNEL TOPIC AUDIT ===');
    const missingTopic = [];
    for (const ch of textChannels) {
      if (!ch.topic || ch.topic.trim() === '') {
        missingTopic.push({ name: ch.name, id: ch.id, parent: ch.parent?.name || 'nessuna' });
      }
    }
    if (missingTopic.length === 0) {
      console.log('All text channels have topics!');
    } else {
      console.log(`Channels WITHOUT topic (${missingTopic.length}/${textChannels.length}):`);
      missingTopic.forEach(c => console.log(`  #${c.name} (${c.id}) — categoria: ${c.parent}`));
    }

    // 4. List channels that already have info embeds (check last message)
    console.log('\n=== CHANNEL EMBED AUDIT ===');
    const channelsWithEmbeds = [];
    const channelsWithoutEmbeds = [];
    for (const ch of textChannels) {
      try {
        const msgs = await ch.messages.fetch({ limit: 3 });
        const hasEmbed = [...msgs.values()].some(m => m.embeds && m.embeds.length > 0 && m.author?.bot);
        if (hasEmbed) {
          channelsWithEmbeds.push(ch.name);
        } else {
          channelsWithoutEmbeds.push(ch.name);
        }
      } catch {
        channelsWithoutEmbeds.push(ch.name + ' (no access)');
      }
    }
    console.log('Channels WITH bot embeds:', channelsWithEmbeds.length);
    channelsWithEmbeds.forEach(c => console.log('  ✓ #' + c));
    console.log('\nChannels WITHOUT bot embeds:', channelsWithoutEmbeds.length);
    channelsWithoutEmbeds.forEach(c => console.log('  ✗ #' + c));

    client.destroy();
  } catch (err) {
    console.error('Error:', err.message);
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
