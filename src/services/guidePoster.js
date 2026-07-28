// src/services/guidePoster.js
// Posts and auto-refreshes guide messages (embed + emoji) in key channels:
//   • game_selection — explains how to pick games via the select menu
//   • generale       — welcome message in each game's #generale
//   • composizioni   — explains what the #composizioni channel is for
//   • news           — explains that #news is auto-fed by the bot
//
// Messages are tracked in the GuideMessage table so they can be edited
// in-place (auto-refresh) rather than re-posted.
const { EmbedBuilder, ChannelType } = require('discord.js');
const { Game, Guild, GuideMessage } = require('../db');
const logger = require('../utils/logger');
const { toFraktur } = require('../utils/textFormatter');

const COLORS = {
  blue: 0x3498db,
  green: 0x2ecc71,
  orange: 0xe67e22,
  purple: 0x9b59b6,
  red: 0xe74c3c,
  gold: 0xf1c40f,
};

class GuidePoster {
  constructor(client) {
    this.client = client;
    this.interval = null;
  }

  start() {
    // Refresh daily at 6:00 AM + immediately on start (after 30s delay)
    setTimeout(() => this.refreshAll().catch((e) => logger.warn(`GuidePoster initial: ${e.message}`)), 30000);
    this.interval = setInterval(
      () => this.refreshAll().catch((e) => logger.warn(`GuidePoster refresh: ${e.message}`)),
      24 * 60 * 60 * 1000
    );
    logger.info('GuidePoster started (daily refresh).');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async refreshAll() {
    for (const guild of this.client.guilds.cache.values()) {
      await this.postForGuild(guild).catch((e) =>
        logger.warn(`GuidePoster guild ${guild.id}: ${e.message}`)
      );
    }
  }

  async postForGuild(guild) {
    try {
      const guildRow = await Guild.findOne({ where: { guild_id: guild.id } });
      if (!guildRow) return;

      await guild.channels.fetch();
      const games = await Game.findAll({ where: { is_active: true } });

      // 1. Game selection channel
      if (guildRow.role_selection_channel_id) {
        try {
          const ch = guild.channels.cache.get(guildRow.role_selection_channel_id);
          if (ch) await this.postOrUpdate(guild, ch, 'game_selection', null, this.gameSelectionEmbed(games));
        } catch (e) { logger.warn(`GuidePoster game_selection: ${e.message}`); }
      }

    // 1b. Comandi-Bot channel (find by name)
    try {
      const comandiBot = [...guild.channels.cache.values()].find(
        (c) => c.type === 0 && c.name.includes('𝖢𝗈𝗆𝖺𝗇𝖽𝗂-𝖡𝗈𝗍')
      );
      if (comandiBot) await this.postOrUpdate(guild, comandiBot, 'comandi', null, this.comandiEmbed());
    } catch (e) { logger.warn(`GuidePoster comandi: ${e.message}`); }

    // 1c. Gilda channels — search globally by name (channels may be in sub-categories)
    const allText = [...guild.channels.cache.values()].filter((c) => c.type === 0);

    try {
      const comunicazioniGilda = allText.find(
        (c) => c.name.includes('📣') && c.name.includes('𝖢𝗈𝗆𝗎𝗇𝗂𝖼𝖺𝗓𝗂𝗈𝗇𝗂') && !c.name.includes('𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒')
      );
      if (comunicazioniGilda) await this.postOrUpdate(guild, comunicazioniGilda, 'comunicazioni_gilda', null, this.comunicazioniGildaEmbed());
    } catch (e) { logger.warn(`GuidePoster comunicazioni_gilda: ${e.message}`); }

    try {
      const avvisiGilda = allText.find((c) => c.name.includes('𝖠𝗏𝗏𝗂𝗌𝗂-𝖦𝗂𝗅𝖽𝖺'));
      if (avvisiGilda) await this.postOrUpdate(guild, avvisiGilda, 'avvisi_gilda', null, this.avvisiGildaEmbed());
    } catch (e) { logger.warn(`GuidePoster avvisi_gilda: ${e.message}`); }

    try {
      const annunciGilda = allText.find((c) => c.name.includes('𝖠𝗇𝗇𝗎𝗇𝖼𝗂-𝖦𝗂𝗅𝖽𝖺'));
      if (annunciGilda) await this.postOrUpdate(guild, annunciGilda, 'annunci_gilda', null, this.annunciGildaEmbed());
    } catch (e) { logger.warn(`GuidePoster annunci_gilda: ${e.message}`); }

    // 1d. Prenotazioni channels — search globally
    try {
      const prenotazioniPvE = allText.find((c) => c.name.includes('𝖯𝗋𝖾𝗇𝗈𝗍𝖺𝗓𝗂𝗈𝗇𝖾-𝖨𝗇𝖼𝗎𝗋𝗌𝗂𝗈𝗇𝗂'));
      if (prenotazioniPvE) await this.postOrUpdate(guild, prenotazioniPvE, 'prenotazioni_pve', null, this.prenotazioniPvEEmbed());
    } catch (e) { logger.warn(`GuidePoster prenotazioni_pve: ${e.message}`); }

    try {
      const prenotazioniPvP = allText.find((c) => c.name.includes('𝖯𝗋𝖾𝗇𝗈𝗍𝖺𝗓𝗂𝗈𝗇𝖾-rbg'));
      if (prenotazioniPvP) await this.postOrUpdate(guild, prenotazioniPvP, 'prenotazioni_pvp', null, this.prenotazioniPvPEmbed());
    } catch (e) { logger.warn(`GuidePoster prenotazioni_pvp: ${e.message}`); }

    // 1e. Community channels — search globally
    try {
      const avvisiCommunity = allText.find((c) => c.name.includes('𝖠𝗏𝗏𝗂𝗌𝗂-𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒'));
      if (avvisiCommunity) await this.postOrUpdate(guild, avvisiCommunity, 'avvisi_community', null, this.avvisiCommunityEmbed());
    } catch (e) { logger.warn(`GuidePoster avvisi_community: ${e.message}`); }

    try {
      const annunciCommunity = allText.find((c) => c.name.includes('𝖠𝗇𝗇𝗎𝗇𝖼𝗂-𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒'));
      if (annunciCommunity) await this.postOrUpdate(guild, annunciCommunity, 'annunci_community', null, this.annunciCommunityEmbed());
    } catch (e) { logger.warn(`GuidePoster annunci_community: ${e.message}`); }

    // 2. Per-game guides
    for (const game of games) {
      try {
        if (!game.category_id) continue;
        const cat = guild.channels.cache.get(game.category_id);
        if (!cat) continue;

        const children = [...guild.channels.cache.values()].filter((c) => c.parentId === cat.id);

        const generale = children.find((c) => c.name.includes('💬'));
        if (generale) await this.postOrUpdate(guild, generale, 'generale', game.id, this.generaleEmbed(game));

        const composizioni = children.find((c) => c.name.includes('⚔️'));
        if (composizioni) await this.postOrUpdate(guild, composizioni, 'composizioni', game.id, this.composizioniEmbed(game));

        const news = children.find((c) => c.name.includes('📰'));
        if (news) await this.postOrUpdate(guild, news, 'news', game.id, this.newsEmbed(game));

        const comunicazioni = children.find(
          (c) => c.type === 0 && c.name.includes('📣') && c.name.includes('𝖢𝗈𝗆𝗎𝗇𝗂𝖼𝖺𝗓𝗂𝗈𝗇𝗂')
        );
        if (comunicazioni) await this.postOrUpdate(guild, comunicazioni, 'comunicazioni_game', game.id, this.comunicazioniGameEmbed(game));
      } catch (e) { logger.warn(`GuidePoster game ${game.code}: ${e.message}`); }
    }

    logger.info(`GuidePoster: refreshed messages for guild ${guild.id}.`);
    } catch (err) {
      logger.error(`GuidePoster postForGuild error: ${err.message}`);
    }
  }

  async postOrUpdate(guild, channel, guideType, gameId, embed) {
    try {
      const existing = await GuideMessage.findOne({
        where: {
          guild_id: guild.id,
          channel_id: channel.id,
          guide_type: guideType,
          game_id: gameId || null,
        },
      });

      if (existing) {
        // Try to edit the existing message
        try {
          const msg = await channel.messages.fetch(existing.message_id);
          if (msg && msg.author.id === this.client.user.id) {
            await msg.edit({ embeds: [embed] });
            return;
          }
        } catch {
          // Message was deleted — fall through to create a new one
        }
        // Message gone — delete the stale record and re-create
        await existing.destroy();
      }

      // Post new message
      const sent = await channel.send({ embeds: [embed] });
      await GuideMessage.create({
        guild_id: guild.id,
        channel_id: channel.id,
        message_id: sent.id,
        guide_type: guideType,
        game_id: gameId || null,
      });

      // Pin the message (best-effort)
      try { await sent.pin(); } catch { /* may lack permissions */ }
    } catch (err) {
      logger.warn(`GuidePoster postOrUpdate (${guideType}, #${channel.name}): ${err.message}`);
    }
  }

  // ================================================================
  //  Embed builders
  // ================================================================

  gameSelectionEmbed(games) {
    const gameList = games
      .map((g) => `• **${g.name}** — ${g.description || 'Gioco disponibile'}`)
      .join('\n');

    return new EmbedBuilder()
      .setTitle('🎮 ｜ Come scegliere i tuoi giochi')
      .setColor(COLORS.blue)
      .setDescription(
        'Benvenuto nel **Bloods Hub**! Qui puoi selezionare i giochi a cui sei interessato ' +
        'e ottenere automaticamente accesso ai canali dedicati.'
      )
      .addFields(
        {
          name: '📋 ｜ Come fare',
          value:
            '1. **Usa il menu a tendina** qui sotto per selezionare 1-3 giochi\n' +
            '2. **Riceverai automaticamente i ruoli** corrispondenti\n' +
            '3. **Vedrai i canali** dei giochi selezionati (generale, news, composizioni, vocali)\n' +
            '4. Per **rimuovere** un gioco, deselezionalo dal menu o usa il pulsante **Rimuovi tutto**',
          inline: false,
        },
        {
          name: '🎯 ｜ Giochi disponibili',
          value: gameList || 'Nessun gioco configurato.',
          inline: false,
        },
        {
          name: '💡 ｜ Cosa ottieni',
          value:
            '💬 **Generale** — chatta con altri giocatori\n' +
            '📰 **News** — patch notes e notizie automatiche\n' +
            '📣 **Comunicazioni** — annunci dello staff\n' +
            '⚔️ **Composizioni** — strategie e composizioni team\n' +
            '🔊 **Vocali** — canali vocali per giocare insieme',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub Bot · Seleziona i tuoi giochi qui sotto ⬇️' })
      .setTimestamp();
  }

  generaleEmbed(game) {
    return new EmbedBuilder()
      .setTitle(`💬 ｜ Benvenuto in ${game.name}`)
      .setColor(COLORS.green)
      .setDescription(
        `Questo è il canale **Generale** di **${game.name}**.\n` +
        'Qui puoi parlare liberamente con gli altri giocatori del gioco.'
      )
      .addFields(
        {
          name: '📖 ｜ Regole rapide',
          value:
            '• Rispetta gli altri membri\n' +
            '• Niente spam o flood\n' +
            '• Usa i canali appropriati per ogni topic\n' +
            '• Per strategie usa ⚔️ **Composizioni**\n' +
            '• Per le news guarda 📰 **News** (aggiornate automaticamente)',
          inline: false,
        },
        {
          name: '🔗 ｜ Link utili',
          value:
            `📰 Notizie: guarda il canale 📰 News\n` +
            `⚔️ Strategie: scrivi in ⚔️ Composizioni\n` +
            `🔊 Vocali: entra in 🔊 Vocale 1 o 2`,
          inline: false,
        }
      )
      .setFooter({ text: `Bloods Hub · ${game.name}` })
      .setTimestamp();
  }

  composizioniEmbed(game) {
    return new EmbedBuilder()
      .setTitle('⚔️ ｜ Composizioni & Strategie')
      .setColor(COLORS.orange)
      .setDescription(
        `Questo canale è dedicato alle **composizioni e strategie** di **${game.name}**.\n` +
        'Usalo per discutere tattiche, composizioni di team, build e setup prima delle partite.'
      )
      .addFields(
        {
          name: '🎯 ｜ Cosa postare qui',
          value:
            '• **Composizioni team** — chi gioca cosa, ruoli, setup\n' +
            '• **Strategie** — tattiche per mappe, boss, obiettivi\n' +
            '• **Build & loadout** — setup ottimali per personaggi/classi\n' +
            '• **Coordinazione** — organizzare gruppi/raid prima di giocare',
          inline: false,
        },
        {
          name: '🚫 ｜ Cosa NON postare qui',
          value:
            '• Chiacchiere generiche → usa 💬 **Generale**\n' +
            '• News/patch notes → guarda 📰 **News**\n' +
            '• Annunci staff → guarda 📣 **Comunicazioni**',
          inline: false,
        }
      )
      .setFooter({ text: `Bloods Hub · ${game.name} · Composizioni` })
      .setTimestamp();
  }

  newsEmbed(game) {
    return new EmbedBuilder()
      .setTitle('📰 ｜ News & Aggiornamenti')
      .setColor(COLORS.purple)
      .setDescription(
        `Questo canale contiene le **notizie automatiche** di **${game.name}**.\n` +
        'Il bot aggiorna questo canale con patch notes, notizie e aggiornamenti.'
      )
      .addFields(
        {
          name: '🤖 ｜ Come funziona',
          value:
            '• Il bot **fetcha automaticamente** le notizie ogni 6 ore\n' +
            '• Le nuove notizie vengono **postate qui** con un embed colorato\n' +
            '• Ogni notizia ha un **link** alla fonte originale\n' +
            '• Il canale è **read-only** — solo il bot può scrivere',
          inline: false,
        },
        {
          name: '📊 ｜ Tipi di notizie',
          value:
            '🔧 **Patch Notes** — aggiornamenti e bilanciamenti\n' +
            '📰 **News** — annunci e novità\n' +
            '🌐 **Server Status** — stato dei server\n' +
            '🎉 **Event** — eventi in-game\n' +
            '📊 **Meta** — classifiche e statistiche',
          inline: false,
        }
      )
      .setFooter({ text: `Bloods Hub · ${game.name} · News automatiche` })
      .setTimestamp();
  }

  comandiEmbed() {
    return new EmbedBuilder()
      .setTitle('🤖 ｜ Lista Comandi del Bot')
      .setColor(COLORS.gold)
      .setDescription(
        'Ecco tutti i comandi disponibili sul server, divisi per categoria.\n' +
        'Usa `/nomecomando` per eseguire un comando.'
      )
      .addFields(
        {
          name: '👤 ｜ Comandi Player (tutti i membri)',
          value:
            '```\n' +
            '/ping         Verifica la latenza del bot\n' +
            '/help         Mostra tutti i comandi disponibili\n' +
            '/mystats      Profilo completo: statistiche, giochi, XP, badge\n' +
            '/rank         Mostra il tuo livello, XP e badge\n' +
            '/stats        Statistiche generali della community\n' +
            '/leaderboard  Classifica dei migliori giocatori\n' +
            '/mygames      Mostra i giochi a cui sei iscritto\n' +
            '/link         Collega account gaming (Steam/Battle.net/Riot)\n' +
            '/refreshstats Aggiorna le statistiche da API esterne\n' +
            '/gamemeta     Patch notes, meta o stato server di un gioco\n' +
            '/lfg          Cerca compagni di gioco (Looking For Group)\n' +
            '/event        Gestisci eventi community\n' +
            '/poll         Crea un sondaggio con reazioni emoji\n' +
            '/suggest      Proponi un suggerimento per la community\n' +
            '```',
          inline: false,
        },
        {
          name: '⚔️ ｜ Comandi Gilda (membri Bloods)',
          value:
            '```\n' +
            '/lfg          Cerca compagni per raid/dungeon/BG\n' +
            '/event        Crea eventi raid/PvP per la gilda\n' +
            '/gamemeta     Patch notes WoW, meta M+/raid (Raider.IO)\n' +
            '/leaderboard  Classifica XP/attività della gilda\n' +
            '/mystats      Vedi il profilo completo dei membri\n' +
            '```\n' +
            '💡 I comandi sopra sono disponibili per tutti, ma sono **più utili per la gilda** ' +
            'quando usati per organizzare raid, BG e incursioni.',
          inline: false,
        },
        {
          name: '🛡️ ｜ Comandi Moderazione (staff)',
          value:
            '```\n' +
            '/warn         Assegna un warning a un membro\n' +
            '/warnings     Mostra lo storico warning di un membro\n' +
            '/mute         Muta (timeout) un membro\n' +
            '/unmute       Rimuove il timeout da un membro\n' +
            '/purge        Cancella bulk messaggi dal canale\n' +
            '/userinfo     Mostra informazioni dettagliate su un membro\n' +
            '```',
          inline: false,
        },
        {
          name: '⚙️ ｜ Comandi Admin (solo admin)',
          value:
            '```\n' +
            '/setup        Migra il Discord nell\'hub multigioco\n' +
            '/game         Gestisci il catalogo dei giochi\n' +
            '/gametest     Testa fetch news + post canale di un gioco\n' +
            '/rolepanel    Deploya/aggiorna il pannello selezione ruoli\n' +
            '/guida        Posta/aggiorna i messaggi guida nei canali\n' +
            '```',
          inline: false,
        },
        {
          name: '💡 ｜ Note',
          value:
            '• I comandi **player** sono disponibili per tutti i membri\n' +
            '• I comandi **moderazione** richiedono permessi `ModerateMembers` o `ManageMessages`\n' +
            '• I comandi **admin** richiedono permessi `ManageGuild` o ruolo Bloods Admin\n' +
            '• Usa `/help` per vedere la lista comandi direttamente su Discord',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub Bot · Lista comandi · Aggiornamento automatico' })
      .setTimestamp();
  }

  // ==========================================
  // GILDA GUIDES
  // ==========================================

  comunicazioniGildaEmbed() {
    return new EmbedBuilder()
      .setTitle('📣 ｜ Comunicazioni Gilda')
      .setColor(COLORS.red)
      .setDescription(
        'Questo canale è riservato alle **comunicazioni ufficiali della Gilda Bloods**.\n' +
        'Solo lo staff può scrivere qui — i membri possono solo leggere.'
      )
      .addFields(
        {
          name: '📋 ｜ Cosa troverai qui',
          value:
            '• Annunci importanti sulla gilda\n' +
            '• Comunicazioni dal Consigliere/Founder/Owner\n' +
            '• Aggiornamenti su regole e policy\n' +
            '• Informazioni su cambiamenti di organizzazione',
          inline: false,
        },
        {
          name: '👥 ｜ Chi può scrivere',
          value:
            '✅ Owner, Founder, Consigliere, Bloods Admin, Officer\n' +
            '❌ Membri gilda (solo lettura)\n' +
            '❌ Community (solo lettura)',
          inline: false,
        },
        {
          name: '💡 ｜ Note',
          value:
            '• Le comunicazioni sono **pinned** quando importanti\n' +
            '• Per domande usa #💭丨𝖢𝗁𝖺𝗍-𝖯𝗎𝖻𝖻𝗅𝗂𝖼𝖺\n' +
            '• Per avvisi rapidi guarda #🎫丨𝖠𝗏𝗏𝗂𝗌𝗂-𝖦𝗂𝗅𝖽𝖺',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub · Comunicazioni Gilda · Solo staff' })
      .setTimestamp();
  }

  avvisiGildaEmbed() {
    return new EmbedBuilder()
      .setTitle('🎫 ｜ Avvisi Gilda')
      .setColor(COLORS.orange)
      .setDescription(
        'Avvisi rapidi e operativi della gilda — **promemoria, reminder, avvisi brevi**.\n' +
        'Solo lo staff può postare qui.'
      )
      .addFields(
        {
          name: '📋 ｜ Cosa troverai qui',
          value:
            '• Promemoria raid/eventi imminenti\n' +
            '• Avvisi di manutenzione o downtime\n' +
            '• Reminder su scadenze (es. reset, lockout)\n' +
            '• Avvisi brevi e operativi',
          inline: false,
        },
        {
          name: '👥 ｜ Chi può scrivere',
          value:
            '✅ Owner, Founder, Consigliere, Bloods Admin, Officer\n' +
            '✅ Guida Incursioni/Spedizioni (per avvisi raid)\n' +
            '❌ Membri gilda (solo lettura)',
          inline: false,
        },
        {
          name: '📌 ｜ Differenza con Comunicazioni',
          value:
            '• **Comunicazioni** = annunci ufficiali e permanenti\n' +
            '• **Avvisi** = promemoria rapidi e temporanei\n' +
            '• **Annunci** = eventi e raid programmati',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub · Avvisi Gilda · Solo staff' })
      .setTimestamp();
  }

  annunciGildaEmbed() {
    return new EmbedBuilder()
      .setTitle('📜 ｜ Annunci Gilda')
      .setColor(COLORS.gold)
      .setDescription(
        'Annunci di **eventi, raid, spedizioni e attività organizzate** della gilda.\n' +
        'Solo lo staff e le Guide possono postare qui.'
      )
      .addFields(
        {
          name: '📋 ｜ Cosa troverai qui',
          value:
            '• Annunci raid PvE (incursioni, M+)\n' +
            '• Annunci RBG e arena PvP\n' +
            '• Eventi speciali (tornei, contest)\n' +
            '• Programmazione settimanale attività',
          inline: false,
        },
        {
          name: '👥 ｜ Chi può scrivere',
          value:
            '✅ Owner, Founder, Consigliere, Bloods Admin, Officer\n' +
            '✅ Guida Incursioni, Guida Spedizioni\n' +
            '✅ Capo Fazione PvP\n' +
            '❌ Membri gilda (solo lettura)',
          inline: false,
        },
        {
          name: '🗓 ｜ Formato annunci',
          value:
            '```\n' +
            '📅 Data: [GG/MM HH:MM]\n' +
            '🎯 Attività: [Raid/RBG/M+/Arena]\n' +
            '👥 Comp: [Tank/Healer/DPS richiesti]\n' +
            '📍 Luogo: [Incontro]\n' +
            '📝 Note: [Info aggiuntive]\n' +
            '```',
          inline: false,
        },
        {
          name: '💡 ｜ Prenotazioni',
          value:
            'Per prenotarti a un\'attività, usa i canali:\n' +
            '• #🧾丨𝖯𝗋𝖾𝗇𝗈𝗍𝖺𝗓𝗂𝗈𝗇𝖾-𝖨𝗇𝖼𝗎𝗋𝗌𝗂𝗈𝗇𝗂 (PvE)\n' +
            '• #🧾丨𝖯𝗋𝖾𝗇𝗈𝗍𝖺𝗓𝗂𝗈𝗇𝖾-rbg (PvP)',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub · Annunci Gilda · Eventi e raid' })
      .setTimestamp();
  }

  // ==========================================
  // PRENOTAZIONI GUIDES
  // ==========================================

  prenotazioniPvEEmbed() {
    return new EmbedBuilder()
      .setTitle('🧾 ｜ Prenotazioni Incursioni (PvE)')
      .setColor(COLORS.green)
      .setDescription(
        'Canale per **prenotarti a raid, incursioni e spedizioni PvE**.\n' +
        'Usa il formato qui sotto per prenotarti.'
      )
      .addFields(
        {
          name: '📝 ｜ Formato prenotazione',
          value:
            '```\n' +
            'IGN: [Tuo nome in-game]\n' +
            'Classe: [Tua classe]\n' +
            'Spec: [Tua specializzazione]\n' +
            'Ruolo: [Tank/Healer/DPS]\n' +
            'ILvl: [Tuo item level]\n' +
            'Raid: [Nome incursione]\n' +
            'Data: [GG/MM HH:MM]\n' +
            '```',
          inline: false,
        },
        {
          name: '✅ ｜ Regole',
          value:
            '• Una prenotazione per messaggio\n' +
            '• Non prenotarti se non sei sicuro di partecipare\n' +
            '• Arriva 10 minuti prima dell\'orario\n' +
            '• Porta consumabili, gemme, enchant\n' +
            '• Avvisa in anticipo se non puoi venire',
          inline: false,
        },
        {
          name: '🎯 ｜ Chi organizza',
          value:
            'Le **Guide Incursioni** e **Guide Spedizioni** organizzano i raid.\n' +
            'Gli annunci vengono postati in #📜丨𝖠𝗇𝗇𝗎𝗇𝖼𝗂-𝖦𝗂𝗅𝖽𝖺.',
          inline: false,
        },
        {
          name: '📊 ｜ Statistiche',
          value:
            'Le tue partecipazioni vengono tracciate dal bot.\n' +
            'Usa `/mystats` per vedere le tue statistiche.\n' +
            'I membri più attivi possono ricevere il ruolo **Giocatore Attivo** o **Veterano**.',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub · Prenotazioni PvE · Raid e incursioni' })
      .setTimestamp();
  }

  prenotazioniPvPEmbed() {
    return new EmbedBuilder()
      .setTitle('🧾 ｜ Prenotazioni RBG (PvP)')
      .setColor(COLORS.red)
      .setDescription(
        'Canale per **prenotarti a Rated Battleground (RBG) e attività PvP organizzate**.\n' +
        'Usa il formato qui sotto per prenotarti.'
      )
      .addFields(
        {
          name: '📝 ｜ Formato prenotazione',
          value:
            '```\n' +
            'IGN: [Tuo nome in-game]\n' +
            'Classe: [Tua classe]\n' +
            'Spec: [Tua specializzazione PvP]\n' +
            'Ruolo: [FC/Mid/Support/AOE]\n' +
            'Rating: [Tuo rating RBG]\n' +
            'Data: [GG/MM HH:MM]\n' +
            '```',
          inline: false,
        },
        {
          name: '✅ ｜ Regole',
          value:
            '• Una prenotazione per messaggio\n' +
            '• Minimo rating richiesto: 0 (tutti i livelli)\n' +
            '• Arriva 10 minuti prima dell\'orario\n' +
            '• Discord obbligatorio per la comunicazione\n' +
            '• Microfono funzionante richiesto',
          inline: false,
        },
        {
          name: '🎯 ｜ Chi organizza',
          value:
            'Il **Capo Fazione PvP** organizza i RBG.\n' +
            'Gli annunci vengono postati in #📜丨𝖠𝗇𝗇𝗎𝗇𝖼𝗂-𝖦𝗂𝗅𝖽𝖺.',
          inline: false,
        },
        {
          name: '⚔️ ｜ Composizioni',
          value:
            'Le composizioni RBG vengono discusse in #⚔️丨𝖢𝗈𝗆𝗉𝗈𝗌𝗂𝗓𝗂𝗈𝗇𝗂.\n' +
            'Per strategie e call, usa il canale vocale #⚒ 丨𝖱𝖡𝖦.',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub · Prenotazioni RBG · PvP organizzato' })
      .setTimestamp();
  }

  // ==========================================
  // COMMUNITY GUIDES
  // ==========================================

  avvisiCommunityEmbed() {
    return new EmbedBuilder()
      .setTitle('🎫 ｜ Avvisi Community')
      .setColor(COLORS.orange)
      .setDescription(
        'Avvisi e comunicazioni per la **Community Bloods** (non gilda).\n' +
        'Solo lo staff può postare qui — i membri possono solo leggere.'
      )
      .addFields(
        {
          name: '📋 ｜ Cosa troverai qui',
          value:
            '• Avvisi eventi community (tornei, contest)\n' +
            '• Promemoria maintenance bot/server\n' +
            '• Aggiornamenti community hub\n' +
            '• Avvisi su nuovi giochi aggiunti al server',
          inline: false,
        },
        {
          name: '👥 ｜ Chi può scrivere',
          value:
            '✅ Owner, Founder, Consigliere, Bloods Admin, Officer\n' +
            '❌ Membri community (solo lettura)\n' +
            '❌ Membri gilda (solo lettura)',
          inline: false,
        },
        {
          name: '📌 ｜ Differenza con Annunci Community',
          value:
            '• **Avvisi** = promemoria rapidi e operativi\n' +
            '• **Annunci** = eventi e attività community',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub · Avvisi Community · Solo staff' })
      .setTimestamp();
  }

  annunciCommunityEmbed() {
    return new EmbedBuilder()
      .setTitle('📜 ｜ Annunci Community')
      .setColor(COLORS.gold)
      .setDescription(
        'Annunci di **eventi, tornei e attività community** aperte a tutti.\n' +
        'Solo lo staff può postare qui.'
      )
      .addFields(
        {
          name: '📋 ｜ Cosa troverai qui',
          value:
            '• Tornei community (multi-gioco)\n' +
            '• Eventi speciali (giveaway, contest)\n' +
            '• Game night e eventi social\n' +
            '• Annunci collaborazione con altre community',
          inline: false,
        },
        {
          name: '👥 ｜ Chi può scrivere',
          value:
            '✅ Owner, Founder, Consigliere, Bloods Admin, Officer\n' +
            '❌ Membri community (solo lettura)',
          inline: false,
        },
        {
          name: '🎮 ｜ Partecipazione',
          value:
            'Gli eventi community sono **aperti a tutti** i membri:\n' +
            '• Membri gilda (Bloods)\n' +
            '• Membri community (Membro della community)\n' +
            '• Anche senza ruolo gilda',
          inline: false,
        },
        {
          name: '🏆 ｜ Ricompense',
          value:
            'I vincitori degli eventi community possono ricevere:\n' +
            '• XP bonus (tracciato dal bot)\n' +
            '• Ruoli speciali (Giocatore Attivo, Veterano)\n' +
            '• Badge sul profilo',
          inline: false,
        }
      )
      .setFooter({ text: 'Bloods Hub · Annunci Community · Eventi aperti a tutti' })
      .setTimestamp();
  }

  // ==========================================
  // GAME COMUNICAZIONI GUIDE
  // ==========================================

  comunicazioniGameEmbed(game) {
    return new EmbedBuilder()
      .setTitle(`📣 ｜ Comunicazioni ${game.name}`)
      .setColor(COLORS.blue)
      .setDescription(
        `Canale per **comunicazioni ufficiali relative a ${game.name}**.\n` +
        'Lo staff postà qui annunci, patch notes rilevanti e info importanti.'
      )
      .addFields(
        {
          name: '📋 ｜ Cosa troverai qui',
          value:
            `• Annunci eventi di ${game.name}\n` +
            `• Comunicazioni sulla community ${game.name}\n` +
            '• Info su tornei o attività organizzate\n' +
            '• Avvisi importanti dallo staff',
          inline: false,
        },
        {
          name: '👥 ｜ Chi può scrivere',
          value:
            '✅ Owner, Founder, Consigliere, Bloods Admin, Officer\n' +
            '❌ Membri (solo lettura)',
          inline: false,
        },
        {
          name: '📰 ｜ Altri canali',
          value:
            `• #💬丨𝖦𝖾𝗇𝖾𝗋𝖺𝗅𝖾 — chat generale su ${game.name}\n` +
            `• #📰丨𝖭𝖾𝗐𝗌 — news automatiche dal bot\n` +
            `• #⚔️丨𝖢𝗈𝗆𝗉𝗈𝗌𝗂𝗋𝗂𝗈𝗇𝗂 — comp e strategie`,
          inline: false,
        }
      )
      .setFooter({ text: `Bloods Hub · ${game.name} · Comunicazioni` })
      .setTimestamp();
  }
}

module.exports = GuidePoster;
