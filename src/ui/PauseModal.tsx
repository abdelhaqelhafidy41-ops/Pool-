/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, RuleVariant } from '../types/game';
import { soundFX } from '../audio/soundFX';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings?: () => void;
  ruleVariant: RuleVariant;
  onToggleRuleVariant: (variant: RuleVariant) => void;
  language: Language;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuitToTitle,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  ruleVariant,
  onToggleRuleVariant,
  language,
}) => {
  const isRTL = language === 'ar';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl text-sky-400">
          ⏸
        </div>
        <h2 className="text-xl font-bold text-slate-100">
          {isRTL ? 'إيقاف مؤقت' : 'Game Paused'}
        </h2>

        {/* Rule Variant Selector */}
        <div className="w-full bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-left">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-2">
            <span>{isRTL ? 'نظام القواعد:' : 'Rules Variant:'}</span>
            <span className="text-sky-400 font-mono text-[11px]">
              {ruleVariant === 'wpa_official' ? 'WPA Official' : isRTL ? 'قواعد منزلية' : 'House Rules'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => onToggleRuleVariant('wpa_official')}
              className={`py-1.5 px-2 rounded-xl font-medium transition-all ${
                ruleVariant === 'wpa_official'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {isRTL ? 'قواعد WPA الرسمية' : 'WPA Official'}
            </button>
            <button
              onClick={() => onToggleRuleVariant('house_rules')}
              className={`py-1.5 px-2 rounded-xl font-medium transition-all ${
                ruleVariant === 'house_rules'
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {isRTL ? 'قواعد منزلية' : 'House Rules'}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            {ruleVariant === 'wpa_official'
              ? isRTL
                ? 'كرة في اليد في أي مكان عند الخطأ. إعادة الكرة 8 عند إسقاطها افتتاحياً.'
                : 'Ball-in-hand anywhere on table on foul. 8-ball on break is respotted.'
              : isRTL
                ? 'إسقاط الكرة 8 في الضربة الافتتاحية يمنح الفوز! الكرة في اليد خلف خط الرأس.'
                : '8-ball on break wins frame! Scratches require placing behind head string.'}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full mt-1">
          {/* Resume */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onResume();
            }}
            className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            {isRTL ? 'متابعة اللعب' : 'Resume'}
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onRestart();
            }}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs uppercase tracking-wider transition-all active:scale-95"
          >
            {isRTL ? 'إعادة المباراة' : 'Restart Match'}
          </button>

          {/* Toggle Sound */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onToggleSound();
            }}
            className="w-full py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span>{soundEnabled ? (isRTL ? 'كتم الصوت' : 'Mute Audio') : (isRTL ? 'تشغيل الصوت' : 'Unmute Audio')}</span>
          </button>

          {/* Open Settings Modal */}
          {onOpenSettings && (
            <button
              onClick={() => {
                soundFX.playButtonClick();
                onOpenSettings();
              }}
              className="w-full py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>⚙️</span>
              <span>{isRTL ? 'إعدادات اللعبة والوصول' : 'Settings & Accessibility'}</span>
            </button>
          )}

          {/* Quit to Main Menu */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onQuitToTitle();
            }}
            className="w-full py-2.5 rounded-2xl text-rose-400 hover:bg-rose-950/30 text-xs font-semibold transition-colors mt-1"
          >
            {isRTL ? 'الخروج للقائمة الرئيسية' : 'Exit to Main Menu'}
          </button>
        </div>
      </div>
    </div>
  );
};
