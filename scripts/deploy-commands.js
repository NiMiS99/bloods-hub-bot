// scripts/deploy-commands.js
// Registers all slash commands to the Discord guild.
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'commands');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const cmds = [];

for (const f of files) {
  try {
    const cmd = require(path.join(dir, f));
    if (cmd.data) cmds.push(cmd.data.toJSON());
  } catch (e) {
    console.log('Skip:', f, e.message);
  }
}

console.log(`Found ${cmds.length} commands`);

const clientId = process.env.CLIENT_ID || '1466916802230747361';
const guildId = '1010226759817515018';
const token = process.env.DISCORD_TOKEN;

const rest = new REST({ version: '10' }).setToken(token);

rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: cmds })
  .then(() => {
    console.log(`Successfully registered ${cmds.length} application commands.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error registering commands:', err.message);
    process.exit(1);
  });
