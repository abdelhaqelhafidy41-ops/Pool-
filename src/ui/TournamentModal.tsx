/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language, Player, TournamentMatch } from '../types/game';
import { soundFX } from '../audio/soundFX';
import { TournamentEngine } from '../tournaments/tournamentEngine';

interface TournamentModalProps {
  matches: TournamentMatch[];
  player1: Player;
  onUpdateMatches: (matches: TournamentMatch[]) => void;
  onStartMatch: (match: TournamentMatch) => void;
  onOpenWifiTournament?: () => void;
  onClose: () => void;
  language: Language;
  wifiRoomCode?: string;
  isWifiHost?: boolean;
  onFillWifiSlotsWithAI?: () => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  matches,
  player1,
  onUpdateMatches,
  onStartMatch,
  onOpenWifiTournament,
  onClose,
  language,
  wifiRoomCode,
  isWifiHost,
  onFillWifiSlotsWithAI,
}) => {
  const isRTL = language === 'ar';
  const is4Player = matches.length === 3;
  const [selectedCup, setSelectedCup] = useState<'city' | 'national' | 'masters' | 'wifi'>(() => {
    if (wifiRoomCode) return 'wifi';
    return is4Player ? 'city' : 'national';
  });
  const [activeRoundTab, setActiveRoundTab] = useState<'all' | 'qf' | 'sf' | 'final'>('all');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Group matches
  const qf = matches.filter(m => m.round === 1 && !is4Player);
  const sf = matches.filter(m => is4Player ? m.round === 1 : m.round === 2);
  const final = matches.find(m => is4Player ? m.round === 2 : m.round === 3);

  // Check tournament outcomes
  const isHumanWinner = final?.winner && !final.winner.isAI && (final.winner.id === player1.id || final.winner.name === player1.name);
  const isHumanRunnerUp = final?.isCompleted && !isHumanWinner && (
    final.player1.id === player1.id || final.player1.name === player1.name ||
    final.player2.id === player1.id || final.player2.name === player1.name
  );

  // Find user's next playable match
  const userNextMatch = matches.find(
    m => !m.isCompleted &&
         (!m.player1.isAI || !m.player2.isAI || m.player1.id === player1.id || m.player2.id === player1.id || m.player1.name === player1.name || m.player2.name === player1.name) &&
         m.player1.name !== 'TBD' && m.player2.name !== 'TBD' &&
         m.player1.nameAr !== 'في انتظار الفائز' && m.player2.nameAr !== 'في انتظار الفائز'
  );

  const isNextMatchFinal = userNextMatch && (is4Player ? userNextMatch.round === 2 : userNextMatch.round === 3);

  const handleSelectCup = (cup: 'city' | 'national' | 'masters') => {
    soundFX.playButtonClick();
    setSelectedCup(cup);
    if (cup === 'city') {
      const newMatches = TournamentEngine.createCityCup4P(player1);
      onUpdateMatches(newMatches);
    } else {
      const newMatches = TournamentEngine.createTournament(player1);
      onUpdateMatches(newMatches);
    }
  };

  const handleStartFreshTournament = () => {
    soundFX.playButtonClick();
    if (selectedCup === 'city' || is4Player) {
      const newMatches = TournamentEngine.createCityCup4P(player1);
      onUpdateMatches(newMatches);
    } else {
      const newMatches = TournamentEngine.createTournament(player1);
      onUpdateMatches(newMatches);
    }
    setShowResetConfirm(false);
  };

  const handleCopyRoomCode = () => {
    if (wifiRoomCode && navigator.clipboard) {
      navigator.clipboard.writeText(wifiRoomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
      soundFX.playButtonClick();
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏆</span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{isRTL ? 'مسيرة البطولات (Tournaments Career)' : 'Championship Tournaments'}</span>
                {is4Player ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                    {isRTL ? 'نظام 4 لاعبين (SF ➔ النهائي)' : '4-Player System (SF ➔ Final)'}
                  </span>
                ) : (
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/40">
                    {isRTL ? 'نظام 8 لاعبين (QF ➔ SF ➔ النهائي)' : '8-Player System'}
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cup Tier Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleSelectCup('city')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedCup === 'city'
                  ? 'bg-amber-600/30 border border-amber-500/80 text-amber-300 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-800/50'
              }`}
            >
              🥉 {isRTL ? 'كأس المدينة (4 لاعبين)' : 'City Cup (4P)'}
            </button>
            <button
              onClick={() => handleSelectCup('national')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedCup === 'national'
                  ? 'bg-sky-600/30 border border-sky-500/80 text-sky-300 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-800/50'
              }`}
            >
              🥈 {isRTL ? 'البطولة الوطنية (8 لاعبين)' : 'National Open (8P)'}
            </button>
            <button
              onClick={() => handleSelectCup('masters')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedCup === 'masters'
                  ? 'bg-purple-600/30 border border-purple-500/80 text-purple-300 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-800/50'
              }`}
            >
              👑 {isRTL ? 'كأس الأساتذة الكبرى' : 'Grand Masters Cup'}
            </button>

            {onOpenWifiTournament && (
              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  onOpenWifiTournament();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow ${
                  selectedCup === 'wifi'
                    ? 'bg-emerald-600/40 border border-emerald-400 text-emerald-200'
                    : 'bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border border-emerald-500/60 text-emerald-300 hover:text-emerald-100'
                }`}
              >
                <span>📡</span>
                <span>{isRTL ? 'بطولة Wi-Fi أوفلاين (2 أو 4 لاعبين)' : 'Wi-Fi Tournament (2P/4P)'}</span>
              </button>
            )}
          </div>

          <div>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline"
              >
                {isRTL ? 'بدء بطولة جديدة' : 'Reset Bracket'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-950/80 px-2 py-1 rounded-xl border border-rose-800 text-xs">
                <span className="text-[10px] text-rose-200">{isRTL ? 'تأكيد البدء؟' : 'Reset?'}</span>
                <button
                  onClick={handleStartFreshTournament}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px]"
                >
                  {isRTL ? 'نعم' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Wi-Fi Room Waiting Banner (If active) */}
        {wifiRoomCode && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-300">
                {isWifiHost
                  ? (isRTL ? 'غرفة بطولة Wi-Fi المحلية نشطة:' : 'Local Wi-Fi Room Active:')
                  : (isRTL ? 'أنت في غرفة البطولة كضيف:' : 'Joined Tournament Room as Guest:')}
              </span>
              <span className="font-mono font-black text-white bg-slate-900 px-2.5 py-0.5 rounded-lg border border-emerald-500/50 text-sm">
                {wifiRoomCode}
              </span>
              <button
                onClick={handleCopyRoomCode}
                className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
              >
                {codeCopied ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ' : 'Copy')}
              </button>
            </div>

            {isWifiHost ? (
              onFillWifiSlotsWithAI && (
                <button
                  onClick={() => {
                    soundFX.playButtonClick();
                    onFillWifiSlotsWithAI();
                  }}
                  className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition-all"
                >
                  ⚡ {isRTL ? 'ملء المقاعد بالذكاء الاصطناعي وبدء البطولة' : 'Auto-Fill with AI & Start'}
                </button>
              )
            ) : (
              <span className="text-amber-300 font-semibold text-xs flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">
                <span className="animate-spin text-sm">⏳</span>
                <span>{isRTL ? 'بانتظار أن يبدأ صاحب الغرفة المباراة...' : 'Waiting for host to start...'}</span>
              </span>
            )}
          </div>
        )}

        {/* Grand Prize Showcase Banner */}
        <div className="px-5 py-2 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-amber-950/40 border-b border-amber-800/40 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <span className="font-bold">
              {isRTL ? 'جوائز البطولة:' : 'Tournament Prizes:'}
            </span>
            <span className="bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/40 text-amber-300 font-bold">
              🥇 {isRTL ? 'البطل: 1,500 عملة + الكأس' : 'Champion: 1,500 Coins + Trophy'}
            </span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 text-slate-300 font-semibold">
              🥈 {isRTL ? 'الوصيف (المركز الثاني): 500 عملة' : 'Runner-Up: 500 Coins'}
            </span>
          </div>
        </div>

        {/* Bracket Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-between">
          {is4Player ? (
            /* 4-Player Clean Layout (SF -> Final) - Fits on any screen without horizontal cutoff! */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch my-auto">
              {/* Column 1: Semifinals (SF1 & SF2) */}
              <div className="flex flex-col gap-3.5 bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                    <span>🎱</span>
                    <span>{isRTL ? 'نصف النهائي (Semifinals)' : 'Semifinals (SF)'}</span>
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {isRTL ? 'مباراتان للتأهل' : '2 Qualifying Matches'}
                  </span>
                </div>

                {sf.map((m, idx) => {
                  const isUserInMatch = m.player1.id === player1.id || m.player2.id === player1.id || m.player1.name === player1.name || m.player2.name === player1.name;
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-2xl border transition-all text-xs ${
                        m.isCompleted
                          ? 'bg-slate-900/90 border-slate-800 opacity-90'
                          : isUserInMatch
                          ? 'bg-gradient-to-r from-sky-950/70 to-slate-900 border-sky-500 ring-2 ring-sky-500/30 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1.5">
                        <span className="font-bold text-sky-300">
                          {isRTL ? `نصف النهائي #${idx + 1}` : `Semifinal #${idx + 1}`}
                        </span>
                        <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-amber-300 font-bold">
                          {m.score}
                        </span>
                      </div>

                      {/* Player 1 */}
                      <div className="flex items-center justify-between py-1">
                        <span
                          className={`font-bold truncate ${
                            m.winner?.id === m.player1.id ? 'text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          {(isRTL && m.player1.nameAr) ? m.player1.nameAr : m.player1.name}
                        </span>
                        {m.winner?.id === m.player1.id && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {isRTL ? 'فائز ✓' : 'WON ✓'}
                          </span>
                        )}
                      </div>

                      <div className="h-[1px] bg-slate-800 my-1" />

                      {/* Player 2 */}
                      <div className="flex items-center justify-between py-1">
                        <span
                          className={`font-bold truncate ${
                            m.winner?.id === m.player2.id ? 'text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          {(isRTL && m.player2.nameAr) ? m.player2.nameAr : m.player2.name}
                        </span>
                        {m.winner?.id === m.player2.id && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {isRTL ? 'فائز ✓' : 'WON ✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Column 2: Grand Finals (Final Match) */}
              <div className="flex flex-col justify-center bg-slate-950/70 p-4 rounded-3xl border border-amber-500/40 shadow-xl shadow-amber-950/20">
                <div className="text-center mb-3">
                  <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center justify-center gap-1.5">
                    <span>👑</span>
                    <span>{isRTL ? 'المباراة النهائية (Grand Final)' : 'Grand Championship'}</span>
                  </span>
                  <span className="text-[10px] text-amber-300/80 font-medium">
                    {isRTL ? 'مباراة التتويج وحسم الكأس و1500 عملة' : 'Title & Trophy Match (1,500 Coins)'}
                  </span>
                </div>

                {final && (
                  <div
                    className={`p-4 rounded-2xl border text-xs shadow-xl transition-all ${
                      final.isCompleted
                        ? 'bg-slate-900 border-amber-400/90 ring-2 ring-amber-400/30'
                        : final.player1.name !== 'TBD' && final.player2.name !== 'TBD'
                        ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-500 ring-2 ring-amber-500/40 shadow-amber-500/20'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="text-center font-bold text-amber-300 mb-2">
                      {final.winner ? (
                        <div className="py-1 px-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-sm font-black flex items-center justify-center gap-2">
                          <span>🏆</span>
                          <span>
                            {(isRTL && final.winner.nameAr) ? final.winner.nameAr : final.winner.name} {isRTL ? 'بطل البطولة!' : 'CHAMPION!'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">
                          {final.player1.name !== 'TBD' && final.player2.name !== 'TBD'
                            ? (isRTL ? 'جاهز للنهائي الكبير 🏆' : 'Ready for Grand Final 🏆')
                            : (isRTL ? 'بانتظار اكتمال المتأهلين...' : 'Waiting for Finalists...')}
                        </span>
                      )}
                    </div>

                    {/* Finalist 1 */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-[10px]">
                          1
                        </span>
                        <span
                          className={`font-black truncate ${
                            final.winner?.id === final.player1.id ? 'text-emerald-400 text-sm' : 'text-slate-100'
                          }`}
                        >
                          {(isRTL && final.player1.nameAr) ? final.player1.nameAr : final.player1.name}
                        </span>
                      </div>
                      {final.winner?.id === final.player1.id && (
                        <span className="text-xs text-amber-400 font-black">🏆 {isRTL ? 'البطل' : 'Winner'}</span>
                      )}
                    </div>

                    <div className="text-center text-amber-400 font-black text-xs my-2 tracking-widest font-mono">
                      ⚔️ VS ⚔️
                    </div>

                    {/* Finalist 2 */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                          2
                        </span>
                        <span
                          className={`font-black truncate ${
                            final.winner?.id === final.player2.id ? 'text-emerald-400 text-sm' : 'text-slate-100'
                          }`}
                        >
                          {(isRTL && final.player2.nameAr) ? final.player2.nameAr : final.player2.name}
                        </span>
                      </div>
                      {final.winner?.id === final.player2.id && (
                        <span className="text-xs text-amber-400 font-black">🏆 {isRTL ? 'البطل' : 'Winner'}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 8-Player Layout (QF -> SF -> Final) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* QF */}
              <div className="flex flex-col gap-2.5">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-0.5 text-center">
                  {isRTL ? 'ربع النهائي (QF)' : 'Quarterfinals'}
                </h3>
                {qf.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border text-xs ${
                      m.isCompleted
                        ? 'bg-slate-950/60 border-slate-800 opacity-80'
                        : !m.player1.isAI || !m.player2.isAI
                        ? 'bg-slate-800 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1">
                      <span>Match #{idx + 1}</span>
                      <span className="font-mono">{m.score}</span>
                    </div>
                    <div className={`font-semibold truncate ${m.winner?.id === m.player1.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                      {(isRTL && m.player1.nameAr) ? m.player1.nameAr : m.player1.name}
                    </div>
                    <div className="h-[1px] bg-slate-800 my-0.5" />
                    <div className={`font-semibold truncate ${m.winner?.id === m.player2.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                      {(isRTL && m.player2.nameAr) ? m.player2.nameAr : m.player2.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* SF */}
              <div className="flex flex-col gap-6">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-0.5 text-center">
                  {isRTL ? 'نصف النهائي (SF)' : 'Semifinals'}
                </h3>
                {sf.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl border text-xs ${
                      m.isCompleted
                        ? 'bg-slate-950/60 border-slate-800 opacity-80'
                        : (!m.player1.isAI || !m.player2.isAI) && m.player1.name !== 'TBD'
                        ? 'bg-slate-800 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1">
                      <span>SF #{idx + 1}</span>
                      <span className="font-mono">{m.score}</span>
                    </div>
                    <div className={`font-semibold truncate ${m.winner?.id === m.player1.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                      {(isRTL && m.player1.nameAr) ? m.player1.nameAr : m.player1.name}
                    </div>
                    <div className="h-[1px] bg-slate-800 my-0.5" />
                    <div className={`font-semibold truncate ${m.winner?.id === m.player2.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                      {(isRTL && m.player2.nameAr) ? m.player2.nameAr : m.player2.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Final */}
              <div className="flex flex-col justify-center">
                <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider mb-2 text-center">
                  👑 {isRTL ? 'المباراة النهائية (Grand Finals)' : 'Grand Championship'}
                </h3>
                {final && (
                  <div className={`p-4 rounded-3xl border text-xs shadow-xl ${
                    final.isCompleted ? 'bg-slate-950/80 border-amber-500/80 shadow-amber-500/20' : 'bg-slate-900 border-amber-500/50'
                  }`}>
                    <div className="text-center font-bold text-amber-300 mb-2">
                      {final.winner ? (
                        <span className="text-sm">🎉 {(isRTL && final.winner.nameAr) ? final.winner.nameAr : final.winner.name} {isRTL ? 'البطل!' : 'CHAMPION!'}</span>
                      ) : (
                        <span>{isRTL ? 'مباراة اللقب والكأس' : 'Trophy Match'}</span>
                      )}
                    </div>
                    <div className={`font-semibold py-1 text-center truncate ${final.winner?.id === final.player1.id ? 'text-emerald-400 font-bold text-sm' : 'text-slate-200'}`}>
                      {(isRTL && final.player1.nameAr) ? final.player1.nameAr : final.player1.name}
                    </div>
                    <div className="text-center text-slate-500 my-1 font-mono text-[10px]">VS</div>
                    <div className={`font-semibold py-1 text-center truncate ${final.winner?.id === final.player2.id ? 'text-emerald-400 font-bold text-sm' : 'text-slate-200'}`}>
                      {(isRTL && final.player2.nameAr) ? final.player2.nameAr : final.player2.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Footer Bar */}
          <div className="mt-5 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              {userNextMatch ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                  <span className="font-semibold">
                    {isNextMatchFinal
                      ? (isRTL ? `المباراة النهائية جاهزة: ${userNextMatch.player1.name} ضد ${userNextMatch.player2.name}` : `Grand Final ready: ${userNextMatch.player1.name} vs ${userNextMatch.player2.name}`)
                      : (isRTL ? `مباراتك التالية: ${userNextMatch.player1.name} ضد ${userNextMatch.player2.name}` : `Next Match: ${userNextMatch.player1.name} vs ${userNextMatch.player2.name}`)}
                  </span>
                </>
              ) : isHumanWinner ? (
                <span className="font-black text-amber-300 flex items-center gap-1.5">
                  <span>🏆</span>
                  <span>{isRTL ? 'أنت بطل مسيرة البطولات! فزت بالكأس و1,500 عملة!' : 'Tournament Champion! 1,500 Coins + Trophy!'}</span>
                </span>
              ) : isHumanRunnerUp ? (
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span>🥈</span>
                  <span>{isRTL ? 'المركز الثاني (الوصيف)! حصلت على 500 عملة ذهبية!' : 'Runner-Up! 500 Coins awarded!'}</span>
                </span>
              ) : (
                <span className="text-slate-400">
                  {isRTL ? 'اكتملت هذه البطولة بنجاح!' : 'Tournament completed!'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {wifiRoomCode && !isWifiHost ? (
                <div className="px-5 py-2.5 rounded-xl bg-slate-800/90 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 shadow">
                  <span className="animate-spin text-sm">⏳</span>
                  <span>
                    {isRTL
                      ? 'بانتظار صاحب الغرفة لبدء المباراة... (ستدخل تلقائياً)'
                      : 'Waiting for host to start match (auto-entering)...'}
                  </span>
                </div>
              ) : userNextMatch ? (
                <button
                  onClick={() => {
                    soundFX.playButtonClick();
                    onStartMatch(userNextMatch);
                  }}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2 ${
                    isNextMatchFinal
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-amber-500/40 hover:brightness-110'
                      : 'bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white shadow-sky-950/50'
                  }`}
                >
                  <span>{isNextMatchFinal ? '👑' : '🎱'}</span>
                  <span>
                    {isNextMatchFinal
                      ? (isRTL ? 'بدء النهائي (Grand Final)' : 'Start Grand Final')
                      : (isRTL ? 'بدء مباراة نصف النهائي' : 'Start Semifinal')}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleStartFreshTournament}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shadow active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>🔄</span>
                  <span>{isRTL ? 'بدء بطولة جديدة' : 'Start New Tournament'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
