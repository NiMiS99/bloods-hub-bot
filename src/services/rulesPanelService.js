// src/services/rulesPanelService.js
// Interactive rules panel in #Regolamento — buttons to show each section.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const RULES_CHANNEL_ID = '1013413920679149610';

const CID = {
  intro: 'rules:intro',
  gradi: 'rules:gradi',
  comportamento: 'rules:comportamento',
  discord: 'rules:discord',
  raid: 'rules:raid',
  reclutamento: 'rules:reclutamento',
  accettazione: 'rules:accettazione',
};

const SECTIONS = {
  intro: {
    title: 'Benvenuto nei Bloods',
    color: 0x8b0000,
    body: [
      '**Benvenuto nei Bloods!**',
      '',
      'La Gilda è stata fondata con dei punti cardine che non verranno modificati in futuro, per garantire la continuità della gilda stessa e un ambiente sereno per tutti.',
      '',
      'La gilda nasce il **20/09/2025** con l\'intent di creare un posto di condivisione tra giocatori, senza porre limiti alle attività di Gilda, un posto dove chiunque può essere se stesso ma nel rispetto reciproco, creando spazi per ognuno di noi e per tutte le nostre attività.',
      '',
      'Il **04/01/2026** viene fondata la gilda **Bloods Accademy**, nata con l\'intent di raggruppare giocatori interessati ad apprendere le basi del gioco oppure per giocare in completa tranquillità senza impegno.',
      '',
      'Le gilde sono **"soft progress"**: questo significa un approccio più tollerante, meno impegnativo e stressante nel gioco rispetto ad altri tipi di gilde (hardcore), però mantenendo lo stesso una mentalità rivolta al progresso di gilda.',
      '',
      'Per questo ci sono comunque richieste da soddisfare per accedere a certi contenuti di gilda, anche se minime. Si chiede sempre di rispettare le regole e i tempi organizzativi delle varie attività.',
      '',
      '**La piattaforma Discord è OBBLIGATORIA** per essere considerati per le attività di gilda.',
    ].join('\n'),
  },
  gradi: {
    title: 'Gradi della Gilda Bloods',
    color: 0x8b0000,
    body: [
      '**1. OWNER** — Proprietario della gilda. Prende le decisioni più importanti, è l\'unico incaricato a raccogliere i voti validi per l\'espulsione di un membro.',
      '',
      '**2. FOUNDER** — Co-fondatori. Si occupano insieme all\'Owner delle decisioni più importanti. Possono avanzare proposte di espulsione e di revisione del regolamento.',
      '',
      '**3. CONSIGLIERE** — Coordinano gli Officer. Possono avanzare richieste di avanzamento/retrocessione di ruolo, effettuare richieste dirette di espulsione o ammonizioni.',
      '',
      '**4. OFFICER** — Coordina, accompagna ed agevola una sana convivenza tra i giocatori. Non ha potere decisionale su espulsioni/ammonizioni ma segnala problemi all\'Owner/Founder/Consigliere.',
      '',
      '**5. OFFICER RECLUTAMENTO** — Si occupa esclusivamente del reclutamento. Non ha potere decisionale ma segnala problemi sociali.',
      '',
      '**6. RAID LEADER** — Gestisce direttamente il raid, tra cui la spiegazione delle tattiche. Assegnato in base alla capacità di creare armonia tra i membri del roster.',
      '',
      '**7. RAIDER** — Membri che partecipano attivamente ai vari raid settimanali organizzati dalla gilda.',
      '',
      '**8. MEMBRO** — Grado di partenza, assegnato a tutti i nuovi giocatori di gilda.',
    ].join('\n'),
  },
  comportamento: {
    title: '1. Comportamento',
    color: 0x8b0000,
    body: [
      '- Il **rispetto reciproco** è SEMPRE OBBLIGATORIO in ogni situazione.',
      '- Sono vietati flame, insulti, discriminazioni e qualsiasi comportamento tossico.',
      '- Sono vietati spam e propagande di qualsiasi genere.',
      '',
      '**c1.** E\' severamente vietato da parte di QUALUNQUE gildano criticare e/o commentare in maniera offensiva un altro membro.',
      '**c2.** E\' vietato deridere in maniera vessatoria altri membri a causa di motivi videoludici o personali.',
      '**c3.** Qualunque commento rivolto nei confronti di un altro gildano dev\'essere fatto ed espresso seguendo il buon senso e l\'educazione.',
      '**c4.** In quanto Gilda Soft-Progress, non è permesso porre in essere comportamenti tossici a seguito di wipes per colpa di un player.',
      '**c5.** E\' punito anche il gildano che, intenzionalmente interferisce con il progress (seppur minimo) della gilda, attraverso azioni e/o omissioni.',
      '**c6.** E\' vietato criticare, sminuire e/o prendersi gioco di un membro che non è online e in Discord, senza avere opportunità di replica.',
    ].join('\n'),
  },
  discord: {
    title: '2. Discord',
    color: 0x8b0000,
    body: [
      '**E\' OBBLIGATORIO** per tutte le attività di gilda.',
      '',
      '**c1.** Al primo accesso al server discord, lo staff modificherà il nickname seguendo il pattern:',
      '`NOME MAIN PG - NOME ANAGRAFICO - RUOLO (TANK/DPS/HEALER)`',
      'Possono essere associati più ruoli ad una singola persona, tuttavia non possono essere associati più di un PG alla volta.',
      '',
      '**c2.** Se per forza maggiore un gildano è impossibilitato ad entrare in Discord durante un raid, dovrà darne notizia **PRIMA DI ESSERE GRUPPATO** allo staff.',
      '',
      '**c3.** Qualunque membro gildato avrà a disposizione fino al **mercoledì successivo** al suo ingresso per entrare in Discord. In caso di mancato accesso il membro è da ritenersi espulso.',
      '',
      '**c4.** Lo staff imposterà nelle "Note riservate agli Officer" la data di ingresso con la dicitura "DISCORD W8". Durante il check settimanale, chi non è riconoscibile o ha questa dicitura è da ritenersi espulso.',
      '',
      '**c5.** In ogni momento e situazione all\'interno del Discord sono applicate le regole sul comportamento (c1-c6).',
    ].join('\n'),
  },
  raid: {
    title: '3. Gestione Raid Settimanali',
    color: 0x8b0000,
    body: [
      'La gestione dei **RAID SETTIMANALI** è affidata esclusivamente al **RAID LEADER**, il quale si dovrà occupare di organizzare di volta in volta i vari raid.',
      '',
      '**c1.** Una volta designato il giorno e l\'orario, gli organizzatori dovranno pubblicare i dettagli nella **"Prenotazione - Incursioni"** presente sul server Discord.',
      '',
      '**c2.** Senza eccezioni, il gildano interessato a partecipare al raid dovrà indicarlo nella sezione **"Prenotazione - Incursioni"**. La **MANCATA ISCRIZIONE** verrà considerata come assenza.',
      '',
      '**c3.** Nella sezione "Prenotazione - Incursioni" dovrà anche essere indicata un\'eventuale assenza e/o ritardo nel raid settimanale.',
      '',
      '**c4.** Il sistema dei loot all\'interno del gruppo raid verrà gestito attraverso un sistema di **BLOODS POINTS** i quali verranno assegnati di volta in volta a tutti i player che parteciperanno alle varie incursioni.',
    ].join('\n'),
  },
  reclutamento: {
    title: '4. Reclutamento',
    color: 0x8b0000,
    body: [
      'Una volta reclutato un nuovo giocatore, il reclutatore **DEVE OBBLIGATORIAMENTE** svolgere un breve colloquio per verificare l\'effettivo interesse alla gilda.',
      '',
      '**Domande da porre:**',
      '1. Da quanto tempo giochi a World of Warcraft?',
      '2. Hai fatto parte di altre gilde in passato?',
      '3. Se sì, quali?',
      '4. In che ruolo avresti intenzione di giocare?',
      '5. Quanti personaggi hai sul tuo account?',
      '6. Qual è il tuo personaggio principale? (bisogna sempre gildare il main)',
      '7. Hai altri personaggi su altre gilde?',
      '8. Nella tua vecchia gilda che ruolo occupavi?',
      '9. Come mai hai lasciato la vecchia gilda?',
      '10. Nella season attuale qual è il tuo progress?',
      '11. Hai intenzione di partecipare ai raid di gilda?',
      '',
      'Tutti i gradi con potere di gildare sono esortati a partecipare attivamente al reclutamento e a porre queste domande per verificare l\'idoneità dei membri.',
    ].join('\n'),
  },
  accettazione: {
    title: 'Accettazione del Regolamento',
    color: 0x8b0000,
    body: [
      'Entrando a far parte della gilda **BLOODS** o **BLOODS ACCADEMY** si accetta **INTEGRALMENTE** il regolamento di cui sopra, rispettando i vari punti esposti.',
      '',
      'Tutti i membri di gilda sono esortati a leggere e comprendere ogni punto del regolamento. In caso di dubbi o domande, ci si può rivolgere all\'**Owner**, ai **Founder** o ai **Consiglieri**.',
      '',
      'Qualsiasi modifica da apportare al regolamento di gilda, integrazione o aggiunta può essere proposta ed effettuata **ESCLUSIVAMENTE dall\'Owner e dai Founder** di comune accordo.',
      '',
      '**Documento originale:** [Regolamento Bloods](https://docs.google.com/document/d/1bDJi7S7fEDU-OygikDWXU2oKW6cPajn9_fJrSxf3Dtg/edit?usp=sharing)',
    ].join('\n'),
  },
};

/**
 * Post the interactive rules panel in #Regolamento.
 */
async function postRulesPanel(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  const channel = guild.channels.cache.get(RULES_CHANNEL_ID);
  if (!channel) {
    logger.warn('RulesPanel: rules channel not found.');
    return;
  }

  // Clear old bot messages
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const oldBotMsgs = messages.filter((m) => m.author.id === client.user.id);
    if (oldBotMsgs.size > 0) await channel.bulkDelete(oldBotMsgs).catch(() => {});
  } catch {}

  // Main panel with buttons
  const embed = new EmbedBuilder()
    .setTitle('📜 Regolamento Bloods')
    .setColor(0x8b0000)
    .setDescription(
      '**Benvenuto nel regolamento ufficiale dei Bloods!**\n\n' +
      'Clicca un bottone qui sotto per leggere la sezione che ti interessa.\n' +
      'Il contenuto è identico al [documento ufficiale](https://docs.google.com/document/d/1bDJi7S7fEDU-OygikDWXU2oKW6cPajn9_fJrSxf3Dtg/edit?usp=sharing).\n\n' +
      '**Sezioni:**\n' +
      '• **Intro** — presentazione della gilda\n' +
      '• **Gradi** — gerarchia della gilda\n' +
      '• **Comportamento** — regole di condotta\n' +
      '• **Discord** — regole Discord\n' +
      '• **Raid** — gestione raid settimanali\n' +
      '• **Reclutamento** — processo di reclutamento\n' +
      '• **Accettazione** — accettazione del regolamento'
    )
    .setFooter({ text: 'Bloods Hub · Regolamento Interattivo · Coerente al documento ufficiale' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CID.intro).setLabel('Intro').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CID.gradi).setLabel('Gradi').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CID.comportamento).setLabel('Comportamento').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CID.discord).setLabel('Discord').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CID.raid).setLabel('Raid').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CID.reclutamento).setLabel('Reclutamento').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CID.accettazione).setLabel('Accettazione').setStyle(ButtonStyle.Success),
  );

  await channel.send({ embeds: [embed], components: [row1, row2] });
  logger.info('RulesPanel: interactive rules panel posted.');
}

/**
 * Handle rules button click — show the section as ephemeral.
 */
async function handleButton(interaction) {
  // customId is "rules:general" — extract the section key
  const key = interaction.customId.split(':')[1];
  const section = SECTIONS[key];
  if (!section) {
    await interaction.reply({ content: 'Sezione non trovata.', flags: 64 });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(section.title)
    .setColor(section.color)
    .setDescription(section.body.slice(0, 4000))
    .setFooter({ text: 'Bloods Hub · Regolamento' });

  await interaction.reply({ embeds: [embed], flags: 64 });
}

module.exports = { CID, postRulesPanel, handleButton };
