// src/commands/mystats.js
// /mystats [user] — unified personal/community profile + stats.
// Merges the old /mystats (XP, badges, activity) and /profile (games, external accounts, stats).
const { SlashCommandBuilder } = require('discord.js');
const { User, UserGame, Game, ActivityLog, GameStat, ExternalAccount } = require('../db');
const { Op } = require('sequelize');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { formatDuration } = require('../utils/format');
const { getUserBadges } = require('../services/badgeService');
const { xpToNextLevel } = require('../services/xpService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mystats')
    .setDescription('Mostra il profilo completo: statistiche, giochi, XP, badge e account collegati.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Membro da cercare (tu per default).').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const isSelf = target.id === interaction.user.id;

    const user = await User.findOne({
      where: { user_id: target.id, guild_id: interaction.guild.id },
    });

    if (!user) {
      await interaction.reply({
        embeds: [errorEmbed('Nessun profilo trovato per questo membro.')],
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: isSelf ? 64 : 0 });

    // --- Data gathering ---
    const userGames = await UserGame.findAll({
      where: { user_id: target.id, guild_id: interaction.guild.id },
      include: [{ model: Game, attributes: ['name', 'code', 'icon_url'] }],
    });

    const ext = await ExternalAccount.findAll({
      where: { user_id: target.id, guild_id: interaction.guild.id },
    });

    const stats = await GameStat.findAll({
      where: { user_id: target.id, guild_id: interaction.guild.id },
      include: [Game],
    });

    // This month's activity
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthActivity = await ActivityLog.findAll({
      where: {
        user_id: target.id,
        guild_id: interaction.guild.id,
        occurred_at: { [Op.gte]: monthStart },
      },
      attributes: ['event_type'],
    });

    const monthMessages = monthActivity.filter((a) => a.event_type === 'message').length;
    const monthVoiceEvents = monthActivity.filter((a) => a.event_type === 'voice_seconds').length;

    const { currentLevel, nextLevel, xpToNext } = xpToNextLevel(user.xp);
    const badges = await getUserBadges(target.id, interaction.guild.id);

    // Per-game voice time tracking
    const gameVoiceLogs = await ActivityLog.findAll({
      where: {
        user_id: target.id,
        guild_id: interaction.guild.id,
        event_type: 'voice_game',
        occurred_at: { [Op.gte]: new Date(Date.now() - 30 * 86400000) },
      },
      attributes: ['metadata', 'amount'],
      raw: true,
    });
    const gameVoiceMap = {};
    for (const log of gameVoiceLogs) {
      try {
        const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        const code = meta?.game_code || 'unknown';
        gameVoiceMap[code] = (gameVoiceMap[code] || 0) + (log.amount || 0);
      } catch {}
    }

    // Reputation
    let reputation = 0;
    try {
      const { getReputation } = require('../services/reputationService');
      const rep = await getReputation(target.id, interaction.guild.id);
      reputation = rep.received;
    } catch {}

    // Streak
    let streak = 0;
    try {
      const { getStreak } = require('../services/challengeService');
      const s = await getStreak(target.id, interaction.guild.id);
      streak = s.current_streak || 0;
    } catch {}

    // --- Build embed ---
    const gamesList = userGames.length > 0
      ? userGames.map((ug) => ug.Game?.name || 'Sconosciuto').join(', ')
      : 'Nessun gioco selezionato';

    const desc = [
      `**Livello ${currentLevel}** → ${nextLevel} (${xpToNext.toLocaleString('it-IT')} XP al prossimo)`,
      `XP totale: ${user.xp.toLocaleString('it-IT')}`,
      '',
      '**Attivita totale:**',
      `Messaggi: **${user.total_messages.toLocaleString('it-IT')}**`,
      `Tempo vocale: **${formatDuration(user.total_voice_seconds)}**`,
      `Ultima attivita: ${user.last_seen_at ? new Date(user.last_seen_at).toLocaleString('it-IT') : '—'}`,
      '',
      '**Questo mese:**',
      `Messaggi: **${monthMessages.toLocaleString('it-IT')}**`,
      `Sessioni vocali: **${monthVoiceEvents.toLocaleString('it-IT')}**`,
      '',
      `**Giochi (${userGames.length}):** ${gamesList}`,
    ];

    if (user.legacy_wow_member) {
      desc.push(``, `**Gilda WoW (Bloods):** Membro${user.legacy_wow_rank ? ` • Rango: ${user.legacy_wow_rank}` : ''}`);
    }

    if (ext.length > 0) {
      desc.push(``, `**Account collegati:**`, ext.map((e) => `${e.provider}: ${e.external_id}`).join('\n'));
    }

    if (stats.length > 0) {
      const grouped = {};
      for (const s of stats) {
        const g = s.Game?.name ?? 'Sconosciuto';
        grouped[g] = grouped[g] || [];
        const val = s.value_str ?? (s.metric.includes('seconds') ? formatDuration(s.value_num) : s.value_num);
        grouped[g].push(`${s.metric.replace(/_/g, ' ')}: ${val}`);
      }
      const statLines = Object.entries(grouped).map(([g, arr]) => `**${g}**\n${arr.join(' | ')}`);
      desc.push(``, `**Statistiche giochi:**`, statLines.join('\n').slice(0, 800));
    }

    desc.push(``, `**Badge (${badges.length}):**`, badges.length > 0
      ? badges.map((b) => `${b.icon} ${b.name}`).join(' • ')
      : 'Nessun badge ancora. Continua a partecipare!');

    // Per-game voice time
    const gameVoiceEntries = Object.entries(gameVoiceMap).sort((a, b) => b[1] - a[1]);
    if (gameVoiceEntries.length > 0) {
      desc.push(``, `**Tempo vocale per gioco (30gg):**`,
        gameVoiceEntries.slice(0, 5).map(([code, sec]) => `• ${code}: ${formatDuration(sec)}`).join('\n'));
    }

    // Reputation & streak
    desc.push(``, `**Reputazione:** 🤝 ${reputation} | **Streak daily:** 🔥 ${streak} giorni`);

    const embed = baseEmbed({
      title: `Profilo — ${target.username}`,
      description: desc.join('\n').slice(0, 4000),
      thumbnail: target.displayAvatarURL({ size: 128 }),
      footer: { text: 'Membro dal ' + (user.joined_discord_at ? new Date(user.joined_discord_at).toLocaleDateString('it-IT') : '?') },
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
