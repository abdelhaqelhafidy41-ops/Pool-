/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameMode, Language, Player, RuleVariant, TournamentMatch } from '../types/game';
import { DiscoveredRoom, MatchRounds } from '../types/network';
import { LocalTransport } from '../network/localTransport';
import { DirectP2PTransport, DirectOfferResult, DirectAnswerResult } from '../network/directP2P';
import { TournamentEngine } from '../tournaments/tournamentEngine';
import { soundFX } from '../audio/soundFX';

interface LocalMultiplayerModalProps {
  player1: Player;
  onStartLanHost: (config: {
    roomCode: string;
    mode: GameMode;
    ruleVariant: RuleVariant;
    rounds: MatchRounds;
  }) => void;
  onJoinLanRoom: (roomCode: string) => void;
  onStartDirectP2PMatch?: (
    directP2P: DirectP2PTransport,
    isHost: boolean,
    config: {
      roomCode: string;
      mode: GameMode;
      ruleVariant: RuleVariant;
      rounds: MatchRounds;
      isTournament?: boolean;
      tournamentType?: '2p' | '4p';
    }
  ) => void;
  onStartHotSeat: (mode: GameMode, variant: RuleVariant) => void;
  onClose: () => void;
  language: Language;
}

export const LocalMultiplayerModal: React.FC<LocalMultiplayerModalProps> = ({
  player1,
  onStartLanHost,
  onJoinLanRoom,
  onStartDirectP2PMatch,
  onStartHotSeat,
  onClose,
  language,
}) => {
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState<'direct_p2p' | 'wifi_tournament' | 'wifi_lan' | 'hotseat'>('direct_p2p');

  // Common Match Settings
  const [matchMode, setMatchMode] = useState<GameMode>('8ball');
  const [ruleVariant, setRuleVariant] = useState<RuleVariant>('wpa_official');
  const [matchRounds, setMatchRounds] = useState<MatchRounds>(3);

  // --- 1. Direct P2P State (Zero server, offline WebRTC) ---
  const [p2pRole, setP2pRole] = useState<'host' | 'guest'>('host');
  const [hostOfferResult, setHostOfferResult] = useState<DirectOfferResult | null>(null);
  const [guestInputOffer, setGuestInputOffer] = useState('');
  const [guestAnswerResult, setGuestAnswerResult] = useState<DirectAnswerResult | null>(null);
  const [hostInputAnswer, setHostInputAnswer] = useState('');
  const [p2pConnected, setP2pConnected] = useState(false);
  const [p2pStatus, setP2pStatus] = useState<string>('');
  const [p2pLatency, setP2pLatency] = useState<number>(0);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const directP2PRef = useRef<DirectP2PTransport | null>(null);

  // Initialize P2P Transport instance
  useEffect(() => {
    const transport = new DirectP2PTransport({
      onConnected: () => {
        setP2pConnected(true);
        setP2pStatus(isRTL ? 'متصل بنجاح مباشرة بين الجهازين عبر Wi-Fi!' : 'Connected directly device-to-device via Wi-Fi!');
        soundFX.playVictoryChime();
      },
      onDisconnected: (reason) => {
        setP2pConnected(false);
        setP2pStatus(reason || (isRTL ? 'انقطع الاتصال المباشر' : 'Direct connection disconnected'));
      },
      onPacket: () => {},
      onLatencyUpdate: (lat) => {
        setP2pLatency(lat);
      },
      onError: (err) => {
        setP2pStatus(err);
      },
    });
    directP2PRef.current = transport;

    return () => {
      // Don't kill if user launches match into App.tsx
    };
  }, [isRTL]);

  // Host: Generate Offer
  const handleHostCreateOffer = async () => {
    if (!directP2PRef.current) return;
    try {
      soundFX.playButtonClick();
      setP2pStatus(isRTL ? 'جاري تجهيز رمز وقناة الاتصال المباشر...' : 'Generating direct local offer...');
      const res = await directP2PRef.current.createDirectOffer();
      setHostOfferResult(res);
      setP2pStatus(isRTL ? 'تم تجهيز الرمز! اطلب من الخصم مسح QR أو لصق الرمز.' : 'Offer ready! Ask guest to scan QR or paste token.');
    } catch (e: any) {
      setP2pStatus(e?.message || 'Failed to create offer');
    }
  };

  // Guest: Process Host's Offer & Generate Answer
  const handleGuestAcceptOffer = async () => {
    if (!directP2PRef.current || !guestInputOffer.trim()) return;
    try {
      soundFX.playButtonClick();
      setP2pStatus(isRTL ? 'جاري معالجة رمز المضيف وتوليد الرد...' : 'Processing offer & creating answer...');
      const res = await directP2PRef.current.acceptHostOffer(guestInputOffer.trim());
      setGuestAnswerResult(res);
      setP2pStatus(isRTL ? 'تم توليد رمز الرد! اطلب من المضيف إدخال رمزك لإتمام الاتصال.' : 'Answer generated! Show QR/token to host to finalize.');
    } catch (e: any) {
      setP2pStatus(isRTL ? 'رمز المضيف غير صالح أو انتهت صلاحيته' : 'Invalid host token: ' + e?.message);
    }
  };

  // Host: Finalize with Guest's Answer
  const handleHostFinalizeAnswer = async () => {
    if (!directP2PRef.current || !hostInputAnswer.trim()) return;
    try {
      soundFX.playButtonClick();
      setP2pStatus(isRTL ? 'جاري إتمام الربط المباشر...' : 'Finalizing direct connection...');
      await directP2PRef.current.finalizeGuestAnswer(hostInputAnswer.trim());
    } catch (e: any) {
      setP2pStatus(isRTL ? 'رمز الرد غير صالح' : 'Invalid answer token: ' + e?.message);
    }
  };

  // Launch Direct Match into Game
  const handleLaunchDirectMatch = (isTournament: boolean = false, tourneyType: '2p' | '4p' = '2p') => {
    if (!directP2PRef.current || !p2pConnected) return;
    soundFX.playButtonClick();
    if (onStartDirectP2PMatch) {
      onStartDirectP2PMatch(directP2PRef.current, p2pRole === 'host', {
        roomCode: 'DIRECT_P2P',
        mode: matchMode,
        ruleVariant,
        rounds: matchRounds,
        isTournament,
        tournamentType: tourneyType,
      });
    }
  };

  // --- 2. Wi-Fi Tournament State (2P or 4P) ---
  const [tourneySize, setTourneySize] = useState<'2p' | '4p'>('2p');
  const [tourneyP3Name, setTourneyP3Name] = useState('طارق الصقر');
  const [tourneyP4Name, setTourneyP4Name] = useState('زيد القناص');

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2500);
      soundFX.playButtonClick();
    }
  };

  // Paste helper
  const pasteFromClipboard = async (setter: (val: string) => void) => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        setter(text);
        soundFX.playButtonClick();
      }
    } catch {}
  };

  // --- 3. LAN Room Discovery (Legacy/Alternative) ---
  const [customRoomCode, setCustomRoomCode] = useState(
    () => 'POOL' + Math.floor(10 + Math.random() * 90)
  );
  const [manualCode, setManualCode] = useState('');
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredRoom[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    let transport: LocalTransport | null = null;
    if (activeTab === 'wifi_lan') {
      transport = new LocalTransport({
        onStateChange: () => {},
        onPacket: () => {},
        onDiscoveredRoomsUpdate: (rooms) => {
          setDiscoveredRooms(rooms);
        },
        onReconnectionCountdown: () => {},
      });
      transport.startDiscovery();
      setIsDiscovering(true);
    }

    return () => {
      if (transport) {
        transport.stopDiscovery();
      }
    };
  }, [activeTab]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📡</span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                {isRTL ? 'اللعب الجماعي المحلي Wi-Fi (أوفلاين)' : 'Offline Local Wi-Fi Multiplayer'}
              </h2>
              <span className="text-[11px] text-emerald-400 font-medium">
                {isRTL ? 'اتصال مباشر بين الهاتفين دون خوادم أو طرف ثالث' : '100% Direct P2P · Zero Third-Party Server'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-2.5 border-b border-slate-800 text-xs font-semibold bg-slate-950/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('direct_p2p');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'direct_p2p'
                ? 'border-emerald-400 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📡</span>
            <span>{isRTL ? 'اتصال Wi-Fi مباشر (بدون طرف ثالث)' : 'Direct Wi-Fi P2P (No Server)'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('wifi_tournament');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'wifi_tournament'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏆</span>
            <span>{isRTL ? 'بطولة Wi-Fi محلية (2 أو 4 لاعبين)' : 'Local Wi-Fi Tournament (2P/4P)'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('wifi_lan');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'wifi_lan'
                ? 'border-sky-400 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚡</span>
            <span>{isRTL ? 'رمز الغرفة السريع' : 'Fast Room Code'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('hotseat');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'hotseat'
                ? 'border-purple-400 text-purple-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👥</span>
            <span>{isRTL ? 'شاشة واحدة (احتياطي)' : 'Pass & Play'}</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: Direct P2P (Pure Offline Wi-Fi / Hotspot)        */}
        {/* ======================================================== */}
        {activeTab === 'direct_p2p' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Guarantee Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">🛡️</span>
              <p className="leading-relaxed">
                {isRTL
                  ? 'اتصال مباشر من جهاز إلى جهاز (Direct Peer-to-Peer): يعمل على شبكة الراوتر المنزلية أو نقطة اتصال الهاتف (Mobile Hotspot) بدون إنترنت وبدون أي خادم طرف ثالث. تبادل الرمز مرة واحدة ثم العب بسرعة استجابة فائقة.'
                  : 'Direct Peer-to-Peer: Operates over your Wi-Fi router or phone hotspot with zero internet and zero third-party server. Exchange the token once, then enjoy instantaneous low-latency gameplay.'}
              </p>
            </div>

            {/* Role Switcher: Host vs Guest */}
            <div className="flex rounded-2xl bg-slate-950 border border-slate-800 p-1">
              <button
                onClick={() => {
                  setP2pRole('host');
                  soundFX.playButtonClick();
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  p2pRole === 'host'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👑 {isRTL ? 'الجهاز الأول: المضيف (Host)' : 'Device 1: Host'}
              </button>
              <button
                onClick={() => {
                  setP2pRole('guest');
                  soundFX.playButtonClick();
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  p2pRole === 'guest'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 {isRTL ? 'الجهاز الثاني: المنضم (Guest)' : 'Device 2: Guest'}
              </button>
            </div>

            {/* Connection Status Banner */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                p2pConnected
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    p2pConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="font-semibold">
                  {p2pConnected
                    ? isRTL ? 'تم الاتصال المباشر بنجاح! جاهز للعب.' : 'Direct Wi-Fi connected! Ready to play.'
                    : p2pStatus || (isRTL ? 'في انتظار إتمام التوصيل...' : 'Waiting for pairing...')}
                </span>
              </div>
              {p2pConnected && (
                <span className="text-[10px] font-mono text-emerald-300">
                  ⚡ {p2pLatency > 0 ? `${p2pLatency}ms` : 'LAN Direct'}
                </span>
              )}
            </div>

            {/* Role 1: HOST FLOW */}
            {p2pRole === 'host' && (
              <div className="p-4 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {isRTL ? 'الخطوة 1: توليد رمز وبث الاتصال' : 'Step 1: Generate Host Code & QR'}
                  </span>
                  {!hostOfferResult && (
                    <button
                      onClick={handleHostCreateOffer}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all active:scale-95"
                    >
                      {isRTL ? 'توليد الرمز المباشر' : 'Generate Token'}
                    </button>
                  )}
                </div>

                {hostOfferResult && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                      {hostOfferResult.qrDataUrl && (
                        <div className="p-1 bg-white rounded-xl shadow-lg shrink-0">
                          <img
                            src={hostOfferResult.qrDataUrl}
                            alt="Connection QR"
                            className="w-36 h-36 object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2 text-xs">
                        <span className="text-slate-300 font-medium block">
                          {isRTL
                            ? 'امسح رمز QR من الجهاز الآخر، أو انسخ هذا الرمز المختصر:'
                            : 'Scan this QR code from Device 2, or copy the direct token:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={hostOfferResult.offerCode}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-amber-300 select-all outline-none"
                          />
                          <button
                            onClick={() => copyToClipboard(hostOfferResult.offerCode, 'offer')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-[11px] whitespace-nowrap"
                          >
                            {copyFeedback === 'offer' ? (isRTL ? '✓ تم النسخ' : '✓ Copied') : (isRTL ? 'نسخ' : 'Copy')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Paste Guest Answer */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">
                        {isRTL ? 'الخطوة 2: أدخل رمز الرد من الجهاز الآخر (Guest Answer):' : 'Step 2: Enter Guest Answer Token:'}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={hostInputAnswer}
                          onChange={(e) => setHostInputAnswer(e.target.value)}
                          placeholder={isRTL ? 'الصق رمز الرد هنا...' : 'Paste guest answer token here...'}
                          className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                        />
                        <button
                          onClick={() => pasteFromClipboard(setHostInputAnswer)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                        >
                          {isRTL ? 'لصق' : 'Paste'}
                        </button>
                        <button
                          onClick={handleHostFinalizeAnswer}
                          disabled={!hostInputAnswer.trim() || p2pConnected}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          {isRTL ? 'تأكيد الربط' : 'Finalize'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Role 2: GUEST FLOW */}
            {p2pRole === 'guest' && (
              <div className="p-4 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  {isRTL ? 'الخطوة 1: أدخل رمز المضيف (Host Offer)' : 'Step 1: Enter Host Token'}
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={guestInputOffer}
                    onChange={(e) => setGuestInputOffer(e.target.value)}
                    placeholder={isRTL ? 'الصق رمز المضيف هنا...' : 'Paste host token here...'}
                    className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={() => pasteFromClipboard(setGuestInputOffer)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {isRTL ? 'لصق' : 'Paste'}
                  </button>
                  <button
                    onClick={handleGuestAcceptOffer}
                    disabled={!guestInputOffer.trim() || Boolean(guestAnswerResult)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {isRTL ? 'توليد الرد' : 'Create Answer'}
                  </button>
                </div>

                {guestAnswerResult && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    <span className="text-xs font-bold text-slate-300 block">
                      {isRTL ? 'الخطوة 2: اعرض هذا الرمز أو شاركه مع المضيف:' : 'Step 2: Share this Answer token with Host:'}
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                      {guestAnswerResult.qrDataUrl && (
                        <div className="p-1 bg-white rounded-xl shadow-lg shrink-0">
                          <img
                            src={guestAnswerResult.qrDataUrl}
                            alt="Answer QR"
                            className="w-36 h-36 object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2 text-xs">
                        <span className="text-slate-300 font-medium block">
                          {isRTL ? 'رمز الرد جاهز للنسخ:' : 'Answer token ready:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={guestAnswerResult.answerCode}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-amber-300 select-all outline-none"
                          />
                          <button
                            onClick={() => copyToClipboard(guestAnswerResult.answerCode, 'answer')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-[11px] whitespace-nowrap"
                          >
                            {copyFeedback === 'answer' ? (isRTL ? '✓ تم النسخ' : '✓ Copied') : (isRTL ? 'نسخ' : 'Copy')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Launch Game Button */}
            <div className="pt-2">
              <button
                onClick={() => handleLaunchDirectMatch(false)}
                disabled={!p2pConnected}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/60 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>🎱</span>
                <span>
                  {p2pConnected
                    ? isRTL ? 'بدء مباراة Wi-Fi المباشرة الآن!' : 'Start Direct Wi-Fi Match Now!'
                    : isRTL ? 'بانتظار إتمام التوصيل للبدء...' : 'Waiting for connection to start...'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: Local Wi-Fi Tournament (2P or 4P)                */}
        {/* ======================================================== */}
        {activeTab === 'wifi_tournament' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">🏆</span>
              <p className="leading-relaxed">
                {isRTL
                  ? 'بطولة Wi-Fi محلية أوفلاين: اختر بطولة ثنائية (سلسلة حاسمة من عدة أشواط) أو بطولة رباعية (نصف نهائي + نهائي كأس). تدعم المزامنة المباشرة بين الجهازين.'
                  : 'Offline Wi-Fi Tournament: Choose between a 2-Player Championship Series or a 4-Player Bracket (Semifinals + Grand Final) with direct Wi-Fi sync.'}
              </p>
            </div>

            {/* Tournament Type Picker */}
            <div className="p-4 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                {isRTL ? 'نوع البطولة المحلية:' : 'Tournament Format:'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setTourneySize('2p');
                    soundFX.playButtonClick();
                  }}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                    tourneySize === '2p'
                      ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">🥇</span>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isRTL ? 'بطولة ثنائية (2 لاعبين)' : '2-Player Championship'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {isRTL ? 'سلسلة مواجهة مباشرة (Best of 3 أو 5) لحسم اللقب' : 'Head-to-head title series (Best of 3 or 5)'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTourneySize('4p');
                    soundFX.playButtonClick();
                  }}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                    tourneySize === '4p'
                      ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">🏆</span>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isRTL ? 'بطولة رباعية (4 لاعبين)' : '4-Player Cup Tournament'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {isRTL ? 'نصف النهائي (مباراتان) + النهائي الكبير والتتويج' : 'Semifinals (2 matches) + Grand Championship'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Extra 4P Contenders names */}
              {tourneySize === '4p' && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">{isRTL ? 'اسم المنافس 3:' : 'Player 3 Name:'}</span>
                    <input
                      type="text"
                      value={tourneyP3Name}
                      onChange={(e) => setTourneyP3Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">{isRTL ? 'اسم المنافس 4:' : 'Player 4 Name:'}</span>
                    <input
                      type="text"
                      value={tourneyP4Name}
                      onChange={(e) => setTourneyP4Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Launch Tournament CTA */}
            <button
              onClick={() => handleLaunchDirectMatch(true, tourneySize)}
              disabled={!p2pConnected}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-amber-950/60 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>🏆</span>
              <span>
                {p2pConnected
                  ? isRTL ? `بدء بطولة Wi-Fi (${tourneySize === '2p' ? '2 لاعبين' : '4 لاعبين'})` : `Launch Wi-Fi Tournament (${tourneySize.toUpperCase()})`
                  : isRTL ? 'يرجى ربط الجهازين في تبويب "اتصال Wi-Fi مباشر" أولاً' : 'Pair devices in Direct Wi-Fi tab first'}
              </span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: Fast LAN Room Code (Alternative)                  */}
        {/* ======================================================== */}
        {activeTab === 'wifi_lan' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="p-4 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                {isRTL ? 'إنشاء غرفة سريعة برمز' : 'Host Fast Room Code'}
              </span>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-400">{isRTL ? 'الرمز:' : 'Code:'}</span>
                  <input
                    type="text"
                    value={customRoomCode}
                    onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-20 bg-transparent font-mono font-bold text-amber-300 text-sm outline-none"
                  />
                </div>

                <button
                  onClick={() => {
                    soundFX.playButtonClick();
                    onStartLanHost({
                      roomCode: customRoomCode.trim().toUpperCase(),
                      mode: matchMode,
                      ruleVariant,
                      rounds: matchRounds,
                    });
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs uppercase shadow transition-all active:scale-98"
                >
                  🚀 {isRTL ? 'فتح الغرفة وانتظار الخصم' : 'Host Room'}
                </button>
              </div>
            </div>

            {/* Manual Join */}
            <div className="p-4 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                {isRTL ? 'انضمام برمز الغرفة:' : 'Join Room with Code:'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder={isRTL ? 'أدخل الرمز (مثال: POOL42)' : 'Enter room code (e.g. POOL42)'}
                  className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-sky-400"
                />
                <button
                  onClick={() => {
                    if (manualCode.trim()) {
                      soundFX.playButtonClick();
                      onJoinLanRoom(manualCode.trim().toUpperCase());
                    }
                  }}
                  disabled={!manualCode.trim()}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 rounded-xl text-xs font-bold transition-colors"
                >
                  {isRTL ? 'اتصال' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: Pass & Play Fallback                              */}
        {/* ======================================================== */}
        {activeTab === 'hotseat' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">👥</span>
              <p className="leading-relaxed">
                {isRTL
                  ? 'اللعب المحلي على نفس الجهاز (Pass & Play): خيار بديل للاعبين يتشاركان نفس الشاشة بالتناوب مع الحفاظ على القواعد وفيزياء الطاولة الواقعية.'
                  : 'Pass & Play: Alternate turns on the same device screen with full physics and official rules.'}
              </p>
            </div>

            <button
              onClick={() => {
                soundFX.playButtonClick();
                onStartHotSeat(matchMode, ruleVariant);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm uppercase shadow-lg shadow-purple-950/60 active:scale-98 transition-all text-center"
            >
              🎱 {isRTL ? 'بدء مباراة لاعبان على نفس الشاشة' : 'Start Pass & Play Match'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
