require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', async () => {
  try {
    const guild = client.guilds.cache.get('1010226759817515018');
    await guild.channels.fetch();

    const categories = [...guild.channels.cache.values()].filter(c => c.type === 4);
    const communityCat = categories.find(c =>
      c.name.includes('Community') || c.name.includes('Hub') || c.name.includes('Social')
    );
    const parentId = communityCat ? communityCat.id : null;
    console.log('Parent category:', communityCat ? communityCat.name + ' (' + communityCat.id + ')' : 'none');

    const yt = await guild.channels.create({
      name: 'youtube',
      type: ChannelType.GuildText,
      parent: parentId,
      topic: 'Auto-post nuovi video YouTube + statistiche canale',
      reason: 'YouTubeService integration',
    });
    console.log('Created #youtube:', yt.id);

    const tt = await guild.channels.create({
      name: 'tiktok',
      type: ChannelType.GuildText,
      parent: parentId,
      topic: 'Auto-post nuovi TikTok + engagement tracking',
      reason: 'TikTokService integration',
    });
    console.log('Created #tiktok:', tt.id);

    // Send welcome messages
    await yt.send('📺 **Canale YouTube — Bloods Hub Bot**\n\nQuesto canale riceve automaticamente:\n• Nuovi video pubblicati sul canale YouTube dei Bloods\n• Statistiche settimanali (iscritti, views, video count)\n\nIl bot controlla ogni 15 minuti.');
    await tt.send('🎵 **Canale TikTok — Bloods Hub Bot**\n\nQuesto canale riceve automaticamente:\n• Nuovi TikTok pubblicati dall\'account @bloodswow\n• Statistiche engagement (views, like, commenti, share)\n\nIl bot controlla ogni 15 minuti.');

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  }
  client.destroy();
});

client.login(process.env.DISCORD_TOKEN);
