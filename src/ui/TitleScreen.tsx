/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AIDifficulty, GameMode, Language } from '../types/game';
import { soundFX } from '../audio/soundFX';
import { COSMETIC_FRAMES, StorageManager, UserSaveData } from '../save/storage';
import { getAvatarImage } from './avatarHelper';
import { MatchStakeModal } from './MatchStakeModal';

interface TitleScreenProps {
  onStartGame: (mode: GameMode, vsAI: boolean, difficulty: AIDifficulty, customPlayer2?: any, stake?: number) => void;
  onOpenTournament: () => void;
  onOpenShop: () => void;
  onOpenDailySpin: () => void;
  onOpenProfile: () => void;
  onOpenChallenges: () => void;
  onOpenLanLobby: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onRunDevTests: () => void;
  saveData: UserSaveData;
  language: Language;
  onToggleLanguage: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenTournament,
  onOpenShop,
  onOpenDailySpin,
  onOpenProfile,
  onOpenChallenges,
  onOpenLanLobby,
  onOpenRules,
  onOpenSettings,
  onRunDevTests,
  saveData,
  language,
  onToggleLanguage,
  soundEnabled,
  onToggleSound,
}) => {
  const isRTL = language === 'ar';
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<AIDifficulty>('medium');
  const [stakeTarget, setStakeTarget] = React.useState<{ mode: GameMode; isVsAI: boolean } | null>(null);

  // Handle keyboard Start CTA (Enter/Space)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        soundFX.playButtonClick();
        onStartGame('8ball', true, selectedDifficulty);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, selectedDifficulty]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative w-full min-h-full flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 select-none overflow-y-auto overscroll-contain"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 35%, rgba(13, 105, 56, 0.22) 0%, rgba(2, 6, 23, 0.95) 75%)`,
      }}
    >
      {/* Top Header Bar */}
      <header className="flex items-center justify-between z-10 flex-wrap gap-3">
        {/* User Profile Card & Stats */}
        <div className="flex items-center gap-3">
          {(() => {
            const avatarSrc = getAvatarImage(saveData.avatarIcon);
            return (
              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  onOpenProfile();
                }}
                className="flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 px-3 py-1.5 rounded-2xl shadow-sm transition-all text-left"
                title={isRTL ? 'عرض الملف الشخصي والإحصائيات' : 'View Profile & Career Stats'}
              >
                <div className={`w-8 h-8 rounded-xl bg-slate-800 border flex items-center justify-center text-base shadow overflow-hidden ${
                  COSMETIC_FRAMES.find(f => f.id === saveData.nameFrame)?.borderClass || 'border-slate-700'
                }`}>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{saveData.avatarIcon && !saveData.avatarIcon.startsWith('data:') ? saveData.avatarIcon : '🎱'}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100 max-w-[110px] truncate leading-tight">
                    {saveData.playerName || 'Player 1'}
                  </span>
                  <span className="text-[10px] text-sky-400 font-medium">
                    {isRTL ? 'الملف الشخصي' : 'Career Profile'}
                  </span>
                </div>
              </button>
            );
          })()}

          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow">
              <span className="text-amber-400">🪙</span>
              <span className="font-mono font-bold tabular-nums text-slate-100">{saveData.coins}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow">
              <span className="text-amber-400">🏆</span>
              <span className="font-mono font-bold tabular-nums text-slate-100">{saveData.trophies}</span>
            </div>
          </div>
        </div>

        {/* Settings buttons: Language and Sound */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-end">
          {/* Daily Free Lucky Wheel Button with live ready pulse */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenDailySpin();
            }}
            className="relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 hover:brightness-110 shadow-[0_2px_12px_rgba(245,158,11,0.35)] text-xs font-black transition-all active:scale-95 shrink-0"
          >
            <span className="text-sm">🎡</span>
            <span className="hidden xs:inline">{isRTL ? 'عجلة الحظ' : 'Daily Spin'}</span>
            {StorageManager.canSpinDaily() && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
            )}
          </button>

          {/* Shop button with prominent styling and coin icon */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenShop();
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            <span>🎯</span>
            <span className="hidden xs:inline">{isRTL ? 'المتجر' : 'Shop'}</span>
          </button>

          {/* Rules button */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenRules();
            }}
            className="h-8 px-2 sm:px-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
            title={isRTL ? 'القواعد' : 'Rules'}
          >
            <span>📖</span>
            <span className="hidden sm:inline">{isRTL ? 'القواعد' : 'Rules'}</span>
          </button>

          {/* Settings & Accessibility button */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenSettings();
            }}
            className="h-8 px-2 sm:px-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
            title={isRTL ? 'الإعدادات وإمكانية الوصول' : 'Settings & Accessibility'}
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">{isRTL ? 'الإعدادات' : 'Settings'}</span>
          </button>

          {/* Language toggle */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onToggleLanguage();
            }}
            className="h-8 px-2 sm:px-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center shrink-0"
            title={language === 'ar' ? 'English' : 'العربية'}
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>

          {/* Audio toggle */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onToggleSound();
            }}
            className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0"
            title={soundEnabled ? 'Sound On' : 'Sound Off'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center z-10 max-w-3xl mx-auto">
        {/* Decorative Billiard Balls Centerpiece */}
        <div className="flex items-center justify-center gap-2 mb-4 animate-soft-pulse">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-lg border border-amber-200 flex items-center justify-center font-bold text-xs text-slate-900">
            1
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-xl border-2 border-slate-500 flex items-center justify-center font-black text-sm text-white">
            8
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-800 shadow-lg border border-red-300 flex items-center justify-center font-bold text-xs text-white">
            9
          </div>
        </div>

        {/* Bespoke SVG Title Lockup */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-sky-300 to-emerald-300 drop-shadow-md">
          {isRTL ? 'أسياد البلياردو' : 'CUE MASTERS'}
        </h1>
        <p className="text-xs md:text-sm uppercase tracking-widest text-sky-400 font-semibold mt-2">
          {isRTL ? 'بلياردو محلي واقعي بلا إنترنت' : 'LOCAL POOL · REAL PHYSICS'}
        </p>

        {/* Subtitle / Promo Callout */}
        <p className="text-xs md:text-sm text-slate-400 max-w-lg mt-3 leading-relaxed">
          {isRTL
            ? 'استخدم فيزياء حقيقية لتسديد أي ضربة، نافس الذكاء الاصطناعي، والعب محلياً بلا إنترنت مع أصدقائك!'
            : 'USE REAL PHYSICS TO HIT ANY SHOT. Play offline solo vs AI, pass & play with friends, or battle in local tournaments!'}
        </p>

        {/* Primary Action Start CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-xl mt-8">
          {/* Quick Play 8-Ball vs AI with Wager */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              setStakeTarget({ mode: '8ball', isVsAI: true });
            }}
            className="group relative px-5 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-950/60 transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            <div className="text-base">🎱 {isRTL ? 'الكرة الثامنة ضد الحاسوب' : '8-Ball vs AI'}</div>
            <div className="text-[11px] font-normal text-sky-100 opacity-80 mt-0.5">
              {isRTL ? 'اختر الرهان والمنافسة' : 'Select Stake & Play'}
            </div>
          </button>

          {/* 9-Ball vs AI with Wager */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              setStakeTarget({ mode: '9ball', isVsAI: true });
            }}
            className="group px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            <div className="text-base">🟡 {isRTL ? 'الكرة التاسعة ضد الحاسوب' : '9-Ball vs AI'}</div>
            <div className="text-[11px] font-normal text-slate-400 mt-0.5">
              {isRTL ? 'اختر الرهان والسرعة' : 'Select Stake & Rotation'}
            </div>
          </button>

          {/* Pass & Play (Local 2 Players on same screen with optional Wager) */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              setStakeTarget({ mode: '8ball', isVsAI: false });
            }}
            className="group px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            <div className="text-base">👥 {isRTL ? 'لعب محلي (شاشة واحدة)' : 'Pass & Play'}</div>
            <div className="text-[11px] font-normal text-slate-400 mt-0.5">
              {isRTL ? 'لاعبان مع رهان أو ودي' : '2 Players Stake or Free'}
            </div>
          </button>

          {/* Local Tournament */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenTournament();
            }}
            className="px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500 text-slate-200 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            <div className="text-base">🏆 {isRTL ? 'البطولة المحلية (8 لاعبين)' : 'Tournament (8 Players)'}</div>
            <div className="text-[11px] font-normal text-slate-400 mt-0.5">
              {isRTL ? '3 كؤوس تدريجية' : '3 Persistent Cups'}
            </div>
          </button>

          {/* Skill Challenges (Offline) */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenChallenges();
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900/90 hover:bg-slate-800/90 border border-amber-600/40 hover:border-amber-400 text-amber-200 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            <div className="text-base">⭐ {isRTL ? 'تحديات المهارة الفردية' : 'Skill Challenges'}</div>
            <div className="text-[11px] font-normal text-amber-300/80 mt-0.5">
              {isRTL ? '5 تحديات · نجوم ومكافآت' : '5 Drills · Stars & Coins'}
            </div>
          </button>

          {/* Practice & Free Table */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onStartGame('practice', false, selectedDifficulty);
            }}
            className="px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500 text-slate-200 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            <div className="text-base">🎯 {isRTL ? 'تدريب حر وتلميحات' : 'Free Practice & Hints'}</div>
            <div className="text-[11px] font-normal text-slate-400 mt-0.5">
              {isRTL ? 'تراجع · كرة حرة · نصائح ذكية' : 'Undo · Free Ball · AI Coach'}
            </div>
          </button>
        </div>

        {/* Secondary Links: Shop, LAN Room, Career Stats */}
        <div className="flex items-center flex-wrap justify-center gap-2.5 mt-4">
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenShop();
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/40 hover:to-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>🎯</span>
            <span>{isRTL ? 'متجر البلياردو وتخصيص العصا' : 'Cue Shop & Gear'}</span>
          </button>
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenLanLobby();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500 text-slate-300 text-xs font-medium transition-all"
          >
            📡 {isRTL ? 'لعب جماعي محلي (Wi-Fi / LAN)' : 'Local Multiplayer (Wi-Fi / LAN)'}
          </button>
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onOpenProfile();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500 text-slate-300 text-xs font-medium transition-all"
          >
            📊 {isRTL ? 'سجل الإحصائيات والمسيرة' : 'Stats & Career Record'}
          </button>
        </div>

        {/* AI Difficulty Selector */}
        <div className="flex items-center gap-2 mt-5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 px-2 font-medium">
            {isRTL ? 'صعوبة الخصم:' : 'AI Difficulty:'}
          </span>
          {(['easy', 'medium', 'hard', 'master'] as AIDifficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => {
                setSelectedDifficulty(diff);
                soundFX.playButtonClick();
              }}
              className={`px-3 py-1 rounded-lg font-semibold capitalize transition-colors ${
                selectedDifficulty === diff
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {diff === 'easy'
                ? isRTL ? 'مبتدئ' : 'Easy'
                : diff === 'medium'
                ? isRTL ? 'متوسط' : 'Medium'
                : diff === 'hard'
                ? isRTL ? 'محترف' : 'Hard'
                : isRTL ? 'أستاذ' : 'Master'}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Flat Control-Hint Line */}
      <footer className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 z-10 gap-2 border-t border-slate-900 pt-3">
        <div>
          {isRTL
            ? 'سحب الماوس/اللمس للتصويب · شريط القوة للتسديد · Enter/Space للبدء · Esc للإيقاف'
            : 'Touch/Drag to Aim · Side Gauge for Power · Enter / Space to Start · Esc to Pause'}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onRunDevTests();
            }}
            className="hover:text-sky-400 transition-colors underline"
          >
            {isRTL ? 'فحص الفيزياء والقواعد' : 'Verify Physics & Rules'}
          </button>
          <span>·</span>
          <span>v1.0.0 (Stage 1 Ready)</span>
        </div>
      </footer>

      {/* Match Stake / Wager Selection Modal */}
      {stakeTarget && (
        <MatchStakeModal
          gameMode={stakeTarget.mode}
          isVsAI={stakeTarget.isVsAI}
          userCoins={saveData.coins}
          initialDifficulty={selectedDifficulty}
          onConfirm={(stake, diff) => {
            setStakeTarget(null);
            onStartGame(stakeTarget.mode, stakeTarget.isVsAI, diff, undefined, stake);
          }}
          onClose={() => setStakeTarget(null)}
          onOpenDailySpin={onOpenDailySpin}
          language={language}
        />
      )}
    </div>
  );
};
