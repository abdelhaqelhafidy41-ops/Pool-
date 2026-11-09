/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Ball, GameMode, Player, PracticeRackType, RuleVariant, TableViewMode, TurnPhase, Vector2D } from '../types/game';
import { SpinControl } from './SpinControl';
import { soundFX } from '../audio/soundFX';
import { loadReferenceSprites, getAvatarImage, getPotCoins } from './avatarHelper';

interface GameHUDProps {
  player1: Player;
  player2: Player;
  activePlayerIndex: number;
  gameMode: GameMode;
  ruleVariant: RuleVariant;
  turnPhase: TurnPhase;
  shotClock: number;
  statusMessage?: string;
  statusMessageAr?: string;
  balls: Ball[];
  spin: Vector2D;
  isZoomed: boolean;
  onToggleZoom: () => void;
  onSpinChange: (spin: Vector2D) => void;
  onAngleNudge: (deltaRad: number) => void;
  onPause: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
  onShowRules: () => void;
  // Practice Mode Only Controls
  onUndoShot?: () => void;
  canUndo?: boolean;
  onSelectPracticeDrill?: (drill: PracticeRackType) => void;
  onFreeBallInHand?: () => void;
  onGetHint?: () => void;
  // Local LAN Match Props
  isLanMatch?: boolean;
  isHost?: boolean;
  lanLatency?: number;
  reconnectingSeconds?: number | null;
  isMyTurn?: boolean;
  // 2D vs 3D View Mode Props
  viewMode: TableViewMode;
  onToggleViewMode: () => void;
  // 3D Aim / Orbit camera toggle & angle presets
  controlMode3D?: 'aim' | 'orbit';
  onToggleControlMode3D?: () => void;
  cameraPreset3D?: 'angled' | 'top_perspective' | 'cue_behind';
  onCycleCameraPreset3D?: () => void;
  currentStake?: number;
  language: 'en' | 'ar';
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player1,
  player2,
  activePlayerIndex,
  gameMode,
  ruleVariant,
  turnPhase,
  shotClock,
  statusMessage,
  statusMessageAr,
  balls,
  spin,
  isZoomed,
  onToggleZoom,
  onSpinChange,
  onAngleNudge,
  onPause,
  onToggleSound,
  soundEnabled,
  onShowRules,
  onUndoShot,
  canUndo = false,
  onFreeBallInHand,
  onGetHint,
  isLanMatch = false,
  isHost = true,
  lanLatency = 10,
  reconnectingSeconds = null,
  isMyTurn = true,
  viewMode,
  onToggleViewMode,
  controlMode3D = 'aim',
  onToggleControlMode3D,
  cameraPreset3D = 'angled',
  onCycleCameraPreset3D,
  currentStake = 0,
  language,
}) => {
  const isRTL = language === 'ar';
  const isPractice = gameMode === 'practice' || gameMode === 'challenge';
  const [, setSpritesLoaded] = useState(false);
  const [showSpinPopup, setShowSpinPopup] = useState(false);

  useEffect(() => {
    loadReferenceSprites(() => {
      setSpritesLoaded(true);
    });
  }, []);

  const p1AvatarSrc = getAvatarImage(player1.avatarSeed);
  const p2AvatarSrc = getAvatarImage(player2.avatarSeed);
  const potCoinsSrc = getPotCoins();

  // Solid balls (1 to 7) and Stripe balls (9 to 15)
  const solidBallNumbers = [1, 2, 3, 4, 5, 6, 7];
  const stripeBallNumbers = [9, 10, 11, 12, 13, 14, 15];

  // In 8-ball, determine who is stripes and who is solids ONLY when legally assigned
  const is8Ball = gameMode === '8ball';
  const isGroupsAssigned = is8Ball && player1.group !== 'undetermined' && player2.group !== 'undetermined';
  const p1Balls = player1.group === 'stripes' ? stripeBallNumbers : player1.group === 'solids' ? solidBallNumbers : [];
  const p2Balls = player2.group === 'stripes' ? stripeBallNumbers : player2.group === 'solids' ? solidBallNumbers : [];

  // Check if either player cleared all 7 balls of their group (ready to sink 8-ball)
  const p1ClearedGroup = isGroupsAssigned && p1Balls.length > 0 && p1Balls.every(num => balls.find(b => b.number === num)?.isPocketed);
  const p2ClearedGroup = isGroupsAssigned && p2Balls.length > 0 && p2Balls.every(num => balls.find(b => b.number === num)?.isPocketed);

  // Turn timer percentage for avatar glowing border (based on 35s clock)
  const clockPercent = Math.max(0, Math.min(100, (shotClock / 35) * 100));
  const isLowTime = shotClock <= 7;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1 sm:p-3 select-none z-20">
      {/* 1. TOP HEADER HUD BAR (Spacious, Zero Overlap, Clean RTL/LTR Support) */}
      <div className="w-full max-w-5xl mx-auto pointer-events-auto">
        <div
          dir="ltr"
          className="w-full bg-gradient-to-b from-[#232a38] via-[#1a202c] to-[#121620] border-2 border-[#3b4455]/70 rounded-2xl sm:rounded-3xl shadow-[0_6px_20px_rgba(0,0,0,0.65)] px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-3"
        >
          {/* Menu / Pause Button */}
          <button
            onClick={() => {
              onPause();
              soundFX.playButtonClick();
            }}
            title={isRTL ? 'القائمة الرئيسية / الإيقاف المؤقت' : 'Menu / Pause'}
            className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#059669] border border-[#6ee7b7] shadow-[0_2px_8px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center gap-1 sm:gap-1.5 active:scale-95 transition-transform shrink-0"
          >
            <span className="w-4 sm:w-5 h-0.5 sm:h-1 bg-white rounded-full shadow-sm" />
            <span className="w-4 sm:w-5 h-0.5 sm:h-1 bg-white rounded-full shadow-sm" />
            <span className="w-4 sm:w-5 h-0.5 sm:h-1 bg-white rounded-full shadow-sm" />
          </button>

          {/* Player 1 Section (Left side: Star, Chat, Name, Timer, Mini Balls, Avatar) */}
          <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1 justify-end">
            <div className="flex flex-col items-end min-w-0">
              {/* Top Row: Star + Chat + Name */}
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 max-w-full justify-end">
                {/* Magenta Star Level Badge */}
                <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full drop-shadow text-fuchsia-500 fill-current" viewBox="0 0 24 24">
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white drop-shadow-sm font-mono">
                    43
                  </span>
                </div>

                {/* Chat Bubble Icon */}
                <div
                  title="Chat"
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-amber-400 text-amber-950 flex items-center justify-center text-[9px] font-bold shadow-sm shrink-0"
                >
                  💬
                </div>

                {/* Player 1 Name (Real chosen name from settings/profile) */}
                <span
                  className="text-xs sm:text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[110px] sm:max-w-[180px] drop-shadow-sm"
                  title={player1.name}
                >
                  {player1.name}
                </span>
              </div>

              {/* Timer Bar */}
              <div className="w-16 sm:w-28 h-1.5 sm:h-2 rounded-full bg-[#0a0e17] border border-slate-700/60 overflow-hidden mt-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    activePlayerIndex === 0
                      ? isLowTime
                        ? 'bg-rose-500 animate-pulse'
                        : 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: activePlayerIndex === 0 ? `${clockPercent}%` : '100%' }}
                />
              </div>

              {/* Ball Rack Indicators / Open Table Status */}
              {is8Ball && !isGroupsAssigned ? (
                <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 border border-amber-500/60 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 whitespace-nowrap">
                    {isRTL ? 'طاولة مفتوحة' : 'Open Table'}
                  </span>
                </div>
              ) : p1ClearedGroup ? (
                <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500 shadow-md animate-pulse">
                  <span className="text-xs">🎱</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-amber-300 font-mono">
                    {isRTL ? 'الكرة 8 للفوز!' : '8-Ball to Win!'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
                  {p1Balls.map((num) => {
                    const ball = balls.find(b => b.number === num);
                    const isPocketed = ball ? ball.isPocketed : false;
                    return <MiniBallWidget key={num} number={num} isPocketed={isPocketed} />;
                  })}
                </div>
              )}
            </div>

            {/* Player 1 Avatar Frame */}
            <div
              className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl p-0.5 border-2 transition-all shrink-0 ${
                activePlayerIndex === 0
                  ? isLowTime
                    ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                    : 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.7)]'
                  : 'border-amber-400/80 shadow-md'
              }`}
            >
              <span className="absolute -top-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />
              <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />
              <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />

              <div className="w-full h-full rounded sm:rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                {p1AvatarSrc ? (
                  <img src={p1AvatarSrc} alt={player1.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base sm:text-lg">{player1.avatarSeed && !player1.avatarSeed.startsWith('data:') ? player1.avatarSeed : '🎱'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Golden Chips / Prize Pot (Clean, Dynamic with Current Wager Pot) */}
          <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0">
            <div className="flex items-center justify-center h-5 sm:h-6">
              {potCoinsSrc ? (
                <img src={potCoinsSrc} alt="Pot" className="h-4 sm:h-5 object-contain drop-shadow" />
              ) : (
                <div className="flex -space-x-1">
                  <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-400 border border-amber-600 inline-block shadow" />
                  <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-300 border border-amber-600 inline-block shadow" />
                </div>
              )}
            </div>
            <span className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wider font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] mt-0.5">
              {currentStake > 0 ? (currentStake * 2).toLocaleString() : (isRTL ? 'ودي' : 'Free')}
            </span>
          </div>

          {/* Player 2 Section (Right side: Avatar, Name, Star, Timer, Mini Balls) */}
          <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1 justify-start">
            {/* Player 2 Avatar Frame */}
            <div
              className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl p-0.5 border-2 transition-all shrink-0 ${
                activePlayerIndex === 1
                  ? isLowTime
                    ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                    : 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.7)]'
                  : 'border-fuchsia-400/80 shadow-md'
              }`}
            >
              <span className="absolute -top-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />
              <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />
              <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 border border-amber-600 shadow" />

              <div className="w-full h-full rounded sm:rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                {p2AvatarSrc ? (
                  <img src={p2AvatarSrc} alt={player2.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base sm:text-lg">{player2.avatarSeed && !player2.avatarSeed.startsWith('data:') ? player2.avatarSeed : '🎱'}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start min-w-0" dir={isRTL ? 'rtl' : 'ltr'}>
              {/* Top Row: Name + Star (Proper RTL layout to prevent truncating name start) */}
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 max-w-full justify-start">
                {/* Player 2 Name (Real name with generous width so Arabic names like طارق المبتدئ never clip) */}
                <span
                  className="text-xs sm:text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[110px] sm:max-w-[180px] drop-shadow-sm"
                  title={player2.name}
                >
                  {player2.name}
                </span>

                {/* Blue Star Level Badge */}
                <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full drop-shadow text-sky-500 fill-current" viewBox="0 0 24 24">
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white drop-shadow-sm font-mono">
                    46
                  </span>
                </div>
              </div>

              {/* Timer Bar */}
              <div className="w-16 sm:w-28 h-1.5 sm:h-2 rounded-full bg-[#0a0e17] border border-slate-700/60 overflow-hidden mt-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    activePlayerIndex === 1
                      ? isLowTime
                        ? 'bg-rose-500 animate-pulse'
                        : 'bg-amber-400'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: activePlayerIndex === 1 ? `${clockPercent}%` : '100%' }}
                />
              </div>

              {/* Ball Rack Indicators / Open Table Status */}
              {is8Ball && !isGroupsAssigned ? (
                <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 border border-amber-500/60 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 whitespace-nowrap">
                    {isRTL ? 'طاولة مفتوحة' : 'Open Table'}
                  </span>
                </div>
              ) : p2ClearedGroup ? (
                <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500 shadow-md animate-pulse">
                  <span className="text-xs">🎱</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-amber-300 font-mono">
                    {isRTL ? 'الكرة 8 للفوز!' : '8-Ball to Win!'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
                  {p2Balls.map((num) => {
                    const ball = balls.find(b => b.number === num);
                    const isPocketed = ball ? ball.isPocketed : false;
                    return <MiniBallWidget key={num} number={num} isPocketed={isPocketed} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM CONTROLS CLUSTER (Ergonomic, Touch-Friendly, Complete Features, No Clipping) */}
      <div className="w-full max-w-5xl mx-auto flex items-end justify-between pointer-events-auto px-1 sm:px-2 pb-1 gap-1 sm:gap-2">
        {/* Left Bottom: Fine Aim Nudge, English Spin Adjuster & Practice Tools */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Fine Tuning Angle Nudge */}
          <div className="flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-0.5 shadow-lg shrink-0">
            <button
              onClick={() => {
                onAngleNudge(-0.015);
                soundFX.playButtonClick();
              }}
              title={isRTL ? 'تدوير دقيق لليسار' : 'Fine aim left'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 active:scale-95 text-xs sm:text-sm font-bold"
            >
              ↺
            </button>
            <div className="w-[1px] h-3.5 bg-slate-700" />
            <button
              onClick={() => {
                onAngleNudge(0.015);
                soundFX.playButtonClick();
              }}
              title={isRTL ? 'تدوير دقيق لليمين' : 'Fine aim right'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 active:scale-95 text-xs sm:text-sm font-bold"
            >
              ↻
            </button>
          </div>

          {/* Camera Zoom Toggle */}
          <button
            onClick={() => {
              onToggleZoom();
              soundFX.playButtonClick();
            }}
            title={isZoomed ? (isRTL ? 'المنظور الكامل' : 'Full Overview') : (isRTL ? 'تكبير الكاميرا' : 'Zoom In')}
            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all shadow-md shrink-0 ${
              isZoomed
                ? 'bg-sky-600/30 border-sky-400 text-sky-300'
                : 'bg-slate-900/95 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isZoomed ? '🔍-' : '🔍+'}
          </button>

          {/* ENHANCED ENGLISH SPIN CONTROL (Directly at the bottom bar) */}
          <div className="shrink-0">
            <SpinControl
              spin={spin}
              onChange={onSpinChange}
              isOpen={showSpinPopup}
              onToggle={() => setShowSpinPopup(p => !p)}
              onClose={() => setShowSpinPopup(false)}
              language={language}
            />
          </div>

          {/* Practice Tools */}
          {isPractice && (
            <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-700 p-1 rounded-xl shadow-lg shrink-0">
              <button
                onClick={() => {
                  if (onUndoShot && canUndo) {
                    onUndoShot();
                    soundFX.playButtonClick();
                  }
                }}
                disabled={!canUndo}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-semibold"
              >
                ↩
              </button>
              <button
                onClick={() => {
                  if (onFreeBallInHand) {
                    onFreeBallInHand();
                    soundFX.playButtonClick();
                  }
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                ⚪
              </button>
              {onGetHint && (
                <button
                  onClick={() => {
                    onGetHint();
                    soundFX.playButtonClick();
                  }}
                  className="px-2 py-1 bg-amber-600/40 border border-amber-500/50 text-amber-300 rounded-lg text-xs font-semibold"
                >
                  💡
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Bottom: 3D Camera Controls, 2D/3D Toggle, Sound & Rules (Never hidden or clipped) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick 3D Camera Angle Cycler (Directly on HUD!) */}
          {viewMode === '3d' && onCycleCameraPreset3D && (
            <button
              onClick={() => {
                onCycleCameraPreset3D();
                soundFX.playButtonClick();
              }}
              title={
                isRTL
                  ? `زاوية الكاميرا الحالية: ${
                      cameraPreset3D === 'cue_behind'
                        ? 'خلف العصا'
                        : cameraPreset3D === 'top_perspective'
                        ? 'منظور علوي'
                        : 'منظور مائل'
                    } (اضغط للتغيير)`
                  : `Current Camera: ${
                      cameraPreset3D === 'cue_behind'
                        ? 'Behind Cue'
                        : cameraPreset3D === 'top_perspective'
                        ? 'Top Down'
                        : 'Angled'
                    } (Click to cycle)`
              }
              className="h-8 sm:h-9 px-1.5 sm:px-2 rounded-xl border bg-slate-900/95 border-amber-500/50 text-amber-300 hover:border-amber-400 font-bold text-xs flex items-center gap-1 shadow-lg active:scale-95 shrink-0"
            >
              <span className="text-sm">🎥</span>
              <span className="text-[10px] sm:text-xs hidden sm:inline">
                {cameraPreset3D === 'cue_behind'
                  ? (isRTL ? 'خلف العصا' : 'Behind')
                  : cameraPreset3D === 'top_perspective'
                  ? (isRTL ? 'علوي' : 'Top')
                  : (isRTL ? 'مائل' : 'Angled')}
              </span>
            </button>
          )}

          {/* Aim / Orbit Toggle in 3D Mode */}
          {viewMode === '3d' && (
            <button
              onClick={() => {
                if (onToggleControlMode3D) onToggleControlMode3D();
                soundFX.playButtonClick();
              }}
              title={
                controlMode3D === 'orbit'
                  ? (isRTL ? 'التبديل إلى وضع التصويب' : 'Switch to Aim Mode')
                  : (isRTL ? 'التبديل إلى تدوير الكاميرا' : 'Switch to Orbit Camera')
              }
              className={`h-8 sm:h-9 px-1.5 sm:px-2.5 rounded-xl border font-bold text-xs flex items-center gap-1 shadow-lg active:scale-95 transition-all shrink-0 ${
                controlMode3D === 'orbit'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-300 ring-2 ring-amber-400/40'
                  : 'bg-slate-900/95 text-sky-300 border-slate-700 hover:border-sky-400 hover:text-white'
              }`}
            >
              <span className="text-sm">{controlMode3D === 'orbit' ? '🔄' : '🎯'}</span>
              <span className="text-[10px] sm:text-xs hidden sm:inline">{controlMode3D === 'orbit' ? (isRTL ? 'تدوير' : 'Orbit') : (isRTL ? 'تصويب' : 'Aim')}</span>
            </button>
          )}

          {/* 2D / 3D Toggle */}
          <button
            onClick={() => {
              onToggleViewMode();
              soundFX.playButtonClick();
            }}
            title={
              viewMode === '3d'
                ? (isRTL ? 'التبديل إلى 2D' : 'Switch to 2D')
                : (isRTL ? 'التبديل إلى 3D' : 'Switch to 3D')
            }
            className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border font-bold text-xs flex items-center gap-1 shadow-lg active:scale-95 transition-all shrink-0 ${
              viewMode === '3d'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 ring-2 ring-amber-400/40'
                : 'bg-slate-900/95 text-sky-400 border-slate-700 hover:border-sky-500 hover:text-white'
            }`}
          >
            <span className="text-sm">{viewMode === '3d' ? '🧊' : '📐'}</span>
            <span className="tracking-wider">{viewMode === '3d' ? '3D' : '2D'}</span>
          </button>

          {/* Sound Mute/Unmute (Explicit shrink-0, always stays visible) */}
          <button
            onClick={() => {
              onToggleSound();
              soundFX.playButtonClick();
            }}
            title={soundEnabled ? 'Mute' : 'Unmute'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/95 border border-slate-700 shadow-lg flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all shrink-0"
          >
            {soundEnabled ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
              </svg>
            )}
          </button>

          {/* Rules Book (Explicit shrink-0, always stays visible) */}
          <button
            onClick={() => {
              onShowRules();
              soundFX.playButtonClick();
            }}
            title={isRTL ? 'القواعد' : 'Rules'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/95 border border-slate-700 shadow-lg flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Miniature Pool Ball Widget for HUD Ball Racks
 */
interface MiniBallProps {
  number: number;
  isPocketed: boolean;
}

const BALL_COLORS: Record<number, string> = {
  1: '#eab308',
  2: '#2563eb',
  3: '#dc2626',
  4: '#7c3aed',
  5: '#ea580c',
  6: '#16a34a',
  7: '#991b1b',
  8: '#0f172a',
  9: '#eab308',
  10: '#2563eb',
  11: '#dc2626',
  12: '#7c3aed',
  13: '#ea580c',
  14: '#16a34a',
  15: '#991b1b',
};

const MiniBallWidget: React.FC<MiniBallProps> = ({ number, isPocketed }) => {
  if (isPocketed) {
    return (
      <div
        className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-[#0a0f1d] border border-slate-700/60 shadow-inner flex items-center justify-center shrink-0 opacity-40 transition-opacity"
        title={`Ball ${number} (Pocketed)`}
      >
        <span className="text-[6px] sm:text-[7px] text-emerald-400/80 font-mono font-bold leading-none">✓</span>
      </div>
    );
  }

  const isStripe = number >= 9 && number <= 15;
  const color = BALL_COLORS[number] || '#ffffff';

  return (
    <div
      className="relative w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.7)] flex items-center justify-center overflow-hidden shrink-0 border border-black/30"
      style={{
        backgroundColor: isStripe ? '#ffffff' : color,
      }}
      title={`Ball ${number}`}
    >
      {isStripe && (
        <div
          className="absolute inset-x-0 h-1.5 sm:h-2 top-1/2 -translate-y-1/2"
          style={{ backgroundColor: color }}
        />
      )}

      <div className="relative z-10 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white flex items-center justify-center shadow-xs">
        <span className="text-[5px] sm:text-[6px] font-black text-slate-950 font-mono leading-none">
          {number}
        </span>
      </div>

      <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 rounded-full bg-white/70 blur-[0.2px]" />
    </div>
  );
};
