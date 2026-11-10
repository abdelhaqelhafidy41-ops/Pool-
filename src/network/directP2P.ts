/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { NetworkPacket } from '../types/network';

export interface DirectP2PEvents {
  onConnected: () => void;
  onDisconnected: (reason?: string) => void;
  onPacket: (packet: NetworkPacket) => void;
  onLatencyUpdate: (latencyMs: number) => void;
  onError: (error: string) => void;
}

export interface DirectOfferResult {
  offerCode: string;
  qrDataUrl: string;
}

export interface DirectAnswerResult {
  answerCode: string;
  qrDataUrl: string;
}

/**
 * Direct Offline P2P Transport using WebRTC DataChannel.
 * Completely eliminates any third-party server, cloud broker, or internet access requirement.
 * All game packets stream directly device-to-device across the local Wi-Fi router or mobile hotspot.
 */
export class DirectP2PTransport {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private isHost: boolean = false;
  private events: DirectP2PEvents;
  private pingIntervalId: number | null = null;
  private lastPingSentTime: number = 0;

  constructor(events: DirectP2PEvents) {
    this.events = events;
  }

  public getIsConnected(): boolean {
    return this.dataChannel !== null && this.dataChannel.readyState === 'open';
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  /**
   * Helper to encode SDP JSON to a compact URL-safe Base64 token
   */
  public static encodeToken(data: any): string {
    const jsonStr = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  /**
   * Helper to decode Base64 token back to SDP object
   */
  public static decodeToken(token: string): any {
    const trimmed = token.trim();
    try {
      const decoded = decodeURIComponent(escape(atob(trimmed)));
      return JSON.parse(decoded);
    } catch {
      // Fallback if plain JSON was pasted directly
      return JSON.parse(trimmed);
    }
  }

  /**
   * Helper to wait for ICE candidate gathering to finish so the SDP includes all local LAN candidates
   */
  private static waitForCandidates(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };

      pc.addEventListener('icegatheringstatechange', check);
      // Timeout fallback: after 1200ms, proceed with gathered candidates
      setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }, 1200);
    });
  }

  /**
   * 1. HOST: Creates Direct Offer and returns the connection code + QR code
   */
  public async createDirectOffer(): Promise<DirectOfferResult> {
    this.cleanup();
    this.isHost = true;

    // Zero STUN/TURN servers required on local Wi-Fi / Hotspot!
    const pc = new RTCPeerConnection({ iceServers: [] });
    this.pc = pc;

    // Create reliable binary/text data channel
    const dc = pc.createDataChannel('cuemasters_p2p', { ordered: true });
    this.setupDataChannel(dc);

    this.setupPeerConnectionEvents(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await DirectP2PTransport.waitForCandidates(pc);

    const localDesc = pc.localDescription;
    if (!localDesc) {
      throw new Error('Failed to generate local offer description');
    }

    const payload = {
      type: localDesc.type,
      sdp: localDesc.sdp,
    };

    const offerCode = DirectP2PTransport.encodeToken(payload);
    const qrDataUrl = await QRCode.toDataURL(offerCode, {
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#f8fafc',
      },
    });

    return { offerCode, qrDataUrl };
  }

  /**
   * 2. GUEST: Accepts Host's Offer code and returns the Answer code + QR code
   */
  public async acceptHostOffer(offerCode: string): Promise<DirectAnswerResult> {
    this.cleanup();
    this.isHost = false;

    const offerDesc = DirectP2PTransport.decodeToken(offerCode);
    if (!offerDesc || offerDesc.type !== 'offer') {
      throw new Error('Invalid host connection code (not an offer)');
    }

    const pc = new RTCPeerConnection({ iceServers: [] });
    this.pc = pc;

    // Listen for data channel created by host
    pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel);
    };

    this.setupPeerConnectionEvents(pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await DirectP2PTransport.waitForCandidates(pc);

    const localDesc = pc.localDescription;
    if (!localDesc) {
      throw new Error('Failed to generate local answer description');
    }

    const payload = {
      type: localDesc.type,
      sdp: localDesc.sdp,
    };

    const answerCode = DirectP2PTransport.encodeToken(payload);
    const qrDataUrl = await QRCode.toDataURL(answerCode, {
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#f8fafc',
      },
    });

    return { answerCode, qrDataUrl };
  }

  /**
   * 3. HOST: Accepts Guest's Answer code to finalize the direct connection
   */
  public async finalizeGuestAnswer(answerCode: string): Promise<void> {
    if (!this.pc) {
      throw new Error('No active peer connection to finalize answer');
    }

    const answerDesc = DirectP2PTransport.decodeToken(answerCode);
    if (!answerDesc || answerDesc.type !== 'answer') {
      throw new Error('Invalid guest connection code (not an answer)');
    }

    await this.pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
  }

  /**
   * Send game packet directly over local Wi-Fi without server
   */
  public send(packet: NetworkPacket): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return false;
    }
    try {
      this.dataChannel.send(JSON.stringify(packet));
      return true;
    } catch (e) {
      console.warn('[DirectP2P] Send failed:', e);
      return false;
    }
  }

  private setupDataChannel(dc: RTCDataChannel) {
    this.dataChannel = dc;

    dc.onopen = () => {
      this.events.onConnected();
      this.startPingLoop();
    };

    dc.onclose = () => {
      this.stopPingLoop();
      this.events.onDisconnected('Direct Wi-Fi channel closed');
    };

    dc.onerror = (e) => {
      console.warn('[DirectP2P] Channel error:', e);
      this.events.onError('Direct channel connection error');
    };

    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === 'object') {
          // Internal latency ping/pong
          if (data.type === '_DIRECT_PING') {
            dc.send(JSON.stringify({ type: '_DIRECT_PONG', orig: data.orig }));
            return;
          }
          if (data.type === '_DIRECT_PONG') {
            const rtt = Math.max(1, Date.now() - data.orig);
            this.events.onLatencyUpdate(rtt);
            return;
          }
          this.events.onPacket(data as NetworkPacket);
        }
      } catch (err) {
        console.warn('[DirectP2P] Failed to parse message:', err);
      }
    };
  }

  private setupPeerConnectionEvents(pc: RTCPeerConnection) {
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.events.onDisconnected(`PeerConnection ${pc.connectionState}`);
      }
    };
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingIntervalId = window.setInterval(() => {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.lastPingSentTime = Date.now();
        this.dataChannel.send(JSON.stringify({ type: '_DIRECT_PING', orig: this.lastPingSentTime }));
      }
    }, 2000);
  }

  private stopPingLoop() {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  public cleanup() {
    this.stopPingLoop();
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
  }
}
