/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CueItem, Language, TableFeltTheme } from '../types/game';
import { DEFAULT_CUES, DEFAULT_FELTS, StorageManager, UserSaveData } from '../save/storage';
import { soundFX } from '../audio/soundFX';

interface CueShopModalProps {
  saveData: UserSaveData;
  onUpdateSaveData: (data: UserSaveData) => void;
  onClose: () => void;
  onOpenDailySpin?: () => void;
  language: Language;
}

export const CueShopModal: React.FC<CueShopModalProps> = ({
  saveData,
  onUpdateSaveData,
  onClose,
  onOpenDailySpin,
  language,
}) => {
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState<'cues' | 'felts'>('cues');
  const [selectedCueId, setSelectedCueId] = useState<string>(saveData.selectedCueId);
  const [namingCueId, setNamingCueId] = useState<string | null>(null);
  const [customNameInput, setCustomNameInput] = useState<string>('');

  const selectedCue = DEFAULT_CUES.find(c => c.id === selectedCueId) || DEFAULT_CUES[0];
  const customName = saveData.customCueNames[selectedCue.id] || (isRTL ? selectedCue.nameAr : selectedCue.name);

  const handleEquipCue = (cueId: string) => {
    soundFX.playButtonClick();
    const updated = { ...saveData, selectedCueId: cueId };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleBuyCue = (cue: CueItem) => {
    if (saveData.coins < cue.price) {
      soundFX.playFoulSound();
      return;
    }
    soundFX.playVictoryChime();
    const updated: UserSaveData = {
      ...saveData,
      coins: saveData.coins - cue.price,
      unlockedCues: [...saveData.unlockedCues, cue.id],
      selectedCueId: cue.id,
    };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleEquipFelt = (feltId: string) => {
    soundFX.playButtonClick();
    const updated = { ...saveData, selectedTableFeltId: feltId };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleBuyFelt = (felt: TableFeltTheme) => {
    if (saveData.coins < felt.price) {
      soundFX.playFoulSound();
      return;
    }
    soundFX.playVictoryChime();
    const updated: UserSaveData = {
      ...saveData,
      coins: saveData.coins - felt.price,
      unlockedFelts: [...saveData.unlockedFelts, felt.id],
      selectedTableFeltId: felt.id,
    };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleSaveCustomCueName = (cueId: string) => {
    if (!customNameInput.trim()) return;
    soundFX.playButtonClick();
    const updated = StorageManager.renameCue(cueId, customNameInput.trim());
    onUpdateSaveData(updated);
    setNamingCueId(null);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>🎯</span>
              <span>{isRTL ? 'متجر البلياردو والتخصيص' : 'Cue & Felt Pro Shop'}</span>
            </h2>
            {/* Coins balance */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/30 px-3 py-1 rounded-xl text-xs font-semibold text-amber-300">
              <span>🪙</span>
              <span className="font-mono tabular-nums text-white">{saveData.coins}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDailySpin && (
              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  onOpenDailySpin();
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 text-xs font-black hover:brightness-110 shadow-sm active:scale-95"
              >
                <span>🎡</span>
                <span>{isRTL ? 'عجلة الحظ' : 'Daily Spin'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80">
          <button
            onClick={() => {
              setActiveTab('cues');
              soundFX.playButtonClick();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all ${
              activeTab === 'cues'
                ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎱 {isRTL ? 'عصي البلياردو' : 'Cue Sticks'}
          </button>
          <button
            onClick={() => {
              setActiveTab('felts');
              soundFX.playButtonClick();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all ${
              activeTab === 'felts'
                ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🟩 {isRTL ? 'أقمشة الطاولة (Felt)' : 'Table Felts'}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'cues' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cue List */}
              <div className="flex flex-col gap-3">
                {DEFAULT_CUES.map((cue) => {
                  const isUnlocked = saveData.unlockedCues.includes(cue.id);
                  const isEquipped = saveData.selectedCueId === cue.id;
                  const displayName = saveData.customCueNames[cue.id] || (isRTL ? cue.nameAr : cue.name);

                  return (
                    <div
                      key={cue.id}
                      onClick={() => setSelectedCueId(cue.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        selectedCueId === cue.id
                          ? 'bg-slate-800/90 border-sky-500 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Cue Tip Color Preview */}
                        <div
                          className="w-4 h-12 rounded-full border border-white/20 shadow-inner"
                          style={{
                            background: `linear-gradient(to bottom, ${cue.colorScheme.tip}, ${cue.colorScheme.shaft}, ${cue.colorScheme.butt})`,
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            {displayName}
                            {isEquipped && (
                              <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-mono">
                                {isRTL ? 'مفعل' : 'EQUIPPED'}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400">
                            {isRTL ? `قوة ${cue.power}x · دليل ${cue.aimGuideLength}px` : `Power ${cue.power}x · Aim ${cue.aimGuideLength}px`}
                          </span>
                        </div>
                      </div>

                      {/* Buy or Equip Button */}
                      <div>
                        {isUnlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEquipCue(cue.id);
                            }}
                            disabled={isEquipped}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-500 cursor-default'
                                : 'bg-sky-600 hover:bg-sky-500 text-white'
                            }`}
                          >
                            {isEquipped ? (isRTL ? 'مفعل' : 'Equipped') : (isRTL ? 'تفعيل' : 'Equip')}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuyCue(cue);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 shadow"
                          >
                            <span>🪙</span>
                            <span>{cue.price}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Cue Spotlight & "NAME THIS CUE!" Feature */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      {isRTL ? 'تفاصيل العصا' : 'Cue Showcase'}
                    </span>
                    {/* The prominent "NAME THIS CUE!" button */}
                    <button
                      onClick={() => {
                        setNamingCueId(selectedCue.id);
                        setCustomNameInput(customName);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-colors"
                    >
                      ✏️ {isRTL ? 'سَمِّ هذه العصا! (NAME THIS CUE!)' : 'NAME THIS CUE!'}
                    </button>
                  </div>

                  {/* Naming Form Modal / Inline */}
                  {namingCueId === selectedCue.id ? (
                    <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-3 mb-4 flex flex-col gap-2">
                      <label className="text-xs font-medium text-amber-300">
                        {isRTL ? 'اكتب اسماً مخصصاً لعصاك:' : 'Enter a custom name for this cue:'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customNameInput}
                          onChange={(e) => setCustomNameInput(e.target.value)}
                          maxLength={25}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-amber-400"
                          placeholder={isRTL ? 'اسم العصا...' : 'Custom Cue Name...'}
                        />
                        <button
                          onClick={() => handleSaveCustomCueName(selectedCue.id)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
                        >
                          {isRTL ? 'حفظ' : 'Save'}
                        </button>
                        <button
                          onClick={() => setNamingCueId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h3 className="text-xl font-black text-slate-100 mb-1">{customName}</h3>
                  )}

                  {/* Visual Cue Stick Preview */}
                  <div className="w-full h-10 rounded-full my-4 p-1 bg-slate-900 border border-slate-800 flex items-center shadow-inner">
                    <div
                      className="w-full h-4 rounded-full"
                      style={{
                        background: `linear-gradient(to right, ${selectedCue.colorScheme.tip} 0%, ${selectedCue.colorScheme.shaft} 30%, ${selectedCue.colorScheme.wrap} 70%, ${selectedCue.colorScheme.butt} 100%)`,
                        boxShadow: `0 0 10px ${selectedCue.colorScheme.glow}`,
                      }}
                    />
                  </div>

                  {/* Stats Progress Bars */}
                  <div className="space-y-3 mt-4 text-xs font-medium">
                    {/* Power */}
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>{isRTL ? 'قوة التسديد' : 'Shot Power'}</span>
                        <span className="font-mono tabular-nums">{Math.round(selectedCue.power * 100)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all"
                          style={{ width: `${(selectedCue.power / 1.35) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Aim Guide Length */}
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>{isRTL ? 'طول خط التصويب' : 'Aim Guide Length'}</span>
                        <span className="font-mono tabular-nums">{selectedCue.aimGuideLength}px</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full transition-all"
                          style={{ width: `${(selectedCue.aimGuideLength / 700) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Spin Control */}
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>{isRTL ? 'التحكم بالدوران (Spin)' : 'English Spin Control'}</span>
                        <span className="font-mono tabular-nums">{Math.round(selectedCue.spinControl * 100)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${(selectedCue.spinControl / 1.3) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 text-center mt-4">
                  {isRTL ? 'ترقية العصي تمنحك دقة أكبر ومسافة تصويب أطول!' : 'Upgrading cues provides extended guide lines and superior ball control!'}
                </div>
              </div>
            </div>
          ) : (
            /* Felt Cloth Themes Tab */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {DEFAULT_FELTS.map((felt) => {
                const isUnlocked = saveData.unlockedFelts.includes(felt.id);
                const isEquipped = saveData.selectedTableFeltId === felt.id;

                return (
                  <div
                    key={felt.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-slate-800/90 border-sky-500 shadow-xl'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Felt Color Swatch Preview */}
                      <div
                        className="w-full h-24 rounded-xl border-4 border-amber-950/80 shadow-inner flex items-center justify-center mb-3"
                        style={{ backgroundColor: felt.feltColor }}
                      >
                        <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center font-bold text-xs text-slate-900">
                          8
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-100">
                        {isRTL ? felt.nameAr : felt.name}
                      </h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipFelt(felt.id)}
                          disabled={isEquipped}
                          className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isEquipped
                              ? 'bg-slate-800 text-slate-500 cursor-default'
                              : 'bg-sky-600 hover:bg-sky-500 text-white'
                          }`}
                        >
                          {isEquipped ? (isRTL ? 'مفعل للطاولة' : 'Equipped') : (isRTL ? 'استخدام هذا القماش' : 'Equip Felt')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyFelt(felt)}
                          className="w-full py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1 shadow"
                        >
                          <span>🪙</span>
                          <span>{felt.price}</span>
                          <span>{isRTL ? 'شراء' : 'Unlock'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
