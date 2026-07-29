// src/services/musicService.js
// Music player using @discordjs/voice + play-dl (YouTube/Spotify).
// Supports: play, skip, stop, queue, pause, resume, volume.
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const play = require('play-dl');
const logger = require('../utils/logger');

// Queue per guild: guildId -> { songs: [], player, connection, textChannel, playing, volume }
const _queues = new Map();

async function ensureSearchApi() {
  // play-dl may need Spotify client credentials for Spotify URLs
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      await play.spotify.setToken({
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      });
    } catch {
      // Ignore — Spotify support is optional
    }
  }
}

/**
 * Play a song or add to queue.
 * @param {object} interaction - Discord interaction (must have member.voice.channel)
 * @param {string} query - Song name or URL (YouTube/Spotify)
 */
async function playCommand(interaction, query) {
  const voiceChannel = interaction.member?.voice?.channel;
  if (!voiceChannel) {
    return interaction.reply({ content: '❌ Devi essere in un canale vocale per ascoltare musica!', flags: 64 });
  }

  await interaction.deferReply();

  try {
    await ensureSearchApi();

    // Determine if it's a URL or search query
    let stream = null;
    let title = query;
    let url = query;

    if (play.yt_validate(query) === 'video') {
      // YouTube URL
      const info = await play.video_info(query);
      title = info.video_details.title;
      stream = await play.stream(query);
    } else if (play.sp_validate && play.sp_validate(query) === 'track') {
      // Spotify URL — convert to YouTube search
      const spInfo = await play.spotify(query);
      const searchQuery = `${spInfo.name} ${spInfo.artists[0]?.name || ''}`;
      const searchResults = await play.search(searchQuery, { limit: 1 });
      if (searchResults.length === 0) {
        return interaction.editReply({ content: '❌ Nessun risultato trovato per questa canzone Spotify.' });
      }
      title = searchResults[0].title;
      url = searchResults[0].url;
      stream = await play.stream(url);
    } else {
      // Search query
      const searchResults = await play.search(query, { limit: 1 });
      if (searchResults.length === 0) {
        return interaction.editReply({ content: `❌ Nessun risultato trovato per "${query}".` });
      }
      title = searchResults[0].title;
      url = searchResults[0].url;
      stream = await play.stream(url);
    }

    // Get or create queue
    let queue = _queues.get(interaction.guild.id);
    if (!queue) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      connection.subscribe(player);

      queue = {
        songs: [],
        player,
        connection,
        textChannel: interaction.channel,
        playing: false,
        volume: 1.0,
      };

      _queues.set(interaction.guild.id, queue);

      // Handle disconnect when channel is empty
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
          ]);
        } catch {
          connection.destroy();
          _queues.delete(interaction.guild.id);
          logger.debug(`Music: disconnected from ${interaction.guild.name}`);
        }
      });

      player.on(AudioPlayerStatus.Idle, () => {
        playNext(interaction.guild.id);
      });

      player.on('error', (err) => {
        logger.error(`Music player error: ${err.message}`);
        playNext(interaction.guild.id);
      });
    }

    // Add song to queue
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    queue.songs.push({ title, url, resource, requestedBy: interaction.user.username });

    if (!queue.playing) {
      playNext(interaction.guild.id);
      await interaction.editReply({ content: `🎵 **Riproduzione:** ${title}` });
    } else {
      await interaction.editReply({ content: `📝 **Aggiunto alla coda:** ${title} (posizione ${queue.songs.length})` });
    }
  } catch (err) {
    logger.error(`Music play error: ${err.message}`);
    await interaction.editReply({ content: `❌ Errore: ${err.message}` });
  }
}

function playNext(guildId) {
  const queue = _queues.get(guildId);
  if (!queue) return;

  const song = queue.songs.shift();
  if (!song) {
    // Queue empty — stop
    queue.playing = false;
    queue.connection.destroy();
    _queues.delete(guildId);
    if (queue.textChannel) {
      queue.textChannel.send('⏹️ Coda terminata. Disconnesso dal canale vocale.').catch(() => {});
    }
    return;
  }

  queue.playing = true;
  queue.player.play(song.resource);
  if (queue.textChannel) {
    queue.textChannel.send(`🎵 **In riproduzione:** ${song.title}`).catch(() => {});
  }
}

async function skipCommand(interaction) {
  const queue = _queues.get(interaction.guild.id);
  if (!queue || !queue.playing) {
    return interaction.reply({ content: '❌ Nessuna canzone in riproduzione.', flags: 64 });
  }
  queue.player.stop();
  return interaction.reply({ content: '⏭️ Canzone saltata.' });
}

async function stopCommand(interaction) {
  const queue = _queues.get(interaction.guild.id);
  if (!queue) {
    return interaction.reply({ content: '❌ Il bot non sta riproducendo musica.', flags: 64 });
  }
  queue.songs = [];
  queue.player.stop();
  queue.connection.destroy();
  _queues.delete(interaction.guild.id);
  return interaction.reply({ content: '⏹️ Musica fermata e coda svuotata.' });
}

async function queueCommand(interaction) {
  const queue = _queues.get(interaction.guild.id);
  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: '❌ La coda è vuota.', flags: 64 });
  }
  const list = queue.songs.slice(0, 10).map((s, i) => `${i + 1}. **${s.title}** (richiesta da ${s.requestedBy})`).join('\n');
  return interaction.reply({ content: `📝 **Coda (${queue.songs.length}):**\n${list}${queue.songs.length > 10 ? `\n...e altre ${queue.songs.length - 10}` : ''}` });
}

async function pauseCommand(interaction) {
  const queue = _queues.get(interaction.guild.id);
  if (!queue || !queue.playing) {
    return interaction.reply({ content: '❌ Nessuna canzone in riproduzione.', flags: 64 });
  }
  queue.player.pause();
  return interaction.reply({ content: '⏸️ Riproduzione in pausa.' });
}

async function resumeCommand(interaction) {
  const queue = _queues.get(interaction.guild.id);
  if (!queue) {
    return interaction.reply({ content: '❌ Nessuna canzone in pausa.', flags: 64 });
  }
  queue.player.unpause();
  return interaction.reply({ content: '▶️ Riproduzione ripresa.' });
}

function stopAll() {
  for (const [guildId, queue] of _queues) {
    try {
      queue.player.stop();
      queue.connection.destroy();
    } catch {}
  }
  _queues.clear();
}

module.exports = {
  playCommand,
  skipCommand,
  stopCommand,
  queueCommand,
  pauseCommand,
  resumeCommand,
  stopAll,
};
