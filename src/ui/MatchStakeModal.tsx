/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AIDifficulty, GameMode, Language } from '../types/game';
import { soundFX } from '../audio/soundFX';

export interface MatchStakeModalProps {
  gameMode: GameMode;
  isVsAI: boolean;
  userCoins: number;
  initialDifficulty?: AIDifficulty;
  onConfirm: (stake: number, difficulty: AIDifficulty) => void;
  onClose: () => void;
  onOpenDailySpin?: () => void;
  language: Language;
}

export interface WagerTier {
  stake: number;
  title: string;
  titleAr: string;
  icon: string;
  badge?: string;
  badgeAr?: string;
}

export const WAGER_TIERS: WagerTier[] = [
  {
    stake: 0,
    title: 'Friendly Practice',
    titleAr: 'مباراة ودية مجانية',
    icon: '🤝',
    badge: 'No Risk',
    badgeAr: 'بدون رهان',
  },
  {
    stake: 50,
    title: 'Beginner Table',
    titleAr: 'طاولة المبتدئين',
    icon: '🥉',
  },
  {
    stake: 100,
    title: 'Club Challenger',
    titleAr: 'تحدي النادي',
    icon: '🥈',
    badge: 'Popular',
    badgeAr: 'شائعة',
  },
  {
    stake: 250,
    title: 'Pro Lounge',
    titleAr: 'صالة المحترفين',
    icon: '🥇',
  },
  {
    stake: 500,
    title: 'VIP Master Room',
    titleAr: 'غرفة النخبة VIP',
    icon: '👑',
  },
  {
    stake: 1000,
    title: 'Grand Champions',
    titleAr: 'بطولة الأساتذة',
    icon: '💎',
  },
  {
    stake: 2500,
    title: 'High Roller Arena',
    titleAr: 'ساحة كبار المراهنين',
    icon: '🔥',
  },
  {
    stake: 5000,
    title: 'Legendary Colosseum',
    titleAr: 'كولوسيوم الأساطير',
    icon: '⚡',
  },
];

export const MatchStakeModal: React.FC<MatchStakeModalProps> = ({
  gameMode,
  isVsAI,
  userCoins,
  initialDifficulty = 'medium',
  onConfirm,
  onClose,
  onOpenDailySpin,
  language,
}) => {
  const isRTL = language === 'ar';
  const [selectedStake, setSelectedStake] = useState<number>(() => {
    // Pick the most appropriate affordable tier by default (e.g. 50 or 100 if user has enough, else 0)
    if (userCoins >= 100) return 100;
    if (userCoins >= 50) return 50;
    return 0;
  });
  const [difficulty, setDifficulty] = useState<AIDifficulty>(initialDifficulty);

  const selectedTier = WAGER_TIERS.find(t => t.stake === selectedStake) || WAGER_TIERS[0];
  const winPot = selectedStake > 0 ? selectedStake * 2 : 0;
  const canAfford = selectedStake === 0 || userCoins >= selectedStake;

  const handleStartMatch = () => {
    if (!canAfford) {
      soundFX.playFoulSound();
      return;
    }
    soundFX.playButtonClick();
    onConfirm(selectedStake, difficulty);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none"
    >
      <div className="bg-gradient-to-b from-[#131b2e] to-[#0a0f1d] border-2 border-slate-700/80 rounded-3xl w-full max-w-lg shadow-[0_15px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪙</span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isRTL ? 'اختر رهان المباراة وقيمة الكوين' : 'Select Match Stake'}
              </h2>
              <p className="text-xs text-slate-400">
                {isVsAI
                  ? isRTL ? 'مباراة فردية ضد الذكاء الاصطناعي' : 'Solo Match vs AI'
                  : isRTL ? 'لعب محلي لشخصين على نفس الجهاز' : 'Pass & Play Local Multiplayer'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Balance Status Bar */}
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">
              {isRTL ? 'رصيدك الحالي:' : 'Your Balance:'}
            </span>
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-amber-300 font-mono font-bold text-xs sm:text-sm">
              <span>🪙</span>
              <span>{userCoins.toLocaleString()}</span>
            </div>
          </div>

          {onOpenDailySpin && (
            <button
              onClick={() => {
                soundFX.playButtonClick();
                onOpenDailySpin();
              }}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 hover:underline"
            >
              <span>🎡</span>
              <span>{isRTL ? 'عجلة الحظ اليومية' : 'Daily Spin'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {/* Difficulty selector (Only when vs AI) */}
          {isVsAI && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isRTL ? 'مستوى صعوبة الخصم:' : 'AI Difficulty:'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['easy', 'medium', 'hard', 'master'] as AIDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      soundFX.playButtonClick();
                      setDifficulty(d);
                    }}
                    className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      difficulty === d
                        ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d === 'easy'
                      ? isRTL ? 'مبتدئ' : 'Easy'
                      : d === 'medium'
                      ? isRTL ? 'متوسط' : 'Med'
                      : d === 'hard'
                      ? isRTL ? 'صعب' : 'Hard'
                      : isRTL ? 'أستاذ' : 'Master'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stake Tier Grid */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">
              {isRTL ? 'اختر قيمة الرهان:' : 'Choose Wager Tier:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WAGER_TIERS.map((tier) => {
                const isAffordable = tier.stake === 0 || userCoins >= tier.stake;
                const isSelected = selectedStake === tier.stake;

                return (
                  <button
                    key={tier.stake}
                    onClick={() => {
                      if (!isAffordable) {
                        soundFX.playFoulSound();
                        return;
                      }
                      soundFX.playButtonClick();
                      setSelectedStake(tier.stake);
                    }}
                    disabled={!isAffordable}
                    className={`relative p-2.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-1 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/25 via-amber-600/20 to-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-lg scale-[1.02]'
                        : isAffordable
                        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-850'
                        : 'bg-slate-950/60 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {tier.badge && (
                      <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow-xs">
                        {isRTL ? tier.badgeAr : tier.badge}
                      </span>
                    )}

                    <span className="text-xl mt-0.5">{tier.icon}</span>

                    <span className="text-xs font-black text-white font-mono mt-0.5">
                      {tier.stake === 0 ? (isRTL ? 'مجاني' : 'Free') : `${tier.stake.toLocaleString()} 🪙`}
                    </span>

                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                      {isRTL ? tier.titleAr : tier.title}
                    </span>

                    {!isAffordable && (
                      <span className="text-[9px] text-rose-400 font-bold flex items-center gap-0.5">
                        <span>🔒</span>
                        <span>{isRTL ? 'رصيد غير كافٍ' : 'Locked'}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pot Preview Summary Box */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-semibold">
                {isRTL ? 'الجائزة الكلية للفائز (The Pot):' : 'Winner Takes All Pot:'}
              </span>
              <span className="text-base sm:text-lg font-black text-amber-300 font-mono flex items-center gap-1 mt-0.5">
                <span>🏆</span>
                <span>{winPot > 0 ? `${winPot.toLocaleString()} كوين` : isRTL ? 'مباراة ودية (بدون كوين)' : 'Friendly (0 Coins)'}</span>
              </span>
            </div>

            <div className="text-right" dir={isRTL ? 'rtl' : 'ltr'}>
              <span className="text-[10px] text-slate-400">
                {selectedStake > 0
                  ? isRTL
                    ? `تخصم ${selectedStake} الآن وتربح ${selectedStake} صافي عند الفوز`
                    : `Deducts ${selectedStake} now, net profit +${selectedStake} on win`
                  : isRTL
                  ? 'مباراة تدريبية بدون خسارة كوين'
                  : 'Friendly match with zero coin risk'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-1/3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            onClick={handleStartMatch}
            disabled={!canAfford}
            className={`w-2/3 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 ${
              canAfford
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-amber-500/30 hover:brightness-105'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>🎱</span>
            <span>
              {isRTL ? 'ابدأ المباراة الآن' : 'Start Match'} ({selectedStake > 0 ? `${selectedStake} 🪙` : isRTL ? 'مجاني' : 'Free'})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
