// src/commands/help.js
// /help — list all available commands for the user, grouped by category.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embed');

const COMMAND_GROUPS = [
  {
    name: '🎮 Giochi & Community',
    commands: [
      { name: '/mygames', desc: 'Mostra i giochi a cui sei iscritto e come modificarli.' },
      { name: '/mystats [user]', desc: 'Profilo completo: statistiche, giochi, XP, badge, account collegati.' },
      { name: '/rank [user]', desc: 'Mostra livello, XP, badge e posizione classifica.' },
      { name: '/leaderboard [game] [metric]', desc: 'Classifiche per gioco o attività Discord.' },
      { name: '/stats', desc: 'Statistiche generali della community.' },
      { name: '/serverinfo', desc: 'Informazioni complete sul server.' },
      { name: '/gamemeta <game>', desc: 'Patch notes, meta o stato server di un gioco.' },
    ],
  },
  {
    name: '🎯 Eventi & LFG',
    commands: [
      { name: '/event create', desc: 'Crea un evento community (admin).' },
      { name: '/event list', desc: 'Lista prossimi eventi.' },
      { name: '/event info <id>', desc: 'Dettagli e partecipanti di un evento.' },
      { name: '/lfg <gioco>', desc: 'Cerca compagni di gioco (Looking For Group).' },
      { name: '/poll <domanda>', desc: 'Crea un sondaggio con reazioni emoji.' },
      { name: '/suggest <testo>', desc: 'Proponi un suggerimento per la community.' },
    ],
  },
  {
    name: '🔗 Account Esterni',
    commands: [
      { name: '/link <provider> <id>', desc: 'Collega il tuo account Steam, Battle.net o Riot.' },
      { name: '/refreshstats [user]', desc: 'Aggiorna le statistiche dai servizi esterni.' },
    ],
  },
  {
    name: '🛡️ Moderazione (richiede permessi)',
    commands: [
      { name: '/userinfo <user>', desc: 'Info dettagliate su un membro.' },
      { name: '/purge <n> [user]', desc: 'Cancella bulk messaggi.' },
      { name: '/warn <user> <motivo>', desc: 'Assegna un warning (con ruolo + escalation automatica).' },
      { name: '/clearwarn <user>', desc: 'Rimuove tutti i warning e il ruolo "Warned".' },
      { name: '/warnings <user>', desc: 'Storico warning di un membro.' },
      { name: '/mute <user> <durata>', desc: 'Muta (timeout) un membro.' },
      { name: '/unmute <user>', desc: 'Rimuove il timeout da un membro.' },
    ],
  },
  {
    name: '🛠️ Utility',
    commands: [
      { name: '/ping', desc: 'Verifica che il bot sia online.' },
      { name: '/help', desc: 'Mostra questo messaggio.' },
    ],
  },
  {
    name: '⚙️ Admin (richiede ruolo Bloods Admin)',
    commands: [
      { name: '/setup run', desc: 'Configura il server (onboarding, community hub, legacy).' },
      { name: '/setup status', desc: 'Mostra lo stato della configurazione.' },
      { name: '/game add <code> <name>', desc: 'Aggiungi un nuovo gioco con ruolo e categoria.' },
      { name: '/game list', desc: 'Elenca tutti i giochi registrati.' },
      { name: '/game remove <code>', desc: 'Disattiva un gioco (lo nasconde dal pannello).' },
      { name: '/game update <code>', desc: 'Aggiorna ruolo/categoria di un gioco.' },
      { name: '/rolepanel', desc: 'Pubblica o aggiorna il pannello di selezione giochi.' },
      { name: '/gamemode add', desc: 'Aggiungi un server privato della community.' },
      { name: '/gamemode list', desc: 'Lista dei server privati.' },
      { name: '/gamemode post', desc: 'Pubblica/aggiorna il pannello #gamemode.' },
      { name: '/giveaway create', desc: 'Crea un giveaway con premio e durata.' },
      { name: '/giveaway list', desc: 'Lista giveaway attivi.' },
      { name: '/giveaway end <id>', desc: 'Termina un giveaway in anticipo.' },
      { name: '/tempvc setup <canale>', desc: 'Imposta canale creatore per vocali temporanei.' },
      { name: '/tempvc status', desc: 'Stato canali vocali temporanei.' },
      { name: '/cmd add <nome> <risposta>', desc: 'Crea un comando personalizzato (!nome).' },
      { name: '/cmd list', desc: 'Lista comandi personalizzati.' },
      { name: '/cmd remove <nome>', desc: 'Rimuovi un comando personalizzato.' },
      { name: '/schedule add', desc: 'Crea un messaggio programmato (cron).' },
      { name: '/schedule list', desc: 'Lista messaggi programmati.' },
      { name: '/schedule remove <id>', desc: 'Rimuovi un messaggio programmato.' },
      { name: '/schedule toggle <id>', desc: 'Attiva/disattiva un messaggio.' },
      { name: '/dashboard', desc: 'Link e info sulla dashboard web.' },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra tutti i comandi disponibili.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Guida ai comandi — Bloods Hub Bot')
      .setColor(0x8b0000)
      .setDescription(
        'Benvenuto nella community multigioco dei **Bloods**!\n' +
        'Ecco tutti i comandi disponibili, raggruppati per categoria.'
      )
      .setFooter({ text: 'Bloods Community • /help' });

    for (const group of COMMAND_GROUPS) {
      embed.addFields({
        name: group.name,
        value: group.commands.map((c) => `**${c.name}** — ${c.desc}`).join('\n'),
        inline: false,
      });
    }

    embed.addFields({
      name: '🎯 Come unirsi ai giochi',
      value: 'Vai nel canale <#' + (require('../config').channels.rolePanel || '𝔰𝔠𝔢𝔤𝔩𝔦-𝔤𝔦𝔬𝔠𝔥𝔦') + '> e usa il menu a tendina per selezionare i giochi.',
      inline: false,
    });

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};
