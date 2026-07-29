// scripts/rename_to_sansserif.js
// Renames all bot-created channels from Fraktur to Mathematical Sans-Serif.
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');
const { toFraktur } = require('../src/utils/textFormatter'); // now produces Sans-Serif

const GUILD_ID = '1010226759817515018';

// Old Fraktur maps for reverse-mapping existing channel names
const OLD_FRAKTUR_UPPER = {
  '\u{1D504}':'A','\u{1D505}':'B','\u{212D}':'C','\u{1D507}':'D','\u{1D508}':'E',
  '\u{1D509}':'F','\u{1D50A}':'G','\u{210C}':'H','\u{2111}':'I','\u{1D50D}':'J',
  '\u{1D50E}':'K','\u{1D50F}':'L','\u{1D510}':'M','\u{1D511}':'N','\u{1D512}':'O',
  '\u{1D513}':'P','\u{1D514}':'Q','\u{211C}':'R','\u{1D516}':'S','\u{1D517}':'T',
  '\u{1D518}':'U','\u{1D519}':'V','\u{1D51A}':'W','\u{1D51B}':'X','\u{1D51C}':'Y',
  '\u{2128}':'Z',
};
const OLD_FRAKTUR_LOWER = {};
for (let i = 0; i < 26; i++) {
  OLD_FRAKTUR_LOWER[String.fromCodePoint(0x1d51e + i)] = String.fromCharCode(97 + i);
}

// Reverse-map a Fraktur string back to ASCII
function frakturToAscii(text) {
  let result = '';
  for (const ch of text) {
    if (OLD_FRAKTUR_UPPER[ch]) result += OLD_FRAKTUR_UPPER[ch];
    else if (OLD_FRAKTUR_LOWER[ch]) result += OLD_FRAKTUR_LOWER[ch];
    else result += ch;
  }
  return result;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.fetch();
    await guild.channels.fetch();

    const games = await Game.findAll({ where: { is_active: true } });
    const gameCatIds = new Set(games.map((g) => g.category_id).filter(Boolean));

    console.log('=== RENAMING TO SANS-SERIF ===\n');
    let renamed = 0, skipped = 0, failed = 0;

    // 1. Rename game categories
    console.log('--- Game Categories ---');
    for (const game of games) {
      if (!game.category_id) continue;
      const cat = guild.channels.cache.get(game.category_id);
      if (!cat) continue;

      const newName = toFraktur(game.name);
      if (cat.name === newName) { console.log(`  - "${cat.name}" (ok)`); skipped++; continue; }
      try {
        await cat.setName(newName, 'Font: Fraktur → Sans-Serif');
        console.log(`  ✓ "${cat.name}" → "${newName}"`);
        renamed++;
      } catch (err) { console.log(`  ✗ "${cat.name}": ${err.message.substring(0, 60)}`); failed++; }
    }

    // 2. Rename all channels in game categories
    console.log('\n--- Game Channels ---');
    for (const game of games) {
      if (!game.category_id) continue;
      const cat = guild.channels.cache.get(game.category_id);
      if (!cat) continue;

      const children = [...guild.channels.cache.values()]
        .filter((c) => c.parentId === cat.id)
        .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

      console.log(`\n  [${game.name}]`);
      for (const ch of children) {
        const newName = convertChannelName(ch.name);
        if (!newName) { console.log(`    - "${ch.name}" (no conversion needed)`); skipped++; continue; }
        if (ch.name === newName) { console.log(`    - "${ch.name}" (ok)`); skipped++; continue; }
        try {
          await ch.setName(newName, 'Font: Fraktur → Sans-Serif');
          console.log(`    ✓ "${ch.name}" → "${newName}"`);
          renamed++;
        } catch (err) { console.log(`    ✗ "${ch.name}": ${err.message.substring(0, 60)}`); failed++; }
      }
    }

    // 3. Rename other bot channels that use Fraktur
    console.log('\n--- Other Channels with Fraktur ---');
    const frakturPattern = /[\u{1D504}-\u{1D537}\u{212D}\u{210C}\u{2111}\u{211C}\u{2128}]/u;
    const otherChannels = [...guild.channels.cache.values()].filter(
      (c) => !gameCatIds.has(c.id) && c.type !== 4 && frakturPattern.test(c.name)
    );
    for (const ch of otherChannels) {
      const newName = convertChannelName(ch.name);
      if (!newName || ch.name === newName) { console.log(`  - "${ch.name}" (ok)`); skipped++; continue; }
      try {
        await ch.setName(newName, 'Font: Fraktur → Sans-Serif');
        console.log(`  ✓ "${ch.name}" → "${newName}"`);
        renamed++;
      } catch (err) { console.log(`  ✗ "${ch.name}": ${err.message.substring(0, 60)}`); failed++; }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`  Renamed: ${renamed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed: ${failed}`);

    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
});

// Convert a channel name from Fraktur to Sans-Serif
function convertChannelName(name) {
  // Check if it has Fraktur chars
  const frakturPattern = /[\u{1D504}-\u{1D537}\u{212D}\u{210C}\u{2111}\u{211C}\u{2128}]/u;
  if (!frakturPattern.test(name)) return null; // No Fraktur, no conversion needed

  // Split by 丨 separator
  const parts = name.split('丨');
  if (parts.length < 2) {
    // No separator — convert entire name
    const ascii = frakturToAscii(name);
    return toFraktur(ascii);
  }

  // Keep emoji prefix, convert the rest
  const emoji = parts[0];
  const rest = parts.slice(1).join('丨');
  const asciiRest = frakturToAscii(rest);
  const sansSerifRest = toFraktur(asciiRest);
  return `${emoji}丨${sansSerifRest}`;
}

client.login(config.discord.token);
