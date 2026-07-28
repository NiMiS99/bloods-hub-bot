// src/services/api/index.js
// Provider registry — maps (provider, gameCode) -> instantiated API client.
// Add new providers here; commands/services resolve via getApi(game).
const SteamApi = require('./steamApi');
const BattleNetApi = require('./battleNetApi');
const RiotApi = require('./riotApi');

const registry = {};

function register(provider, gameCode) {
  const key = `${provider}:${gameCode}`;
  let instance;
  switch (provider) {
    case 'steam': instance = new SteamApi(gameCode); break;
    case 'battlenet': instance = new BattleNetApi(gameCode); break;
    case 'riot': instance = new RiotApi(gameCode); break;
    default: throw new Error(`Unknown API provider: ${provider}`);
  }
  registry[key] = instance;
  return instance;
}

// Pre-register the default games.
register('steam', 'csgo');
register('steam', 'dota2');
register('battlenet', 'wow');
register('riot', 'valorant');
register('riot', 'lol');

function getApi(provider, gameCode) {
  return registry[`${provider}:${gameCode}`] || null;
}

function getApiForGame(game) {
  if (!game?.api_provider) return null;
  return getApi(game.api_provider, game.code);
}

module.exports = { register, getApi, getApiForGame, registry };
