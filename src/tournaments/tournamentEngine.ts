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
   * Initializes a 4-Player City Amateur Cup (AI Tournament):
   * Semifinal 1 (SF1): Human vs Tarek "The Falcon"
   * Semifinal 2 (SF2): Layla Mirage vs Grandmaster Sultan
   * Grand Final: Winner SF1 vs Winner SF2
   */
  public static createCityCup4P(humanPlayer: Player): TournamentMatch[] {
    const b1 = TOURNAMENT_BOTS[0]; // Tarek
    const b2 = TOURNAMENT_BOTS[3]; // Layla
    const b3 = TOURNAMENT_BOTS[6]; // Grandmaster Sultan

    const p2: Player = {
      id: 'ai_city_1',
      name: b1.name,
      nameAr: b1.nameAr,
      isAI: true,
      aiDifficulty: 'easy',
      group: 'undetermined',
      score: 0,
      avatarSeed: b1.avatarSeed,
      cueId: 'cue_classic_wood',
    };

    const p3: Player = {
      id: 'ai_city_2',
      name: b2.name,
      nameAr: b2.nameAr,
      isAI: true,
      aiDifficulty: 'medium',
      group: 'undetermined',
      score: 0,
      avatarSeed: b2.avatarSeed,
      cueId: 'cue_midnight_graphite',
    };

    const p4: Player = {
      id: 'ai_city_3',
      name: b3.name,
      nameAr: b3.nameAr,
      isAI: true,
      aiDifficulty: 'master',
      group: 'undetermined',
      score: 0,
      avatarSeed: b3.avatarSeed,
      cueId: 'cue_emerald_dragon',
    };

    const sf1: TournamentMatch = {
      id: 'city_4p_sf1',
      round: 1,
      player1: { ...humanPlayer },
      player2: p2,
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };

    const sf2: TournamentMatch = {
      id: 'city_4p_sf2',
      round: 1,
      player1: p3,
      player2: p4,
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };

    const finalMatch: TournamentMatch = {
      id: 'city_4p_final',
      round: 2,
      player1: { ...humanPlayer, name: 'TBD', nameAr: 'في انتظار الفائز' },
      player2: { ...p4, name: 'TBD', nameAr: 'في انتظار الفائز' },
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };

    return [sf1, sf2, finalMatch];
  }

  /**
   * Initializes a 2-Player Local Wi-Fi Championship (Head-to-head title series, Best of 3 or 5).
   */
  public static create2PlayerWifiChampionship(
    player1: Player,
    player2: Player,
    targetFrames: number = 3
  ): TournamentMatch[] {
    const finalMatch: TournamentMatch = {
      id: 'wifi_2p_final',
      round: 1,
      player1: { ...player1 },
      player2: { ...player2 },
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };
    return [finalMatch];
  }

  /**
   * Initializes a 4-Player Local Wi-Fi Tournament:
   * Semifinal 1 (SF1)
   * Semifinal 2 (SF2)
   * Grand Final (GF)
   */
  public static create4PlayerWifiTournament(
    player1: Player,
    player2: Player,
    contender3Name?: string,
    contender4Name?: string
  ): TournamentMatch[] {
    const c3 = TOURNAMENT_BOTS[3]; // Layla
    const c4 = TOURNAMENT_BOTS[6]; // Sultan

    const p3: Player = {
      id: 'tourney_p3',
      name: contender3Name || c3.name,
      nameAr: contender3Name || c3.nameAr,
      isAI: !contender3Name,
      aiDifficulty: 'medium',
      group: 'undetermined',
      score: 0,
      avatarSeed: c3.avatarSeed,
      cueId: 'cue_midnight_graphite',
    };

    const p4: Player = {
      id: 'tourney_p4',
      name: contender4Name || c4.name,
      nameAr: contender4Name || c4.nameAr,
      isAI: !contender4Name,
      aiDifficulty: 'master',
      group: 'undetermined',
      score: 0,
      avatarSeed: c4.avatarSeed,
      cueId: 'cue_emerald_dragon',
    };

    const sf1: TournamentMatch = {
      id: 'wifi_4p_sf1',
      round: 1,
      player1: { ...player1 },
      player2: { ...player2 },
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };

    const sf2: TournamentMatch = {
      id: 'wifi_4p_sf2',
      round: 1,
      player1: p3,
      player2: p4,
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };

    const finalMatch: TournamentMatch = {
      id: 'wifi_4p_final',
      round: 2,
      player1: { ...player1, name: 'TBD', nameAr: 'في انتظار الفائز' },
      player2: { ...p4, name: 'TBD', nameAr: 'في انتظار الفائز' },
      winner: null,
      isCompleted: false,
      score: '0 - 0',
    };

    return [sf1, sf2, finalMatch];
  }

  /**
   * Simulates non-human matches in a round with skill authority ensuring escalating challenges.
   * Seamlessly handles both 4-Player tournaments (3 matches) and 8-Player tournaments (7 matches).
   */
  public static simulateOtherMatches(matches: TournamentMatch[]): TournamentMatch[] {
    const updated = matches.map(m => ({ ...m, player1: { ...m.player1 }, player2: { ...m.player2 } }));

    // Helper to pick winner based on difficulty rank
    const pickSkillWinner = (p1: Player, p2: Player): Player => {
      const rank = (diff?: string) => diff === 'master' ? 4 : diff === 'hard' ? 3 : diff === 'medium' ? 2 : 1;
      const r1 = rank(p1.aiDifficulty);
      const r2 = rank(p2.aiDifficulty);
      if (r1 > r2) return p1;
      if (r2 > r1) return p2;
      return Math.random() > 0.4 ? p2 : p1; // slight edge to second contender
    };

    // Case 1: 4-Player Tournament (3 matches total: SF1, SF2, Final)
    if (updated.length === 3) {
      const sf1 = updated[0];
      const sf2 = updated[1];
      const finalMatch = updated[2];

      // Simulate SF2 if not completed and players are AI or when SF1 completes
      if (!sf2.isCompleted && sf2.player1.name !== 'TBD' && sf2.player2.name !== 'TBD') {
        const winner = pickSkillWinner(sf2.player1, sf2.player2);
        sf2.winner = winner;
        sf2.isCompleted = true;
        sf2.score = '2 - 1';
      }

      // Propagate SF1 winner to Final
      if (sf1.isCompleted && sf1.winner) {
        finalMatch.player1 = { ...sf1.winner };
      }

      // Propagate SF2 winner to Final
      if (sf2.isCompleted && sf2.winner) {
        finalMatch.player2 = { ...sf2.winner };
      }

      return updated;
    }

    // Case 2: 8-Player Tournament (7 matches total: 4 QF, 2 SF, 1 Final)
    if (updated.length >= 7) {
      // Round 1 simulation for non-human matches (matches 1, 2, 3)
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
      if (updated[0].isCompleted && updated[1].isCompleted && (updated[4].player1.name === 'TBD' || !updated[4].player1.id)) {
        updated[4].player1 = updated[0].winner!;
        updated[4].player2 = updated[1].winner!;
      }
      if (updated[2].isCompleted && updated[3].isCompleted && (updated[5].player1.name === 'TBD' || !updated[5].player1.id)) {
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
      if (updated[4].isCompleted && updated[5].isCompleted && (updated[6].player1.name === 'TBD' || !updated[6].player1.id)) {
        updated[6].player1 = updated[4].winner!;
        updated[6].player2 = updated[5].winner!;
      }

      return updated;
    }

    return updated;
  }
}
