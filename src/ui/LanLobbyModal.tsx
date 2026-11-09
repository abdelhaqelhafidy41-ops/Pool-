/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language } from '../types/game';
import { soundFX } from '../audio/soundFX';
import { BluetoothAdapter, LocalLanNetworkAdapter } from '../network/networkAdapter';

interface LanLobbyModalProps {
  onJoinRoom: (roomId: string, isHost: boolean) => void;
  onClose: () => void;
  language: Language;
}

export const LanLobbyModal: React.FC<LanLobbyModalProps> = ({
  onJoinRoom,
  onClose,
  language,
}) => {
  const isRTL = language === 'ar';
  const [roomCode, setRoomCode] = useState('POOL' + Math.floor(100 + Math.random() * 900));
  const [inputCode, setInputCode] = useState('');
  const [bluetoothError, setBluetoothError] = useState<string | null>(null);

  const lanAdapter = new LocalLanNetworkAdapter();
  const btAdapter = new BluetoothAdapter();

  const handleCreateRoom = () => {
    soundFX.playButtonClick();
    onJoinRoom(roomCode, true);
  };

  const handleJoinExistingRoom = () => {
    if (!inputCode.trim()) return;
    soundFX.playButtonClick();
    onJoinRoom(inputCode.trim().toUpperCase(), false);
  };

  const handleTryBluetooth = async () => {
    soundFX.playButtonClick();
    try {
      await btAdapter.connect('', true);
    } catch (err: unknown) {
      soundFX.playFoulSound();
      setBluetoothError((err as Error).message || 'Bluetooth connection failed');
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>📡</span>
              <span>{isRTL ? 'شبكة Wi-Fi المحلية (Local LAN)' : 'Local Wi-Fi / LAN Room'}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Host a Room */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                {isRTL ? 'إنشاء غرفة محلية (Host)' : 'Create Local Room'}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {lanAdapter.isAvailable ? (isRTL ? 'جاهز للاتصال' : 'LAN Ready') : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isRTL
                ? 'أنشئ غرفة محلية وشارك الرمز مع صديقك المتصل بنفس شبكة Wi-Fi أو نفس الجهاز.'
                : 'Host a room and share the room code with another player on your local network.'}
            </p>
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-lg font-mono font-bold tracking-widest text-amber-300">
                {roomCode}
              </div>
              <button
                onClick={handleCreateRoom}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider shadow transition-all"
              >
                {isRTL ? 'فتح الغرفة وبدء اللعب' : 'Create & Play'}
              </button>
            </div>
          </div>

          {/* Join an Existing Room */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {isRTL ? 'الانضمام لغرفة (Join Room)' : 'Join Local Room'}
            </span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder={isRTL ? 'رمز الغرفة (مثال: POOL123)' : 'Room Code (e.g. POOL123)'}
                className="flex-1 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              <button
                onClick={handleJoinExistingRoom}
                disabled={!inputCode.trim()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:opacity-40 text-xs font-bold uppercase transition-all"
              >
                {isRTL ? 'انضمام' : 'Join'}
              </button>
            </div>
          </div>

          {/* Bluetooth Architecture Explanation & Bridge Test */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <span>📶</span>
                <span>{isRTL ? 'معلومات البلوتوث والمنصات (Bluetooth Notice)' : 'Bluetooth Transport Notice'}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Adapter Pattern</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isRTL
                ? 'تدعم متصفحات الويب معيار Web Bluetooth كعميل (Client) فقط، ولا تسمح بإنشاء خدمة بث (Peripheral Server) بدون تطبيق أندرويد مدمج (Android Native BLE Plugin). لذا فإن اتصال Wi-Fi/LAN و Pass & Play هما الأكثر استقراراً دون إنترنت.'
                : 'Web browsers only support Web Bluetooth as a Central Client, not as an Advertising Peripheral without an Android Native BLE Plugin. Local Wi-Fi/LAN and Pass & Play offer zero-latency local play.'}
            </p>
            <button
              onClick={handleTryBluetooth}
              className="text-[10px] text-amber-400/80 hover:text-amber-300 underline pt-1 block"
            >
              {isRTL ? 'اختبار فحص قدرات البلوتوث بالجهاز' : 'Probe Bluetooth Hardware Status'}
            </button>
            {bluetoothError && (
              <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2 rounded-lg mt-1">
                {bluetoothError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
