/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types/game';
import { StorageManager, UserSaveData } from '../save/storage';
import { soundFX } from '../audio/soundFX';

export interface DailySpinModalProps {
  saveData: UserSaveData;
  onUpdateSaveData: (data: UserSaveData) => void;
  onClose: () => void;
  language: Language;
}

export interface WheelSegment {
  id: string;
  type: 'coins' | 'cue' | 'felt';
  value: number | string;
  label: string;
  labelAr: string;
  sublabel?: string;
  sublabelAr?: string;
  color: string;
  textColor: string;
  icon: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 'seg_100',
    type: 'coins',
    value: 100,
    label: '100 Coins',
    labelAr: '100 عملة',
    color: '#1e3a8a',
    textColor: '#93c5fd',
    icon: '🪙',
  },
  {
    id: 'seg_medium_cue',
    type: 'cue',
    value: 'cue_medium_striker',
    label: 'Cheetah Cue',
    labelAr: 'عصا الفهد',
    sublabel: 'Medium Cue',
    sublabelAr: 'عصا متوسطة',
    color: '#b45309',
    textColor: '#fef08a',
    icon: '🎱',
  },
  {
    id: 'seg_250',
    type: 'coins',
    value: 250,
    label: '250 Coins',
    labelAr: '250 عملة',
    color: '#065f46',
    textColor: '#6ee7b7',
    icon: '🪙',
  },
  {
    id: 'seg_turquoise_felt',
    type: 'felt',
    value: 'felt_ocean_turquoise',
    label: 'Azure Table',
    labelAr: 'طاولة فيروزية',
    sublabel: 'Special Table',
    sublabelAr: 'طاولة رائعة',
    color: '#0e7490',
    textColor: '#67e8f9',
    icon: '🟩',
  },
  {
    id: 'seg_500',
    type: 'coins',
    value: 500,
    label: '500 Coins',
    labelAr: '500 عملة',
    color: '#581c87',
    textColor: '#d8b4fe',
    icon: '🪙',
  },
  {
    id: 'seg_mega_1000',
    type: 'coins',
    value: 1000,
    label: '1,000 Coins',
    labelAr: '1,000 عملة',
    sublabel: 'Mega Prize',
    sublabelAr: 'جائزة كبرى',
    color: '#831843',
    textColor: '#f472b6',
    icon: '💎',
  },
  {
    id: 'seg_jackpot_2500',
    type: 'coins',
    value: 2500,
    label: '2,500 Coins',
    labelAr: '2,500 كوين',
    sublabel: 'JACKPOT',
    sublabelAr: 'الجاكبوت',
    color: '#d97706',
    textColor: '#ffffff',
    icon: '👑',
  },
  {
    id: 'seg_150',
    type: 'coins',
    value: 150,
    label: '150 Coins',
    labelAr: '150 عملة',
    color: '#1e293b',
    textColor: '#cbd5e1',
    icon: '🪙',
  },
];

export const DailySpinModal: React.FC<DailySpinModalProps> = ({
  saveData,
  onUpdateSaveData,
  onClose,
  language,
}) => {
  const isRTL = language === 'ar';
  const numSegments = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / numSegments;

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [winningSegment, setWinningSegment] = useState<WheelSegment | null>(null);
  const [claimMessage, setClaimMessage] = useState<{ en: string; ar: string } | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => StorageManager.getTimeUntilNextDailySpin());
  const canSpin = timeLeftMs <= 0;

  // Countdown timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = StorageManager.getTimeUntilNextDailySpin();
      setTimeLeftMs(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (ms: number): string => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpin = () => {
    if (isSpinning || !canSpin) return;

    soundFX.playButtonClick();
    setIsSpinning(true);
    setWinningSegment(null);
    setClaimMessage(null);

    // Pick a winning index (weighted slightly towards coins, but all achievable!)
    const rand = Math.random();
    let targetIndex = 0;
    if (rand < 0.28) {
      targetIndex = 0; // 100 coins
    } else if (rand < 0.48) {
      targetIndex = 7; // 150 coins
    } else if (rand < 0.68) {
      targetIndex = 2; // 250 coins
    } else if (rand < 0.80) {
      targetIndex = 4; // 500 coins
    } else if (rand < 0.88) {
      targetIndex = 1; // Medium Cue!
    } else if (rand < 0.95) {
      targetIndex = 3; // Turquoise Table Felt!
    } else if (rand < 0.98) {
      targetIndex = 5; // 1,000 Coins!
    } else {
      targetIndex = 6; // 2,500 Coins Jackpot!
    }

    const selectedSeg = WHEEL_SEGMENTS[targetIndex];

    // Pointer is at the TOP (270 degrees in standard circle or 0 at top).
    // In CSS rotation, segment i starts at i * segmentAngle.
    // To land segment i under top pointer:
    // rotation = 5 full rounds (1800 deg) + (360 - (targetIndex * segmentAngle + segmentAngle / 2))
    const extraRounds = 5 + Math.floor(Math.random() * 2);
    const targetSliceCenter = targetIndex * segmentAngle + segmentAngle / 2;
    const finalAngle = extraRounds * 360 + (360 - targetSliceCenter);

    setRotationAngle(finalAngle);

    // Play tick sound every few moments during spin
    let tickCounter = 0;
    const tickInterval = setInterval(() => {
      tickCounter++;
      soundFX.playBallCollision(0.3);
      if (tickCounter > 30) {
        clearInterval(tickInterval);
      }
    }, 120);

    // Complete spin after 4.2 seconds
    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setWinningSegment(selectedSeg);
      soundFX.playVictoryChime();

      // Claim reward in storage
      const claimResult = StorageManager.claimDailySpinReward({
        type: selectedSeg.type,
        value: selectedSeg.value,
        name: selectedSeg.label,
        nameAr: selectedSeg.labelAr,
      });

      onUpdateSaveData(claimResult.updated);
      setClaimMessage({
        en: claimResult.rewardGranted,
        ar: claimResult.rewardGrantedAr,
      });
      setTimeLeftMs(24 * 60 * 60 * 1000);
    }, 4400);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-gradient-to-b from-[#161c2d] via-[#0f1523] to-[#080c16] border-2 border-amber-500/40 rounded-3xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col items-center overflow-hidden p-5 sm:p-6 text-center relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-30"
        >
          ✕
        </button>

        {/* Title Lockup */}
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <span className="text-2xl animate-bounce">🎡</span>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300">
            {isRTL ? 'عجلة الحظ اليومية المجانية' : 'Daily Free Lucky Spin'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-xs mb-4">
          {isRTL
            ? 'فرصة واحدة مجاناً كل يوم! اربح كوينز، العصا المتوسطة، أو طاولات حصرية!'
            : 'One free spin every 24 hours! Win coins, medium cues, or exclusive tables!'}
        </p>

        {/* Wheel Container with Top Pointer */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
          {/* Top Pointer Arrow */}
          <div className="absolute -top-3 z-30 flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400" />
            <div className="w-3.5 h-3.5 rounded-full bg-amber-300 -mt-1.5 border-2 border-amber-600" />
          </div>

          {/* Outer Golden Wheel Rim with LED Bulbs */}
          <div className="absolute inset-0 rounded-full border-4 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.35)] bg-slate-950 pointer-events-none z-10" />

          {/* Rotating SVG Wheel */}
          <div
            className="w-full h-full rounded-full overflow-hidden transition-transform ease-out"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
              transitionDuration: isSpinning ? '4.2s' : '0s',
              transitionTimingFunction: 'cubic-bezier(0.12, 0.8, 0.22, 1)',
            }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              {WHEEL_SEGMENTS.map((seg, i) => {
                const startAngle = (i * segmentAngle * Math.PI) / 180;
                const endAngle = ((i + 1) * segmentAngle * Math.PI) / 180;
                const midAngle = startAngle + (endAngle - startAngle) / 2;

                const x1 = 150 + 150 * Math.cos(startAngle);
                const y1 = 150 + 150 * Math.sin(startAngle);
                const x2 = 150 + 150 * Math.cos(endAngle);
                const y2 = 150 + 150 * Math.sin(endAngle);

                // Text Position
                const textRadius = 95;
                const tx = 150 + textRadius * Math.cos(midAngle);
                const ty = 150 + textRadius * Math.sin(midAngle);
                const textRot = (midAngle * 180) / Math.PI + 90;

                return (
                  <g key={seg.id}>
                    {/* Wedge path */}
                    <path
                      d={`M 150 150 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`}
                      fill={seg.color}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />

                    {/* Segment Content Label */}
                    <g transform={`translate(${tx}, ${ty}) rotate(${textRot})`}>
                      <text
                        x="0"
                        y="-12"
                        textAnchor="middle"
                        fontSize="18"
                        className="select-none"
                      >
                        {seg.icon}
                      </text>
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        fill={seg.textColor}
                        fontSize="10"
                        fontWeight="900"
                        fontFamily="Outfit, Cairo, sans-serif"
                        className="select-none drop-shadow-sm"
                      >
                        {isRTL ? seg.labelAr : seg.label}
                      </text>
                      {seg.sublabel && (
                        <text
                          x="0"
                          y="15"
                          textAnchor="middle"
                          fill="#fef08a"
                          fontSize="7.5"
                          fontWeight="700"
                          className="select-none"
                        >
                          {isRTL ? seg.sublabelAr : seg.sublabel}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Center Hub Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || !canSpin}
            className={`absolute z-20 w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 flex flex-col items-center justify-center transition-all ${
              canSpin && !isSpinning
                ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 border-amber-200 text-slate-950 font-black shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-pulse hover:scale-105 active:scale-95'
                : 'bg-slate-900 border-slate-700 text-slate-400 cursor-not-allowed opacity-90'
            }`}
          >
            <span className="text-sm font-black uppercase tracking-wider">
              {isSpinning ? '...' : canSpin ? (isRTL ? 'دوّر!' : 'SPIN') : '🔒'}
            </span>
          </button>
        </div>

        {/* Cooldown or Spin Action Prompt */}
        <div className="w-full mt-3 flex flex-col items-center">
          {canSpin ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full animate-pulse">
                ✨ {isRTL ? 'محاولتك اليومية المجانية جاهزة الآن!' : 'Your free daily spin is ready!'}
              </span>

              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSpinning
                  ? isRTL ? 'جاري تدوير العجلة...' : 'Spinning Wheel...'
                  : isRTL ? 'تدوير العجلة مجاناً 🎰' : 'Spin Wheel Free 🎰'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 w-full max-w-xs">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <span>⏳</span>
                <span>{isRTL ? 'المحاولة القادمة متاحة بعد:' : 'Next free spin unlocks in:'}</span>
              </span>
              <span className="font-mono text-base font-black text-amber-300 tracking-widest">
                {formatCountdown(timeLeftMs)}
              </span>
              <span className="text-[10px] text-slate-500">
                {isRTL ? 'محاولة مجانية واحدة كل 24 ساعة' : '1 Free spin every 24 hours'}
              </span>
            </div>
          )}
        </div>

        {/* Winner Celebration Modal Overlay */}
        {winningSegment && (
          <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400 w-full max-w-sm flex flex-col items-center gap-1.5 animate-bounce">
            <span className="text-2xl">{winningSegment.icon}</span>
            <span className="text-xs font-black text-amber-300">
              {isRTL ? 'مبروك! ربحت:' : 'Congratulations! You Won:'}
            </span>
            <span className="text-base font-black text-white">
              {isRTL ? winningSegment.labelAr : winningSegment.label}
            </span>
            {claimMessage && (
              <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                {isRTL ? claimMessage.ar : claimMessage.en}
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-2 px-5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors"
            >
              {isRTL ? 'استلام الجائزة وإغلاق' : 'Claim & Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
