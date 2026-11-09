/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Vector2D = {
  x: number;
  y: number;
};

export type BallType = 'cue' | 'solid' | 'stripe' | 'eight' | 'nine';

export interface Ball {
  id: number;
  number: number;
  type: BallType;
  color: string;
  stripeColor?: string;
  position: Vector2D;
  velocity: Vector2D;
  spin: Vector2D; // x: sidespin/english, y: topspin/backspin
  radius: number;
  isPocketed: boolean;
  pocketedOrder?: number;
  visible: boolean;
  mass: number;
}

export interface Pocket {
  id: number;
  name: string;
  position: Vector2D;
  radius: number;
  dropRadius: number;
}

export interface CushionSegment {
  id: string;
  start: Vector2D;
  end: Vector2D;
  normal: Vector2D;
}

export type GameMode = '8ball' | '9ball' | 'practice' | 'challenge';

export type TableViewMode = '2d' | '3d';

export type RuleVariant = 'wpa_official' | 'house_rules';

export type PracticeRackType = '8ball_rack' | '9ball_diamond' | 'trick_shot_1' | 'trick_shot_2' | 'line_drill';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'master';

export type GameStateScreen =
  | 'TITLE'
  | 'MODE_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'TOURNAMENT'
  | 'CUE_SHOP'
  | 'LAN_LOBBY'
  | 'RULES'
  | 'DEV_TESTS'
  | 'PROFILE'
  | 'CHALLENGES'
  | 'SETTINGS'
  | 'DAILY_SPIN';

export interface BallStyleTheme {
  id: string;
  name: string;
  nameAr: string;
  badgeStyle: 'classic' | 'high_contrast' | 'neon' | 'matte';
  price: number;
  isUnlocked: boolean;
  description: string;
  descriptionAr: string;
}

export type TurnPhase =
  | 'AIMING'
  | 'BALL_IN_HAND'
  | 'PULLING_CUE'
  | 'SIMULATING'
  | 'EVALUATING'
  | 'AI_THINKING';

export type PlayerGroup = 'solids' | 'stripes' | 'undetermined';

export interface Player {
  id: string;
  name: string;
  nameAr?: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  group: PlayerGroup;
  score: number;
  avatarSeed: string;
  cueId: string;
}

export interface ShotReport {
  cueBallHitFirst: number | null; // id of first ball struck by cue ball
  ballsPocketedThisShot: number[]; // ball numbers
  cushionHitAfterFirstContact: boolean;
  cueBallPocketed: boolean;
  anyBallLeftTable: boolean;
}

export interface RuleEvaluationResult {
  isFoul: boolean;
  foulReason?: string;
  foulReasonAr?: string;
  isGameOver: boolean;
  winnerPlayerId: string | null;
  winReason?: string;
  winReasonAr?: string;
  nextPlayerId: string;
  awardBallInHand: boolean;
  message: string;
  messageAr: string;
  assignedGroupPlayer1?: PlayerGroup;
  assignedGroupPlayer2?: PlayerGroup;
}

export interface CueItem {
  id: string;
  name: string;
  nameAr: string;
  customPlayerName?: string;
  power: number; // 0.8 to 1.3
  aimGuideLength: number; // 300 to 700
  spinControl: number; // 0.5 to 1.2
  price: number;
  isUnlocked: boolean;
  colorScheme: {
    tip: string;
    shaft: string;
    wrap: string;
    butt: string;
    glow: string;
  };
}

export interface TableFeltTheme {
  id: string;
  name: string;
  nameAr: string;
  feltColor: string;
  railColor: string;
  woodColor: string;
  cushionGlow: string;
  price: number;
  isUnlocked: boolean;
}

export interface TournamentMatch {
  id: string;
  round: number; // 1 = QF, 2 = SF, 3 = Finals
  player1: Player;
  player2: Player;
  winner: Player | null;
  isCompleted: boolean;
  score: string;
}

export interface TrajectoryPoint {
  ghostBallPos: Vector2D | null;
  targetBallDeflection: Vector2D | null;
  cueBallDeflection: Vector2D | null;
  cushionBounces: Vector2D[];
  hitBallId: number | null;
  isObstructedSecondary: boolean;
  confidenceNote?: string;
  confidenceNoteAr?: string;
}

export interface BallSnapshot {
  balls: Ball[];
  activePlayerIndex: number;
  isOpenTable: boolean;
}

export type Language = 'en' | 'ar';
