// scripts/audit_server_full.js
// Complete server audit: settings, roles, channels, voice, structure.
const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, SystemChannelFlags } = require('discord.js');
const config = require('../src/config');
const { connectDB, Game, Guild } = require('../src/db');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Channel, Partials.GuildMember],
});

function normalize(str) {
  if (!str) return '';
  return str
    .replace(/[\u{1D5A0}-\u{1D5B9}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D5A0 + 65))
    .replace(/[\u{1D5BA}-\u{1D5D3}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D5BA + 97))
    .replace(/[\u{1D7EC}-\u{1D7F5}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D7EC + 48))
    .trim().toLowerCase();
}

async function audit() {
  await connectDB();
  await client.login(config.discord.token);
  await new Promise((r) => client.once('clientReady', r));

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) { console.error('Guild not found!'); process.exit(1); }

  await guild.roles.fetch();
  await guild.channels.fetch();
  await guild.members.fetch({ withPresences: true });

  const issues = [];

  console.log('='.repeat(80));
  console.log('  AUDIT COMPLETO SERVER DISCORD');
  console.log('='.repeat(80));

  // ============================================
  // 1. SERVER SETTINGS
  // ============================================
  console.log('\n--- 1. IMPOSTAZIONI SERVER ---');
  console.log(`  Nome: ${guild.name}`);
  console.log(`  Membri: ${guild.memberCount}`);
  console.log(`  Verification Level: ${guild.verificationLevel} (0=None, 1=Low, 2=Medium, 3=High, 4=Highest)`);
  console.log(`  Content Filter: ${guild.explicitContentFilter} (0=Off, 1=NoRole, 2=All)`);
  console.log(`  AFK Channel: ${guild.afkChannelId ? guild.channels.cache.get(guild.afkChannelId)?.name : 'NONE'}`);
  console.log(`  AFK Timeout: ${guild.afkTimeout}s`);
  console.log(`  System Channel: ${guild.systemChannelId ? guild.channels.cache.get(guild.systemChannelId)?.name : 'NONE'}`);
  console.log(`  Widget: ${guild.widgetEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Premium Tier (Boost): ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`);
  console.log(`  Max Bitrate: ${guild.maximumBitrate / 1000}kbps`);
  console.log(`  Max Members: ${guild.maximumMembers || 'unlimited'}`);
  console.log(`  Features: ${guild.features.join(', ') || 'none'}`);
  console.log(`  NSFW Level: ${guild.nsfwLevel}`);
  console.log(`  Icon: ${guild.iconURL() ? 'YES' : 'NONE'}`);
  console.log(`  Banner: ${guild.bannerURL() ? 'YES' : 'NONE'}`);
  console.log(`  Vanity URL: ${guild.vanityURLCode || 'NONE'}`);

  // Check issues
  if (guild.verificationLevel < 2) issues.push(`VERIFICATION LEVEL basso (${guild.verificationLevel}) - raccomandato almeno Medium (2)`);
  if (guild.explicitContentFilter < 1) issues.push(`CONTENT FILTER off - raccomandato almeno NoRole (1)`);
  if (!guild.afkChannelId) issues.push(`AFK CHANNEL non impostato - i utenti rimangono in vocale anche se AFK`);
  if (!guild.systemChannelId) issues.push(`SYSTEM CHANNEL non impostato - notifiche join/boost non visibili`);
  if (!guild.widgetEnabled) issues.push(`WIDGET disabilitato - impossibile embed server info`);
  if (!guild.iconURL()) issues.push(`ICON server mancante`);
  if (guild.afkTimeout < 300) issues.push(`AFK TIMEOUT troppo breve (${guild.afkTimeout}s) - raccomandato 300s+`);

  // ============================================
  // 2. ROLES — detailed permissions
  // ============================================
  console.log('\n--- 2. RUOLI E PERMESSI ---');
  const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);

  for (const role of roles) {
    if (role.name === '@everyone') {
      const everyonePerms = role.permissions.toArray();
      const dangerous = everyonePerms.filter(p =>
        ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles', 'BanMembers', 'KickMembers', 'ManageWebhooks', 'ManageEmojisAndStickers'].includes(p)
      );
      if (dangerous.length > 0) {
        issues.push(`@EVERYONE ha permessi pericolosi: ${dangerous.join(', ')}`);
        console.log(`  WARN @everyone: ${dangerous.join(', ')}`);
      }
      continue;
    }

    const perms = role.permissions.toArray();
    const hasAdmin = perms.includes('Administrator');
    const hasDangerous = perms.filter(p =>
      ['ManageGuild', 'ManageChannels', 'ManageRoles', 'BanMembers', 'KickMembers', 'ManageWebhooks'].includes(p)
    );

    if (hasAdmin || hasDangerous.length > 0) {
      const tag = role.managed ? '[BOT]' : '[STAFF]';
      console.log(`  ${tag} ${role.name}: ${perms.join(', ')}`);
    }
  }

  // ============================================
  // 3. VOICE CHANNELS — settings
  // ============================================
  console.log('\n--- 3. CANALI VOCALI ---');
  const voiceChannels = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice)
    .sort((a, b) => a.position - b.position);

  for (const vc of voiceChannels) {
    const bitrate = vc.bitrate / 1000;
    const userLimit = vc.userLimit || 0;
    const parent = vc.parent ? normalize(vc.parent.name) : 'no-parent';
    const isStage = vc.type === ChannelType.GuildStageVoice;
    const lowBitrate = bitrate < 64 && !isStage;
    const hasLimit = userLimit > 0;

    if (lowBitrate) issues.push(`VOICE ${vc.name}: bitrate basso (${bitrate}kbps)`);
    if (hasLimit && userLimit < 2) issues.push(`VOICE ${vc.name}: user limit troppo basso (${userLimit})`);

    console.log(`  ${isStage ? 'STAGE' : 'VOICE'} ${vc.name} | bitrate=${bitrate}kbps | limit=${userLimit || '∞'} | parent=${parent}`);
  }

  // ============================================
  // 4. TEXT CHANNELS — settings
  // ============================================
  console.log('\n--- 4. CANALI TESTO ---');
  const textChannels = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildText)
    .sort((a, b) => a.position - b.position);

  let noTopic = 0;
  let noSlowmode = 0;
  for (const tc of textChannels) {
    if (!tc.topic) noTopic++;
    if (tc.rateLimitPerUser > 0) noSlowmode++;
  }
  console.log(`  Total text channels: ${textChannels.length}`);
  console.log(`  Without topic: ${noTopic}`);
  console.log(`  With slowmode: ${noSlowmode}`);

  // Check for missing important channels
  const normNames = textChannels.map(c => normalize(c.name));
  const expected = ['benvenuto', 'regolamento', 'annunci', 'log-staff', 'ticket'];
  for (const exp of expected) {
    if (!normNames.some(n => n.includes(exp))) {
      issues.push(`CANALE MANCANTE: #${exp} non trovato`);
    }
  }

  // ============================================
  // 5. CATEGORY STRUCTURE
  // ============================================
  console.log('\n--- 5. STRUTTURA CATEGORIE ---');
  const categories = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  for (const cat of categories) {
    const children = [...guild.channels.cache.values()].filter(c => c.parentId === cat.id);
    const text = children.filter(c => c.type === ChannelType.GuildText).length;
    const voice = children.filter(c => c.type === ChannelType.GuildVoice).length;
    const normName = normalize(cat.name);
    console.log(`  ${cat.name} | text=${text} voice=${voice} | pos=${cat.position}`);

    // Check if game category has proper channel template
    const game = await Game.findOne({ where: { category_id: cat.id, is_active: true } });
    if (game) {
      const expected = ['generale', 'news', 'comunicazioni', 'vocale'];
      const childNames = children.map(c => normalize(c.name));
      const missing = expected.filter(e => !childNames.some(n => n.includes(e)));
      if (missing.length > 0) {
        issues.push(`CATEGORIA GIOCO ${game.name}: canali mancanti: ${missing.join(', ')}`);
        console.log(`    WARN: Missing channels: ${missing.join(', ')}`);
      }
    }
  }

  // ============================================
  // 6. EMOJI & STICKERS
  // ============================================
  console.log('\n--- 6. EMOJI & STICKERS ---');
  console.log(`  Emoji: ${guild.emojis.cache.size}/${guild.emojiLimit}`);
  console.log(`  Stickers: ${guild.stickers.cache.size}/${guild.stickerLimit}`);

  // ============================================
  // 7. GUILD DB RECORD
  // ============================================
  console.log('\n--- 7. RECORD DB GUILD ---');
  const guildRow = await Guild.findOne({ where: { guild_id: GUILD_ID } });
  if (guildRow) {
    console.log(`  welcome_channel_id: ${guildRow.welcome_channel_id || 'NOT SET'}`);
    console.log(`  rules_channel_id: ${guildRow.rules_channel_id || 'NOT SET'}`);
    console.log(`  role_selection_channel_id: ${guildRow.role_selection_channel_id || 'NOT SET'}`);
    console.log(`  log_channel_id: ${guildRow.log_channel_id || 'NOT SET'}`);
    console.log(`  announcements_channel_id: ${guildRow.announcements_channel_id || 'NOT SET'}`);
    console.log(`  level_reward_channel_id: ${guildRow.level_reward_channel_id || 'NOT SET'}`);
    console.log(`  automod_enabled: ${guildRow.automod_enabled}`);
    console.log(`  xp_enabled: ${guildRow.xp_enabled}`);
    console.log(`  welcome_enabled: ${guildRow.welcome_enabled}`);
    console.log(`  temp_voice_creator_channel_id: ${guildRow.temp_voice_creator_channel_id || 'NOT SET'}`);
    console.log(`  starboard_channel_id: ${guildRow.starboard_channel_id || 'NOT SET'}`);
    console.log(`  starboard_threshold: ${guildRow.starboard_threshold || 5}`);
    console.log(`  birthday_channel_id: ${guildRow.birthday_channel_id || 'NOT SET'}`);

    if (!guildRow.log_channel_id) issues.push('DB: log_channel_id non impostato');
    if (!guildRow.announcements_channel_id) issues.push('DB: announcements_channel_id non impostato');
    if (!guildRow.automod_enabled) issues.push('DB: automod_enabled è false');
    if (!guildRow.welcome_enabled) issues.push('DB: welcome_enabled è false');
  } else {
    issues.push('DB: record Guild non trovato!');
  }

  // ============================================
  // 8. SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('  RIEPILOGO PROBLEMI');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('\n  Nessun problema trovato!\n');
  } else {
    console.log(`\n  ${issues.length} problemi trovati:\n`);
    for (let i = 0; i < issues.length; i++) {
      console.log(`  ${i + 1}. ${issues[i]}`);
    }
    console.log('');
  }

  await client.destroy();
  process.exit(0);
}

audit().catch(err => { console.error('Audit failed:', err); process.exit(1); });
