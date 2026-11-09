/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language } from '../types/game';

interface RulesModalProps {
  onClose: () => void;
  language: Language;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose, language }) => {
  const isRTL = language === 'ar';
  const [tab, setTab] = useState<'8ball' | '9ball' | 'physics'>('8ball');

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>📖</span>
            <span>{isRTL ? 'قواعد البلياردو والفيزياء' : 'Official Rules & Physics Guide'}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setTab('8ball')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              tab === '8ball' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎱 {isRTL ? 'الكرة الثامنة (8-Ball)' : '8-Ball Rules'}
          </button>
          <button
            onClick={() => setTab('9ball')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              tab === '9ball' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🟡 {isRTL ? 'الكرة التاسعة (9-Ball)' : '9-Ball Rules'}
          </button>
          <button
            onClick={() => setTab('physics')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              tab === 'physics' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ {isRTL ? 'الدوران والفيزياء' : 'Physics & Spin'}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs md:text-sm text-slate-300 leading-relaxed">
          {tab === '8ball' && (
            <>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sky-400 text-sm">
                  {isRTL ? '1. المجموعات والطاولة المفتوحة (Open Table)' : '1. Groups & Open Table'}
                </h4>
                <p>
                  {isRTL
                    ? 'في بداية المباراة تكون الطاولة مفتوحة. أول كرة تسقط قانونياً تحدد مجموعة اللاعب (الكرات السادة 1-7 أو الكرات المخططة 9-15).'
                    : 'The table is open after the break. The first legally pocketed ball assigns that group (Solids 1-7 or Stripes 9-15) to that player.'}
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 text-sm">
                  {isRTL ? '2. الأخطاء والكرة في اليد (Fouls & Ball in Hand)' : '2. Fouls & Ball In Hand'}
                </h4>
                <p>
                  {isRTL
                    ? 'يحدث خطأ إذا سقطت الكرة البيضاء (Scratch)، أو لم تلمس الكرة البيضاء أي كرة، أو لمست كرة من مجموعة الخصم أولاً. عند حدوث خطأ، يحصل الخصم على الكرة في اليد (Ball in Hand) ويضعها في أي مكان على الطاولة.'
                    : 'A foul occurs if the cue ball is pocketed (scratch), fails to contact any ball, or contacts the opponent’s group first. The opponent receives Ball in Hand anywhere on the table.'}
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-rose-400 text-sm">
                  {isRTL ? '3. الفوز والخسارة بالكرة 8 (The 8-Ball)' : '3. Sinking the 8-Ball'}
                </h4>
                <p>
                  {isRTL
                    ? 'يجب إنهاء جميع كرات مجموعتك أولاً قبل إسقاط الكرة رقم 8. إذا أسقطت الكرة 8 قبل تصفية مجموعتك، أو سقطت معها الكرة البيضاء، تخسر المباراة فوراً. إسقاط الكرة 8 قانونياً بعد تصفية المجموعة يمنحك الفوز!'
                    : 'Clear all 7 of your group balls before attempting the 8-ball. Sinking the 8-ball early or scratching on the 8-ball is an instant loss. Sinking the 8-ball legally wins the match!'}
                </p>
              </div>
            </>
          )}

          {tab === '9ball' && (
            <>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 text-sm">
                  {isRTL ? '1. ضرب الكرة ذات الرقم الأصغر أولاً' : '1. Lowest Numbered Ball First'}
                </h4>
                <p>
                  {isRTL
                    ? 'في لعبة 9-Ball، يجب دائماً أن تلمس الكرة البيضاء أصغر رقم موجود على الطاولة أولاً (1، ثم 2، وهكذا).'
                    : 'In 9-Ball, the cue ball must make first contact with the lowest numbered ball currently on the table.'}
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">
                  {isRTL ? '2. الضربات المركبة (Combinations)' : '2. Combination Shots'}
                </h4>
                <p>
                  {isRTL
                    ? 'طالما لمست الكرة الأصغر أولاً، يمكنك إسقاط أي كرة أخرى على الطاولة بضربة مركبة ومواصلة دورك!'
                    : 'As long as the lowest ball is struck first, any ball that drops into a pocket counts and keeps you at the table!'}
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sky-400 text-sm">
                  {isRTL ? '3. الفوز بالكرة 9' : '3. Sinking the 9-Ball'}
                </h4>
                <p>
                  {isRTL
                    ? 'إسقاط الكرة رقم 9 في أي ضربة قانونية (حتى في الضربة الافتتاحية Break أو بضربة مركبة) يحقق الفوز بالمباراة فوراً!'
                    : 'Sinking the 9-ball on any legal shot (including combinations or break) wins the frame instantly!'}
                </p>
              </div>
            </>
          )}

          {tab === 'physics' && (
            <>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sky-400 text-sm">
                  {isRTL ? 'تأثيرات الدوران (English / Spin)' : 'Cue Ball Spin (English)'}
                </h4>
                <p>
                  {isRTL
                    ? 'انقر على زر الدوران أسفل الشاشة لتحريك نقطة الضربة: توب سبن (Topspin/Follow) يدفع الكرة للأمام بعد الاصطدام، باك سبن (Backspin/Draw) يسحبها للخلف، والدوران الجانبي (Sidespin) يغير زاوية الارتداد من وسائد الطاولة.'
                    : 'Use the Spin control to strike off-center: Topspin carries the cue ball forward after impact, Backspin/Draw pulls it back, and Sidespin modifies cushion rebound angles.'}
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">
                  {isRTL ? 'الكرة الشبح وخط التصويب' : 'Ghost Ball & Aim Trajectory'}
                </h4>
                <p>
                  {isRTL
                    ? 'توضح الدائرة البيضاء الشفافة الموضع الدقيق الذي يجب أن تصل إليه الكرة البيضاء لتصطدم بالكرة المستهدفة وترسلها مباشرة نحو الجيب.'
                    : 'The ghost ball ring displays the exact contact point needed to deflect the object ball directly into your chosen pocket.'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
