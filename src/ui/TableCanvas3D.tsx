/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { Ball, CueItem, GameMode, TableFeltTheme, TrajectoryPoint, TurnPhase, Vector2D } from '../types/game';
import { BALL_RADIUS, POCKETS, TABLE_HEIGHT, TABLE_WIDTH, PLAY_AREA, physicsEngine } from '../physics/engine';
import { TrajectoryCalculator } from '../physics/trajectory';
import { soundFX } from '../audio/soundFX';
import {
  drawTribalTableRails,
  drawTribalTableFelt,
  drawTribalCushions,
  drawTribalPockets,
} from './tableArtwork';

interface TableCanvas3DProps {
  balls: Ball[];
  aimAngle: number;
  cuePower: number;
  cueItem: CueItem;
  feltTheme: TableFeltTheme;
  ballStyle?: string;
  highContrastMode?: boolean;
  reducedMotion?: boolean;
  dragSensitivity?: number;
  turnPhase: TurnPhase;
  gameMode: GameMode;
  disabled?: boolean;
  controlMode?: 'aim' | 'orbit';
  cameraPreset3D?: 'angled' | 'top_perspective' | 'cue_behind';
  onAimAngleChange: (angle: number) => void;
  onPlaceBallInHand: (pos: Vector2D) => void;
  onFallback2D: () => void;
  language: 'en' | 'ar';
}

const SCALE = 0.01; // 1 unit in Three.js = 100 2D logical pixels
const WORLD_CENTER_X = TABLE_WIDTH / 2; // 490
const WORLD_CENTER_Y = TABLE_HEIGHT / 2; // 265

function to3DCoord(x2d: number, y2d: number): { x: number; z: number } {
  return {
    x: (x2d - WORLD_CENTER_X) * SCALE,
    z: (y2d - WORLD_CENTER_Y) * SCALE,
  };
}

function to2DCoord(x3d: number, z3d: number): { x: number; y: number } {
  return {
    x: x3d / SCALE + WORLD_CENTER_X,
    y: z3d / SCALE + WORLD_CENTER_Y,
  };
}

export const TableCanvas3D: React.FC<TableCanvas3DProps> = ({
  balls,
  aimAngle,
  cuePower,
  cueItem,
  feltTheme,
  ballStyle = 'ball_style_classic',
  highContrastMode = false,
  dragSensitivity = 1.0,
  turnPhase,
  gameMode,
  disabled = false,
  controlMode = 'aim',
  cameraPreset3D = 'angled',
  onAimAngleChange,
  onPlaceBallInHand,
  onFallback2D,
  language,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isRTL = language === 'ar';

  // Camera spherical coordinates
  const cameraStateRef = useRef({
    radius: 7.2,
    theta: 0,
    phi: Math.PI / 3.4,
    target: new THREE.Vector3(0, 0, 0),
  });

  const pointerDownRef = useRef(false);
  const isDraggingBallInHandRef = useRef(false);
  const [dragCuePos, setDragCuePos] = useState<Vector2D | null>(null);
  const [placementValid, setPlacementValid] = useState<boolean>(true);
  const dragCuePosRef = useRef<Vector2D | null>(null);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const lastAimAngleRef = useRef(aimAngle);
  lastAimAngleRef.current = aimAngle;
  const lastBallPositionsRef = useRef<Map<number, { x: number; z: number }>>(new Map());

  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    tablePlane: THREE.Plane;
    raycaster: THREE.Raycaster;
    ballMeshes: Map<number, THREE.Mesh>;
    shadowMeshes: Map<number, THREE.Mesh>;
    cueGroup: THREE.Group;
    trajectoryGroup: THREE.Group;
    targetHighlightMesh: THREE.Mesh;
    tableMeshGroup: THREE.Group;
  } | null>(null);

  const cueBall = balls.find(b => b.number === 0);

  const lowest9Ball = gameMode === '9ball'
    ? balls.filter(b => !b.isPocketed && b.number >= 1 && b.number <= 9).sort((a, b) => a.number - b.number)[0]
    : null;

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const width = container.clientWidth || 980;
      const height = container.clientHeight || 530;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x060913);
      scene.fog = new THREE.Fog(0x060913, 10, 26);

      const baseFov = 42;
      const initialAspect = width / height;
      const initialFov = initialAspect < 1.0
        ? 2 * Math.atan(Math.tan((baseFov * Math.PI / 180) / 2) / initialAspect) * (180 / Math.PI)
        : baseFov;
      const camera = new THREE.PerspectiveCamera(initialFov, initialAspect, 0.1, 50);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      container.appendChild(renderer.domElement);

      // Studio Balanced Lighting (Warm ambient & spotlight, authentic colors with zero blowout)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
      scene.add(ambientLight);

      const canopyLight = new THREE.DirectionalLight(0xfff8ed, 1.15);
      canopyLight.position.set(0, 6.5, 0);
      scene.add(canopyLight);

      const frontFill = new THREE.DirectionalLight(0xe0f2fe, 0.35);
      frontFill.position.set(0, 4.0, 3.5);
      scene.add(frontFill);

      const backFill = new THREE.DirectionalLight(0xfef3c7, 0.30);
      backFill.position.set(0, 4.0, -3.5);
      scene.add(backFill);

      // 1. Build 3D Tribal Table matching 2D table EXACTLY in shape, pockets/openings, and colors
      const tableMeshGroup = new THREE.Group();
      scene.add(tableMeshGroup);

      const tableOuterWidth = TABLE_WIDTH * SCALE; // 9.80
      const tableOuterDepth = TABLE_HEIGHT * SCALE; // 5.30

      // High-Definition Master Canvas: 2048 x 1108 (matching 980 x 530 aspect ratio)
      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = 2048;
      masterCanvas.height = 1108;
      const mCtx = masterCanvas.getContext('2d')!;
      mCtx.save();
      mCtx.scale(2048 / TABLE_WIDTH, 1108 / TABLE_HEIGHT);

      // Layer 1: Honey-caramel wooden rails with chevrons, 12 dot mandalas, 2 geckos, diamond sights, bronze castings with gold screws
      drawTribalTableRails(mCtx);

      // Layer 2: Custom table felt with radiant radial gradient, baulk line at 28%, head spot, and foot spot
      drawTribalTableFelt(mCtx, feltTheme);

      // Layer 3: Cushions with angled pocket cuts
      drawTribalCushions(mCtx, feltTheme);

      // Layer 4: 6 Drop pocket holes with black drop gradient
      drawTribalPockets(mCtx);

      mCtx.restore();

      const tableMasterTexture = new THREE.CanvasTexture(masterCanvas);
      tableMasterTexture.colorSpace = THREE.SRGBColorSpace;
      tableMasterTexture.anisotropy = 8;

      // A. Solid Sub-Bed Apron & Skirt (Honey caramel wood frame, top at y = 0)
      const bedThickness = 0.36;
      const bedMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#381b0a'),
        roughness: 0.55,
        metalness: 0.1,
      });
      const bedMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tableOuterWidth, bedThickness, tableOuterDepth),
        bedMaterial
      );
      bedMesh.position.y = -bedThickness / 2;
      tableMeshGroup.add(bedMesh);

      // B. Master Table Surface (Pixel-perfect 1:1 match with 2D table artwork)
      const tableSurfaceGeo = new THREE.PlaneGeometry(tableOuterWidth, tableOuterDepth);
      tableSurfaceGeo.rotateX(-Math.PI / 2);
      const tableSurfaceMat = new THREE.MeshStandardMaterial({
        map: tableMasterTexture,
        roughness: 0.65,
        metalness: 0.08,
      });
      const tableSurfaceMesh = new THREE.Mesh(tableSurfaceGeo, tableSurfaceMat);
      tableSurfaceMesh.position.y = 0.001;
      tableMeshGroup.add(tableSurfaceMesh);

      // C. Drop Pockets (Deep Leather Cavities & Polished Metallic Rims)
      const cupMat = new THREE.MeshStandardMaterial({
        color: 0x050711,
        roughness: 0.9,
        metalness: 0.1,
      });
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.85,
        roughness: 0.25,
      });

      for (const pocket of POCKETS) {
        const p3d = to3DCoord(pocket.position.x, pocket.position.y);
        const pRadius = pocket.radius * SCALE;

        // Solid Leather Drop Pocket Cup going down into table
        const cupGeo = new THREE.CylinderGeometry(pRadius * 0.92, pRadius * 0.80, 0.28, 24);
        const cupMesh = new THREE.Mesh(cupGeo, cupMat);
        cupMesh.position.set(p3d.x, -0.12, p3d.z);
        tableMeshGroup.add(cupMesh);

        // Sleek Graphite/Bronze Rim Collar flush with the pocket mouth
        const rimGeo = new THREE.TorusGeometry(pRadius * 0.94, 0.016, 12, 32);
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.set(p3d.x, 0.012, p3d.z);
        tableMeshGroup.add(rimMesh);
      }

      // E. Four Tapered Wooden Table Legs with Brass Levelers
      const legMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#45200b'),
        roughness: 0.5,
        metalness: 0.1,
      });
      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.85,
        roughness: 0.2,
      });
      const legPositions = [
        { x: -tableOuterWidth / 2 + 0.45, z: -tableOuterDepth / 2 + 0.45 },
        { x: tableOuterWidth / 2 - 0.45, z: -tableOuterDepth / 2 + 0.45 },
        { x: -tableOuterWidth / 2 + 0.45, z: tableOuterDepth / 2 - 0.45 },
        { x: tableOuterWidth / 2 - 0.45, z: tableOuterDepth / 2 - 0.45 },
      ];
      for (const lp of legPositions) {
        const legMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.11, 1.4, 16),
          legMat
        );
        legMesh.position.set(lp.x, -0.85, lp.z);
        tableMeshGroup.add(legMesh);

        const brassFoot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, 0.1, 16),
          brassMat
        );
        brassFoot.position.set(lp.x, -1.5, lp.z);
        tableMeshGroup.add(brassFoot);
      }

      // F. Overhead Chrome Wire Ball Return Track
      const chromeMaterial = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.95,
        roughness: 0.12,
      });
      const railLen = 4.4;
      const trackRailGeo = new THREE.CylinderGeometry(0.015, 0.015, railLen, 16);
      trackRailGeo.rotateZ(Math.PI / 2);

      const wire1 = new THREE.Mesh(trackRailGeo, chromeMaterial);
      wire1.position.set(0, 0.28, -tableOuterDepth / 2 + 0.45);
      tableMeshGroup.add(wire1);

      const wire2 = new THREE.Mesh(trackRailGeo, chromeMaterial);
      wire2.position.set(0, 0.22, -tableOuterDepth / 2 + 0.45);
      tableMeshGroup.add(wire2);

      // 2. Cue Stick 3D Group (Fixed Geometry: Origin (0,0,0) is EXACTLY at Tip, Butt along +Z backwards)
      const cueGroup = new THREE.Group();
      const cueLength = 2.8;
      // Cylinder: radiusTop is Tip (0.012), radiusBottom is Butt (0.034)
      const cueGeo = new THREE.CylinderGeometry(0.012, 0.034, cueLength, 16);
      // Rotate geometry around X so Top is at local z = -cueLength/2 and Bottom is at +cueLength/2:
      cueGeo.rotateX(-Math.PI / 2);
      // Translate along Z so TIP is at local z = 0, and BUTT is at local z = +cueLength (extending backwards):
      cueGeo.translate(0, 0, cueLength / 2);

      // Procedural Cue Texture: Shaft, joint collar, custom wrap, leather tip
      const cueCanvas = document.createElement('canvas');
      cueCanvas.width = 512;
      cueCanvas.height = 64;
      const cCtx = cueCanvas.getContext('2d')!;
      const colors = cueItem?.colorScheme || {
        tip: '#38bdf8',
        shaft: '#f59e0b',
        wrap: '#78350f',
        butt: '#451a03',
        glow: 'rgba(56, 189, 248, 0.6)',
      };
      cCtx.fillStyle = '#fef08a'; // Maple near tip
      cCtx.fillRect(0, 0, 512, 64);
      cCtx.fillStyle = colors.shaft;
      cCtx.fillRect(140, 0, 210, 64);
      cCtx.fillStyle = colors.wrap;
      cCtx.fillRect(350, 0, 150, 64);
      for (let x = 360; x < 500; x += 14) {
        cCtx.fillStyle = (x / 14) % 2 === 0 ? colors.tip : '#1c1917';
        cCtx.fillRect(x, 0, 8, 64);
      }
      cCtx.fillStyle = '#fbbf24'; // Brass joint
      cCtx.fillRect(340, 0, 10, 64);
      cCtx.fillStyle = colors.tip; // Tip
      cCtx.fillRect(0, 0, 16, 64);

      const cueTexture = new THREE.CanvasTexture(cueCanvas);
      const cueMat = new THREE.MeshStandardMaterial({
        map: cueTexture,
        roughness: 0.3,
        metalness: 0.15,
      });

      const cueMesh = new THREE.Mesh(cueGeo, cueMat);
      // Subtle 3.5-degree upward tilt on butt
      cueMesh.rotation.x = THREE.MathUtils.degToRad(3.5);
      cueGroup.add(cueMesh);
      scene.add(cueGroup);

      // 3. Trajectory Lines 3D Group
      const trajectoryGroup = new THREE.Group();
      scene.add(trajectoryGroup);

      // 4. Target 9-Ball Highlight Ring
      const targetHighlightRing = new THREE.Mesh(
        new THREE.RingGeometry(BALL_RADIUS * SCALE * 1.3, BALL_RADIUS * SCALE * 1.6, 32),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
      );
      targetHighlightRing.rotation.x = -Math.PI / 2;
      targetHighlightRing.position.y = 0.005;
      targetHighlightRing.visible = false;
      scene.add(targetHighlightRing);

      const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const raycaster = new THREE.Raycaster();

      threeRef.current = {
        scene,
        camera,
        renderer,
        tablePlane,
        raycaster,
        ballMeshes: new Map(),
        shadowMeshes: new Map(),
        cueGroup,
        trajectoryGroup,
        targetHighlightMesh: targetHighlightRing,
        tableMeshGroup,
      };

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          if (w > 0 && h > 0) {
            camera.aspect = w / h;
            const bFov = 42;
            if (camera.aspect < 1.0) {
              camera.fov = 2 * Math.atan(Math.tan((bFov * Math.PI / 180) / 2) / camera.aspect) * (180 / Math.PI);
            } else {
              camera.fov = bFov;
            }
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          }
        }
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      console.warn('Three.js 3D initialization failed, falling back to 2D view:', err);
      onFallback2D();
    }
  }, [onFallback2D, feltTheme.id, cueItem.id]);

  // Procedural ball texture generator
  const createBallTexture = useCallback((ball: Ball): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Base color
    ctx.fillStyle = ball.color;
    ctx.fillRect(0, 0, 256, 128);

    // Stripe band
    if (ball.stripeColor) {
      ctx.fillStyle = ball.stripeColor;
      ctx.fillRect(0, 34, 256, 60);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 34, 256, 60);
    }

    // Cue ball Aramith measles dots
    if (ball.number === 0) {
      ctx.fillStyle = '#dc2626';
      const dots = [
        { x: 64, y: 32 },
        { x: 192, y: 32 },
        { x: 64, y: 96 },
        { x: 192, y: 96 },
        { x: 128, y: 64 },
      ];
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const centers = [64, 192];
      for (const cx of centers) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, 64, 22, 0, Math.PI * 2);
        ctx.fill();

        if (highContrastMode) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), cx, 65);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [highContrastMode]);

  // Synchronize 3D Ball Meshes with Physics Engine
  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    const { scene, ballMeshes, shadowMeshes } = three;

    const ballRadius3D = BALL_RADIUS * SCALE;
    const sphereGeo = new THREE.SphereGeometry(ballRadius3D, 28, 20);

    const sCanvas = document.createElement('canvas');
    sCanvas.width = 64;
    sCanvas.height = 64;
    const sCtx = sCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.32)');
    grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
    const dropShadowTexture = new THREE.CanvasTexture(sCanvas);

    const shadowGeo = new THREE.PlaneGeometry(ballRadius3D * 2.3, ballRadius3D * 2.3);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: dropShadowTexture,
      transparent: true,
      depthWrite: false,
    });

    for (const ball of balls) {
      const p3d = to3DCoord(ball.position.x, ball.position.y);
      let mesh = ballMeshes.get(ball.number);
      let shadow = shadowMeshes.get(ball.number);

      if (!mesh) {
        const texture = createBallTexture(ball);
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: ballStyle === 'ball_style_matte' ? 0.75 : 0.18,
          metalness: 0.05,
        });
        mesh = new THREE.Mesh(sphereGeo, mat);
        scene.add(mesh);
        ballMeshes.set(ball.number, mesh);

        shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.002;
        scene.add(shadow);
        shadowMeshes.set(ball.number, shadow);
      }

      if (ball.isPocketed) {
        mesh.visible = false;
        if (shadow) shadow.visible = false;
      } else {
        mesh.visible = true;
        mesh.position.set(p3d.x, ballRadius3D, p3d.z);

        // Physically accurate continuous 3D sphere rolling (Zero snapping or jitter!)
        const last = lastBallPositionsRef.current.get(ball.number);
        if (last) {
          const dx = p3d.x - last.x;
          const dz = p3d.z - last.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.0002) {
            // Axis of rolling is perpendicular to direction of motion in X-Z:
            // Direction: (dx, 0, dz) -> Perpendicular roll axis: (-dz, 0, dx)
            const rollAxis = new THREE.Vector3(-dz / dist, 0, dx / dist);
            const dTheta = dist / ballRadius3D;
            mesh.rotateOnWorldAxis(rollAxis, dTheta);
          }
        }
        lastBallPositionsRef.current.set(ball.number, { x: p3d.x, z: p3d.z });

        if (shadow) {
          shadow.visible = true;
          shadow.position.set(p3d.x, 0.002, p3d.z);
        }
      }
    }
  }, [balls, ballStyle, createBallTexture]);

  // Compute Live Trajectory in 3D
  const trajectory: TrajectoryPoint | null =
    cueBall && !cueBall.isPocketed && (turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE')
      ? TrajectoryCalculator.calculate(cueBall, balls, aimAngle, cueItem.aimGuideLength)
      : null;

  // Render 3D Cue Stick (Points directly at ball, ZERO clipping!) & Trajectory Lines
  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    const { cueGroup, trajectoryGroup, targetHighlightMesh } = three;

    if (lowest9Ball && !lowest9Ball.isPocketed) {
      const p = to3DCoord(lowest9Ball.position.x, lowest9Ball.position.y);
      targetHighlightMesh.visible = true;
      targetHighlightMesh.position.set(p.x, 0.005, p.z);
    } else {
      targetHighlightMesh.visible = false;
    }

    if (!disabled && cueBall && !cueBall.isPocketed && (turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE')) {
      cueGroup.visible = true;
      const c3d = to3DCoord(cueBall.position.x, cueBall.position.y);
      const ballRadius3D = BALL_RADIUS * SCALE; // 0.12

      // Aim direction vector in X-Z
      const dirX = Math.cos(aimAngle);
      const dirZ = Math.sin(aimAngle);

      // Safe clearance outside ball: ball radius + 0.06 units safe gap + pull back power
      const minClearance = ballRadius3D + 0.06;
      const pullBack = minClearance + cuePower * 0.95;

      // Position the cue TIP at distance pullBack behind the cue ball
      const tipX = c3d.x - dirX * pullBack;
      const tipZ = c3d.z - dirZ * pullBack;
      const tipY = ballRadius3D * 1.05;

      cueGroup.position.set(tipX, tipY, tipZ);

      // Point cue stick: Butt is at local +Z, so cueGroup looks AWAY from ball towards (-dirX, -dirZ)
      cueGroup.lookAt(tipX - dirX, tipY, tipZ - dirZ);
    } else {
      cueGroup.visible = false;
    }

    while (trajectoryGroup.children.length > 0) {
      const obj = trajectoryGroup.children[0];
      trajectoryGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    if (!disabled && trajectory && cueBall && !cueBall.isPocketed && (turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE') && trajectory.ghostBallPos) {
      const start3D = to3DCoord(cueBall.position.x, cueBall.position.y);
      const ghost3D = to3DCoord(trajectory.ghostBallPos.x, trajectory.ghostBallPos.y);

      // Clean White Aim Line
      const aimPoints = [new THREE.Vector3(start3D.x, 0.006, start3D.z), new THREE.Vector3(ghost3D.x, 0.006, ghost3D.z)];
      const aimLineGeo = new THREE.BufferGeometry().setFromPoints(aimPoints);
      const aimLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const aimLine = new THREE.Line(aimLineGeo, aimLineMat);
      trajectoryGroup.add(aimLine);

      // Ghost Ball White Target Ring
      const ghostRing = new THREE.Mesh(
        new THREE.RingGeometry(BALL_RADIUS * SCALE * 0.9, BALL_RADIUS * SCALE * 1.05, 28),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      ghostRing.rotation.x = -Math.PI / 2;
      ghostRing.position.set(ghost3D.x, 0.007, ghost3D.z);
      trajectoryGroup.add(ghostRing);

      const centerReticle = new THREE.Mesh(
        new THREE.RingGeometry(BALL_RADIUS * SCALE * 0.2, BALL_RADIUS * SCALE * 0.35, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      centerReticle.rotation.x = -Math.PI / 2;
      centerReticle.position.set(ghost3D.x, 0.007, ghost3D.z);
      trajectoryGroup.add(centerReticle);

      // Target Ball Deflection Vector
      if (trajectory.targetBallDeflection) {
        const targetDef3D = to3DCoord(trajectory.targetBallDeflection.x, trajectory.targetBallDeflection.y);
        const targetPoints = [new THREE.Vector3(ghost3D.x, 0.006, ghost3D.z), new THREE.Vector3(targetDef3D.x, 0.006, targetDef3D.z)];
        const targetLineGeo = new THREE.BufferGeometry().setFromPoints(targetPoints);
        const targetLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const targetLine = new THREE.Line(targetLineGeo, targetLineMat);
        trajectoryGroup.add(targetLine);
      }

      // Cue Ball Tangent Deflection Vector
      if (trajectory.cueBallDeflection) {
        const cueDef3D = to3DCoord(trajectory.cueBallDeflection.x, trajectory.cueBallDeflection.y);
        const cuePoints = [new THREE.Vector3(ghost3D.x, 0.006, ghost3D.z), new THREE.Vector3(cueDef3D.x, 0.006, cueDef3D.z)];
        const cueLineGeo = new THREE.BufferGeometry().setFromPoints(cuePoints);
        const cueLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
        const cueLine = new THREE.Line(cueLineGeo, cueLineMat);
        trajectoryGroup.add(cueLine);
      }
    }
  }, [trajectory, cueBall, aimAngle, cuePower, cueItem, turnPhase, disabled, lowest9Ball]);

  // Main 60fps Three.js Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const three = threeRef.current;
      if (!three) return;
      const { scene, camera, renderer } = three;
      const state = cameraStateRef.current;

      if (controlMode !== 'orbit') {
        if (cameraPreset3D === 'cue_behind' && cueBall && !cueBall.isPocketed) {
          const cb3d = to3DCoord(cueBall.position.x, cueBall.position.y);
          const fwdX = cb3d.x + Math.cos(aimAngle) * 2.4;
          const fwdZ = cb3d.z + Math.sin(aimAngle) * 2.4;
          state.target.lerp(new THREE.Vector3(fwdX, 0.05, fwdZ), 0.12);

          const backX = cb3d.x - Math.cos(aimAngle) * 3.2;
          const backZ = cb3d.z - Math.sin(aimAngle) * 3.2;
          const eyeY = 1.35;
          camera.position.lerp(new THREE.Vector3(backX, eyeY, backZ), 0.12);
          camera.lookAt(state.target);
          renderer.render(scene, camera);
          animId = requestAnimationFrame(render);
          return;
        } else if (cameraPreset3D === 'top_perspective') {
          state.phi = THREE.MathUtils.lerp(state.phi, 0.16, 0.08);
          state.radius = THREE.MathUtils.lerp(state.radius, 7.8, 0.08);
          state.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        } else {
          // 'angled'
          state.phi = THREE.MathUtils.lerp(state.phi, Math.PI / 3.4, 0.08);
          state.radius = THREE.MathUtils.lerp(state.radius, 7.2, 0.08);
          state.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        }
      }

      const cx = state.target.x + state.radius * Math.sin(state.phi) * Math.sin(state.theta);
      const cy = state.target.y + state.radius * Math.cos(state.phi);
      const cz = state.target.z + state.radius * Math.sin(state.phi) * Math.cos(state.theta);

      camera.position.set(cx, cy, cz);
      camera.lookAt(state.target);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [cueBall, aimAngle, controlMode, cameraPreset3D]);

  // Pointer event handlers for Aiming or Camera Orbit
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    pointerDownRef.current = true;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (controlMode === 'orbit') return;

    const three = threeRef.current;
    if (!three) return;
    const { camera, tablePlane, raycaster } = three;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(tablePlane, hitPoint)) {
      const p2d = to2DCoord(hitPoint.x, hitPoint.z);

      if (turnPhase === 'BALL_IN_HAND') {
        isDraggingBallInHandRef.current = true;
        const clampedX = Math.max(PLAY_AREA.left + BALL_RADIUS + 3, Math.min(PLAY_AREA.right - BALL_RADIUS - 3, p2d.x));
        const clampedY = Math.max(PLAY_AREA.top + BALL_RADIUS + 3, Math.min(PLAY_AREA.bottom - BALL_RADIUS - 3, p2d.y));
        const pos = { x: clampedX, y: clampedY };
        dragCuePosRef.current = pos;
        setDragCuePos(pos);
        const val = physicsEngine.isValidCueBallPlacement(pos, balls);
        setPlacementValid(val.valid);

        // Update 3D cue ball mesh position dynamically
        const cueMesh = three.ballMeshes.get(0);
        const shadowMesh = three.shadowMeshes.get(0);
        const c3d = to3DCoord(pos.x, pos.y);
        if (cueMesh) {
          cueMesh.visible = true;
          cueMesh.position.set(c3d.x, BALL_RADIUS * SCALE, c3d.z);
        }
        if (shadowMesh) {
          shadowMesh.visible = true;
          shadowMesh.position.set(c3d.x, 0.002, c3d.z);
        }
        return;
      }

      if ((turnPhase === 'AIMING' || turnPhase === 'PULLING_CUE') && cueBall) {
        const dx = p2d.x - cueBall.position.x;
        const dy = p2d.y - cueBall.position.y;
        onAimAngleChange(Math.atan2(dy, dx));
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return;

    if (controlMode === 'orbit') {
      const deltaX = e.clientX - pointerStartPosRef.current.x;
      const deltaY = e.clientY - pointerStartPosRef.current.y;
      pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

      const state = cameraStateRef.current;
      state.theta -= deltaX * 0.008;
      state.phi = Math.max(0.18, Math.min(Math.PI / 2.15, state.phi - deltaY * 0.008));
      return;
    }

    const three = threeRef.current;
    if (!three) return;
    const { camera, tablePlane, raycaster } = three;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(tablePlane, hitPoint)) {
      const p2d = to2DCoord(hitPoint.x, hitPoint.z);

      if (turnPhase === 'BALL_IN_HAND' && isDraggingBallInHandRef.current) {
        const clampedX = Math.max(PLAY_AREA.left + BALL_RADIUS + 3, Math.min(PLAY_AREA.right - BALL_RADIUS - 3, p2d.x));
        const clampedY = Math.max(PLAY_AREA.top + BALL_RADIUS + 3, Math.min(PLAY_AREA.bottom - BALL_RADIUS - 3, p2d.y));
        const pos = { x: clampedX, y: clampedY };
        dragCuePosRef.current = pos;
        setDragCuePos(pos);
        const val = physicsEngine.isValidCueBallPlacement(pos, balls);
        setPlacementValid(val.valid);

        // Update 3D cue ball mesh position dynamically
        const cueMesh = three.ballMeshes.get(0);
        const shadowMesh = three.shadowMeshes.get(0);
        const c3d = to3DCoord(pos.x, pos.y);
        if (cueMesh) {
          cueMesh.visible = true;
          cueMesh.position.set(c3d.x, BALL_RADIUS * SCALE, c3d.z);
        }
        if (shadowMesh) {
          shadowMesh.visible = true;
          shadowMesh.position.set(c3d.x, 0.002, c3d.z);
        }
        return;
      }

      if (turnPhase !== 'AIMING' && turnPhase !== 'PULLING_CUE') return;
      if (!cueBall) return;

      const dx = p2d.x - cueBall.position.x;
      const dy = p2d.y - cueBall.position.y;
      const targetAngle = Math.atan2(dy, dx);

      if (dragSensitivity !== 1.0) {
        let diff = targetAngle - lastAimAngleRef.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        onAimAngleChange(lastAimAngleRef.current + diff * dragSensitivity);
      } else {
        onAimAngleChange(targetAngle);
      }
    }
  };

  const handlePointerUp = () => {
    pointerDownRef.current = false;
    if (turnPhase === 'BALL_IN_HAND' && isDraggingBallInHandRef.current) {
      isDraggingBallInHandRef.current = false;
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
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative w-full h-full flex-1 min-h-0 select-none touch-none overflow-hidden flex items-center justify-center bg-[#060913]"
    >
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full block ${controlMode === 'orbit' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
      />

      {/* Ball In Hand Helper & Confirmation Bar in 3D */}
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
