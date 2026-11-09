/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peer, type DataConnection } from 'peerjs';
import { GameMode, Player, RuleVariant } from '../types/game';
import {
  DiscoveredRoom,
  LocalLobbyState,
  MatchRounds,
  NetworkPacket,
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
  private static readonly PEER_PREFIX = 'cm8p_';

  private lobbyState: LocalLobbyState = 'IDLE';
  private currentRoomCode: string = '';
  private isHost: boolean = false;
  private localPlayerId: string = '';
  private sequenceCounter: number = 0;
  private seenSequences: Set<string> = new Set();

  // WebRTC P2P (Cross-Device on Wi-Fi / LAN)
  private peer: Peer | null = null;
  private activeConnection: DataConnection | null = null;

  // Local BroadcastChannel fallback (Same device / multi-tab)
  private discoveryChannel: BroadcastChannel | null = null;
  private roomChannel: BroadcastChannel | null = null;

  private beaconIntervalId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private reconnectIntervalId: number | null = null;

  private discoveredRoomsMap: Map<string, DiscoveredRoom> = new Map();
  private lastPeerSeenTimestamp: number = 0;
  private latencyMs: number = 10;
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

  private sanitizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // 1. Host Room Creation (Real WebRTC Peer ID + Local BroadcastChannel)
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

    const cleanCode = this.sanitizeCode(this.currentRoomCode);
    const peerRoomId = `${LocalTransport.PEER_PREFIX}${cleanCode}`;

    // Initialize WebRTC Peer with public STUN servers for robust NAT / Wi-Fi traversal
    try {
      this.peer = new Peer(peerRoomId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        this.setState('ROOM_CREATED');
      });

      this.peer.on('connection', (conn) => {
        this.activeConnection = conn;

        conn.on('open', () => {
          this.setState('CONNECTED', 'Opponent connected via direct WebRTC link');
          this.lastPeerSeenTimestamp = Date.now();
          this.startHeartbeatLoop();
        });

        conn.on('data', (data) => {
          this.handleIncomingPacket(data);
        });

        conn.on('close', () => {
          this.handlePeerDisconnect();
        });

        conn.on('error', (err) => {
          console.warn('WebRTC data connection error:', err);
        });
      });

      this.peer.on('error', (err: any) => {
        console.warn('WebRTC host peer error:', err);
        if (err.type === 'unavailable-id') {
          // If ID temporarily active, still keep host open on local channels
          this.setState('ROOM_CREATED', 'Host active with local channel fallback');
        }
      });
    } catch (e) {
      console.warn('WebRTC peer initialization error, falling back to BroadcastChannel:', e);
    }

    // Local BroadcastChannel fallback for multi-tab testing
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.roomChannel = new BroadcastChannel(`cue_masters_room_${this.currentRoomCode}`);
        this.roomChannel.onmessage = (event) => this.handleIncomingPacket(event.data);

        this.discoveryChannel = new BroadcastChannel(LocalTransport.DISCOVERY_CHANNEL);
      } catch {}
    }

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
        try {
          this.discoveryChannel.postMessage(beaconPacket);
        } catch {}
      }
    };

    sendBeacon();
    this.beaconIntervalId = window.setInterval(sendBeacon, 1800);

    this.setState('ROOM_CREATED');
    return true;
  }

  // 2. Discover Rooms
  public startDiscovery(): void {
    this.stopDiscovery();
    this.discoveredRoomsMap.clear();
    this.setState('SEARCHING');

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
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
      } catch {}
    }

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

  // 3. Join Room (Connects via WebRTC DataChannel to Host)
  public async joinRoom(roomCode: string, clientPlayer: Player): Promise<boolean> {
    this.cleanup();
    this.isHost = false;
    this.currentRoomCode = roomCode.toUpperCase();
    this.localPlayerId = clientPlayer.id;
    this.sequenceCounter = 0;
    this.seenSequences.clear();

    const cleanCode = this.sanitizeCode(this.currentRoomCode);
    const targetPeerId = `${LocalTransport.PEER_PREFIX}${cleanCode}`;

    this.setState('CONNECTING', 'Connecting to host device over local network...');

    // Open local BroadcastChannel fallback
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.roomChannel = new BroadcastChannel(`cue_masters_room_${this.currentRoomCode}`);
        this.roomChannel.onmessage = (event) => this.handleIncomingPacket(event.data);
      } catch {}
    }

    const joinReq: NetworkPacket = {
      type: 'JOIN_REQUEST',
      roomCode: this.currentRoomCode,
      senderId: this.localPlayerId,
      sequence: ++this.sequenceCounter,
      timestamp: Date.now(),
      playerName: clientPlayer.name,
      playerAvatar: clientPlayer.avatarSeed,
    };

    try {
      this.peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        if (!this.peer) return;

        const conn = this.peer.connect(targetPeerId, {
          reliable: true,
        });
        this.activeConnection = conn;

        conn.on('open', () => {
          this.setState('CONNECTING', 'Direct P2P Link Established. Sending Join Request...');
          conn.send(joinReq);
          this.lastPeerSeenTimestamp = Date.now();
          this.startHeartbeatLoop();
        });

        conn.on('data', (data) => {
          this.handleIncomingPacket(data);
        });

        conn.on('close', () => {
          this.handlePeerDisconnect();
        });

        conn.on('error', (err) => {
          console.warn('WebRTC client connection error:', err);
        });
      });

      this.peer.on('error', (err: any) => {
        console.warn('WebRTC client peer error:', err);
        if (err.type === 'peer-unavailable') {
          this.setState(
            'DISCONNECTED',
            'لم يتم العثور على الغرفة. تأكد من فتح الغرفة في الجهاز الأول وإدخال نفس الرمز (Room not found. Check code on host).'
          );
        }
      });
    } catch (e) {
      console.warn('WebRTC initialization failed, trying broadcast channel:', e);
    }

    // Also send on local BroadcastChannel if host is in another tab on the same device
    if (this.roomChannel) {
      try {
        this.roomChannel.postMessage(joinReq);
      } catch {}
    }

    this.lastPeerSeenTimestamp = Date.now();
    this.startHeartbeatLoop();
    return true;
  }

  // 4. Send Packet via WebRTC DataChannel + BroadcastChannel
  public send(packet: NetworkPacket): void {
    packet.roomCode = this.currentRoomCode;
    packet.senderId = this.localPlayerId;
    packet.sequence = ++this.sequenceCounter;
    packet.timestamp = Date.now();

    // 1. Direct WebRTC P2P DataChannel (Cross-Device)
    if (this.activeConnection && this.activeConnection.open) {
      try {
        this.activeConnection.send(packet);
      } catch (e) {
        console.warn('WebRTC send error:', e);
      }
    }

    // 2. BroadcastChannel fallback (Same Device)
    if (this.roomChannel) {
      try {
        this.roomChannel.postMessage(packet);
      } catch {}
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
    const packetKey = `${packet.senderId}_${packet.sequence}_${packet.type}`;
    if (this.seenSequences.has(packetKey)) return;
    this.seenSequences.add(packetKey);
    if (this.seenSequences.size > 200) {
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
        if (this.isHost) {
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

  private handlePeerDisconnect(): void {
    if (this.lobbyState === 'CONNECTED') {
      this.startReconnectCountdown();
    }
  }

  // 6. Heartbeat Loop
  public startHeartbeatLoop(): void {
    if (this.heartbeatIntervalId !== null) clearInterval(this.heartbeatIntervalId);

    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.lobbyState !== 'CONNECTED' && this.lobbyState !== 'RECONNECTING') return;

      this.send({
        type: 'HEARTBEAT',
      } as NetworkPacket);

      const silentMs = Date.now() - this.lastPeerSeenTimestamp;
      if (silentMs > 8000 && this.lobbyState === 'CONNECTED') {
        this.startReconnectCountdown();
      }
    }, 2500);
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

  // 7. Disconnect & Cleanup
  public disconnect(): void {
    if (this.lobbyState === 'CONNECTED' || this.lobbyState === 'ROOM_CREATED') {
      try {
        const leavePacket: NetworkPacket = {
          type: 'LEAVE_ROOM',
          roomCode: this.currentRoomCode,
          senderId: this.localPlayerId,
          sequence: ++this.sequenceCounter,
          timestamp: Date.now(),
        };
        this.send(leavePacket);
      } catch {}
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

    if (this.activeConnection) {
      try {
        this.activeConnection.close();
      } catch {}
      this.activeConnection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }

    if (this.roomChannel) {
      try {
        this.roomChannel.close();
      } catch {}
      this.roomChannel = null;
    }

    this.currentRoomCode = '';
    this.isHost = false;
  }
}
