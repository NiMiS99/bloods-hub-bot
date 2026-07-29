// src/commands/bp.js
// BP (Bloods Points / DKP) management: balance, transfer, leaderboard, admin ops, raid roster.
const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const { BpUser, BpRaidRoster, AuditLog } = require('../db');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { recordAudit } = require('../utils/auditLog');
const { isRaidLeader, getBpUser, getRoster, extractUserIdsFromMentions } = require('../utils/bpHelpers');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bp')
    .setDescription('Gestione Bloods Points (DKP) e roster raid.')

    // ===== PUBBLICI =====
    .addSubcommand((sc) => sc.setName('balance').setDescription('Mostra i tuoi BP (privato).'))
    .addSubcommand((sc) => sc.setName('transfer')
      .setDescription('Trasferisci BP ad un altro giocatore.')
      .addUserOption((o) => o.setName('destinatario').setDescription('A chi trasferire.').setRequired(true))
      .addIntegerOption((o) => o.setName('punti').setDescription('Punti da trasferire (>0).').setRequired(true))
      .addStringOption((o) => o.setName('nota').setDescription('Nota (opzionale).').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) => sc.setName('leaderboard')
      .setDescription('Classifica BP del server.')
      .addIntegerOption((o) => o.setName('righe').setDescription('Numero righe (max 50).').setRequired(false)))

    // ===== ROSTER RAID =====
    .addSubcommand((sc) => sc.setName('raidadd')
      .setDescription('Aggiungi un giocatore alla roster raid.')
      .addUserOption((o) => o.setName('utente').setDescription('Giocatore.').setRequired(true)))
    .addSubcommand((sc) => sc.setName('raidremove')
      .setDescription('Rimuovi un giocatore dalla roster raid.')
      .addUserOption((o) => o.setName('utente').setDescription('Giocatore.').setRequired(true)))
    .addSubcommand((sc) => sc.setName('raidclear')
      .setDescription('Svuota la roster raid (disattiva vincolo).'))
    .addSubcommand((sc) => sc.setName('raidlist')
      .setDescription('Mostra la roster raid attuale.'))

    // ===== ADMIN BP =====
    .addSubcommand((sc) => sc.setName('add')
      .setDescription('Aggiungi BP ad un utente (solo guida).')
      .addUserOption((o) => o.setName('utente').setDescription('Target.').setRequired(true))
      .addIntegerOption((o) => o.setName('punti').setDescription('Punti.').setRequired(true))
      .addStringOption((o) => o.setName('nota').setDescription('Nota.').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) => sc.setName('remove')
      .setDescription('Rimuovi BP ad un utente (solo guida).')
      .addUserOption((o) => o.setName('utente').setDescription('Target.').setRequired(true))
      .addIntegerOption((o) => o.setName('punti').setDescription('Punti.').setRequired(true))
      .addStringOption((o) => o.setName('nota').setDescription('Nota.').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) => sc.setName('set')
      .setDescription('Imposta BP di un utente (solo guida).')
      .addUserOption((o) => o.setName('utente').setDescription('Target.').setRequired(true))
      .addIntegerOption((o) => o.setName('punti').setDescription('Punti.').setRequired(true))
      .addStringOption((o) => o.setName('nota').setDescription('Nota.').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) => sc.setName('reset').setDescription('Azzera tutti i BP del server (solo guida).'))
    .addSubcommand((sc) => sc.setName('addmulti')
      .setDescription('Aggiungi BP a più utenti (solo guida).')
      .addIntegerOption((o) => o.setName('punti').setDescription('Punti da aggiungere.').setRequired(true))
      .addStringOption((o) => o.setName('utenti').setDescription('Elenco menzioni: @A @B @C').setRequired(true).setMaxLength(4000))
      .addStringOption((o) => o.setName('nota').setDescription('Nota (opzionale).').setRequired(false).setMaxLength(4000))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ embeds: [errorEmbed('Questo comando funziona solo dentro un server.')], flags: 64 });
      return;
    }

    // Pubblici
    if (sub === 'balance') return this._balance(interaction);
    if (sub === 'transfer') return this._transfer(interaction);
    if (sub === 'leaderboard') return this._leaderboard(interaction);

    // Roster (guida)
    if (sub === 'raidadd' || sub === 'raidremove' || sub === 'raidclear' || sub === 'raidlist') {
      if (!isRaidLeader(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Comando riservato alle **Guide Incursioni/Spedizioni** e staff.')], flags: 64 });
        return;
      }
      if (sub === 'raidadd') return this._raidAdd(interaction);
      if (sub === 'raidremove') return this._raidRemove(interaction);
      if (sub === 'raidclear') return this._raidClear(interaction);
      if (sub === 'raidlist') return this._raidList(interaction);
    }

    // Admin BP (guida)
    if (sub === 'add' || sub === 'remove' || sub === 'set' || sub === 'reset' || sub === 'addmulti') {
      if (!isRaidLeader(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Comando riservato alle **Guide Incursioni/Spedizioni** e staff.')], flags: 64 });
        return;
      }
      if (sub === 'add') return this._bpAdd(interaction);
      if (sub === 'remove') return this._bpRemove(interaction);
      if (sub === 'set') return this._bpSet(interaction);
      if (sub === 'reset') return this._bpReset(interaction);
      if (sub === 'addmulti') return this._bpAddMulti(interaction);
    }
  },

  // ===== BALANCE =====
  async _balance(interaction) {
    const row = await getBpUser(interaction.guildId, interaction.user.id);
    await interaction.reply({ content: `I tuoi BP: **${row.dkp}**`, flags: 64 });
  },

  // ===== TRANSFER =====
  async _transfer(interaction) {
    const to = interaction.options.getUser('destinatario', true);
    const punti = interaction.options.getInteger('punti', true);
    const nota = interaction.options.getString('nota');

    if (to.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('Non puoi trasferire BP a te stesso.')], flags: 64 });
      return;
    }
    if (punti <= 0) {
      await interaction.reply({ embeds: [errorEmbed('I punti devono essere > 0.')], flags: 64 });
      return;
    }

    const fromRow = await getBpUser(interaction.guildId, interaction.user.id);
    if (fromRow.dkp < punti) {
      await interaction.reply({ content: `Saldo insufficiente. Hai **${fromRow.dkp}** BP, ne servono **${punti}**.`, flags: 64 });
      return;
    }

    const toRow = await getBpUser(interaction.guildId, to.id);
    await fromRow.update({ dkp: fromRow.dkp - punti });
    await toRow.update({ dkp: toRow.dkp + punti });

    const notaText = nota ? `\nNota: ${nota}` : '';
    await interaction.reply({
      content:
        `Trasferimento completato.\n` +
        `Da: <@${interaction.user.id}> (nuovo totale: **${fromRow.dkp}**)\n` +
        `A: <@${to.id}> (nuovo totale: **${toRow.dkp}**)\n` +
        `Punti: **${punti}**${notaText}`,
      flags: 64,
    });

    await recordAudit(interaction, 'bp.transfer', { fromId: interaction.user.id, toId: to.id, punti });
  },

  // ===== LEADERBOARD =====
  async _leaderboard(interaction) {
    const limit = Math.min(interaction.options.getInteger('righe') ?? 10, 50);
    const rows = await BpUser.findAll({
      where: { guild_id: interaction.guildId, dkp: { [require('sequelize').Op.gt]: 0 } },
      order: [['dkp', 'DESC']],
      limit,
    });

    if (rows.length === 0) {
      await interaction.reply({ content: 'Nessun dato BP presente.', flags: 64 });
      return;
    }

    const text = rows.map((r, i) => `${i + 1}. <@${r.user_id}> — **${r.dkp}**`).join('\n');
    await interaction.reply({ content: `**Classifica BP**\n${text}` });
  },

  // ===== RAID ROSTER =====
  async _raidAdd(interaction) {
    const u = interaction.options.getUser('utente', true);
    const roster = await getRoster(interaction.guildId);
    const members = roster.members || [];
    if (!members.includes(u.id)) members.push(u.id);
    await roster.update({ is_active: true, members });
    await interaction.reply({ content: `Aggiunto <@${u.id}> alla roster. Totale: **${members.length}**`, flags: 64 });
    await recordAudit(interaction, 'bp.raidadd', { targetId: u.id });
  },

  async _raidRemove(interaction) {
    const u = interaction.options.getUser('utente', true);
    const roster = await getRoster(interaction.guildId);
    const members = (roster.members || []).filter((id) => id !== u.id);
    const isActive = members.length > 0;
    await roster.update({ members, is_active: isActive });
    await interaction.reply({
      content: `Rimosso <@${u.id}>. Roster attiva: **${isActive ? 'SI' : 'NO'}** | Membri: **${members.length}**`,
      flags: 64,
    });
    await recordAudit(interaction, 'bp.raidremove', { targetId: u.id });
  },

  async _raidClear(interaction) {
    const roster = await getRoster(interaction.guildId);
    await roster.update({ members: [], is_active: false });
    await interaction.reply({ content: 'Roster svuotata. Vincolo roster disattivato (ora chiunque può rollare).', flags: 64 });
    await recordAudit(interaction, 'bp.raidclear', {});
  },

  async _raidList(interaction) {
    const roster = await getRoster(interaction.guildId);
    const members = roster.members || [];
    if (!roster.is_active) {
      await interaction.reply({ content: 'Roster raid: **DISATTIVA** (chiunque può rollare).', flags: 64 });
      return;
    }
    const list = members.length ? members.map((id) => `<@${id}>`).join(', ') : '_(vuota)_';
    await interaction.reply({ content: `Roster raid: **ATTIVA** | Membri: **${members.length}**\n${list}`, flags: 64 });
  },

  // ===== ADMIN BP =====
  async _bpAdd(interaction) {
    await this._bpModify(interaction, 'add');
  },
  async _bpRemove(interaction) {
    await this._bpModify(interaction, 'remove');
  },
  async _bpSet(interaction) {
    await this._bpModify(interaction, 'set');
  },

  async _bpModify(interaction, mode) {
    const target = interaction.options.getUser('utente', true);
    const punti = interaction.options.getInteger('punti', true);
    const nota = interaction.options.getString('nota');

    const row = await getBpUser(interaction.guildId, target.id);
    let after;
    if (mode === 'add') after = row.dkp + punti;
    else if (mode === 'remove') after = row.dkp - punti;
    else after = punti;
    await row.update({ dkp: after });

    const verb = mode === 'add' ? 'Aggiunti' : mode === 'remove' ? 'Rimossi' : 'Impostati';
    const notaText = nota ? `\nNota: ${nota}` : '';
    await interaction.reply({ content: `${verb} BP per <@${target.id}>. Totale: **${after}**.${notaText}`, flags: 64 });
    await recordAudit(interaction, `bp.${mode}`, { targetId: target.id, punti, after });
  },

  async _bpReset(interaction) {
    await BpUser.update({ dkp: 0 }, { where: { guild_id: interaction.guildId } });
    await interaction.reply({ content: 'Tutti i BP del server sono stati azzerati.', flags: 64 });
    await recordAudit(interaction, 'bp.reset', {});
  },

  async _bpAddMulti(interaction) {
    const punti = interaction.options.getInteger('punti', true);
    const utentiRaw = interaction.options.getString('utenti', true);
    const nota = interaction.options.getString('nota');

    const userIds = extractUserIdsFromMentions(utentiRaw);
    if (userIds.length === 0) {
      await interaction.reply({ content: 'Non ho trovato utenti. Usa menzioni: `@A @B @C`', flags: 64 });
      return;
    }
    if (userIds.length > 30) {
      await interaction.reply({ content: 'Troppi utenti (max 30).', flags: 64 });
      return;
    }

    const results = [];
    for (const uid of userIds) {
      const row = await getBpUser(interaction.guildId, uid);
      const after = row.dkp + punti;
      await row.update({ dkp: after });
      results.push({ userId: uid, after });
    }

    const elenco = results.map((r) => `<@${r.userId}> (**${r.after}**)`).join(', ');
    const notaText = nota ? `\nNota: ${nota}` : '';
    await interaction.reply({ content: `Aggiunti **${punti}** BP a **${results.length}** utenti.\n${elenco}${notaText}`, flags: 64 });
    await recordAudit(interaction, 'bp.addmulti', { punti, users: userIds });
  },
};
