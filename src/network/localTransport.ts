/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mqtt, { type MqttClient } from 'mqtt';
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

const PRIMARY_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const FALLBACK_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

export class LocalTransport {
  public static readonly DISCOVERY_CHANNEL = 'cue_masters_lan_discovery_beacon';
  public static readonly RECONNECT_GRACE_PERIOD_SEC = 30;
  private static readonly TOPIC_PREFIX = 'cuemasters_v2/rooms/';
  private static readonly BEACON_TOPIC = 'cuemasters_v2/lobby/beacons';

  private lobbyState: LocalLobbyState = 'IDLE';
  private currentRoomCode: string = '';
  private isHost: boolean = false;
  private localPlayerId: string = '';
  private sequenceCounter: number = 0;
  private seenSequences: Set<string> = new Set();

  // Ultra-reliable cross-device real-time MQTT client
  private mqttClient: MqttClient | null = null;
  private roomTopic: string = '';

  // Local BroadcastChannel fallback (same device / multi-tab)
  private discoveryChannel: BroadcastChannel | null = null;
  private roomChannel: BroadcastChannel | null = null;

  private beaconIntervalId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private reconnectIntervalId: number | null = null;
  private joinRetryIntervalId: number | null = null;

  private discoveredRoomsMap: Map<string, DiscoveredRoom> = new Map();
  private lastPeerSeenTimestamp: number = 0;
  private latencyMs: number = 15;
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

    const cleanCode = this.sanitizeCode(this.currentRoomCode);
    this.roomTopic = `${LocalTransport.TOPIC_PREFIX}${cleanCode}`;

    // Connect to global low-latency MQTT broker
    try {
      this.mqttClient = mqtt.connect(PRIMARY_BROKER, {
        keepalive: 30,
        reconnectPeriod: 2000,
        connectTimeout: 8000,
        clientId: `cm8_host_${cleanCode}_${Math.random().toString(16).slice(2, 8)}`,
      });

      this.mqttClient.on('connect', () => {
        if (!this.mqttClient) return;
        this.mqttClient.subscribe(this.roomTopic, { qos: 1 }, (err) => {
          if (!err) {
            this.setState('ROOM_CREATED');
          }
        });
      });

      this.mqttClient.on('message', (topic, payload) => {
        if (topic === this.roomTopic) {
          try {
            const packet = JSON.parse(payload.toString());
            this.handleIncomingPacket(packet);
          } catch (e) {
            console.warn('Packet parse error:', e);
          }
        }
      });

      this.mqttClient.on('error', (err) => {
        console.warn('MQTT host error:', err);
      });
    } catch (e) {
      console.warn('MQTT initialization error:', e);
    }

    // Local BroadcastChannel fallback for multi-tab testing
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.roomChannel = new BroadcastChannel(`cue_masters_room_${cleanCode}`);
        this.roomChannel.onmessage = (event) => this.handleIncomingPacket(event.data);

        this.discoveryChannel = new BroadcastChannel(LocalTransport.DISCOVERY_CHANNEL);
      } catch {}
    }

    // Broadcast room beacon periodically so nearby scanning devices discover it
    const sendBeacon = () => {
      if (this.lobbyState !== 'ROOM_CREATED') return;

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

      // Publish on MQTT beacon topic
      if (this.mqttClient && this.mqttClient.connected) {
        try {
          this.mqttClient.publish(LocalTransport.BEACON_TOPIC, JSON.stringify(beaconPacket));
        } catch {}
      }

      // Publish on local BroadcastChannel
      if (this.discoveryChannel) {
        try {
          this.discoveryChannel.postMessage(beaconPacket);
        } catch {}
      }
    };

    sendBeacon();
    this.beaconIntervalId = window.setInterval(sendBeacon, 2000);

    this.setState('ROOM_CREATED');
    return true;
  }

  // 2. Discover Rooms
  public startDiscovery(): void {
    this.stopDiscovery();
    this.discoveredRoomsMap.clear();
    this.setState('SEARCHING');

    // Subscribe to MQTT beacon topic
    try {
      this.mqttClient = mqtt.connect(PRIMARY_BROKER, {
        keepalive: 30,
        reconnectPeriod: 2500,
        connectTimeout: 8000,
        clientId: `cm8_scan_${Math.random().toString(16).slice(2, 8)}`,
      });

      this.mqttClient.on('connect', () => {
        this.mqttClient?.subscribe(LocalTransport.BEACON_TOPIC);
      });

      this.mqttClient.on('message', (topic, payload) => {
        if (topic === LocalTransport.BEACON_TOPIC) {
          try {
            const data = JSON.parse(payload.toString()) as NetworkPacket;
            this.recordBeacon(data);
          } catch {}
        }
      });
    } catch {}

    // Also scan local BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.discoveryChannel = new BroadcastChannel(LocalTransport.DISCOVERY_CHANNEL);
        this.discoveryChannel.onmessage = (event) => {
          const data = event.data as NetworkPacket;
          this.recordBeacon(data);
        };
      } catch {}
    }

    this.beaconIntervalId = window.setInterval(() => {
      this.pruneStaleRooms();
    }, 2500);
  }

  private recordBeacon(data: NetworkPacket): void {
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
  }

  private pruneStaleRooms(): void {
    const now = Date.now();
    let changed = false;
    for (const [code, room] of this.discoveredRoomsMap.entries()) {
      if (now - room.lastSeenTimestamp > 6000) {
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
    if (this.mqttClient) {
      this.mqttClient.end(true);
      this.mqttClient = null;
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

    const cleanCode = this.sanitizeCode(this.currentRoomCode);
    this.roomTopic = `${LocalTransport.TOPIC_PREFIX}${cleanCode}`;

    this.setState('CONNECTING', 'جاري الاتصال بالغرفة عبر الشبكة...');

    // Local BroadcastChannel fallback
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.roomChannel = new BroadcastChannel(`cue_masters_room_${cleanCode}`);
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
      this.mqttClient = mqtt.connect(PRIMARY_BROKER, {
        keepalive: 30,
        reconnectPeriod: 2000,
        connectTimeout: 8000,
        clientId: `cm8_client_${cleanCode}_${Math.random().toString(16).slice(2, 8)}`,
      });

      this.mqttClient.on('connect', () => {
        if (!this.mqttClient) return;
        this.mqttClient.subscribe(this.roomTopic, { qos: 1 }, (err) => {
          if (!err) {
            // Send Join Request immediately upon subscription
            this.send(joinReq);
            this.lastPeerSeenTimestamp = Date.now();
            this.startHeartbeatLoop();
          }
        });
      });

      this.mqttClient.on('message', (topic, payload) => {
        if (topic === this.roomTopic) {
          try {
            const packet = JSON.parse(payload.toString());
            this.handleIncomingPacket(packet);
          } catch {}
        }
      });

      this.mqttClient.on('error', (err) => {
        console.warn('MQTT client connection error:', err);
      });
    } catch (e) {
      console.warn('MQTT client initialization failed:', e);
    }

    // Send Join Request on local channel as well
    if (this.roomChannel) {
      try {
        this.roomChannel.postMessage(joinReq);
      } catch {}
    }

    // Keep resending Join Request every 1.5 seconds until Host responds with JOIN_ACCEPT or MATCH_START
    this.joinRetryIntervalId = window.setInterval(() => {
      if (this.lobbyState === 'CONNECTING') {
        this.send(joinReq);
      } else {
        if (this.joinRetryIntervalId !== null) {
          clearInterval(this.joinRetryIntervalId);
          this.joinRetryIntervalId = null;
        }
      }
    }, 1500);

    this.lastPeerSeenTimestamp = Date.now();
    this.startHeartbeatLoop();
    return true;
  }

  // 4. Send Packet
  public send(packet: NetworkPacket): void {
    packet.roomCode = this.currentRoomCode;
    packet.senderId = this.localPlayerId;
    packet.sequence = ++this.sequenceCounter;
    packet.timestamp = Date.now();

    const payload = JSON.stringify(packet);

    // 1. Send via MQTT over WebSocket (Cross-Device across all networks)
    if (this.mqttClient && this.mqttClient.connected && this.roomTopic) {
      try {
        this.mqttClient.publish(this.roomTopic, payload, { qos: 1 });
      } catch (e) {
        console.warn('MQTT publish error:', e);
      }
    }

    // 2. Send via local BroadcastChannel (Same-Device fallback)
    if (this.roomChannel) {
      try {
        this.roomChannel.postMessage(packet);
      } catch {}
    }
  }

  // 5. Inbound Packet Dispatcher & Deduplication
  private handleIncomingPacket(packet: NetworkPacket): void {
    if (!packet || typeof packet !== 'object') return;

    // Ignore packets sent by ourselves
    if (packet.senderId === this.localPlayerId) return;

    // Ignore packets for a different room
    if (packet.roomCode && this.sanitizeCode(packet.roomCode) !== this.sanitizeCode(this.currentRoomCode)) {
      return;
    }

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

    // If we were reconnecting, restore connected state
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
          this.setState('CONNECTED', 'تم انضمام الخصم للغرفة');
        }
        this.events.onPacket(packet);
        break;

      case 'JOIN_ACCEPT':
        this.setState('CONNECTED', 'تم الانضمام للغرفة بنجاح');
        this.events.onPacket(packet);
        break;

      case 'JOIN_REJECT':
        this.setState('DISCONNECTED', (packet as any).reason || 'تم رفض الانضمام للغرفة');
        this.events.onPacket(packet);
        break;

      case 'LEAVE_ROOM':
        this.setState('DISCONNECTED', 'غادر الخصم الغرفة');
        this.events.onPacket(packet);
        break;

      default:
        this.events.onPacket(packet);
        break;
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
      if (silentMs > 10000 && this.lobbyState === 'CONNECTED') {
        this.startReconnectCountdown();
      }
    }, 2500);
  }

  private startReconnectCountdown(): void {
    this.setState('RECONNECTING', 'انقطع الاتصال بالخصم. جاري محاولة إعادة الاتصال...');
    this.reconnectSecondsLeft = LocalTransport.RECONNECT_GRACE_PERIOD_SEC;
    this.events.onReconnectionCountdown(this.reconnectSecondsLeft);

    if (this.reconnectIntervalId !== null) clearInterval(this.reconnectIntervalId);

    this.reconnectIntervalId = window.setInterval(() => {
      this.reconnectSecondsLeft -= 1;
      this.events.onReconnectionCountdown(this.reconnectSecondsLeft);

      if (this.reconnectSecondsLeft <= 0) {
        this.stopReconnectCountdown();
        this.setState('DISCONNECTED', 'انتهت مهلة إعادة الاتصال مع الخصم (30 ثانية).');
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

    if (this.joinRetryIntervalId !== null) {
      clearInterval(this.joinRetryIntervalId);
      this.joinRetryIntervalId = null;
    }

    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    if (this.mqttClient) {
      try {
        this.mqttClient.end(true);
      } catch {}
      this.mqttClient = null;
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
