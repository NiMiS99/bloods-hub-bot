// src/commands/admin/xpevent.js
// /xpevent — manage XP multiplier events.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const { startEvent, stopEvent, getActiveEvent } = require('../../services/xpEventService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpevent')
    .setDescription('Gestisci eventi XP moltiplicatore.')
    .addSubcommand((sub) =>
      sub.setName('start')
        .setDescription('Avvia un evento XP moltiplicatore.')
        .addIntegerOption((o) => o.setName('moltiplicatore').setDescription('Moltiplicatore XP (es. 2 = doppio XP).').setRequired(true).setMinValue(2).setMaxValue(10))
        .addIntegerOption((o) => o.setName('ore').setDescription('Durata in ore.').setRequired(true).setMinValue(1).setMaxValue(168)))
    .addSubcommand((sub) =>
      sub.setName('stop')
        .setDescription('Ferma l\'evento XP attivo.'))
    .addSubcommand((sub) =>
      sub.setName('status')
        .setDescription('Mostra lo stato dell\'evento XP attivo.')),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const mult = interaction.options.getInteger('moltiplicatore');
      const hours = interaction.options.getInteger('ore');
      const existing = getActiveEvent();
      if (existing) {
        return interaction.reply({ embeds: [errorEmbed(`C'è già un evento attivo: x${existing.multiplier} fino a <t:${Math.floor(new Date(existing.endsAt).getTime() / 1000)}:R>. Fermalo prima di avviarne uno nuovo.`)], flags: 64 });
      }
      await startEvent(interaction.guild.id, mult, hours, interaction.user.id);
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.xpevent.start',
        targetType: 'guild',
        details: { multiplier: mult, durationHours: hours },
      });

      const embed = new EmbedBuilder()
        .setTitle('🎉 Evento XP Attivato!')
        .setColor(0xfee75c)
        .setDescription(
          `**Moltiplicatore:** x${mult}\n` +
          `**Durata:** ${hours} ore\n` +
          `**Scade:** <t:${Math.floor((Date.now() + hours * 3600000) / 1000)}:R>\n\n` +
          `Tutti i messaggi, minuti vocali e bonus ora danno **${mult}x XP**!`
        )
        .setFooter({ text: `Avviato da ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'stop') {
      const existing = getActiveEvent();
      if (!existing) {
        return interaction.reply({ embeds: [errorEmbed('Nessun evento XP attivo.')], flags: 64 });
      }
      await stopEvent(interaction.guild.id);
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.xpevent.stop',
        targetType: 'guild',
      });
      await interaction.reply({ embeds: [successEmbed('Evento XP fermato.')], flags: 64 });
    }

    if (sub === 'status') {
      const existing = getActiveEvent();
      if (!existing) {
        return interaction.reply({ embeds: [baseEmbed({ description: 'Nessun evento XP attivo al momento.', color: 0x95a5a6 })], flags: 64 });
      }
      const embed = new EmbedBuilder()
        .setTitle('🎉 Evento XP Attivo')
        .setColor(0xfee75c)
        .setDescription(
          `**Moltiplicatore:** x${existing.multiplier}\n` +
          `**Scade:** <t:${Math.floor(new Date(existing.endsAt).getTime() / 1000)}:R>\n` +
          `**Avviato da:** <@${existing.startedBy}>`
        );
      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  },
};
