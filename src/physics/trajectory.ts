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
    maxDistance: number = 550,
    spin?: Vector2D
  ): TrajectoryPoint {
    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);
    const startX = cueBall.position.x;
    const startY = cueBall.position.y;
    const spinX = spin?.x || cueBall.spin?.x || 0;
    const spinY = spin?.y || cueBall.spin?.y || 0;

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

      // Base 90-degree tangential cue ball deflection
      const dot = dirX * targetDirX + dirY * targetDirY;
      let cueDeflectX = dirX - dot * targetDirX;
      let cueDeflectY = dirY - dot * targetDirY;
      let cueDeflectLen = Math.sqrt(cueDeflectX * cueDeflectX + cueDeflectY * cueDeflectY);

      // Incorporate spin effect on cue ball post-collision vector
      // spin.y < 0 is Draw / Backspin: pulls ball backward along collision normal
      // spin.y > 0 is Topspin / Follow: drives ball forward along collision normal
      // spin.x is Sidespin / English: deflects perpendicular to normal
      if (cueDeflectLen < 0.05) {
        // Nearly head-on hit:
        if (spinY < -0.05) {
          // Draw straight back
          cueDeflectX = -targetDirX;
          cueDeflectY = -targetDirY;
          cueDeflectLen = 1;
        } else if (spinY > 0.05) {
          // Follow through forward
          cueDeflectX = targetDirX;
          cueDeflectY = targetDirY;
          cueDeflectLen = 1;
        } else {
          cueDeflectX = 0;
          cueDeflectY = 0;
          cueDeflectLen = 0;
        }
      } else {
        // Oblique hit: normalize base tangent then blend spin impulses
        cueDeflectX /= cueDeflectLen;
        cueDeflectY /= cueDeflectLen;

        // Apply draw (negative normal) or follow (positive normal)
        if (spinY < -0.05) {
          const drawStrength = Math.abs(spinY) * 1.1;
          cueDeflectX -= targetDirX * drawStrength;
          cueDeflectY -= targetDirY * drawStrength;
        } else if (spinY > 0.05) {
          const followStrength = spinY * 0.9;
          cueDeflectX += targetDirX * followStrength;
          cueDeflectY += targetDirY * followStrength;
        }

        // Apply sidespin deflection
        if (Math.abs(spinX) > 0.05) {
          const perpX = -targetDirY * spinX * 0.45;
          const perpY = targetDirX * spinX * 0.45;
          cueDeflectX += perpX;
          cueDeflectY += perpY;
        }

        cueDeflectLen = Math.sqrt(cueDeflectX * cueDeflectX + cueDeflectY * cueDeflectY) || 1;
        cueDeflectX /= cueDeflectLen;
        cueDeflectY /= cueDeflectLen;
      }

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

      const cuePathLen = cueDeflectLen > 0 ? (Math.abs(spinY) > 0.3 ? 110 : 85) : 0;

      return {
        ghostBallPos: ghostPos,
        hitBallId: hitBall.number,
        targetBallDeflection: {
          x: hitBall.position.x + targetDirX * (isObstructedSecondary ? 90 : targetPathLength),
          y: hitBall.position.y + targetDirY * (isObstructedSecondary ? 90 : targetPathLength),
        },
        cueBallDeflection: cuePathLen > 0 ? {
          x: ghostPos.x + cueDeflectX * cuePathLen,
          y: ghostPos.y + cueDeflectY * cuePathLen,
        } : null,
        cushionBounces: [],
        isObstructedSecondary,
        confidenceNote: isObstructedSecondary ? 'Secondary collision: unpredictable bounce' : 'Direct primary trajectory',
        confidenceNoteAr: isObstructedSecondary ? 'تصادم ثانوي محتمل: المسار غير مضمون' : 'مسار أولي مباشر',
      };
    }

    // No ball hit: calculate cushion bank reflection
    const cushionHit = this.findCushionIntersection(startX, startY, dirX, dirY, closestDist, spinX);
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
    maxDist: number,
    spinX: number = 0
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
      let rdx = dx - 2 * dot * hitNormalX;
      let rdy = dy - 2 * dot * hitNormalY;

      // English effect on cushion: sidespin imparts lateral tangential velocity
      if (Math.abs(spinX) > 0.05) {
        const tangentX = -hitNormalY;
        const tangentY = hitNormalX;
        rdx += tangentX * spinX * 0.35;
        rdy += tangentY * spinX * 0.35;
        const len = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        rdx /= len;
        rdy /= len;
      }

      reflectedPoint = {
        x: hitPoint.x + rdx * 120,
        y: hitPoint.y + rdy * 120,
      };
    }

    return { point: hitPoint, reflected: reflectedPoint };
  }
}
