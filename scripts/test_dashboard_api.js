// scripts/test_dashboard_api.js
// Tests all dashboard API routes by simulating authenticated requests.
const http = require('http');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

const GUILD_ID = '1010226759817515018';
const PORT = 4567;
const HOST = '127.0.0.1';

// Create a fake JWT token for testing
const jwtSecret = process.env.JWT_SECRET || config.discord.token.slice(0, 32);
const token = jwt.sign(
  { id: '1466916802230747361', username: 'TestAdmin', discriminator: '0', avatar: null, global_name: 'Test' },
  jwtSecret,
  { expiresIn: '1h' }
);

function apiCall(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: `/api${path}`,
      method,
      headers: {
        'Cookie': `token=${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data.substring(0, 200) });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== Dashboard API Test ===\n');
  const tests = [
    { name: 'Health', path: '/health', method: 'GET' },
    { name: 'Auth /me', path: '/auth/me', method: 'GET' },
    { name: 'Auth /guilds', path: '/auth/guilds', method: 'GET' },
    { name: 'Guild overview', path: `/guilds/${GUILD_ID}`, method: 'GET' },
    { name: 'Games list', path: `/guilds/${GUILD_ID}/games`, method: 'GET' },
    { name: 'Members list', path: `/guilds/${GUILD_ID}/members?page=1`, method: 'GET' },
    { name: 'Warnings list', path: `/guilds/${GUILD_ID}/warnings?page=1`, method: 'GET' },
    { name: 'Events list', path: `/guilds/${GUILD_ID}/events`, method: 'GET' },
    { name: 'Leaderboard XP', path: `/guilds/${GUILD_ID}/leaderboard?metric=xp`, method: 'GET' },
    { name: 'Analytics', path: `/guilds/${GUILD_ID}/analytics?days=30`, method: 'GET' },
    { name: 'Audit log', path: `/guilds/${GUILD_ID}/audit-log?page=1`, method: 'GET' },
    { name: 'Badges', path: `/guilds/${GUILD_ID}/badges`, method: 'GET' },
    { name: 'Settings', path: `/guilds/${GUILD_ID}/settings`, method: 'GET' },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await apiCall(t.path, t.method);
      const ok = res.status === 200;
      const icon = ok ? '✓' : '✗';
      console.log(`  ${icon} ${t.name}: ${res.status} ${ok ? '' : JSON.stringify(res.data).substring(0, 100)}`);
      if (ok) passed++;
      else failed++;
    } catch (e) {
      console.log(`  ✗ ${t.name}: ERROR - ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
