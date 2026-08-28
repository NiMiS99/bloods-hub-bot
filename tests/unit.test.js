// tests/unit.test.js
// Unit tests for critical pure functions (no DB, no Discord client needed).
const assert = require('assert');

// --- XP Service (pure math functions) ---
const xpService = require('../src/services/xpService');
const xpEventService = require('../src/services/xpEventService');

// --- BP Helpers (pure functions) ---
const bpHelpers = require('../src/utils/bpHelpers');

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    failed++;
    console.log(`  \u2717 ${name}: ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    failed++;
    console.log(`  \u2717 ${name}: ${err.message}`);
  }
}

function run() {
  console.log('\n=== Unit Tests ===\n');

  // --- XP: xpForLevel ---
  test('xpForLevel(0) = 0', () => {
    assert.strictEqual(xpService.xpForLevel(0), 0);
  });

  test('xpForLevel(1) = 100', () => {
    assert.strictEqual(xpService.xpForLevel(1), 100);
  });

  test('xpForLevel(5) = 2500', () => {
    assert.strictEqual(xpService.xpForLevel(5), 2500);
  });

  test('xpForLevel(10) = 10000', () => {
    assert.strictEqual(xpService.xpForLevel(10), 10000);
  });

  test('xpForLevel(20) = 40000', () => {
    assert.strictEqual(xpService.xpForLevel(20), 40000);
  });

  // --- XP: xpToNextLevel ---
  test('xpToNextLevel(0) returns level 0, next 1, xpToNext 100', () => {
    const r = xpService.xpToNextLevel(0);
    assert.strictEqual(r.currentLevel, 0);
    assert.strictEqual(r.nextLevel, 1);
    assert.strictEqual(r.xpToNext, 100);
    assert.strictEqual(r.progress, 0);
  });

  test('xpToNextLevel(100) returns level 1, xpToNext 300', () => {
    const r = xpService.xpToNextLevel(100);
    assert.strictEqual(r.currentLevel, 1);
    assert.strictEqual(r.nextLevel, 2);
    assert.strictEqual(r.xpToNext, 300); // 400 - 100
  });

  test('xpToNextLevel(2500) returns level 5, xpToNext 1100', () => {
    const r = xpService.xpToNextLevel(2500);
    assert.strictEqual(r.currentLevel, 5);
    assert.strictEqual(r.nextLevel, 6);
    assert.strictEqual(r.xpToNext, 1100); // 3600 - 2500
  });

  test('xpToNextLevel never returns negative xpToNext', () => {
    for (let xp = 0; xp <= 100000; xp += 500) {
      const r = xpService.xpToNextLevel(xp);
      assert.ok(r.xpToNext > 0, `xpToNext should be positive at xp=${xp}, got ${r.xpToNext}`);
    }
  });

  // --- XP: constants ---
  test('MSG_XP = 1', () => {
    assert.strictEqual(xpService.MSG_XP, 1);
  });

  test('VOICE_XP_PER_MIN = 5', () => {
    assert.strictEqual(xpService.VOICE_XP_PER_MIN, 5);
  });

  test('ROLE_BONUS_XP = 10', () => {
    assert.strictEqual(xpService.ROLE_BONUS_XP, 10);
  });

  // --- XP Event: getMultiplier ---
  test('getMultiplier returns 1 when no event active', () => {
    assert.strictEqual(xpEventService.getMultiplier(), 1);
  });

  test('getActiveEvent returns null when no event', () => {
    assert.strictEqual(xpEventService.getActiveEvent(), null);
  });

  // --- BP: computeScore ---
  test('computeScore(50, 0) = 50 (no bid bonus)', () => {
    assert.strictEqual(bpHelpers.computeScore(50, 0), 50);
  });

  test('computeScore(50, 50) = 100 (2x with bid=50)', () => {
    assert.strictEqual(bpHelpers.computeScore(50, 50), 100);
  });

  test('computeScore(100, 100) = 300 (3x with bid=100)', () => {
    assert.strictEqual(bpHelpers.computeScore(100, 100), 300);
  });

  test('computeScore(1, 0) = 1 (minimum roll)', () => {
    assert.strictEqual(bpHelpers.computeScore(1, 0), 1);
  });

  test('computeScore(100, 0) = 100 (max roll, no bid)', () => {
    assert.strictEqual(bpHelpers.computeScore(100, 0), 100);
  });

  test('computeScore(0, 50) = 0 (zero roll always zero)', () => {
    assert.strictEqual(bpHelpers.computeScore(0, 50), 0);
  });

  test('computeScore with custom K=100', () => {
    assert.strictEqual(bpHelpers.computeScore(50, 100, 100), 100); // 50 * (1 + 100/100) = 100
  });

  // --- BP: randInt ---
  test('randInt returns value within [1, 100]', () => {
    for (let i = 0; i < 1000; i++) {
      const r = bpHelpers.randInt(1, 100);
      assert.ok(r >= 1 && r <= 100, `randInt returned ${r}, expected 1-100`);
    }
  });

  test('randInt(5, 5) always returns 5', () => {
    for (let i = 0; i < 100; i++) {
      assert.strictEqual(bpHelpers.randInt(5, 5), 5);
    }
  });

  // --- BP: extractUserIdsFromMentions ---
  test('extractUserIdsFromMentions parses single mention', () => {
    const ids = bpHelpers.extractUserIdsFromMentions('<@123456789012345678>');
    assert.deepStrictEqual(ids, ['123456789012345678']);
  });

  test('extractUserIdsFromMentions parses multiple mentions', () => {
    const ids = bpHelpers.extractUserIdsFromMentions('<@111> <@222> <@333>');
    assert.deepStrictEqual(ids, ['111', '222', '333']);
  });

  test('extractUserIdsFromMentions parses nickname mentions (<@!>)', () => {
    const ids = bpHelpers.extractUserIdsFromMentions('<@!999>');
    assert.deepStrictEqual(ids, ['999']);
  });

  test('extractUserIdsFromMentions deduplicates', () => {
    const ids = bpHelpers.extractUserIdsFromMentions('<@111> <@111> <@222>');
    assert.deepStrictEqual(ids, ['111', '222']);
  });

  test('extractUserIdsFromMentions returns empty for no mentions', () => {
    const ids = bpHelpers.extractUserIdsFromMentions('hello world');
    assert.deepStrictEqual(ids, []);
  });

  test('extractUserIdsFromMentions returns empty for empty string', () => {
    const ids = bpHelpers.extractUserIdsFromMentions('');
    assert.deepStrictEqual(ids, []);
  });

  // --- BP: isRaidLeader ---
  test('isRaidLeader returns false for null member', () => {
    assert.strictEqual(bpHelpers.isRaidLeader(null), false);
  });

  test('isRaidLeader returns true for admin permission', () => {
    const member = { permissions: { has: () => true }, roles: { cache: [] } };
    assert.strictEqual(bpHelpers.isRaidLeader(member), true);
  });

  test('isRaidLeader returns true for "Founder" role', () => {
    const member = {
      permissions: { has: () => false },
      roles: { cache: [{ name: 'Founder' }] },
    };
    assert.strictEqual(bpHelpers.isRaidLeader(member), true);
  });

  test('isRaidLeader returns false for regular member', () => {
    const member = {
      permissions: { has: () => false },
      roles: { cache: [{ name: 'Member' }] },
    };
    assert.strictEqual(bpHelpers.isRaidLeader(member), false);
  });

  test('isRaidLeader returns true for "Guida Incursioni" role', () => {
    const member = {
      permissions: { has: () => false },
      roles: { cache: [{ name: 'Guida Incursioni' }] },
    };
    assert.strictEqual(bpHelpers.isRaidLeader(member), true);
  });

  // --- BP: RAID_LEADER_ROLES ---
  test('RAID_LEADER_ROLES includes key roles', () => {
    const roles = bpHelpers.RAID_LEADER_ROLES;
    assert.ok(roles.includes('Founder'));
    assert.ok(roles.includes('Owner'));
    assert.ok(roles.includes('Officer'));
    assert.ok(roles.includes('Guida Incursioni'));
    assert.ok(roles.includes('Guida Spedizioni'));
  });

  // --- Edge cases ---
  test('computeScore handles decimal results (round to 2)', () => {
    const s = bpHelpers.computeScore(33, 7);
    // 33 * (1 + 7/50) = 33 * 1.14 = 37.62
    assert.strictEqual(s, 37.62);
  });

  test('xpForLevel is quadratic (level^2 * 100)', () => {
    for (let lvl = 1; lvl <= 50; lvl++) {
      assert.strictEqual(xpService.xpForLevel(lvl), lvl * lvl * 100);
    }
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

run();
