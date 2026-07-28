// scripts/audit_non_game_channels.js
// Lists all non-game channels with their category, type, permissions and last message date.
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.fetch();
  await guild.channels.fetch();
  await guild.roles.fetch();

  const games = await Game.findAll({ where: { is_active: true } });
  const gameCatIds = new Set(games.map((g) => g.category_id).filter(Boolean));

  // Get all non-game categories and channels
  const allChannels = [...guild.channels.cache.values()];
  const nonGameCategories = allChannels
    .filter((c) => c.type === ChannelType.GuildCategory && !gameCatIds.has(c.id))
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

  console.log('=== NON-GAME CHANNELS AUDIT ===\n');
  console.log(`Total non-game categories: ${nonGameCategories.length}\n`);

  for (const cat of nonGameCategories) {
    const children = allChannels
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

    // Check @everyone permissions
    const everyoneOW = cat.permissionOverwrites?.cache.get(guild.roles.everyone.id);
    const everyoneVisible = everyoneOW
      ? !everyoneOW.deny.has(PermissionsBitField.Flags.ViewChannel)
      : true;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📁 "${cat.name}" (pos:${cat.rawPosition}, id:${cat.id})`);
    console.log(`   @everyone visible: ${everyoneVisible ? 'YES' : 'NO'}`);
    console.log(`   Channels: ${children.length}`);

    for (const ch of children) {
      const typeStr =
        ch.type === 0 ? 'TXT' :
        ch.type === 2 ? 'VC ' :
        ch.type === 4 ? 'CAT' :
        ch.type === 5 ? 'ANN' :
        ch.type === 15 ? 'FOR' :
        `T${ch.type}`;

      // Check last message
      let lastMsg = 'unknown';
      let msgCount = '?';
      if (ch.type === 0 || ch.type === 5) {
        try {
          const messages = await ch.messages.fetch({ limit: 1 });
          if (messages.size > 0) {
            const m = messages.first();
            lastMsg = m.createdAt.toISOString().split('T')[0];
            msgCount = (await ch.messages.fetch({ limit: 50 })).size;
          } else {
            lastMsg = 'empty';
            msgCount = 0;
          }
        } catch {
          lastMsg = 'no access';
        }
      }

      // Check if it's a bot-managed channel
      const botChannels = ['log', 'annunci', 'avvisi', 'benvenuto', 'selezione'];
      const isBotChannel = botChannels.some((b) => ch.name.toLowerCase().includes(b));

      // Check permissions for @everyone
      const chEveryoneOW = ch.permissionOverwrites?.cache.get(guild.roles.everyone.id);
      let chPerm = 'inherit';
      if (chEveryoneOW) {
        const canView = !chEveryoneOW.deny.has(PermissionsBitField.Flags.ViewChannel);
        const canSend = !chEveryoneOW.deny.has(PermissionsBitField.Flags.SendMessages);
        chPerm = canView ? (canSend ? 'view+send' : 'view-only') : 'hidden';
      }

      console.log(`   [${typeStr}] #${ch.name} (id:${ch.id})`);
      console.log(`        last_msg: ${lastMsg}, count: ${msgCount}, @everyone: ${chPerm}${isBotChannel ? ' [BOT]' : ''}`);
    }
  }

  // Also list channels with no category
  const orphanChannels = allChannels.filter(
    (c) => !c.parentId && c.type !== ChannelType.GuildCategory
  );
  if (orphanChannels.length > 0) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📂 ORPHAN CHANNELS (no category): ${orphanChannels.length}`);
    for (const ch of orphanChannels) {
      console.log(`   #${ch.name} (id:${ch.id}, type:${ch.type})`);
    }
  }

  // List game categories for reference
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎮 GAME CATEGORIES (for reference):`);
  for (const game of games) {
    const cat = guild.channels.cache.get(game.category_id);
    if (cat) console.log(`   📁 "${cat.name}" (pos:${cat.rawPosition})`);
  }

  process.exit(0);
});

client.login(config.discord.token);
