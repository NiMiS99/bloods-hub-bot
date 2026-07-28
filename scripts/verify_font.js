// scripts/verify_font.js
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1010226759817515018');
  await guild.channels.fetch();

  // Fraktur ranges
  const frakturPattern = /[\u{1D504}-\u{1D537}\u{212D}\u{210C}\u{2111}\u{211C}\u{2128}]/u;
  // Sans-Serif ranges
  const sansSerifPattern = /[\u{1D5A0}-\u{1D5D3}]/u;

  const all = [...guild.channels.cache.values()];
  let frakturCount = 0, sansCount = 0, plainCount = 0;

  console.log('=== FONT VERIFICATION ===\n');
  for (const ch of all) {
    if (frakturPattern.test(ch.name)) {
      frakturCount++;
      console.log(`  [FRAKTUR] ${ch.type === 4 ? 'CAT' : 'CH'} "${ch.name}"`);
    } else if (sansSerifPattern.test(ch.name)) {
      sansCount++;
    } else {
      plainCount++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`  Sans-Serif (correct): ${sansCount}`);
  console.log(`  Fraktur (old): ${frakturCount}`);
  console.log(`  Plain/other: ${plainCount}`);
  console.log(`  Total: ${all.length}`);

  if (frakturCount === 0) {
    console.log('\n  ✓ ALL CHANNELS USE SANS-SERIF — NO FRAKTUR REMAINS');
  } else {
    console.log(`\n  ✗ ${frakturCount} channels still use Fraktur font`);
  }

  process.exit(frakturCount > 0 ? 1 : 0);
});

client.login(config.discord.token);
