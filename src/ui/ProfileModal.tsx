/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language } from '../types/game';
import { COSMETIC_FRAMES, BALL_TRAILS, StorageManager, UserSaveData } from '../save/storage';
import { soundFX } from '../audio/soundFX';
import { getAvatarImage } from './avatarHelper';

interface ProfileModalProps {
  saveData: UserSaveData;
  onUpdateSaveData: (data: UserSaveData) => void;
  onClose: () => void;
  language: Language;
}

export const AVAILABLE_AVATARS = [
  { id: 'player1', label: 'إيميلي', labelEn: 'Emely', type: 'photo' },
  { id: 'mike', label: 'مايك', labelEn: 'Mike', type: 'photo' },
  { id: '🎱', label: 'الكرة الثامنة', labelEn: '8-Ball', type: 'emoji' },
  { id: '🎯', label: 'القناص', labelEn: 'Sniper', type: 'emoji' },
  { id: '👑', label: 'الملك', labelEn: 'Crown', type: 'emoji' },
  { id: '🦅', label: 'الصقر', labelEn: 'Falcon', type: 'emoji' },
  { id: '🐺', label: 'الذئب', labelEn: 'Wolf', type: 'emoji' },
  { id: '⚡', label: 'البرق', labelEn: 'Thunder', type: 'emoji' },
  { id: '🔥', label: 'لهيب النار', labelEn: 'Fire', type: 'emoji' },
  { id: '💎', label: 'الجوهرة', labelEn: 'Diamond', type: 'emoji' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  saveData,
  onUpdateSaveData,
  onClose,
  language,
}) => {
  const isRTL = language === 'ar';
  const [tab, setTab] = useState<'stats' | 'cosmetics' | 'history'>('stats');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(saveData.playerName);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const winRate = saveData.gamesPlayed > 0
    ? Math.round((saveData.gamesWon / saveData.gamesPlayed) * 100)
    : 0;

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    soundFX.playButtonClick();
    const updated = { ...saveData, playerName: nameInput.trim() };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
    setEditingName(false);
  };

  const handleSelectAvatar = (icon: string) => {
    soundFX.playButtonClick();
    const updated = { ...saveData, avatarIcon: icon };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 96, 96);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          soundFX.playVictoryChime();
          handleSelectAvatar(compressed);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleEquipFrame = (frameId: string) => {
    soundFX.playButtonClick();
    const updated = { ...saveData, nameFrame: frameId };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleBuyFrame = (frameId: string, price: number) => {
    if (saveData.coins < price) {
      soundFX.playFoulSound();
      return;
    }
    soundFX.playVictoryChime();
    const updated = {
      ...saveData,
      coins: saveData.coins - price,
      unlockedFrames: [...saveData.unlockedFrames, frameId],
      nameFrame: frameId,
    };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleEquipTrail = (trailId: string) => {
    soundFX.playButtonClick();
    const updated = { ...saveData, trailStyle: trailId };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleBuyTrail = (trailId: string, price: number) => {
    if (saveData.coins < price) {
      soundFX.playFoulSound();
      return;
    }
    soundFX.playVictoryChime();
    const updated = {
      ...saveData,
      coins: saveData.coins - price,
      unlockedTrails: [...saveData.unlockedTrails, trailId],
      trailStyle: trailId,
    };
    StorageManager.save(updated);
    onUpdateSaveData(updated);
  };

  const handleResetCareer = () => {
    soundFX.playButtonClick();
    const reset = StorageManager.resetProgress();
    onUpdateSaveData(reset);
    setShowResetConfirm(false);
  };

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
              <span>👤</span>
              <span>{isRTL ? 'الملف الشخصي والإحصاءات' : 'Player Career & Profile'}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Player Identity Hero Strip */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar with equipped frame */}
            <div
              onClick={() => {
                setTab('cosmetics');
                soundFX.playButtonClick();
              }}
              title={isRTL ? 'انقر لتغيير الصورة الرمزية' : 'Click to change avatar'}
              className={`relative w-16 h-16 rounded-2xl bg-slate-800 border-2 overflow-hidden flex items-center justify-center text-2xl shadow-lg cursor-pointer hover:scale-105 transition-transform ${
                COSMETIC_FRAMES.find(f => f.id === saveData.nameFrame)?.borderClass || 'border-slate-700'
              }`}
            >
              {getAvatarImage(saveData.avatarIcon) ? (
                <img src={getAvatarImage(saveData.avatarIcon)!} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{saveData.avatarIcon && !saveData.avatarIcon.startsWith('data:') ? saveData.avatarIcon : '🎱'}</span>
              )}
            </div>

            <div className="flex flex-col">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={18}
                    className="bg-slate-950 border border-sky-400 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-2.5 py-1 bg-sky-600 text-white rounded-lg text-xs font-bold"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white">{saveData.playerName}</span>
                  <button
                    onClick={() => {
                      setEditingName(true);
                      setNameInput(saveData.playerName);
                    }}
                    className="text-xs text-slate-400 hover:text-sky-400"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <span className="text-xs text-amber-400 font-semibold mt-0.5">
                {COSMETIC_FRAMES.find(f => f.id === saveData.nameFrame)?.name || 'Contender'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-mono">{isRTL ? 'الرصيد' : 'Coins'}</span>
              <span className="text-sm font-bold font-mono text-amber-300 tabular-nums">🪙 {saveData.coins}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-mono">{isRTL ? 'الكؤوس' : 'Trophies'}</span>
              <span className="text-sm font-bold font-mono text-amber-300 tabular-nums">🏆 {saveData.trophies}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('stats');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              tab === 'stats' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 {isRTL ? 'سجل الإحصائيات' : 'Career Statistics'}
          </button>
          <button
            onClick={() => {
              setTab('cosmetics');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              tab === 'cosmetics' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎨 {isRTL ? 'إطارات وأثر الكرات' : 'Frames & Ball Trails'}
          </button>
          <button
            onClick={() => {
              setTab('history');
              soundFX.playButtonClick();
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              tab === 'history' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 {isRTL ? 'المباريات الأخيرة' : 'Match History'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'stats' && (
            <div className="space-y-5">
              {/* Core KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col">
                  <span className="text-[11px] text-slate-400">{isRTL ? 'إجمالي المباريات' : 'Matches Played'}</span>
                  <span className="text-xl font-bold font-mono text-white tabular-nums mt-1">{saveData.gamesPlayed}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col">
                  <span className="text-[11px] text-slate-400">{isRTL ? 'الانتصارات' : 'Matches Won'}</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums mt-1">{saveData.gamesWon}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col">
                  <span className="text-[11px] text-slate-400">{isRTL ? 'نسبة الفوز' : 'Win Rate'}</span>
                  <span className="text-xl font-bold font-mono text-sky-400 tabular-nums mt-1">{winRate}%</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col">
                  <span className="text-[11px] text-slate-400">{isRTL ? 'أعلى سلسلة فوز' : 'Best Win Streak'}</span>
                  <span className="text-xl font-bold font-mono text-amber-400 tabular-nums mt-1">{saveData.bestStreak}</span>
                </div>
              </div>

              {/* Secondary Detailed Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {isRTL ? 'الأخطاء والإنجازات' : 'Fouls & Challenges Record'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">{isRTL ? 'أخطاء ارتكبتها' : 'Total Fouls'}</span>
                    <span className="font-mono font-bold text-rose-400 text-sm tabular-nums">{saveData.foulsCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isRTL ? 'سقوط الكرة البيضاء' : 'Scratch Fouls'}</span>
                    <span className="font-mono font-bold text-rose-400 text-sm tabular-nums">{saveData.scratchesCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isRTL ? 'التحديات المكتملة' : 'Challenges Cleared'}</span>
                    <span className="font-mono font-bold text-amber-300 text-sm tabular-nums">{saveData.challengesCompleted} / 5</span>
                  </div>
                </div>
              </div>

              {/* Avatar Picker */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {isRTL ? 'اختيار الرمز التعبيري أو الصورة' : 'Select Avatar or Photo'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AVATARS.map((av) => {
                    const isSelected =
                      saveData.avatarIcon === av.id ||
                      (av.id === 'player1' && (!saveData.avatarIcon || saveData.avatarIcon === 'player1' || saveData.avatarIcon === 'emely'));
                    const photoSrc = av.type === 'photo' ? getAvatarImage(av.id) : null;

                    return (
                      <button
                        key={av.id}
                        onClick={() => handleSelectAvatar(av.id)}
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-transform active:scale-95 overflow-hidden ${
                          isSelected
                            ? 'bg-sky-600/30 border-sky-400 ring-2 ring-sky-500/40 shadow'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                        title={isRTL ? av.label : av.labelEn}
                      >
                        {photoSrc ? (
                          <img src={photoSrc} alt={av.label} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{av.id}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset Progress Section */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-500">{isRTL ? 'الحفظ محلي دون اتصال 100%' : '100% Offline Local Persistence'}</span>
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="text-rose-400 hover:text-rose-300 underline"
                  >
                    {isRTL ? 'إعادة ضبط المسيرة' : 'Reset Career Data'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-950/80 p-2 rounded-xl border border-rose-800">
                    <span className="text-[11px] text-rose-200">{isRTL ? 'تأكيد الحذف؟' : 'Confirm reset?'}</span>
                    <button
                      onClick={handleResetCareer}
                      className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[11px]"
                    >
                      {isRTL ? 'نعم' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'cosmetics' && (
            <div className="space-y-6">
              {/* Profile Avatar & Character Photo */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {isRTL ? 'صورة الملف الشخصي والشخصية' : 'Profile Avatar & Character'}
                  </h4>
                  <label className="cursor-pointer px-3 py-1 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-transform active:scale-95">
                    <span>📷</span>
                    <span>{isRTL ? 'رفع صورتك الحقيقية' : 'Upload Real Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {AVAILABLE_AVATARS.map((av) => {
                    const isSelected =
                      saveData.avatarIcon === av.id ||
                      (av.id === 'player1' && (!saveData.avatarIcon || saveData.avatarIcon === 'player1' || saveData.avatarIcon === 'emely'));
                    const photoSrc = av.type === 'photo' ? getAvatarImage(av.id) : null;

                    return (
                      <button
                        key={av.id}
                        onClick={() => handleSelectAvatar(av.id)}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                          isSelected
                            ? 'bg-sky-950/80 border-sky-400 shadow-md ring-2 ring-sky-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center">
                          {photoSrc ? (
                            <img src={photoSrc} alt={av.label} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{av.id}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-full">
                          {isRTL ? av.label : av.labelEn}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-sky-400">
                            {isRTL ? 'مفعل' : 'Selected'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name Frames */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  {isRTL ? 'إطارات الأسماء التجميلية' : 'Player Name Frames'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COSMETIC_FRAMES.map((frame) => {
                    const isUnlocked = saveData.unlockedFrames.includes(frame.id);
                    const isEquipped = saveData.nameFrame === frame.id;

                    return (
                      <div
                        key={frame.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                          isEquipped
                            ? 'bg-slate-800/90 border-sky-400 shadow-lg'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{frame.icon}</span>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {isRTL ? frame.nameAr : frame.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isRTL ? frame.requirementAr : frame.requirement}
                            </span>
                          </div>
                        </div>

                        {isUnlocked ? (
                          <button
                            onClick={() => handleEquipFrame(frame.id)}
                            disabled={isEquipped}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-500'
                                : 'bg-sky-600 hover:bg-sky-500 text-white'
                            }`}
                          >
                            {isEquipped ? (isRTL ? 'مفعل' : 'Equipped') : (isRTL ? 'تفعيل' : 'Equip')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyFrame(frame.id, frame.price)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <span>🪙</span>
                            <span>{frame.price}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ball Trails */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  {isRTL ? 'مؤثرات أثر الكرات (Trails)' : 'Ball Movement Trails'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BALL_TRAILS.map((trail) => {
                    const isUnlocked = saveData.unlockedTrails.includes(trail.id);
                    const isEquipped = saveData.trailStyle === trail.id;

                    return (
                      <div
                        key={trail.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                          isEquipped
                            ? 'bg-slate-800/90 border-sky-400 shadow-lg'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {isRTL ? trail.nameAr : trail.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isRTL ? trail.requirementAr : trail.requirement}
                          </span>
                        </div>

                        {isUnlocked ? (
                          <button
                            onClick={() => handleEquipTrail(trail.id)}
                            disabled={isEquipped}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-500'
                                : 'bg-sky-600 hover:bg-sky-500 text-white'
                            }`}
                          >
                            {isEquipped ? (isRTL ? 'مفعل' : 'Equipped') : (isRTL ? 'تفعيل' : 'Equip')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyTrail(trail.id, trail.price)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <span>🪙</span>
                            <span>{trail.price}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {saveData.matchHistory && saveData.matchHistory.length > 0 ? (
                saveData.matchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.won ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <div>
                        <span className="font-bold text-white block">
                          {isRTL ? `ضد ${item.opponent}` : `vs ${item.opponent}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isRTL ? item.modeAr : item.mode} · {item.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${item.won ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.won ? (isRTL ? 'فوز' : 'WON') : (isRTL ? 'خسارة' : 'LOST')}
                      </span>
                      <span className="text-slate-500 font-mono">({item.score})</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  {isRTL ? 'لا توجد مباريات مسجلة بعد. العب مباراتك الأولى الآن!' : 'No match history recorded yet. Play your first match!'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
