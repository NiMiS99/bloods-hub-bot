// scripts/test_game_news.js
// Tests fetching + posting news for all games.
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const { Game, GameMeta } = require('../src/db');
const { Op } = require('sequelize');

const GUILD_ID = '1010226759817515018';
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.channels.fetch();

    const games = await Game.findAll({ where: { is_active: true } });
    console.log(`Testing ${games.length} games...\n`);

    const NewsPoster = require('../src/services/newsPoster');
    const poster = new NewsPoster(client);

    for (const game of games) {
      console.log(`\n=== ${game.name} (${game.code}) ===`);

      // 1. Fetch meta
      try {
        const mod = require(`../src/modules/games/${game.code}`);
        if (mod?.fetchMeta) {
          const items = await mod.fetchMeta();
          console.log(`  Fetch: ${items.length} items`);

          let newCount = 0;
          for (const item of items) {
            if (item.url) {
              const existing = await GameMeta.findOne({
                where: {
                  game_id: game.id,
                  kind: item.kind,
                  url: item.url,
                  fetched_at: { [Op.gte]: new Date(Date.now() - 6 * 3600 * 1000) },
                },
              });
              if (existing) continue;
            }
            await GameMeta.create({
              game_id: game.id,
              kind: item.kind,
              title: item.title,
              body: item.body ?? null,
              url: item.url ?? null,
              posted_to_channel: false,
            });
            newCount++;
          }
          console.log(`  New entries: ${newCount}`);
        }
      } catch (err) {
        console.log(`  Fetch error: ${err.message.substring(0, 80)}`);
      }

      // 2. Post to channel
      try {
        const result = await poster.postForGame(game.code);
        if (result.error) {
          console.log(`  Post: ✗ ${result.error}`);
        } else {
          console.log(`  Post: ✓ ${result.posted} news in #${result.channel}`);
        }
      } catch (err) {
        console.log(`  Post error: ${err.message.substring(0, 80)}`);
      }

      // 3. Check channels
      if (game.category_id) {
        const cat = guild.channels.cache.get(game.category_id);
        if (cat) {
          const children = [...guild.channels.cache.values()]
            .filter((c) => c.parentId === cat.id)
            .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
          console.log(`  Channels (${children.length}):`);
          for (const ch of children) {
            const typeStr = ch.type === 2 ? 'VC' : 'TXT';
            console.log(`    [${typeStr}] ${ch.name}`);
          }
        }
      }
    }

    console.log('\n=== DONE ===');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

client.login(config.discord.token);
