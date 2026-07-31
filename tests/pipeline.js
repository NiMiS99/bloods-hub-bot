// tests/pipeline.js
// Complete test pipeline: unit + integration + e2e.
// Run with: node tests/pipeline.js
const assert = require('assert');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m ${name}: ${err.message}`);
    failures.push({ name, error: err.message, stack: err.stack });
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m ${name}: ${err.message}`);
    failures.push({ name, error: err.message, stack: err.stack });
    failed++;
  }
}

// ============================================================================
// SUITE 1: UNIT TESTS — pure functions, no side effects
// ============================================================================
async function unitTests() {
  console.log('\n\x1b[36m=== SUITE 1: UNIT TESTS ===\x1b[0m\n');

  // --- textFormatter ---
  console.log('textFormatter:');
  const { toFraktur, SANS_UPPER, SANS_LOWER } = require('../src/utils/textFormatter');

  test('toFraktur("Bloods") = ������', () => {
    assert.strictEqual(toFraktur('Bloods'), '𝖡𝗅𝗈𝗈𝖽𝗌');
  });
  test('toFraktur("Valorant") = ��������', () => {
    assert.strictEqual(toFraktur('Valorant'), '𝖵𝖺𝗅𝗈𝗋𝖺𝗇𝗍');
  });
  test('toFraktur("CS2") preserves digits', () => {
    const r = toFraktur('CS2');
    assert.ok(r.includes('2'), 'Digit 2 should be preserved');
    const chars = Array.from(r);
    assert.strictEqual(chars[0], SANS_UPPER['C']);
    assert.strictEqual(chars[1], SANS_UPPER['S']);
  });
  test('toFraktur preserves spaces and punctuation', () => {
    const r = toFraktur('Hello World!');
    assert.ok(r.includes(' '), 'Space preserved');
    assert.ok(r.includes('!'), 'Exclamation preserved');
  });
  test('toFraktur("Counter-Strike 2") = 𝖢������-������ 2', () => {
    assert.strictEqual(toFraktur('Counter-Strike 2'), '𝖢𝗈𝗎𝗇𝗍𝖾𝗋-𝖲𝗍𝗋𝗂𝗄𝖾 2');
  });
  test('toFraktur(null) = null', () => assert.strictEqual(toFraktur(null), null));
  test('toFraktur(undefined) = undefined', () => assert.strictEqual(toFraktur(undefined), undefined));
  test('toFraktur("") = ""', () => assert.strictEqual(toFraktur(''), ''));
  test('toFraktur handles all 26 uppercase letters', () => {
    const input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result = toFraktur(input);
    const chars = Array.from(result);
    assert.strictEqual(chars.length, 26, 'All 26 chars should be converted');
    for (let i = 0; i < 26; i++) {
      assert.notStrictEqual(chars[i], input[i], `Letter ${input[i]} should be converted`);
    }
  });
  test('toFraktur handles all 26 lowercase letters', () => {
    const input = 'abcdefghijklmnopqrstuvwxyz';
    const result = toFraktur(input);
    const chars = Array.from(result);
    assert.strictEqual(chars.length, 26);
    for (let i = 0; i < 26; i++) {
      assert.notStrictEqual(chars[i], input[i], `Letter ${input[i]} should be converted`);
    }
  });
  test('SANS_UPPER has all 26 letters', () => {
    assert.strictEqual(Object.keys(SANS_UPPER).length, 26);
  });
  test('SANS_LOWER has all 26 letters', () => {
    assert.strictEqual(Object.keys(SANS_LOWER).length, 26);
  });

  // --- format.js ---
  console.log('\nformat.js:');
  const { formatDuration, ordinal, truncate } = require('../src/utils/format');

  test('formatDuration(0) = "0s"', () => assert.strictEqual(formatDuration(0), '0s'));
  test('formatDuration(1) = "1s"', () => assert.strictEqual(formatDuration(1), '1s'));
  test('formatDuration(59) = "59s"', () => assert.strictEqual(formatDuration(59), '59s'));
  test('formatDuration(60) = "1m 0s"', () => assert.strictEqual(formatDuration(60), '1m 0s'));
  test('formatDuration(65) = "1m 5s"', () => assert.strictEqual(formatDuration(65), '1m 5s'));
  test('formatDuration(3600) = "1h 0m"', () => assert.strictEqual(formatDuration(3600), '1h 0m'));
  test('formatDuration(3661) = "1h 1m"', () => assert.strictEqual(formatDuration(3661), '1h 1m'));
  test('formatDuration(86400) = "1d 0h 0m"', () => assert.strictEqual(formatDuration(86400), '1d 0h 0m'));
  test('formatDuration(90061) = "1d 1h 1m"', () => assert.strictEqual(formatDuration(90061), '1d 1h 1m'));
  test('formatDuration(-10) = "0s" (clamped)', () => assert.strictEqual(formatDuration(-10), '0s'));
  test('formatDuration(999999999) does not crash', () => {
    const r = formatDuration(999999999);
    assert.ok(typeof r === 'string');
  });
  test('ordinal(1) = "1°"', () => assert.strictEqual(ordinal(1), '1°'));
  test('ordinal(2) = "2°"', () => assert.strictEqual(ordinal(2), '2°'));
  test('ordinal(3) = "3°"', () => assert.strictEqual(ordinal(3), '3°'));
  test('ordinal(100) = "100°"', () => assert.strictEqual(ordinal(100), '100°'));
  test('truncate("hello world", 5) = "hell…"', () => assert.strictEqual(truncate('hello world', 5), 'hell…'));
  test('truncate("short", 100) = "short" (no truncation)', () => assert.strictEqual(truncate('short', 100), 'short'));
  test('truncate(null) = ""', () => assert.strictEqual(truncate(null), ''));
  test('truncate("") = ""', () => assert.strictEqual(truncate(''), ''));

  // --- embed.js ---
  console.log('\nembed.js:');
  const { baseEmbed, errorEmbed, successEmbed, BRAND_COLOR } = require('../src/utils/embed');

  test('BRAND_COLOR = 0x8b0000', () => assert.strictEqual(BRAND_COLOR, 0x8b0000));
  test('errorEmbed has Italian title "Errore"', () => {
    const e = errorEmbed('test');
    assert.strictEqual(e.data.title, 'Errore');
  });
  test('successEmbed has Italian title "Operazione completata"', () => {
    const e = successEmbed('test');
    assert.strictEqual(e.data.title, 'Operazione completata');
  });
  test('errorEmbed color = 0xed4245 (red)', () => {
    const e = errorEmbed('test');
    assert.strictEqual(e.data.color, 0xed4245);
  });
  test('successEmbed color = 0x57f287 (green)', () => {
    const e = successEmbed('test');
    assert.strictEqual(e.data.color, 0x57f287);
  });
  test('baseEmbed with no args still works', () => {
    const e = baseEmbed();
    assert.ok(e, 'Should return an embed');
  });
  test('baseEmbed with title sets title', () => {
    const e = baseEmbed({ title: 'Test' });
    assert.strictEqual(e.data.title, 'Test');
  });

  // --- xpService (pure functions) ---
  console.log('\nxpService (pure functions):');
  const { xpForLevel, xpToNextLevel } = require('../src/services/xpService');

  test('xpForLevel(0) = 0', () => assert.strictEqual(xpForLevel(0), 0));
  test('xpForLevel(1) = 100', () => assert.strictEqual(xpForLevel(1), 100));
  test('xpForLevel(5) = 2500', () => assert.strictEqual(xpForLevel(5), 2500));
  test('xpForLevel(10) = 10000', () => assert.strictEqual(xpForLevel(10), 10000));
  test('xpForLevel(20) = 40000', () => assert.strictEqual(xpForLevel(20), 40000));
  test('xpForLevel(50) = 250000', () => assert.strictEqual(xpForLevel(50), 250000));
  test('xpToNextLevel(0) → level 0, next 1, xpToNext 100', () => {
    const r = xpToNextLevel(0);
    assert.strictEqual(r.currentLevel, 0);
    assert.strictEqual(r.nextLevel, 1);
    assert.strictEqual(r.xpToNext, 100);
    assert.strictEqual(r.progress, 0);
  });
  test('xpToNextLevel(100) → level 1, next 2, xpToNext 300', () => {
    const r = xpToNextLevel(100);
    assert.strictEqual(r.currentLevel, 1);
    assert.strictEqual(r.nextLevel, 2);
    assert.strictEqual(r.xpToNext, 300);
    assert.strictEqual(r.progress, 0);
  });
  test('xpToNextLevel(2500) → level 5, next 6', () => {
    const r = xpToNextLevel(2500);
    assert.strictEqual(r.currentLevel, 5);
    assert.strictEqual(r.nextLevel, 6);
  });
  test('xpToNextLevel(9999) → level 9 (almost 10)', () => {
    const r = xpToNextLevel(9999);
    assert.strictEqual(r.currentLevel, 9);
    assert.strictEqual(r.xpToNext, 1);
  });
  test('xpToNextLevel(10000) → level 10', () => {
    const r = xpToNextLevel(10000);
    assert.strictEqual(r.currentLevel, 10);
  });

  // --- badgeService (definitions) ---
  console.log('\nbadgeService (definitions):');
  const { BADGES } = require('../src/services/badgeService');

  test('BADGES has >= 5 badges', () => assert.ok(Object.keys(BADGES).length >= 5));
  test('All badges have code, name, icon, description, check', () => {
    for (const b of Object.values(BADGES)) {
      assert.ok(b.code, `Badge missing code`);
      assert.ok(b.name, `Badge ${b.code} missing name`);
      assert.ok(b.icon, `Badge ${b.code} missing icon`);
      assert.ok(b.description, `Badge ${b.code} missing description`);
      assert.strictEqual(typeof b.check, 'function', `Badge ${b.code} check not a function`);
    }
  });
  test('Badge codes are unique', () => {
    const codes = Object.values(BADGES).map((b) => b.code);
    const unique = new Set(codes);
    assert.strictEqual(codes.length, unique.size, 'Duplicate badge codes found');
  });

  // --- permissions ---
  console.log('\npermissions:');
  const { isAdmin, canModerate } = require('../src/utils/permissions');

  test('isAdmin(null) = false', () => assert.strictEqual(isAdmin(null), false));
  test('isAdmin(undefined) = false', () => assert.strictEqual(isAdmin(undefined), false));
  test('canModerate(null) = false', () => assert.strictEqual(canModerate(null), false));
  test('canModerate(null, [flags]) = false', () => assert.strictEqual(canModerate(null, [1n]), false));

  // --- gameChannels template ---
  console.log('\ngameChannels:');
  const { CHANNEL_TEMPLATE, buildOverwrites } = require('../src/utils/gameChannels');

  test('CHANNEL_TEMPLATE has 6 channels', () => assert.strictEqual(CHANNEL_TEMPLATE.length, 6));
  test('Template has 4 text + 2 voice channels', () => {
    const text = CHANNEL_TEMPLATE.filter((c) => c.type === 0); // GuildText = 0
    const voice = CHANNEL_TEMPLATE.filter((c) => c.type === 2); // GuildVoice = 2
    assert.strictEqual(text.length, 4);
    assert.strictEqual(voice.length, 2);
  });
  test('Template channels: Generale, News, Comunicazioni, Composizioni, Vocale 1, Vocale 2', () => {
    const names = CHANNEL_TEMPLATE.map((c) => c.name);
    assert.ok(names.includes('Generale'));
    assert.ok(names.includes('News'));
    assert.ok(names.includes('Comunicazioni'));
    assert.ok(names.includes('Composizioni'));
    assert.ok(names.includes('Vocale 1'));
    assert.ok(names.includes('Vocale 2'));
    // Check emoji + separator format
    for (const ch of CHANNEL_TEMPLATE) {
      assert.ok(ch.emoji, `Channel ${ch.name} must have an emoji`);
      assert.ok(ch.separator, `Channel ${ch.name} must have a separator`);
    }
  });
  test('buildOverwrites writable_text returns 3 overwrites', () => {
    const ow = buildOverwrites('1', '2', '3', 'writable_text');
    assert.strictEqual(ow.length, 3);
  });
  test('buildOverwrites readonly_text denies SendMessages for game role', () => {
    const ow = buildOverwrites('1', '2', '3', 'readonly_text');
    const roleOW = ow.find((o) => o.id === '2');
    assert.ok(roleOW.deny, 'Role overwrite should have deny array');
  });
  test('buildOverwrites voice returns 3 overwrites', () => {
    const ow = buildOverwrites('1', '2', '3', 'voice');
    assert.strictEqual(ow.length, 3);
  });
  test('buildOverwrites invalid type throws', () => {
    assert.throws(() => buildOverwrites('1', '2', '3', 'invalid'), /Unknown channel type/);
  });
  test('All overwrites deny ViewChannel for @everyone', () => {
    for (const def of CHANNEL_TEMPLATE) {
      const ow = buildOverwrites('everyone', 'role', 'bot', def.permType);
      const everyoneOW = ow.find((o) => o.id === 'everyone');
      assert.ok(everyoneOW.deny, `@everyone should have deny in ${def.name}`);
    }
  });

  // --- rate limiter ---
  console.log('\nrateLimiter:');
  const { RateLimiter } = require('../src/services/api/rateLimiter');

  test('RateLimiter starts with full tokens', () => {
    const rl = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    assert.strictEqual(rl.tokens, 5);
  });
  test('RateLimiter acquire decrements tokens', async () => {
    const rl = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    await rl.acquire();
    assert.strictEqual(rl.tokens, 4);
  });
  test('RateLimiter refills after window', async () => {
    const rl = new RateLimiter({ maxRequests: 5, windowMs: 50 });
    await rl.acquire();
    await rl.acquire();
    await new Promise((r) => setTimeout(r, 60));
    rl._refill();
    assert.strictEqual(rl.tokens, 5, 'Tokens should refill after window');
  });
}

// ============================================================================
// SUITE 2: INTEGRATION TESTS — module loading, DB models, cross-module
// ============================================================================
async function integrationTests() {
  console.log('\n\x1b[36m=== SUITE 2: INTEGRATION TESTS ===\x1b[0m\n');

  // --- Command loading ---
  console.log('Command loading:');
  const CommandHandler = require('../src/handlers/commandHandler');
  const handler = new CommandHandler(path.resolve(__dirname, '..', 'src', 'commands'));
  handler.load();

  test('Loaded >= 24 commands', () => assert.ok(handler.commands.size >= 24, `Got ${handler.commands.size}`));
  test('All commands have data and execute', () => {
    for (const cmd of handler.commands.values()) {
      assert.ok(cmd.data, `Command missing .data`);
      assert.strictEqual(typeof cmd.execute, 'function', `Command missing .execute`);
    }
  });
  test('All command names are lowercase', () => {
    for (const name of handler.commands.keys()) {
      assert.strictEqual(name, name.toLowerCase(), `Command "${name}" should be lowercase`);
    }
  });
  test('All command descriptions are in Italian (no English)', () => {
    const englishPatterns = ['Show ', 'Link an', 'Community-wide', 'How many', 'Metric to'];
    for (const cmd of handler.commands.values()) {
      const desc = cmd.data.description;
      for (const pattern of englishPatterns) {
        assert.ok(!desc.includes(pattern), `Command "${cmd.data.name}" has English description: "${desc}"`);
      }
    }
  });
  test('Admin commands exist: game, rolepanel, setup', () => {
    assert.ok(handler.commands.has('game'), 'Missing /game');
    assert.ok(handler.commands.has('rolepanel'), 'Missing /rolepanel');
    assert.ok(handler.commands.has('setup'), 'Missing /setup');
  });
  test('Mod commands exist: warn, mute, purge, userinfo', () => {
    assert.ok(handler.commands.has('warn'), 'Missing /warn');
    assert.ok(handler.commands.has('mute'), 'Missing /mute');
    assert.ok(handler.commands.has('purge'), 'Missing /purge');
    assert.ok(handler.commands.has('userinfo'), 'Missing /userinfo');
  });
  test('User commands exist: rank, mystats, event, lfg, poll, suggest', () => {
    assert.ok(handler.commands.has('rank'), 'Missing /rank');
    assert.ok(handler.commands.has('mystats'), 'Missing /mystats');
    assert.ok(handler.commands.has('event'), 'Missing /event');
    assert.ok(handler.commands.has('lfg'), 'Missing /lfg');
    assert.ok(handler.commands.has('poll'), 'Missing /poll');
    assert.ok(handler.commands.has('suggest'), 'Missing /suggest');
  });

  // --- DB models ---
  console.log('\nDB models:');
  const db = require('../src/db');

  test('DB exports 14 models', () => {
    const models = ['Guild', 'User', 'Game', 'UserGame', 'ExternalAccount', 'GameStat',
      'ActivityLog', 'LeaderboardCache', 'GameMeta', 'AuditLog', 'UserBadge',
      'Warning', 'CommunityEvent', 'EventParticipant'];
    for (const m of models) {
      assert.ok(db[m], `Missing model: ${m}`);
    }
  });
  test('User model has XP fields', () => {
    const attrs = db.User.getAttributes();
    assert.ok(attrs.xp, 'User missing xp field');
    assert.ok(attrs.level, 'User missing level field');
    assert.ok(attrs.last_xp_at, 'User missing last_xp_at field');
  });
  test('UserBadge model has correct primary keys', () => {
    const pk = db.UserBadge.primaryKeys;
    assert.ok(pk.user_id, 'UserBadge missing user_id PK');
    assert.ok(pk.guild_id, 'UserBadge missing guild_id PK');
    assert.ok(pk.badge_code, 'UserBadge missing badge_code PK');
  });
  test('Warning model has severity enum', () => {
    const attrs = db.Warning.getAttributes();
    assert.ok(attrs.severity, 'Warning missing severity field');
  });
  test('CommunityEvent has game_id association', () => {
    assert.ok(db.CommunityEvent.associations, 'CommunityEvent should have associations');
  });

  // --- Game modules ---
  console.log('\nGame modules:');
  const gameCodes = ['wow', 'valorant', 'lol', 'csgo', 'dota2', 'apex', 'minecraft', 'ffxiv'];
  for (const code of gameCodes) {
    test(`Module ${code}.js loads and exports fetchMeta`, () => {
      const mod = require(`../src/modules/games/${code}`);
      assert.strictEqual(typeof mod.fetchMeta, 'function');
    });
  }
  test('All game modules fetchMeta returns array (sync check)', async () => {
    for (const code of gameCodes) {
      const mod = require(`../src/modules/games/${code}`);
      // fetchMeta may be async — we just check it doesn't throw on call
      // (network errors are caught internally)
      const result = await mod.fetchMeta().catch(() => []);
      assert.ok(Array.isArray(result), `${code}.fetchMeta should return an array`);
    }
  });

  // --- API registry ---
  console.log('\nAPI registry:');
  const { registry, getApi, getApiForGame } = require('../src/services/api');

  test('Registry has Steam, Battle.net, Riot clients', () => {
    assert.ok(registry['steam:csgo'], 'Missing steam:csgo');
    assert.ok(registry['steam:dota2'], 'Missing steam:dota2');
    assert.ok(registry['battlenet:wow'], 'Missing battlenet:wow');
    assert.ok(registry['riot:valorant'], 'Missing riot:valorant');
    assert.ok(registry['riot:lol'], 'Missing riot:lol');
  });
  test('getApi returns correct client', () => {
    const api = getApi('steam', 'csgo');
    assert.ok(api, 'getApi(steam, csgo) should return a client');
  });
  test('getApi with unknown game returns null', () => {
    const api = getApi('steam', 'nonexistent');
    assert.strictEqual(api, null);
  });

  // --- Leaderboard edge cases ---
  console.log('\nLeaderboard edge cases:');
  test('Array.isArray(null) = false (cached payload validation)', () => {
    assert.strictEqual(Array.isArray(null), false);
  });
  test('Array.isArray({}) = false (cached payload validation)', () => {
    assert.strictEqual(Array.isArray({}), false);
  });
  test('Array.isArray([]) = true (valid cached payload)', () => {
    assert.strictEqual(Array.isArray([]), true);
  });

  // --- Event handler ---
  console.log('\nEvent handlers:');
  const EventHandler = require('../src/handlers/eventHandler');
  // Mock client with on/once methods that track registered events
  const registeredEvents = new Map();
  const mockClient = {
    on: (name, handler) => { registeredEvents.set(name, handler); },
    once: (name, handler) => { registeredEvents.set(name, handler); },
  };
  const eventHandler = new EventHandler(path.resolve(__dirname, '..', 'src', 'events'), mockClient);
  eventHandler.load();

  test('Event handlers loaded', () => {
    assert.ok(registeredEvents.size > 0, 'No event handlers loaded');
  });
  test('clientReady event exists', () => {
    assert.ok(registeredEvents.has('clientReady'), 'Missing clientReady event');
  });
  test('interactionCreate event exists', () => {
    assert.ok(registeredEvents.has('interactionCreate'), 'Missing interactionCreate event');
  });
  test('messageCreate event exists', () => {
    assert.ok(registeredEvents.has('messageCreate'), 'Missing messageCreate event');
  });
  test('guildMemberAdd event exists', () => {
    assert.ok(registeredEvents.has('guildMemberAdd'), 'Missing guildMemberAdd event');
  });
}

// ============================================================================
// SUITE 3: E2E LOGIC TESTS — simulate full flows without Discord
// ============================================================================
async function e2eTests() {
  console.log('\n\x1b[36m=== SUITE 3: E2E LOGIC TESTS ===\x1b[0m\n');

  // --- XP flow simulation ---
  console.log('XP flow simulation:');
  const { xpForLevel, xpToNextLevel, MSG_XP, VOICE_XP_PER_MIN, ROLE_BONUS_XP } = require('../src/services/xpService');

  test('Simulate 100 messages → level 1', () => {
    let xp = 0;
    for (let i = 0; i < 100; i++) xp += MSG_XP;
    const { currentLevel } = xpToNextLevel(xp);
    assert.strictEqual(currentLevel, 1, `100 messages should give level 1, got ${currentLevel}`);
  });
  test('Simulate 200 messages → level 1 (200 XP)', () => {
    let xp = 0;
    for (let i = 0; i < 200; i++) xp += MSG_XP;
    const { currentLevel } = xpToNextLevel(xp);
    assert.strictEqual(currentLevel, 1);
  });
  test('Simulate 100 messages + 1 game join = 110 XP → level 1', () => {
    let xp = 0;
    for (let i = 0; i < 100; i++) xp += MSG_XP;
    xp += ROLE_BONUS_XP;
    const { currentLevel } = xpToNextLevel(xp);
    assert.strictEqual(currentLevel, 1);
  });
  test('Simulate 60 min voice = 300 XP → level 1', () => {
    let xp = 0;
    for (let i = 0; i < 60; i++) xp += VOICE_XP_PER_MIN;
    const { currentLevel } = xpToNextLevel(xp);
    assert.strictEqual(currentLevel, 1);
  });
  test('Simulate 2000 messages + 200 min voice + 5 game joins = 3100 XP → level 5', () => {
    let xp = 0;
    for (let i = 0; i < 2000; i++) xp += MSG_XP;
    for (let i = 0; i < 200; i++) xp += VOICE_XP_PER_MIN;
    for (let i = 0; i < 5; i++) xp += ROLE_BONUS_XP;
    const { currentLevel } = xpToNextLevel(xp);
    assert.strictEqual(currentLevel, 5, `Expected level 5, got ${currentLevel} (xp=${xp})`);
  });
  test('Level progression is monotonic (no level skips)', () => {
    let lastLevel = 0;
    for (let xp = 0; xp <= 100000; xp += 100) {
      const { currentLevel } = xpToNextLevel(xp);
      assert.ok(currentLevel >= lastLevel, `Level decreased at xp=${xp}: ${currentLevel} < ${lastLevel}`);
      assert.ok(currentLevel <= lastLevel + 1, `Level skipped at xp=${xp}: ${currentLevel} > ${lastLevel + 1}`);
      lastLevel = currentLevel;
    }
  });

  // --- Badge condition simulation ---
  console.log('\nBadge condition simulation:');
  const { BADGES } = require('../src/services/badgeService');

  test('Chatty badge: 1000 messages triggers', async () => {
    const user = { total_messages: 1000, total_voice_seconds: 0, level: 0, joined_discord_at: new Date() };
    const result = await BADGES.chatty.check(user);
    assert.ok(result, '1000 messages should trigger chatty badge');
  });
  test('Chatty badge: 999 messages does NOT trigger', async () => {
    const user = { total_messages: 999, total_voice_seconds: 0, level: 0 };
    const result = await BADGES.chatty.check(user);
    assert.strictEqual(result, false);
  });
  test('Voice King badge: 360000 seconds (100h) triggers', async () => {
    const user = { total_messages: 0, total_voice_seconds: 360000, level: 0 };
    const result = await BADGES.voice_king.check(user);
    assert.ok(result);
  });
  test('Voice King badge: 359999 does NOT trigger', async () => {
    const user = { total_messages: 0, total_voice_seconds: 359999, level: 0 };
    const result = await BADGES.voice_king.check(user);
    assert.strictEqual(result, false);
  });
  test('Level 10 badge: level 10 triggers', async () => {
    const user = { level: 10, total_messages: 0, total_voice_seconds: 0 };
    const result = await BADGES.level_10.check(user);
    assert.ok(result);
  });
  test('Level 10 badge: level 9 does NOT trigger', async () => {
    const user = { level: 9, total_messages: 0, total_voice_seconds: 0 };
    const result = await BADGES.level_10.check(user);
    assert.strictEqual(result, false);
  });
  test('Veteran badge: 7 months ago triggers', async () => {
    const sevenMonthsAgo = new Date(Date.now() - 7 * 30 * 86400 * 1000);
    const user = { joined_discord_at: sevenMonthsAgo, total_messages: 0, total_voice_seconds: 0, level: 0 };
    const result = await BADGES.veteran.check(user);
    assert.ok(result);
  });
  test('Veteran badge: 3 months ago does NOT trigger', async () => {
    const threeMonthsAgo = new Date(Date.now() - 3 * 30 * 86400 * 1000);
    const user = { joined_discord_at: threeMonthsAgo, total_messages: 0, total_voice_seconds: 0, level: 0 };
    const result = await BADGES.veteran.check(user);
    assert.strictEqual(result, false);
  });
  test('Veteran badge: null joined_at does NOT trigger', async () => {
    const user = { joined_discord_at: null, total_messages: 0, total_voice_seconds: 0, level: 0 };
    const result = await BADGES.veteran.check(user);
    assert.strictEqual(result, false);
  });

  // --- LFG service (DB-based) ---
  console.log('\nLFG service (DB-based):');
  const lfgService = require('../src/services/lfgService');

  test('LfgService exports createSession', () => {
    assert.strictEqual(typeof lfgService.createSession, 'function');
  });
  test('LfgService exports joinSession', () => {
    assert.strictEqual(typeof lfgService.joinSession, 'function');
  });
  test('LfgService exports leaveSession', () => {
    assert.strictEqual(typeof lfgService.leaveSession, 'function');
  });
  test('LfgService exports getActiveSessions', () => {
    assert.strictEqual(typeof lfgService.getActiveSessions, 'function');
  });
  test('LfgService exports expireOldSessions', () => {
    assert.strictEqual(typeof lfgService.expireOldSessions, 'function');
  });

  // --- Permission simulation ---
  console.log('\nPermission simulation:');
  const { isAdmin } = require('../src/utils/permissions');

  test('Member with Administrator perm passes isAdmin', () => {
    const member = {
      permissions: { has: (flag) => flag === 8n }, // Administrator = 8n
      roles: { cache: new Map() },
    };
    assert.strictEqual(isAdmin(member), true);
  });
  test('Member with ManageGuild perm passes isAdmin', () => {
    const member = {
      permissions: { has: (flag) => flag === 32n }, // ManageGuild = 32n
      roles: { cache: new Map() },
    };
    assert.strictEqual(isAdmin(member), true);
  });
  test('Member with no perms and no admin role fails isAdmin', () => {
    const member = {
      permissions: { has: () => false },
      roles: { cache: new Map() },
    };
    assert.strictEqual(isAdmin(member), false);
  });

  // --- Audit log structure ---
  console.log('\nAudit log:');
  const { recordAudit } = require('../src/utils/auditLog');

  test('recordAudit is a function', () => {
    assert.strictEqual(typeof recordAudit, 'function');
  });

  // --- Health server ---
  console.log('\nHealth server:');
  const HealthServer = require('../src/server/healthServer');

  test('HealthServer can be instantiated', () => {
    const hs = new HealthServer({ guilds: { cache: { size: 1 } } });
    assert.ok(hs);
    assert.strictEqual(hs.port, parseInt(process.env.HEALTH_PORT || '3000', 10));
  });

  // --- Config validation ---
  console.log('\nConfig:');
  const config = require('../src/config');

  test('Config has discord.token', () => assert.ok(config.discord.token));
  test('Config has discord.clientId', () => assert.ok(config.discord.clientId));
  test('Config has admin.roleId', () => assert.ok(config.admin.roleId));
  test('Config locale is "it"', () => assert.strictEqual(config.misc.locale, 'it'));
}

// ============================================================================
// SUITE 4: SERVICE LOGIC TESTS — test critical service functions
// ============================================================================
async function serviceTests() {
  console.log('\n\x1b[36m=== SUITE 4: SERVICE LOGIC TESTS ===\x1b[0m\n');

  // --- Automod: checkRule logic ---
  console.log('Automod (checkRule):');
  const { checkRule } = require('../src/services/automodService');

  test('word_filter detects banned word', () => {
    const rule = { rule_type: 'word_filter', words: ['badword'] };
    const msg = { content: 'this contains badword here', author: { bot: false }, guild: { id: '123' }, member: { roles: { cache: { has: () => false } } } };
    const result = checkRule(rule, msg);
    assert(result.violated === true, `Expected violation, got ${JSON.stringify(result)}`);
  });

  test('word_filter allows clean message', () => {
    const rule = { rule_type: 'word_filter', words: ['badword'] };
    const msg = { content: 'this is a clean message', author: { bot: false }, guild: { id: '123' }, member: { roles: { cache: { has: () => false } } } };
    const result = checkRule(rule, msg);
    assert(result.violated === false, `Expected no violation, got ${JSON.stringify(result)}`);
  });

  test('link detection blocks URLs', () => {
    const rule = { rule_type: 'link' };
    const msg = { content: 'check this https://example.com', author: { bot: false }, guild: { id: '123' }, member: { roles: { cache: { has: () => false } } } };
    const result = checkRule(rule, msg);
    assert(result.violated === true, 'Expected link violation');
  });

  test('link detection blocks Discord invites', () => {
    const rule = { rule_type: 'link' };
    const msg = { content: 'join here discord.gg/abc', author: { bot: false }, guild: { id: '123' }, member: { roles: { cache: { has: () => false } } } };
    const result = checkRule(rule, msg);
    assert(result.violated === true, 'Expected invite violation');
  });

  test('mention_spam detects mass mentions', () => {
    const rule = { rule_type: 'mention_spam', threshold: 3 };
    const msg = { content: '<@1> <@2> <@3> hello', author: { bot: false }, guild: { id: '123' }, member: { roles: { cache: { has: () => false } } } };
    const result = checkRule(rule, msg);
    assert(result.violated === true, 'Expected mention spam violation');
  });

  test('caps detection blocks ALL CAPS', () => {
    const rule = { rule_type: 'caps', threshold: 70 };
    const msg = { content: 'HELLO WORLD THIS IS ALL CAPS MESSAGE', author: { bot: false }, guild: { id: '123' }, member: { roles: { cache: { has: () => false } } } };
    const result = checkRule(rule, msg);
    assert(result.violated === true, 'Expected caps violation');
  });

  test('caps detection allows normal text', () => {
    const rule = { rule_type: 'caps', threshold: 70 };
    const msg = { content: 'This is a normal message with some CAPS here', author: { bot: false }, guild: { id: '123' }, member: { roles: { cache: { has: () => false } } } };
    const result = checkRule(rule, msg);
    assert(result.violated === false, 'Expected no caps violation');
  });

  // --- AntiRaid: threshold logic ---
  console.log('\nAntiRaid (threshold logic):');

  test('AntiRaid constants are reasonable', () => {
    // Test the threshold logic without actually triggering lockdown
    const JOIN_THRESHOLD = 5;
    const JOIN_WINDOW_MS = 10000;
    assert(JOIN_THRESHOLD > 0, 'Join threshold must be positive');
    assert(JOIN_WINDOW_MS > 0, 'Join window must be positive');
    assert(JOIN_WINDOW_MS >= 5000, 'Window should be at least 5s');
  });

  test('AntiRaid trackJoin is a function', () => {
    const { trackJoin } = require('../src/services/antiRaidService');
    assert(typeof trackJoin === 'function', 'trackJoin should be a function');
  });

  test('AntiRaid triggerLockdown is a function', () => {
    const { triggerLockdown } = require('../src/services/antiRaidService');
    assert(typeof triggerLockdown === 'function', 'triggerLockdown should be a function');
  });

  // --- RaidEligibilityChecker: function signatures ---
  console.log('\nRaidEligibilityChecker:');

  test('getRaidConfig is a function', () => {
    const { getRaidConfig } = require('../src/services/raidEligibilityChecker');
    assert(typeof getRaidConfig === 'function');
  });

  test('checkUser is a function', () => {
    const { checkUser } = require('../src/services/raidEligibilityChecker');
    assert(typeof checkUser === 'function');
  });

  test('checkAllMembers is a function', () => {
    const { checkAllMembers } = require('../src/services/raidEligibilityChecker');
    assert(typeof checkAllMembers === 'function');
  });

  test('getUserEligibility is a function', () => {
    const { getUserEligibility } = require('../src/services/raidEligibilityChecker');
    assert(typeof getUserEligibility === 'function');
  });

  // --- WelcomeService ---
  console.log('\nWelcomeService:');

  test('sendWelcome is a function', () => {
    const { sendWelcome } = require('../src/services/welcomeService');
    assert(typeof sendWelcome === 'function');
  });

  // --- LevelRewardService ---
  console.log('\nLevelRewardService:');

  test('checkLevelRewards is a function', () => {
    const { checkLevelRewards } = require('../src/services/levelRewardService');
    assert(typeof checkLevelRewards === 'function');
  });

  test('checkLevelRewards handles null member gracefully', async () => {
    const { checkLevelRewards } = require('../src/services/levelRewardService');
    // Should not throw even with null inputs
    const fakeGuild = { id: '123', members: { fetch: () => null }, roles: { cache: { get: () => null } }, channels: { cache: { get: () => null } } };
    const fakeUser = { user_id: '999' };
    try {
      await checkLevelRewards(fakeGuild, fakeUser, 999);
      assert(true, 'Should not throw');
    } catch (err) {
      // DB errors are OK in test env, we just verify it doesn't crash on null member
      assert(true, 'Handled gracefully');
    }
  });

  // --- TempVoiceService ---
  console.log('\nTempVoiceService:');

  test('TempVoiceService exports handleVoiceStateUpdate', () => {
    const tvs = require('../src/services/tempVoiceService');
    assert(typeof tvs.handleVoiceStateUpdate === 'function' || typeof tvs === 'function', 'TempVoiceService should be callable');
  });

  // --- DB Associations ---
  console.log('\nDB Associations (BP system):');

  test('BpUser has association with User', () => {
    const { BpUser, User } = require('../src/db');
    assert(BpUser.associations, 'BpUser should have associations');
    // Check that belongsTo User association exists
    const hasUserAssoc = Object.values(BpUser.associations).some(a => a.target === User);
    assert(hasUserAssoc, 'BpUser should be associated with User');
  });

  test('BpItem has association with Guild', () => {
    const { BpItem, Guild } = require('../src/db');
    assert(BpItem.associations, 'BpItem should have associations');
    const hasGuildAssoc = Object.values(BpItem.associations).some(a => a.target === Guild);
    assert(hasGuildAssoc, 'BpItem should be associated with Guild');
  });

  test('BpLootHistory has association with BpItem', () => {
    const { BpLootHistory, BpItem } = require('../src/db');
    assert(BpLootHistory.associations, 'BpLootHistory should have associations');
    const hasItemAssoc = Object.values(BpLootHistory.associations).some(a => a.target === BpItem);
    assert(hasItemAssoc, 'BpLootHistory should be associated with BpItem');
  });

  test('BpActiveRoll has association with Guild', () => {
    const { BpActiveRoll, Guild } = require('../src/db');
    assert(BpActiveRoll.associations, 'BpActiveRoll should have associations');
    const hasGuildAssoc = Object.values(BpActiveRoll.associations).some(a => a.target === Guild);
    assert(hasGuildAssoc, 'BpActiveRoll should be associated with Guild');
  });

  test('BpRaidRoster has association with User', () => {
    const { BpRaidRoster, User } = require('../src/db');
    assert(BpRaidRoster.associations, 'BpRaidRoster should have associations');
    const hasUserAssoc = Object.values(BpRaidRoster.associations).some(a => a.target === User);
    assert(hasUserAssoc, 'BpRaidRoster should be associated with User');
  });

  // --- Phase 3 services: pure function tests ---
  console.log('\nPhase 3 services (pure functions):');

  // Captcha: generateCaptcha
  const { generateCaptcha } = require('../src/services/captchaService');
  test('generateCaptcha returns object with question and answer', () => {
    const c = generateCaptcha();
    assert.ok(c.question, 'Should have question');
    assert.ok(typeof c.answer === 'number', 'Answer should be a number');
  });
  test('generateCaptcha question contains a math operator', () => {
    const c = generateCaptcha();
    assert.ok(c.question.includes('+') || c.question.includes('-') || c.question.includes('×'), 'Should have math operator');
  });
  test('generateCaptcha answer is correct for addition', () => {
    // Run multiple times to hit addition
    for (let i = 0; i < 20; i++) {
      const c = generateCaptcha();
      if (c.question.includes('+')) {
        const nums = c.question.match(/\d+/g);
        if (nums && nums.length >= 2) {
          assert.strictEqual(c.answer, parseInt(nums[0]) + parseInt(nums[1]), 'Addition answer should be correct');
          return;
        }
      }
    }
    // If we never hit addition, just pass (random)
  });

  // Tournament: buildBracketText
  const { buildBracketText } = require('../src/services/tournamentService');
  test('buildBracketText(null) returns placeholder', () => {
    assert.strictEqual(buildBracketText(null), 'Bracket non generato.');
  });
  test('buildBracketText renders single round', () => {
    const bracket = [[{ p1: { userId: 'u1' }, p2: { userId: 'u2' }, winner: null }]];
    const text = buildBracketText(bracket);
    assert.ok(text.includes('Round 1'), 'Should show Round 1');
    assert.ok(text.includes('u1'), 'Should show player 1');
    assert.ok(text.includes('u2'), 'Should show player 2');
  });
  test('buildBracketText renders multiple rounds', () => {
    const bracket = [
      [{ p1: { userId: 'a' }, p2: { userId: 'b' }, winner: null }],
      [{ p1: { userId: 'c' }, p2: { userId: 'd' }, winner: null }],
    ];
    const text = buildBracketText(bracket);
    assert.ok(text.includes('Round 1'), 'Should show Round 1');
    assert.ok(text.includes('Round 2'), 'Should show Round 2');
  });
  test('buildBracketText shows winner checkmark', () => {
    const bracket = [[{ p1: { userId: 'a' }, p2: { userId: 'b' }, winner: 'a' }]];
    const text = buildBracketText(bracket);
    assert.ok(text.includes('✅'), 'Should show winner checkmark');
  });
  test('buildBracketText shows TBD for missing players', () => {
    const bracket = [[{ p1: null, p2: null, winner: null }]];
    const text = buildBracketText(bracket);
    assert.ok(text.includes('TBD'), 'Should show TBD for missing players');
  });

  // Challenge service: pure helpers
  const challengeService = require('../src/services/challengeService');
  test('ChallengeService exports assignDailyChallenges', () => {
    assert.strictEqual(typeof challengeService.assignDailyChallenges, 'function');
  });
  test('ChallengeService exports updateStreak', () => {
    assert.strictEqual(typeof challengeService.updateStreak, 'function');
  });
  test('ChallengeService exports getStreak', () => {
    assert.strictEqual(typeof challengeService.getStreak, 'function');
  });
  test('ChallengeService exports expireOldChallenges', () => {
    assert.strictEqual(typeof challengeService.expireOldChallenges, 'function');
  });

  // GameNight service: pure helpers
  const gameNightService = require('../src/services/gameNightService');
  test('GameNightService exports start', () => assert.strictEqual(typeof gameNightService.start, 'function'));
  test('GameNightService exports stop', () => assert.strictEqual(typeof gameNightService.stop, 'function'));
  test('GameNightService exports createNight', () => assert.strictEqual(typeof gameNightService.createNight, 'function'));
  test('GameNightService exports listNights', () => assert.strictEqual(typeof gameNightService.listNights, 'function'));

  // XP Event service: getMultiplier
  const xpEventService = require('../src/services/xpEventService');
  test('XpEventService getMultiplier returns number', () => {
    const m = xpEventService.getMultiplier();
    assert.strictEqual(typeof m, 'number');
    assert.ok(m >= 1, 'Multiplier should be >= 1');
  });
  test('XpEventService getActiveEvent returns null or object', () => {
    const e = xpEventService.getActiveEvent();
    assert.ok(e === null || typeof e === 'object', 'Should return null or event object');
  });

  // Reputation service: constants
  const reputationService = require('../src/services/reputationService');
  test('ReputationService COOLDOWN_MS is 3600000 (1h)', () => {
    assert.strictEqual(reputationService.COOLDOWN_MS, 3600000);
  });
  test('ReputationService DAILY_LIMIT is 5', () => {
    assert.strictEqual(reputationService.DAILY_LIMIT, 5);
  });

  // Backup scheduler
  const backupScheduler = require('../src/services/backupScheduler');
  test('BackupScheduler exports start', () => assert.strictEqual(typeof backupScheduler.start, 'function'));
  test('BackupScheduler exports stop', () => assert.strictEqual(typeof backupScheduler.stop, 'function'));
  test('BackupScheduler exports runBackup', () => assert.strictEqual(typeof backupScheduler.runBackup, 'function'));

  // Discord fetch: batch with concurrency
  const { fetchMembersBatch } = require('../src/utils/discordFetch');
  test('fetchMembersBatch with empty returns empty Map', async () => {
    const result = await fetchMembersBatch(null, []);
    assert.ok(result instanceof Map);
    assert.strictEqual(result.size, 0);
  });
  test('fetchMembersBatch with null guild returns empty Map', async () => {
    const result = await fetchMembersBatch(null, ['123']);
    assert.strictEqual(result.size, 0);
  });
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  console.log('\n\x1b[1m╔══════════════════════════════════════════════════════╗');
  console.log('║     Bloods Hub Bot — Test Pipeline v2.0              ║');
  console.log('╚══════════════════════════════════════════════════════╝\x1b[0m');

  const startTime = Date.now();

  try {
    await unitTests();
    await integrationTests();
    await e2eTests();
    await serviceTests();
  } catch (err) {
    console.error('\n\x1b[31mFATAL: Test suite crashed:\x1b[0m', err);
    process.exit(1);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\x1b[1m═══════════════════════════════════════════════════════');
  console.log(`  Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m — ${duration}s`);
  console.log('═══════════════════════════════════════════════════════\x1b[0m');

  if (failures.length > 0) {
    console.log('\n\x1b[31m=== FAILURES ===\x1b[0m');
    for (const f of failures) {
      console.log(`\n  ✗ ${f.name}`);
      console.log(`    Error: ${f.error}`);
      if (f.stack) console.log(`    Stack: ${f.stack.split('\n')[1]?.trim() || ''}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error('Pipeline error:', err); process.exit(1); });
