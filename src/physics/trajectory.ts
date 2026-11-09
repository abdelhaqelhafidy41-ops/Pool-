/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, TrajectoryPoint, Vector2D } from '../types/game';
import { BALL_RADIUS, PLAY_AREA } from './engine';

export class TrajectoryCalculator {
  /**
   * Calculates the trajectory of the cue ball and the target ball it will strike,
   * checking for secondary obstructions and displaying confidence limits.
   */
  public static calculate(
    cueBall: Ball,
    allBalls: Ball[],
    angleRad: number,
    maxDistance: number = 550
  ): TrajectoryPoint {
    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);
    const startX = cueBall.position.x;
    const startY = cueBall.position.y;

    let closestDist = maxDistance;
    let hitBall: Ball | null = null;
    let ghostPos: Vector2D | null = null;

    // Check collision against all other visible, unpocketed balls
    for (const ball of allBalls) {
      if (ball.number === 0 || ball.isPocketed) continue;

      const toTargetX = ball.position.x - startX;
      const toTargetY = ball.position.y - startY;

      const proj = toTargetX * dirX + toTargetY * dirY;
      if (proj <= 0) continue; // Behind cue ball

      const perpDistSq = (toTargetX * toTargetX + toTargetY * toTargetY) - (proj * proj);
      const collisionRadius = ball.radius + cueBall.radius;

      if (perpDistSq < collisionRadius * collisionRadius) {
        const halfChord = Math.sqrt(Math.max(0, collisionRadius * collisionRadius - perpDistSq));
        const hitDist = proj - halfChord;

        if (hitDist > 0 && hitDist < closestDist) {
          closestDist = hitDist;
          hitBall = ball;
          ghostPos = {
            x: startX + dirX * hitDist,
            y: startY + dirY * hitDist,
          };
        }
      }
    }

    // If an object ball will be hit
    if (hitBall && ghostPos) {
      const normX = hitBall.position.x - ghostPos.x;
      const normY = hitBall.position.y - ghostPos.y;
      const normLen = Math.sqrt(normX * normX + normY * normY) || 1;
      const targetDirX = normX / normLen;
      const targetDirY = normY / normLen;

      // Cue ball deflects tangentially
      const dot = dirX * targetDirX + dirY * targetDirY;
      const cueDeflectX = dirX - dot * targetDirX;
      const cueDeflectY = dirY - dot * targetDirY;
      const cueDeflectLen = Math.sqrt(cueDeflectX * cueDeflectX + cueDeflectY * cueDeflectY) || 1;

      // Check secondary obstruction along target ball path
      let isObstructedSecondary = false;
      const targetPathLength = 180;
      for (const otherBall of allBalls) {
        if (otherBall.isPocketed || otherBall.number === 0 || otherBall.number === hitBall.number) continue;

        const toOtherX = otherBall.position.x - hitBall.position.x;
        const toOtherY = otherBall.position.y - hitBall.position.y;
        const targetProj = toOtherX * targetDirX + toOtherY * targetDirY;

        if (targetProj > BALL_RADIUS && targetProj < targetPathLength) {
          const perpSq = (toOtherX * toOtherX + toOtherY * toOtherY) - (targetProj * targetProj);
          if (perpSq < (BALL_RADIUS * 2) * (BALL_RADIUS * 2)) {
            isObstructedSecondary = true;
            break;
          }
        }
      }

      return {
        ghostBallPos: ghostPos,
        hitBallId: hitBall.number,
        targetBallDeflection: {
          x: hitBall.position.x + targetDirX * (isObstructedSecondary ? 90 : targetPathLength),
          y: hitBall.position.y + targetDirY * (isObstructedSecondary ? 90 : targetPathLength),
        },
        cueBallDeflection: {
          x: ghostPos.x + (cueDeflectX / cueDeflectLen) * 90,
          y: ghostPos.y + (cueDeflectY / cueDeflectLen) * 90,
        },
        cushionBounces: [],
        isObstructedSecondary,
        confidenceNote: isObstructedSecondary ? 'Secondary collision: unpredictable bounce' : 'Direct primary trajectory',
        confidenceNoteAr: isObstructedSecondary ? 'تصادم ثانوي محتمل: المسار غير مضمون' : 'مسار أولي مباشر',
      };
    }

    // No ball hit: calculate cushion bank reflection
    const cushionHit = this.findCushionIntersection(startX, startY, dirX, dirY, closestDist);
    return {
      ghostBallPos: cushionHit.point,
      hitBallId: null,
      targetBallDeflection: null,
      cueBallDeflection: null,
      cushionBounces: cushionHit.reflected ? [cushionHit.reflected] : [],
      isObstructedSecondary: false,
      confidenceNote: 'Cushion bank path',
      confidenceNoteAr: 'ارتداد من الوسادة',
    };
  }

  // Calculate cushion intersection and bank bounce direction
  private static findCushionIntersection(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    maxDist: number
  ): { point: Vector2D; reflected: Vector2D | null } {
    const left = PLAY_AREA.left + BALL_RADIUS;
    const right = PLAY_AREA.right - BALL_RADIUS;
    const top = PLAY_AREA.top + BALL_RADIUS;
    const bottom = PLAY_AREA.bottom - BALL_RADIUS;

    let tMin = maxDist;
    let hitNormalX = 0;
    let hitNormalY = 0;

    if (dx < -0.0001) {
      const t = (left - ox) / dx;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormalX = 1;
        hitNormalY = 0;
      }
    } else if (dx > 0.0001) {
      const t = (right - ox) / dx;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormalX = -1;
        hitNormalY = 0;
      }
    }

    if (dy < -0.0001) {
      const t = (top - oy) / dy;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormalX = 0;
        hitNormalY = 1;
      }
    } else if (dy > 0.0001) {
      const t = (bottom - oy) / dy;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormalX = 0;
        hitNormalY = -1;
      }
    }

    const hitPoint: Vector2D = {
      x: ox + dx * tMin,
      y: oy + dy * tMin,
    };

    let reflectedPoint: Vector2D | null = null;
    if (hitNormalX !== 0 || hitNormalY !== 0) {
      const dot = dx * hitNormalX + dy * hitNormalY;
      const rdx = dx - 2 * dot * hitNormalX;
      const rdy = dy - 2 * dot * hitNormalY;
      reflectedPoint = {
        x: hitPoint.x + rdx * 120,
        y: hitPoint.y + rdy * 120,
      };
    }

    return { point: hitPoint, reflected: reflectedPoint };
  }
}
