// src/commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Verifica la latenza del bot.'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Ping in corso…', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = interaction.client.ws.ping;
    await interaction.editReply(`🏓 Pong! Latenza: **${latency}ms** • WebSocket: **${ws}ms**`);
  },
};
