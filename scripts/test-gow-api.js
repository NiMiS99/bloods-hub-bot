// scripts/test-gow-api.js
// Test all GoW API keys against various endpoint formats
require('dotenv').config();
const axios = require('axios');

const MGMT_KEY = process.env.GOW_API_KEY;
const PUB_KEY = process.env.GOW_PUBLIC_KEY;
const SHEET_KEY = process.env.GOW_SHEET_KEY;

const BASE = 'https://guildsofwow.com/api/v1';
const GUILD = 'bloods';
const SLUG = "pozzo-dell-eternita";
const REGION = 'eu';

const endpoints = [
  // Members endpoints
  { label: 'members /guilds/ (mgmt X-API-Key)', url: `${BASE}/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
  { label: 'members /guilds/ (mgmt Bearer)', url: `${BASE}/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'Authorization': `Bearer ${MGMT_KEY}` } },
  { label: 'members /guild/ (mgmt X-API-Key)', url: `${BASE}/guild/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
  { label: 'members /guilds/ (pub X-API-Key)', url: `${BASE}/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': PUB_KEY } },
  { label: 'members /guilds/ (pub Bearer)', url: `${BASE}/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'Authorization': `Bearer ${PUB_KEY}` } },
  // Applications endpoints
  { label: 'applications /guilds/ (mgmt)', url: `${BASE}/guilds/${GUILD}/${SLUG}/${REGION}/applications`, headers: { 'X-API-Key': MGMT_KEY } },
  { label: 'applications /guild/ (mgmt)', url: `${BASE}/guild/${GUILD}/${SLUG}/${REGION}/applications`, headers: { 'X-API-Key': MGMT_KEY } },
  // Guild info
  { label: 'guild /guilds/ (pub)', url: `${BASE}/guilds/${GUILD}/${SLUG}/${REGION}`, headers: { 'X-API-Key': PUB_KEY } },
  { label: 'guild /guild/ (pub)', url: `${BASE}/guild/${GUILD}/${SLUG}/${REGION}`, headers: { 'X-API-Key': PUB_KEY } },
  // Try without slug accents
  { label: 'members no-accent (mgmt)', url: `${BASE}/guilds/${GUILD}/pozzo-delleternita/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
  // Sheet API
  { label: 'sheet /guilds/ (sheet key)', url: `${BASE}/guilds/${GUILD}/${SLUG}/${REGION}/spreadsheet`, headers: { 'X-API-Key': SHEET_KEY } },
  // Try v2
  { label: 'members v2 (mgmt)', url: `https://guildsofwow.com/api/v2/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
];

async function run() {
  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep.url, {
        headers: { ...ep.headers, 'Accept': 'application/json', 'User-Agent': 'BloodsHubBot/1.0' },
        timeout: 10000,
        maxRedirects: 5,
      });
      const data = JSON.stringify(res.data).slice(0, 200);
      console.log(`OK  [${res.status}] ${ep.label} => ${data}`);
    } catch (err) {
      const status = err.response?.status || 'N/A';
      const cf = err.response?.headers?.['cf-mitigated'] || '';
      const body = err.response?.data ? JSON.stringify(err.response.data).slice(0, 150) : err.message;
      console.log(`ERR [${status}] ${ep.label} => ${body} ${cf ? '(CF: ' + cf + ')' : ''}`);
    }
  }
}

run();
