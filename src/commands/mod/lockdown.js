// src/commands/mod/lockdown.js
// /lockdown — lock/unlock all non-staff channels in emergency.
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const { fromFraktur } = require('../../utils/textFormatter');
const logger = require('../../utils/logger');

const STAFF_ROLE_NAMES = ['Owner', 'Founder', 'Consigliere', 'Bloods Admin', 'Officer', 'Officer Reclutatore', 'Officer in Prova'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Attiva/disattiva lockdown del server.')
    .addStringOption((o) =>
      o.setName('stato').setDescription('Stato del lockdown.').setRequired(false).setMaxLength(100)
        .addChoices(
          { name: 'Attiva', value: 'on' },
          { name: 'Disattiva', value: 'off' },
          { name: 'Stato', value: 'status' },
        )),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const action = interaction.options.getString('stato') || 'status';

    if (action === 'status') {
      const isLocked = interaction.guild.channels.cache.some((c) => {
        if (c.type !== ChannelType.GuildText) return false;
        const ow = c.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
        return ow && ow.deny.has(PermissionsBitField.Flags.SendMessages);
      });
      return interaction.reply({ embeds: [baseEmbed({ description: `Stato lockdown: ${isLocked ? '🔴 ATTIVO' : '🟢 NON ATTIVO'}` })], flags: 64 });
    }

    const lock = action === 'on';
    const staffRoles = interaction.guild.roles.cache.filter((r) =>
      STAFF_ROLE_NAMES.some((n) => r.name.toLowerCase().includes(n.toLowerCase()))
    );

    let affected = 0;
    const channels = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);

    for (const channel of channels.values()) {
      try {
        if (lock) {
          // Deny SendMessages for @everyone
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false,
          }, { reason: `Lockdown by ${interaction.user.tag}` });
          // Allow staff to send
          for (const staffRole of staffRoles.values()) {
            await channel.permissionOverwrites.edit(staffRole, {
              SendMessages: true,
            }, { reason: `Lockdown staff override` });
          }
        } else {
          // Remove the SendMessages deny
          const ow = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
          if (ow && ow.deny.has(PermissionsBitField.Flags.SendMessages)) {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
              SendMessages: null,
            }, { reason: `Lockdown lifted by ${interaction.user.tag}` });
          }
        }
        affected++;
      } catch (err) {
        logger.warn(`Lockdown: failed to update #${channel.name}: ${err.message}`);
      }
    }

    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: `mod.lockdown.${lock ? 'on' : 'off'}`,
      targetType: 'guild',
      details: { channelsAffected: affected },
    });

    const embed = lock
      ? successEmbed(`🔴 **LOCKDOWN ATTIVATO**\n${affected} canali bloccati. Solo lo staff può inviare messaggi.`)
      : successEmbed(`🟢 **LOCKDOWN DISATTIVATO**\n${affected} canali sbloccati. Tutti possono inviare messaggi.`);

    await interaction.reply({ embeds: [embed] });

    // Also send to announcements channel if available
    if (lock) {
      const announceChannel = interaction.guild.channels.cache.find((c) => c.name && fromFraktur(c.name).toLowerCase().includes('annunci'));
      if (announceChannel) {
        await announceChannel.send({
          embeds: [baseEmbed({
            title: '🔴 LOCKDOWN ATTIVATO',
            description: 'Il server è in stato di lockdown per emergenza.\nSolo lo staff può inviare messaggi temporaneamente.\nRimanete calmi, vi aggiorneremo presto.',
            color: 0xed4245,
          })],
        }).catch(() => {});
      }
    }
  },
};
