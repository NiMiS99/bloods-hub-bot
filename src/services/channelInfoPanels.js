// src/services/channelInfoPanels.js
// Posts informational embed panels to channels that need static content.
// Runs once on startup (clientReady), idempotent — updates existing messages.
// Covers: Tattiche, Banca-Gilda, Presentazioni, FAQ, Arena-LFG, Eventi-PvP, LFG-Mito, Eventi-Mplus
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');
const { fromFraktur } = require('../utils/textFormatter');
const config = require('../config');

// Channel IDs (from the live server extraction, 25 Aug 2026)
const CHANNELS = {
  tattiche: '1541874228406779904',
  bancaGilda: '1541874228406779904', // will be set correctly below
  presentazioni: '1541874233775362148',
  faq: '1541874235440500806',
  arenaLfg: '1541874237290061914',
  eventiPvp: '1541874238800138280',
  lfgMito: '1541874223897903126',
  eventiMplus: '1541874225520844860',
};

// Correct channel IDs from the extraction output
const CORRECT_CHANNELS = {
  tattiche: '1541874228406779904',
  bancaGilda: '1541874230331965489',
  presentazioni: '1541874233775362148',
  faq: '1541874235440500806',
  arenaLfg: '1541874237290061914',
  eventiPvp: '1541874238800138280',
  lfgMito: '1541874223897903126',
  eventiMplus: '1541874225520844860',
};

const BRAND_COLOR = 0x8b0000;
const PANEL_SIGNATURE = 'Bloods Hub · Info Panel';

/**
 * Find a channel by ID in the guild, with fallback to name search.
 */
async function findChannel(guild, channelId, namePattern) {
  let channel = guild.channels.cache.get(channelId);
  if (!channel) {
    await guild.channels.fetch();
    channel = [...guild.channels.cache.values()].find(
      c => fromFraktur(c.name).toLowerCase().includes(namePattern)
    );
  }
  return channel;
}

/**
 * Post or update an info panel in a channel.
 * Uses a signature in the footer to find and update existing panels.
 */
async function postPanel(channel, embed) {
  if (!channel) return false;

  // Look for existing panel message from the bot
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = messages?.find(m =>
    m.author.id === channel.client.user.id &&
    m.embeds?.[0]?.footer?.text?.includes(PANEL_SIGNATURE)
  );

  if (existing) {
    await existing.edit({ embeds: [embed] }).catch(() => {});
    logger.info(`ChannelInfoPanels: updated panel in #${channel.name}`);
  } else {
    await channel.send({ embeds: [embed] }).catch(() => {});
    logger.info(`ChannelInfoPanels: posted panel in #${channel.name}`);
  }
  return true;
}

/**
 * Post all info panels to their respective channels.
 * Called on clientReady.
 */
async function postAllPanels(client) {
  const GUILD_ID = config.discord.guildId || '1010226759817515018';
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    logger.warn('ChannelInfoPanels: guild not found');
    return;
  }

  await guild.channels.fetch();

  // 1. Tattiche
  const tatticheCh = await findChannel(guild, CORRECT_CHANNELS.tattiche, 'tattiche');
  if (tatticheCh) {
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Tattiche — The Venomous Abyss')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Guida tattiche boss raid Season 2.**\n\n' +
        'Ogni boss ha un thread dedicato con:\n' +
        '• Video guida (Heroic + Mythic)\n' +
        '• WeakAuras specifiche\n' +
        '• Macro e addon\n' +
        '• Assignments per ruolo\n' +
        '• Errori comuni e come evitarli\n\n' +
        '**Boss The Venomous Abyss:**\n' +
        '1. Ulgrax the Devourer\n' +
        '2. The Bloodbound Horror\n' +
        '3. Sikran\n' +
        '4. Rasha\'nan\n' +
        '5. Broodtwister Ovi\'nax\n' +
        '6. Nexus-Princess Ky\'veza\n' +
        '7. The Silken Court\n' +
        '8. Queen Ansurek\n\n' +
        '**Risorse esterne:**\n' +
        '• [Wowhead Guide](https://www.wowhead.com/raid-guides)\n' +
        '• [Method](https://www.method.gg/)\n' +
        '• [Maxroll](https://maxroll.gg/wow/raid-guides)'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(tatticheCh, embed);
  }

  // 2. Banca Gilda
  const bancaCh = await findChannel(guild, CORRECT_CHANNELS.bancaGilda, 'banca');
  if (bancaCh) {
    const embed = new EmbedBuilder()
      .setTitle('🏦 Banca Gilda — Info e Regole')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Come funziona la banca gilda:**\n\n' +
        '📦 **Depositi:**\n' +
        '• Materiali di crafting (herbs, ore, leather, cloth)\n' +
        '• Consumabili (potions, flasks, food, runes)\n' +
        '• BoE gear utile per la gilda\n' +
        '• Gold per finanzamento raid\n\n' +
        '📋 **Richieste craft:**\n' +
        '• Posta qui la richiesta con formato:\n' +
        '  `Item: [nome] — Materiali: [lista] — PG: [nome]`\n' +
        '• Un crafter della gilda risponderà\n\n' +
        '⚠️ **Regole:**\n' +
        '• Non prelevare senza permesso di un Officer\n' +
        '• I materiali sono per progress raid, non personale\n' +
        '• Report mensile dei depositi/prelievi\n\n' +
        '**Crafter gilda:** usa `/professioni` per vedere chi ha quale professione.'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(bancaCh, embed);
  }

  // 3. Presentazioni
  const presCh = await findChannel(guild, CORRECT_CHANNELS.presentazioni, 'presentaz');
  if (presCh) {
    const embed = new EmbedBuilder()
      .setTitle('🎓 Presentazioni Nuovi Membri')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Benvenuto nei Bloods! Presentati qui.**\n\n' +
        'Copia questo template e compila:\n\n' +
        '```\n' +
        'Nome PG: \n' +
        'Classe/Spec: \n' +
        'Reame: \n' +
        'Item Level: \n' +
        'Esperenza WoW: (anni, content fatto)\n' +
        'Esperenza raid: (Normal/Heroic/Mythic)\n' +
        'Score M+: \n' +
        'Perché sei entrato nei Bloods: \n' +
        'Hobby fuori da WoW: \n' +
        '```\n\n' +
        '**Dopo esserti presentato:**\n' +
        '1. Linka il tuo PG: `/link battlenet NomePG-Reame`\n' +
        '2. Controlla la tua idoneità: `/raidstatus me`\n' +
        '3. Vedi il tuo saldo BP: `/bp balance`\n' +
        '4. Leggi le tattiche in #Tattiche'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(presCh, embed);
  }

  // 4. FAQ
  const faqCh = await findChannel(guild, CORRECT_CHANNELS.faq, 'faq');
  if (faqCh) {
    const embed = new EmbedBuilder()
      .setTitle('❓ FAQ — Domande Frequenti')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Domande comuni sui Bloods e sul bot.**\n\n' +
        '**🗓 Orari raid:**\n' +
        '> Mercoledì e Giovedì, 21:00–23:30 server time\n' +
        '> Check-in 20:45, pull 21:00\n\n' +
        '**📝 Come mi iscrivo al raid?**\n' +
        '> Usa `/spedizione` o vai in #Prenotazione-Incurzioni\n\n' +
        '**💰 Come funziona il sistema BP?**\n' +
        '> I Bloods Points (BP) sono il nostro DKP. Li guadagni con:\n' +
        '> • Presenza raid: +10 BP (via `/raidattendance`)\n' +
        '> • Puntualità: +5 BP\n' +
        '> • Kill boss: +5/+10/+20 (Normal/Heroic/Mythic)\n' +
        '> • Wipe night: +8 BP\n' +
        '> Controlla il saldo: `/bp balance`\n\n' +
        '**🎲 Come funziona il loot?**\n' +
        '> Quando un boss droppa loot, il RL usa `/loot start`\n' +
        '> I player interessati usano `/loot roll`\n' +
        '> Formula: `roll(1-100) + BP/10` — vince il totale più alto\n' +
        '> Il vincitore paga 50% dei suoi BP\n\n' +
        '**⚔️ Requisiti raider mitico?**\n' +
        '> Vedi `/raidstatus me` o il canale #Requisiti-Raider\n\n' +
        '**🔑 Come vedo le key M+?**\n' +
        '> Usa `/keys list` per le key di gilda\n' +
        '> Usa `/keys me` per il tuo profilo Raider.io\n\n' +
        '**🔗 Come linko il mio PG?**\n' +
        '> `/link battlenet NomePG-Reame` (es: `/link battlenet Bäba-Pozzo dellEternità`)\n\n' +
        '**🎫 Come apro un ticket?**\n' +
        '> Vai in #ticket-assistenza e clicca "Apri Ticket"\n\n' +
        '**📊 Dove vedo le statistiche?**\n' +
        '> `/mystats` per il tuo profilo, `/serverstats` per il server\n' +
        '> Dashboard web: usa `/dashboard` (admin)'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(faqCh, embed);
  }

  // 5. Arena LFG
  const arenaCh = await findChannel(guild, CORRECT_CHANNELS.arenaLfg, 'arena');
  if (arenaCh) {
    const embed = new EmbedBuilder()
      .setTitle('🎯 Arena LFG — Cerca Partner')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Cerca partner per arena 2v2 / 3v3.**\n\n' +
        '**Formato post:**\n' +
        '```\n' +
        'Modalità: 2v2 / 3v3\n' +
        'Rating attuale: xxx\n' +
        'Classe/Spec: \n' +
        'Cerco: [classe/spec]\n' +
        'Orario: [giorno + ora]\n' +
        'Note: \n' +
        '```\n\n' +
        '**Comandi utili:**\n' +
        '• `/lfg create` — crea sessione LFG\n' +
        '• `/link battlenet` — linka il PG\n' +
        '• Vocale: ⭐ Arena 2v2 / ⭐ Arena 3v3'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(arenaCh, embed);
  }

  // 6. Eventi PvP
  const pvpCh = await findChannel(guild, CORRECT_CHANNELS.eventiPvp, 'eventi-pvp');
  if (pvpCh) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Eventi PvP — Tornei e RBG')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Eventi PvP ricorrenti della gilda.**\n\n' +
        '**🗓 Eventi settimanali:**\n' +
        '• RBG night: Venerdì 21:00 (signup in #Prenotazione-rbg)\n' +
        '• Arena tournament: Mensile (annuncio in #Comunicazioni)\n\n' +
        '**🏆 Tornei interni:**\n' +
        '• 2v2 double elimination — premio 100k gold\n' +
        '• 3v3 round robin — premio 200k gold\n\n' +
        '**Comandi utili:**\n' +
        '• `/event create` — crea evento PvP\n' +
        '• `/tournament create` — crea torneo (admin)\n' +
        '• `/spedizione` — signup RBG'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(pvpCh, embed);
  }

  // 7. LFG Mito
  const lfgMitoCh = await findChannel(guild, CORRECT_CHANNELS.lfgMito, 'lfg-mito');
  if (lfgMitoCh) {
    const embed = new EmbedBuilder()
      .setTitle('🎯 LFG Mythic+ — Cerca Gruppo')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Cerca gruppo per Mythic+ dentro la gilda.**\n\n' +
        '**Formato post:**\n' +
        '```\n' +
        'Dungeon: [nome]\n' +
        'Key level: +xx\n' +
        'Il mio PG: [classe/spec] — xxx io score\n' +
        'Cerco: [ruoli]\n' +
        'Affix: [controlla #keys-settimanali]\n' +
        'Orario: [ora]\n' +
        '```\n\n' +
        '**Comandi utili:**\n' +
        '• `/keys list` — vedi key disponibili in gilda\n' +
        '• `/keys me` — il tuo score Raider.io\n' +
        '• `/lfg create` — crea sessione LFG\n' +
        '• Vocale: 🔊 M-Plus\n\n' +
        '**Etichetta M+:**\n' +
        '• Sii puntuale\n' +
        '• Porta consumabili (flask, food, potion, rune)\n' +
        '• Usa WeakAuras (vedi #Tattiche)\n' +
        '• Non ragequit dopo 1 wipe'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(lfgMitoCh, embed);
  }

  // 8. Eventi M+
  const mplusCh = await findChannel(guild, CORRECT_CHANNELS.eventiMplus, 'eventi-mplus');
  if (mplusCh) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Eventi Mythic+ — Race e Tornei')
      .setColor(BRAND_COLOR)
      .setDescription(
        '**Eventi M+ della gilda.**\n\n' +
        '**🗓 Eventi ricorrenti:**\n' +
        '• M+ night: Sabato 21:00\n' +
        '• Weekly key push: Domenica 20:00\n' +
        '• Gilda race: primo weekend del mese\n\n' +
        '**🏆 Tornei interni:**\n' +
        '• Race +15: team che completa più +15 in 2h\n' +
        '• Race +20: primo team che completa +20 in ogni dungeon\n' +
        '• Best io: premio al player con più io score improvement mensile\n\n' +
        '**Comandi utili:**\n' +
        '• `/keys leaderboard` — classifica M+ gilda\n' +
        '• `/event create` — crea evento M+\n' +
        '• Affix della settimana: #keys-settimanali'
      )
      .setFooter({ text: PANEL_SIGNATURE })
      .setTimestamp();
    await postPanel(mplusCh, embed);
  }

  logger.info('ChannelInfoPanels: all panels posted/updated.');
}

module.exports = { postAllPanels };
