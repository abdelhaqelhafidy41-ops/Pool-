/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, GameMode, Player, Vector2D } from '../types/game';
import { BALL_RADIUS, POCKETS, PLAY_AREA } from '../physics/engine';

export interface AIShotDecision {
  angle: number;
  power: number;
  spin: Vector2D;
  targetBallNumber: number | null;
  targetPocketId: number | null;
  estimatedConfidence: number;
  isSafetyShot?: boolean;
}

export interface PracticeHint {
  targetBallNumber: number;
  targetPocketId: number;
  cutAngleDegrees: number;
  suggestedPower: number;
  adviceEn: string;
  adviceAr: string;
}

export class BilliardsAI {
  /**
   * Plans the best shot for the AI player based on current game mode and difficulty.
   */
  public static planShot(
    cueBall: Ball,
    allBalls: Ball[],
    aiPlayer: Player,
    mode: GameMode,
    tableState: { isOpenTable: boolean }
  ): AIShotDecision {
    const difficulty = aiPlayer.aiDifficulty || 'medium';
    const legalBalls = this.getLegalTargetBalls(allBalls, aiPlayer, mode, tableState);

    let bestShot: {
      angle: number;
      power: number;
      spin: Vector2D;
      targetBall: Ball;
      pocketId: number;
      score: number;
      isSafety?: boolean;
    } | null = null;
    const minCutDot = difficulty === 'master' ? 0.08 : difficulty === 'hard' ? 0.14 : difficulty === 'medium' ? 0.22 : 0.32;

    // 1. Evaluate Direct Potting Opportunities for all legal balls across all 6 pockets
    for (const ball of legalBalls) {
      for (const pocket of POCKETS) {
        const toPocketX = pocket.position.x - ball.position.x;
        const toPocketY = pocket.position.y - ball.position.y;
        const distToPocket = Math.sqrt(toPocketX * toPocketX + toPocketY * toPocketY);
        if (distToPocket === 0) continue;

        const pocketDirX = toPocketX / distToPocket;
        const pocketDirY = toPocketY / distToPocket;

        // Ghost ball center position (where cue ball must arrive to send target ball to pocket)
        const ghostX = ball.position.x - pocketDirX * (BALL_RADIUS * 2);
        const ghostY = ball.position.y - pocketDirY * (BALL_RADIUS * 2);

        // Vector from cue ball to ghost ball
        const toGhostX = ghostX - cueBall.position.x;
        const toGhostY = ghostY - cueBall.position.y;
        const distToGhost = Math.sqrt(toGhostX * toGhostX + toGhostY * toGhostY);
        if (distToGhost === 0) continue;

        const cueDirX = toGhostX / distToGhost;
        const cueDirY = toGhostY / distToGhost;

        // Cut angle dot product: 1.0 = straight-in, 0 = 90-degree cut
        const cutDot = cueDirX * pocketDirX + cueDirY * pocketDirY;
        if (cutDot < minCutDot) continue; // Respect difficulty threshold

        // Obstruction check: cue to ghost position
        const cueBlocked = this.isPathBlocked(
          cueBall.position,
          { x: ghostX, y: ghostY },
          allBalls,
          [0, ball.number]
        );
        if (cueBlocked) continue;

        // Obstruction check: target ball to pocket mouth
        const targetBlocked = this.isPathBlocked(
          ball.position,
          pocket.position,
          allBalls,
          [0, ball.number]
        );
        if (targetBlocked) continue;

        // Scratch Risk Check: does cue ball deflection angle toward any pocket?
        const cueTangentX = cueDirX - cutDot * pocketDirX;
        const cueTangentY = cueDirY - cutDot * pocketDirY;
        const cueTangentLen = Math.sqrt(cueTangentX * cueTangentX + cueTangentY * cueTangentY) || 1;
        const cueNormDeflectX = cueTangentX / cueTangentLen;
        const cueNormDeflectY = cueTangentY / cueTangentLen;

        let scratchRisk = false;
        if (difficulty !== 'easy') {
          for (const p of POCKETS) {
            const toP_X = p.position.x - ghostX;
            const toP_Y = p.position.y - ghostY;
            const pProj = toP_X * cueNormDeflectX + toP_Y * cueNormDeflectY;
            if (pProj > 0 && pProj < 280) {
              const pPerpSq = (toP_X * toP_X + toP_Y * toP_Y) - (pProj * pProj);
              if (pPerpSq < p.radius * p.radius * 1.6) {
                scratchRisk = true;
                break;
              }
            }
          }
        }
        if (scratchRisk && (difficulty === 'hard' || difficulty === 'master')) {
          continue; // Top tier AI avoids scratch traps
        }

        // Comprehensive shot score: favors straight pots, shorter distances, and game-winning balls
        let score = cutDot * 125 - (distToGhost * 0.04) - (distToPocket * 0.05);
        if (scratchRisk) score -= 65;
        if (ball.number === 9 && mode === '9ball') score += 90;
        if (ball.number === 8 && mode === '8ball') score += 95;

        // Easy AI prefers closest balls, Hard/Master AI prefers easiest angle & position
        if (difficulty === 'easy') {
          score += (600 - distToPocket) * 0.08;
        }

        // 2-Shot Position Play on Hard/Master
        if ((difficulty === 'hard' || difficulty === 'master') && legalBalls.length > 1) {
          const projectedCueX = ghostX + cueNormDeflectX * 110;
          const projectedCueY = ghostY + cueNormDeflectY * 110;
          const nextTargets = legalBalls.filter(b => b.number !== ball.number);
          const hasFollowup = nextTargets.some(nb => !this.isPathBlocked(
            { x: projectedCueX, y: projectedCueY },
            nb.position,
            allBalls,
            [0, nb.number]
          ));
          if (hasFollowup) score += 30;
        }

        if (!bestShot || score > bestShot.score) {
          const rawAngle = Math.atan2(toGhostY, toGhostX);
          const totalDist = distToGhost + distToPocket;
          // Calibrate power so balls reach pocket cleanly with enough momentum
          let power = Math.max(0.32, Math.min(0.85, (totalDist / 850) * 0.55 + 0.28));

          // Apply precision english on Master difficulty
          let spin: Vector2D = { x: 0, y: 0 };
          if (difficulty === 'master') {
            if (cutDot > 0.75) spin = { x: 0, y: 0.35 }; // follow
            else if (cutDot < 0.45) spin = { x: cueTangentX > 0 ? 0.25 : -0.25, y: -0.3 }; // draw with side
          }

          bestShot = {
            angle: rawAngle,
            power,
            spin,
            targetBall: ball,
            pocketId: pocket.id,
            score,
            isSafety: false,
          };
        }
      }
    }

    // 2. Intelligent Bank Shot search if no direct shot found (Hard/Master)
    if (!bestShot && (difficulty === 'hard' || difficulty === 'master')) {
      const bankShot = this.planBankShot(cueBall, legalBalls, allBalls);
      if (bankShot) {
        bestShot = bankShot;
      }
    }

    // 3. Defensive Tactical Safety Play (When no clear pot is viable)
    if (!bestShot || (bestShot.score < 35 && difficulty !== 'easy')) {
      const safetyShot = this.planSafetyShot(cueBall, legalBalls, allBalls);
      if (safetyShot) {
        bestShot = safetyShot;
      }
    }

    // 4. Smart Legal Contact (Never blind whacking: aims target ball toward nearest pocket)
    if (!bestShot) {
      const fallbackBall = legalBalls[0] || allBalls.find(b => !b.isPocketed && b.number !== 0);
      if (fallbackBall) {
        // Find closest pocket to fallback ball
        let nearestPocket = POCKETS[0];
        let minDistP = Infinity;
        for (const p of POCKETS) {
          const d = Math.hypot(p.position.x - fallbackBall.position.x, p.position.y - fallbackBall.position.y);
          if (d < minDistP) { minDistP = d; nearestPocket = p; }
        }
        const pDirX = (nearestPocket.position.x - fallbackBall.position.x) / minDistP;
        const pDirY = (nearestPocket.position.y - fallbackBall.position.y) / minDistP;
        const gX = fallbackBall.position.x - pDirX * (BALL_RADIUS * 2);
        const gY = fallbackBall.position.y - pDirY * (BALL_RADIUS * 2);

        return {
          angle: Math.atan2(gY - cueBall.position.y, gX - cueBall.position.x),
          power: 0.42,
          spin: { x: 0, y: 0 },
          targetBallNumber: fallbackBall.number,
          targetPocketId: nearestPocket.id,
          estimatedConfidence: 0.35,
          isSafetyShot: false,
        };
      }
      return {
        angle: 0,
        power: 0.4,
        spin: { x: 0, y: 0 },
        targetBallNumber: null,
        targetPocketId: null,
        estimatedConfidence: 0.1,
      };
    }

    // 5. Inject realistic accuracy based strictly on player's chosen level
    const angleNoise = this.getAngleNoise(difficulty);
    const powerNoise = (Math.random() * 2 - 1) * this.getPowerNoiseFactor(difficulty);

    return {
      angle: bestShot.angle + angleNoise,
      power: Math.max(0.24, Math.min(0.92, bestShot.power + powerNoise)),
      spin: bestShot.spin,
      targetBallNumber: bestShot.targetBall.number,
      targetPocketId: bestShot.pocketId,
      estimatedConfidence: Math.min(1.0, Math.max(0.3, bestShot.score / 100)),
      isSafetyShot: bestShot.isSafety,
    };
  }

  // 1-Cushion Bank Shot calculator for advanced AI
  private static planBankShot(
    cueBall: Ball,
    legalBalls: Ball[],
    _allBalls: Ball[]
  ): { angle: number; power: number; spin: Vector2D; targetBall: Ball; pocketId: number; score: number; isSafety: boolean } | null {
    for (const ball of legalBalls) {
      const rails = [
        { y: PLAY_AREA.top },
        { y: PLAY_AREA.bottom },
      ];
      for (const rail of rails) {
        for (const pocket of POCKETS) {
          const mirroredPocketY = 2 * rail.y - pocket.position.y;
          const dx = pocket.position.x - ball.position.x;
          const dy = mirroredPocketY - ball.position.y;
          const dist = Math.hypot(dx, dy);
          if (dist === 0 || dist > 600) continue;

          const pDirX = dx / dist;
          const pDirY = dy / dist;

          const ghostX = ball.position.x - pDirX * (BALL_RADIUS * 2);
          const ghostY = ball.position.y - pDirY * (BALL_RADIUS * 2);

          const toGX = ghostX - cueBall.position.x;
          const toGY = ghostY - cueBall.position.y;
          const dToG = Math.hypot(toGX, toGY);
          if (dToG === 0) continue;

          const cutDot = (toGX / dToG) * pDirX + (toGY / dToG) * pDirY;
          if (cutDot > 0.45) {
            const rawAngle = Math.atan2(toGY, toGX);
            return {
              angle: rawAngle,
              power: Math.min(0.85, (dist + dToG) / 900 + 0.35),
              spin: { x: 0, y: 0.2 },
              targetBall: ball,
              pocketId: pocket.id,
              score: 55,
              isSafety: false,
            };
          }
        }
      }
    }
    return null;
  }

  // Safety Shot Calculator: strikes legal ball softly to tuck cue ball behind cushion or cluster
  private static planSafetyShot(
    cueBall: Ball,
    legalBalls: Ball[],
    _allBalls: Ball[]
  ): { angle: number; power: number; spin: Vector2D; targetBall: Ball; pocketId: number; score: number; isSafety: boolean } | null {
    if (legalBalls.length === 0) return null;
    const targetBall = legalBalls[0];

    const dx = targetBall.position.x - cueBall.position.x;
    const dy = targetBall.position.y - cueBall.position.y;
    const baseAngle = Math.atan2(dy, dx);

    return {
      angle: baseAngle + 0.05,
      power: 0.32,
      spin: { x: 0, y: -0.35 },
      targetBall,
      pocketId: 0,
      score: 50,
      isSafety: true,
    };
  }

  // Practice Mode Hint Generator
  public static getPracticeHint(
    cueBall: Ball,
    allBalls: Ball[],
    player: Player,
    mode: GameMode,
    tableState: { isOpenTable: boolean }
  ): PracticeHint | null {
    const decision = this.planShot(cueBall, allBalls, { ...player, aiDifficulty: 'master' }, mode, tableState);
    if (!decision.targetBallNumber || decision.targetPocketId === null) return null;

    const targetBall = allBalls.find(b => b.number === decision.targetBallNumber);
    const pocket = POCKETS.find(p => p.id === decision.targetPocketId);
    if (!targetBall || !pocket) return null;

    const dx = pocket.position.x - targetBall.position.x;
    const dy = pocket.position.y - targetBall.position.y;
    const cutDeg = Math.round(Math.abs(decision.angle - Math.atan2(dy, dx)) * (180 / Math.PI));

    return {
      targetBallNumber: targetBall.number,
      targetPocketId: pocket.id,
      cutAngleDegrees: cutDeg,
      suggestedPower: Math.round(decision.power * 100),
      adviceEn: `Aim for Ball #${targetBall.number} into ${pocket.name} with ~${Math.round(decision.power * 100)}% power.`,
      adviceAr: `صوّب نحو الكرة رقم #${targetBall.number} باتجاه جيب (${pocket.name}) بقوة تقريبية ${Math.round(decision.power * 100)}%.`,
    };
  }

  // Find legal balls to aim at
  private static getLegalTargetBalls(
    allBalls: Ball[],
    player: Player,
    mode: GameMode,
    tableState: { isOpenTable: boolean }
  ): Ball[] {
    const unpocketed = allBalls.filter(b => !b.isPocketed && b.number !== 0);

    if (mode === '8ball') {
      if (tableState.isOpenTable) {
        return unpocketed.filter(b => b.number !== 8);
      }

      const isSolids = player.group === 'solids';
      const myGroupBalls = unpocketed.filter(b =>
        isSolids ? (b.number >= 1 && b.number <= 7) : (b.number >= 9 && b.number <= 15)
      );

      if (myGroupBalls.length === 0) {
        return unpocketed.filter(b => b.number === 8);
      }
      return myGroupBalls;
    }

    if (mode === '9ball') {
      const sorted = [...unpocketed].sort((a, b) => a.number - b.number);
      return sorted.length > 0 ? [sorted[0]] : [];
    }

    return unpocketed;
  }

  // Check if a line segment is blocked by any balls
  private static isPathBlocked(
    from: Vector2D,
    to: Vector2D,
    allBalls: Ball[],
    ignoreBallIds: number[]
  ): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;
    const len = Math.sqrt(lenSq);
    const dirX = dx / len;
    const dirY = dy / len;

    for (const ball of allBalls) {
      if (ball.isPocketed || ignoreBallIds.includes(ball.number)) continue;

      const toBallX = ball.position.x - from.x;
      const toBallY = ball.position.y - from.y;
      const proj = toBallX * dirX + toBallY * dirY;

      if (proj > BALL_RADIUS && proj < len - BALL_RADIUS) {
        const perpDistSq = (toBallX * toBallX + toBallY * toBallY) - (proj * proj);
        if (perpDistSq < (BALL_RADIUS * 1.85) * (BALL_RADIUS * 1.85)) {
          return true;
        }
      }
    }
    return false;
  }

  // Difficulty-calibrated angle noise (in radians)
  private static getAngleNoise(diff: string): number {
    const rand = (Math.random() - 0.5) * 2;
    switch (diff) {
      case 'easy':
        // ~1.1 degrees: accurate on direct/close shots, naturally misses longer thin cuts
        return rand * 0.020;
      case 'medium':
        // ~0.5 degrees: solid club player (~75% pot rate)
        return rand * 0.009;
      case 'hard':
        // ~0.2 degrees: pro tournament player (~90% pot rate)
        return rand * 0.0035;
      case 'master':
      default:
        // ~0.04 degrees: grandmaster level, dead center precision (98-100% pot rate)
        return rand * 0.0008;
    }
  }

  // Difficulty-calibrated power noise factor
  private static getPowerNoiseFactor(diff: string): number {
    switch (diff) {
      case 'easy':
        return 0.08;
      case 'medium':
        return 0.04;
      case 'hard':
        return 0.015;
      case 'master':
      default:
        return 0.004;
    }
  }
}
