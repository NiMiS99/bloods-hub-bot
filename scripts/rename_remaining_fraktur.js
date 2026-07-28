// scripts/rename_remaining_fraktur.js
// Renames the 8 remaining user-created Fraktur categories to Sans-Serif.
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../src/config');
const { toFraktur } = require('../src/utils/textFormatter'); // now Sans-Serif

const GUILD_ID = '1010226759817515018';

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

function frakturToAscii(text) {
  let result = '';
  for (const ch of text) {
    if (OLD_FRAKTUR_UPPER[ch]) result += OLD_FRAKTUR_UPPER[ch];
    else if (OLD_FRAKTUR_LOWER[ch]) result += OLD_FRAKTUR_LOWER[ch];
    else result += ch;
  }
  return result;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.channels.fetch();

  const frakturPattern = /[\u{1D504}-\u{1D537}\u{212D}\u{210C}\u{2111}\u{211C}\u{2128}]/u;
  const frakturChannels = [...guild.channels.cache.values()].filter(
    (c) => frakturPattern.test(c.name)
  );

  console.log(`=== Renaming ${frakturChannels.length} remaining Fraktur channels ===\n`);
  let renamed = 0, failed = 0;

  for (const ch of frakturChannels) {
    const asciiName = frakturToAscii(ch.name);
    const newName = toFraktur(asciiName);
    if (ch.name === newName) { console.log(`  - "${ch.name}" (already ok)`); continue; }
    try {
      await ch.setName(newName, 'Font unification: Fraktur → Sans-Serif');
      console.log(`  ✓ "${ch.name}" → "${newName}"`);
      renamed++;
    } catch (err) {
      console.log(`  ✗ "${ch.name}": ${err.message.substring(0, 80)}`);
      failed++;
    }
  }

  console.log(`\nRenamed: ${renamed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
});

client.login(config.discord.token);
