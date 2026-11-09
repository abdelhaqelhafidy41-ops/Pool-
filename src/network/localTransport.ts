/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameMode, Player, RuleVariant } from '../types/game';
import {
  DiscoveredRoom,
  LocalLobbyState,
  MatchRounds,
  NetworkPacket,
  PacketType,
} from '../types/network';

export interface TransportEvents {
  onStateChange: (state: LocalLobbyState, detail?: string) => void;
  onPacket: (packet: NetworkPacket) => void;
  onDiscoveredRoomsUpdate: (rooms: DiscoveredRoom[]) => void;
  onReconnectionCountdown: (secondsLeft: number) => void;
}

export class LocalTransport {
  public static readonly DISCOVERY_CHANNEL = 'cue_masters_lan_discovery_beacon';
  public static readonly RECONNECT_GRACE_PERIOD_SEC = 30;

  private lobbyState: LocalLobbyState = 'IDLE';
  private currentRoomCode: string = '';
  private isHost: boolean = false;
  private localPlayerId: string = '';
  private sequenceCounter: number = 0;
  private seenSequences: Set<string> = new Set();

  private discoveryChannel: BroadcastChannel | null = null;
  private roomChannel: BroadcastChannel | null = null;

  private beaconIntervalId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private reconnectIntervalId: number | null = null;

  private discoveredRoomsMap: Map<string, DiscoveredRoom> = new Map();
  private lastPeerSeenTimestamp: number = 0;
  private latencyMs: number = 8;
  private reconnectSecondsLeft: number = LocalTransport.RECONNECT_GRACE_PERIOD_SEC;

  private events: TransportEvents;

  constructor(events: TransportEvents) {
    this.events = events;
  }

  public getState(): LocalLobbyState {
    return this.lobbyState;
  }

  public getRoomCode(): string {
    return this.currentRoomCode;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public getReconnectionSeconds(): number {
    return this.reconnectSecondsLeft;
  }

  private setState(newState: LocalLobbyState, detail?: string) {
    this.lobbyState = newState;
    this.events.onStateChange(newState, detail);
  }

  // 1. Host Room Creation
  public startHosting(config: {
    roomCode: string;
    mode: GameMode;
    ruleVariant: RuleVariant;
    rounds: MatchRounds;
    hostPlayer: Player;
  }): boolean {
    this.cleanup();
    this.isHost = true;
    this.currentRoomCode = config.roomCode.toUpperCase();
    this.localPlayerId = config.hostPlayer.id;
    this.sequenceCounter = 0;
    this.seenSequences.clear();

    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      this.setState('DISCONNECTED', 'BroadcastChannel not available in this browser');
      return false;
    }

    // Open dedicated room channel
    this.roomChannel = new BroadcastChannel(`cue_masters_room_${this.currentRoomCode}`);
    this.roomChannel.onmessage = (event) => this.handleIncomingPacket(event.data);

    // Open discovery channel to beacon room info on local network
    this.discoveryChannel = new BroadcastChannel(LocalTransport.DISCOVERY_CHANNEL);

    const sendBeacon = () => {
      if (this.discoveryChannel && this.lobbyState === 'ROOM_CREATED') {
        const beaconPacket: NetworkPacket = {
          type: 'BEACON',
          roomCode: this.currentRoomCode,
          senderId: this.localPlayerId,
          sequence: ++this.sequenceCounter,
          timestamp: Date.now(),
          hostName: config.hostPlayer.name,
          hostAvatar: config.hostPlayer.avatarSeed,
          mode: config.mode,
          ruleVariant: config.ruleVariant,
          rounds: config.rounds,
        };
        this.discoveryChannel.postMessage(beaconPacket);
      }
    };

    // Send immediate beacon and repeat every 1.8s
    sendBeacon();
    this.beaconIntervalId = window.setInterval(sendBeacon, 1800);

    this.setState('ROOM_CREATED');
    return true;
  }

  // 2. Discover Rooms on Local Network
  public startDiscovery(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    this.stopDiscovery();

    this.discoveredRoomsMap.clear();
    this.setState('SEARCHING');

    this.discoveryChannel = new BroadcastChannel(LocalTransport.DISCOVERY_CHANNEL);
    this.discoveryChannel.onmessage = (event) => {
      const data = event.data as NetworkPacket;
      if (data && data.type === 'BEACON') {
        this.discoveredRoomsMap.set(data.roomCode, {
          roomCode: data.roomCode,
          hostName: data.hostName,
          hostAvatar: data.hostAvatar,
          mode: data.mode,
          ruleVariant: data.ruleVariant,
          rounds: data.rounds,
          lastSeenTimestamp: Date.now(),
        });
        this.pruneStaleRooms();
      }
    };

    // Periodic prune of rooms not seen in 5 seconds
    this.beaconIntervalId = window.setInterval(() => {
      this.pruneStaleRooms();
    }, 2500);
  }

  private pruneStaleRooms(): void {
    const now = Date.now();
    let changed = false;
    for (const [code, room] of this.discoveredRoomsMap.entries()) {
      if (now - room.lastSeenTimestamp > 5000) {
        this.discoveredRoomsMap.delete(code);
        changed = true;
      }
    }
    if (changed || this.lobbyState === 'SEARCHING') {
      this.events.onDiscoveredRoomsUpdate(Array.from(this.discoveredRoomsMap.values()));
    }
  }

  public stopDiscovery(): void {
    if (this.discoveryChannel) {
      this.discoveryChannel.close();
      this.discoveryChannel = null;
    }
    if (this.beaconIntervalId !== null) {
      clearInterval(this.beaconIntervalId);
      this.beaconIntervalId = null;
    }
  }

  // 3. Join Room
  public async joinRoom(roomCode: string, clientPlayer: Player): Promise<boolean> {
    this.cleanup();
    this.isHost = false;
    this.currentRoomCode = roomCode.toUpperCase();
    this.localPlayerId = clientPlayer.id;
    this.sequenceCounter = 0;
    this.seenSequences.clear();

    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      this.setState('DISCONNECTED', 'BroadcastChannel not available');
      return false;
    }

    this.setState('CONNECTING');
    this.roomChannel = new BroadcastChannel(`cue_masters_room_${this.currentRoomCode}`);
    this.roomChannel.onmessage = (event) => this.handleIncomingPacket(event.data);

    // Send Join Request packet
    const joinReq: NetworkPacket = {
      type: 'JOIN_REQUEST',
      roomCode: this.currentRoomCode,
      senderId: this.localPlayerId,
      sequence: ++this.sequenceCounter,
      timestamp: Date.now(),
      playerName: clientPlayer.name,
      playerAvatar: clientPlayer.avatarSeed,
    };

    this.send(joinReq);
    this.lastPeerSeenTimestamp = Date.now();
    this.startHeartbeatLoop();

    return true;
  }

  // 4. Send Packet with safety and sequence numbering
  public send(packet: NetworkPacket): void {
    if (!this.roomChannel) return;

    // Stamp sequence and timestamp
    packet.roomCode = this.currentRoomCode;
    packet.senderId = this.localPlayerId;
    packet.sequence = ++this.sequenceCounter;
    packet.timestamp = Date.now();

    try {
      this.roomChannel.postMessage(packet);
    } catch (e) {
      console.warn('Transport send error:', e);
    }
  }

  // 5. Inbound Packet Dispatcher & Deduplication
  private handleIncomingPacket(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const packet = data as NetworkPacket;

    // Ignore self packets
    if (packet.senderId === this.localPlayerId) return;

    // Ignore packets from other rooms
    if (packet.roomCode && packet.roomCode !== this.currentRoomCode) return;

    // Deduplication check
    const packetKey = `${packet.senderId}_${packet.sequence}`;
    if (this.seenSequences.has(packetKey)) return;
    this.seenSequences.add(packetKey);
    if (this.seenSequences.size > 200) {
      // Keep set bounded
      const it = this.seenSequences.values();
      for (let i = 0; i < 50; i++) this.seenSequences.delete(it.next().value!);
    }

    // Refresh peer keepalive timestamp
    this.lastPeerSeenTimestamp = Date.now();

    // If we were reconnecting, return to connected
    if (this.lobbyState === 'RECONNECTING') {
      this.stopReconnectCountdown();
      this.setState('CONNECTED', 'Opponent reconnected');
    }

    // Handle internal protocol packets
    switch (packet.type) {
      case 'HEARTBEAT':
        this.send({
          type: 'HEARTBEAT_ACK',
          origTimestamp: packet.timestamp,
        } as NetworkPacket);
        break;

      case 'HEARTBEAT_ACK': {
        const rtt = Math.max(1, Date.now() - (packet as any).origTimestamp);
        this.latencyMs = Math.round(rtt / 2);
        break;
      }

      case 'JOIN_REQUEST':
        if (this.isHost && this.lobbyState === 'ROOM_CREATED') {
          // Stop advertising room beacon once joined
          this.stopDiscovery();
          this.setState('CONNECTED', 'Opponent joined the room');
        }
        this.events.onPacket(packet);
        break;

      case 'JOIN_ACCEPT':
        this.setState('CONNECTED', 'Joined room successfully');
        this.events.onPacket(packet);
        break;

      case 'JOIN_REJECT':
        this.setState('DISCONNECTED', (packet as any).reason || 'Room rejected join');
        this.events.onPacket(packet);
        break;

      case 'LEAVE_ROOM':
        this.setState('DISCONNECTED', 'Opponent left the room');
        this.events.onPacket(packet);
        break;

      default:
        this.events.onPacket(packet);
        break;
    }
  }

  // 6. Heartbeat Loop and Reconnection Grace Period
  public startHeartbeatLoop(): void {
    if (this.heartbeatIntervalId !== null) clearInterval(this.heartbeatIntervalId);

    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.lobbyState !== 'CONNECTED' && this.lobbyState !== 'RECONNECTING') return;

      // Send ping
      this.send({
        type: 'HEARTBEAT',
      } as NetworkPacket);

      // Check if peer is silent
      const silentMs = Date.now() - this.lastPeerSeenTimestamp;
      if (silentMs > 6000 && this.lobbyState === 'CONNECTED') {
        this.startReconnectCountdown();
      }
    }, 2400);
  }

  private startReconnectCountdown(): void {
    this.setState('RECONNECTING', 'Connection lost with opponent. Waiting for reconnection...');
    this.reconnectSecondsLeft = LocalTransport.RECONNECT_GRACE_PERIOD_SEC;
    this.events.onReconnectionCountdown(this.reconnectSecondsLeft);

    if (this.reconnectIntervalId !== null) clearInterval(this.reconnectIntervalId);

    this.reconnectIntervalId = window.setInterval(() => {
      this.reconnectSecondsLeft -= 1;
      this.events.onReconnectionCountdown(this.reconnectSecondsLeft);

      if (this.reconnectSecondsLeft <= 0) {
        this.stopReconnectCountdown();
        this.setState('DISCONNECTED', 'Opponent timed out (30s grace period expired). Match ended.');
      }
    }, 1000);
  }

  private stopReconnectCountdown(): void {
    if (this.reconnectIntervalId !== null) {
      clearInterval(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
  }

  // 7. Safe Cleanup & Disconnect
  public disconnect(): void {
    if (this.roomChannel && (this.lobbyState === 'CONNECTED' || this.lobbyState === 'ROOM_CREATED')) {
      try {
        const leavePacket: NetworkPacket = {
          type: 'LEAVE_ROOM',
          roomCode: this.currentRoomCode,
          senderId: this.localPlayerId,
          sequence: ++this.sequenceCounter,
          timestamp: Date.now(),
        };
        this.roomChannel.postMessage(leavePacket);
      } catch {
        // Safe ignore
      }
    }
    this.cleanup();
    this.setState('IDLE');
  }

  private cleanup(): void {
    this.stopDiscovery();
    this.stopReconnectCountdown();

    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    if (this.roomChannel) {
      this.roomChannel.close();
      this.roomChannel = null;
    }

    this.currentRoomCode = '';
    this.isHost = false;
  }
}
