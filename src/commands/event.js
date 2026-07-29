// src/commands/event.js
// Event system: create, list, join, leave, info, delete.
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CommunityEvent, EventParticipant, Game } = require('../db');
const { Op } = require('sequelize');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const { recordAudit } = require('../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Gestisci eventi community.')
    .addSubcommand((sc) => sc.setName('create')
      .setDescription('Crea un nuovo evento.')
      .addStringOption((o) => o.setName('nome').setDescription('Nome evento.').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('quando').setDescription('Data/ora (es. 2026-07-25 20:00).').setRequired(true).setMaxLength(100))
      .addIntegerOption((o) => o.setName('durata').setDescription('Durata in minuti.').setRequired(false))
      .addStringOption((o) => o.setName('gioco').setDescription('Codice gioco (es. valorant).').setRequired(false).setAutocomplete(true).setMaxLength(200))
      .addStringOption((o) => o.setName('descrizione').setDescription('Descrizione evento.').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) => sc.setName('list')
      .setDescription('Lista prossimi eventi.'))
    .addSubcommand((sc) => sc.setName('info')
      .setDescription('Dettagli di un evento.')
      .addIntegerOption((o) => o.setName('id').setDescription('ID evento.').setRequired(true)))
    .addSubcommand((sc) => sc.setName('delete')
      .setDescription('Elimina un evento (admin).')
      .addIntegerOption((o) => o.setName('id').setDescription('ID evento.').setRequired(true))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const games = await Game.findAll({ where: { is_active: true, code: { [Op.like]: `${focused}%` } } });
    await interaction.respond(games.slice(0, 25).map((g) => ({ name: g.name, value: g.code })));
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return this._create(interaction);
    if (sub === 'list') return this._list(interaction);
    if (sub === 'info') return this._info(interaction);
    if (sub === 'delete') return this._delete(interaction);
  },

  async _create(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono creare eventi.')], flags: 64 });
    }

    const name = interaction.options.getString('nome');
    const whenStr = interaction.options.getString('quando');
    const duration = interaction.options.getInteger('durata') || 60;
    const gameCode = interaction.options.getString('gioco');
    const description = interaction.options.getString('descrizione');

    const scheduledAt = new Date(whenStr);
    if (isNaN(scheduledAt.getTime())) {
      return interaction.reply({ embeds: [errorEmbed('Data non valida. Usa formato: `2026-07-25 20:00`')], flags: 64 });
    }
    if (scheduledAt < new Date()) {
      return interaction.reply({ embeds: [errorEmbed('La data deve essere nel futuro.')], flags: 64 });
    }

    let gameId = null;
    if (gameCode) {
      const game = await Game.findOne({ where: { code: gameCode } });
      if (game) gameId = game.id;
    }

    const event = await CommunityEvent.create({
      guild_id: interaction.guild.id,
      game_id: gameId,
      name,
      description,
      scheduled_at: scheduledAt,
      duration_minutes: duration,
      created_by: interaction.user.id,
    });

    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: 'event.create',
      targetType: 'event',
      targetId: event.id,
      details: { name, scheduled_at: scheduledAt },
    });

    const game = gameId ? await Game.findByPk(gameId) : null;
    const embed = baseEmbed({
      title: `📅 Evento: ${name}`,
      description:
        `**Quando:** ${scheduledAt.toLocaleString('it-IT')}\n` +
        `**Durata:** ${duration} min\n` +
        (game ? `**Gioco:** ${game.name}\n` : '') +
        (description ? `**Descrizione:** ${description}\n` : '') +
        `\n**ID:** ${event.id}\n` +
        `**Creato da:** ${interaction.user}`,
      color: 0x5865f2,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`event:btn:join:${event.id}`).setLabel('Partecipo').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`event:btn:leave:${event.id}`).setLabel('Disiscrivimi').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async _list(interaction) {
    const events = await CommunityEvent.findAll({
      where: { guild_id: interaction.guild.id, is_active: true, scheduled_at: { [Op.gte]: new Date() } },
      order: [['scheduled_at', 'ASC']],
      limit: 10,
    });

    if (events.length === 0) {
      return interaction.reply({ embeds: [baseEmbed({ description: 'Nessun evento programmato.' })] });
    }

    const eventList = await Promise.all(events.map(async (e) => {
      const count = await EventParticipant.count({ where: { event_id: e.id } });
      const game = e.game_id ? await Game.findByPk(e.game_id) : null;
      return `**#${e.id}** — ${e.name}\n  📅 ${new Date(e.scheduled_at).toLocaleString('it-IT')} • 👥 ${count} partecipanti${game ? ` • 🎮 ${game.name}` : ''}`;
    }));

    const embed = baseEmbed({
      title: '📅 Prossimi eventi',
      description: eventList.join('\n\n'),
      color: 0x5865f2,
    });

    await interaction.reply({ embeds: [embed] });
  },

  async _info(interaction) {
    const id = interaction.options.getInteger('id');
    const event = await CommunityEvent.findByPk(id);
    if (!event || event.guild_id !== interaction.guild.id) {
      return interaction.reply({ embeds: [errorEmbed('Evento non trovato.')], flags: 64 });
    }

    const participants = await EventParticipant.findAll({ where: { event_id: id } });
    const game = event.game_id ? await Game.findByPk(event.game_id) : null;
    const creator = await interaction.guild.members.fetch(event.created_by, { force: false }).catch(() => null);

    const embed = baseEmbed({
      title: `📅 ${event.name}`,
      description:
        `**Quando:** ${new Date(event.scheduled_at).toLocaleString('it-IT')}\n` +
        `**Durata:** ${event.duration_minutes} min\n` +
        (game ? `**Gioco:** ${game.name}\n` : '') +
        (event.description ? `**Descrizione:** ${event.description}\n` : '') +
        `**Creato da:** ${creator ? creator.user : '<@' + event.created_by + '>'}\n\n` +
        `**Partecipanti (${participants.length}):**\n` +
        (participants.length > 0 ? participants.map((p) => `<@${p.user_id}>`).join(', ') : 'Nessuno ancora. Sii il primo!'),
      color: 0x5865f2,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`event:btn:join:${event.id}`).setLabel('Partecipo').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`event:btn:leave:${event.id}`).setLabel('Disiscrivimi').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async _delete(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono eliminare eventi.')], flags: 64 });
    }

    const id = interaction.options.getInteger('id');
    const event = await CommunityEvent.findByPk(id);
    if (!event || event.guild_id !== interaction.guild.id) {
      return interaction.reply({ embeds: [errorEmbed('Evento non trovato.')], flags: 64 });
    }

    await event.update({ is_active: false });
    await EventParticipant.destroy({ where: { event_id: id } });

    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: 'event.delete',
      targetType: 'event',
      targetId: id,
    });

    await interaction.reply({ embeds: [successEmbed(`Evento **${event.name}** eliminato.`)] });
  },
};
