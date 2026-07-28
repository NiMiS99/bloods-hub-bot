// src/commands/admin/schedule.js
// /schedule — create, remove, list scheduled messages.
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { ScheduledMessage } = require('../../db');
const { baseEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const ScheduledMessageService = require('../../services/scheduledMessageService');
const cron = require('node-cron');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Gestisci messaggi programmati.')
    .addSubcommand((sc) =>
      sc.setName('add').setDescription('Crea un messaggio programmato.')
        .addChannelOption((o) =>
          o.setName('canale').setDescription('Canale dove inviare il messaggio.').setRequired(true)
            .addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('cron').setDescription('Espressione cron (es: 0 9 * * * = ogni giorno alle 9:00).').setRequired(true))
        .addStringOption((o) => o.setName('contenuto').setDescription('Testo del messaggio.').setRequired(true))
        .addStringOption((o) => o.setName('titolo').setDescription('Titolo embed (opzionale).').setRequired(false))
        .addStringOption((o) => o.setName('immagine').setDescription('URL immagine embed (opzionale).').setRequired(false)))
    .addSubcommand((sc) =>
      sc.setName('remove').setDescription('Rimuovi un messaggio programmato.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del messaggio programmato.').setRequired(true)))
    .addSubcommand((sc) =>
      sc.setName('list').setDescription('Lista messaggi programmati.'))
    .addSubcommand((sc) =>
      sc.setName('toggle').setDescription('Attiva/disattiva un messaggio programmato.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del messaggio.').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    // --- ADD ---
    if (sub === 'add') {
      const channel = interaction.options.getChannel('canale');
      const cronExpr = interaction.options.getString('cron');
      const content = interaction.options.getString('contenuto');
      const title = interaction.options.getString('titolo');
      const image = interaction.options.getString('immagine');

      if (!cron.validate(cronExpr)) {
        return interaction.reply({ embeds: [errorEmbed('Espressione cron non valida.\nFormato: `minuto ora giorno mese giorno_settimana`\nEsempio: `0 9 * * *` = ogni giorno alle 9:00')], flags: 64 });
      }

      const msg = await ScheduledMessage.create({
        guild_id: interaction.guild.id,
        channel_id: channel.id,
        content,
        embed_title: title,
        embed_image: image,
        cron_expr: cronExpr,
        created_by: interaction.user.id,
      });

      await ScheduledMessageService.startTask(msg, client);

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.schedule.add',
        targetType: 'scheduled_message',
        targetId: String(msg.id),
        details: { channel: channel.name, cron: cronExpr },
      });

      return interaction.reply({
        embeds: [successEmbed(`Messaggio programmato creato!\n**ID:** #${msg.id}\n**Canale:** ${channel}\n**Cron:** \`${cronExpr}\`\n**Prossimo invio:** calcolato automaticamente.`)],
        flags: 64,
      });
    }

    // --- REMOVE ---
    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const msg = await ScheduledMessage.findByPk(id);
      if (!msg || msg.guild_id !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Messaggio non trovato.')], flags: 64 });
      }

      await msg.update({ is_active: false });
      await ScheduledMessageService.reload(id, client);
      await msg.destroy();

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.schedule.remove',
        targetType: 'scheduled_message',
        targetId: String(id),
      });

      return interaction.reply({ embeds: [successEmbed(`Messaggio programmato #${id} rimosso.`)], flags: 64 });
    }

    // --- LIST ---
    if (sub === 'list') {
      const messages = await ScheduledMessage.findAll({
        where: { guild_id: interaction.guild.id },
        order: [['id', 'ASC']],
      });

      if (messages.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun messaggio programmato.')], flags: 64 });
      }

      const list = messages.map((m) => {
        const status = m.is_active ? '🟢' : '🔴';
        const lastSent = m.last_sent_at ? `<t:${Math.floor(new Date(m.last_sent_at).getTime() / 1000)}:R>` : 'mai';
        return `${status} **#${m.id}** — <#${m.channel_id}>\n  Cron: \`${m.cron_expr}\` | Ultimo: ${lastSent}`;
      }).join('\n\n');

      return interaction.reply({ embeds: [baseEmbed(`Messaggi programmati (${messages.length})`).setDescription(list)], flags: 64 });
    }

    // --- TOGGLE ---
    if (sub === 'toggle') {
      const id = interaction.options.getInteger('id');
      const msg = await ScheduledMessage.findByPk(id);
      if (!msg || msg.guild_id !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Messaggio non trovato.')], flags: 64 });
      }

      const newState = !msg.is_active;
      await msg.update({ is_active: newState });
      await ScheduledMessageService.reload(id, client);

      return interaction.reply({
        embeds: [successEmbed(`Messaggio #${id} ${newState ? 'attivato' : 'disattivato'}.`)],
        flags: 64,
      });
    }
  },
};
