// src/commands/music.js
// /music — Music player commands (play, skip, stop, queue, pause, resume).
const { SlashCommandBuilder } = require('discord.js');
const musicService = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Comandi musicali del bot.')
    .addSubcommand((sc) =>
      sc.setName('play').setDescription('Riproduci una canzone (YouTube o Spotify).')
        .addStringOption((o) =>
          o.setName('query').setDescription('Titolo o URL (YouTube/Spotify).').setRequired(true).setMaxLength(4000)))
    .addSubcommand((sc) =>
      sc.setName('skip').setDescription('Salta la canzone corrente.'))
    .addSubcommand((sc) =>
      sc.setName('stop').setDescription('Ferma la musica e svuota la coda.'))
    .addSubcommand((sc) =>
      sc.setName('queue').setDescription('Mostra la coda attuale.'))
    .addSubcommand((sc) =>
      sc.setName('pause').setDescription('Metti in pausa la riproduzione.'))
    .addSubcommand((sc) =>
      sc.setName('resume').setDescription('Riprendi la riproduzione.')),

  async execute(interaction, _client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'play') {
      const query = interaction.options.getString('query');
      return musicService.playCommand(interaction, query);
    }
    if (sub === 'skip') return musicService.skipCommand(interaction);
    if (sub === 'stop') return musicService.stopCommand(interaction);
    if (sub === 'queue') return musicService.queueCommand(interaction);
    if (sub === 'pause') return musicService.pauseCommand(interaction);
    if (sub === 'resume') return musicService.resumeCommand(interaction);
  },
};
