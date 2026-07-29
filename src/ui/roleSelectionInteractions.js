// src/ui/roleSelectionInteractions.js
// Handles button + select-menu interactions emitted by the role-selection panel.
// CustomId format: "role:<type>:<payload>"  e.g. "role:btn:valorant", "role:select:games"
//
// Three-tier role logic:
//   Tier 1 — Bloods (legacy WoW guild): never touched here.
//   Tier 2 — Membro della community: auto-assigned when a user selects ≥1 game,
//            auto-removed when they have 0 game roles AND do not hold Bloods.
//   Tier 3 — Game roles: toggled by the user via buttons / select menu.
const { successEmbed, errorEmbed, baseEmbed } = require('../utils/embed');
const { Game, User } = require('../db');
const { addGameRole, removeGameRole, syncCommunityRole } = require('./roleSelection');
const { awardRoleBonus } = require('../services/xpService');
const { checkBadges } = require('../services/badgeService');
const logger = require('../utils/logger');

async function handleButton(interaction, client, action, _rest) {
  // Defer immediately — role operations + DB queries can exceed 3s.
  await interaction.deferReply({ flags: 64 });

  // action === 'clear'  -> remove all game roles
  // action === <gameCode> -> toggle that game
  if (action === 'clear') {
    const games = await Game.findAll({ where: { is_active: true } });
    const member = interaction.member;
    let removed = 0;
    for (const g of games) {
      if (g.role_id && member.roles.cache.has(g.role_id)) {
        await removeGameRole(member, g);
        removed++;
      }
    }
    // After clearing all game roles, sync community role (stripped unless Bloods).
    const communityResult = await syncCommunityRole(member, interaction.guild, games);
    const communityNote = communityResult === 'removed'
      ? '\nRuolo **Membro della community** rimosso (nessun gioco selezionato).'
      : communityResult === 'unchanged' && removed > 0
        ? '\nRuolo **Membro della community** mantenuto (membro della gilda Bloods).'
        : '';
    await interaction.editReply({
      embeds: [successEmbed(`Rimossi ${removed} ruoli di gioco.${communityNote}`)],
    });
    return;
  }

  // toggle a single game
  const game = await Game.findOne({ where: { code: action, is_active: true } });
  if (!game) {
    await interaction.editReply({ embeds: [errorEmbed('Quel gioco non è più disponibile.')] });
    return;
  }
  // Check if the game has a Discord role configured.
  if (!game.role_id) {
    await interaction.editReply({
      embeds: [errorEmbed(`**${game.name}** non ha un ruolo Discord configurato. Un amministratore deve eseguire \`/game add\` o \`/game update\` per creare il ruolo.`)],
    });
    return;
  }
  const member = interaction.member;
  const has = member.roles.cache.has(game.role_id);
  try {
    if (has) {
      await removeGameRole(member, game);
      // Sync community role after removal.
      const games = await Game.findAll({ where: { is_active: true } });
      const communityResult = await syncCommunityRole(member, interaction.guild, games);
      const communityNote = communityResult === 'removed'
        ? '\nRuolo **Membro della community** rimosso.'
        : communityResult === 'unchanged'
          ? '\nRuolo **Membro della community** mantenuto.'
          : '';
      await interaction.editReply({
        embeds: [baseEmbed({ description: `Rimosso il ruolo **${game.name}**.${communityNote}`, color: 0x95a5a6 })],
      });
    } else {
      await addGameRole(member, game, interaction.guild);
      // Sync community role after addition (will be added if not already present).
      const games = await Game.findAll({ where: { is_active: true } });
      const communityResult = await syncCommunityRole(member, interaction.guild, games);
      const communityNote = communityResult === 'added'
        ? '\nRuolo **Membro della community** assegnato!'
        : '';
      // Award XP bonus for joining a game + check badges.
      try {
        const user = await User.findOne({ where: { user_id: member.id, guild_id: interaction.guild.id } });
        if (user) {
          await awardRoleBonus(user);
          await checkBadges(user, interaction.guild);
        }
      } catch {}
      await interaction.editReply({
        embeds: [successEmbed(`Ruolo **${game.name}** assegnato — benvenuto a bordo!${communityNote}`)],
      });
    }
  } catch (err) {
    logger.error('role button error:', err);
    await interaction.editReply({
      embeds: [errorEmbed(`Impossibile aggiornare il ruolo: ${err.message}`)],
    });
  }
}

async function handleSelectMenu(interaction, client, action, _rest) {
  // Defer immediately — role operations + DB queries can exceed 3s.
  await interaction.deferReply({ flags: 64 });

  // action === 'games'; interaction.values is the array of selected game codes.
  if (action !== 'games') {
    await interaction.editReply({ embeds: [errorEmbed('Azione menu non riconosciuta.')] });
    return;
  }
  const selectedCodes = new Set(interaction.values || []);
  const member = interaction.member;
  const guild = interaction.guild;

  const allGames = await Game.findAll({ where: { is_active: true } });
  const added = [];
  const removed = [];
  const skipped = [];

  for (const game of allGames) {
    const wants = selectedCodes.has(game.code);
    const has = game.role_id && member.roles.cache.has(game.role_id);
    if (wants && !has) {
      if (!game.role_id) {
        skipped.push(game.name);
        continue;
      }
      try {
        await addGameRole(member, game, guild);
        added.push(game.name);
      } catch (err) {
        logger.error(`Failed to add role ${game.code}: ${err.message || err.name || JSON.stringify(err)}`);
        skipped.push(game.name);
      }
    } else if (!wants && has) {
      await removeGameRole(member, game);
      removed.push(game.name);
    }
  }

  // Sync the "Membro della community" role based on the new game-role state.
  const communityResult = await syncCommunityRole(member, guild, allGames);

  const lines = [];
  if (added.length) lines.push(`✅ Ti sei unito a: **${added.join('**, **')}**`);
  if (removed.length) lines.push(`➖ Hai lasciato: **${removed.join('**, **')}**`);
  if (communityResult === 'added') lines.push('🎫 Ruolo **Membro della community** assegnato!');
  if (communityResult === 'removed') lines.push('🎫 Ruolo **Membro della community** rimosso.');
  if (skipped.length) lines.push(`⚠️ Giochi senza ruolo configurato (salta): **${skipped.join('**, **')}** — contatta un admin.`);
  if (lines.length === 0) lines.push('Nessuna modifica — la tua selezione è aggiornata.');

  await interaction.editReply({
    embeds: [baseEmbed({ title: 'Ruoli aggiornati', description: lines.join('\n') })],
  });
}

module.exports = { handleButton, handleSelectMenu };
