// src/commands/help.js
// /help — dynamically lists all available commands grouped by category.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

// Command metadata — kept in sync with actual registered commands.
// Updated automatically when new commands are added.
const COMMAND_GROUPS = [
  {
    name: '🎮 Giochi & Community',
    emoji: '🎮',
    commands: [
      { name: '/mygames', desc: 'Mostra i giochi a cui sei iscritto e come modificarli.' },
      { name: '/mystats [user]', desc: 'Profilo completo: statistiche, giochi, XP, badge, account collegati.' },
      { name: '/rank [user]', desc: 'Mostra livello, XP, badge e posizione classifica.' },
      { name: '/rankcard [user]', desc: 'Genera un\'immagine della tua carta rank.' },
      { name: '/leaderboard [game] [metric]', desc: 'Classifiche per gioco o attività Discord.' },
      { name: '/stats', desc: 'Statistiche generali della community.' },
      { name: '/serverstats', desc: 'Statistiche server con grafici attività.' },
      { name: '/serverinfo', desc: 'Informazioni complete sul server.' },
      { name: '/members [ruolo]', desc: 'Lista membri per ruolo.' },
      { name: '/gamemeta <game>', desc: 'Patch notes, meta o stato server di un gioco.' },
      { name: '/gameroles', desc: 'Mostra i ruoli di gioco disponibili e i loro membri.' },
      { name: '/music play <titolo>', desc: 'Riproduci musica da YouTube/Spotify in vocale.' },
      { name: '/music skip/stop/queue', desc: 'Controlla la riproduzione musicale.' },
    ],
  },
  {
    name: '🎯 Eventi & LFG',
    emoji: '🎯',
    commands: [
      { name: '/event create', desc: 'Crea un evento community (admin).' },
      { name: '/event list', desc: 'Lista prossimi eventi.' },
      { name: '/event info <id>', desc: 'Dettagli e partecipanti di un evento.' },
      { name: '/lfg <gioco>', desc: 'Cerca compagni di gioco (Looking For Group).' },
      { name: '/lfg list', desc: 'Lista sessioni LFG attive.' },
      { name: '/poll <domanda>', desc: 'Crea un sondaggio con reazioni emoji e scadenza.' },
      { name: '/suggest <testo>', desc: 'Proponi un suggerimento per la community.' },
    ],
  },
  {
    name: '🔗 Account Esterni',
    emoji: '🔗',
    commands: [
      { name: '/link <provider> <id>', desc: 'Collega il tuo account Steam, Battle.net o Riot.' },
      { name: '/refreshstats [user]', desc: 'Aggiorna le statistiche dai servizi esterni.' },
    ],
  },
  {
    name: '🎁 Community Features',
    emoji: '🎁',
    commands: [
      { name: '/remind <quando> <cosa>', desc: 'Imposta un promemoria personale.' },
      { name: '/remind list', desc: 'Lista dei tuoi promemoria attivi.' },
      { name: '/birthday set <data>', desc: 'Imposta il tuo compleanno.' },
      { name: '/birthday list', desc: 'Lista compleanni del mese.' },
      { name: '/starboard setup', desc: 'Configura la starboard (admin).' },
      { name: '/reactionrole create', desc: 'Crea un pannello reaction roles (admin).' },
      { name: '/hobbies', desc: 'Crea un pannello self-role per hobby/interessi (admin).' },
      { name: '/autothread enable', desc: 'Abilita auto-thread in un canale (admin).' },
    ],
  },
  {
    name: '🛡️ Moderazione (richiede permessi)',
    emoji: '🛡️',
    commands: [
      { name: '/userinfo <user>', desc: 'Info dettagliate su un membro.' },
      { name: '/purge <n> [user]', desc: 'Cancella bulk messaggi.' },
      { name: '/warn <user> <motivo>', desc: 'Assegna un warning (con ruolo + escalation automatica).' },
      { name: '/clearwarn <user>', desc: 'Rimuove tutti i warning e il ruolo "Warned".' },
      { name: '/warnings <user>', desc: 'Storico warning di un membro.' },
      { name: '/mute <user> <durata>', desc: 'Muta (timeout) un membro.' },
      { name: '/unmute <user>', desc: 'Rimuove il timeout da un membro.' },
      { name: '/slowmode <canale> <secondi>', desc: 'Imposta slowmode su un canale.' },
      { name: '/lockdown [stato]', desc: 'Attiva/disattiva lockdown del server.' },
    ],
  },
  {
    name: '🛠️ Utility',
    emoji: '🛠️',
    commands: [
      { name: '/ping', desc: 'Verifica che il bot sia online.' },
      { name: '/help [categoria]', desc: 'Mostra questo messaggio o una categoria specifica.' },
      { name: '/dashboard', desc: 'Link e info sulla dashboard web.' },
    ],
  },
  {
    name: '⚙️ Admin (richiede ruolo Bloods Admin)',
    emoji: '⚙️',
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
      { name: '/xpevent start <mult> <ore>', desc: 'Avvia un evento XP moltiplicatore.' },
      { name: '/xpevent status', desc: 'Stato evento XP attivo.' },
      { name: '/xpevent stop', desc: 'Ferma evento XP attivo.' },
      { name: '/config view', desc: 'Mostra la configurazione del bot.' },
      { name: '/config levelup', desc: 'Imposta canale e messaggio level-up.' },
      { name: '/config welcome', desc: 'Imposta il messaggio di benvenuto.' },
      { name: '/config announcements', desc: 'Imposta il canale annunci.' },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra tutti i comandi disponibili.')
    .addStringOption((o) =>
      o.setName('categoria').setDescription('Mostra solo una categoria specifica.').setRequired(false).setMaxLength(100)
        .addChoices(
          { name: '🎮 Giochi & Community', value: 'games' },
          { name: '🎯 Eventi & LFG', value: 'events' },
          { name: '🔗 Account Esterni', value: 'accounts' },
          { name: '🎁 Community Features', value: 'community' },
          { name: '🛡️ Moderazione', value: 'mod' },
          { name: '🛠️ Utility', value: 'utility' },
          { name: '⚙️ Admin', value: 'admin' },
        )),

  async execute(interaction) {
    const category = interaction.options.getString('categoria');

    if (category) {
      // Show specific category
      const _group = COMMAND_GROUPS.find((g) => g.name.includes(category) || categoryMap(category) === g);
      const targetGroup = categoryMap(category);
      if (targetGroup) {
        const embed = new EmbedBuilder()
          .setTitle(`${targetGroup.emoji} ${targetGroup.name}`)
          .setColor(0x8b0000)
          .setDescription(targetGroup.commands.map((c) => `**${c.name}** — ${c.desc}`).join('\n'))
          .setFooter({ text: 'Bloods Community • /help' });
        return interaction.reply({ embeds: [embed], flags: 64 });
      }
    }

    // Show overview with select menu
    const embed = new EmbedBuilder()
      .setTitle('📖 Guida ai comandi — Bloods Hub Bot')
      .setColor(0x8b0000)
      .setDescription(
        'Benvenuto nella community multigioco dei **Bloods**!\n' +
        `Hai accesso a **${COMMAND_GROUPS.reduce((a, g) => a + g.commands.length, 0)} comandi** in ${COMMAND_GROUPS.length} categorie.\n\n` +
        'Usa il menu qui sotto per esplorare una categoria, oppure usa `/help <categoria>`.'
      )
      .addFields(
        COMMAND_GROUPS.map((g) => ({
          name: `${g.emoji} ${g.name}`,
          value: `${g.commands.length} comandi — usa \`/help ${g.name.split(' ')[0].replace(/[^\w]/g, '')}\` per dettagli`,
          inline: true,
        }))
      )
      .addFields({
        name: '🎯 Come unirsi ai giochi',
        value: 'Vai nel canale <#' + (config.channels.rolePanel || 'selezione-giochi') + '> e usa il menu a tendina per selezionare i giochi.',
        inline: false,
      })
      .setFooter({ text: 'Bloods Community • /help' });

    const select = new StringSelectMenuBuilder()
      .setCustomId('help:select')
      .setPlaceholder('Scegli una categoria...')
      .addOptions(COMMAND_GROUPS.map((g) => ({
        label: g.name,
        value: g.name,
        emoji: g.emoji,
        description: `${g.commands.length} comandi disponibili`,
      })));

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  },

  // Export for interaction handler
  COMMAND_GROUPS,
};

function categoryMap(key) {
  const map = {
    games: COMMAND_GROUPS[0],
    events: COMMAND_GROUPS[1],
    accounts: COMMAND_GROUPS[2],
    community: COMMAND_GROUPS[3],
    mod: COMMAND_GROUPS[4],
    utility: COMMAND_GROUPS[5],
    admin: COMMAND_GROUPS[6],
  };
  return map[key];
}
