/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, Player, RuleEvaluationResult, ShotReport } from '../types/game';
import { IRuleEngine, setup9BallRack } from './baseRuleEngine';

export class NineBallRuleEngine implements IRuleEngine {
  public readonly modeName = '9-Ball Pool';
  public readonly modeNameAr = 'الكرة التاسعة (9-Ball)';

  public initializeBalls(): Ball[] {
    return setup9BallRack();
  }

  public evaluateShot(
    shotReport: ShotReport,
    activePlayer: Player,
    otherPlayer: Player,
    allBalls: Ball[]
  ): RuleEvaluationResult {
    const pocketed = shotReport.ballsPocketedThisShot;
    const pocketed9 = pocketed.includes(9);
    const cueBallPocketed = shotReport.cueBallPocketed;

    // 1. Find the lowest numbered ball that was on the table BEFORE this shot was taken.
    // Critical: Balls pocketed during THIS shot were on the table at shot start!
    const ballsOnTableBeforeShot = allBalls
      .filter(b => (!b.isPocketed || pocketed.includes(b.number)) && b.number >= 1 && b.number <= 9)
      .sort((a, b) => a.number - b.number);

    const lowestBallNumber = ballsOnTableBeforeShot.length > 0 ? ballsOnTableBeforeShot[0].number : 9;

    // 2. Scratch: Cue Ball Pocketed
    if (cueBallPocketed) {
      // In 9-Ball, if 9-ball was pocketed along with scratch, 9-ball is respotted
      return {
        isFoul: true,
        foulReason: 'Cue ball pocketed (Scratch)',
        foulReasonAr: 'سقوط الكرة البيضاء في الجيب (خطأ)',
        isGameOver: false,
        winnerPlayerId: null,
        nextPlayerId: otherPlayer.id,
        awardBallInHand: true,
        message: `Scratch! ${otherPlayer.name} receives Ball in Hand.`,
        messageAr: `سقوط الكرة البيضاء! يحصل ${otherPlayer.name} على الكرة في اليد.`,
      };
    }

    // 3. No Ball Hit
    if (shotReport.cueBallHitFirst === null) {
      return {
        isFoul: true,
        foulReason: 'Cue ball failed to hit any ball',
        foulReasonAr: 'لم تلمس الكرة البيضاء أي كرة (خطأ)',
        isGameOver: false,
        winnerPlayerId: null,
        nextPlayerId: otherPlayer.id,
        awardBallInHand: true,
        message: `Foul! No ball hit. Ball in Hand for ${otherPlayer.name}.`,
        messageAr: `خطأ! لم تلمس أي كرة. كرة في اليد لـ ${otherPlayer.name}.`,
      };
    }

    // 4. Lowest Ball Must Be Struck First
    const firstHit = shotReport.cueBallHitFirst;
    if (firstHit !== lowestBallNumber) {
      return {
        isFoul: true,
        foulReason: `Must hit lowest ball (#${lowestBallNumber}) first`,
        foulReasonAr: `يجب لمس الكرة ذات الرقم الأصغر (#${lowestBallNumber}) أولاً`,
        isGameOver: false,
        winnerPlayerId: null,
        nextPlayerId: otherPlayer.id,
        awardBallInHand: true,
        message: `Foul: Did not hit #${lowestBallNumber} first. Ball in Hand for ${otherPlayer.name}.`,
        messageAr: `خطأ: لم تلمس الكرة رقم #${lowestBallNumber} أولاً. كرة في اليد لـ ${otherPlayer.name}.`,
      };
    }

    // 5. Sinking 9-Ball legally wins the game! (Direct pot or legal combination)
    if (pocketed9) {
      return {
        isFoul: false,
        isGameOver: true,
        winnerPlayerId: activePlayer.id,
        winReason: `${activePlayer.name} pocketed the 9-Ball legally and won!`,
        winReasonAr: `أسقط ${activePlayer.name} الكرة 9 قانونياً وفاز بالمباراة!`,
        nextPlayerId: activePlayer.id,
        awardBallInHand: false,
        message: `${activePlayer.name} wins by sinking the 9-Ball!`,
        messageAr: `فاز ${activePlayer.name} بإسقاط الكرة 9!`,
      };
    }

    // 6. Check if all balls 1 through 9 are pocketed
    const remainingBalls = allBalls.filter(b => !b.isPocketed && b.number >= 1 && b.number <= 9);
    if (remainingBalls.length === 0) {
      return {
        isFoul: false,
        isGameOver: true,
        winnerPlayerId: activePlayer.id,
        winReason: `${activePlayer.name} cleared the rack and won!`,
        winReasonAr: `أسقط ${activePlayer.name} جميع الكرات وفاز بالمباراة!`,
        nextPlayerId: activePlayer.id,
        awardBallInHand: false,
        message: `${activePlayer.name} wins!`,
        messageAr: `فاز ${activePlayer.name} بالمباراة!`,
      };
    }

    // 7. Any ball legally pocketed continues turn
    const continues = pocketed.length > 0;
    const nextId = continues ? activePlayer.id : otherPlayer.id;

    return {
      isFoul: false,
      isGameOver: false,
      winnerPlayerId: null,
      nextPlayerId: nextId,
      awardBallInHand: false,
      message: continues ? `${activePlayer.name} pocketed a ball and continues!` : `Turn passes to ${otherPlayer.name}.`,
      messageAr: continues ? `أسقط ${activePlayer.name} كرة ويواصل دوره!` : `ينتقل الدور إلى ${otherPlayer.name}.`,
    };
  }
}
