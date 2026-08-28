// tests/e2e.test.js
// E2E smoke tests simulating user journeys against the live site.
// Verifies page rendering, navigation, API responses, and SEO assets.
const https = require('https');

const BASE = 'https://bloodswow.it';
const API = `${BASE}/api/public`;

let passed = 0, failed = 0;

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: opts.headers, timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function test(name, fn) {
  return fn().then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => { failed++; console.log(`  \u2717 ${name}: ${err.message}`); });
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function runTests() {
  console.log('\n=== E2E Smoke Tests ===\n');

  // --- Journey 1: Homepage visitor ---
  await test('Homepage loads with 200 and contains guild name', async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.includes('Bloods') || res.body.includes('bloods'), 'Page should contain "Bloods"');
  });

  await test('Homepage has Open Graph meta tag', async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.body.includes('og:title'), 'Should have og:title meta');
    assert(res.body.includes('og:image'), 'Should have og:image meta');
  });

  await test('Homepage has JSON-LD structured data', async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.body.includes('application/ld+json'), 'Should have JSON-LD script');
  });

  // --- Journey 2: Public pages navigation ---
  for (const page of ['/raid/', '/classifiche/', '/eventi/', '/hall-of-fame/', '/chi-siamo/', '/unisciti/']) {
    await test(`Page ${page} loads with 200`, async () => {
      const res = await fetch(`${BASE}${page}`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }

  // --- Journey 3: Login redirect ---
  await test('/dashboard/ redirects to /login/', async () => {
    const res = await fetch(`${BASE}/dashboard/`);
    assert(res.status === 302 || res.status === 307, `Expected redirect, got ${res.status}`);
    assert(res.headers.location?.includes('/login'), `Should redirect to login, got ${res.headers.location}`);
  });

  await test('/area/ redirects to /login/', async () => {
    const res = await fetch(`${BASE}/area/`);
    assert(res.status === 302 || res.status === 307, `Expected redirect, got ${res.status}`);
    assert(res.headers.location?.includes('/login'), `Should redirect to login, got ${res.headers.location}`);
  });

  // --- Journey 4: API data flow ---
  await test('API /info returns guild data with memberCount', async () => {
    const res = await fetch(`${API}/info`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = JSON.parse(res.body);
    assert(typeof data.memberCount === 'number', 'memberCount should be number');
    assert(data.name.includes('Bloods'), `Expected name containing "Bloods", got "${data.name}"`);
  });

  await test('API /leaderboard returns entries array', async () => {
    const res = await fetch(`${API}/leaderboard?metric=xp`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = JSON.parse(res.body);
    assert(Array.isArray(data.entries), 'entries should be array');
  });

  await test('API /discord-widget returns online count', async () => {
    const res = await fetch(`${API}/discord-widget`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = JSON.parse(res.body);
    assert(typeof data.online === 'number', 'online should be number');
    assert(Array.isArray(data.voiceChannels), 'voiceChannels should be array');
  });

  await test('API /docs returns endpoint list', async () => {
    const res = await fetch(`${API}/docs`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = JSON.parse(res.body);
    assert(Array.isArray(data.endpoints), 'endpoints should be array');
    assert(data.endpoints.length >= 12, `Expected >=12, got ${data.endpoints.length}`);
  });

  // --- Journey 5: SEO assets ---
  await test('sitemap.xml is accessible', async () => {
    const res = await fetch(`${BASE}/sitemap.xml`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.includes('<urlset'), 'Should be valid sitemap XML');
    assert(res.body.includes('bloodswow.it'), 'Should contain site URL');
  });

  await test('robots.txt is accessible', async () => {
    const res = await fetch(`${BASE}/robots.txt`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.includes('User-agent'), 'Should be valid robots.txt');
    assert(res.body.includes('Disallow: /dashboard'), 'Should disallow dashboard');
  });

  await test('manifest.json is accessible', async () => {
    const res = await fetch(`${BASE}/manifest.json`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = JSON.parse(res.body);
    assert(data.name && data.name.length > 0, 'Should have name');
    assert(Array.isArray(data.icons), 'Should have icons array');
  });

  // --- Journey 6: Security headers ---
  await test('HSTS header is present with preload', async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.headers['strict-transport-security']?.includes('preload'), 'Should have HSTS with preload');
  });

  await test('X-Frame-Options is SAMEORIGIN', async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.headers['x-frame-options'] === 'SAMEORIGIN', 'Should have X-Frame-Options SAMEORIGIN');
  });

  await test('X-Content-Type-Options is nosniff', async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.headers['x-content-type-options'] === 'nosniff', 'Should have nosniff');
  });

  // --- Journey 7: 404 page ---
  await test('Unknown page returns 404', async () => {
    const res = await fetch(`${BASE}/this-page-does-not-exist/`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // --- Journey 8: Compression ---
  await test('HTML response is gzipped', async () => {
    const res = await fetch(`${BASE}/`, { headers: { 'Accept-Encoding': 'gzip' } });
    assert(res.headers['content-encoding'] === 'gzip', 'Should be gzipped');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => { console.error('E2E runner error:', err); process.exit(1); });
