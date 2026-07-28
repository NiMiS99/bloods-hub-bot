// src/commands/admin/cmd.js
// /cmd — create, remove, list custom text commands.
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { CustomCommand } = require('../../db');
const { baseEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cmd')
    .setDescription('Gestisci comandi personalizzati della community.')
    .addSubcommand((sc) =>
      sc.setName('add').setDescription('Crea un comando personalizzato.')
        .addStringOption((o) => o.setName('nome').setDescription('Nome del comando (senza /).').setRequired(true).setMaxLength(32))
        .addStringOption((o) => o.setName('risposta').setDescription('Risposta del bot.').setRequired(true))
        .addStringOption((o) => o.setName('titolo').setDescription('Titolo embed (opzionale).').setRequired(false))
        .addStringOption((o) => o.setName('immagine').setDescription('URL immagine embed (opzionale).').setRequired(false)))
    .addSubcommand((sc) =>
      sc.setName('remove').setDescription('Rimuovi un comando personalizzato.')
        .addStringOption((o) => o.setName('nome').setDescription('Nome del comando.').setRequired(true)))
    .addSubcommand((sc) =>
      sc.setName('list').setDescription('Lista comandi personalizzati.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    // --- ADD ---
    if (sub === 'add') {
      const name = interaction.options.getString('nome').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const response = interaction.options.getString('risposta');
      const title = interaction.options.getString('titolo');
      const image = interaction.options.getString('immagine');

      if (name.length < 1 || name.length > 32) {
        return interaction.reply({ embeds: [errorEmbed('Nome non valido. Usa solo lettere, numeri, _ e -.')], flags: 64 });
      }

      // Check if command already exists
      const existing = await CustomCommand.findOne({ where: { guild_id: interaction.guild.id, name } });
      if (existing) {
        // Update
        await existing.update({ response, embed_title: title, embed_image: image });
        await recordAudit({
          guildId: interaction.guild.id,
          actorId: interaction.user.id,
          action: 'admin.cmd.update',
          targetType: 'custom_command',
          targetId: name,
          details: { response: response.slice(0, 100) },
        });
        return interaction.reply({ embeds: [successEmbed(`Comando **!${name}** aggiornato!`)], flags: 64 });
      }

      await CustomCommand.create({
        guild_id: interaction.guild.id,
        name,
        response,
        embed_title: title,
        embed_image: image,
        created_by: interaction.user.id,
      });

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.cmd.add',
        targetType: 'custom_command',
        targetId: name,
        details: { response: response.slice(0, 100) },
      });

      return interaction.reply({ embeds: [successEmbed(`Comando **!${name}** creato!\nUsa \`!${name}\` in chat per attivarlo.`)], flags: 64 });
    }

    // --- REMOVE ---
    if (sub === 'remove') {
      const name = interaction.options.getString('nome').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const deleted = await CustomCommand.destroy({ where: { guild_id: interaction.guild.id, name } });
      if (!deleted) {
        return interaction.reply({ embeds: [errorEmbed(`Comando **!${name}** non trovato.`)], flags: 64 });
      }
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.cmd.remove',
        targetType: 'custom_command',
        targetId: name,
      });
      return interaction.reply({ embeds: [successEmbed(`Comando **!${name}** rimosso.`)], flags: 64 });
    }

    // --- LIST ---
    if (sub === 'list') {
      const commands = await CustomCommand.findAll({
        where: { guild_id: interaction.guild.id, is_active: true },
        order: [['name', 'ASC']],
      });

      if (commands.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun comando personalizzato. Usa `/cmd add` per crearne uno.')], flags: 64 });
      }

      const list = commands.map((c) => {
        const preview = c.response.slice(0, 60);
        return `**!${c.name}** — ${preview}${c.response.length > 60 ? '...' : ''}`;
      }).join('\n');

      return interaction.reply({ embeds: [baseEmbed(`Comandi personalizzati (${commands.length})`).setDescription(list)], flags: 64 });
    }
  },
};
