/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, Player, PracticeRackType, RuleEvaluationResult, ShotReport } from '../types/game';
import { createBall, IRuleEngine, setup8BallRack, setup9BallRack } from './baseRuleEngine';
import { BALL_RADIUS, PLAY_AREA } from '../physics/engine';

export class PracticeRuleEngine implements IRuleEngine {
  public readonly modeName = 'Free Practice & Challenges';
  public readonly modeNameAr = 'التدريب الحر وتحديات المهارة';

  public initializeBalls(rackType: PracticeRackType = '8ball_rack'): Ball[] {
    if (rackType === '9ball_diamond') {
      return setup9BallRack();
    }

    if (rackType === 'trick_shot_1') {
      // Corner Pocket Bank Shot Challenge
      const balls: Ball[] = [];
      const cueX = PLAY_AREA.left + 220;
      const cueY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2 + 60;
      balls.push(createBall(0, 0, cueX, cueY));

      // Object ball positioned near side rail for a clean cut or bank
      balls.push(createBall(1, 1, PLAY_AREA.left + 520, PLAY_AREA.top + 90));
      balls.push(createBall(2, 2, PLAY_AREA.right - 200, PLAY_AREA.bottom - 90));
      balls.push(createBall(3, 8, PLAY_AREA.right - 120, (PLAY_AREA.top + PLAY_AREA.bottom) / 2));
      return balls;
    }

    if (rackType === 'trick_shot_2') {
      // Obstacle Carom Challenge
      const balls: Ball[] = [];
      balls.push(createBall(0, 0, PLAY_AREA.left + 180, (PLAY_AREA.top + PLAY_AREA.bottom) / 2));

      // Blocking obstacle balls
      balls.push(createBall(1, 3, PLAY_AREA.left + 420, (PLAY_AREA.top + PLAY_AREA.bottom) / 2 - 25));
      balls.push(createBall(2, 4, PLAY_AREA.left + 420, (PLAY_AREA.top + PLAY_AREA.bottom) / 2 + 25));

      // Target ball behind obstacles
      balls.push(createBall(3, 1, PLAY_AREA.left + 600, (PLAY_AREA.top + PLAY_AREA.bottom) / 2));
      balls.push(createBall(4, 9, PLAY_AREA.right - 100, PLAY_AREA.top + 60));
      return balls;
    }

    if (rackType === 'line_drill') {
      // Straight Line Precision Drill
      const balls: Ball[] = [];
      const centerY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
      balls.push(createBall(0, 0, PLAY_AREA.left + 160, centerY));

      // 4 balls lined up straight towards the far corner pocket
      const step = 90;
      for (let i = 1; i <= 4; i++) {
        balls.push(createBall(i, i, PLAY_AREA.left + 350 + (i - 1) * step, centerY));
      }
      return balls;
    }

    // Default 8-ball triangle rack
    return setup8BallRack();
  }

  public evaluateShot(
    shotReport: ShotReport,
    activePlayer: Player,
    _otherPlayer: Player,
    allBalls: Ball[]
  ): RuleEvaluationResult {
    const unpocketedTargets = allBalls.filter(b => !b.isPocketed && b.number !== 0);
    const cueBallPocketed = shotReport.cueBallPocketed;

    if (unpocketedTargets.length === 0) {
      return {
        isFoul: false,
        isGameOver: true,
        winnerPlayerId: activePlayer.id,
        winReason: 'All target balls successfully cleared! Table complete!',
        winReasonAr: 'تم إسقاط جميع الكرات بنجاح! اكتمل التدريب!',
        nextPlayerId: activePlayer.id,
        awardBallInHand: false,
        message: 'Practice Table Cleared!',
        messageAr: 'تم إنهاء جميع الكرات بنجاح!',
      };
    }

    if (cueBallPocketed) {
      return {
        isFoul: true,
        foulReason: 'Scratch in practice',
        foulReasonAr: 'سقوط الكرة البيضاء',
        isGameOver: false,
        winnerPlayerId: null,
        nextPlayerId: activePlayer.id,
        awardBallInHand: true,
        message: 'Scratch! Tap anywhere to place cue ball.',
        messageAr: 'سقوط الكرة البيضاء! انقر في أي مكان لوضعها.',
      };
    }

    const pocketedCount = shotReport.ballsPocketedThisShot.length;
    return {
      isFoul: false,
      isGameOver: false,
      winnerPlayerId: null,
      nextPlayerId: activePlayer.id,
      awardBallInHand: false,
      message: pocketedCount > 0 ? `Nice shot! ${pocketedCount} ball(s) pocketed.` : 'Practice shot completed.',
      messageAr: pocketedCount > 0 ? `ضربة رائعة! تم إسقاط ${pocketedCount} كرات.` : 'تمت الضربة بنجاح.',
    };
  }
}
