/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { soundFX } from '../audio/soundFX';

interface CuePowerBarProps {
  power: number; // 0 to 1
  onChange: (power: number) => void;
  onShoot: (shotPower?: number) => void;
  disabled?: boolean;
  language: 'en' | 'ar';
}

export const CuePowerBar: React.FC<CuePowerBarProps> = ({
  power,
  onChange,
  onShoot,
  disabled = false,
  language,
}) => {
  const isRTL = language === 'ar';
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const powerRef = useRef(power);
  powerRef.current = power;

  // Calculate power ratio precisely (0.00 to 1.00) based on vertical finger position along track
  const updatePowerFromPointer = useCallback((clientY: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const topMargin = 16;
    const bottomMargin = 26;
    const travel = rect.height - topMargin - bottomMargin;
    if (travel <= 0) return 0;

    const relativeY = clientY - (rect.top + topMargin);
    // Smooth 0.00 to 1.00 ratio with exact 1% step precision
    const rawRatio = Math.max(0, Math.min(1.0, relativeY / travel));
    const smoothPower = Math.round(rawRatio * 100) / 100;
    onChange(smoothPower);
    return smoothPower;
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
    setIsDragging(true);
    updatePowerFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    updatePowerFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const finalPower = powerRef.current;
    if (finalPower >= 0.02 && !disabled) {
      // Pull-and-release strike: fire shot with accurate charged power!
      soundFX.playCueHit(finalPower);
      onShoot(finalPower);
      // Reset back to 0% immediately for next turn
      onChange(0);
    } else {
      // Cancelled shot (dragged back to top / 0%)
      onChange(0);
    }
  };

  const handleStrikeButtonClick = () => {
    if (disabled) return;
    const currentPower = powerRef.current;
    if (currentPower >= 0.02) {
      soundFX.playCueHit(currentPower);
      onShoot(currentPower);
      onChange(0);
    } else {
      // If tapped at 0%, execute with a clean, confident 45% medium strike
      soundFX.playCueHit(0.45);
      onChange(0.45);
      setTimeout(() => {
        onShoot(0.45);
        onChange(0);
      }, 90);
    }
  };

  // Ensure power is 0 when disabled or inactive
  useEffect(() => {
    if (disabled && power > 0) {
      onChange(0);
    }
  }, [disabled, power, onChange]);

  const percent = Math.round(power * 100);
  const maxPullTravel = 100; // Maximum pixel translation for the wooden cue stick
  const pullPixels = Math.round(power * maxPullTravel);

  return (
    <div className="flex flex-col items-center pointer-events-auto select-none touch-none">
      {/* Power Percentage Readout Badge (Starts strictly at 0%, updates dynamically up to 100%) */}
      <div
        className={`text-[10px] sm:text-xs font-mono font-black tabular-nums px-2 py-0.5 rounded-full border shadow-md mb-1 transition-colors select-none ${
          percent > 75
            ? 'text-rose-400 bg-rose-950/90 border-rose-500/70 shadow-rose-950/50'
            : percent > 40
            ? 'text-amber-300 bg-amber-950/90 border-amber-500/70 shadow-amber-950/50'
            : percent > 0
            ? 'text-sky-300 bg-sky-950/90 border-sky-500/70 shadow-sky-950/50'
            : 'text-slate-400 bg-slate-900/90 border-slate-700/60'
        }`}
        title={isRTL ? `قوة الضربة: ${percent}%` : `Shot Power: ${percent}%`}
      >
        {percent}%
      </div>

      {/* Vertical Slider Groove with Authentic Wooden Cue Stick */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-8 sm:w-10 h-44 sm:h-64 md:h-76 rounded-full bg-gradient-to-r from-[#070a10] via-[#111724] to-[#070a10] border-2 border-slate-700/90 shadow-[inset_0_2px_12px_rgba(0,0,0,0.95)] flex flex-col justify-start items-center p-1 cursor-ns-resize overflow-hidden ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
        title={isRTL ? 'اسحب العصا لأسفل لتحديد قوة الضربة وأفلت للإطلاق' : 'Drag cue stick down to charge power, release to strike'}
      >
        {/* Distance Tick Marks along slider groove (25%, 50%, 75%, 100%) */}
        <div className="absolute inset-y-4 right-1 flex flex-col justify-between pointer-events-none opacity-40">
          {[...Array(11)].map((_, i) => (
            <span
              key={i}
              className={`rounded-full ${
                i === 0 || i === 5 || i === 10
                  ? 'w-2.5 h-1 bg-amber-300 opacity-90'
                  : 'w-1.5 h-0.5 bg-amber-200 opacity-60'
              }`}
            />
          ))}
        </div>

        {/* Dynamic Glow Fill gradient showing charged power level (Starts strictly at 0% when at rest) */}
        {percent > 0 && (
          <div
            className="absolute inset-x-1 top-1 rounded-full pointer-events-none"
            style={{
              height: `${percent}%`,
              background: 'linear-gradient(to bottom, rgba(56, 189, 248, 0.25) 0%, rgba(245, 158, 11, 0.45) 60%, rgba(239, 68, 68, 0.65) 100%)',
              boxShadow: power > 0.4 ? '0 0 14px rgba(245, 158, 11, 0.5)' : 'none',
              transition: isDragging ? 'none' : 'height 0.15s ease-out',
            }}
          />
        )}

        {/* Authentic Wooden Cue Stick sliding inside groove (Resting at top when 0%) */}
        <div
          className="relative w-4 sm:w-5 h-64 sm:h-84 rounded-t-sm rounded-b-lg shadow-2xl flex flex-col items-center overflow-hidden pointer-events-none"
          style={{
            transform: `translateY(${pullPixels}px)`,
            background: 'linear-gradient(to right, #fde68a 0%, #d97706 40%, #92400e 80%, #451a03 100%)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* Blue leather cue tip at top */}
          <div className="w-full h-2.5 bg-sky-500 rounded-t-sm border-b border-white/50 shrink-0" />
          {/* Ivory ferrule */}
          <div className="w-full h-2.5 bg-slate-100 border-b border-amber-900/40 shrink-0" />
          {/* Maple shaft */}
          <div className="w-full flex-1 bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#b45309]" />
          {/* Tribal Inlay Wrap on handle */}
          <div className="w-full h-20 sm:h-28 bg-[#78350f] border-y-2 border-amber-400/80 flex flex-col justify-around py-1 shrink-0">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-full h-1"
                style={{
                  backgroundColor: i % 2 === 0 ? '#dc2626' : '#1c1917',
                }}
              />
            ))}
          </div>
          {/* Cue Butt bumper */}
          <div className="w-full h-3 bg-slate-950 rounded-b-md shrink-0" />
        </div>
      </div>

      {/* Strike Action Hit Button (Tap to strike, or release stick above) */}
      <button
        onClick={handleStrikeButtonClick}
        disabled={disabled}
        className={`mt-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full font-bold text-xs uppercase flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
          disabled
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : percent > 0
            ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/40 border border-amber-300 animate-pulse'
            : 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-md border border-amber-400/60'
        }`}
        title={isRTL ? 'إطلاق الضربة' : 'Strike Ball'}
      >
        <span className="text-base sm:text-lg">⚡</span>
      </button>
    </div>
  );
};
