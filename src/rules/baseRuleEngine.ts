/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, Player, RuleEvaluationResult, ShotReport } from '../types/game';
import { BALL_RADIUS, PLAY_AREA } from '../physics/engine';

export interface IRuleEngine {
  readonly modeName: string;
  readonly modeNameAr: string;
  initializeBalls(): Ball[];
  evaluateShot(
    shotReport: ShotReport,
    activePlayer: Player,
    otherPlayer: Player,
    allBalls: Ball[],
    tableState: { isOpenTable: boolean }
  ): RuleEvaluationResult;
}

// Standard Pool Ball Colors
export const BALL_COLORS: Record<number, { color: string; stripe?: string }> = {
  0: { color: '#ffffff' }, // Cue ball
  1: { color: '#facc15' }, // Solid Yellow
  2: { color: '#2563eb' }, // Solid Blue
  3: { color: '#dc2626' }, // Solid Red
  4: { color: '#7c3aed' }, // Solid Purple
  5: { color: '#ea580c' }, // Solid Orange
  6: { color: '#16a34a' }, // Solid Green
  7: { color: '#78350f' }, // Solid Maroon
  8: { color: '#09090b' }, // 8-Ball Black
  9: { color: '#ffffff', stripe: '#facc15' }, // Stripe Yellow
  10: { color: '#ffffff', stripe: '#2563eb' }, // Stripe Blue
  11: { color: '#ffffff', stripe: '#dc2626' }, // Stripe Red
  12: { color: '#ffffff', stripe: '#7c3aed' }, // Stripe Purple
  13: { color: '#ffffff', stripe: '#ea580c' }, // Stripe Orange
  14: { color: '#ffffff', stripe: '#16a34a' }, // Stripe Green
  15: { color: '#ffffff', stripe: '#78350f' }, // Stripe Maroon
};

// Create a single Ball object
export function createBall(
  id: number,
  number: number,
  x: number,
  y: number
): Ball {
  const isCue = number === 0;
  const is8 = number === 8;
  const is9 = number === 9;
  const isStripe = number >= 9 && number <= 15;
  const ballInfo = BALL_COLORS[number] || { color: '#cccccc' };

  return {
    id,
    number,
    type: isCue ? 'cue' : is8 ? 'eight' : is9 ? 'nine' : isStripe ? 'stripe' : 'solid',
    color: ballInfo.color,
    stripeColor: ballInfo.stripe,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    spin: { x: 0, y: 0 },
    radius: BALL_RADIUS,
    isPocketed: false,
    visible: true,
    mass: 1.0,
  };
}

// Generate standard 15-ball triangle rack for 8-ball
export function setup8BallRack(): Ball[] {
  const balls: Ball[] = [];
  // Cue Ball at head string (1/4 table length from left)
  const cueX = PLAY_AREA.left + PLAY_AREA.width * 0.28;
  const cueY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
  balls.push(createBall(0, 0, cueX, cueY));

  // Apex of the rack (around 72% table length from left)
  const apexX = PLAY_AREA.left + PLAY_AREA.width * 0.72;
  const apexY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
  const r = BALL_RADIUS;
  const dx = r * Math.sqrt(3) + 0.3; // row offset
  const dy = r * 2 + 0.3; // vertical spacing

  // Official 8-ball rack configuration: 8-ball in center (row 3, pos 2)
  // Corners must be one solid and one stripe
  const rackNumbers = [
    [1], // Row 1 (apex)
    [9, 2], // Row 2
    [3, 8, 10], // Row 3: 8 ball in center!
    [11, 4, 12, 5], // Row 4
    [6, 13, 7, 14, 15], // Row 5 (bottom corners: 6 solid, 15 stripe)
  ];

  let idCounter = 1;
  rackNumbers.forEach((row, rowIndex) => {
    const rowX = apexX + rowIndex * dx;
    const startY = apexY - (row.length - 1) * (dy / 2);

    row.forEach((ballNum, colIndex) => {
      const ballY = startY + colIndex * dy;
      balls.push(createBall(idCounter++, ballNum, rowX, ballY));
    });
  });

  return balls;
}

// Generate 9-ball diamond rack
export function setup9BallRack(): Ball[] {
  const balls: Ball[] = [];
  const cueX = PLAY_AREA.left + PLAY_AREA.width * 0.28;
  const cueY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
  balls.push(createBall(0, 0, cueX, cueY));

  const apexX = PLAY_AREA.left + PLAY_AREA.width * 0.72;
  const apexY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
  const r = BALL_RADIUS;
  const dx = r * Math.sqrt(3) + 0.3;
  const dy = r * 2 + 0.3;

  // Diamond layout: 1 at apex, 9 in center
  const diamondLayout = [
    [1],
    [2, 3],
    [4, 9, 5], // 9 in middle
    [6, 7],
    [8],
  ];

  let idCounter = 1;
  diamondLayout.forEach((row, rowIndex) => {
    const rowX = apexX + rowIndex * dx;
    const startY = apexY - (row.length - 1) * (dy / 2);

    row.forEach((ballNum, colIndex) => {
      const ballY = startY + colIndex * dy;
      balls.push(createBall(idCounter++, ballNum, rowX, ballY));
    });
  });

  return balls;
}
