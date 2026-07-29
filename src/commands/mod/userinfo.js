// src/commands/mod/userinfo.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User, UserGame, Game, ExternalAccount, Warning } = require('../../db');
const { baseEmbed, errorEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { formatDuration } = require('../../utils/format');
const { getUserBadges } = require('../../services/badgeService');
const { xpToNextLevel } = require('../../services/xpService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Mostra informazioni dettagliate su un membro.')
    .addUserOption((o) => o.setName('user').setDescription('Membro da controllare.').setRequired(true)),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ModerateMembers])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const target = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(target.id, { force: false }).catch(() => null);

    const user = await User.findOne({ where: { user_id: target.id, guild_id: interaction.guild.id } });
    const userGames = user ? await UserGame.findAll({
      where: { user_id: target.id, guild_id: interaction.guild.id },
      include: [{ model: Game, attributes: ['name'] }],
    }) : [];
    const accounts = await ExternalAccount.findAll({ where: { user_id: target.id, guild_id: interaction.guild.id } });
    const warnings = await Warning.findAll({ where: { user_id: target.id, guild_id: interaction.guild.id } });
    const badges = user ? await getUserBadges(target.id, interaction.guild.id) : [];

    const { currentLevel } = user ? xpToNextLevel(user.xp) : { currentLevel: 0 };

    const roles = member ? member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => r.name).join(', ') : 'N/A';
    const joinDate = member ? new Date(member.joinedTimestamp).toLocaleDateString('it-IT') : 'N/A';
    const discordJoin = new Date(target.createdTimestamp).toLocaleDateString('it-IT');

    const embed = baseEmbed({
      title: `Info: ${target.tag}`,
      thumbnail: target.displayAvatarURL({ size: 128 }),
      description:
        `**Account Discord:** ${target}\n` +
        `**ID:** ${target.id}\n` +
        `**Registrato Discord:** ${discordJoin}\n` +
        `**Entrato nel server:** ${joinDate}\n\n` +
        `**Ruoli (${member ? member.roles.cache.size - 1 : 0}):** ${roles || 'Nessuno'}\n\n` +
        `**Statistiche Bot:**\n` +
        `Livello: **${currentLevel}** • XP: **${user?.xp?.toLocaleString('it-IT') || 0}**\n` +
        `Messaggi: **${user?.total_messages?.toLocaleString('it-IT') || 0}**\n` +
        `Tempo vocale: **${user ? formatDuration(user.total_voice_seconds) : '0s'}**\n` +
        `Giochi: **${userGames.length}**\n` +
        `Badge: **${badges.length}**\n` +
        `Warning: **${warnings.length}**\n\n` +
        `**Account collegati:** ${accounts.length > 0 ? accounts.map((a) => `${a.provider}:${a.external_id}`).join(', ') : 'Nessuno'}\n\n` +
        `**Warning:** ${warnings.length > 0 ? warnings.map((w) => `[${w.severity}] ${w.reason}`).join('\n') : 'Nessuno'}`,
    });

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};
