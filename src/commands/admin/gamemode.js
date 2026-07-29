// src/commands/admin/gamemode.js
// /gamemode — manage community private game servers.
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { GameMode } = require('../../db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const GameModeService = require('../../services/gameModeService');
const _logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamemode')
    .setDescription('Gestisci i server privati della community.')
    .addSubcommand((sc) =>
      sc.setName('add').setDescription('Aggiungi un nuovo server privato.')
        .addStringOption((o) => o.setName('nome').setDescription('Nome del server.').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('gioco').setDescription('Nome del gioco (es. Minecraft, WoW, Ark).').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('connessione').setDescription('IP/istruzioni di connessione.').setRequired(true).setMaxLength(100))
        .addStringOption((o) => o.setName('descrizione').setDescription('Descrizione del server.').setRequired(false).setMaxLength(4000))
        .addStringOption((o) => o.setName('versione').setDescription('Versione/modpack del server.').setRequired(false).setMaxLength(100))
        .addStringOption((o) => o.setName('url').setDescription('URL per connettersi (opzionale).').setRequired(false).setMaxLength(100))
        .addIntegerOption((o) => o.setName('slots').setDescription('Numero massimo di giocatori.').setRequired(false))
        .addStringOption((o) =>
          o.setName('stato').setDescription('Stato del server.').setRequired(false).setMaxLength(100)
            .addChoices(
              { name: 'Online', value: 'online' },
              { name: 'Offline', value: 'offline' },
              { name: 'Manutenzione', value: 'maintenance' },
            )))
    .addSubcommand((sc) =>
      sc.setName('edit').setDescription('Modifica un server esistente.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del server da modificare.').setRequired(true))
        .addStringOption((o) => o.setName('nome').setDescription('Nuovo nome.').setRequired(false).setMaxLength(200))
        .addStringOption((o) => o.setName('descrizione').setDescription('Nuova descrizione.').setRequired(false).setMaxLength(4000))
        .addStringOption((o) => o.setName('connessione').setDescription('Nuove istruzioni di connessione.').setRequired(false).setMaxLength(100))
        .addStringOption((o) => o.setName('versione').setDescription('Nuova versione.').setRequired(false).setMaxLength(100))
        .addStringOption((o) => o.setName('url').setDescription('Nuovo URL.').setRequired(false).setMaxLength(100))
        .addIntegerOption((o) => o.setName('slots').setDescription('Nuovi slots massimi.').setRequired(false))
        .addStringOption((o) =>
          o.setName('stato').setDescription('Nuovo stato.').setRequired(false).setMaxLength(100)
            .addChoices(
              { name: 'Online', value: 'online' },
              { name: 'Offline', value: 'offline' },
              { name: 'Manutenzione', value: 'maintenance' },
            )))
    .addSubcommand((sc) =>
      sc.setName('remove').setDescription('Rimuovi un server.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del server da rimuovere.').setRequired(true)))
    .addSubcommand((sc) =>
      sc.setName('list').setDescription('Lista di tutti i server.'))
    .addSubcommand((sc) =>
      sc.setName('post').setDescription('Pubblica/aggiorna il pannello #gamemode.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    // --- ADD ---
    if (sub === 'add') {
      const name = interaction.options.getString('nome');
      const gameName = interaction.options.getString('gioco');
      const connectInfo = interaction.options.getString('connessione');
      const description = interaction.options.getString('descrizione');
      const version = interaction.options.getString('versione');
      const url = interaction.options.getString('url');
      const slots = interaction.options.getInteger('slots');
      const status = interaction.options.getString('stato') || 'offline';

      const server = await GameMode.create({
        guild_id: interaction.guild.id,
        name,
        game_code: gameName.toLowerCase().replace(/\s+/g, ''),
        game_name: gameName,
        description,
        connect_info: connectInfo,
        connect_url: url,
        version,
        max_players: slots,
        status,
      });

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.gamemode.add',
        targetType: 'gamemode',
        targetId: String(server.id),
        details: { name, game: gameName, status },
      });

      await interaction.reply({
        embeds: [successEmbed(`Server **${name}** (${gameName}) aggiunto con ID #${server.id}.\nUsa \`/gamemode post\` per aggiornare il pannello.`)],
        flags: 64,
      });
      return;
    }

    // --- EDIT ---
    if (sub === 'edit') {
      const id = interaction.options.getInteger('id');
      const server = await GameMode.findByPk(id);
      if (!server || server.guild_id !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Server non trovato.')], flags: 64 });
      }

      const updates = {};
      const name = interaction.options.getString('nome');
      const description = interaction.options.getString('descrizione');
      const connectInfo = interaction.options.getString('connessione');
      const version = interaction.options.getString('versione');
      const url = interaction.options.getString('url');
      const slots = interaction.options.getInteger('slots');
      const status = interaction.options.getString('stato');

      if (name) updates.name = name;
      if (description !== null) updates.description = description;
      if (connectInfo) updates.connect_info = connectInfo;
      if (version !== null) updates.version = version;
      if (url !== null) updates.connect_url = url;
      if (slots !== null) updates.max_players = slots;
      if (status) updates.status = status;

      await server.update(updates);

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.gamemode.edit',
        targetType: 'gamemode',
        targetId: String(id),
        details: updates,
      });

      await interaction.reply({
        embeds: [successEmbed(`Server **${server.name}** aggiornato.\nUsa \`/gamemode post\` per aggiornare il pannello.`)],
        flags: 64,
      });
      return;
    }

    // --- REMOVE ---
    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const server = await GameMode.findByPk(id);
      if (!server || server.guild_id !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Server non trovato.')], flags: 64 });
      }

      const name = server.name;
      await server.update({ is_active: false });

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.gamemode.remove',
        targetType: 'gamemode',
        targetId: String(id),
        details: { name },
      });

      await interaction.reply({
        embeds: [successEmbed(`Server **${name}** rimosso.\nUsa \`/gamemode post\` per aggiornare il pannello.`)],
        flags: 64,
      });
      return;
    }

    // --- LIST ---
    if (sub === 'list') {
      const servers = await GameMode.findAll({
        where: { guild_id: interaction.guild.id, is_active: true },
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
      });

      if (servers.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun server configurato. Usa `/gamemode add` per aggiungerne.')], flags: 64 });
      }

      const list = servers.map((s) =>
        `**#${s.id}** — ${s.name} (${s.game_name}) | ${s.status === 'online' ? '🟢' : s.status === 'maintenance' ? '🟡' : '🔴'} ${s.status}`
      ).join('\n');

      await interaction.reply({
        embeds: [baseEmbed({ title: 'Server Privati', description: list, color: 0x8b0000 })],
        flags: 64,
      });
      return;
    }

    // --- POST ---
    if (sub === 'post') {
      await interaction.deferReply({ flags: 64 });
      await GameModeService.postGameModePanel(client);
      await interaction.editReply({
        embeds: [successEmbed('Pannello #gamemode pubblicato/aggiornato.')],
      });
      return;
    }
  },
};
