/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { GameMode, Language, Player, RuleVariant } from '../types/game';
import { DiscoveredRoom, MatchRounds } from '../types/network';
import { LocalTransport } from '../network/localTransport';
import { soundFX } from '../audio/soundFX';

interface LocalMultiplayerModalProps {
  player1: Player;
  onStartLanHost: (config: {
    roomCode: string;
    mode: GameMode;
    ruleVariant: RuleVariant;
    rounds: MatchRounds;
    isTournament?: boolean;
    tournamentType?: '2p' | '4p';
  }) => void;
  onJoinLanRoom: (roomCode: string) => void;
  onStartHotSeat: (mode: GameMode, variant: RuleVariant) => void;
  onClose: () => void;
  language: Language;
}

export const LocalMultiplayerModal: React.FC<LocalMultiplayerModalProps> = ({
  player1,
  onStartLanHost,
  onJoinLanRoom,
  onStartHotSeat,
  onClose,
  language,
}) => {
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState<'tournaments' | 'matches' | 'hotseat'>('tournaments');

  // Match / Tournament Setup
  const [matchMode, setMatchMode] = useState<GameMode>('8ball');
  const [ruleVariant, setRuleVariant] = useState<RuleVariant>('wpa_official');
  const [matchRounds, setMatchRounds] = useState<MatchRounds>(3);
  const [tourneyType, setTourneyType] = useState<'2p' | '4p'>('2p');

  // Short Room Code (e.g. POOL42 or CUP77 or 4-digit PIN)
  const [roomCode, setRoomCode] = useState<string>(() => {
    const letters = ['POOL', 'CUP', 'PRO', 'STAR'];
    const prefix = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(10 + Math.random() * 90);
    return `${prefix}${num}`;
  });

  // Small QR Thumbnail Data URL (encoded purely from the short code)
  const [miniQrUrl, setMiniQrUrl] = useState<string>('');
  const [showQrPreview, setShowQrPreview] = useState<boolean>(false);

  // Manual Join Input & Discovered Rooms
  const [manualCode, setManualCode] = useState<string>('');
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredRoom[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Generate very small, crisp QR thumbnail for the short code
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(roomCode, {
      width: 120,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#f8fafc',
      },
    }).then((url) => {
      if (active) setMiniQrUrl(url);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [roomCode]);

  // Live LAN Discovery Scanner
  useEffect(() => {
    const transport = new LocalTransport({
      onStateChange: () => {},
      onPacket: () => {},
      onDiscoveredRoomsUpdate: (rooms) => {
        setDiscoveredRooms(rooms);
      },
      onReconnectionCountdown: () => {},
    });
    transport.startDiscovery();
    setIsDiscovering(true);

    return () => {
      transport.stopDiscovery();
    };
  }, []);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      soundFX.playButtonClick();
    }
  };

  const handlePasteCode = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setManualCode(text.trim().toUpperCase());
          soundFX.playButtonClick();
        }
      }
    } catch {}
  };

  const handleCreateHost = (isTournament: boolean) => {
    soundFX.playButtonClick();
    onStartLanHost({
      roomCode: roomCode.trim().toUpperCase(),
      mode: matchMode,
      ruleVariant,
      rounds: matchRounds,
      isTournament,
      tournamentType: tourneyType,
    });
  };

  const handleJoin = (codeToJoin: string) => {
    if (!codeToJoin.trim()) return;
    soundFX.playButtonClick();
    onJoinLanRoom(codeToJoin.trim().toUpperCase());
  };

  const generateNewCode = () => {
    soundFX.playButtonClick();
    const letters = ['POOL', 'CUP', 'PRO', 'STAR'];
    const prefix = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setRoomCode(`${prefix}${num}`);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏆</span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                {isRTL ? 'اللعب الجماعي والبطولات (Wi-Fi أوفلاين)' : 'Local Wi-Fi Multiplayer & Tournaments'}
              </h2>
              <span className="text-[11px] text-amber-400 font-medium">
                {isRTL ? 'رمز صغير وبسيط في كل البطولات والمباريات' : 'Simple Short Code for All Tournaments & Matches'}
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
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-2.5 border-b border-slate-800 text-xs font-semibold bg-slate-950/40">
          <button
            onClick={() => {
              setActiveTab('tournaments');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'tournaments'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏆</span>
            <span>{isRTL ? 'بطولة Wi-Fi (2 أو 4 لاعبين)' : 'Wi-Fi Tournament (2P/4P)'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('matches');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'matches'
                ? 'border-sky-400 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📡</span>
            <span>{isRTL ? 'مباراة ودية (1 ضد 1)' : 'Wi-Fi Match (1v1)'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('hotseat');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'hotseat'
                ? 'border-purple-400 text-purple-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👥</span>
            <span>{isRTL ? 'جهاز واحد' : 'Pass & Play'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ======================================================== */}
          {/* TAB 1: Wi-Fi Tournaments (2P or 4P with Short Code)     */}
          {/* ======================================================== */}
          {activeTab === 'tournaments' && (
            <div className="space-y-4">
              {/* Tournament Size Picker */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setTourneyType('2p');
                    soundFX.playButtonClick();
                  }}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 ${
                    tourneyType === '2p'
                      ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xl">🥇</span>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isRTL ? 'بطولة 2 لاعبين' : '2-Player Tourney'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {isRTL ? 'سلسلة حاسمة Best of 3' : 'Championship Series'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTourneyType('4p');
                    soundFX.playButtonClick();
                  }}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 ${
                    tourneyType === '4p'
                      ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xl">🏆</span>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isRTL ? 'بطولة 4 لاعبين' : '4-Player Cup'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {isRTL ? 'نصف النهائي والنهائي' : 'Semifinals & Final'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Host Tournament Card (Prominent Short Code) */}
              <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👑</span>
                    <span>{isRTL ? 'استضافة البطولة برمز قصير' : 'Host Tournament with Short Code'}</span>
                  </span>
                  <button
                    onClick={generateNewCode}
                    className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                  >
                    <span>🔄</span>
                    <span>{isRTL ? 'رمز جديد' : 'New Code'}</span>
                  </button>
                </div>

                {/* The Clean Short Code Box (With Optional Mini QR thumbnail) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block">
                      {isRTL ? 'رمز البطولة للمشاركة مع الخصم:' : 'Tournament code to share:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xl text-amber-300 tracking-wider bg-slate-950 px-3 py-1 rounded-xl border border-amber-500/40 shadow-inner">
                        {roomCode}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all"
                      >
                        {copyFeedback ? (isRTL ? '✓ تم النسخ' : '✓ Copied') : (isRTL ? 'نسخ' : 'Copy')}
                      </button>
                    </div>
                  </div>

                  {/* Tiny QR Thumbnail badge */}
                  {miniQrUrl && (
                    <div
                      onClick={() => setShowQrPreview(!showQrPreview)}
                      className="cursor-pointer group flex flex-col items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 hover:border-amber-400 transition-all shrink-0"
                      title={isRTL ? 'انقر لتكبير/تصغير الرمز' : 'Click to preview mini QR'}
                    >
                      <img
                        src={miniQrUrl}
                        alt="Mini QR"
                        className="w-12 h-12 object-contain rounded-md"
                      />
                      <span className="text-[9px] text-slate-400 group-hover:text-amber-300 mt-0.5">
                        {isRTL ? 'QR صغير' : 'Mini QR'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded QR Preview if clicked */}
                {showQrPreview && miniQrUrl && (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/40 flex items-center justify-center gap-4 animate-fadeIn">
                    <div className="p-1 bg-white rounded-xl shadow-md">
                      <img src={miniQrUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                    </div>
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-white block">
                        {isRTL ? `رمز الغرفة: ${roomCode}` : `Code: ${roomCode}`}
                      </span>
                      <span className="text-slate-400 text-[11px] block">
                        {isRTL ? 'رمز صغير وسريع للمسح بالكاميرا' : 'Compact code for quick camera scan'}
                      </span>
                      <button
                        onClick={() => setShowQrPreview(false)}
                        className="text-xs text-amber-400 underline"
                      >
                        {isRTL ? 'إخفاء' : 'Close preview'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Launch Button */}
                <button
                  onClick={() => handleCreateHost(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/60 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <span>🏆</span>
                  <span>
                    {isRTL
                      ? `فتح غرفة البطولة بالرمز (${roomCode})`
                      : `Open Tournament Room (${roomCode})`}
                  </span>
                </button>
              </div>

              {/* Guest Join with Short Code */}
              <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  {isRTL ? 'الانضمام إلى بطولة برمز الخصم:' : 'Join Tournament with Code:'}
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder={isRTL ? 'أدخل رمز البطولة (مثال: POOL42)' : 'Enter code (e.g. POOL42)'}
                    className="flex-1 bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 outline-none focus:border-amber-400 uppercase"
                  />
                  <button
                    onClick={handlePasteCode}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {isRTL ? 'لصق' : 'Paste'}
                  </button>
                  <button
                    onClick={() => handleJoin(manualCode)}
                    disabled={!manualCode.trim()}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase transition-all active:scale-95"
                  >
                    {isRTL ? 'دخول' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: Regular Wi-Fi Matches (1v1 Friendly)             */}
          {/* ======================================================== */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              {/* Host 1v1 Card */}
              <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👑</span>
                    <span>{isRTL ? 'استضافة مباراة ودية برمز قصير' : 'Host Match with Short Code'}</span>
                  </span>
                  <button
                    onClick={generateNewCode}
                    className="text-[11px] text-slate-400 hover:text-sky-300 transition-colors flex items-center gap-1"
                  >
                    <span>🔄</span>
                    <span>{isRTL ? 'رمز جديد' : 'New Code'}</span>
                  </button>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">{isRTL ? 'النمط:' : 'Mode:'}</span>
                    <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                      <button
                        onClick={() => setMatchMode('8ball')}
                        className={`flex-1 py-1 rounded-lg font-semibold ${
                          matchMode === '8ball' ? 'bg-sky-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        8-Ball
                      </button>
                      <button
                        onClick={() => setMatchMode('9ball')}
                        className={`flex-1 py-1 rounded-lg font-semibold ${
                          matchMode === '9ball' ? 'bg-sky-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        9-Ball
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">{isRTL ? 'الأشواط:' : 'Rounds:'}</span>
                    <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                      {([1, 3, 5] as MatchRounds[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setMatchRounds(r)}
                          className={`flex-1 py-1 rounded-lg font-semibold ${
                            matchRounds === r ? 'bg-sky-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Code & Launch */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block">{isRTL ? 'رمز الغرفة:' : 'Room Code:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xl text-sky-400 tracking-wider bg-slate-950 px-3 py-1 rounded-xl border border-sky-500/40">
                        {roomCode}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
                      >
                        {copyFeedback ? (isRTL ? '✓ تم' : '✓ Copied') : (isRTL ? 'نسخ' : 'Copy')}
                      </button>
                    </div>
                  </div>

                  {miniQrUrl && (
                    <div
                      onClick={() => setShowQrPreview(!showQrPreview)}
                      className="cursor-pointer flex flex-col items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0"
                    >
                      <img src={miniQrUrl} alt="Mini QR" className="w-12 h-12 object-contain rounded-md" />
                      <span className="text-[9px] text-slate-400 mt-0.5">{isRTL ? 'QR صغير' : 'Mini QR'}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleCreateHost(false)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs uppercase shadow-lg shadow-sky-950/60 active:scale-98 transition-all"
                >
                  🚀 {isRTL ? `فتح الغرفة بالرمز (${roomCode})` : `Open Room (${roomCode})`}
                </button>
              </div>

              {/* Join 1v1 Card */}
              <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  {isRTL ? 'الانضمام لمباراة برمز الغرفة:' : 'Join Match with Code:'}
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder={isRTL ? 'أدخل الرمز (مثال: POOL42)' : 'Enter room code'}
                    className="flex-1 bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 outline-none focus:border-sky-400 uppercase"
                  />
                  <button
                    onClick={handlePasteCode}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {isRTL ? 'لصق' : 'Paste'}
                  </button>
                  <button
                    onClick={() => handleJoin(manualCode)}
                    disabled={!manualCode.trim()}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    {isRTL ? 'دخول' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: Pass & Play Fallback                              */}
          {/* ======================================================== */}
          {activeTab === 'hotseat' && (
            <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 flex items-start gap-2">
                <span className="text-base shrink-0">👥</span>
                <p className="leading-relaxed">
                  {isRTL
                    ? 'اللعب على شاشة واحدة بالتناوب كخيار احتياطي ومحلي بالكامل بدون الحاجة لشبكة Wi-Fi.'
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
                🎱 {isRTL ? 'بدء اللعب على نفس الشاشة' : 'Start Pass & Play Match'}
              </button>
            </div>
          )}

          {/* Live Nearby Discovered Rooms Bar (Universal across tabs) */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>🔍</span>
                <span>{isRTL ? 'الغرف المكتشفة تلقائياً على الشبكة:' : 'Nearby Rooms on Wi-Fi:'}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{isDiscovering ? (isRTL ? 'بحث نشط' : 'Scanning') : ''}</span>
              </span>
            </div>

            {discoveredRooms.length > 0 ? (
              <div className="space-y-1.5">
                {discoveredRooms.map((room) => (
                  <div
                    key={room.roomCode}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-amber-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        {room.roomCode}
                      </span>
                      <span className="text-xs text-slate-200">
                        {room.hostName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({room.mode === '8ball' ? '8-Ball' : '9-Ball'})
                      </span>
                    </div>

                    <button
                      onClick={() => handleJoin(room.roomCode)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-transform active:scale-95"
                    >
                      {isRTL ? 'انضمام' : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 text-center py-1">
                {isRTL
                  ? 'لا توجد غرف معلنة حالياً. أنشئ غرفة برمزك أو أدخل رمز الخصم أعلاه.'
                  : 'No active rooms discovered. Host a room or enter opponent code above.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
