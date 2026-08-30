// scripts/test-gow-api-v3.js
// Test gow.gg domain and other approaches
require('dotenv').config();
const axios = require('axios');

const MGMT_KEY = process.env.GOW_API_KEY;
const PUB_KEY = process.env.GOW_PUBLIC_KEY;
const SHEET_KEY = process.env.GOW_SHEET_KEY;

const GUILD = 'bloods';
const SLUG = "pozzo-dell-eternita";
const REGION = 'eu';

const tests = [
  // gow.gg domain
  { label: 'gow.gg members (mgmt)', url: `https://gow.gg/api/v1/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
  { label: 'gow.gg members (pub)', url: `https://gow.gg/api/v1/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': PUB_KEY } },
  { label: 'gow.gg guild (pub)', url: `https://gow.gg/api/v1/guilds/${GUILD}/${SLUG}/${REGION}`, headers: { 'X-API-Key': PUB_KEY } },
  // Try without /api/v1 prefix
  { label: 'gow.gg /guilds members (mgmt)', url: `https://gow.gg/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
  // Try api subdomain
  { label: 'api.guildsofwow members (mgmt)', url: `https://api.guildsofwow.com/v1/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
  { label: 'api.guildsofwow members (pub)', url: `https://api.guildsofwow.com/v1/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': PUB_KEY } },
  // Try gow.gg/api
  { label: 'gow.gg/api members (mgmt)', url: `https://gow.gg/api/guilds/${GUILD}/${SLUG}/${REGION}/members`, headers: { 'X-API-Key': MGMT_KEY } },
  // Spreadsheet endpoint
  { label: 'gow.gg spreadsheet (sheet)', url: `https://gow.gg/api/v1/guilds/${GUILD}/${SLUG}/${REGION}/spreadsheet`, headers: { 'X-API-Key': SHEET_KEY } },
  { label: 'guildsofwow spreadsheet (sheet)', url: `https://guildsofwow.com/api/v1/guilds/${GUILD}/${SLUG}/${REGION}/spreadsheet`, headers: { 'X-API-Key': SHEET_KEY } },
  // Try /api/v1/guild with ID
  { label: 'gow.gg guild by id (mgmt)', url: `https://gow.gg/api/v1/guild/members`, headers: { 'X-API-Key': MGMT_KEY } },
  // Try event endpoints
  { label: 'gow.gg events (mgmt)', url: `https://gow.gg/api/v1/guilds/${GUILD}/${SLUG}/${REGION}/events`, headers: { 'X-API-Key': MGMT_KEY } },
  { label: 'guildsofwow events (mgmt)', url: `https://guildsofwow.com/api/v1/guilds/${GUILD}/${SLUG}/${REGION}/events`, headers: { 'X-API-Key': MGMT_KEY } },
];

async function run() {
  for (const t of tests) {
    try {
      const res = await axios.get(t.url, {
        headers: { ...t.headers, 'Accept': 'application/json', 'User-Agent': 'BloodsHubBot/1.0' },
        timeout: 10000,
        maxRedirects: 5,
      });
      const data = JSON.stringify(res.data).slice(0, 300);
      console.log(`OK  [${res.status}] ${t.label} => ${data}`);
    } catch (err) {
      const status = err.response?.status || 'N/A';
      const cf = err.response?.headers?.['cf-mitigated'] || '';
      const body = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 100) : JSON.stringify(err.response.data).slice(0, 100)) : err.message;
      console.log(`ERR [${status}] ${t.label} => ${body} ${cf ? '(CF)' : ''}`);
    }
  }
}

run();
