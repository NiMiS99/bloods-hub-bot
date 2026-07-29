// src/services/tournamentService.js
// Tournament management — single elimination brackets.
const { Tournament, TournamentParticipant } = require('../db');
const _logger = require('../utils/logger');

/**
 * Create a new tournament.
 */
async function createTournament({ guildId, name, game, description, format, maxParticipants, createdBy }) {
  return Tournament.create({
    guild_id: guildId,
    name,
    game,
    description,
    format: format || 'single_elim',
    max_participants: maxParticipants || 16,
    status: 'registration',
    created_by: createdBy,
  });
}

/**
 * Register a participant.
 */
async function register(tournamentId, userId, guildId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) return { error: 'Torneo non trovato.' };
  if (tournament.status !== 'registration') return { error: 'Le iscrizioni sono chiuse.' };

  const count = await TournamentParticipant.count({ where: { tournament_id: tournamentId } });
  if (count >= tournament.max_participants) return { error: 'Torneo pieno.' };

  const existing = await TournamentParticipant.findOne({ where: { tournament_id: tournamentId, user_id: userId } });
  if (existing) return { error: 'Sei già iscritto.' };

  const participant = await TournamentParticipant.create({
    tournament_id: tournamentId,
    user_id: userId,
    guild_id: guildId,
    seed: count + 1,
  });

  return { participant, count: count + 1, max: tournament.max_participants };
}

/**
 * Unregister a participant.
 */
async function unregister(tournamentId, userId) {
  const deleted = await TournamentParticipant.destroy({ where: { tournament_id: tournamentId, user_id: userId } });
  return { deleted };
}

/**
 * Get tournament participants.
 */
async function getParticipants(tournamentId) {
  return TournamentParticipant.findAll({
    where: { tournament_id: tournamentId },
    order: [['seed', 'ASC']],
  });
}

/**
 * Generate single-elimination bracket.
 */
async function generateBracket(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) return { error: 'Torneo non trovato.' };

  const participants = await getParticipants(tournamentId);
  if (participants.length < 2) return { error: 'Servono almeno 2 partecipanti.' };

  // Shuffle participants for seeding
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // Pad to next power of 2 with byes
  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const slots = [];
  for (let i = 0; i < nextPow2; i++) {
    slots.push(i < shuffled.length ? { userId: shuffled[i].user_id, seed: i + 1 } : null);
  }

  // Build rounds
  const rounds = [];
  const currentRound = [];
  for (let i = 0; i < slots.length; i += 2) {
    const p1 = slots[i];
    const p2 = slots[i + 1];
    const match = {
      matchId: rounds.length * 100 + currentRound.length,
      round: 0,
      p1: p1,
      p2: p2,
      winner: p2 === null ? p1?.userId : null, // Auto-win if bye
      loser: null,
    };
    currentRound.push(match);
  }
  rounds.push(currentRound);

  // Generate empty rounds until final
  let matchCount = currentRound.length;
  while (matchCount > 1) {
    matchCount = Math.ceil(matchCount / 2);
    const round = [];
    for (let i = 0; i < matchCount; i++) {
      round.push({
        matchId: rounds.length * 100 + i,
        round: rounds.length,
        p1: null,
        p2: null,
        winner: null,
        loser: null,
      });
    }
    rounds.push(round);
  }

  await tournament.update({
    bracket: rounds,
    status: 'in_progress',
    current_round: 0,
    started_at: new Date(),
  });

  return { tournament, rounds };
}

/**
 * Report a match result.
 */
async function reportResult(tournamentId, matchId, winnerId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament || !tournament.bracket) return { error: 'Torneo o bracket non trovato.' };

  const bracket = tournament.bracket;
  let match = null;
  let matchRound = -1;
  let matchIdx = -1;

  for (let r = 0; r < bracket.length; r++) {
    const idx = bracket[r].findIndex((m) => m.matchId === matchId);
    if (idx >= 0) {
      match = bracket[r][idx];
      matchRound = r;
      matchIdx = idx;
      break;
    }
  }

  if (!match) return { error: 'Match non trovato.' };
  if (match.winner) return { error: 'Match già completato.' };

  const loserId = match.p1?.userId === winnerId ? match.p2?.userId : match.p1?.userId;
  match.winner = winnerId;
  match.loser = loserId;

  // Mark loser as eliminated
  if (loserId) {
    await TournamentParticipant.update(
      { eliminated: true, eliminated_round: matchRound },
      { where: { tournament_id: tournamentId, user_id: loserId } }
    );
  }

  // Advance winner to next round
  if (matchRound + 1 < bracket.length) {
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const nextMatch = bracket[matchRound + 1][nextMatchIdx];
    if (matchIdx % 2 === 0) {
      nextMatch.p1 = { userId: winnerId };
    } else {
      nextMatch.p2 = { userId: winnerId };
    }
  } else {
    // Final match — tournament complete
    await tournament.update({
      status: 'completed',
      completed_at: new Date(),
    });
    // Set winner's final position
    await TournamentParticipant.update(
      { final_position: 1 },
      { where: { tournament_id: tournamentId, user_id: winnerId } }
    );
  }

  await tournament.update({ bracket });
  return { tournament, match };
}

/**
 * Get active tournaments.
 */
async function getActiveTournaments(guildId) {
  return Tournament.findAll({
    where: { guild_id: guildId, status: ['registration', 'in_progress'] },
    order: [['created_at', 'DESC']],
  });
}

/**
 * Get tournament by ID.
 */
async function getTournament(id) {
  return Tournament.findByPk(id);
}

/**
 * Build bracket visualization.
 */
function buildBracketText(bracket) {
  if (!bracket) return 'Bracket non generato.';
  const roundNames = ['Round 1', 'Round 2', 'Semifinali', 'Finale'];
  return bracket.map((round, rIdx) => {
    const name = roundNames[rIdx] || `Round ${rIdx + 1}`;
    const matches = round.map((m) => {
      const p1 = m.p1 ? `<@${m.p1.userId}>` : 'TBD';
      const p2 = m.p2 ? `<@${m.p2.userId}>` : 'TBD';
      const winner = m.winner ? ' ✅' : '';
      return `  ${p1} vs ${p2}${winner}`;
    }).join('\n');
    return `**${name}:**\n${matches}`;
  }).join('\n\n');
}

module.exports = {
  createTournament,
  register,
  unregister,
  getParticipants,
  generateBracket,
  reportResult,
  getActiveTournaments,
  getTournament,
  buildBracketText,
};
