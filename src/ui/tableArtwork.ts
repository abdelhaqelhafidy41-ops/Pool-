/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, CueItem, TableFeltTheme, Vector2D } from '../types/game';
import { BALL_RADIUS, PLAY_AREA, POCKETS, TABLE_HEIGHT, TABLE_WIDTH } from '../physics/engine';

/**
 * Draws the signature Tribal Aboriginal / Aztec patterned wooden rails
 * matching the user's reference image (honey-caramel wood, concentric dot mandalas,
 * side gecko totems, and perimeter chevron border).
 */
export function drawTribalTableRails(ctx: CanvasRenderingContext2D) {
  ctx.save();

  // 1. Base honey-caramel varnished wood table body
  const baseWood = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
  baseWood.addColorStop(0, '#7c431b');
  baseWood.addColorStop(0.2, '#aa6732');
  baseWood.addColorStop(0.5, '#c68444');
  baseWood.addColorStop(0.8, '#aa6732');
  baseWood.addColorStop(1, '#693714');

  ctx.fillStyle = baseWood;
  ctx.beginPath();
  ctx.roundRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT, 22);
  ctx.fill();

  // Outer dark rim stroke
  ctx.strokeStyle = '#2b1407';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner wood bevel highlight
  ctx.strokeStyle = 'rgba(255, 230, 180, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(3, 3, TABLE_WIDTH - 6, TABLE_HEIGHT - 6, 20);
  ctx.stroke();

  // 2. Perimeter tribal chevron / zigzag trim along outer edge
  drawTribalChevronBorder(ctx);

  // 3. Circular dot-art mandalas on top and bottom rails
  drawRailMandalas(ctx);

  // 4. Stylized tribal Gecko / Lizard totems on left and right side rails
  drawSideRailGeckos(ctx);

  // 5. Gold / Brass diamond sights along rails
  drawDiamondSights(ctx);

  // 6. Bronze / Graphite Pocket Castings with gold screws
  drawPocketCastings(ctx);

  ctx.restore();
}

/**
 * Draws the tribal zigzag / chevron border along the table edges
 */
function drawTribalChevronBorder(ctx: CanvasRenderingContext2D) {
  ctx.save();
  const step = 8;
  const h = 5;

  // Top edge chevron
  for (let x = 30; x < TABLE_WIDTH - 30; x += step) {
    const isRed = Math.floor(x / step) % 2 === 0;
    ctx.fillStyle = isRed ? '#dc2626' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.lineTo(x + step / 2, 2 + h);
    ctx.lineTo(x + step, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(x + step / 2, 3, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottom edge chevron
  for (let x = 30; x < TABLE_WIDTH - 30; x += step) {
    const isRed = Math.floor(x / step) % 2 === 0;
    ctx.fillStyle = isRed ? '#dc2626' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x, TABLE_HEIGHT - 2);
    ctx.lineTo(x + step / 2, TABLE_HEIGHT - 2 - h);
    ctx.lineTo(x + step, TABLE_HEIGHT - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(x + step / 2, TABLE_HEIGHT - 3, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Left edge chevron
  for (let y = 30; y < TABLE_HEIGHT - 30; y += step) {
    const isRed = Math.floor(y / step) % 2 === 0;
    ctx.fillStyle = isRed ? '#dc2626' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(2, y);
    ctx.lineTo(2 + h, y + step / 2);
    ctx.lineTo(2, y + step);
    ctx.closePath();
    ctx.fill();
  }

  // Right edge chevron
  for (let y = 30; y < TABLE_HEIGHT - 30; y += step) {
    const isRed = Math.floor(y / step) % 2 === 0;
    ctx.fillStyle = isRed ? '#dc2626' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH - 2, y);
    ctx.lineTo(TABLE_WIDTH - 2 - h, y + step / 2);
    ctx.lineTo(TABLE_WIDTH - 2, y + step);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws the circular Aboriginal / Aztec dot mandalas centered on the rails
 */
function drawRailMandalas(ctx: CanvasRenderingContext2D) {
  // Center positions for the circular mandalas:
  // Top rail: 3 clusters on left half, 3 clusters on right half
  const topCenters = [
    { x: 160, y: 22 },
    { x: 260, y: 22 },
    { x: 370, y: 22 },
    { x: 610, y: 22 },
    { x: 720, y: 22 },
    { x: 820, y: 22 },
  ];

  // Bottom rail: 3 clusters on left half, 3 clusters on right half
  const bottomCenters = [
    { x: 160, y: TABLE_HEIGHT - 22 },
    { x: 260, y: TABLE_HEIGHT - 22 },
    { x: 370, y: TABLE_HEIGHT - 22 },
    { x: 610, y: TABLE_HEIGHT - 22 },
    { x: 720, y: TABLE_HEIGHT - 22 },
    { x: 820, y: TABLE_HEIGHT - 22 },
  ];

  const allMandalas = [...topCenters, ...bottomCenters];

  for (const pos of allMandalas) {
    drawMandalaDisc(ctx, pos.x, pos.y);
  }
}

function drawMandalaDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();

  // Outer connecting beaded arch arcs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.stroke();

  // Outer red dot ring
  const numOuterDots = 14;
  for (let i = 0; i < numOuterDots; i++) {
    const ang = (i / numOuterDots) * Math.PI * 2;
    const px = cx + Math.cos(ang) * 16.5;
    const py = cy + Math.sin(ang) * 16.5;
    ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(px, py, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Middle ring - dark chocolate backing
  ctx.fillStyle = '#2b1407';
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fill();

  // Concentric white dots
  const numMidDots = 10;
  for (let i = 0; i < numMidDots; i++) {
    const ang = (i / numMidDots) * Math.PI * 2;
    const px = cx + Math.cos(ang) * 10;
    const py = cy + Math.sin(ang) * 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner ring - ruby / crimson disc
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();

  // Center golden jewel
  const jewelGrad = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 4);
  jewelGrad.addColorStop(0, '#fef08a');
  jewelGrad.addColorStop(0.7, '#f59e0b');
  jewelGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = jewelGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Flanking white dot wings
  for (let dx = -28; dx <= 28; dx += 5) {
    if (Math.abs(dx) > 17 && Math.abs(dx) < 32) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + dx, cy - 3, 1, 0, Math.PI * 2);
      ctx.arc(cx + dx, cy + 3, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws the iconic Aboriginal / Aztec Gecko Totems on left and right vertical rails
 */
function drawSideRailGeckos(ctx: CanvasRenderingContext2D) {
  // Left side gecko
  drawGecko(ctx, 22, TABLE_HEIGHT / 2, -Math.PI / 2);
  // Right side gecko
  drawGecko(ctx, TABLE_WIDTH - 22, TABLE_HEIGHT / 2, Math.PI / 2);
}

function drawGecko(ctx: CanvasRenderingContext2D, cx: number, cy: number, rotation: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Gecko dimensions scale
  const scale = 0.85;
  ctx.scale(scale, scale);

  // 1. Gecko dark silhouette backing
  ctx.fillStyle = '#1c1917';
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1;

  // Head
  ctx.beginPath();
  ctx.ellipse(0, -95, 7, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (white dots with black center)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-4, -98, 2, 0, Math.PI * 2);
  ctx.arc(4, -98, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-4, -98, 1, 0, Math.PI * 2);
  ctx.arc(4, -98, 1, 0, Math.PI * 2);
  ctx.fill();

  // Torso / Spine
  const bodyGrad = ctx.createLinearGradient(0, -90, 0, 70);
  bodyGrad.addColorStop(0, '#dc2626');
  bodyGrad.addColorStop(0.5, '#b91c1c');
  bodyGrad.addColorStop(1, '#991b1b');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, -20, 8, 65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front legs (splayed with claws)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  // Left front leg
  ctx.beginPath();
  ctx.moveTo(-5, -70);
  ctx.lineTo(-18, -60);
  ctx.lineTo(-24, -75);
  ctx.stroke();

  // Right front leg
  ctx.beginPath();
  ctx.moveTo(5, -70);
  ctx.lineTo(18, -60);
  ctx.lineTo(24, -75);
  ctx.stroke();

  // Hind legs
  // Left hind leg
  ctx.beginPath();
  ctx.moveTo(-6, 25);
  ctx.lineTo(-20, 38);
  ctx.lineTo(-22, 18);
  ctx.stroke();

  // Right hind leg
  ctx.beginPath();
  ctx.moveTo(6, 25);
  ctx.lineTo(20, 38);
  ctx.lineTo(22, 18);
  ctx.stroke();

  // Curving tail with Aboriginal dots
  ctx.beginPath();
  ctx.moveTo(0, 45);
  ctx.bezierCurveTo(0, 85, -18, 95, -10, 115);
  ctx.bezierCurveTo(-2, 128, 12, 120, 14, 138);
  ctx.stroke();

  // White and yellow Aboriginal dot decoration along spine
  for (let y = -80; y <= 40; y += 8) {
    // Spine center white dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, y, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Flanking yellow dots
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-4, y, 1.2, 0, Math.PI * 2);
    ctx.arc(4, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail dots
  const tailDots = [
    { x: -3, y: 65 },
    { x: -8, y: 82 },
    { x: -11, y: 98 },
    { x: -6, y: 112 },
    { x: 3, y: 124 },
    { x: 12, y: 134 },
  ];
  for (const td of tailDots) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(td.x, td.y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws Diamond Sights (gold studs) in the traditional pool locations
 */
function drawDiamondSights(ctx: CanvasRenderingContext2D) {
  const diamonds: { x: number; y: number }[] = [];
  const L = PLAY_AREA.left;
  const R = PLAY_AREA.right;
  const T = PLAY_AREA.top;
  const B = PLAY_AREA.bottom;

  const xStep = PLAY_AREA.width / 8;
  for (let i = 1; i < 8; i++) {
    if (i !== 4) {
      diamonds.push({ x: L + i * xStep, y: T - 26 });
      diamonds.push({ x: L + i * xStep, y: B + 26 });
    }
  }

  const yStep = PLAY_AREA.height / 4;
  for (let j = 1; j < 4; j++) {
    diamonds.push({ x: L - 26, y: T + j * yStep });
    diamonds.push({ x: R + 26, y: T + j * yStep });
  }

  for (const d of diamonds) {
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws the heavy bronze / graphite pocket castings at the 6 pockets
 */
function drawPocketCastings(ctx: CanvasRenderingContext2D) {
  for (const pocket of POCKETS) {
    ctx.save();
    const { x, y } = pocket.position;

    // Corner castings vs Side castings
    const isCorner = pocket.name.includes('Corner') || pocket.id === 0 || pocket.id === 2 || pocket.id === 3 || pocket.id === 5;

    // Dark metallic bronze casting ring
    const castGrad = ctx.createRadialGradient(x - 3, y - 3, 4, x, y, pocket.radius + 6);
    castGrad.addColorStop(0, '#475569');
    castGrad.addColorStop(0.6, '#1e293b');
    castGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = castGrad;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(x, y, pocket.radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gold brass screw accents on casting
    if (isCorner) {
      const screwAng = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
      for (const ang of screwAng) {
        const sx = x + Math.cos(ang) * (pocket.radius + 1.5);
        const sy = y + Math.sin(ang) * (pocket.radius + 1.5);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

/**
 * Draws the rich vibrant felt surface matching the equipped felt theme
 */
export function drawTribalTableFelt(ctx: CanvasRenderingContext2D, feltTheme?: TableFeltTheme) {
  ctx.save();

  const centerX = (PLAY_AREA.left + PLAY_AREA.right) / 2;
  const centerY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
  const feltGrad = ctx.createRadialGradient(
    centerX,
    centerY,
    60,
    centerX,
    centerY,
    460
  );

  const baseColor = feltTheme?.feltColor || '#0d6938';
  // Dynamic radial gradient: bright tint in center, deepening to base felt color
  feltGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  feltGrad.addColorStop(0.3, baseColor);
  feltGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');

  // Base background fill
  ctx.fillStyle = baseColor;
  ctx.fillRect(PLAY_AREA.left, PLAY_AREA.top, PLAY_AREA.width, PLAY_AREA.height);

  // Radial illumination pass
  ctx.fillStyle = feltGrad;
  ctx.fillRect(PLAY_AREA.left, PLAY_AREA.top, PLAY_AREA.width, PLAY_AREA.height);

  // Soft ambient cushion drop shadow inside felt
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 7;
  ctx.strokeRect(PLAY_AREA.left, PLAY_AREA.top, PLAY_AREA.width, PLAY_AREA.height);

  // Head string (Baulk line): crisp cyan/white vertical line at x = 28%
  const headStringX = PLAY_AREA.left + PLAY_AREA.width * 0.28;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(headStringX, PLAY_AREA.top);
  ctx.lineTo(headStringX, PLAY_AREA.bottom);
  ctx.stroke();

  // Head spot circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(headStringX, centerY, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.beginPath();
  ctx.arc(headStringX, centerY, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Foot spot circle
  const footSpotX = PLAY_AREA.left + PLAY_AREA.width * 0.72;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(footSpotX, centerY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the cushions with custom felt and beveled edges
 */
export function drawTribalCushions(ctx: CanvasRenderingContext2D, feltTheme?: TableFeltTheme) {
  const L = PLAY_AREA.left;
  const R = PLAY_AREA.right;
  const T = PLAY_AREA.top;
  const B = PLAY_AREA.bottom;
  const M = (L + R) / 2;
  const cut = 22;

  ctx.fillStyle = feltTheme?.railColor || '#058339'; // Cushion face
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;

  const drawPoly = (points: { x: number; y: number }[]) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Top Left Cushion
  drawPoly([
    { x: L + cut + 6, y: T },
    { x: M - cut, y: T },
    { x: M - cut - 10, y: T - 20 },
    { x: L + cut - 5, y: T - 20 },
  ]);

  // Top Right Cushion
  drawPoly([
    { x: M + cut, y: T },
    { x: R - cut - 6, y: T },
    { x: R - cut + 5, y: T - 20 },
    { x: M + cut + 10, y: T - 20 },
  ]);

  // Bottom Left Cushion
  drawPoly([
    { x: L + cut + 6, y: B },
    { x: M - cut, y: B },
    { x: M - cut - 10, y: B + 20 },
    { x: L + cut - 5, y: B + 20 },
  ]);

  // Bottom Right Cushion
  drawPoly([
    { x: M + cut, y: B },
    { x: R - cut - 6, y: B },
    { x: R - cut + 5, y: B + 20 },
    { x: M + cut + 10, y: B + 20 },
  ]);

  // Left Cushion
  drawPoly([
    { x: L, y: T + cut + 6 },
    { x: L, y: B - cut - 6 },
    { x: L - 20, y: B - cut + 5 },
    { x: L - 20, y: T + cut - 5 },
  ]);

  // Right Cushion
  drawPoly([
    { x: R, y: T + cut + 6 },
    { x: R, y: B - cut - 6 },
    { x: R + 20, y: B - cut + 5 },
    { x: R + 20, y: T + cut - 5 },
  ]);
}

/**
 * Draws the 6 drop pockets with deep black leather drop shadows
 */
export function drawTribalPockets(ctx: CanvasRenderingContext2D) {
  for (const pocket of POCKETS) {
    const { x, y } = pocket.position;

    // Drop hole
    const dropGrad = ctx.createRadialGradient(x - 2, y - 2, 2, x, y, pocket.radius);
    dropGrad.addColorStop(0, '#000000');
    dropGrad.addColorStop(0.7, '#070b14');
    dropGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = dropGrad;
    ctx.beginPath();
    ctx.arc(x, y, pocket.radius - 1, 0, Math.PI * 2);
    ctx.fill();

    // Inner rim shadow
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Draws the Overhead Chrome Wire Ball Return Track
 * As shown at the top of the table in the reference screenshot!
 */
export function drawOverheadBallReturnTrack(
  ctx: CanvasRenderingContext2D,
  pocketedBalls: Ball[]
) {
  ctx.save();

  // Rail dimensions
  const railStartX = 280;
  const railEndX = 720;
  const railY1 = 12; // Top wire
  const railY2 = 20; // Mid wire
  const railY3 = 28; // Bottom wire

  // 1. Shadow underneath chrome rail
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(railStartX - 2, railY1 + 3);
  ctx.lineTo(railEndX + 2, railY1 + 3);
  ctx.moveTo(railStartX - 2, railY3 + 3);
  ctx.lineTo(railEndX + 2, railY3 + 3);
  ctx.stroke();

  // 2. Chrome Metallic Gradient for the silver tubular rails
  const chromeGrad = ctx.createLinearGradient(0, railY1 - 2, 0, railY3 + 2);
  chromeGrad.addColorStop(0, '#cbd5e1');
  chromeGrad.addColorStop(0.3, '#ffffff');
  chromeGrad.addColorStop(0.6, '#94a3b8');
  chromeGrad.addColorStop(0.9, '#475569');
  chromeGrad.addColorStop(1, '#1e293b');

  ctx.strokeStyle = chromeGrad;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';

  // 3 parallel chrome wires with rounded left loop
  ctx.beginPath();
  // Wire 1 (top)
  ctx.moveTo(railStartX + 10, railY1);
  ctx.lineTo(railEndX, railY1);
  // Loop curve on left
  ctx.arc(railStartX + 10, (railY1 + railY3) / 2, (railY3 - railY1) / 2, -Math.PI / 2, Math.PI / 2, true);
  // Wire 3 (bottom)
  ctx.lineTo(railEndX, railY3);
  ctx.stroke();

  // Wire 2 (middle guide)
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(railStartX + 16, railY2);
  ctx.lineTo(railEndX, railY2);
  ctx.stroke();

  // Chrome support brackets / cross ties
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.5;
  for (let x = railStartX + 45; x <= railEndX - 10; x += 55) {
    ctx.beginPath();
    ctx.moveTo(x, railY1 - 2);
    ctx.lineTo(x, railY3 + 2);
    ctx.stroke();
  }

  // 3. Draw Pocketed Balls sitting queued up on the track
  // Filter balls pocketed (excluding cue ball #0)
  const potted = pocketedBalls.filter(b => b.isPocketed && b.number !== 0);

  const ballRadius = 8.5;
  const startBallX = railStartX + 18 + ballRadius;

  for (let i = 0; i < potted.length && i < 15; i++) {
    const ball = potted[i];
    const bx = startBallX + i * (ballRadius * 2 + 2);
    const by = railY2;

    // Ball drop shadow onto track
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(bx + 1, by + 1.5, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // Ball base color
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // Stripe band
    if (ball.stripeColor) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = ball.stripeColor;
      ctx.fillRect(bx - ballRadius, by - ballRadius * 0.45, ballRadius * 2, ballRadius * 0.9);
      ctx.restore();
    }

    // Number disc
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, ballRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.number.toString(), bx, by + 0.5);

    // Ball gloss highlight
    const gloss = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, ballRadius);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    gloss.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws the Cue Stick with the authentic matching Tribal Inlays
 */
export function drawTribalCueStick(
  ctx: CanvasRenderingContext2D,
  cuePos: Vector2D,
  angleRad: number,
  power: number,
  cueItem?: CueItem
) {
  ctx.save();
  ctx.translate(cuePos.x, cuePos.y);
  ctx.rotate(angleRad);

  const pullBack = 22 + power * 95;
  const cueLength = 290;

  const colors = cueItem?.colorScheme || {
    tip: '#0284c7',
    shaft: '#d97706',
    wrap: '#78350f',
    butt: '#451a03',
    glow: 'rgba(56, 189, 248, 0.6)',
  };

  // Shaft Wood Gradient
  const shaftGrad = ctx.createLinearGradient(-pullBack, 0, -pullBack - cueLength, 0);
  shaftGrad.addColorStop(0, '#fef08a'); // Clean maple near ferrule
  shaftGrad.addColorStop(0.2, colors.shaft);
  shaftGrad.addColorStop(0.65, colors.wrap);
  shaftGrad.addColorStop(1, colors.butt);

  // Main Tapered Cue Stick Body
  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  ctx.moveTo(-pullBack, -2.5);
  ctx.lineTo(-pullBack - cueLength, -6.5);
  ctx.lineTo(-pullBack - cueLength, 6.5);
  ctx.lineTo(-pullBack, 2.5);
  ctx.closePath();
  ctx.fill();

  // Ferrule (White Ivory collar at the tip)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-pullBack - 4, -2.6, 4, 5.2);

  // Leather tip
  ctx.fillStyle = colors.tip;
  ctx.fillRect(-pullBack, -2.5, 2.5, 5);

  // Cue Butt Inlay Wrap
  const wrapStart = -pullBack - 140;
  const wrapEnd = -pullBack - 240;

  ctx.fillStyle = colors.wrap;
  ctx.fillRect(wrapEnd, -5.5, wrapStart - wrapEnd, 11);

  // Rings and Chevrons on Wrap
  for (let x = wrapStart; x >= wrapEnd; x -= 7) {
    ctx.fillStyle = Math.floor(x / 7) % 2 === 0 ? colors.tip : '#1c1917';
    ctx.fillRect(x - 3, -5.5, 3.5, 11);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 1.5, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Metallic Joint Ring
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(wrapStart, -5, 4, 10);
  ctx.fillRect(wrapEnd, -6, 4, 12);

  // Power strike tip glow
  if (power > 0.15) {
    ctx.shadowColor = colors.glow || colors.tip;
    ctx.shadowBlur = 14 * power;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-pullBack - 1, -3, 3, 6);
  }

  ctx.restore();
}
