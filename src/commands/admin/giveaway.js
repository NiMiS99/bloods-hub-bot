// src/commands/admin/giveaway.js
// /giveaway — create, end, list giveaways.
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Giveaway } = require('../../db');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const GiveawayService = require('../../services/giveawayService');
const logger = require('../../utils/logger');

// Parse duration string like "1h", "30m", "2d", "1h30m"
function parseDuration(str) {
  const match = str.match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return null;
  const [, d, h, m, s] = match;
  const total = (parseInt(d) || 0) * 86400 + (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
  return total > 0 ? total * 1000 : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gestisci i giveaway della community.')
    .addSubcommand((sc) =>
      sc.setName('create').setDescription('Crea un nuovo giveaway.')
        .addStringOption((o) => o.setName('premio').setDescription('Il premio del giveaway.').setRequired(true))
        .addStringOption((o) => o.setName('durata').setDescription('Durata (es. 1h, 30m, 2d, 1h30m).').setRequired(true))
        .addStringOption((o) => o.setName('titolo').setDescription('Titolo del giveaway.').setRequired(false))
        .addStringOption((o) => o.setName('descrizione').setDescription('Descrizione opzionale.').setRequired(false))
        .addIntegerOption((o) => o.setName('vincitori').setDescription('Numero di vincitori.').setRequired(false).setMinValue(1).setMaxValue(20))
        .addRoleOption((o) => o.setName('ruolo').setDescription('Ruolo richiesto per partecipare.').setRequired(false)))
    .addSubcommand((sc) =>
      sc.setName('end').setDescription('Termina un giveaway in anticipo.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del giveaway.').setRequired(true)))
    .addSubcommand((sc) =>
      sc.setName('list').setDescription('Lista giveaway attivi.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    // --- CREATE ---
    if (sub === 'create') {
      const prize = interaction.options.getString('premio');
      const durationStr = interaction.options.getString('durata');
      const title = interaction.options.getString('titolo') || `Vinco: ${prize}`;
      const description = interaction.options.getString('descrizione');
      const winnerCount = interaction.options.getInteger('vincitori') || 1;
      const requiredRole = interaction.options.getRole('ruolo');

      const durationMs = parseDuration(durationStr);
      if (!durationMs) {
        return interaction.reply({ embeds: [errorEmbed('Durata non valida. Usa formati come: 1h, 30m, 2d, 1h30m.')], flags: 64 });
      }
      if (durationMs > 30 * 24 * 60 * 60 * 1000) {
        return interaction.reply({ embeds: [errorEmbed('Durata massima: 30 giorni.')], flags: 64 });
      }

      await interaction.deferReply({ flags: 64 });

      const endsAt = new Date(Date.now() + durationMs);
      const giveaway = await Giveaway.create({
        guild_id: interaction.guild.id,
        channel_id: interaction.channel.id,
        title,
        description,
        prize,
        winner_count: winnerCount,
        required_role_id: requiredRole?.id || null,
        ends_at: endsAt,
        hosted_by: interaction.user.id,
      });

      // Post the giveaway message
      const payload = GiveawayService.buildGiveawayMessage(giveaway, 0);
      const sent = await interaction.channel.send(payload);
      await giveaway.update({ message_id: sent.id });

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.giveaway.create',
        targetType: 'giveaway',
        targetId: String(giveaway.id),
        details: { prize, winnerCount, endsAt: endsAt.toISOString() },
      });

      await interaction.editReply({
        embeds: [successEmbed(`Giveaway creato! Premio: **${prize}**\nScade: <t:${Math.floor(endsAt.getTime() / 1000)}:F>\nID: #${giveaway.id}`)],
      });
      return;
    }

    // --- END ---
    if (sub === 'end') {
      const id = interaction.options.getInteger('id');
      const giveaway = await Giveaway.findByPk(id);
      if (!giveaway || giveaway.guild_id !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Giveaway non trovato.')], flags: 64 });
      }
      if (giveaway.is_ended) {
        return interaction.reply({ embeds: [errorEmbed('Questo giveaway è già terminato.')], flags: 64 });
      }

      await interaction.deferReply({ flags: 64 });
      await GiveawayService.endGiveaway(id, client);

      await interaction.editReply({
        embeds: [successEmbed(`Giveaway #${id} terminato. Vincitori annunciati nel canale.`)],
      });
      return;
    }

    // --- LIST ---
    if (sub === 'list') {
      const giveaways = await Giveaway.findAll({
        where: { guild_id: interaction.guild.id, is_active: true },
        order: [['ends_at', 'ASC']],
      });

      if (giveaways.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun giveaway attivo.')], flags: 64 });
      }

      const list = giveaways.map((g) => {
        const ends = Math.floor(new Date(g.ends_at).getTime() / 1000);
        return `**#${g.id}** — ${g.title}\n  Premio: ${g.prize} | Scade: <t:${ends}:R> | Canale: <#${g.channel_id}>`;
      }).join('\n\n');

      return interaction.reply({ embeds: [successEmbed(`**Giveaway attivi (${giveaways.length}):**\n\n${list}`)], flags: 64 });
    }
  },
};
