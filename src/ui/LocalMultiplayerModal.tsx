/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState<'wifi' | 'hotseat' | 'bluetooth'>('wifi');

  // Host Form State
  const [hostMode, setHostMode] = useState<GameMode>('8ball');
  const [hostVariant, setHostVariant] = useState<RuleVariant>('wpa_official');
  const [hostRounds, setHostRounds] = useState<MatchRounds>(3);
  const [customRoomCode, setCustomRoomCode] = useState(
    () => 'CUE-' + Math.floor(10 + Math.random() * 90)
  );

  // Manual Join Input
  const [manualCode, setManualCode] = useState('');

  // Local Discovery State
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredRoom[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Bluetooth Probing
  const [bluetoothSupported, setBluetoothSupported] = useState<boolean | null>(null);
  const [bluetoothProbeMsg, setBluetoothProbeMsg] = useState<string | null>(null);

  // Start live discovery on mount
  useEffect(() => {
    let transport: LocalTransport | null = null;
    if (activeTab === 'wifi') {
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

  const handleCreateHost = () => {
    soundFX.playButtonClick();
    onStartLanHost({
      roomCode: customRoomCode.trim().toUpperCase(),
      mode: hostMode,
      ruleVariant: hostVariant,
      rounds: hostRounds,
    });
  };

  const handleJoinDiscovered = (code: string) => {
    soundFX.playButtonClick();
    onJoinLanRoom(code);
  };

  const handleManualJoin = () => {
    if (!manualCode.trim()) return;
    soundFX.playButtonClick();
    onJoinLanRoom(manualCode.trim().toUpperCase());
  };

  const handleProbeBluetooth = async () => {
    soundFX.playButtonClick();
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      setBluetoothSupported(false);
      setBluetoothProbeMsg(
        isRTL
          ? 'المتصفح الحالي لا يدعم Web Bluetooth. حتى المتصفحات الداعمة تقتصر على عميل مركزي (Central Client) ولا يمكنها الإعلان كطرف طرفي (Peripheral Server) بدون إضافة نظام أصلية (Native Bridge).'
          : 'Navigator Bluetooth is unavailable in this environment. Note that even where Web Bluetooth exists, it only acts as Central Client and cannot advertise as Peripheral without Native OS plugins.'
      );
    } else {
      setBluetoothSupported(true);
      setBluetoothProbeMsg(
        isRTL
          ? 'تم الكشف عن واجهة Web Bluetooth (Client فقط). قيود الأمان في المتصفح تمنع إنشاء خادم/بث (Peripheral Advertising). يُرجى استخدام شبكة Wi-Fi/LAN أو اللعب على نفس الجهاز للعب الجماعي.'
          : 'Web Bluetooth API detected (Client Mode Only). Browser sandbox strictly prohibits Peripheral Advertising between devices without a native Capacitor/Android BLE bridge. Use Local Wi-Fi or Hot-Seat.'
      );
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📡</span>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isRTL ? 'اللعب الجماعي المحلي (Local Multiplayer)' : 'Local Multiplayer (No Internet)'}
              </h2>
              <span className="text-[11px] text-sky-400 font-medium">
                {isRTL ? '100% دون خوادم سحابية أو استهلاك للإنترنت' : '100% Offline · Zero Cloud Required'}
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
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 text-xs font-semibold bg-slate-950/40">
          <button
            onClick={() => {
              setActiveTab('wifi');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'wifi'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📡</span>
            <span>{isRTL ? 'شبكة Wi-Fi / LAN (الأساسي)' : 'Local Wi-Fi / LAN (Primary)'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('hotseat');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'hotseat'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👥</span>
            <span>{isRTL ? 'جهاز واحد (Pass & Play)' : 'Pass & Play (Hot-seat)'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('bluetooth');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'bluetooth'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📶</span>
            <span>{isRTL ? 'البلوتوث والقيود التقنية' : 'Bluetooth Architecture'}</span>
          </button>
        </div>

        {/* Tab 1: Local Wi-Fi / LAN */}
        {activeTab === 'wifi' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Explanatory Notice */}
            <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-800/60 text-xs text-sky-200 flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">ℹ️</span>
              <p className="leading-relaxed">
                {isRTL
                  ? 'اتصال Wi-Fi هنا يعني الشبكة المحلية (Local WLAN) بين الجهازين دون الحاجة لأي اتصال بالإنترنت أو خادم خارجي. يكفي وجود الجهازين على نفس الراوتر أو نقطة اتصال شخصية (Hotspot).'
                  : 'Wi-Fi here refers to the Local Area Network (LAN/WLAN) between two devices. No internet access or cloud server is needed; both devices simply share the same Wi-Fi router or phone hotspot.'}
              </p>
            </div>

            {/* Host Section */}
            <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>👑</span>
                  <span>{isRTL ? 'استضافة مباراة جديدة (Host Match)' : 'Host a Local Match'}</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  {isRTL ? 'المضيف هو الحكم (Authoritative)' : 'Host-Authoritative Master'}
                </span>
              </div>

              {/* Configurations: Mode, Rules, Rounds */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Game Mode */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">{isRTL ? 'النمط:' : 'Game Mode:'}</span>
                  <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                    <button
                      onClick={() => setHostMode('8ball')}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                        hostMode === '8ball' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      8-Ball
                    </button>
                    <button
                      onClick={() => setHostMode('9ball')}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                        hostMode === '9ball' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      9-Ball
                    </button>
                  </div>
                </div>

                {/* Rules Variant */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">{isRTL ? 'القواعد:' : 'Rule Variant:'}</span>
                  <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                    <button
                      onClick={() => setHostVariant('wpa_official')}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                        hostVariant === 'wpa_official' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      WPA
                    </button>
                    <button
                      onClick={() => setHostVariant('house_rules')}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                        hostVariant === 'house_rules' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isRTL ? 'منزلية' : 'House'}
                    </button>
                  </div>
                </div>

                {/* Rounds */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">{isRTL ? 'عدد الأشواط:' : 'Series Rounds:'}</span>
                  <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                    {([1, 3, 5] as MatchRounds[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setHostRounds(r)}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                          hostRounds === r ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {r === 1 ? '1' : `Best ${r}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Room Code & Launch CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-400">{isRTL ? 'رمز الغرفة:' : 'Room Code:'}</span>
                  <input
                    type="text"
                    value={customRoomCode}
                    onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-24 bg-transparent font-mono font-bold text-amber-300 text-sm outline-none"
                  />
                </div>

                <button
                  onClick={handleCreateHost}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-950/60 active:scale-98 transition-all"
                >
                  🚀 {isRTL ? 'فتح الغرفة وانتظار الخصم' : 'Host Room & Broadcast Beacon'}
                </button>
              </div>
            </div>

            {/* Live Discovered Rooms on LAN */}
            <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span>🔍</span>
                  <span>{isRTL ? 'الغرف المكتشفة على الشبكة المحلية' : 'Nearby Discovered Rooms (Live)'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-sky-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>{isDiscovering ? (isRTL ? 'جاري البحث...' : 'Scanning LAN...') : ''}</span>
                </span>
              </div>

              {discoveredRooms.length > 0 ? (
                <div className="space-y-2">
                  {discoveredRooms.map((room) => (
                    <div
                      key={room.roomCode}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-sky-500/80 flex items-center justify-between transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-amber-300">
                            {room.roomCode}
                          </span>
                          <span className="text-xs text-white font-semibold">
                            {isRTL ? `المضيف: ${room.hostName}` : `Host: ${room.hostName}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {room.mode === '8ball' ? '8-Ball' : '9-Ball'} · {room.ruleVariant === 'wpa_official' ? 'WPA' : 'House'} · {room.rounds === 1 ? '1 Frame' : `Best of ${room.rounds}`}
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinDiscovered(room.roomCode)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold uppercase transition-transform active:scale-95"
                      >
                        {isRTL ? 'انضمام' : 'Join'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                  {isRTL
                    ? 'لم يُعثر على غرف معلنة حالياً. يمكنك إدخال رمز الغرفة يدوياً أدناه أو استضافة مباراة بنفسك.'
                    : 'No advertised rooms discovered yet. You can enter a code manually below, or host a room above.'}
                </div>
              )}

              {/* Manual Join Code Input */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder={isRTL ? 'أدخل رمز الغرفة (مثال: CUE-42)' : 'Enter room code (e.g. CUE-42)'}
                  className="flex-1 bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-sky-400"
                />
                <button
                  onClick={handleManualJoin}
                  disabled={!manualCode.trim()}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  {isRTL ? 'اتصال' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pass & Play (Hot-seat fallback) */}
        {activeTab === 'hotseat' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">👥</span>
              <p className="leading-relaxed">
                {isRTL
                  ? 'اللعب المحلي على نفس الجهاز (Pass & Play): حل مثالي واحتياطي فوري إذا لم يتوفر أي راوتر أو شبكة Wi-Fi مشتركة. يتناوب اللاعبان على نفس الشاشة مع تطبيق كافة قواعد الفيزياء والمؤقت.'
                  : 'Pass & Play on this device: The foolproof local multiplayer backup when no Wi-Fi router is available. Two players alternate turns on the same device with realistic physics, timer, and full rules.'}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isRTL ? 'إعدادات مباراة اللاعبين' : 'Pass & Play Setup'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">{isRTL ? 'نوع اللعبة:' : 'Game Mode:'}</span>
                  <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                    <button
                      onClick={() => setHostMode('8ball')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        hostMode === '8ball' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      8-Ball Pool
                    </button>
                    <button
                      onClick={() => setHostMode('9ball')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        hostMode === '9ball' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      9-Ball Pool
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">{isRTL ? 'نوع القواعد:' : 'Rule Variant:'}</span>
                  <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                    <button
                      onClick={() => setHostVariant('wpa_official')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        hostVariant === 'wpa_official' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      WPA Official
                    </button>
                    <button
                      onClick={() => setHostVariant('house_rules')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        hostVariant === 'house_rules' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      House Rules
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  onStartHotSeat(hostMode, hostVariant);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/60 active:scale-98 transition-all text-center"
              >
                🎱 {isRTL ? 'بدء مباراة لاعبان على نفس الشاشة' : 'Start Pass & Play Match'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Bluetooth Architecture & Platform Limits */}
        {activeTab === 'bluetooth' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <div>
                <span className="font-bold block mb-0.5">
                  {isRTL ? 'توثيق أذونات وقيود البلوتوث التقنية' : 'Bluetooth P2P Technical Constraints & Platform Audit'}
                </span>
                <p className="leading-relaxed opacity-90 text-[11px]">
                  {isRTL
                    ? 'وفقاً لمواصفات W3C، تقتصر تقنية Web Bluetooth في المتصفحات على العمل كعميل مركزي (Central Client) للاتصال بأجهزة اللياقة والمستشعرات، ولا تدعم الإعلان كجهاز طرفي (Peripheral Server Mode). اللعب عبر البلوتوث المباشر يتطلب جسر نظام أصلي (Native OS Bridge).'
                    : 'Per W3C specs, Web Bluetooth API operates strictly as a Central Client for peripherals (heart rate monitors, sensors) and cannot advertise as a BLE Peripheral Server. True peer-to-peer Bluetooth requires native OS plugins.'}
                </p>
              </div>
            </div>

            {/* Platform Requirements Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isRTL ? 'متطلبات النقل الأصلي (Native Bridges)' : 'Native OS Bridge Specifications'}
              </h4>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-sky-400 font-bold">
                    <span>Android (API 31+ / Android 12+)</span>
                    <span className="text-[10px] text-slate-400">BLE L2CAP / RFCOMM</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Requires runtime permissions: <code className="text-amber-300">BLUETOOTH_SCAN</code>, <code className="text-amber-300">BLUETOOTH_ADVERTISE</code>, <code className="text-amber-300">BLUETOOTH_CONNECT</code>, and <code className="text-amber-300">ACCESS_FINE_LOCATION</code>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-sky-400 font-bold">
                    <span>Apple iOS / iPadOS</span>
                    <span className="text-[10px] text-slate-400">CoreBluetooth / Multipeer</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Requires <code className="text-amber-300">NSBluetoothAlwaysUsageDescription</code> key in Info.plist with MultipeerConnectivity fallback.
                  </p>
                </div>
              </div>

              {/* Hardware Probe Button */}
              <div className="pt-2">
                <button
                  onClick={handleProbeBluetooth}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>🔍</span>
                  <span>{isRTL ? 'فحص قدرات المتصفح الحالي' : 'Probe Current Browser Bluetooth Capabilities'}</span>
                </button>

                {bluetoothProbeMsg && (
                  <div className={`mt-2 p-3 rounded-xl text-[11px] border ${
                    bluetoothSupported ? 'bg-sky-950/40 border-sky-800 text-sky-200' : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}>
                    {bluetoothProbeMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
