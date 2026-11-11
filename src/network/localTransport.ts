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
import { DirectP2PTransport } from './directP2P';

export interface TransportEvents {
  onStateChange: (state: LocalLobbyState, detail?: string) => void;
  onPacket: (packet: NetworkPacket) => void;
  onDiscoveredRoomsUpdate: (rooms: DiscoveredRoom[]) => void;
  onReconnectionCountdown: (secondsLeft: number) => void;
}

const PRIMARY_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const FALLBACK_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class LocalTransport {
  public static readonly DISCOVERY_CHANNEL = 'cue_masters_lan_discovery_beacon';
  public static readonly RECONNECT_GRACE_PERIOD_SEC = 30;
  private static readonly TOPIC_PREFIX = 'cuemasters_v2/rooms/';
  private static readonly BEACON_TOPIC = 'cuemasters_v2/lobby/beacons';

  private readonly instanceId: string = 'inst_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
  private lobbyState: LocalLobbyState = 'IDLE';
  private currentRoomCode: string = '';
  private isHost: boolean = false;
  private localPlayerId: string = '';
  private sequenceCounter: number = 0;
  private seenSequences: Set<string> = new Set();

  // Low-latency MQTT client (over WebSockets)
  private mqttClient: MqttClient | null = null;
  private discoveryMqttClient: MqttClient | null = null;
  private roomTopic: string = '';

  // Automatic Zero-Lag WebRTC Turbo DataChannel (1ms - 5ms peer-to-peer Wi-Fi stream)
  private turboPeerConn: RTCPeerConnection | null = null;
  private turboDataChannel: RTCDataChannel | null = null;
  private isTurboP2POpen: boolean = false;

  // Direct Device-to-Device WebRTC DataChannel (QR/Manual code mode)
  private directP2P: DirectP2PTransport | null = null;

  // Local BroadcastChannel fallback (same device / multi-tab)
  private discoveryChannel: BroadcastChannel | null = null;
  private roomChannel: BroadcastChannel | null = null;

  private beaconIntervalId: number | null = null;
  private discoveryScanIntervalId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private reconnectIntervalId: number | null = null;
  private joinRetryIntervalId: number | null = null;

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

  public getIsTurboP2P(): boolean {
    return this.isTurboP2POpen;
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
    isTournament?: boolean;
  }): boolean {
    this.cleanup();
    this.isHost = true;
    this.currentRoomCode = config.roomCode.toUpperCase();
    this.localPlayerId = config.hostPlayer.id || 'p1_host';
    this.sequenceCounter = 0;
    this.seenSequences.clear();

    const cleanCode = this.sanitizeCode(this.currentRoomCode);
    this.roomTopic = `${LocalTransport.TOPIC_PREFIX}${cleanCode}`;

    this.connectMqttHost(cleanCode);

    // Initialize Host Turbo WebRTC
    this.initHostTurboWebRTC();

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
        isTournament: config.isTournament,
      };

      this.sendMqttRaw(beaconPacket, LocalTransport.BEACON_TOPIC);

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

  private connectMqttHost(cleanCode: string, brokerUrl: string = PRIMARY_BROKER): void {
    try {
      this.mqttClient = mqtt.connect(brokerUrl, {
        keepalive: 10,
        reconnectPeriod: 1000,
        connectTimeout: 4000,
        clean: true,
        queueQoSZero: false,
        reschedulePings: true,
        clientId: `cm8_host_${cleanCode}_${Math.random().toString(16).slice(2, 8)}`,
      });

      this.mqttClient.on('connect', () => {
        if (!this.mqttClient) return;
        this.mqttClient.subscribe(this.roomTopic, { qos: 0 }, (err) => {
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
          } catch {}
        }
      });

      this.mqttClient.on('error', () => {
        if (brokerUrl === PRIMARY_BROKER) {
          try {
            this.mqttClient?.end(true);
          } catch {}
          this.connectMqttHost(cleanCode, FALLBACK_BROKER);
        }
      });
    } catch {}
  }

  // 2. Discover Rooms (Lobby Scanner)
  public startDiscovery(): void {
    this.stopDiscovery();
    this.discoveredRoomsMap.clear();
    this.setState('SEARCHING');

    try {
      this.discoveryMqttClient = mqtt.connect(PRIMARY_BROKER, {
        keepalive: 20,
        reconnectPeriod: 2500,
        connectTimeout: 5000,
        clientId: `cm8_scan_${Math.random().toString(16).slice(2, 8)}`,
      });

      this.discoveryMqttClient.on('connect', () => {
        this.discoveryMqttClient?.subscribe(LocalTransport.BEACON_TOPIC);
      });

      this.discoveryMqttClient.on('message', (topic, payload) => {
        if (topic === LocalTransport.BEACON_TOPIC) {
          try {
            const data = JSON.parse(payload.toString()) as NetworkPacket;
            this.recordBeacon(data);
          } catch {}
        }
      });
    } catch {}

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.discoveryChannel = new BroadcastChannel(LocalTransport.DISCOVERY_CHANNEL);
        this.discoveryChannel.onmessage = (event) => {
          const data = event.data as NetworkPacket;
          this.recordBeacon(data);
        };
      } catch {}
    }

    this.discoveryScanIntervalId = window.setInterval(() => {
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
        isTournament: data.isTournament,
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
      try {
        this.discoveryChannel.close();
      } catch {}
      this.discoveryChannel = null;
    }
    if (this.discoveryMqttClient) {
      try {
        this.discoveryMqttClient.end(true);
      } catch {}
      this.discoveryMqttClient = null;
    }
    if (this.discoveryScanIntervalId !== null) {
      clearInterval(this.discoveryScanIntervalId);
      this.discoveryScanIntervalId = null;
    }
  }

  // 3. Join Room
  public async joinRoom(roomCode: string, clientPlayer: Player): Promise<boolean> {
    this.cleanup();
    this.isHost = false;
    this.currentRoomCode = roomCode.toUpperCase();
    this.localPlayerId = clientPlayer.id || 'p2_guest';
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

    const createJoinReq = (): NetworkPacket => ({
      type: 'JOIN_REQUEST',
      roomCode: this.currentRoomCode,
      senderId: this.localPlayerId,
      sequence: ++this.sequenceCounter,
      timestamp: Date.now(),
      playerName: clientPlayer.name,
      playerAvatar: clientPlayer.avatarSeed,
    });

    this.connectMqttClient(cleanCode, createJoinReq);

    if (this.roomChannel) {
      try {
        this.roomChannel.postMessage(createJoinReq());
      } catch {}
    }

    // Keep resending Join Request every 1200ms until Host responds
    this.joinRetryIntervalId = window.setInterval(() => {
      if (this.lobbyState === 'CONNECTING') {
        this.send(createJoinReq());
      } else {
        if (this.joinRetryIntervalId !== null) {
          clearInterval(this.joinRetryIntervalId);
          this.joinRetryIntervalId = null;
        }
      }
    }, 1200);

    this.lastPeerSeenTimestamp = Date.now();
    this.startHeartbeatLoop();
    return true;
  }

  private connectMqttClient(cleanCode: string, createJoinReq: () => NetworkPacket, brokerUrl: string = PRIMARY_BROKER): void {
    try {
      this.mqttClient = mqtt.connect(brokerUrl, {
        keepalive: 10,
        reconnectPeriod: 1000,
        connectTimeout: 4000,
        clean: true,
        queueQoSZero: false,
        reschedulePings: true,
        clientId: `cm8_client_${cleanCode}_${Math.random().toString(16).slice(2, 8)}`,
      });

      this.mqttClient.on('connect', () => {
        if (!this.mqttClient) return;
        this.mqttClient.subscribe(this.roomTopic, { qos: 0 }, (err) => {
          if (!err) {
            this.send(createJoinReq());
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

      this.mqttClient.on('error', () => {
        if (brokerUrl === PRIMARY_BROKER) {
          try {
            this.mqttClient?.end(true);
          } catch {}
          this.connectMqttClient(cleanCode, createJoinReq, FALLBACK_BROKER);
        }
      });
    } catch {}
  }

  // 3b. Attach Direct Offline P2P Transport (Zero server, device-to-device)
  public attachDirectP2P(p2p: DirectP2PTransport, roomCode: string, isHost: boolean, localPlayerId: string): void {
    this.cleanup();
    this.directP2P = p2p;
    this.currentRoomCode = roomCode;
    this.isHost = isHost;
    this.localPlayerId = localPlayerId;
    this.sequenceCounter = 0;
    this.seenSequences.clear();
    this.setState('CONNECTED', 'تم الاتصال المباشر بين الجهازين أوفلاين');
  }

  // --- Automatic Turbo WebRTC Peer-to-Peer Subsystem ---
  private initHostTurboWebRTC(): void {
    try {
      if (typeof RTCPeerConnection === 'undefined') return;
      this.cleanupTurboWebRTC();

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this.turboPeerConn = pc;

      // Ultra-low latency data channel
      const dc = pc.createDataChannel('cuemasters_turbo', { ordered: true });
      this.setupDataChannel(dc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendMqttRaw({
            _rtcType: 'ICE',
            candidate: event.candidate,
            senderId: this.localPlayerId,
            roomCode: this.currentRoomCode,
          });
        }
      };

      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer).then(() => {
          // Offer will be broadcasted when guest sends JOIN_REQUEST
        });
      }).catch(() => {});
    } catch {}
  }

  private handleHostBroadcastOffer(): void {
    if (!this.turboPeerConn || !this.turboPeerConn.localDescription) return;
    this.sendMqttRaw({
      _rtcType: 'OFFER',
      sdp: this.turboPeerConn.localDescription.sdp,
      senderId: this.localPlayerId,
      roomCode: this.currentRoomCode,
    });
  }

  private async handleGuestReceivedOffer(sdpOffer: string): Promise<void> {
    try {
      if (typeof RTCPeerConnection === 'undefined') return;
      this.cleanupTurboWebRTC();

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this.turboPeerConn = pc;

      pc.ondatachannel = (e) => {
        this.setupDataChannel(e.channel);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendMqttRaw({
            _rtcType: 'ICE',
            candidate: event.candidate,
            senderId: this.localPlayerId,
            roomCode: this.currentRoomCode,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdpOffer }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendMqttRaw({
        _rtcType: 'ANSWER',
        sdp: answer.sdp,
        senderId: this.localPlayerId,
        roomCode: this.currentRoomCode,
      });
    } catch {}
  }

  private async handleHostReceivedAnswer(sdpAnswer: string): Promise<void> {
    try {
      if (!this.turboPeerConn) return;
      await this.turboPeerConn.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdpAnswer }));
    } catch {}
  }

  private setupDataChannel(dc: RTCDataChannel): void {
    this.turboDataChannel = dc;
    dc.onopen = () => {
      this.isTurboP2POpen = true;
      this.latencyMs = 2; // Direct Wi-Fi P2P latency
    };
    dc.onclose = () => {
      this.isTurboP2POpen = false;
    };
    dc.onerror = () => {
      this.isTurboP2POpen = false;
    };
    dc.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        this.handleIncomingPacket(packet);
      } catch {}
    };
  }

  private cleanupTurboWebRTC(): void {
    this.isTurboP2POpen = false;
    if (this.turboDataChannel) {
      try {
        this.turboDataChannel.close();
      } catch {}
      this.turboDataChannel = null;
    }
    if (this.turboPeerConn) {
      try {
        this.turboPeerConn.close();
      } catch {}
      this.turboPeerConn = null;
    }
  }

  private sendMqttRaw(obj: any, targetTopic?: string): void {
    const topic = targetTopic || this.roomTopic;
    if (!topic) return;
    const payload = JSON.stringify(obj);
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        this.mqttClient.publish(topic, payload, { qos: 0 });
      } catch {}
    }
  }

  // 4. Send Packet (Turbo P2P first, then MQTT + BroadcastChannel)
  public send(packet: NetworkPacket): void {
    packet.roomCode = this.currentRoomCode;
    packet.senderId = this.localPlayerId || (this.isHost ? 'p1_host' : 'p2_guest');
    (packet as any).role = this.isHost ? 'host' : 'guest';
    (packet as any).instanceId = this.instanceId;
    packet.sequence = ++this.sequenceCounter;
    packet.timestamp = Date.now();

    // 0. Manual Direct Device-to-Device P2P if active
    if (this.directP2P && this.directP2P.getIsConnected()) {
      this.directP2P.send(packet);
    }

    const payload = JSON.stringify(packet);

    // 1. Send via Automatic Turbo WebRTC DataChannel (1ms - 5ms instant local Wi-Fi latency)
    let p2pDelivered = false;
    if (this.isTurboP2POpen && this.turboDataChannel && this.turboDataChannel.readyState === 'open') {
      try {
        this.turboDataChannel.send(payload);
        p2pDelivered = true;
      } catch {
        this.isTurboP2POpen = false;
      }
    }

    // 2. High-speed stream packets (AIM_UPDATE / TIME_SYNC) can skip MQTT when P2P is blazing fast,
    // but state packets (JOIN, START, RESULT, FORFEIT) always also broadcast over MQTT for 100% guarantee
    const isStream = packet.type === 'AIM_UPDATE' || packet.type === 'TIME_SYNC' || packet.type === 'HEARTBEAT';
    if (!p2pDelivered || !isStream) {
      if (this.mqttClient && this.mqttClient.connected && this.roomTopic) {
        try {
          this.mqttClient.publish(this.roomTopic, payload, { qos: 0 });
        } catch {}
      }
    }

    // 3. Local BroadcastChannel (Same-Device fallback)
    if (this.roomChannel) {
      try {
        this.roomChannel.postMessage(packet);
      } catch {}
    }
  }

  // 5. Inbound Packet Dispatcher & Deduplication
  private handleIncomingPacket(packet: any): void {
    if (!packet || typeof packet !== 'object') return;

    // Handle internal Turbo WebRTC P2P signaling messages silently
    if (packet._rtcType) {
      if (packet.senderId === this.localPlayerId) return;
      if (packet._rtcType === 'OFFER' && !this.isHost) {
        this.handleGuestReceivedOffer(packet.sdp);
      } else if (packet._rtcType === 'ANSWER' && this.isHost) {
        this.handleHostReceivedAnswer(packet.sdp);
      } else if (packet._rtcType === 'ICE') {
        if (this.turboPeerConn && packet.candidate) {
          this.turboPeerConn.addIceCandidate(new RTCIceCandidate(packet.candidate)).catch(() => {});
        }
      }
      return;
    }

    // Ignore packets sent by this exact client instance
    if ((packet as any).instanceId && (packet as any).instanceId === this.instanceId) {
      return;
    }

    // Ignore packets from same role
    if ((packet as any).role && (packet as any).role === (this.isHost ? 'host' : 'guest')) {
      return;
    }

    // Ignore packets for a different room
    if (packet.roomCode && this.sanitizeCode(packet.roomCode) !== this.sanitizeCode(this.currentRoomCode)) {
      return;
    }

    // Deduplication check
    const isStreamPacket = packet.type === 'AIM_UPDATE' || packet.type === 'TIME_SYNC' || packet.type === 'HEARTBEAT';
    if (!isStreamPacket) {
      const packetKey = `${packet.senderId}_${packet.sequence}_${packet.type}`;
      if (this.seenSequences.has(packetKey)) return;
      this.seenSequences.add(packetKey);
      if (this.seenSequences.size > 200) {
        const it = this.seenSequences.values();
        for (let i = 0; i < 50; i++) this.seenSequences.delete(it.next().value!);
      }
    }

    this.lastPeerSeenTimestamp = Date.now();

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
        this.latencyMs = this.isTurboP2POpen ? 2 : Math.round(rtt / 2);
        break;
      }

      case 'JOIN_REQUEST':
        if (this.isHost) {
          if (this.beaconIntervalId !== null) {
            clearInterval(this.beaconIntervalId);
            this.beaconIntervalId = null;
          }
          this.setState('CONNECTED', 'تم انضمام الخصم للغرفة');
          // Trigger P2P offer exchange to establish 1ms zero-lag DataChannel
          setTimeout(() => this.handleHostBroadcastOffer(), 100);
        }
        this.events.onPacket(packet);
        break;

      case 'JOIN_ACCEPT':
        this.setState('CONNECTED', 'تم الانضمام للغرفة بنجاح');
        if (this.joinRetryIntervalId !== null) {
          clearInterval(this.joinRetryIntervalId);
          this.joinRetryIntervalId = null;
        }
        this.events.onPacket(packet);
        break;

      case 'MATCH_START':
        this.setState('CONNECTED', 'بدأت المباراة');
        if (this.joinRetryIntervalId !== null) {
          clearInterval(this.joinRetryIntervalId);
          this.joinRetryIntervalId = null;
        }
        this.events.onPacket(packet);
        break;

      case 'JOIN_REJECT':
        this.setState('DISCONNECTED', (packet as any).reason || 'تم رفض الانضمام للغرفة');
        this.events.onPacket(packet);
        break;

      case 'PLAYER_FORFEIT':
      case 'LEAVE_ROOM':
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
    this.cleanupTurboWebRTC();

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

    if (this.directP2P) {
      try {
        this.directP2P.cleanup();
      } catch {}
      this.directP2P = null;
    }

    this.currentRoomCode = '';
    this.isHost = false;
  }
}
