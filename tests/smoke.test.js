// tests/smoke.test.js
// Smoke tests — verify that all modules load correctly and basic functions work.
const assert = require('assert');
const path = require('path');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== Smoke Tests ===\n');

  // 1. Command loading.
  console.log('Command loading:');
  const CommandHandler = require('../src/handlers/commandHandler');
  const handler = new CommandHandler(path.resolve(__dirname, '..', 'src', 'commands'));
  handler.load();
  test('Commands loaded (>20)', () => assert(handler.commands.size >= 20, `Expected >=20, got ${handler.commands.size}`));
  test('All commands have data and execute', () => {
    for (const cmd of handler.commands.values()) {
      assert(cmd.data, `Command missing .data`);
      assert(typeof cmd.execute === 'function', `Command missing .execute`);
    }
  });

  // 2. toFraktur.
  console.log('\ntoFraktur:');
  const { toFraktur } = require('../src/utils/textFormatter');
  test('toFraktur("Bloods") returns Fraktur', () => {
    const result = toFraktur('Bloods');
    assert(result === '𝔅𝔩𝔬𝔬𝔡𝔰', `Expected "𝔅𝔩𝔬𝔬𝔡𝔰", got "${result}"`);
  });
  test('toFraktur preserves digits and symbols', () => {
    const result = toFraktur('Test123!');
    assert(result.includes('1') && result.includes('2') && result.includes('3') && result.includes('!'), `Digits/symbols not preserved: "${result}"`);
  });
  test('toFraktur(null) returns null', () => {
    assert(toFraktur(null) === null);
  });

  // 3. formatDuration.
  console.log('\nformatDuration:');
  const { formatDuration } = require('../src/utils/format');
  test('formatDuration(0) = "0s"', () => assert(formatDuration(0) === '0s'));
  test('formatDuration(65) = "1m 5s"', () => assert(formatDuration(65) === '1m 5s'));
  test('formatDuration(3661) = "1h 1m"', () => assert(formatDuration(3661) === '1h 1m'));
  test('formatDuration(90061) = "1d 1h 1m"', () => assert(formatDuration(90061) === '1d 1h 1m'));
  test('formatDuration(-10) = "0s"', () => assert(formatDuration(-10) === '0s'));

  // 4. ordinal.
  console.log('\nordinal:');
  const { ordinal } = require('../src/utils/format');
  test('ordinal(1) = "1°"', () => assert(ordinal(1) === '1°'));
  test('ordinal(3) = "3°"', () => assert(ordinal(3) === '3°'));

  // 5. XP system.
  console.log('\nXP system:');
  const { xpForLevel, xpToNextLevel } = require('../src/services/xpService');
  test('xpForLevel(0) = 0', () => assert(xpForLevel(0) === 0));
  test('xpForLevel(1) = 100', () => assert(xpForLevel(1) === 100));
  test('xpForLevel(10) = 10000', () => assert(xpForLevel(10) === 10000));
  test('xpToNextLevel(0) returns level 0', () => {
    const r = xpToNextLevel(0);
    assert(r.currentLevel === 0, `Expected level 0, got ${r.currentLevel}`);
  });
  test('xpToNextLevel(100) returns level 1', () => {
    const r = xpToNextLevel(100);
    assert(r.currentLevel === 1, `Expected level 1, got ${r.currentLevel}`);
  });

  // 6. Badge definitions.
  console.log('\nBadge system:');
  const { BADGES } = require('../src/services/badgeService');
  test('BADGES has at least 5 badges', () => assert(Object.keys(BADGES).length >= 5));
  test('All badges have code, name, icon, check', () => {
    for (const b of Object.values(BADGES)) {
      assert(b.code, 'Badge missing code');
      assert(b.name, 'Badge missing name');
      assert(b.icon, 'Badge missing icon');
      assert(typeof b.check === 'function', 'Badge missing check function');
    }
  });

  // 7. Permissions.
  console.log('\nPermissions:');
  const { isAdmin, canModerate } = require('../src/utils/permissions');
  test('isAdmin(null) = false', () => assert(isAdmin(null) === false));
  test('canModerate(null) = false', () => assert(canModerate(null) === false));

  // 8. Game channels template.
  console.log('\nGame channels template:');
  const { CHANNEL_TEMPLATE, buildOverwrites } = require('../src/utils/gameChannels');
  test('CHANNEL_TEMPLATE has 6 channels', () => assert(CHANNEL_TEMPLATE.length === 6));
  test('buildOverwrites for writable_text', () => {
    const ow = buildOverwrites('1', '2', '3', 'writable_text');
    assert(ow.length === 3, 'Expected 3 overwrites');
  });
  test('buildOverwrites for readonly_text', () => {
    const ow = buildOverwrites('1', '2', '3', 'readonly_text');
    assert(ow.length === 3, 'Expected 3 overwrites');
  });
  test('buildOverwrites for voice', () => {
    const ow = buildOverwrites('1', '2', '3', 'voice');
    assert(ow.length === 3, 'Expected 3 overwrites');
  });

  // 9. Game modules.
  console.log('\nGame modules:');
  const gameCodes = ['wow', 'valorant', 'lol', 'csgo', 'dota2', 'apex', 'minecraft', 'ffxiv'];
  for (const code of gameCodes) {
    test(`Module ${code}.js loads and has fetchMeta`, () => {
      const mod = require(`../src/modules/games/${code}`);
      assert(typeof mod.fetchMeta === 'function', `Missing fetchMeta in ${code}`);
    });
  }

  // 10. Rate limiter.
  console.log('\nRate limiter:');
  const { RateLimiter } = require('../src/services/api/rateLimiter');
  test('RateLimiter starts with full tokens', () => {
    const rl = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    assert(rl.tokens === 5);
  });

  // 11. Phase 2 — Giveaway service.
  console.log('\nGiveaway service:');
  const GiveawayService = require('../src/services/giveawayService');
  test('GiveawayService exports buildGiveawayMessage', () => {
    assert(typeof GiveawayService.buildGiveawayMessage === 'function');
  });
  test('GiveawayService exports endGiveaway', () => {
    assert(typeof GiveawayService.endGiveaway === 'function');
  });
  test('GiveawayService addParticipant tracks users', () => {
    const r1 = GiveawayService.addParticipant(99999, 'user1');
    assert(r1.isNew === true, 'First add should be new');
    const r2 = GiveawayService.addParticipant(99999, 'user1');
    assert(r2.isNew === false, 'Second add should not be new');
    assert(r2.count === 1, 'Count should be 1');
  });

  // 12. Phase 2 — Temp voice service.
  console.log('\nTemp voice service:');
  const TempVoiceService = require('../src/services/tempVoiceService');
  test('TempVoiceService exports handleVoiceStateUpdate', () => {
    assert(typeof TempVoiceService.handleVoiceStateUpdate === 'function');
  });
  test('TempVoiceService exports setCreatorChannel', () => {
    assert(typeof TempVoiceService.setCreatorChannel === 'function');
  });

  // 13. Phase 2 — Scheduled message service.
  console.log('\nScheduled message service:');
  const ScheduledMessageService = require('../src/services/scheduledMessageService');
  test('ScheduledMessageService exports start', () => {
    assert(typeof ScheduledMessageService.start === 'function');
  });
  test('ScheduledMessageService exports stop', () => {
    assert(typeof ScheduledMessageService.stop === 'function');
  });

  // 14. Phase 2 — New commands load.
  console.log('\nPhase 2 commands:');
  const phase2Commands = [
    { path: '../src/commands/admin/giveaway', name: 'giveaway' },
    { path: '../src/commands/admin/tempvc', name: 'tempvc' },
    { path: '../src/commands/admin/cmd', name: 'cmd' },
    { path: '../src/commands/admin/schedule', name: 'schedule' },
  ];
  for (const { path: cmdPath, name } of phase2Commands) {
    test(`Command ${name} loads and has data+execute`, () => {
      const cmd = require(cmdPath);
      assert(cmd.data, `${name} missing data`);
      assert(typeof cmd.execute === 'function', `${name} missing execute`);
    });
  }

  // 15. Phase 3 — Alert service.
  console.log('\nAlert service:');
  const AlertService = require('../src/services/alertService');
  test('AlertService exports init', () => assert(typeof AlertService.init === 'function'));
  test('AlertService exports stop', () => assert(typeof AlertService.stop === 'function'));
  test('AlertService exports getStats', () => assert(typeof AlertService.getStats === 'function'));
  test('AlertService getStats returns object', () => {
    const stats = AlertService.getStats();
    assert(typeof stats === 'object');
    assert(typeof stats.errorCount === 'number');
  });

  // 16. Phase 3 — Discord fetch helpers.
  console.log('\nDiscord fetch helpers:');
  const { fetchMember, fetchMembersBatch, fetchChannel } = require('../src/utils/discordFetch');
  test('fetchMember(null, null) returns null', async () => {
    const m = await fetchMember(null, null);
    assert(m === null);
  });
  test('fetchMembersBatch(null, []) returns empty Map', async () => {
    const m = await fetchMembersBatch(null, []);
    assert(m instanceof Map && m.size === 0);
  });
  test('fetchChannel(null, null) returns null', async () => {
    const c = await fetchChannel(null, null);
    assert(c === null);
  });

  // 17. Phase 3 — Validation middleware.
  console.log('\nValidation middleware:');
  const { validatePagination, isValidDiscordId, isValidCron } = require('../src/server/middleware/validate');
  test('validatePagination is a function', () => assert(typeof validatePagination === 'function'));
  test('isValidDiscordId accepts valid ID', () => assert(isValidDiscordId('123456789012345678') === true));
  test('isValidDiscordId rejects invalid ID', () => assert(isValidDiscordId('abc') === false));
  test('isValidCron accepts valid cron', () => assert(isValidCron('0 9 * * *') === true));
  test('isValidCron rejects invalid cron', () => assert(isValidCron('invalid') === false));

  // 18. Phase 2 — DB models load.
  console.log('\nPhase 2 DB models:');
  const db = require('../src/db');
  test('Giveaway model exists', () => assert(db.Giveaway, 'Giveaway model not found'));
  test('CustomCommand model exists', () => assert(db.CustomCommand, 'CustomCommand model not found'));
  test('ScheduledMessage model exists', () => assert(db.ScheduledMessage, 'ScheduledMessage model not found'));

  // Summary.
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => { console.error('Test runner error:', err); process.exit(1); });
