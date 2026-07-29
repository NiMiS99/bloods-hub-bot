// src/commands/spedizione.js
// WoW spedizione: create events with class/spec signups via interactive panels.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { WowEvent, WowEventSignup } = require('../db');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { recordAudit } = require('../utils/auditLog');
const { isRaidLeader } = require('../utils/bpHelpers');
const { CLASSES, findClassByKey } = require('../data/wowClasses');

const PX = 'sped'; // customId prefix

function shortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function parseQuando(str) {
  const s = String(str ?? '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function buildEventEmbed(evt, signups) {
  const ts = evt.when_iso ? Math.floor(new Date(evt.when_iso).getTime() / 1000) : null;
  const whenLine = ts ? `<t:${ts}:F>  (<t:${ts}:R>)` : 'n/a';
  const count = signups.length;
  const max = evt.slots || 0;
  const status = evt.status || 'open';
  const statusLabel = status === 'open' ? 'APERTO' : status === 'closed' ? 'CHIUSO' : 'CANCELLATO';

  let rosterText = '_Nessun iscritto_';
  if (count > 0) {
    rosterText = signups.map((s) => `• <@${s.user_id}> — **${s.class_name}** (${s.spec})`).join('\n');
    if (rosterText.length > 900) rosterText = rosterText.slice(0, 900) + '\n…';
  }

  return baseEmbed({
    title: `Spedizione: ${evt.title}`,
    description: evt.note || null,
    footer: { text: 'Bloods Hub · Spedizione WoW' },
  }).addFields(
    { name: 'ID', value: `\`${evt.id}\``, inline: true },
    { name: 'Stato', value: `**${statusLabel}**`, inline: true },
    { name: 'Quando', value: whenLine, inline: false },
    { name: 'Posti', value: max > 0 ? `**${count}/${max}**` : `**${count}**`, inline: true },
    { name: 'Iscritti', value: rosterText, inline: false }
  );
}

function buildClassMenu(eventId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${PX}_class:${eventId}`)
    .setPlaceholder('Seleziona la tua classe…')
    .addOptions(CLASSES.map((c) => ({ label: c.name, value: c.key })));
  return new ActionRowBuilder().addComponents(menu);
}

function buildUnsubButton(eventId, disabled) {
  const btn = new ButtonBuilder()
    .setCustomId(`${PX}_unsub:${eventId}`)
    .setLabel('Rimuovi iscrizione')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(Boolean(disabled));
  return new ActionRowBuilder().addComponents(btn);
}

function buildSpecMenu(eventId, classKey) {
  const c = findClassByKey(classKey);
  if (!c) return null;
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${PX}_spec:${eventId}:${classKey}`)
    .setPlaceholder(`Spec per ${c.name}…`)
    .addOptions(c.specs.map((s) => ({ label: s, value: s })));
  return new ActionRowBuilder().addComponents(menu);
}

async function refreshEventMessage(evt, client) {
  if (!evt.channel_id || !evt.message_id) return;
  try {
    const ch = await client.channels.fetch(evt.channel_id);
    if (!ch?.isTextBased?.()) return;
    const msg = await ch.messages.fetch(evt.message_id);
    if (!msg) return;
    const signups = await WowEventSignup.findAll({ where: { event_id: evt.id } });
    const isOpen = (evt.status || 'open') === 'open';
    await msg.edit({
      embeds: [buildEventEmbed(evt, signups)],
      components: isOpen ? [buildClassMenu(evt.id), buildUnsubButton(evt.id, false)] : [buildUnsubButton(evt.id, true)],
    });
  } catch (e) {
    // message may be deleted — ignore
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spedizione')
    .setDescription('Gestione spedizioni WoW (con classi/spec).')

    .addSubcommand((sc) => sc.setName('create')
      .setDescription('Crea una spedizione e posta il pannello (solo guida).')
      .addStringOption((o) => o.setName('titolo').setDescription('Titolo spedizione.').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('quando').setDescription('Data/ora (es: 2026-01-15 21:00).').setRequired(true).setMaxLength(100))
      .addIntegerOption((o) => o.setName('posti').setDescription('Posti totali (es: 25).').setRequired(false))
      .addStringOption((o) => o.setName('note').setDescription('Note (opzionale).').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) => sc.setName('list').setDescription('Lista spedizioni attive (solo guida).'))
    .addSubcommand((sc) => sc.setName('close')
      .setDescription('Chiude una spedizione (non accetta più iscrizioni).')
      .addStringOption((o) => o.setName('id').setDescription('ID spedizione.').setRequired(true).setMaxLength(100)))
    .addSubcommand((sc) => sc.setName('cancel')
      .setDescription('Cancella una spedizione (rimuove pannello e dati).')
      .addStringOption((o) => o.setName('id').setDescription('ID spedizione.').setRequired(true).setMaxLength(100)))
    .addSubcommand((sc) => sc.setName('roster')
      .setDescription('Mostra iscritti ad una spedizione (privato).')
      .addStringOption((o) => o.setName('id').setDescription('ID spedizione.').setRequired(true).setMaxLength(100))),

  // Exported for interaction handler
  PX,
  buildEventEmbed,
  buildClassMenu,
  buildUnsubButton,
  buildSpecMenu,
  refreshEventMessage,
  findClassByKey,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ embeds: [errorEmbed('Questo comando funziona solo dentro un server.')], flags: 64 });
      return;
    }

    const adminSubs = new Set(['create', 'list', 'close', 'cancel']);
    if (adminSubs.has(sub)) {
      if (!isRaidLeader(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Comando riservato alle **Guide Incursioni/Spedizioni** e staff.')], flags: 64 });
        return;
      }
    }

    if (sub === 'create') return this._create(interaction, client);
    if (sub === 'list') return this._list(interaction);
    if (sub === 'close') return this._close(interaction, client);
    if (sub === 'cancel') return this._cancel(interaction, client);
    if (sub === 'roster') return this._roster(interaction);
  },

  async _create(interaction, client) {
    const title = interaction.options.getString('titolo', true);
    const quando = interaction.options.getString('quando', true);
    const slots = interaction.options.getInteger('posti') ?? 0;
    const note = interaction.options.getString('note');

    const whenDate = parseQuando(quando);
    if (!whenDate) {
      await interaction.reply({ content: 'Formato `quando` non valido. Usa: `YYYY-MM-DD HH:mm` (es: `2026-01-15 21:00`).', flags: 64 });
      return;
    }

    const id = shortId();
    const evt = await WowEvent.create({
      id,
      guild_id: interaction.guildId,
      title,
      note: note ?? null,
      when_iso: whenDate,
      slots,
      status: 'open',
      created_by: interaction.user.id,
      channel_id: interaction.channelId,
      message_id: null,
    });

    const ch = interaction.channel;
    if (!ch?.isTextBased?.()) {
      await interaction.reply({ content: 'Non riesco a scrivere nel canale corrente.', flags: 64 });
      return;
    }

    const sent = await ch.send({
      embeds: [buildEventEmbed(evt, [])],
      components: [buildClassMenu(evt.id), buildUnsubButton(evt.id, false)],
    });

    await evt.update({ message_id: sent.id });
    await interaction.reply({ content: `Spedizione creata e pubblicata. ID: \`${id}\``, flags: 64 });
    await recordAudit(interaction, 'spedizione.create', { eventId: id, title });
  },

  async _list(interaction) {
    const events = await WowEvent.findAll({
      where: { guild_id: interaction.guildId, status: { [require('sequelize').Op.ne]: 'canceled' } },
      order: [['when_iso', 'ASC']],
    });

    if (events.length === 0) {
      await interaction.reply({ content: 'Nessuna spedizione presente.', flags: 64 });
      return;
    }

    const rows = [];
    for (const e of events.slice(0, 25)) {
      const count = await WowEventSignup.count({ where: { event_id: e.id } });
      const ts = e.when_iso ? Math.floor(new Date(e.when_iso).getTime() / 1000) : null;
      const when = ts ? `<t:${ts}:f>` : 'n/a';
      const cap = e.slots > 0 ? `${count}/${e.slots}` : `${count}`;
      rows.push(`• \`${e.id}\` — **${e.title}** — ${when} — iscritti: **${cap}** — stato: **${e.status}**`);
    }
    await interaction.reply({ content: `**Spedizioni**\n${rows.join('\n')}`, flags: 64 });
  },

  async _close(interaction, client) {
    const id = interaction.options.getString('id', true).trim().toUpperCase();
    const evt = await WowEvent.findByPk(id);
    if (!evt || String(evt.guild_id) !== String(interaction.guildId)) {
      await interaction.reply({ content: 'Spedizione non trovata.', flags: 64 });
      return;
    }
    await evt.update({ status: 'closed' });
    await refreshEventMessage(evt, client);
    await interaction.reply({ content: `Spedizione \`${id}\` chiusa.`, flags: 64 });
    await recordAudit(interaction, 'spedizione.close', { eventId: id });
  },

  async _cancel(interaction, client) {
    const id = interaction.options.getString('id', true).trim().toUpperCase();
    const evt = await WowEvent.findByPk(id);
    if (!evt || String(evt.guild_id) !== String(interaction.guildId)) {
      await interaction.reply({ content: 'Spedizione non trovata.', flags: 64 });
      return;
    }
    await evt.update({ status: 'canceled' });
    await WowEventSignup.destroy({ where: { event_id: id } });
    await refreshEventMessage(evt, client);
    await interaction.reply({ content: `Spedizione \`${id}\` cancellata.`, flags: 64 });
    await recordAudit(interaction, 'spedizione.cancel', { eventId: id });
  },

  async _roster(interaction) {
    const id = interaction.options.getString('id', true).trim().toUpperCase();
    const evt = await WowEvent.findByPk(id);
    if (!evt || String(evt.guild_id) !== String(interaction.guildId)) {
      await interaction.reply({ content: 'Spedizione non trovata.', flags: 64 });
      return;
    }
    const signups = await WowEventSignup.findAll({ where: { event_id: id } });
    if (signups.length === 0) {
      await interaction.reply({ content: `Spedizione \`${id}\`: nessun iscritto.`, flags: 64 });
      return;
    }
    const lines = signups.map((s) => `• <@${s.user_id}> — **${s.class_name}** (${s.spec})`).join('\n');
    await interaction.reply({ content: `**Roster spedizione \`${id}\` — ${evt.title}**\n${lines}`, flags: 64 });
  },
};
