// scripts/delete_unused_chat.js
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();

  // 1. Delete the empty Chat-Pubblica in Community Hub
  const chatToDelete = guild.channels.cache.get('1529853397455474798');
  if (chatToDelete) {
    const children = [...guild.channels.cache.values()].filter((c) => c.parentId === chatToDelete.parentId);
    console.log(`Community Hub has ${children.length} children: ${children.map((c) => c.name).join(', ')}`);

    await chatToDelete.delete('Cleanup: duplicate empty Chat-Pubblica (0 messages)');
    console.log('✓ Deleted empty Chat-Pubblica from Community Hub');

    // Check if Community Hub is now empty
    const remaining = [...guild.channels.cache.values()].filter((c) => c.parentId === chatToDelete.parentId);
    if (remaining.length === 0) {
      const cat = guild.channels.cache.get(chatToDelete.parentId);
      if (cat) {
        await cat.delete('Cleanup: Community Hub now empty');
        console.log(`✓ Deleted empty category "${cat.name}"`);
      }
    } else {
      console.log(`Community Hub still has ${remaining.length} channels — keeping`);
    }
  }

  // 2. Final channel count
  const all = [...guild.channels.cache.values()];
  const cats = all.filter((c) => c.type === ChannelType.GuildCategory);
  const texts = all.filter((c) => c.type === 0 || c.type === 5);
  const voices = all.filter((c) => c.type === 2);
  const empty = cats.filter((c) => !all.some((ch) => ch.parentId === c.id));
  console.log(`\nFinal: ${all.length} channels (${cats.length} categories, ${texts.length} text, ${voices.length} voice)`);
  console.log(`Empty categories: ${empty.length}`);
  if (empty.length > 0) {
    empty.forEach((c) => console.log(`  - "${c.name}" (${c.id})`));
  }

  process.exit(0);
});

client.login(config.discord.token);
