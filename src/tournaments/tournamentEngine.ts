/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, TournamentMatch } from '../types/game';

export interface TournamentContender {
  name: string;
  nameAr: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'master';
  avatarSeed: string;
}

export const TOURNAMENT_BOTS: TournamentContender[] = [
  { name: 'Tarek "The Falcon"', nameAr: 'طارق "الصقر"', difficulty: 'easy', avatarSeed: 'falcon' },
  { name: 'Marcus Steel', nameAr: 'ماركوس ستيل', difficulty: 'medium', avatarSeed: 'steel' },
  { name: 'Zaid "The Sniper"', nameAr: 'زيد "القناص"', difficulty: 'hard', avatarSeed: 'sniper' },
  { name: 'Layla Mirage', nameAr: 'ليلى السراب', difficulty: 'medium', avatarSeed: 'mirage' },
  { name: 'Viktor Romanov', nameAr: 'فيكتور رومانوف', difficulty: 'medium', avatarSeed: 'viktor' },
  { name: 'Elena Vance', nameAr: 'إيلينا فانس', difficulty: 'hard', avatarSeed: 'elena' },
  { name: 'Grandmaster Sultan', nameAr: 'الأستاذ سلطان', difficulty: 'master', avatarSeed: 'sultan' },
];

export class TournamentEngine {
  /**
   * Initializes an 8-player tournament bracket with the human player and 7 AI contenders.
   * Round 1 (Quarterfinals): Easy bot (Tarek)
   * Round 2 (Semifinals): Hard bot (Zaid)
   * Round 3 (Championship Final): Master bot (Grandmaster Sultan)
   */
  public static createTournament(humanPlayer: Player): TournamentMatch[] {
    const contenders: Player[] = [
      humanPlayer,
      ...TOURNAMENT_BOTS.map((bot, index) => ({
        id: `ai_tourney_${index + 1}`,
        name: bot.name,
        nameAr: bot.nameAr,
        isAI: true,
        aiDifficulty: bot.difficulty,
        group: 'undetermined' as const,
        score: 0,
        avatarSeed: bot.avatarSeed,
        cueId: 'cue_classic_wood',
      })),
    ];

    // Quarterfinals (Round 1) - 4 matches
    const qfMatches: TournamentMatch[] = [
      { id: 'm1', round: 1, player1: contenders[0], player2: contenders[1], winner: null, isCompleted: false, score: '0 - 0' },
      { id: 'm2', round: 1, player1: contenders[2], player2: contenders[3], winner: null, isCompleted: false, score: '0 - 0' },
      { id: 'm3', round: 1, player1: contenders[4], player2: contenders[5], winner: null, isCompleted: false, score: '0 - 0' },
      { id: 'm4', round: 1, player1: contenders[6], player2: contenders[7], winner: null, isCompleted: false, score: '0 - 0' },
    ];

    // Semifinals (Round 2) - 2 placeholder matches
    const sfMatches: TournamentMatch[] = [
      { id: 'm5', round: 2, player1: { ...contenders[0], name: 'TBD' }, player2: { ...contenders[3], name: 'TBD' }, winner: null, isCompleted: false, score: '0 - 0' },
      { id: 'm6', round: 2, player1: { ...contenders[4], name: 'TBD' }, player2: { ...contenders[7], name: 'TBD' }, winner: null, isCompleted: false, score: '0 - 0' },
    ];

    // Finals (Round 3) - 1 championship match
    const finalMatch: TournamentMatch = {
      id: 'm7',
      round: 3,
      player1: { ...contenders[0], name: 'TBD' },
      player2: { ...contenders[7], name: 'TBD' },
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };

    return [...qfMatches, ...sfMatches, finalMatch];
  }

  /**
   * Simulates non-human matches in a round with skill authority ensuring escalating challenges.
   */
  public static simulateOtherMatches(matches: TournamentMatch[]): TournamentMatch[] {
    const updated = [...matches];

    // Helper to pick winner based on difficulty rank
    const pickSkillWinner = (p1: Player, p2: Player): Player => {
      const rank = (diff?: string) => diff === 'master' ? 4 : diff === 'hard' ? 3 : diff === 'medium' ? 2 : 1;
      const r1 = rank(p1.aiDifficulty);
      const r2 = rank(p2.aiDifficulty);
      if (r1 > r2) return p1;
      if (r2 > r1) return p2;
      return Math.random() > 0.5 ? p1 : p2;
    };

    // Round 1 simulation for non-human matches
    for (let i = 1; i <= 3; i++) {
      const match = updated[i];
      if (!match.isCompleted) {
        const winner = pickSkillWinner(match.player1, match.player2);
        match.winner = winner;
        match.isCompleted = true;
        match.score = winner.id === match.player1.id ? '2 - 0' : '0 - 2';
      }
    }

    // Populate Semifinals if QF complete
    if (updated[0].isCompleted && updated[1].isCompleted && updated[4].player1.name === 'TBD') {
      updated[4].player1 = updated[0].winner!;
      updated[4].player2 = updated[1].winner!;
    }
    if (updated[2].isCompleted && updated[3].isCompleted && updated[5].player1.name === 'TBD') {
      updated[5].player1 = updated[2].winner!;
      updated[5].player2 = updated[3].winner!;
    }

    // Simulate Semifinal match 2 if not involving human
    if (updated[5].player1.name !== 'TBD' && updated[5].player2.name !== 'TBD' && !updated[5].isCompleted) {
      if (updated[5].player1.isAI && updated[5].player2.isAI) {
        const winner = pickSkillWinner(updated[5].player1, updated[5].player2);
        updated[5].winner = winner;
        updated[5].isCompleted = true;
        updated[5].score = '2 - 1';
      }
    }

    // Populate Final if both SF complete
    if (updated[4].isCompleted && updated[5].isCompleted && updated[6].player1.name === 'TBD') {
      updated[6].player1 = updated[4].winner!;
      updated[6].player2 = updated[5].winner!;
    }

    return updated;
  }
}
