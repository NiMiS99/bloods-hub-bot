// tests/api.test.js
// Integration tests for public API endpoints using supertest.
// Tests the Express router in isolation with mocked DB + Discord client.
const express = require('express');
const supertest = require('supertest');
const path = require('path');

// --- Mocks ---
const mockGuild = {
  id: '123456789012345678',
  name: 'Bloods',
  iconURL: () => 'https://cdn.discord.com/icons/123.png',
  memberCount: 100,
  members: { cache: { size: 50, values: () => [], forEach: () => {}, filter: () => ({ map: () => [] }) },
    fetch: async () => ({ values: () => [], forEach: () => {} }),
  },
};

const mockClient = {
  guilds: { cache: { has: () => true, get: () => mockGuild, first: () => mockGuild } },
  ws: { ping: 42 },
  user: { tag: 'BloodsBot#0001' },
  channels: { cache: { filter: () => ({ map: () => [] }) } },
};

// Mock DB via require cache override — must happen BEFORE requiring routes
const dbPath = path.resolve(__dirname, '..', 'src', 'db', 'index.js');
const sequelize = require('sequelize');
delete require.cache[dbPath];
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    sequelize: { query: async () => [[], {}], literal: (s) => s, col: (s) => s, fn: (s) => s },
    User: { count: async () => 100, sum: async () => 5000, findAll: async () => [] },
    Game: { count: async () => 5, findAll: async () => [] },
    CommunityEvent: { count: async () => 3, findAll: async () => [] },
    EventParticipant: { findAll: async () => [] },
    RaidConfig: { findOne: async () => null, findAll: async () => [] },
    RaidEligibility: { findAll: async () => [] },
    RaidAttendance: { findAll: async () => [] },
    BpUser: { findAll: async () => [] },
    BpLootHistory: { findAll: async () => [], findAndCountAll: async () => ({ rows: [], count: 0 }) },
    BpActiveRoll: { findOne: async () => null },
    Giveaway: { findAll: async () => [] },
    Tournament: { findAll: async () => [] },
    TournamentParticipant: { findAll: async () => [] },
    Guild: { findOrCreate: async () => [{}, true] },
    LeaderboardCache: { findOne: async () => null, upsert: async () => [{}] },
    Op: sequelize.Op,
  },
};

// Build a minimal app with just the public router
function buildApp() {
  const publicPath = path.resolve(__dirname, '..', 'src', 'server', 'routes', 'public.js');
  delete require.cache[publicPath];
  const app = express();
  app.use(express.json());
  const publicRoutes = require(publicPath);
  const router = publicRoutes(mockClient);
  app.use('/api/public', router);
  return app;
}

// --- Tests ---
let passed = 0, failed = 0;
function test(name, fn) {
  return fn().then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => { failed++; console.log(`  \u2717 ${name}: ${err.message}`); });
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function runTests() {
  console.log('\n=== API Integration Tests ===\n');
  const app = buildApp();

  // 1. GET /api/public/docs — static endpoint, no DB needed
  await test('GET /docs returns 200 with endpoint list', async () => {
    const res = await supertest(app).get('/api/public/docs');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.endpoints), 'endpoints should be an array');
    assert(res.body.endpoints.length >= 12, `Expected >=12 endpoints, got ${res.body.endpoints.length}`);
  });

  // 2. GET /api/public/leaderboard
  await test('GET /leaderboard?metric=xp is routed', async () => {
    const res = await supertest(app).get('/api/public/leaderboard?metric=xp');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 3. GET /api/public/bp/leaderboard
  await test('GET /bp/leaderboard is routed', async () => {
    const res = await supertest(app).get('/api/public/bp/leaderboard');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 4. GET /api/public/bp/loot
  await test('GET /bp/loot is routed', async () => {
    const res = await supertest(app).get('/api/public/bp/loot');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 5. GET /api/public/bp/loot/full
  await test('GET /bp/loot/full?limit=50 is routed', async () => {
    const res = await supertest(app).get('/api/public/bp/loot/full?limit=50');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 6. GET /api/public/raid
  await test('GET /raid is routed', async () => {
    const res = await supertest(app).get('/api/public/raid');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 7. GET /api/public/raid/progress
  await test('GET /raid/progress is routed', async () => {
    const res = await supertest(app).get('/api/public/raid/progress');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 8. GET /api/public/hall-of-fame
  await test('GET /hall-of-fame is routed', async () => {
    const res = await supertest(app).get('/api/public/hall-of-fame');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 9. GET /api/public/events
  await test('GET /events is routed', async () => {
    const res = await supertest(app).get('/api/public/events');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 10. GET /api/public/giveaways
  await test('GET /giveaways is routed', async () => {
    const res = await supertest(app).get('/api/public/giveaways');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 11. GET /api/public/tournaments
  await test('GET /tournaments is routed', async () => {
    const res = await supertest(app).get('/api/public/tournaments');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 12. GET /api/public/discord-widget
  await test('GET /discord-widget returns 200', async () => {
    const res = await supertest(app).get('/api/public/discord-widget');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(typeof res.body.online === 'number', 'online should be a number');
  });

  // 13. GET /api/public/info — DB-dependent, may return 200 or 500
  await test('GET /info is routed (not 404)', async () => {
    const res = await supertest(app).get('/api/public/info');
    assert(res.status !== 404, `Expected non-404, got ${res.status}`);
  });

  // 14. Unknown endpoint returns 404
  await test('GET /unknown returns 404', async () => {
    const res = await supertest(app).get('/api/public/unknown');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // 15. Response content-type is JSON
  await test('GET /docs returns application/json', async () => {
    const res = await supertest(app).get('/api/public/docs');
    assert(res.type === 'application/json', `Expected application/json, got ${res.type}`);
  });

  // 16. Discord-widget has expected structure
  await test('GET /discord-widget has correct structure', async () => {
    const res = await supertest(app).get('/api/public/discord-widget');
    assert(res.body.hasOwnProperty('online'), 'should have online property');
    assert(res.body.hasOwnProperty('voiceChannels'), 'should have voiceChannels property');
    assert(Array.isArray(res.body.voiceChannels), 'voiceChannels should be an array');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => { console.error('Test runner error:', err); process.exit(1); });
