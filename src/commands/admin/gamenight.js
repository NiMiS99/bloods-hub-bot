// src/commands/admin/gamenight.js
// /gamenight — manage recurring game night events.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const { createNight, listNights, toggleNight, deleteNight } = require('../../services/gameNightService');
const { Game } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamenight')
    .setDescription('Gestisci eventi Game Night ricorrenti. (Admin)')
    .addSubcommand((sub) =>
      sub.setName('add')
        .setDescription('Crea un game night ricorrente.')
        .addStringOption((o) => o.setName('nome').setDescription('Nome dell\'evento (es. Valorant Friday).').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('gioco').setDescription('Gioco.').setRequired(true).setAutocomplete(true).setMaxLength(200))
        .addStringOption((o) => o.setName('cron').setDescription('Schedule cron (es. "0 21 * * 5" = ogni venerdì 21:00).').setRequired(true).setMaxLength(100))
        .addIntegerOption((o) => o.setName('posti').setDescription('Posti disponibili.').setRequired(false).setMinValue(2).setMaxValue(20)))
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Lista game nights.'))
    .addSubcommand((sub) =>
      sub.setName('toggle').setDescription('Attiva/disattiva un game night.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del game night.').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('Elimina un game night.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del game night.').setRequired(true))),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const name = interaction.options.getString('nome');
      const gameCode = interaction.options.getString('gioco');
      const cronSchedule = interaction.options.getString('cron');
      const slots = interaction.options.getInteger('posti') || 10;

      const game = await Game.findOne({ where: { code: gameCode, is_active: true } });
      if (!game) {
        return interaction.reply({ embeds: [errorEmbed('Gioco non trovato.')], flags: 64 });
      }

      // Validate cron
      const cron = require('node-cron');
      if (!cron.validate(cronSchedule)) {
        return interaction.reply({ embeds: [errorEmbed('Schedule cron non valida. Formato: "min hour day month weekday" (es. "0 21 * * 5" = venerdì 21:00).')], flags: 64 });
      }

      // Find LFG channel
      const lfgChannel = interaction.guild.channels.cache.find((c) => c.name.toLowerCase().includes('lfg'));

      const night = await createNight({
        guildId: interaction.guild.id,
        name,
        gameCode,
        gameName: game.name,
        cronSchedule,
        slots,
        textChannelId: lfgChannel?.id,
      });

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.gamenight.add',
        targetType: 'game_night',
        targetId: night.id,
        details: { name, game: game.name, cron: cronSchedule },
      });

      await interaction.reply({ embeds: [successEmbed(`Game Night "**${name}**" creato!\n**Gioco:** ${game.name}\n**Schedule:** \`${cronSchedule}\`\n**Posti:** ${slots}\n**Canale:** ${lfgChannel || 'auto'}`)], flags: 64 });
    }

    if (sub === 'list') {
      const nights = await listNights(interaction.guild.id);
      if (nights.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun game night configurato.')], flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎮 Game Nights')
        .setColor(0x8b0000)
        .setDescription(
          nights.map((n) => {
            const status = n.is_active ? '🟢 Attivo' : '🔴 Disattivato';
            return `**ID ${n.id}:** ${n.name}\n  ${status} | ${n.game_name} | \`${n.cron_schedule}\` | ${n.slots} posti`;
          }).join('\n\n')
        );

      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'toggle') {
      const id = interaction.options.getInteger('id');
      const night = await toggleNight(id, interaction.guild.id);
      if (!night) {
        return interaction.reply({ embeds: [errorEmbed('Game night non trovato.')], flags: 64 });
      }
      await interaction.reply({ embeds: [successEmbed(`Game Night "**${night.name}**" ${night.is_active ? 'attivato' : 'disattivato'}.`)], flags: 64 });
    }

    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const deleted = await deleteNight(id, interaction.guild.id);
      if (!deleted) {
        return interaction.reply({ embeds: [errorEmbed('Game night non trovato.')], flags: 64 });
      }
      await interaction.reply({ embeds: [successEmbed('Game Night eliminato.')], flags: 64 });
    }
  },

  async autocomplete(interaction) {
    const games = await Game.findAll({ where: { is_active: true }, attributes: ['code', 'name'], raw: true });
    const focused = interaction.options.getFocused().toLowerCase();
    const filtered = games
      .filter((g) => g.name.toLowerCase().includes(focused) || g.code.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((g) => ({ name: g.name, value: g.code }));
    await interaction.respond(filtered);
  },
};
