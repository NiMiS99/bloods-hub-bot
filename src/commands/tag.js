// src/commands/tag.js
// /tag — manage and use predefined text tags (FAQ snippets).
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const { recordAudit } = require('../utils/auditLog');
const { Tag } = require('../db');
const { Op: _Op } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Gestisci e usa tag predefiniti (FAQ, snippet).')
    .addSubcommand((sub) =>
      sub.setName('get')
        .setDescription('Mostra un tag.')
        .addStringOption((o) => o.setName('nome').setDescription('Nome del tag.').setRequired(true).setAutocomplete(true).setMaxLength(100)))
    .addSubcommand((sub) =>
      sub.setName('list')
        .setDescription('Lista tutti i tag.'))
    .addSubcommand((sub) =>
      sub.setName('create')
        .setDescription('Crea un nuovo tag. (Admin)')
        .addStringOption((o) => o.setName('nome').setDescription('Nome (senza spazi).').setRequired(true).setMaxLength(100))
        .addStringOption((o) => o.setName('contenuto').setDescription('Contenuto del tag.').setRequired(true).setMaxLength(4000))
        .addStringOption((o) => o.setName('categoria').setDescription('Categoria.').setRequired(false).setMaxLength(200)))
    .addSubcommand((sub) =>
      sub.setName('edit')
        .setDescription('Modifica un tag esistente. (Admin)')
        .addStringOption((o) => o.setName('nome').setDescription('Nome del tag.').setRequired(true).setAutocomplete(true).setMaxLength(100))
        .addStringOption((o) => o.setName('contenuto').setDescription('Nuovo contenuto.').setRequired(true).setMaxLength(4000)))
    .addSubcommand((sub) =>
      sub.setName('delete')
        .setDescription('Elimina un tag. (Admin)')
        .addStringOption((o) => o.setName('nome').setDescription('Nome del tag.').setRequired(true).setAutocomplete(true).setMaxLength(100))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'get') {
      const name = interaction.options.getString('nome').toLowerCase();
      const tag = await Tag.findOne({ where: { guild_id: guildId, name, is_active: true } });
      if (!tag) {
        return interaction.reply({ embeds: [errorEmbed('Tag non trovato.')], flags: 64 });
      }
      await tag.update({ uses: tag.uses + 1 });
      await interaction.reply({ content: tag.content.substring(0, 2000) });
    }

    if (sub === 'list') {
      const tags = await Tag.findAll({ where: { guild_id: guildId, is_active: true }, order: [['name', 'ASC']] });
      if (tags.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun tag disponibile.')], flags: 64 });
      }

      // Group by category
      const grouped = {};
      for (const t of tags) {
        const cat = t.category || 'Generale';
        grouped[cat] = grouped[cat] || [];
        grouped[cat].push(t);
      }

      const embed = new EmbedBuilder()
        .setTitle('🏷️ Tag Disponibili')
        .setColor(0x8b0000)
        .setDescription(
          Object.entries(grouped).map(([cat, list]) =>
            `**${cat}:**\n${list.map((t) => `\`${t.name}\` (${t.uses} usi)`).join(', ')}`
          ).join('\n\n')
        )
        .setFooter({ text: 'Usa /tag get nome per mostrare un tag' });

      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'create') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono creare tag.')], flags: 64 });
      }
      const name = interaction.options.getString('nome').toLowerCase().replace(/\s+/g, '-');
      const content = interaction.options.getString('contenuto');
      const category = interaction.options.getString('categoria') || 'Generale';

      const existing = await Tag.findOne({ where: { guild_id: guildId, name } });
      if (existing) {
        return interaction.reply({ embeds: [errorEmbed('Un tag con questo nome esiste già.')], flags: 64 });
      }

      const tag = await Tag.create({
        guild_id: guildId,
        name,
        content,
        category,
        created_by: interaction.user.id,
      });

      await recordAudit({
        guildId, actorId: interaction.user.id,
        action: 'admin.tag.create',
        targetType: 'tag', targetId: tag.id,
        details: { name, category },
      });

      await interaction.reply({ embeds: [successEmbed(`Tag \`${name}\` creato!`)], flags: 64 });
    }

    if (sub === 'edit') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono modificare tag.')], flags: 64 });
      }
      const name = interaction.options.getString('nome').toLowerCase();
      const content = interaction.options.getString('contenuto');
      const [updated] = await Tag.update({ content }, { where: { guild_id: guildId, name } });
      if (!updated) {
        return interaction.reply({ embeds: [errorEmbed('Tag non trovato.')], flags: 64 });
      }
      await interaction.reply({ embeds: [successEmbed(`Tag \`${name}\` aggiornato!`)], flags: 64 });
    }

    if (sub === 'delete') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono eliminare tag.')], flags: 64 });
      }
      const name = interaction.options.getString('nome').toLowerCase();
      const deleted = await Tag.destroy({ where: { guild_id: guildId, name } });
      if (!deleted) {
        return interaction.reply({ embeds: [errorEmbed('Tag non trovato.')], flags: 64 });
      }
      await interaction.reply({ embeds: [successEmbed(`Tag \`${name}\` eliminato!`)], flags: 64 });
    }
  },

  async autocomplete(interaction) {
    const tags = await Tag.findAll({
      where: { guild_id: interaction.guild.id, is_active: true },
      attributes: ['name', 'category'],
      raw: true,
    });
    const focused = interaction.options.getFocused().toLowerCase();
    const filtered = tags
      .filter((t) => t.name.includes(focused))
      .slice(0, 25)
      .map((t) => ({ name: t.name, value: t.name }));
    await interaction.respond(filtered);
  },
};
