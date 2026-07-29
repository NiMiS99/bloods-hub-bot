// src/commands/session.js
// /session — game session tools for players.
// Provides: quick LFG, voice channel info, game tips, party finder.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { Game, UserGame, User } = require('../db');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embed');
const { createSession } = require('../services/lfgService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Strumenti per sessioni di gioco.')
    .addSubcommand((sub) =>
      sub.setName('quick')
        .setDescription('Cerca rapidamente compagni per un gioco.')
        .addStringOption((o) => o.setName('gioco').setDescription('Gioco.').setRequired(true).setAutocomplete(true).setMaxLength(200))
        .addIntegerOption((o) => o.setName('posti').setDescription('Posti richiesti.').setRequired(false).setMinValue(1).setMaxValue(20)))
    .addSubcommand((sub) =>
      sub.setName('who')
        .setDescription('Mostra chi gioca a un gioco (online ora).')
        .addStringOption((o) => o.setName('gioco').setDescription('Gioco.').setRequired(true).setAutocomplete(true).setMaxLength(200)))
    .addSubcommand((sub) =>
      sub.setName('voice')
        .setDescription('Mostra i canali vocali di un gioco e chi è connesso.')
        .addStringOption((o) => o.setName('gioco').setDescription('Gioco.').setRequired(true).setAutocomplete(true).setMaxLength(200)))
    .addSubcommand((sub) =>
      sub.setName('tips')
        .setDescription('Mostra consigli utili per un gioco.')
        .addStringOption((o) => o.setName('gioco').setDescription('Gioco.').setRequired(true).setAutocomplete(true).setMaxLength(200))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gameCode = interaction.options.getString('gioco');
    const game = await Game.findOne({ where: { code: gameCode, is_active: true } });

    if (!game) {
      return interaction.reply({ embeds: [errorEmbed('Gioco non trovato.')], flags: 64 });
    }

    if (sub === 'quick') {
      const slots = interaction.options.getInteger('posti') || 5;
      const role = interaction.guild.roles.cache.get(game.role_id);

      const embed = baseEmbed({
        title: `🎮 Sessione Rapida: ${game.name}`,
        description:
          `**Capitano:** ${interaction.user}\n` +
          `**Posti:** 1/${slots}\n` +
          `**Modalità:** Qualsiasi\n\n` +
          `🟢 **Stato:** APERTO\n\n` +
          `**Partecipanti:**\n• ${interaction.user} (capitano)\n\n` +
          (role ? `> Notifica: <@&${role.id}>` : ''),
        color: 0x57f287,
        footer: { text: 'Clicca "Unisciti" per partecipare' },
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lfg:btn:join').setLabel('Unisciti').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('lfg:btn:leave').setLabel('Lascia').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('lfg:btn:close').setLabel('Chiudi').setStyle(ButtonStyle.Secondary),
      );

      // Send to LFG channel if exists, otherwise current channel
      let targetChannel = interaction.guild.channels.cache.find((c) => {
        const n = c.name.toLowerCase();
        return (n.includes('lfg') || n.includes('cerca')) && c.type === ChannelType.GuildText;
      });
      if (!targetChannel) targetChannel = interaction.channel;

      const sent = await targetChannel.send({
        content: role ? `<@&${role.id}>` : null,
        embeds: [embed],
        components: [row],
        allowedMentions: { roles: role ? [role.id] : [] },
      });

      await createSession({
        guildId: interaction.guild.id,
        messageId: sent.id,
        channelId: targetChannel.id,
        captainId: interaction.user.id,
        gameName: game.name,
        gameCode: game.code,
        mode: 'Qualsiasi',
        slots,
        notes: 'Sessione rapida',
      });

      await interaction.reply({ embeds: [successEmbed(`Sessione creata in ${targetChannel}!`)], flags: 64 });
    }

    if (sub === 'who') {
      await interaction.deferReply({ flags: 64 });

      // Get all users with this game role
      const role = interaction.guild.roles.cache.get(game.role_id);
      if (!role) {
        return interaction.editReply({ embeds: [errorEmbed('Ruolo non configurato per questo gioco.')] });
      }

      const onlineMembers = [...role.members.values()]
        .filter((m) => !m.user.bot && m.presence?.status !== 'offline')
        .sort((a, b) => {
          const sa = a.presence?.status === 'online' ? 0 : a.presence?.status === 'idle' ? 1 : 2;
          const sb = b.presence?.status === 'online' ? 0 : b.presence?.status === 'idle' ? 1 : 2;
          return sa - sb;
        });

      const offlineCount = role.members.filter((m) => !m.user.bot && (m.presence?.status === 'offline' || !m.presence)).size;

      const statusIcon = (s) => s === 'online' ? '🟢' : s === 'idle' ? '🟡' : s === 'dnd' ? '🔴' : '⚫';

      const memberList = onlineMembers.slice(0, 25).map((m) => {
        const activity = m.presence?.activities?.find((a) => a.type !== 4); // Exclude custom status
        const activityText = activity ? ` — ${activity.name}` : '';
        return `${statusIcon(m.presence?.status)} <@${m.id}>${activityText}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${game.name} — Giocatori Online`)
        .setColor(0x8b0000)
        .setDescription(
          `**Online:** ${onlineMembers.length} | **Offline:** ${offlineCount} | **Totale:** ${role.members.size}\n\n` +
          (memberList || 'Nessuno online al momento.')
        )
        .setFooter({ text: 'Bloods Community • /session who' });

      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'voice') {
      const category = interaction.guild.channels.cache.get(game.category_id);
      if (!category) {
        return interaction.reply({ embeds: [errorEmbed('Categoria non configurata per questo gioco.')], flags: 64 });
      }

      const voiceChannels = interaction.guild.channels.cache
        .filter((c) => c.parentId === category.id && (c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice))
        .sort((a, b) => a.position - b.position);

      if (voiceChannels.size === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun canale vocale per questo gioco.')], flags: 64 });
      }

      const voiceInfo = voiceChannels.map((vc) => {
        const members = vc.members.size;
        const max = vc.userLimit || '∞';
        const memberList = vc.members.size > 0
          ? vc.members.map((m) => `<@${m.id}>`).join(', ')
          : 'Vuoto';
        const bitrate = vc.bitrate / 1000;
        return `🔊 **${vc.name}** (${members}/${max} | ${bitrate}kbps)\n  ${memberList}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${game.name} — Canali Vocali`)
        .setColor(0x8b0000)
        .setDescription(voiceInfo)
        .setFooter({ text: 'Bloods Community • /session voice' });

      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'tips') {
      // Game-specific tips
      const tips = getGameTips(game.code);
      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${game.name} — Consigli Utili`)
        .setColor(0x8b0000)
        .setDescription(tips.map((t, i) => `**${i + 1}.** ${t}`).join('\n\n'))
        .addFields({
          name: '🔗 Link Utili',
          value: getGameLinks(game.code),
          inline: false,
        })
        .setFooter({ text: 'Bloods Community • /session tips' });

      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  },

  async autocomplete(interaction) {
    const games = await Game.findAll({ where: { is_active: true }, attributes: ['code', 'name'], raw: true });
    const focused = interaction.options.getFocused().toLowerCase();
    const filtered = games
      .filter((g) => g.name.toLowerCase().includes(focused) || g.code.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((g) => ({ name: g.name, value: g.code }));
    await interaction.respond(filtered);
  },
};

function getGameTips(code) {
  const tips = {
    wow: [
      'Per le incursioni, controlla sempre il tuo equipaggiamento prima di iniziare.',
      'Usa il comando /bp per gestire i tuoi punti DKP.',
      'Verifica i requisiti incursione con /raidstatus prima di iscriverti.',
      'Il raid scheduler invia promemoria automatici 1 ora prima di ogni evento.',
    ],
    valorant: [
      'Comunica sempre la posizione dei nemici ai compagni.',
      'Usa le abilità ultimate in coordinazione con il team.',
      'Controlla il meta attuale con /gamemeta valorant.',
      'Per ranked, assicurati di avere almeno 2 agenti che sai giocare bene.',
    ],
    lol: [
      'Controlla il patch note con /gamemeta lol prima di giocare ranked.',
      'Comunica sempre i cooldown delle abilità al team.',
      'Usa il /lfg per trovare compagni prima di iniziare ranked.',
      'Verifica i tuoi stats con /mystats dopo aver collegato l\'account Riot.',
    ],
    csgo: [
      'Pratica il tiro al bersaglio prima delle partite competitive.',
      'Comunica sempre le informazioni sui nemici ai compagni.',
      'Imposta il crosshair e la sensibilità ottimali per il tuo stile.',
    ],
    apex: [
      'Landing coordinato: scegli sempre un punto di atterraggio con il team.',
      'Comunica le posizioni dei nemici e il loot disponibile.',
      'Usa le abilità dei legend in modo strategico, non sprecarle.',
    ],
    minecraft: [
      'Costruisci una base sicura prima del primo giorno.',
      'Mantieni sempre torce e cibo nell\'inventario.',
      'Per i server community, rispetta le regole di costruzione.',
    ],
    ffxiv: [
      'Completa le missioni principali per sbloccare i dungeon.',
      'Unisciti a una Free Company per bonus e community.',
      'Usa il Duty Finder per trovare gruppi per dungeon e raid.',
    ],
    dota2: [
      'Comunica sempre i cooldown delle abilità e degli oggetti.',
      'Controlla la mappa regolarmente per evitare gank.',
      'Adatta il build agli eroi nemici, non usare sempre lo stesso.',
    ],
  };
  return tips[code] || [
    'Comunica sempre con il tuo team durante le partite.',
    'Usa /lfg per trovare compagni di gioco.',
    'Controlla /gamemeta per news e aggiornamenti del gioco.',
    'Collega il tuo account esterno con /link per tracciare le statistiche.',
  ];
}

function getGameLinks(code) {
  const links = {
    wow: '[Wowhead](https://www.wowhead.com) | [Raider.IO](https://raider.io) | [Logs](https://www.warcraftlogs.com)',
    valorant: '[Tracker](https://tracker.gg/valorant) | [Patch Notes](https://playvalorant.com/it-it/news/)',
    lol: '[OP.GG](https://op.gg) | [U.GG](https://u.gg) | [Patch Notes](https://www.leagueoflegends.com/it-it/news/',
    csgo: '[HLTV](https://www.hltv.org) | [Tracker](https://tracker.gg/csgo)',
    apex: '[Tracker](https://apex.tracker.gg) | [Patch Notes](https://www.ea.com/it-it/games/apex-legends/news)',
    minecraft: '[Wiki](https://minecraft.wiki) | [Server Status](https://minecraft.net)',
    ffxiv: '[Garland Tools](https://garlandtools.org) | [XIVAPI](https://xivapi.com)',
    dota2: '[Dotabuff](https://dotabuff.com) | [STRATZ](https://stratz.com)',
  };
  return links[code] || 'Usa /gamemeta per le ultime news su questo gioco.';
}
