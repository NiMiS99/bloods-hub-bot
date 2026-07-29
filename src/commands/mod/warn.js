// src/commands/mod/warn.js
// /warn — assigns a warning, applies "Warned" role, and auto-escalates on repeated offenses.
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Warning, Guild } = require('../../db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const logger = require('../../utils/logger');

// Warning decay: warnings expire after 30 days without new warnings
const WARNING_DECAY_DAYS = 30;

// Escalation thresholds (based on ACTIVE — non-expired — warnings only)
// 1 warning  -> "Warned" role (visual indicator)
// 3 warnings -> 10 min timeout (mute)
// 5 warnings -> 1 hour timeout
// 7 warnings -> kick
const ESCALATION = [
  { count: 1, action: 'warn_role' },
  { count: 3, action: 'timeout', duration: 10 * 60 * 1000 },   // 10 min
  { count: 5, action: 'timeout', duration: 60 * 60 * 1000 },   // 1 hour
  { count: 7, action: 'kick' },
];

async function getOrCreateWarnedRole(guild) {
  let role = guild.roles.cache.find((r) => r.name === 'Warned');
  if (!role) {
    role = await guild.roles.create({
      name: 'Warned',
      colors: [0xff9900],
      permissions: [],
      hoist: false,
      mentionable: false,
      reason: 'Auto-created for warn system',
    });
    logger.info('Created "Warned" role for warn system.');
  }
  return role;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Assegna un warning a un membro con escalation automatica.')
    .addUserOption((o) => o.setName('user').setDescription('Membro da warnare.').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo del warning.').setRequired(true).setMaxLength(200))
    .addStringOption((o) =>
      o.setName('severita').setDescription('Livello di severità.').setRequired(false).setMaxLength(100)
        .addChoices(
          { name: 'Basso', value: 'low' },
          { name: 'Medio', value: 'medium' },
          { name: 'Alto', value: 'high' },
        )),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('motivo');
    const severity = interaction.options.getString('severita') || 'low';

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Non puoi warnare te stesso.')], flags: 64 });
    }

    const member = await interaction.guild.members.fetch(target.id, { force: false }).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Membro non trovato nel server.')], flags: 64 });
    }

    // Expire old warnings (decay: 30 days without new warnings)
    const decayDate = new Date(Date.now() - WARNING_DECAY_DAYS * 86400000);
    await Warning.update(
      { is_expired: true },
      { where: { user_id: target.id, guild_id: interaction.guild.id, is_expired: false, created_at: { [require('sequelize').Op.lt]: decayDate } } }
    );

    // Create warning record with expiry date
    const expiresAt = new Date(Date.now() + WARNING_DECAY_DAYS * 86400000);
    await Warning.create({
      user_id: target.id,
      guild_id: interaction.guild.id,
      issued_by: interaction.user.id,
      reason,
      severity,
      expires_at: expiresAt,
    });

    // Count only ACTIVE (non-expired) warnings
    const count = await Warning.count({
      where: { user_id: target.id, guild_id: interaction.guild.id, is_expired: false },
    });

    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: 'mod.warn',
      targetType: 'user',
      targetId: target.id,
      details: { reason, severity, total: count },
    });

    // --- Escalation logic ---
    let escalationMsg = '';
    const warnedRole = await getOrCreateWarnedRole(interaction.guild);

    // Always ensure "Warned" role is applied (visual indicator)
    if (!member.roles.cache.has(warnedRole.id)) {
      await member.roles.add(warnedRole).catch((e) => logger.warn(`Warn role add failed: ${e.message}`));
    }

    // Check escalation thresholds
    for (const tier of ESCALATION) {
      if (count === tier.count) {
        switch (tier.action) {
          case 'warn_role':
            escalationMsg = 'Ruolo "Warned" assegnato.';
            break;
          case 'timeout':
            if (member.moderatable) {
              await member.timeout(tier.duration, `${count} warnings: ${reason}`).catch(() => {});
              escalationMsg = `Timeout di ${tier.duration / 60000} minuti applicato (${count} warning).`;
            }
            break;
          case 'kick':
            if (member.kickable) {
              await member.kick(`${count} warnings: ${reason}`).catch(() => {});
              escalationMsg = `Kick automatico (${count} warning).`;
            }
            break;
        }
        break;
      }
    }

    // DM the user
    try {
      await target.send({
        embeds: [baseEmbed({
          title: '⚠️ Warning ricevuto',
          description:
            `Hai ricevuto un warning in **${interaction.guild.name}**.\n\n` +
            `**Motivo:** ${reason}\n**Severità:** ${severity}\n**Warning totali:** ${count}\n\n` +
            (escalationMsg ? `**Azione applicata:** ${escalationMsg}` : '') +
            `\n\n*Il ruolo "Warned" rimane visibile. Al 3° warning: timeout 10min. Al 5°: 1 ora. Al 7°: kick.*`,
          color: 0xff9900,
        })],
      });
    } catch {}

    // Log to advanced logger
    try {
      const AdvancedLogger = require('../../services/advancedLogger');
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Warning Assegnato')
        .setColor(0xff9900)
        .setDescription(
          `**Utente:** ${target.tag}\n` +
          `**Moderatore:** ${interaction.user.tag}\n` +
          `**Motivo:** ${reason}\n` +
          `**Severità:** ${severity}\n` +
          `**Warning totali:** ${count}\n` +
          (escalationMsg ? `**Azione:** ${escalationMsg}` : '')
        )
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();
      const logChannel = await AdvancedLogger.getLogChannel(interaction.guild);
      if (logChannel) await logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch {}

    const severityEmoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
    await interaction.reply({
      embeds: [successEmbed(
        `${severityEmoji} Warning assegnato a ${target}.\n` +
        `**Motivo:** ${reason}\n**Severità:** ${severity}\n**Warning totali:** ${count}\n` +
        (escalationMsg ? `**Azione:** ${escalationMsg}` : '')
      )],
    });
  },
};
