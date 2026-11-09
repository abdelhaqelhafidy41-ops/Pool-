/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, Pocket, Vector2D, CushionSegment, ShotReport } from '../types/game';
import { soundFX } from '../audio/soundFX';

export const TABLE_WIDTH = 980;
export const TABLE_HEIGHT = 530;
export const PLAY_AREA = {
  left: 45,
  right: 935,
  top: 45,
  bottom: 485,
  width: 890,
  height: 440,
};

export const BALL_RADIUS = 12.0;
export const CORNER_POCKET_RADIUS = 24.0;
export const SIDE_POCKET_RADIUS = 26.0;

// Pocket coordinates
export const POCKETS: Pocket[] = [
  { id: 0, name: 'Top-Left', position: { x: PLAY_AREA.left + 5, y: PLAY_AREA.top + 5 }, radius: CORNER_POCKET_RADIUS, dropRadius: 16 },
  { id: 1, name: 'Top-Center', position: { x: (PLAY_AREA.left + PLAY_AREA.right) / 2, y: PLAY_AREA.top - 2 }, radius: SIDE_POCKET_RADIUS, dropRadius: 18 },
  { id: 2, name: 'Top-Right', position: { x: PLAY_AREA.right - 5, y: PLAY_AREA.top + 5 }, radius: CORNER_POCKET_RADIUS, dropRadius: 16 },
  { id: 3, name: 'Bottom-Left', position: { x: PLAY_AREA.left + 5, y: PLAY_AREA.bottom - 5 }, radius: CORNER_POCKET_RADIUS, dropRadius: 16 },
  { id: 4, name: 'Bottom-Center', position: { x: (PLAY_AREA.left + PLAY_AREA.right) / 2, y: PLAY_AREA.bottom + 2 }, radius: SIDE_POCKET_RADIUS, dropRadius: 18 },
  { id: 5, name: 'Bottom-Right', position: { x: PLAY_AREA.right - 5, y: PLAY_AREA.bottom - 5 }, radius: CORNER_POCKET_RADIUS, dropRadius: 16 },
];

export interface PhysicsConfig {
  restitutionBall: number;
  restitutionCushion: number;
  rollingFriction: number;
  stopThreshold: number;
  maxVelocity: number;
  subSteps: number;
  hapticsEnabled: boolean;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  restitutionBall: 0.95,
  restitutionCushion: 0.82,
  rollingFriction: 0.988,
  stopThreshold: 0.04,
  maxVelocity: 36.0,
  subSteps: 12,
  hapticsEnabled: true,
};

// Cushions with angled pocket mouths
export function createCushionSegments(): CushionSegment[] {
  const L = PLAY_AREA.left;
  const R = PLAY_AREA.right;
  const T = PLAY_AREA.top;
  const B = PLAY_AREA.bottom;
  const M = (L + R) / 2;
  const cut = 20; // pocket jaw slant offset

  return [
    // Top-Left cushion
    { id: 'top_left', start: { x: L + cut + 5, y: T }, end: { x: M - cut, y: T }, normal: { x: 0, y: 1 } },
    // Top-Right cushion
    { id: 'top_right', start: { x: M + cut, y: T }, end: { x: R - cut - 5, y: T }, normal: { x: 0, y: 1 } },
    // Bottom-Left cushion
    { id: 'bottom_left', start: { x: L + cut + 5, y: B }, end: { x: M - cut, y: B }, normal: { x: 0, y: -1 } },
    // Bottom-Right cushion
    { id: 'bottom_right', start: { x: M + cut, y: B }, end: { x: R - cut - 5, y: B }, normal: { x: 0, y: -1 } },
    // Left cushion
    { id: 'left', start: { x: L, y: T + cut + 5 }, end: { x: L, y: B - cut - 5 }, normal: { x: 1, y: 0 } },
    // Right cushion
    { id: 'right', start: { x: R, y: T + cut + 5 }, end: { x: R, y: B - cut - 5 }, normal: { x: -1, y: 0 } },
  ];
}

export class PhysicsEngine {
  public cushions: CushionSegment[] = createCushionSegments();
  public pockets: Pocket[] = POCKETS;
  private config: PhysicsConfig = { ...DEFAULT_PHYSICS_CONFIG };

  public getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  public setConfig(custom: Partial<PhysicsConfig>) {
    this.config = { ...this.config, ...custom };
  }

  public resetConfig() {
    this.config = { ...DEFAULT_PHYSICS_CONFIG };
  }

  private triggerHaptic(durationMs: number | number[]) {
    if (!this.config.hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(durationMs);
      }
    } catch {
      // Ignore vibration errors if unsupported or restricted
    }
  }

  // Validate ball-in-hand placement
  public isValidCueBallPlacement(
    pos: Vector2D,
    allBalls: Ball[],
    mustBeBehindKitchen: boolean = false
  ): { valid: boolean; reason?: string } {
    const kitchenX = PLAY_AREA.left + PLAY_AREA.width * 0.28;

    // Check table boundaries
    if (
      pos.x < PLAY_AREA.left + BALL_RADIUS + 2 ||
      pos.x > PLAY_AREA.right - BALL_RADIUS - 2 ||
      pos.y < PLAY_AREA.top + BALL_RADIUS + 2 ||
      pos.y > PLAY_AREA.bottom - BALL_RADIUS - 2
    ) {
      return { valid: false, reason: 'Outside playable table area' };
    }

    // Kitchen line check (if required by house rules)
    if (mustBeBehindKitchen && pos.x > kitchenX) {
      return { valid: false, reason: 'Must place behind head string (kitchen line)' };
    }

    // Check overlap with pockets
    for (const pocket of this.pockets) {
      const dx = pocket.position.x - pos.x;
      const dy = pocket.position.y - pos.y;
      if (dx * dx + dy * dy < pocket.radius * pocket.radius) {
        return { valid: false, reason: 'Cannot place inside pocket mouth' };
      }
    }

    // Check collision overlap with other visible balls
    for (const ball of allBalls) {
      if (ball.number === 0 || ball.isPocketed) continue;
      const dx = ball.position.x - pos.x;
      const dy = ball.position.y - pos.y;
      const minDist = BALL_RADIUS * 2 + 1;
      if (dx * dx + dy * dy < minDist * minDist) {
        return { valid: false, reason: 'Overlaps another ball on table' };
      }
    }

    return { valid: true };
  }

  // Step the simulation forward by delta time with sub-stepping
  public step(
    balls: Ball[],
    dt: number,
    shotReport?: ShotReport
  ): { isStillMoving: boolean; newPocketedBalls: number[] } {
    const clampedDt = Math.min(dt, 0.05);
    const subDt = clampedDt / this.config.subSteps;
    let anyMoving = false;
    const newPocketedBalls: number[] = [];

    for (let step = 0; step < this.config.subSteps; step++) {
      // 1. Move balls, clamp speeds, apply friction & spin forces
      for (const ball of balls) {
        if (ball.isPocketed) continue;

        // Clamp runaway velocities
        const currentSpeedSq = ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y;
        if (currentSpeedSq > this.config.maxVelocity * this.config.maxVelocity) {
          const factor = this.config.maxVelocity / Math.sqrt(currentSpeedSq);
          ball.velocity.x *= factor;
          ball.velocity.y *= factor;
        }

        const speedSq = ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y;
        if (speedSq > this.config.stopThreshold * this.config.stopThreshold) {
          anyMoving = true;
          ball.position.x += ball.velocity.x * subDt * 60;
          ball.position.y += ball.velocity.y * subDt * 60;

          // Apply rolling friction
          const frictionFactor = Math.pow(this.config.rollingFriction, subDt * 60);
          ball.velocity.x *= frictionFactor;
          ball.velocity.y *= frictionFactor;

          // English / spin effect (adds slight curved trajectory if spinning)
          if (Math.abs(ball.spin.x) > 0.05) {
            const perpX = -ball.velocity.y;
            const perpY = ball.velocity.x;
            ball.velocity.x += perpX * ball.spin.x * 0.003 * (subDt * 60);
            ball.velocity.y += perpY * ball.spin.x * 0.003 * (subDt * 60);
            ball.spin.x *= 0.99;
          }
          if (Math.abs(ball.spin.y) > 0.05) {
            // topspin keeps momentum, backspin brakes
            ball.velocity.x += ball.velocity.x * ball.spin.y * 0.002 * (subDt * 60);
            ball.velocity.y += ball.velocity.y * ball.spin.y * 0.002 * (subDt * 60);
            ball.spin.y *= 0.985;
          }

          // Safety guard: prevent out-of-table clipping
          if (ball.position.x < PLAY_AREA.left - 5) ball.position.x = PLAY_AREA.left + ball.radius;
          if (ball.position.x > PLAY_AREA.right + 5) ball.position.x = PLAY_AREA.right - ball.radius;
          if (ball.position.y < PLAY_AREA.top - 5) ball.position.y = PLAY_AREA.top + ball.radius;
          if (ball.position.y > PLAY_AREA.bottom + 5) ball.position.y = PLAY_AREA.bottom - ball.radius;
        } else {
          // Zero out completely to prevent endless microscopic jitter
          ball.velocity.x = 0;
          ball.velocity.y = 0;
          ball.spin.x = 0;
          ball.spin.y = 0;
        }
      }

      // 2. Check Pocket drops and pocket suction
      for (const ball of balls) {
        if (ball.isPocketed) continue;

        for (const pocket of this.pockets) {
          const dx = pocket.position.x - ball.position.x;
          const dy = pocket.position.y - ball.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Pocket gravitational pull when near pocket lip
          if (dist < pocket.radius) {
            const pullForce = 0.35 * (1 - dist / pocket.radius);
            ball.velocity.x += (dx / dist) * pullForce;
            ball.velocity.y += (dy / dist) * pullForce;
          }

          // Fully dropped into the pocket
          if (dist < pocket.dropRadius) {
            ball.isPocketed = true;
            ball.velocity = { x: 0, y: 0 };
            newPocketedBalls.push(ball.number);
            soundFX.playPocketDrop();
            this.triggerHaptic([30, 20, 25]);

            if (shotReport) {
              shotReport.ballsPocketedThisShot.push(ball.number);
              if (ball.number === 0) {
                shotReport.cueBallPocketed = true;
              }
            }
            break;
          }
        }
      }

      // 3. Ball-to-Ball collisions (Two-pass position relaxation prevents overlap in clusters)
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < balls.length; i++) {
          const b1 = balls[i];
          if (b1.isPocketed) continue;

          for (let j = i + 1; j < balls.length; j++) {
            const b2 = balls[j];
            if (b2.isPocketed) continue;

            const dx = b2.position.x - b1.position.x;
            const dy = b2.position.y - b1.position.y;
            const distSq = dx * dx + dy * dy;
            const minDist = b1.radius + b2.radius;

            if (distSq < minDist * minDist && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              // Normal unit vector
              const nx = dx / dist;
              const ny = dy / dist;

              // Separate overlapping balls
              const overlap = minDist - dist;
              b1.position.x -= nx * overlap * 0.5;
              b1.position.y -= ny * overlap * 0.5;
              b2.position.x += nx * overlap * 0.5;
              b2.position.y += ny * overlap * 0.5;

              // Only resolve dynamic velocity impulse on the first pass
              if (pass === 0) {
                const kx = b1.velocity.x - b2.velocity.x;
                const ky = b1.velocity.y - b2.velocity.y;
                const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);

                // Only resolve if balls are moving towards each other
                if (nx * kx + ny * ky > 0) {
                  const impulse = p * this.config.restitutionBall;
                  b1.velocity.x -= impulse * b2.mass * nx;
                  b1.velocity.y -= impulse * b2.mass * ny;
                  b2.velocity.x += impulse * b1.mass * nx;
                  b2.velocity.y += impulse * b1.mass * ny;

                  // Sound & Shot reporting
                  const impactSpeed = Math.sqrt(kx * kx + ky * ky);
                  soundFX.playBallCollision(impactSpeed);
                  if (impactSpeed > 3.0) {
                    this.triggerHaptic(12);
                  }

                  if (shotReport && shotReport.cueBallHitFirst === null) {
                    if (b1.number === 0) shotReport.cueBallHitFirst = b2.number;
                    else if (b2.number === 0) shotReport.cueBallHitFirst = b1.number;
                  }
                }
              }
            }
          }
        }
      }

      // 4. Ball-to-Cushion collisions with boundary safety clamping
      for (const ball of balls) {
        if (ball.isPocketed) continue;

        for (const seg of this.cushions) {
          // Point to segment distance check
          const segVecX = seg.end.x - seg.start.x;
          const segVecY = seg.end.y - seg.start.y;
          const segLenSq = segVecX * segVecX + segVecY * segVecY;

          const toBallX = ball.position.x - seg.start.x;
          const toBallY = ball.position.y - seg.start.y;

          const t = Math.max(0, Math.min(1, (toBallX * segVecX + toBallY * segVecY) / segLenSq));
          const projX = seg.start.x + t * segVecX;
          const projY = seg.start.y + t * segVecY;

          const distVecX = ball.position.x - projX;
          const distVecY = ball.position.y - projY;
          const distSq = distVecX * distVecX + distVecY * distVecY;

          if (distSq < ball.radius * ball.radius) {
            const dist = Math.sqrt(distSq) || 0.001;
            const nx = distVecX / dist;
            const ny = distVecY / dist;

            // Push ball away from cushion
            const overlap = ball.radius - dist;
            ball.position.x += nx * overlap;
            ball.position.y += ny * overlap;

            // Reflect velocity along normal
            const dot = ball.velocity.x * nx + ball.velocity.y * ny;
            if (dot < 0) {
              ball.velocity.x = (ball.velocity.x - (1 + this.config.restitutionCushion) * dot * nx);
              ball.velocity.y = (ball.velocity.y - (1 + this.config.restitutionCushion) * dot * ny);

              // Influence rebound angle with sidespin
              if (Math.abs(ball.spin.x) > 0.05) {
                const tangentX = -ny;
                const tangentY = nx;
                ball.velocity.x += tangentX * ball.spin.x * 1.5;
                ball.velocity.y += tangentY * ball.spin.x * 1.5;
              }

              // Dampen slightly along tangent
              ball.velocity.x *= 0.96;
              ball.velocity.y *= 0.96;

              soundFX.playCushionBounce(Math.abs(dot));
              this.triggerHaptic(18);

              if (shotReport && shotReport.cueBallHitFirst !== null) {
                shotReport.cushionHitAfterFirstContact = true;
              }
            }
          }
        }

        // Strict boundary safety clamping away from pocket drops to prevent any wall clipping
        let nearPocket = false;
        for (const p of this.pockets) {
          const pdx = p.position.x - ball.position.x;
          const pdy = p.position.y - ball.position.y;
          if (pdx * pdx + pdy * pdy < 36 * 36) {
            nearPocket = true;
            break;
          }
        }
        if (!nearPocket) {
          const minX = PLAY_AREA.left + ball.radius;
          const maxX = PLAY_AREA.right - ball.radius;
          const minY = PLAY_AREA.top + ball.radius;
          const maxY = PLAY_AREA.bottom - ball.radius;
          if (ball.position.x < minX) {
            ball.position.x = minX;
            if (ball.velocity.x < 0) ball.velocity.x = -ball.velocity.x * this.config.restitutionCushion;
          } else if (ball.position.x > maxX) {
            ball.position.x = maxX;
            if (ball.velocity.x > 0) ball.velocity.x = -ball.velocity.x * this.config.restitutionCushion;
          }
          if (ball.position.y < minY) {
            ball.position.y = minY;
            if (ball.velocity.y < 0) ball.velocity.y = -ball.velocity.y * this.config.restitutionCushion;
          } else if (ball.position.y > maxY) {
            ball.position.y = maxY;
            if (ball.velocity.y > 0) ball.velocity.y = -ball.velocity.y * this.config.restitutionCushion;
          }
        }
      }
    }

    return { isStillMoving: anyMoving, newPocketedBalls };
  }

  // Strike the cue ball with power, angle, and spin
  public strikeBall(cueBall: Ball, angleRad: number, powerRatio: number, spinOffset: Vector2D = { x: 0, y: 0 }) {
    const maxSpeed = this.config.maxVelocity;
    const speed = Math.max(2.5, powerRatio * maxSpeed);

    cueBall.velocity.x = Math.cos(angleRad) * speed;
    cueBall.velocity.y = Math.sin(angleRad) * speed;

    // Apply spin/english
    cueBall.spin.x = spinOffset.x; // sidespin
    cueBall.spin.y = spinOffset.y; // topspin/draw

    soundFX.playCueHit(powerRatio);
    this.triggerHaptic(Math.round(20 + powerRatio * 35));
  }
}

export const physicsEngine = new PhysicsEngine();
