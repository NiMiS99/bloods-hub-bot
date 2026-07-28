// src/modules/games/_template.js
// Copy this file to <gameCode>.js and implement fetchMeta() to plug a new
// game's patch/meta/server-status feed into the MetaScheduler.
async function fetchMeta() {
  return [
    {
      kind: 'patch', // 'patch' | 'meta' | 'server_status'
      title: 'Example patch title',
      body: 'Short summary of the patch / meta shift.',
      url: 'https://example.com/patch-notes',
    },
  ];
}

module.exports = { fetchMeta };
