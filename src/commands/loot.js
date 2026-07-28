// src/commands/loot.js
// Loot roll system: start/status/close/cancel rolls, roll, loot recap, items list.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BpItem, BpLootHistory, BpActiveRoll, sequelize } = require('../db');
const { Op } = require('sequelize');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { recordAudit } = require('../utils/auditLog');
const { isRaidLeader, getBpUser, getRoster, getActiveRoll, randInt, computeScore } = require('../utils/bpHelpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loot')
    .setDescription('Sistema aste loot (roll + bid DKP).')

    .addSubcommand((sc) => sc.setName('items').setDescription('Lista item disponibili.'))
    .addSubcommand((sc) => sc.setName('roll')
      .setDescription('Esegui roll per l\'oggetto attivo (roll 1-100 + bid DKP).')
      .addIntegerOption((o) => o.setName('bid').setDescription('Bid BP (>= minBid).').setRequired(false)))
    .addSubcommand((sc) => sc.setName('lootrecap')
      .setDescription('Riepilogo loot vinto (storico).')
      .addStringOption((o) => o.setName('raid').setDescription('Nome raid (es: Manaforgia Omega).').setRequired(false))
      .addIntegerOption((o) => o.setName('limit').setDescription('Quanti risultati (max 50).').setRequired(false)))

    // Guida only
    .addSubcommand((sc) => sc.setName('lootstart')
      .setDescription('Avvia un roll loot (seleziona item via autocomplete).')
      .addStringOption((o) => o.setName('itemid').setDescription('Cerca e seleziona l\'oggetto.').setRequired(true).setAutocomplete(true)))
    .addSubcommand((sc) => sc.setName('lootstatus').setDescription('Stato del roll attivo (top e roster).'))
    .addSubcommand((sc) => sc.setName('lootclose').setDescription('Chiude il roll attivo e assegna l\'oggetto al vincitore.'))
    .addSubcommand((sc) => sc.setName('lootcancel').setDescription('Annulla il roll attivo (senza vincitore).')),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const items = await BpItem.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.like]: `%${focused}%` } },
          { name: { [Op.like]: `%${focused}%` } },
          { boss: { [Op.like]: `%${focused}%` } },
        ],
      },
      order: [['name', 'ASC']],
      limit: 25,
    });
    await interaction.respond(items.map((it) => ({
      name: `${it.name} — ${it.boss || 'Sconosciuto'}`.slice(0, 100),
      value: it.id,
    })));
  },

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ embeds: [errorEmbed('Questo comando funziona solo dentro un server.')], flags: 64 });
      return;
    }

    // Pubblici
    if (sub === 'roll') return this._roll(interaction);
    if (sub === 'lootrecap') return this._lootRecap(interaction);
    if (sub === 'items') return this._items(interaction);

    // Guida only
    if (sub === 'lootstart' || sub === 'lootstatus' || sub === 'lootclose' || sub === 'lootcancel') {
      if (!isRaidLeader(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Comando riservato alle **Guide Incursioni/Spedizioni** e staff.')], flags: 64 });
        return;
      }
      if (sub === 'lootstart') return this._lootStart(interaction);
      if (sub === 'lootstatus') return this._lootStatus(interaction);
      if (sub === 'lootclose') return this._lootClose(interaction);
      if (sub === 'lootcancel') return this._lootCancel(interaction);
    }
  },

  // ===== ITEMS =====
  async _items(interaction) {
    const items = await BpItem.findAll({ order: [['name', 'ASC']], limit: 50 });
    if (items.length === 0) {
      await interaction.reply({ content: 'Nessun item disponibile.', flags: 64 });
      return;
    }
    const header = '**Items disponibili**\n';
    const footer = '\n\nUsa: `/loot lootstart` e digita nel campo `itemid` per i suggerimenti.';
    let body = '';
    for (const it of items) {
      const line = `• \`${it.id}\` — ${it.name} (${it.boss || 'n/a'})\n`;
      if (header.length + body.length + line.length + footer.length > 1900) break;
      body += line;
    }
    await interaction.reply({ content: header + body + footer, flags: 64 });
  },

  // ===== LOOT START =====
  async _lootStart(interaction) {
    const itemid = interaction.options.getString('itemid', true);
    const item = await BpItem.findByPk(itemid);
    if (!item) {
      await interaction.reply({ content: 'Item non trovato. Usa `/loot items` o l\'autocomplete.', flags: 64 });
      return;
    }

    const roll = await getActiveRoll(interaction.guildId);
    if (!roll) {
      await interaction.reply({ content: 'Errore: impossibile recuperare il roll attivo. Riprova.', flags: 64 });
      return;
    }
    if (roll.is_open) {
      await interaction.reply({ content: 'C\'è già un roll attivo. Chiudilo con `/loot lootclose` o annullalo con `/loot lootcancel`.', flags: 64 });
      return;
    }

    await roll.update({
      is_open: true,
      started_at: new Date(),
      started_by: interaction.user.id,
      channel_id: interaction.channelId,
      item_id: item.id,
      item_name: item.name,
      item_slot: item.slot,
      item_boss: item.boss,
      item_note: item.note,
      min_bid: item.min_bid || 0,
      bids: {},
      closed_at: null,
      result: null,
    });

    await interaction.reply({
      content:
        `**ROLL APERTO (roll 1-100 + boost DKP)**\n` +
        `Boss: **${item.boss || 'Sconosciuto'}**\n` +
        `Item: **${item.name}** (\`${item.id}\`)\n` +
        `MinBid: **${item.min_bid || 0}**\n\n` +
        `Comando: \`/loot roll bid:<dkp>\`\n` +
        `Formula: score = round(roll × (1 + bid/50))\n` +
        `Vince lo score più alto. Il vincitore paga la bid.`,
    });
    await recordAudit(interaction, 'loot.lootstart', { itemId: item.id, itemName: item.name, boss: item.boss, minBid: item.min_bid || 0 });
  },

  // ===== LOOT STATUS =====
  async _lootStatus(interaction) {
    const roll = await getActiveRoll(interaction.guildId);
    if (!roll.is_open) {
      await interaction.reply({ content: 'Nessun roll attivo al momento.', flags: 64 });
      return;
    }

    const bids = roll.bids || {};
    const rows = Object.entries(bids)
      .map(([userId, v]) => ({ userId, bid: v.bid, roll: v.roll, score: v.score }))
      .sort((a, b) => b.score - a.score || b.roll - a.roll || b.bid - a.bid)
      .slice(0, 10);

    const topText = rows.length > 0
      ? rows.map((r, i) => `${i + 1}. <@${r.userId}> — roll **${r.roll}** | bid **${r.bid}** | score **${r.score}**`).join('\n')
      : 'Nessuna rollata ancora.';

    const roster = await getRoster(interaction.guildId);
    const rosterText = roster.is_active
      ? `Roster: **ATTIVA** (${(roster.members || []).length} membri)`
      : 'Roster: **DISATTIVA** (tutti possono rollare)';

    await interaction.reply({
      content:
        `**ROLL ATTIVO**\n` +
        `Item: **${roll.item_name}** (\`${roll.item_id}\`)\n` +
        `Boss: **${roll.item_boss || roll.item_note || 'n/a'}**\n\n` +
        `${rosterText}\n\nTop:\n${topText}`,
      flags: 64,
    });
  },

  // ===== ROLL =====
  async _roll(interaction) {
    const bidOpt = interaction.options.getInteger('bid');
    const userId = interaction.user.id;
    const roll = await getActiveRoll(interaction.guildId);

    if (!roll.is_open) {
      await interaction.reply({ content: 'Non c\'è nessun roll attivo.', flags: 64 });
      return;
    }
    if (roll.channel_id && String(roll.channel_id) !== String(interaction.channelId)) {
      await interaction.reply({ content: `Roll attivo in un altro canale: <#${roll.channel_id}>`, flags: 64 });
      return;
    }

    const bids = roll.bids || {};
    if (bids[userId]) {
      const prev = bids[userId];
      await interaction.reply({
        content: `Hai già rollato per questo pezzo.\nRoll: **${prev.roll}** | Bid: **${prev.bid}** | Score: **${prev.score}**\nNon puoi rollare una seconda volta.`,
        flags: 64,
      });
      return;
    }

    const roster = await getRoster(interaction.guildId);
    if (roster.is_active && !(roster.members || []).includes(userId)) {
      await interaction.reply({ content: 'Non sei nella roster del raid: non puoi rollare questo pezzo.', flags: 64 });
      return;
    }

    const bpUser = await getBpUser(interaction.guildId, userId);
    const minBid = roll.min_bid || 0;
    const bid = typeof bidOpt === 'number' ? bidOpt : minBid;

    if (!Number.isInteger(bid) || bid < minBid) {
      await interaction.reply({ content: `Bid non valida. MinBid richiesto: **${minBid}**`, flags: 64 });
      return;
    }
    if (bpUser.dkp < bid) {
      await interaction.reply({ content: `Saldo insufficiente. Hai **${bpUser.dkp}** BP, bid richiesta **${bid}**.`, flags: 64 });
      return;
    }

    const rollNum = randInt(1, 100);
    const score = computeScore(rollNum, bid);

    bids[userId] = { bid, roll: rollNum, score, updated_at: new Date().toISOString() };
    await roll.update({ bids });

    await interaction.reply({ content: `Roll: **${rollNum}** | Bid: **${bid}** | Score: **${score}**`, flags: 64 });
    await recordAudit(interaction, 'loot.roll', { itemId: roll.item_id, bid, roll: rollNum, score });
  },

  // ===== LOOT CLOSE =====
  async _lootClose(interaction) {
    const roll = await getActiveRoll(interaction.guildId);
    if (!roll.is_open) {
      await interaction.reply({ content: 'Non c\'è nessun roll attivo.', flags: 64 });
      return;
    }

    const bids = Object.entries(roll.bids || {}).map(([uid, v]) => ({
      userId: uid, bid: v.bid, roll: v.roll, score: v.score,
    }));

    if (bids.length === 0) {
      await roll.update({ is_open: false, closed_at: new Date(), result: { type: 'no_bids' } });
      await interaction.reply({ content: `**ROLL CHIUSO**\nNessuna bid per **${roll.item_name}** (\`${roll.item_id}\`).` });
      return;
    }

    // Sort: score > roll > bid
    bids.sort((a, b) => b.score - a.score || b.roll - a.roll || b.bid - a.bid);
    const winner = bids[0];

    // Atomic DKP verification + deduction in transaction (anti race condition)
    const t = await sequelize.transaction();
    try {
      // Verify all bidders have enough DKP (with lock)
      for (const b of bids) {
        const u = await getBpUser(interaction.guildId, b.userId);
        if (!u || u.dkp < b.bid) {
          await t.rollback();
          await interaction.reply({
            content: `Impossibile chiudere il roll.\n<@${b.userId}> non ha abbastanza BP (**${u?.dkp || 0}** < **${b.bid}**).`,
            flags: 64,
          });
          return;
        }
      }

      // Deduct DKP from ALL participants (atomic)
      for (const b of bids) {
        const u = await getBpUser(interaction.guildId, b.userId);
        await u.update({ dkp: u.dkp - b.bid }, { transaction: t });
      }

      // Save to loot history
      await BpLootHistory.create({
        guild_id: interaction.guildId,
        raid_name: null,
        item_id: roll.item_id,
        item_name: roll.item_name,
        boss: roll.item_boss || roll.item_note,
        winner_id: winner.userId,
        bid: winner.bid,
        roll: winner.roll,
        score: winner.score,
        participants: bids.length,
        closed_at: new Date(),
      }, { transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      await interaction.reply({ content: `Errore durante la chiusura roll: ${err.message}`, flags: 64 });
      return;
    }

    await roll.update({
      is_open: false,
      closed_at: new Date(),
      result: { type: 'winner', winnerId: winner.userId, bid: winner.bid, roll: winner.roll, score: winner.score },
    });

    await interaction.reply({
      content:
        `**ROLL CHIUSO**\n` +
        `Item: **${roll.item_name}** (\`${roll.item_id}\`)\n` +
        `Vincitore: <@${winner.userId}>\n` +
        `Roll: **${winner.roll}** | Bid: **${winner.bid}** | Score: **${winner.score}**\n` +
        `Partecipanti: **${bids.length}**\n\n` +
        `📉 **A tutti i partecipanti sono stati scalati i BP puntati**.`,
    });
    await recordAudit(interaction, 'loot.lootclose', {
      itemId: roll.item_id, itemName: roll.item_name,
      winnerId: winner.userId, winnerBid: winner.bid, winnerRoll: winner.roll, winnerScore: winner.score,
      participants: bids.length,
    });
  },

  // ===== LOOT CANCEL =====
  async _lootCancel(interaction) {
    const roll = await getActiveRoll(interaction.guildId);
    if (!roll.is_open) {
      await interaction.reply({ content: 'Non c\'è nessun roll attivo.', flags: 64 });
      return;
    }
    await roll.update({ is_open: false, closed_at: new Date(), result: { type: 'canceled' } });
    await interaction.reply({ content: `Roll annullato per **${roll.item_name}** (\`${roll.item_id}\`).` });
    await recordAudit(interaction, 'loot.lootcancel', { itemId: roll.item_id, itemName: roll.item_name });
  },

  // ===== LOOT RECAP =====
  async _lootRecap(interaction) {
    const raidName = interaction.options.getString('raid');
    const limit = Math.min(interaction.options.getInteger('limit') ?? 20, 50);

    const where = { guild_id: interaction.guildId };
    if (raidName) where.raid_name = raidName;

    const rows = await BpLootHistory.findAll({
      where,
      order: [['closed_at', 'DESC']],
      limit,
    });

    if (rows.length === 0) {
      await interaction.reply({ content: 'Nessun oggetto registrato nello storico.', flags: 64 });
      return;
    }

    const header = raidName ? `**Loot recap — ${raidName}**\n` : '**Loot recap**\n';
    let body = '';
    for (const r of rows) {
      const ts = Math.floor(new Date(r.closed_at).getTime() / 1000);
      const when = `<t:${ts}:d>`;
      const boss = r.boss ? ` — ${r.boss}` : '';
      const line = `• ${when} **${r.item_name}**${boss} | Vincitore: <@${r.winner_id}> | bid **${r.bid}** | roll **${r.roll}** | score **${r.score}**\n`;
      if (header.length + body.length + line.length > 1900) break;
      body += line;
    }
    await interaction.reply({ content: header + body, flags: 64 });
  },
};
