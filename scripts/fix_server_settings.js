// scripts/fix_server_settings.js
// Fix server settings: system channel, widget, voice bitrate, DB config.
const { Client, GatewayIntentBits, Partials, ChannelType } = require('discord.js');
const config = require('../src/config');
const { connectDB, Guild } = require('../src/db');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

function normalize(str) {
  if (!str) return '';
  return str
    .replace(/[\u{1D5A0}-\u{1D5B9}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D5A0 + 65))
    .replace(/[\u{1D5BA}-\u{1D5D3}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D5BA + 97))
    .replace(/[\u{1D7EC}-\u{1D7F5}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D7EC + 48))
    .trim().toLowerCase();
}

async function fix() {
  await connectDB();
  await client.login(config.discord.token);
  await new Promise((r) => client.once('clientReady', r));

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) { console.error('Guild not found!'); process.exit(1); }

  await guild.channels.fetch();
  const channels = [...guild.channels.cache.values()];

  // ============================================
  // 1. SYSTEM CHANNEL — find "annunci" or "benvenuto"
  // ============================================
  console.log('\n--- 1. SYSTEM CHANNEL ---');
  let systemChannel = channels.find(c =>
    normalize(c.name).includes('annunci') || normalize(c.name).includes('benvenuto')
  );
  if (systemChannel) {
    try {
      await guild.setSystemChannel(systemChannel.id, 'Audit fix: system channel');
      console.log(`OK: System channel set to #${systemChannel.name}`);
    } catch (err) { console.log(`ERROR: ${err.message}`); }
  } else {
    console.log('WARN: No annunci/benvenuto channel found for system channel');
  }

  // ============================================
  // 2. WIDGET — enable
  // ============================================
  console.log('\n--- 2. WIDGET ---');
  try {
    await guild.setWidgetSettings({ enabled: true, channel: systemChannel || undefined });
    console.log('OK: Widget enabled');
  } catch (err) { console.log(`ERROR: ${err.message}`); }

  // ============================================
  // 3. VOICE BITRATE — upgrade game channels to 96kbps, community to 128kbps
  // ============================================
  console.log('\n--- 3. VOICE BITRATE ---');
  const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice);
  let bitrateFixed = 0;

  for (const vc of voiceChannels) {
    const currentBitrate = vc.bitrate;
    const parent = vc.parent ? normalize(vc.parent.name) : '';
    const isGameVoice = parent && !parent.includes('gilda') && !parent.includes('community') && !parent.includes('streaming') && !parent.includes('assisten') && !parent.includes('prigione') && !parent.includes('riunion');
    const isCommunityVoice = parent.includes('gilda') || parent.includes('community') || parent.includes('streaming');
    const isStage = vc.type === ChannelType.GuildStageVoice;

    // Game voice: 96kbps (good quality for gaming)
    // Community voice: 128kbps (max quality for social)
    // Stage: 64kbps is fine for listening
    let targetBitrate = null;
    if (isGameVoice && currentBitrate < 96000) targetBitrate = 96000;
    else if (isCommunityVoice && currentBitrate < 128000) targetBitrate = 128000;

    if (targetBitrate && !isStage) {
      try {
        await vc.setBitrate(targetBitrate, 'Audit fix: voice bitrate upgrade');
        console.log(`  OK: ${vc.name} (${parent}) ${currentBitrate/1000}kbps → ${targetBitrate/1000}kbps`);
        bitrateFixed++;
      } catch (err) {
        console.log(`  ERROR: ${vc.name} - ${err.message}`);
      }
    }
  }
  console.log(`Bitrate upgraded: ${bitrateFixed} channels`);

  // ============================================
  // 4. DB GUILD — set missing config
  // ============================================
  console.log('\n--- 4. DB GUILD CONFIG ---');
  const guildRow = await Guild.findOne({ where: { guild_id: GUILD_ID } });
  if (guildRow) {
    const updates = {};

    // Find temp voice creator channel
    if (!guildRow.temp_voice_creator_channel_id) {
      const tempCreator = channels.find(c => normalize(c.name).includes('clicca') && normalize(c.name).includes('creare') && c.type === ChannelType.GuildVoice);
      if (tempCreator) {
        updates.temp_voice_creator_channel_id = tempCreator.id;
        console.log(`  Set temp_voice_creator_channel_id = ${tempCreator.name}`);
      }
    }

    // Find starboard channel — create if missing
    if (!guildRow.starboard_channel_id) {
      let starChannel = channels.find(c => normalize(c.name).includes('starboard') || normalize(c.name).includes('stell'));
      if (!starChannel) {
        // Use "migliori-momenti" in community hub
        const communityCat = channels.find(c => c.type === ChannelType.GuildCategory && normalize(c.name).includes('community hub'));
        try {
          starChannel = await guild.channels.create({
            name: '⭐丨Migliori-Momenti',
            type: ChannelType.GuildText,
            parent: communityCat?.id,
            topic: 'I messaggi più stellati della community vengono salvati qui',
          });
          console.log(`  Created starboard channel: ${starChannel.name}`);
        } catch (err) { console.log(`  ERROR creating starboard: ${err.message}`); }
      }
      if (starChannel) {
        updates.starboard_channel_id = starChannel.id;
        console.log(`  Set starboard_channel_id = ${starChannel.name}`);
      }
    }

    // Find birthday channel — use announcements
    if (!guildRow.birthday_channel_id) {
      const announceChannel = channels.find(c => normalize(c.name).includes('annunci'));
      if (announceChannel) {
        updates.birthday_channel_id = announceChannel.id;
        console.log(`  Set birthday_channel_id = ${announceChannel.name}`);
      }
    }

    // Find birthday role — create if missing
    if (!guildRow.birthday_role_id) {
      let birthdayRole = guild.roles.cache.find(r => r.name === 'Compleanno');
      if (!birthdayRole) {
        try {
          birthdayRole = await guild.roles.create({
            name: 'Compleanno',
            color: 0xFFD700,
            permissions: [],
            hoist: false,
            mentionable: false,
            reason: 'Birthday tracker role',
          });
          console.log(`  Created birthday role: ${birthdayRole.name}`);
        } catch (err) { console.log(`  ERROR creating birthday role: ${err.message}`); }
      }
      if (birthdayRole) {
        updates.birthday_role_id = birthdayRole.id;
        console.log(`  Set birthday_role_id = ${birthdayRole.name}`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await guildRow.update(updates);
      console.log(`  DB updated: ${Object.keys(updates).join(', ')}`);
    } else {
      console.log('  No DB updates needed');
    }
  }

  // ============================================
  // 5. GAME CATEGORIES — add "composizioni" channel if missing
  // ============================================
  console.log('\n--- 5. GAME CHANNELS CHECK ---');
  const { Game } = require('../src/db');
  const games = await Game.findAll({ where: { is_active: true }, raw: true });

  for (const game of games) {
    const cat = guild.channels.cache.get(game.category_id);
    if (!cat) continue;

    const children = channels.filter(c => c.parentId === cat.id);
    const childNames = children.map(c => normalize(c.name));
    const hasGenerale = childNames.some(n => n.includes('generale'));
    const hasNews = childNames.some(n => n.includes('news'));
    const hasComunicazioni = childNames.some(n => n.includes('comunicazioni') || n.includes('comunicazion'));
    const hasVoice = children.some(c => c.type === ChannelType.GuildVoice);

    const missing = [];
    if (!hasGenerale) missing.push('generale');
    if (!hasNews) missing.push('news');
    if (!hasComunicazioni) missing.push('comunicazioni');
    if (!hasVoice) missing.push('vocale');

    if (missing.length > 0) {
      console.log(`  ${game.name}: missing ${missing.join(', ')}`);
      // Create missing channels
      const { toFraktur } = require('../src/utils/textFormatter');
      const { createGameChannels } = require('../src/utils/gameChannels');

      for (const m of missing) {
        try {
          if (m === 'vocale') {
            await guild.channels.create({
              name: '🔊丨𝖵𝗈𝖼𝖺𝗅𝖾 1',
              type: ChannelType.GuildVoice,
              parent: cat.id,
              bitrate: 96000,
            });
          } else if (m === 'generale') {
            await guild.channels.create({
              name: '💬丨𝖦𝖾𝗇𝖾𝗋𝖺𝗅𝖾',
              type: ChannelType.GuildText,
              parent: cat.id,
              topic: `Chat generale di ${game.name}`,
            });
          } else if (m === 'news') {
            await guild.channels.create({
              name: '📰丨𝖭𝖾𝗐𝗌',
              type: ChannelType.GuildText,
              parent: cat.id,
              topic: `News e aggiornamenti di ${game.name}`,
            });
          } else if (m === 'comunicazioni') {
            await guild.channels.create({
              name: '📢丨𝖢𝗈𝗆𝗎𝗇𝗂𝖼𝖺𝗓𝗂𝗈𝗇𝗂',
              type: ChannelType.GuildText,
              parent: cat.id,
              topic: `Comunicazioni staff di ${game.name}`,
            });
          }
          console.log(`    Created: ${m} for ${game.name}`);
        } catch (err) {
          console.log(`    ERROR creating ${m}: ${err.message}`);
        }
      }
    }
  }

  // ============================================
  // 6. COMMUNITY HUB — ensure LFG and suggestions channels exist
  // ============================================
  console.log('\n--- 6. COMMUNITY CHANNELS ---');
  const communityCat = channels.find(c => c.type === ChannelType.GuildCategory && normalize(c.name).includes('community hub'));
  if (communityCat) {
    const communityChildren = channels.filter(c => c.parentId === communityCat.id);
    const commNames = communityChildren.map(c => normalize(c.name));

    // LFG channel
    if (!commNames.some(n => n.includes('lfg') || n.includes('cerca'))) {
      try {
        await guild.channels.create({
          name: '🎮丨𝖫𝖥𝖦',
          type: ChannelType.GuildText,
          parent: communityCat.id,
          topic: 'Looking For Group — cerca compagni di gioco',
        });
        console.log('  Created LFG channel');
      } catch (err) { console.log(`  ERROR LFG: ${err.message}`); }
    }

    // Suggestions channel
    if (!commNames.some(n => n.includes('sugger'))) {
      try {
        await guild.channels.create({
          name: '💡丨𝖲𝗎𝗀𝗀𝖾𝗋𝗂𝗆𝖾𝗇𝗍𝗂',
          type: ChannelType.GuildText,
          parent: communityCat.id,
          topic: 'Suggerimenti della community',
        });
        console.log('  Created suggestions channel');
      } catch (err) { console.log(`  ERROR suggestions: ${err.message}`); }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Server settings fix complete!');
  console.log('='.repeat(60));

  await client.destroy();
  process.exit(0);
}

fix().catch(err => { console.error('Fix failed:', err); process.exit(1); });
