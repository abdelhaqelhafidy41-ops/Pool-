/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Ball, CueItem, GameMode, TableFeltTheme, TrajectoryPoint, TurnPhase, Vector2D } from '../types/game';
import { BALL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH, PLAY_AREA, physicsEngine } from '../physics/engine';
import { TrajectoryCalculator } from '../physics/trajectory';
import { soundFX } from '../audio/soundFX';
import {
  drawTribalTableRails,
  drawTribalTableFelt,
  drawTribalCushions,
  drawTribalPockets,
  drawOverheadBallReturnTrack,
  drawTribalCueStick,
} from './tableArtwork';

interface TableCanvasProps {
  balls: Ball[];
  aimAngle: number;
  cuePower: number;
  cueItem: CueItem;
  feltTheme: TableFeltTheme;
  trailStyle?: string;
  ballStyle?: string;
  highContrastMode?: boolean;
  reducedMotion?: boolean;
  dragSensitivity?: number;
  lastPocketedPos?: Vector2D | null;
  isMatchWon?: boolean;
  turnPhase: TurnPhase;
  gameMode: GameMode;
  isZoomed?: boolean;
  disabled?: boolean;
  onAimAngleChange: (angle: number) => void;
  onPlaceBallInHand: (pos: Vector2D) => void;
  language: 'en' | 'ar';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export const TableCanvas: React.FC<TableCanvasProps> = ({
  balls,
  aimAngle,
  cuePower,
  cueItem,
  feltTheme,
  trailStyle = 'trail_none',
  ballStyle = 'ball_style_classic',
  highContrastMode = false,
  reducedMotion = false,
  dragSensitivity = 1.0,
  lastPocketedPos = null,
  isMatchWon = false,
  turnPhase,
  gameMode,
  isZoomed = false,
  disabled = false,
  onAimAngleChange,
  onPlaceBallInHand,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPointerInteracting = useRef(false);
  const isDraggingBallInHandRef = useRef(false);
  const [dragCuePos, setDragCuePos] = useState<Vector2D | null>(null);
  const [placementValid, setPlacementValid] = useState<boolean>(true);
  const dragCuePosRef = useRef<Vector2D | null>(null);
  const ballTrailsRef = useRef<Map<number, { x: number; y: number }[]>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const ballRotationsRef = useRef<Map<number, { rollDist: number; lastX: number; lastY: number; spinAngle: number }>>(new Map());
  const lastAimAngleRef = useRef(aimAngle);
  lastAimAngleRef.current = aimAngle;
  const isRTL = language === 'ar';

  // Spawn pocket celebration sparks
  useEffect(() => {
    if (!lastPocketedPos || reducedMotion) return;
    const colors = ['#f59e0b', '#38bdf8', '#10b981', '#ffffff', '#fbbf24'];
    const count = reducedMotion ? 4 : 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particlesRef.current.push({
        x: lastPocketedPos.x,
        y: lastPocketedPos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 24 + Math.random() * 16,
      });
    }
  }, [lastPocketedPos, reducedMotion]);

  // Spawn victory celebration shower
  useEffect(() => {
    if (!isMatchWon || reducedMotion) return;
    const colors = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#a78bfa'];
    const timer = setInterval(() => {
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: PLAY_AREA.left + Math.random() * PLAY_AREA.width,
          y: PLAY_AREA.top - 10,
          vx: (Math.random() - 0.5) * 2,
          vy: 2 + Math.random() * 3,
          size: 3 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }
    }, 150);
    return () => clearInterval(timer);
  }, [isMatchWon, reducedMotion]);

  const cueBall = balls.find(b => b.number === 0);

  // Lowest ball on table for 9-ball highlight
  const lowest9Ball = gameMode === '9ball'
    ? balls.filter(b => !b.isPocketed && b.number >= 1 && b.number <= 9).sort((a, b) => a.number - b.number)[0]
    : null;

  // Compute live trajectory
  const trajectory: TrajectoryPoint | null =
    cueBall && !cueBall.isPocketed && (turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE')
      ? TrajectoryCalculator.calculate(cueBall, balls, aimAngle, cueItem.aimGuideLength)
      : null;

  // 60fps render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      ctx.save();

      // Update 2D rolling / spinning state for all balls based on their real velocity and direction
      for (const ball of balls) {
        if (ball.isPocketed) continue;
        const bState = ballRotationsRef.current.get(ball.number) || {
          rollDist: 0,
          lastX: ball.position.x,
          lastY: ball.position.y,
          spinAngle: 0,
        };
        const dx = ball.position.x - bState.lastX;
        const dy = ball.position.y - bState.lastY;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.02) {
          bState.rollDist += dist;
          // Roll angle advances naturally with distance traveled / radius:
          bState.spinAngle += (dist / ball.radius) * 1.35;
        }

        bState.lastX = ball.position.x;
        bState.lastY = ball.position.y;
        ballRotationsRef.current.set(ball.number, bState);
      }

      // Camera Zoom / Pan Transform if enabled
      if (isZoomed && cueBall && !cueBall.isPocketed) {
        const zoom = 1.25;
        const targetX = Math.max(TABLE_WIDTH * 0.35, Math.min(TABLE_WIDTH * 0.65, cueBall.position.x));
        const targetY = Math.max(TABLE_HEIGHT * 0.35, Math.min(TABLE_HEIGHT * 0.65, cueBall.position.y));

        ctx.translate(TABLE_WIDTH / 2, TABLE_HEIGHT / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-targetX, -targetY);
      }

      // 1. Draw Wooden Table Border and Rails (Aboriginal Dot Mandalas, Side Geckos, Chevrons)
      drawTribalTableRails(ctx);

      // 2. Draw Custom Table Felt with Baulk Line & Spots
      drawTribalTableFelt(ctx, feltTheme);

      // 3. Draw Table Cushions
      drawTribalCushions(ctx, feltTheme);

      // 4. Draw Drop Pockets
      drawTribalPockets(ctx);

      // 5. Draw Overhead Chrome Ball Return Track with Pocketed Balls (Matching Reference Image)
      drawOverheadBallReturnTrack(ctx, balls);

      // 6. Draw 9-Ball Target Highlight if active
      if (lowest9Ball && !lowest9Ball.isPocketed) {
        drawTargetBallHighlight(ctx, lowest9Ball.position);
      }

      // 7. Draw Trajectory Aim Guide (Clean White Vector & Ghost Ring Matching Reference Image)
      if (!disabled && trajectory && cueBall && !cueBall.isPocketed && (turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE')) {
        drawTrajectory(ctx, cueBall, trajectory, isRTL);
      }

      // 7.5 Draw Ball Trails if cosmetic trail is equipped
      if (trailStyle !== 'trail_none') {
        updateAndDrawBallTrails(ctx, balls, ballTrailsRef.current, trailStyle);
      }

      // Prepare balls list with dynamic dragged cue ball if in BALL_IN_HAND
      const activePlacementPos = dragCuePosRef.current || dragCuePos || (cueBall ? cueBall.position : { x: TABLE_WIDTH / 2 - 100, y: TABLE_HEIGHT / 2 });
      let renderBalls = balls;
      if (turnPhase === 'BALL_IN_HAND') {
        let foundCue = false;
        renderBalls = balls.map(b => {
          if (b.number === 0) {
            foundCue = true;
            return {
              ...b,
              position: { ...activePlacementPos },
              isPocketed: false,
              visible: true,
            };
          }
          return b;
        });
        if (!foundCue) {
          renderBalls = [
            {
              id: 0,
              number: 0,
              type: 'cue',
              color: '#ffffff',
              position: { ...activePlacementPos },
              velocity: { x: 0, y: 0 },
              radius: BALL_RADIUS,
              mass: 1.0,
              isPocketed: false,
              visible: true,
              spin: { x: 0, y: 0 },
            },
            ...renderBalls,
          ];
        }
      }

      // 8. Draw Balls with rolling rotation according to speed and direction
      drawBalls(ctx, renderBalls, ballStyle, highContrastMode, ballRotationsRef.current);

      // 8.5 Draw Particle Bursts & Celebrations
      updateAndDrawParticles(ctx, particlesRef.current);

      // 9. Draw Cue Stick with Tribal Inlays
      if (!disabled && cueBall && !cueBall.isPocketed && (turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE')) {
        drawTribalCueStick(ctx, cueBall.position, aimAngle, cuePower, cueItem);
      }

      // 10. Ball In Hand placement visual feedback (Green valid / Red invalid with collision ring)
      if (!disabled && turnPhase === 'BALL_IN_HAND') {
        const val = physicsEngine.isValidCueBallPlacement(activePlacementPos, balls);
        drawBallInHandPlacement(ctx, activePlacementPos, val.valid, balls);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [balls, aimAngle, cuePower, cueItem, trailStyle, ballStyle, highContrastMode, reducedMotion, turnPhase, trajectory, isRTL, cueBall, lowest9Ball, isZoomed, disabled, dragCuePos]);

  // Pointer event handlers for aiming or placing cue ball
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;

    let clickX = (e.clientX - rect.left) * scaleX;
    let clickY = (e.clientY - rect.top) * scaleY;

    // Invert zoom transform if active
    if (isZoomed && cueBall && !cueBall.isPocketed) {
      const zoom = 1.25;
      const targetX = Math.max(TABLE_WIDTH * 0.35, Math.min(TABLE_WIDTH * 0.65, cueBall.position.x));
      const targetY = Math.max(TABLE_HEIGHT * 0.35, Math.min(TABLE_HEIGHT * 0.65, cueBall.position.y));
      clickX = (clickX - TABLE_WIDTH / 2) / zoom + targetX;
      clickY = (clickY - TABLE_HEIGHT / 2) / zoom + targetY;
    }

    if (turnPhase === 'BALL_IN_HAND') {
      isPointerInteracting.current = true;
      isDraggingBallInHandRef.current = true;
      const clampedX = Math.max(PLAY_AREA.left + BALL_RADIUS + 3, Math.min(PLAY_AREA.right - BALL_RADIUS - 3, clickX));
      const clampedY = Math.max(PLAY_AREA.top + BALL_RADIUS + 3, Math.min(PLAY_AREA.bottom - BALL_RADIUS - 3, clickY));
      const pos = { x: clampedX, y: clampedY };
      dragCuePosRef.current = pos;
      setDragCuePos(pos);
      const val = physicsEngine.isValidCueBallPlacement(pos, balls);
      setPlacementValid(val.valid);
      return;
    }

    if (turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE') {
      isPointerInteracting.current = true;
      if (cueBall) {
        const dx = clickX - cueBall.position.x;
        const dy = clickY - cueBall.position.y;
        onAimAngleChange(Math.atan2(dy, dx));
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerInteracting.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;

    let pointerX = (e.clientX - rect.left) * scaleX;
    let pointerY = (e.clientY - rect.top) * scaleY;

    if (isZoomed && cueBall && !cueBall.isPocketed) {
      const zoom = 1.25;
      const targetX = Math.max(TABLE_WIDTH * 0.35, Math.min(TABLE_WIDTH * 0.65, cueBall.position.x));
      const targetY = Math.max(TABLE_HEIGHT * 0.35, Math.min(TABLE_HEIGHT * 0.65, cueBall.position.y));
      pointerX = (pointerX - TABLE_WIDTH / 2) / zoom + targetX;
      pointerY = (pointerY - TABLE_HEIGHT / 2) / zoom + targetY;
    }

    if (turnPhase === 'BALL_IN_HAND' && isDraggingBallInHandRef.current) {
      const clampedX = Math.max(PLAY_AREA.left + BALL_RADIUS + 3, Math.min(PLAY_AREA.right - BALL_RADIUS - 3, pointerX));
      const clampedY = Math.max(PLAY_AREA.top + BALL_RADIUS + 3, Math.min(PLAY_AREA.bottom - BALL_RADIUS - 3, pointerY));
      const pos = { x: clampedX, y: clampedY };
      dragCuePosRef.current = pos;
      setDragCuePos(pos);
      const val = physicsEngine.isValidCueBallPlacement(pos, balls);
      setPlacementValid(val.valid);
      return;
    }

    if (turnPhase !== 'AIMING' && turnPhase !== 'PULLING_CUE') return;
    if (!cueBall) return;

    const dx = pointerX - cueBall.position.x;
    const dy = pointerY - cueBall.position.y;
    const targetAngle = Math.atan2(dy, dx);

    if (dragSensitivity !== 1.0) {
      let diff = targetAngle - lastAimAngleRef.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const smoothed = lastAimAngleRef.current + diff * dragSensitivity;
      onAimAngleChange(smoothed);
    } else {
      onAimAngleChange(targetAngle);
    }
  };

  const handlePointerUp = () => {
    if (turnPhase === 'BALL_IN_HAND' && isDraggingBallInHandRef.current) {
      isDraggingBallInHandRef.current = false;
      isPointerInteracting.current = false;
      const pos = dragCuePosRef.current || dragCuePos;
      if (pos) {
        const val = physicsEngine.isValidCueBallPlacement(pos, balls);
        if (val.valid) {
          onPlaceBallInHand(pos);
          setDragCuePos(null);
          dragCuePosRef.current = null;
        } else {
          soundFX.playFoulSound();
        }
      }
      return;
    }
    isPointerInteracting.current = false;
  };

  return (
    <div className="relative w-full max-w-5xl max-h-full aspect-[980/530] mx-auto select-none touch-none rounded-2xl overflow-hidden shadow-2xl border-2 sm:border-4 border-amber-950/90 bg-[#060913]">
      <canvas
        ref={canvasRef}
        width={TABLE_WIDTH}
        height={TABLE_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Ball In Hand Helper & Confirmation Bar (Responsive, non-blocking) */}
      {turnPhase === 'BALL_IN_HAND' && !disabled && (
        <div className="absolute top-2 inset-x-0 mx-auto z-20 flex items-center justify-center gap-2 pointer-events-auto px-2">
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-xl border backdrop-blur-md transition-all ${
              placementValid
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/80 text-rose-200 animate-pulse'
            }`}
          >
            <span>{placementValid ? '🟢' : '🚫'}</span>
            <span>
              {placementValid
                ? (isRTL ? 'اسحب الكرة للمكان المطلوب ثم ارفع إصبعك' : 'Drag cue ball to desired spot, then release')
                : (isRTL ? 'تداخل مع كرة أخرى! اسحب لمكان فارغ' : 'Overlaps another ball! Move to open spot')}
            </span>
          </div>

          {placementValid && (
            <button
              onClick={() => {
                const pos = dragCuePosRef.current || dragCuePos || (cueBall ? cueBall.position : null);
                if (pos && physicsEngine.isValidCueBallPlacement(pos, balls).valid) {
                  onPlaceBallInHand(pos);
                  setDragCuePos(null);
                  dragCuePosRef.current = null;
                }
              }}
              className="px-3 py-1 sm:py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] sm:text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1"
            >
              <span>{isRTL ? 'تثبيت ✓' : 'Confirm ✓'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Canvas Drawing Helper Functions

function drawTargetBallHighlight(ctx: CanvasRenderingContext2D, pos: Vector2D) {
  const pulse = Math.sin(Date.now() / 200) * 3;
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, BALL_RADIUS + 7 + pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBalls(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  ballStyle: string,
  highContrast: boolean,
  rotations: Map<number, { rollDist: number; lastX: number; lastY: number; spinAngle: number }>
) {
  const isNeon = ballStyle === 'ball_style_neon';
  const isMatte = ballStyle === 'ball_style_matte';
  const isHC = highContrast || ballStyle === 'ball_style_high_contrast';

  for (const ball of balls) {
    if (ball.isPocketed) continue;

    const { x, y } = ball.position;
    const r = ball.radius;
    const rot = rotations.get(ball.number)?.spinAngle || 0;

    // 1. Drop Shadow (remains physically locked to overhead table lighting)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Ball Circle
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 2.5 Neon Rim Glow if Cyberpunk theme
    if (isNeon) {
      ctx.save();
      ctx.strokeStyle = ball.number === 0 ? '#38bdf8' : ball.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Dynamic Rolling Layer: Stripes, Numbers, and Measles Dots ROTATE according to speed and direction!
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // 3.1 Stripes Band
    if (ball.stripeColor) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = ball.stripeColor;
      ctx.fillRect(-r, -r * 0.45, r * 2, r * 0.9);

      // Distinct stripe pattern bars
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.45);
      ctx.lineTo(r, -r * 0.45);
      ctx.moveTo(-r, +r * 0.45);
      ctx.lineTo(r, +r * 0.45);
      ctx.stroke();

      ctx.restore();
    }

    // 3.2 Non-color reliant geometric indicators
    if (isHC) {
      ctx.strokeStyle = ball.number === 0 ? '#0284c7' : '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
      ctx.stroke();

      if (ball.number >= 1 && ball.number <= 7) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -r * 0.65, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (ball.number >= 9 && ball.number <= 15) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-3, -r * 0.65);
        ctx.lineTo(3, -r * 0.65);
        ctx.stroke();
      }
    }

    // 3.3 Cue Ball Aramith Measles 6-Dot Marker (spins and rolls with speed!)
    if (ball.number === 0) {
      const dotOffsets = [
        { dx: -r * 0.45, dy: -r * 0.45 },
        { dx: r * 0.45, dy: -r * 0.45 },
        { dx: -r * 0.45, dy: r * 0.45 },
        { dx: r * 0.45, dy: r * 0.45 },
        { dx: 0, dy: -r * 0.6 },
        { dx: 0, dy: r * 0.6 },
      ];
      ctx.fillStyle = '#ef4444'; // Red Aramith measles dots
      for (const d of dotOffsets) {
        ctx.beginPath();
        ctx.arc(d.dx, d.dy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3.4 Center Number Disc & Numerals (rotates with rolling motion!)
    if (ball.number !== 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, isHC ? r * 0.54 : r * 0.48, 0, Math.PI * 2);
      ctx.fill();

      if (isHC) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(r * (isHC ? 0.72 : 0.65))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.number.toString(), 0, 0.5);
    }

    ctx.restore(); // Restore unrotated context

    // 4. Gloss Shader (remains fixed at light source highlight for 3D realism)
    if (!isMatte) {
      const glossGrad = ctx.createRadialGradient(
        x - r * 0.35,
        y - r * 0.35,
        1,
        x - r * 0.15,
        y - r * 0.15,
        r * 0.85
      );
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.25)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life += 1;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);

    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Draws the clean crisp white aiming line and ghost ball reticle
 * with zero distracting banners on the table
 */
function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  cueBall: Ball,
  trajectory: TrajectoryPoint,
  _isRTL: boolean
) {
  const startX = cueBall.position.x;
  const startY = cueBall.position.y;

  if (trajectory.ghostBallPos) {
    const gx = trajectory.ghostBallPos.x;
    const gy = trajectory.ghostBallPos.y;

    // 1. Main aim guide line: Crisp solid white line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(gx, gy);
    ctx.stroke();

    // 2. Ghost ball outer ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(gx, gy, BALL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Ghost ball inner crosshair ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gx, gy, 4, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Target Ball predicted deflection line
    if (trajectory.targetBallDeflection) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(trajectory.targetBallDeflection.x, trajectory.targetBallDeflection.y);
      ctx.stroke();
    }

    // 4. Cue Ball tangent deflection line
    if (trajectory.cueBallDeflection) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(trajectory.cueBallDeflection.x, trajectory.cueBallDeflection.y);
      ctx.stroke();
    }
  }

  // Cushion bank bounce line
  if (trajectory.cushionBounces.length > 0 && trajectory.ghostBallPos) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(trajectory.ghostBallPos.x, trajectory.ghostBallPos.y);
    ctx.lineTo(trajectory.cushionBounces[0].x, trajectory.cushionBounces[0].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawBallInHandPlacement(
  ctx: CanvasRenderingContext2D,
  pos: Vector2D,
  isValid: boolean,
  allBalls: Ball[]
) {
  const pulse = Math.sin(Date.now() / 150) * 3;
  const radius = BALL_RADIUS + 7 + pulse;

  ctx.save();
  if (isValid) {
    // Glowing emerald green aura
    ctx.shadowColor = 'rgba(16, 185, 129, 0.85)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 4 alignment tick crosshairs
    const tickLen = 6;
    ctx.beginPath();
    ctx.moveTo(pos.x - radius - tickLen, pos.y);
    ctx.lineTo(pos.x - radius + 2, pos.y);
    ctx.moveTo(pos.x + radius - 2, pos.y);
    ctx.lineTo(pos.x + radius + tickLen, pos.y);
    ctx.moveTo(pos.x, pos.y - radius - tickLen);
    ctx.lineTo(pos.x, pos.y - radius + 2);
    ctx.moveTo(pos.x, pos.y + radius - 2);
    ctx.lineTo(pos.x, pos.y + radius + tickLen);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Vibrant ruby red warning ring
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Crossed diagonal line (prohibition symbol 🚫)
    ctx.beginPath();
    const d = radius * 0.7;
    ctx.moveTo(pos.x - d, pos.y - d);
    ctx.lineTo(pos.x + d, pos.y + d);
    ctx.stroke();

    // Highlight any colliding balls in red to show exactly where collision occurs
    for (const b of allBalls) {
      if (b.number === 0 || b.isPocketed) continue;
      const dx = b.position.x - pos.x;
      const dy = b.position.y - pos.y;
      const minDist = BALL_RADIUS * 2 + 1;
      if (dx * dx + dy * dy < minDist * minDist) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, BALL_RADIUS + 5 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function updateAndDrawBallTrails(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  trailsMap: Map<number, { x: number; y: number }[]>,
  trailStyle: string
) {
  let primaryColor = '56, 189, 248'; // neon blue
  let glowColor = 'rgba(56, 189, 248, 0.6)';

  if (trailStyle === 'trail_crimson_flame') {
    primaryColor = '239, 68, 68'; // red
    glowColor = 'rgba(239, 68, 68, 0.6)';
  } else if (trailStyle === 'trail_gold_spark') {
    primaryColor = '251, 191, 36'; // gold
    glowColor = 'rgba(251, 191, 36, 0.6)';
  }

  for (const ball of balls) {
    if (ball.isPocketed) {
      trailsMap.delete(ball.number);
      continue;
    }

    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    let pts = trailsMap.get(ball.number) || [];

    if (speed > 8) {
      pts.unshift({ x: ball.position.x, y: ball.position.y });
      if (pts.length > 7) pts.pop();
      trailsMap.set(ball.number, pts);
    } else {
      if (pts.length > 0) {
        pts.pop();
        if (pts.length === 0) trailsMap.delete(ball.number);
        else trailsMap.set(ball.number, pts);
      }
    }

    if (pts.length > 1) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      for (let i = 0; i < pts.length - 1; i++) {
        const alpha = (1 - (i / pts.length)) * 0.45;
        const width = (1 - (i / pts.length)) * (BALL_RADIUS * 0.9);
        ctx.strokeStyle = `rgba(${primaryColor}, ${alpha})`;
        ctx.lineWidth = Math.max(1.5, width);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
