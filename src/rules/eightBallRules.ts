/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, Player, PlayerGroup, RuleEvaluationResult, RuleVariant, ShotReport } from '../types/game';
import { IRuleEngine, setup8BallRack } from './baseRuleEngine';

export class EightBallRuleEngine implements IRuleEngine {
  public readonly modeName = '8-Ball Pool';
  public readonly modeNameAr = 'الكرة الثامنة (8-Ball)';
  private variant: RuleVariant = 'wpa_official';

  public setVariant(variant: RuleVariant) {
    this.variant = variant;
  }

  public getVariant(): RuleVariant {
    return this.variant;
  }

  public initializeBalls(): Ball[] {
    return setup8BallRack();
  }

  public evaluateShot(
    shotReport: ShotReport,
    activePlayer: Player,
    otherPlayer: Player,
    allBalls: Ball[],
    tableState: { isOpenTable: boolean; isBreakShot?: boolean }
  ): RuleEvaluationResult {
    const isPlayerGroupSolids = activePlayer.group === 'solids';
    const isPlayerGroupStripes = activePlayer.group === 'stripes';

    // Count remaining balls for active player
    const remainingSolids = allBalls.filter(b => !b.isPocketed && b.number >= 1 && b.number <= 7).length;
    const remainingStripes = allBalls.filter(b => !b.isPocketed && b.number >= 9 && b.number <= 15).length;
    const activePlayerClearedGroup =
      (isPlayerGroupSolids && remainingSolids === 0) ||
      (isPlayerGroupStripes && remainingStripes === 0);

    const pocketed = shotReport.ballsPocketedThisShot;
    const pocketed8 = pocketed.includes(8);
    const cueBallPocketed = shotReport.cueBallPocketed;

    // Check if player had ALREADY cleared their group before this shot started
    const pocketedMySolidsThisShot = pocketed.filter(n => n >= 1 && n <= 7).length;
    const pocketedMyStripesThisShot = pocketed.filter(n => n >= 9 && n <= 15).length;
    const remainingSolidsBeforeShot = remainingSolids + pocketedMySolidsThisShot;
    const remainingStripesBeforeShot = remainingStripes + pocketedMyStripesThisShot;
    const playerWasAlreadyOn8Ball =
      (isPlayerGroupSolids && remainingSolidsBeforeShot === 0) ||
      (isPlayerGroupStripes && remainingStripesBeforeShot === 0);

    // 1. Check 8-Ball on Break Shot (House Rules vs Official WPA)
    if (pocketed8 && tableState.isBreakShot) {
      if (this.variant === 'house_rules') {
        if (!cueBallPocketed) {
          // Instant Win on 8-ball break in House Rules!
          return {
            isFoul: false,
            isGameOver: true,
            winnerPlayerId: activePlayer.id,
            winReason: `${activePlayer.name} sank the 8-Ball on the break! (House Rules Win)`,
            winReasonAr: `أسقط ${activePlayer.name} الكرة 8 في الضربة الافتتاحية! (فوز بقواعد منزلية)`,
            nextPlayerId: activePlayer.id,
            awardBallInHand: false,
            message: `${activePlayer.name} wins on break!`,
            messageAr: `فوز رائع بالضربة الافتتاحية!`,
          };
        }
      }
    }

    // 2. Check 8-Ball Game End Conditions
    if (pocketed8) {
      // If cue ball was also pocketed, or player had not cleared their group before shooting the 8-ball => Loss!
      // (Official pool rules: 8-ball must be pocketed on a subsequent shot after group is cleared, not together)
      if (cueBallPocketed || !playerWasAlreadyOn8Ball || tableState.isOpenTable) {
        return {
          isFoul: true,
          foulReason: '8-Ball pocketed illegally or with cue ball scratch',
          foulReasonAr: 'تم إسقاط الكرة 8 بشكل غير قانوني أو مع سقوط الكرة البيضاء',
          isGameOver: true,
          winnerPlayerId: otherPlayer.id,
          winReason: `${otherPlayer.name} wins! ${activePlayer.name} fouled on the 8-Ball.`,
          winReasonAr: `فاز ${otherPlayer.name}! ارتكب ${activePlayer.name} خطأ على الكرة 8.`,
          nextPlayerId: otherPlayer.id,
          awardBallInHand: false,
          message: `${otherPlayer.name} wins by illegal 8-Ball pocket!`,
          messageAr: `فوز ${otherPlayer.name} بسبب إسقاط غير قانوني للكرة 8!`,
        };
      }

      // Legal 8-Ball pocketed => WIN!
      return {
        isFoul: false,
        isGameOver: true,
        winnerPlayerId: activePlayer.id,
        winReason: `${activePlayer.name} legally pocketed the 8-Ball and won!`,
        winReasonAr: `أسقط ${activePlayer.name} الكرة 8 قانونياً وفاز بالمباراة!`,
        nextPlayerId: activePlayer.id,
        awardBallInHand: false,
        message: `${activePlayer.name} wins!`,
        messageAr: `فاز ${activePlayer.name} بالمباراة!`,
      };
    }

    // 3. Scratch: Cue Ball Pocketed
    if (cueBallPocketed) {
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

    // 4. No Ball Hit First
    if (shotReport.cueBallHitFirst === null) {
      return {
        isFoul: true,
        foulReason: 'Cue ball failed to hit any ball',
        foulReasonAr: 'لم تلمس الكرة البيضاء أي كرة (خطأ)',
        isGameOver: false,
        winnerPlayerId: null,
        nextPlayerId: otherPlayer.id,
        awardBallInHand: true,
        message: `Foul! No ball hit. ${otherPlayer.name} receives Ball in Hand.`,
        messageAr: `خطأ! لم تلمس أي كرة. يحصل ${otherPlayer.name} على الكرة في اليد.`,
      };
    }

    const firstHit = shotReport.cueBallHitFirst;

    // 5. Checking First Contact legality
    let isFoul = false;
    let foulReason = '';
    let foulReasonAr = '';

    if (!tableState.isOpenTable) {
      // Must hit 8-ball first ONLY if the player was ALREADY on the 8-ball before this shot began!
      if (playerWasAlreadyOn8Ball) {
        if (firstHit !== 8) {
          isFoul = true;
          foulReason = 'Must hit the 8-ball when group is cleared';
          foulReasonAr = 'يجب لمس الكرة 8 أولاً بعد تصفية المجموعة';
        }
      } else if (isPlayerGroupSolids) {
        // Must hit solid (1-7) first
        if (firstHit > 7) {
          isFoul = true;
          foulReason = 'Wrong ball hit first. You are Solids (1-7)';
          foulReasonAr = 'لمس كرة خاطئة أولاً. مجموعتك هي الكرات السادة (1-7)';
        }
      } else if (isPlayerGroupStripes) {
        // Must hit stripe (9-15) first
        if (firstHit < 9 || firstHit > 15) {
          isFoul = true;
          foulReason = 'Wrong ball hit first. You are Stripes (9-15)';
          foulReasonAr = 'لمس كرة خاطئة أولاً. مجموعتك هي الكرات المخططة (9-15)';
        }
      }
    } else {
      // Table is open: hitting 8-ball first is a foul
      if (firstHit === 8) {
        isFoul = true;
        foulReason = 'Cannot hit the 8-ball first while table is open';
        foulReasonAr = 'لا يجوز لمس الكرة 8 أولاً بينما الطاولة مفتوحة';
      }
    }

    if (isFoul) {
      return {
        isFoul: true,
        foulReason,
        foulReasonAr,
        isGameOver: false,
        winnerPlayerId: null,
        nextPlayerId: otherPlayer.id,
        awardBallInHand: true,
        message: `Foul: ${foulReason}. Ball in Hand for ${otherPlayer.name}.`,
        messageAr: `خطأ: ${foulReasonAr}. كرة في اليد لـ ${otherPlayer.name}.`,
      };
    }

    // 6. Assign groups if open table and valid ball pocketed legally (first to sink any type gets that group!)
    let assignedGroupActive: PlayerGroup | undefined;
    let assignedGroupOther: PlayerGroup | undefined;

    if (tableState.isOpenTable && pocketed.length > 0 && !isFoul) {
      const pocketedSolids = pocketed.filter(n => n >= 1 && n <= 7).length;
      const pocketedStripes = pocketed.filter(n => n >= 9 && n <= 15).length;

      if (pocketedSolids > 0 && pocketedStripes === 0) {
        assignedGroupActive = 'solids';
        assignedGroupOther = 'stripes';
      } else if (pocketedStripes > 0 && pocketedSolids === 0) {
        assignedGroupActive = 'stripes';
        assignedGroupOther = 'solids';
      } else if (pocketedSolids > 0 && pocketedStripes > 0) {
        // Both types pocketed: assign based on majority count or first ball struck
        if (pocketedSolids > pocketedStripes) {
          assignedGroupActive = 'solids';
          assignedGroupOther = 'stripes';
        } else if (pocketedStripes > pocketedSolids) {
          assignedGroupActive = 'stripes';
          assignedGroupOther = 'solids';
        } else if (firstHit !== null && firstHit >= 1 && firstHit <= 7) {
          assignedGroupActive = 'solids';
          assignedGroupOther = 'stripes';
        } else if (firstHit !== null && firstHit >= 9 && firstHit <= 15) {
          assignedGroupActive = 'stripes';
          assignedGroupOther = 'solids';
        }
      }
    }

    const assignedP1 = assignedGroupActive ? (activePlayer.id === 'p1' ? assignedGroupActive : assignedGroupOther) : undefined;
    const assignedP2 = assignedGroupActive ? (activePlayer.id === 'p1' ? assignedGroupOther : assignedGroupActive) : undefined;

    // 7. Check if active player continues turn
    let playerContinues = false;
    if (pocketed.length > 0) {
      if (tableState.isOpenTable) {
        playerContinues = true;
      } else {
        const pocketedMyBalls = pocketed.filter(n =>
          (isPlayerGroupSolids && n >= 1 && n <= 7) ||
          (isPlayerGroupStripes && n >= 9 && n <= 15)
        );
        playerContinues = pocketedMyBalls.length > 0;
      }
    }

    const nextId = playerContinues ? activePlayer.id : otherPlayer.id;

    let turnMsg = playerContinues ? `${activePlayer.name} continues their turn!` : `Turn passes to ${otherPlayer.name}.`;
    let turnMsgAr = playerContinues ? `يواصل ${activePlayer.name} دوره!` : `ينتقل الدور إلى ${otherPlayer.name}.`;

    if (playerContinues && activePlayerClearedGroup && !playerWasAlreadyOn8Ball) {
      turnMsg = `${activePlayer.name} cleared all group balls! Now shoot the 8-Ball for the win!`;
      turnMsgAr = `أحسنت! أسقط ${activePlayer.name} جميع كرات مجموعته، والدور مستمر لتسديد الكرة 8 السوداء للفوز!`;
    } else if (assignedGroupActive) {
      const typeLabelAr = assignedGroupActive === 'solids' ? 'الكرات السادة (1-7)' : 'الكرات المخططة (9-15)';
      const typeLabelEn = assignedGroupActive === 'solids' ? 'Solids (1-7)' : 'Stripes (9-15)';
      turnMsgAr = `تم تحديد المجموعات: ${activePlayer.name} له ${typeLabelAr}!`;
      turnMsg = `Groups assigned: ${activePlayer.name} has ${typeLabelEn}!`;
    }

    return {
      isFoul: false,
      isGameOver: false,
      winnerPlayerId: null,
      nextPlayerId: nextId,
      awardBallInHand: false,
      message: turnMsg,
      messageAr: turnMsgAr,
      assignedGroupPlayer1: assignedP1,
      assignedGroupPlayer2: assignedP2,
    };
  }
}
