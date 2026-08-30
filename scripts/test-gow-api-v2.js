// scripts/test-gow-api-v2.js
// Test all possible GoW API URL patterns with all keys
require('dotenv').config();
const axios = require('axios');

const MGMT_KEY = process.env.GOW_API_KEY;
const PUB_KEY = process.env.GOW_PUBLIC_KEY;
const SHEET_KEY = process.env.GOW_SHEET_KEY;

const GUILD = 'bloods';
const SLUG = "pozzo-dell-eternita";
const REGION = 'eu';

// Try many base URL patterns
const bases = [
  'https://guildsofwow.com/api/v1',
  'https://guildsofwow.com/api',
  'https://api.guildsofwow.com/v1',
  'https://api.guildsofwow.com',
  'https://guildsofwow.com/api/v1/guild',
  'https://guildsofwow.com/api/v1/guilds',
];

// Try many path patterns
const paths = [
  '/members',
  '/roster',
  `/${GUILD}/${SLUG}/${REGION}/members`,
  `/${GUILD}/${SLUG}/${REGION}`,
  `/guild/${GUILD}/${SLUG}/${REGION}/members`,
  `/guilds/${GUILD}/${SLUG}/${REGION}/members`,
];

// Try all key formats
const keyVariants = [
  { name: 'mgmt-XAPI', headers: { 'X-API-Key': MGMT_KEY } },
  { name: 'mgmt-Bearer', headers: { 'Authorization': `Bearer ${MGMT_KEY}` } },
  { name: 'pub-XAPI', headers: { 'X-API-Key': PUB_KEY } },
  { name: 'pub-Bearer', headers: { 'Authorization': `Bearer ${PUB_KEY}` } },
  { name: 'sheet-XAPI', headers: { 'X-API-Key': SHEET_KEY } },
];

const results = [];
const tested = new Set();

async function testUrl(url, headers, label) {
  if (tested.has(url + label)) return;
  tested.add(url + label);
  try {
    const res = await axios.get(url, {
      headers: { ...headers, 'Accept': 'application/json', 'User-Agent': 'BloodsHubBot/1.0' },
      timeout: 8000,
      maxRedirects: 3,
    });
    const data = JSON.stringify(res.data).slice(0, 200);
    const msg = `OK  [${res.status}] ${label} ${url.replace('https://guildsofwow.com', '')} => ${data}`;
    console.log(msg);
    results.push(msg);
  } catch (err) {
    const status = err.response?.status || 'N/A';
    if (status === 404) return; // skip 404s to reduce noise
    const cf = err.response?.headers?.['cf-mitigated'] || '';
    const body = err.response?.data ? JSON.stringify(err.response.data).slice(0, 100) : err.message;
    const msg = `ERR [${status}] ${label} ${url.replace('https://guildsofwow.com', '')} => ${body} ${cf ? '(CF)' : ''}`;
    console.log(msg);
    results.push(msg);
  }
}

async function run() {
  // Test base + path combos
  for (const base of bases) {
    for (const path of paths) {
      const url = base + path;
      for (const kv of keyVariants) {
        await testUrl(url, kv.headers, kv.name);
      }
    }
  }

  // Also try query param approach
  for (const base of bases) {
    for (const path of paths) {
      const url = `${base}${path}?api_key=${MGMT_KEY}`;
      await testUrl(url, {}, 'mgmt-query');
    }
  }

  console.log('\n--- Non-404 results ---');
  for (const r of results) console.log(r);
}

run();
