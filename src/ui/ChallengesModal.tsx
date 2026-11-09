/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, PracticeRackType } from '../types/game';
import { soundFX } from '../audio/soundFX';
import { UserSaveData } from '../save/storage';

export interface ChallengeItem {
  id: string;
  drillType: PracticeRackType;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  starsReward: number;
  coinReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const OFFLINE_CHALLENGES: ChallengeItem[] = [
  {
    id: 'ch_bank_shot',
    drillType: 'trick_shot_1',
    titleEn: 'Corner Bank Precision',
    titleAr: 'دقة ارتداد الزاوية',
    descEn: 'Bank the object ball off the far cushion into the corner pocket.',
    descAr: 'اجعل الكرة المستهدفة ترتد من الوسادة البعيدة وتسقط في جيب الزاوية.',
    starsReward: 3,
    coinReward: 200,
    difficulty: 'easy',
  },
  {
    id: 'ch_obstacle_carom',
    drillType: 'trick_shot_2',
    titleEn: 'Obstacle Carom',
    titleAr: 'تجاوز العوائق بالدوران',
    descEn: 'Maneuver around two blocking cluster balls and sink the #9 ball.',
    descAr: 'تجاوز كرتين تعترضان المسار وأسقط الكرة رقم 9 بنجاح.',
    starsReward: 3,
    coinReward: 300,
    difficulty: 'medium',
  },
  {
    id: 'ch_line_drill',
    drillType: 'line_drill',
    titleEn: 'Straight Line Stun',
    titleAr: 'تمرين الخط المستقيم',
    descEn: 'Sink all 4 aligned balls consecutively with precision cue ball control.',
    descAr: 'أسقط الكرات الأربع المصطفة بالتوالي مع تحكم تام بالكرة البيضاء.',
    starsReward: 3,
    coinReward: 250,
    difficulty: 'medium',
  },
  {
    id: 'ch_speed_run',
    drillType: '8ball_rack',
    titleEn: 'Quick 8-Ball Clean',
    titleAr: 'تصفية الطاولة السريعة',
    descEn: 'Pocket at least 4 balls in open practice within 60 seconds.',
    descAr: 'أسقط 4 كرات على الأقل في التدريب المفتوح قبل نفاد 60 ثانية.',
    starsReward: 3,
    coinReward: 350,
    difficulty: 'hard',
  },
  {
    id: 'ch_diamond_nine',
    drillType: '9ball_diamond',
    titleEn: 'Golden 9 Rotation',
    titleAr: 'تسلسل الكرة التاسعة',
    descEn: 'Execute a legal combination shot to pocket the #9 ball early.',
    descAr: 'نفذ ضربة مركبة قانونية لإسقاط الكرة رقم 9 في جيب الزاوية.',
    starsReward: 3,
    coinReward: 400,
    difficulty: 'hard',
  },
];

interface ChallengesModalProps {
  saveData: UserSaveData;
  onStartChallenge: (drillType: PracticeRackType, challengeId: string) => void;
  onClose: () => void;
  language: Language;
}

export const ChallengesModal: React.FC<ChallengesModalProps> = ({
  saveData,
  onStartChallenge,
  onClose,
  language,
}) => {
  const isRTL = language === 'ar';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>🎯</span>
              <span>{isRTL ? 'تحديات المهارة الفردية' : 'Skill Challenges (100% Offline)'}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            {isRTL
              ? 'تحديات مهارة تكتيكية مصممة لرفع دقة تصويبك وقدرتك على التحكم بدوران الكرة دون الحاجة لأي اتصال بالإنترنت.'
              : 'Standalone tactical pool drills designed to hone your cut angles, cue ball english, and bank shot accuracy.'}
          </p>

          <div className="space-y-3">
            {OFFLINE_CHALLENGES.map((ch) => {
              const stars = saveData.challengeStars[ch.id] || 0;
              const isCompleted = stars > 0;

              return (
                <div
                  key={ch.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isCompleted
                      ? 'bg-slate-950/70 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        {isRTL ? ch.titleAr : ch.titleEn}
                      </h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                        ch.difficulty === 'easy'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : ch.difficulty === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {ch.difficulty}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 max-w-md">
                      {isRTL ? ch.descAr : ch.descEn}
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-amber-300 font-mono font-bold flex items-center gap-1">
                        <span>🪙</span>
                        <span>+{ch.coinReward}</span>
                      </span>
                      <span className="text-xs text-amber-400">
                        {'★'.repeat(stars) + '☆'.repeat(3 - stars)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundFX.playButtonClick();
                      onStartChallenge(ch.drillType, ch.id);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 ${
                      isCompleted
                        ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40'
                        : 'bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white shadow-md'
                    }`}
                  >
                    {isCompleted ? (isRTL ? 'إعادة التحدي' : 'Retry') : (isRTL ? 'بدء التحدي' : 'Play Drill')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
