// scripts/fix_wow_channels.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');
const { toFraktur } = require('../src/utils/textFormatter');

const GUILD_ID = '1010226759817515018';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.channels.fetch();

  const wow = await Game.findOne({ where: { code: 'wow' } });
  if (!wow || !wow.category_id) {
    console.log('WoW not configured');
    process.exit(1);
  }

  const cat = guild.channels.cache.get(wow.category_id);
  const children = [...guild.channels.cache.values()]
    .filter((c) => c.parentId === cat.id);

  const fixes = [
    { from: '💬丨𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢', to: '💬丨𝔊𝔢𝔫𝔢𝔯𝔞𝔩𝔢' },
    { from: '📰丨𝔫𝔢𝔴𝔰', to: '📰丨𝔑𝔢𝔴𝔰' },
    { from: '📣丨𝔠𝔬𝔪𝔲𝔫𝔦𝔠𝔞𝔷𝔦𝔬𝔫𝔦', to: '📣丨ℭ𝔬𝔪𝔲𝔫𝔦𝔠𝔞𝔷𝔦𝔬𝔫𝔦' },
    { from: '⚔️丨𝔠𝔬𝔪𝔭𝔬𝔰𝔦𝔷𝔦𝔬𝔫𝔦', to: '⚔️丨ℭ𝔬𝔪𝔭𝔬𝔰𝔦𝔷𝔦𝔬𝔫𝔦' },
    { from: '🔊丨𝔙𝔬𝔠𝔞𝔩𝔢 1', to: '🔊丨𝔙𝔬𝔠𝔞𝔩𝔢 1' }, // already ok
    { from: '🔊丨𝔙𝔬𝔠𝔞𝔩𝔢 2', to: '🔊丨𝔙𝔬𝔠𝔞𝔩𝔢 2' }, // already ok
  ];

  for (const ch of children) {
    const fix = fixes.find((f) => f.from === ch.name);
    if (fix && fix.from !== fix.to) {
      await ch.setName(fix.to, 'Fix capitalization');
      console.log(`✓ ${ch.name} → ${fix.to}`);
    } else {
      console.log(`- ${ch.name} (ok)`);
    }
  }

  // Also refresh the role selection panel to include WoW
  const { refreshRolePanel } = require('../src/ui/roleSelection');
  const result = await refreshRolePanel(guild, client);
  console.log(`\nRole panel: ${result}`);

  process.exit(0);
});

client.login(config.discord.token);
