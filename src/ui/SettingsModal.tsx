/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language } from '../types/game';
import { BALL_STYLES, StorageManager, UserSaveData } from '../save/storage';
import { soundFX } from '../audio/soundFX';
import { getAvatarImage } from './avatarHelper';
import { AVAILABLE_AVATARS } from './ProfileModal';

interface SettingsModalProps {
  saveData: UserSaveData;
  onUpdateSaveData: (data: UserSaveData) => void;
  onClose: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  saveData,
  onUpdateSaveData,
  onClose,
  language,
  onToggleLanguage,
}) => {
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState<'profiles' | 'accessibility' | 'controls' | 'audio' | 'diagnostics'>('profiles');
  const [p1NameInput, setP1NameInput] = useState(saveData.playerName || 'Emely');
  const [p2NameInput, setP2NameInput] = useState(saveData.player2Name || (isRTL ? 'طارق المبتدئ' : 'Mike'));
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>, isPlayer2 = false) => {
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
          if (isPlayer2) {
            updateSetting('player2Avatar', compressed);
          } else {
            updateSetting('avatarIcon', compressed);
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const updateSetting = <K extends keyof UserSaveData>(key: K, value: UserSaveData[K]) => {
    soundFX.playButtonClick();
    const updated = { ...saveData, [key]: value };
    StorageManager.save(updated);
    onUpdateSaveData(updated);

    // Apply immediate audio/haptic effects
    if (key === 'soundEnabled') {
      soundFX.setMuted(!value);
    } else if (key === 'musicEnabled') {
      soundFX.setMusicEnabled(Boolean(value));
    } else if (key === 'hapticsEnabled') {
      soundFX.setHapticsEnabled(Boolean(value));
      if (value) soundFX.triggerHaptic(25);
    }
  };

  const handleEquipBallStyle = (styleId: string) => {
    soundFX.playButtonClick();
    const updated = StorageManager.selectBallStyle(styleId);
    onUpdateSaveData(updated);
  };

  const handleBuyBallStyle = (styleId: string, price: number) => {
    if (saveData.coins < price) {
      soundFX.playFoulSound();
      return;
    }
    soundFX.playVictoryChime();
    const updated = StorageManager.unlockBallStyle(styleId, price);
    onUpdateSaveData(updated);
  };

  const handleExportJSON = () => {
    const jsonStr = StorageManager.exportSaveJSON();
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2500);
    }).catch(() => {
      setImportJsonText(jsonStr);
    });
  };

  const handleImportJSON = () => {
    if (!importJsonText.trim()) return;
    const res = StorageManager.importSaveJSON(importJsonText.trim());
    if (res.success && res.data) {
      soundFX.playVictoryChime();
      onUpdateSaveData(res.data);
      setImportStatus(isRTL ? 'تم استعادة البيانات بنجاح!' : 'Save data restored successfully!');
      setImportJsonText('');
    } else {
      soundFX.playFoulSound();
      setImportStatus(isRTL ? `فشل الاستيراد: ${res.error}` : `Import failed: ${res.error}`);
    }
  };

  const handleResetProgress = () => {
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-100">
                {isRTL ? 'الإعدادات وإمكانية الوصول' : 'Settings & Accessibility'}
              </h2>
              <span className="text-[11px] text-slate-400">
                {isRTL ? 'تخصيص اللعب، التباين، الصوت، وإدارة البيانات' : 'Gameplay, Visuals, Audio & Save Data'}
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'profiles' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            👤 {isRTL ? 'اللاعبون والصور' : 'Players & Avatars'}
          </button>
          <button
            onClick={() => setActiveTab('accessibility')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'accessibility' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            👁️ {isRTL ? 'إمكانية الوصول والمظهر' : 'Accessibility & Visuals'}
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'controls' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🕹️ {isRTL ? 'التحكم والتصويب' : 'Controls & Aiming'}
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'audio' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔊 {isRTL ? 'الصوت والموسيقى والاهتزاز' : 'Audio & Haptics'}
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'diagnostics' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 {isRTL ? 'التشخيص والنسخ الاحتياطي' : 'Diagnostics & Backup'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 0: PLAYERS & AVATARS (Real Names & Custom Photo Uploads) */}
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              {/* Notice Banner */}
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-800/60 flex items-start gap-3">
                <span className="text-xl">✨</span>
                <p className="text-xs text-sky-200/90 leading-relaxed">
                  {isRTL
                    ? 'الأسماء والصور التي تختارها هنا تظهر فوراً في شريط اللعبة العلوي (HUD) وعلى الطاولة وفي جميع المباريات والبطولات.'
                    : 'The names and real photos you configure here appear live in the in-game top HUD bar, on the table, and in all match modes.'}
                </p>
              </div>

              {/* 1. Player 1 Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      {isRTL ? 'اللاعب الأول (أنت)' : 'Player 1 (You)'}
                    </h3>
                  </div>
                  <label className="cursor-pointer px-3 py-1 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-transform active:scale-95">
                    <span>📷</span>
                    <span>{isRTL ? 'رفع صورتك الحقيقية' : 'Upload Real Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadPhoto(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Name Edit Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-300 font-semibold">
                    {isRTL ? 'اسم اللاعب 1:' : 'Player 1 Name:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p1NameInput}
                      onChange={(e) => setP1NameInput(e.target.value)}
                      onBlur={() => {
                        if (p1NameInput.trim()) updateSetting('playerName', p1NameInput.trim());
                      }}
                      maxLength={18}
                      placeholder={isRTL ? 'أدخل اسمك...' : 'Enter your name...'}
                      className="bg-slate-900 border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none w-44"
                    />
                    <button
                      onClick={() => {
                        if (p1NameInput.trim()) updateSetting('playerName', p1NameInput.trim());
                      }}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors"
                      title={isRTL ? 'حفظ الاسم' : 'Save Name'}
                    >
                      ✓
                    </button>
                  </div>
                </div>

                {/* Avatar Presets for Player 1 */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-2 font-semibold">
                    {isRTL ? 'أو اختر صورة جاهزة / رمز تعبيري:' : 'Or choose preset photo / avatar:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {AVAILABLE_AVATARS.map((av) => {
                      const isSelected =
                        saveData.avatarIcon === av.id ||
                        (av.id === 'player1' && (!saveData.avatarIcon || saveData.avatarIcon === 'player1' || saveData.avatarIcon === 'emely'));
                      const photoSrc = av.type === 'photo' ? getAvatarImage(av.id) : null;

                      return (
                        <button
                          key={av.id}
                          onClick={() => updateSetting('avatarIcon', av.id)}
                          className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-sky-950/80 border-sky-400 shadow ring-2 ring-sky-500/40'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center">
                            {photoSrc ? (
                              <img src={photoSrc} alt={av.label} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">{av.id}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-200 truncate max-w-full">
                            {isRTL ? av.label : av.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Player 2 / Opponent Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h3 className="text-sm font-bold text-white">
                      {isRTL ? 'اللاعب الثاني (الخصم / المبتدئ / مايك)' : 'Player 2 (Opponent / Bot)'}
                    </h3>
                  </div>
                  <label className="cursor-pointer px-3 py-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-transform active:scale-95">
                    <span>📷</span>
                    <span>{isRTL ? 'رفع صورة اللاعب 2' : 'Upload Player 2 Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadPhoto(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Name Edit Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-300 font-semibold">
                    {isRTL ? 'اسم اللاعب 2:' : 'Player 2 Name:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p2NameInput}
                      onChange={(e) => setP2NameInput(e.target.value)}
                      onBlur={() => {
                        if (p2NameInput.trim()) updateSetting('player2Name', p2NameInput.trim());
                      }}
                      maxLength={18}
                      placeholder={isRTL ? 'مثال: طارق المبتدئ أو مايك' : 'e.g. Mike or Rookie Tarek'}
                      className="bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none w-44"
                    />
                    <button
                      onClick={() => {
                        if (p2NameInput.trim()) updateSetting('player2Name', p2NameInput.trim());
                      }}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
                      title={isRTL ? 'حفظ الاسم' : 'Save Name'}
                    >
                      ✓
                    </button>
                  </div>
                </div>

                {/* Avatar Presets for Player 2 */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-2 font-semibold">
                    {isRTL ? 'صورة اللاعب 2 الافتراضية:' : 'Player 2 preset photo / avatar:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {AVAILABLE_AVATARS.map((av) => {
                      const isSelected =
                        saveData.player2Avatar === av.id ||
                        (av.id === 'mike' && (!saveData.player2Avatar || saveData.player2Avatar === 'mike' || saveData.player2Avatar === 'ai_bot'));
                      const photoSrc = av.type === 'photo' ? getAvatarImage(av.id) : null;

                      return (
                        <button
                          key={av.id}
                          onClick={() => updateSetting('player2Avatar', av.id)}
                          className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-amber-950/80 border-amber-400 shadow ring-2 ring-amber-500/40'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center">
                            {photoSrc ? (
                              <img src={photoSrc} alt={av.label} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">{av.id}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-200 truncate max-w-full">
                            {isRTL ? av.label : av.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ACCESSIBILITY & VISUALS */}
          {activeTab === 'accessibility' && (
            <div className="space-y-5">
              {/* 2D / 3D Table View Mode Selection */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🧊</span>
                    <span>{isRTL ? 'نمط عرض الطاولة (2D / 3D View)' : 'Table View Perspective'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRTL
                      ? 'التبديل بين المنظور الكلاسيكي من الأعلى (2D) أو العرض المجسم ثلاثي الأبعاد الواقعي (3D).'
                      : 'Switch between classic top-down 2D canvas and realistic 3D perspective with lighting.'}
                  </p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
                  <button
                    onClick={() => updateSetting('viewMode', '2d')}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                      saveData.viewMode === '2d' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📐</span>
                    <span>2D</span>
                  </button>
                  <button
                    onClick={() => updateSetting('viewMode', '3d')}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                      saveData.viewMode === '3d' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🧊</span>
                    <span>3D</span>
                  </button>
                </div>
              </div>

              {/* 3D Camera Preset Selection */}
              {saveData.viewMode === '3d' && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <span>🎥</span>
                      <span>{isRTL ? 'زاوية كاميرا 3D الافتراضية' : 'Default 3D Camera Angle'}</span>
                    </div>
                    <p className="text-xs text-amber-200/70 mt-1">
                      {isRTL
                        ? 'اختر الزاوية المفضلة عند بدء اللعب ثلاثي الأبعاد.'
                        : 'Preferred viewing angle when starting a match in 3D mode.'}
                    </p>
                  </div>
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
                    <button
                      onClick={() => updateSetting('cameraPreset3D', 'angled')}
                      className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                        saveData.cameraPreset3D === 'angled' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isRTL ? 'مائل' : 'Angled'}
                    </button>
                    <button
                      onClick={() => updateSetting('cameraPreset3D', 'top_perspective')}
                      className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                        saveData.cameraPreset3D === 'top_perspective' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isRTL ? 'علوي' : 'Top'}
                    </button>
                    <button
                      onClick={() => updateSetting('cameraPreset3D', 'cue_behind')}
                      className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                        saveData.cameraPreset3D === 'cue_behind' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isRTL ? 'خلف العصا' : 'Behind Cue'}
                    </button>
                  </div>
                </div>
              )}

              {/* High Contrast Mode */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🌓</span>
                    <span>{isRTL ? 'وضع التباين العالي (High Contrast)' : 'High Contrast Mode'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRTL
                      ? 'إطارات داكنة سميكة للكرات وشارات واضحة لتمييز السادة والمخطط دون الاعتماد على اللون وحده.'
                      : 'Thick high-contrast borders and geometric badges for solids vs stripes, non-color reliant.'}
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('highContrastMode', !saveData.highContrastMode)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors relative flex items-center ${
                    saveData.highContrastMode ? 'bg-sky-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Reduced Motion */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🧘</span>
                    <span>{isRTL ? 'تقليل الحركة (Reduced Motion)' : 'Reduced Motion'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRTL
                      ? 'إيقاف النبضات السريعة وتقليل تناثر المؤثرات والجزيئات لراحة العين.'
                      : 'Disables animated pulsing and limits particle bursts for motion sensitivity.'}
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('reducedMotion', !saveData.reducedMotion)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors relative flex items-center ${
                    saveData.reducedMotion ? 'bg-sky-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* UI Scale */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔍</span>
                    <span>{isRTL ? 'حجم واجهة المستخدم (UI Scale)' : 'Interface Scaling'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRTL ? 'تكبير عناصر الواجهة والشريط الجانبي لسهولة القراءة واللمس.' : 'Scale up HUD, buttons, and gauges for larger screens or touch clarity.'}
                  </p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => updateSetting('uiScale', 'normal')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      saveData.uiScale === 'normal' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRTL ? 'عادي' : 'Normal'}
                  </button>
                  <button
                    onClick={() => updateSetting('uiScale', 'large')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      saveData.uiScale === 'large' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRTL ? 'كبير (+20%)' : 'Large (+20%)'}
                  </button>
                </div>
              </div>

              {/* Ball Styles Selector */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  {isRTL ? 'أنماط وتصاميم الكرات القابلة للفتح' : 'Unlockable Ball Styles & Themes'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BALL_STYLES.map((style) => {
                    const isUnlocked = saveData.unlockedBallStyles.includes(style.id);
                    const isEquipped = saveData.selectedBallStyleId === style.id;

                    return (
                      <div
                        key={style.id}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
                          isEquipped
                            ? 'bg-slate-800/90 border-sky-400 shadow-lg ring-1 ring-sky-400/40'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {isRTL ? style.nameAr : style.name}
                            </span>
                            <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                              {isRTL ? style.descriptionAr : style.description}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-[11px] font-mono text-amber-400 font-semibold">
                            {style.price === 0 ? (isRTL ? 'مجاني' : 'Included') : `🪙 ${style.price}`}
                          </span>

                          {isUnlocked ? (
                            <button
                              onClick={() => handleEquipBallStyle(style.id)}
                              disabled={isEquipped}
                              className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                                isEquipped
                                  ? 'bg-slate-800 text-slate-500 cursor-default'
                                  : 'bg-sky-600 hover:bg-sky-500 text-white'
                              }`}
                            >
                              {isEquipped ? (isRTL ? 'مفعل' : 'Equipped') : (isRTL ? 'تفعيل' : 'Equip')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuyBallStyle(style.id, style.price)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1"
                            >
                              <span>🪙</span>
                              <span>{isRTL ? 'شراء' : 'Unlock'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTROLS & AIMING */}
          {activeTab === 'controls' && (
            <div className="space-y-5">
              {/* Drag Sensitivity */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {isRTL ? 'حساسية سحب التصويب (Aim Drag Sensitivity)' : 'Aim Drag Sensitivity'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {isRTL ? 'ضبط سرعة واستجابة دوران العصا عند السحب باللمس أو الماوس.' : 'Fine-tune cue stick rotation response for high precision or quick turns.'}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800">
                    {saveData.dragSensitivity.toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">0.5x</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={saveData.dragSensitivity}
                    onChange={(e) => updateSetting('dragSensitivity', parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-slate-500">1.5x</span>
                </div>
              </div>

              {/* Power Gauge Position */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-white block">
                    {isRTL ? 'موضع مقياس القوة الجانبي (Cue Pull)' : 'Power Gauge Position'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isRTL ? 'اختر الجانب الأنسب ليدك أثناء اللعب على الهواتف والأجهزة اللوحية.' : 'Left or right side of screen for comfortable one-handed pulling.'}
                  </span>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => updateSetting('powerGaugePosition', 'left')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      saveData.powerGaugePosition === 'left' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRTL ? 'يسار' : 'Left'}
                  </button>
                  <button
                    onClick={() => updateSetting('powerGaugePosition', 'right')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      saveData.powerGaugePosition === 'right' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRTL ? 'يمين' : 'Right'}
                  </button>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-white block">
                    {isRTL ? 'لغة الواجهة (Interface Language)' : 'Language & Direction'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isRTL ? 'تبديل فوري بين العربية (RTL) والإنجليزية (LTR).' : 'Switch seamlessly between English and full RTL Arabic.'}
                  </span>
                </div>
                <button
                  onClick={onToggleLanguage}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  {language === 'ar' ? 'English 🌐' : 'العربية 🌐'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO & HAPTICS */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {/* Sound Effects Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-white block">
                    🔊 {isRTL ? 'المؤثرات الصوتية (Sound Effects)' : 'Sound Effects (SFX)'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isRTL ? 'أصوات واقعية لتصادم الكرات، ضربة العصا، الوسائد، والسقوط في الجيب.' : 'Procedural audio for cue strikes, ceramic ball clacks, and pocket drops.'}
                  </span>
                </div>
                <button
                  onClick={() => updateSetting('soundEnabled', !saveData.soundEnabled)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors relative flex items-center ${
                    saveData.soundEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Procedural Ambient Lounge Music Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-white block">
                    🎵 {isRTL ? 'موسيقى الصالة الهادئة (Lounge Ambient)' : 'Lounge Ambient Music'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isRTL ? 'مقطوعات جاز خفيفة إجرائية عبر الويب أوديو بدون تحميل ملفات خارجية.' : 'Soft procedural electric piano chords generated in real-time, 100% offline.'}
                  </span>
                </div>
                <button
                  onClick={() => updateSetting('musicEnabled', !saveData.musicEnabled)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors relative flex items-center ${
                    saveData.musicEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Haptic Vibration Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-white block">
                    📳 {isRTL ? 'الاهتزاز اللمسي (Haptic Feedback)' : 'Device Haptics & Vibration'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isRTL ? 'نبضات اهتزاز خفيفة عند الاصطدام القوي أو إسقاط الكرة (على الأجهزة المتوافقة).' : 'Tactile vibration pulse on hard impacts and successful pots (supported devices).'}
                  </span>
                </div>
                <button
                  onClick={() => updateSetting('hapticsEnabled', !saveData.hapticsEnabled)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors relative flex items-center ${
                    saveData.hapticsEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNOSTICS & BACKUP */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-5">
              {/* Export / Import Save Data */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="text-sm font-bold text-white block">
                  💾 {isRTL ? 'النسخ الاحتياطي واستعادة البيانات (JSON)' : 'Save Data Backup & Restore'}
                </span>
                <p className="text-xs text-slate-400">
                  {isRTL
                    ? 'يمكنك نسخ بياناتك محلياً كملف JSON واستعادتها في أي وقت بأمان دون أي حاجة لسحابة.'
                    : 'Export your career data, unlocked cues, and statistics to JSON, or restore a backup.'}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>📋</span>
                    <span>{copiedExport ? (isRTL ? 'تم النسخ للحافظة!' : 'Copied to Clipboard!') : (isRTL ? 'نسخ بيانات الحفظ' : 'Export to Clipboard')}</span>
                  </button>
                </div>

                <div className="pt-2">
                  <textarea
                    rows={2}
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder={isRTL ? 'الصق نص JSON هنا للاستعادة...' : 'Paste JSON backup string here to restore...'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={handleImportJSON}
                      disabled={!importJsonText.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      {isRTL ? 'استعادة البيانات' : 'Restore Backup'}
                    </button>
                    {importStatus && (
                      <span className="text-xs font-medium text-amber-300">{importStatus}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Local Diagnostic Logs */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    📋 {isRTL ? 'سجل التشخيص التقني المحلي (خالٍ من أي بيانات شخصية)' : 'Local Diagnostic Logs (No PII)'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">v2.0 (Stage 5)</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 max-h-40 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-400">
                  {saveData.diagnosticLogs && saveData.diagnosticLogs.length > 0 ? (
                    saveData.diagnosticLogs.map((log, idx) => (
                      <div key={idx} className="leading-tight text-slate-300">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 italic">No diagnostic events recorded.</div>
                  )}
                </div>
              </div>

              {/* Reset Career */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  {isRTL ? 'الحفظ التلقائي يعمل بعد كل ضربة ومباراة' : 'Auto-save active on every frame'}
                </span>
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="text-rose-400 hover:text-rose-300 underline"
                  >
                    {isRTL ? 'إعادة ضبط المسيرة والبيانات' : 'Reset Career Data'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-950/80 p-2 rounded-xl border border-rose-800">
                    <span className="text-[11px] text-rose-200">
                      {isRTL ? 'هل أنت متأكد؟' : 'Confirm reset?'}
                    </span>
                    <button
                      onClick={handleResetProgress}
                      className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold text-[11px]"
                    >
                      {isRTL ? 'نعم، إعادة الضبط' : 'Yes, Reset'}
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
