/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Vector2D } from '../types/game';

interface SpinControlProps {
  spin: Vector2D;
  onChange: (spin: Vector2D) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  language: 'en' | 'ar';
}

export const SpinControl: React.FC<SpinControlProps> = ({
  spin,
  onChange,
  isOpen,
  onToggle,
  onClose,
  language,
}) => {
  const size = 110;
  const radius = size / 2 - 8;
  const isRTL = language === 'ar';

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const updateFromPoint = (clientX: number, clientY: number) => {
      let dx = (clientX - centerX) / radius;
      let dy = (clientY - centerY) / radius;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0.85) {
        dx = (dx / len) * 0.85;
        dy = (dy / len) * 0.85;
      }
      onChange({ x: Math.round(dx * 100) / 100, y: Math.round(-dy * 100) / 100 }); // -dy so top is topspin
    };

    updateFromPoint(e.clientX, e.clientY);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromPoint(ev.clientX, ev.clientY);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleSetPreset = (x: number, y: number) => {
    onChange({ x, y });
  };

  return (
    <div className="relative pointer-events-auto">
      {/* Bottom Trigger Button with animated Cue Ball preview */}
      <button
        onClick={onToggle}
        title={isRTL ? 'تعديل مكان ضرب الكرة (الدوران الإنجليزي)' : 'English Spin (Strike Point)'}
        className={`h-9 px-2.5 sm:px-3 rounded-xl border flex items-center gap-2 shadow-lg active:scale-95 transition-all ${
          isOpen
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/40'
            : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-amber-400 hover:text-white'
        }`}
      >
        {/* Realistic Miniature Cue Ball with red impact dot */}
        <div className="relative w-5 h-5 rounded-full bg-gradient-to-tr from-slate-200 via-white to-slate-100 shadow-sm border border-slate-400 flex items-center justify-center shrink-0">
          <div
            className="w-1.5 h-1.5 rounded-full bg-red-600 border border-white shadow-xs transition-transform duration-75"
            style={{
              transform: `translate(${spin.x * 6}px, ${-spin.y * 6}px)`,
            }}
          />
        </div>
        <span className="text-xs font-bold whitespace-nowrap hidden sm:inline">
          {isRTL ? 'مكان الضرب' : 'Spin'}
        </span>
      </button>

      {/* Floating Bottom Spin Popout with Direct Directional Buttons */}
      {isOpen && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className={`absolute bottom-12 ${isRTL ? 'right-0' : 'left-0'} w-64 p-3.5 rounded-2xl bg-[#0c1222]/98 border-2 border-slate-700 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl z-50 flex flex-col items-center gap-2.5`}
        >
          {/* Header */}
          <div className="flex items-center justify-between w-full text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-amber-400">
              <span>🎯</span>
              <span>{isRTL ? 'تعديل مكان ضرب الكرة' : 'English Spin (Strike Spot)'}</span>
            </div>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          {/* Interactive Cue Ball Visualizer */}
          <div className="relative flex items-center justify-center py-1">
            <div
              onPointerDown={handlePointerDown}
              className="relative cursor-crosshair rounded-full bg-gradient-to-br from-[#ffffff] via-[#f1f5f9] to-[#cbd5e1] shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.5)] border-3 border-slate-400"
              style={{ width: size, height: size }}
            >
              {/* Subtle crosshair & limit ring */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-slate-400/40" />
                <div className="h-full w-[1px] bg-slate-400/40 absolute" />
                <div className="w-16 h-16 rounded-full border border-dashed border-slate-400/40 absolute" />
              </div>

              {/* Red Impact Chalk Spot */}
              <div
                className="absolute w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
                style={{
                  left: size / 2 + spin.x * radius,
                  top: size / 2 - spin.y * radius,
                }}
              />
            </div>
          </div>

          {/* Quick Directional Touch Nudge Buttons (Up, Down, Left, Right, Center) */}
          <div className="flex flex-col items-center gap-1 w-full bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">
              {isRTL ? 'أزرار الاتجاهات السريعة:' : 'Quick Directional Strike:'}
            </span>

            {/* Top Button */}
            <button
              onClick={() => handleSetPreset(0, 0.75)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <span>⬆️</span>
              <span>{isRTL ? 'أعلى (دوران أمامي)' : 'Top (Follow)'}</span>
            </button>

            {/* Middle Row: Left, Center, Right */}
            <div className="flex items-center gap-1.5 w-full justify-center">
              <button
                onClick={() => handleSetPreset(-0.75, 0)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <span>⬅️</span>
                <span>{isRTL ? 'يسار' : 'Left'}</span>
              </button>

              <button
                onClick={() => handleSetPreset(0, 0)}
                className="px-2.5 py-1 bg-amber-600/30 border border-amber-500/50 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-bold transition-all"
              >
                {isRTL ? 'وسط ⊙' : 'Center'}
              </button>

              <button
                onClick={() => handleSetPreset(0.75, 0)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <span>➡️</span>
                <span>{isRTL ? 'يمين' : 'Right'}</span>
              </button>
            </div>

            {/* Bottom Button */}
            <button
              onClick={() => handleSetPreset(0, -0.75)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <span>⬇️</span>
              <span>{isRTL ? 'أسفل (سحب للخلف)' : 'Bottom (Draw)'}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-tight">
            {isRTL
              ? 'المس أو اسحب النقطة لتحديد الدوران الإنجليزي بدقة'
              : 'Tap or drag the red chalk spot to adjust spin'}
          </p>
        </div>
      )}
    </div>
  );
};
