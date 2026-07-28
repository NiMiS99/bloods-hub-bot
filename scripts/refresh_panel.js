// scripts/refresh_panel.js
// One-off: refresh the role-selection panel in the ROLE_PANEL_CHANNEL_ID channel.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits } = require('discord.js');
const { buildRolePanel, refreshRolePanel } = require('../src/ui/roleSelection');
const config = require('../src/config');

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  console.log(`Connected as ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID, { force: true });
  const result = await refreshRolePanel(guild, client);
  console.log(`Panel refresh result: ${result}`);
  await client.destroy();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
