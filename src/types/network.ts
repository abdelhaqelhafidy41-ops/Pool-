/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, GameMode, Player, RuleVariant, Vector2D } from './game';

export type LocalLobbyState =
  | 'IDLE'
  | 'SEARCHING'
  | 'ROOM_CREATED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'MATCH_FINISHED';

export type MatchRounds = 1 | 3 | 5;

export interface DiscoveredRoom {
  roomCode: string;
  hostName: string;
  hostAvatar: string;
  mode: GameMode;
  ruleVariant: RuleVariant;
  rounds: MatchRounds;
  lastSeenTimestamp: number;
}

// Network Packets (Host-Authoritative Model)
export type PacketType =
  | 'BEACON'
  | 'JOIN_REQUEST'
  | 'JOIN_ACCEPT'
  | 'JOIN_REJECT'
  | 'MATCH_START'
  | 'SHOT_INTENT'
  | 'SHOT_EXECUTED'
  | 'BALL_PLACEMENT'
  | 'TURN_RESULT'
  | 'FRAME_WIN'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'LEAVE_ROOM';

export interface BasePacket {
  type: PacketType;
  roomCode: string;
  senderId: string;
  sequence: number;
  timestamp: number;
}

export interface BeaconPacket extends BasePacket {
  type: 'BEACON';
  hostName: string;
  hostAvatar: string;
  mode: GameMode;
  ruleVariant: RuleVariant;
  rounds: MatchRounds;
}

export interface JoinRequestPacket extends BasePacket {
  type: 'JOIN_REQUEST';
  playerName: string;
  playerAvatar: string;
}

export interface JoinAcceptPacket extends BasePacket {
  type: 'JOIN_ACCEPT';
  hostName: string;
  mode: GameMode;
  ruleVariant: RuleVariant;
  rounds: MatchRounds;
}

export interface JoinRejectPacket extends BasePacket {
  type: 'JOIN_REJECT';
  reason: string;
  reasonAr: string;
}

export interface MatchStartPacket extends BasePacket {
  type: 'MATCH_START';
  initialBalls: Ball[];
  mode: GameMode;
  ruleVariant: RuleVariant;
  rounds: MatchRounds;
  player1: Player;
  player2: Player;
}

export interface ShotIntentPacket extends BasePacket {
  type: 'SHOT_INTENT';
  angle: number;
  power: number;
  spin: Vector2D;
}

export interface ShotExecutedPacket extends BasePacket {
  type: 'SHOT_EXECUTED';
  angle: number;
  power: number;
  spin: Vector2D;
  cueBallPosition: Vector2D;
}

export interface BallPlacementPacket extends BasePacket {
  type: 'BALL_PLACEMENT';
  position: Vector2D;
}

export interface TurnResultPacket extends BasePacket {
  type: 'TURN_RESULT';
  nextPlayerId: string;
  awardBallInHand: boolean;
  message: string;
  messageAr: string;
  balls: Ball[];
  p1Score: number;
  p2Score: number;
  isGameOver: boolean;
  winnerPlayerId?: string;
  winReason?: string;
  winReasonAr?: string;
}

export interface FrameWinPacket extends BasePacket {
  type: 'FRAME_WIN';
  frameWinnerId: string;
  currentP1Frames: number;
  currentP2Frames: number;
  isSeriesOver: boolean;
}

export interface HeartbeatPacket extends BasePacket {
  type: 'HEARTBEAT';
}

export interface HeartbeatAckPacket extends BasePacket {
  type: 'HEARTBEAT_ACK';
  origTimestamp: number;
}

export interface LeaveRoomPacket extends BasePacket {
  type: 'LEAVE_ROOM';
  reason?: string;
}

export type NetworkPacket =
  | BeaconPacket
  | JoinRequestPacket
  | JoinAcceptPacket
  | JoinRejectPacket
  | MatchStartPacket
  | ShotIntentPacket
  | ShotExecutedPacket
  | BallPlacementPacket
  | TurnResultPacket
  | FrameWinPacket
  | HeartbeatPacket
  | HeartbeatAckPacket
  | LeaveRoomPacket;
