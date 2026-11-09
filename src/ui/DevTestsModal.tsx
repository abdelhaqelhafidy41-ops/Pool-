/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { runPhysicsAndRulesSelfTest, TestResult } from '../tests/physicsAndRules';
import { Language } from '../types/game';
import { soundFX } from '../audio/soundFX';

interface DevTestsModalProps {
  onClose: () => void;
  language: Language;
}

export const DevTestsModal: React.FC<DevTestsModalProps> = ({ onClose, language }) => {
  const isRTL = language === 'ar';
  const [results, setResults] = useState<TestResult[]>(() => runPhysicsAndRulesSelfTest());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleRerun = () => {
    soundFX.playButtonClick();
    setResults(runPhysicsAndRulesSelfTest());
  };

  const filteredResults = activeCategory === 'all'
    ? results
    : results.filter(r => r.category === activeCategory);

  const passedCount = results.filter(r => r.passed).length;
  const allPassed = passedCount === results.length;

  const handleCopyReport = () => {
    const report = results
      .map((r, i) => `${i + 1}. [${r.passed ? 'PASS' : 'FAIL'}] ${r.name} — ${r.details}`)
      .join('\n');
    const header = `=== Cue Masters: Local Pool Automated Self-Test (Stage 5) ===\nTotal: ${results.length}, Passed: ${passedCount}, Failed: ${results.length - passedCount}\n\n`;
    navigator.clipboard.writeText(header + report).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    });
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧪</span>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isRTL ? 'منظومة الاختبارات الآلية والتحقق (Stage 5)' : 'Automated Verification Harness (Stage 5)'}
              </h2>
              <span className="text-[11px] text-slate-400">
                {isRTL ? 'اختبارات الفيزياء، القواعد، الشبكات، الحفظ، والمنصات' : 'Physics, Rules, Network, AI/Save, & Platform Audits'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800 text-xs font-semibold overflow-x-auto bg-slate-950/40">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              activeCategory === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isRTL ? 'الكل' : 'All'} ({results.length})
          </button>
          <button
            onClick={() => setActiveCategory('physics')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              activeCategory === 'physics' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ⚛️ {isRTL ? 'الفيزياء' : 'Physics'}
          </button>
          <button
            onClick={() => setActiveCategory('rules')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              activeCategory === 'rules' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🎱 {isRTL ? 'القواعد' : 'Rules'}
          </button>
          <button
            onClick={() => setActiveCategory('network')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              activeCategory === 'network' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            📡 {isRTL ? 'الشبكة' : 'Network'}
          </button>
          <button
            onClick={() => setActiveCategory('ai_save')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              activeCategory === 'ai_save' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            💾 {isRTL ? 'الذكاء والحفظ' : 'AI & Save'}
          </button>
          <button
            onClick={() => setActiveCategory('accessibility_platform')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              activeCategory === 'accessibility_platform' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ♿ {isRTL ? 'المنصة والوصول' : 'Platform & A11y'}
          </button>
          <button
            onClick={() => setActiveCategory('view_3d_2d')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              activeCategory === 'view_3d_2d' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🧊 {isRTL ? 'منظور 2D و3D' : '2D/3D Views'}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs text-slate-400">
              {isRTL ? 'نتيجة الفحص الآلي:' : 'Verification Status:'}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-lg ${
                  allPassed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {allPassed
                  ? (isRTL ? `جميع الاختبارات ناجحة (${passedCount}/${results.length})` : `ALL TESTS PASSED (${passedCount}/${results.length})`)
                  : `${passedCount}/${results.length} PASSED`}
              </span>
              <button
                onClick={handleCopyReport}
                className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
              >
                {copiedSummary ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          {filteredResults.map((r, i) => (
            <div
              key={r.id || i}
              className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">{isRTL ? r.nameAr : r.name}</span>
                <span
                  className={`font-mono font-bold whitespace-nowrap ${
                    r.passed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {r.passed ? '✓ PASSED' : '✗ FAILED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed mt-0.5">{r.details}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 font-mono">
            {isRTL ? 'اختبارات حقيقية مؤكدة بنسبة 100%' : '100% Deterministic Unit & Integration Suite'}
          </span>
          <button
            onClick={handleRerun}
            className="py-2 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{isRTL ? 'إعادة تشغيل الفحص' : 'Re-run Tests'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
