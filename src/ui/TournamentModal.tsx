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
  onClose: () => void;
  language: Language;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  matches,
  player1,
  onUpdateMatches,
  onStartMatch,
  onClose,
  language,
}) => {
  const isRTL = language === 'ar';
  const [selectedCup, setSelectedCup] = useState<'city' | 'national' | 'masters'>('national');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const qf = matches.filter(m => m.round === 1);
  const sf = matches.filter(m => m.round === 2);
  const final = matches.find(m => m.round === 3);

  // Find user's next playable match
  const userNextMatch = matches.find(
    m => !m.isCompleted && (!m.player1.isAI || !m.player2.isAI) && m.player1.name !== 'TBD' && m.player2.name !== 'TBD'
  );

  const handleStartFreshTournament = () => {
    soundFX.playButtonClick();
    const newMatches = TournamentEngine.createTournament(player1);
    onUpdateMatches(newMatches);
    setShowResetConfirm(false);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>🏆</span>
              <span>{isRTL ? 'مسيرة البطولات المحلية (Offline Tournaments)' : 'Local Pool Championships'}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cup Tier Selector */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => {
                setSelectedCup('city');
                soundFX.playButtonClick();
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                selectedCup === 'city'
                  ? 'bg-amber-600/30 border border-amber-500/60 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🥉 {isRTL ? 'كأس المدينة (4 لاعبين)' : 'City Amateur Cup'}
            </button>
            <button
              onClick={() => {
                setSelectedCup('national');
                soundFX.playButtonClick();
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                selectedCup === 'national'
                  ? 'bg-sky-600/30 border border-sky-500/60 text-sky-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🥈 {isRTL ? 'البطولة الوطنية (8 لاعبين)' : 'National Open (8P)'}
            </button>
            <button
              onClick={() => {
                setSelectedCup('masters');
                soundFX.playButtonClick();
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                selectedCup === 'masters'
                  ? 'bg-purple-600/30 border border-purple-500/60 text-purple-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👑 {isRTL ? 'كأس الأساتذة الكبرى' : 'Grand Masters Cup'}
            </button>
          </div>

          <div>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                {isRTL ? 'بدء بطولة جديدة' : 'Reset Bracket'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-950/80 px-2 py-1 rounded-xl border border-rose-800 text-xs">
                <span className="text-[11px] text-rose-200">{isRTL ? 'تأكيد البدء من جديد؟' : 'Reset tourney?'}</span>
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

        {/* Bracket Tree View */}
        <div className="flex-1 overflow-x-auto p-6 flex flex-col justify-between">
          <div className="min-w-[650px] grid grid-cols-3 gap-6 items-center">
            {/* Column 1: Quarterfinals */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1 text-center">
                {isRTL ? 'ربع النهائي (QF)' : 'Quarterfinals'}
              </h3>
              {qf.map((m, idx) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-2xl border text-xs ${
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
                  <div
                    className={`font-semibold py-1 truncate ${
                      m.winner?.id === m.player1.id ? 'text-emerald-400 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {(isRTL && m.player1.nameAr) ? m.player1.nameAr : m.player1.name}
                  </div>
                  <div className="h-[1px] bg-slate-800 my-0.5" />
                  <div
                    className={`font-semibold py-1 truncate ${
                      m.winner?.id === m.player2.id ? 'text-emerald-400 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {(isRTL && m.player2.nameAr) ? m.player2.nameAr : m.player2.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Column 2: Semifinals */}
            <div className="flex flex-col gap-12">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1 text-center">
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
                  <div
                    className={`font-semibold py-1 truncate ${
                      m.winner?.id === m.player1.id ? 'text-emerald-400 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {(isRTL && m.player1.nameAr) ? m.player1.nameAr : m.player1.name}
                  </div>
                  <div className="h-[1px] bg-slate-800 my-0.5" />
                  <div
                    className={`font-semibold py-1 truncate ${
                      m.winner?.id === m.player2.id ? 'text-emerald-400 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {(isRTL && m.player2.nameAr) ? m.player2.nameAr : m.player2.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Column 3: Finals */}
            <div className="flex flex-col justify-center">
              <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider mb-2 text-center">
                👑 {isRTL ? 'المباراة النهائية (Grand Finals)' : 'Grand Championship'}
              </h3>
              {final && (
                <div
                  className={`p-4 rounded-3xl border text-xs shadow-xl ${
                    final.isCompleted
                      ? 'bg-slate-950/80 border-amber-500/80 shadow-amber-500/20'
                      : 'bg-slate-900 border-amber-500/50'
                  }`}
                >
                  <div className="text-center font-bold text-amber-300 mb-2">
                    {final.winner ? (
                      <span className="text-sm">🎉 {(isRTL && final.winner.nameAr) ? final.winner.nameAr : final.winner.name} {isRTL ? 'البطل!' : 'CHAMPION!'}</span>
                    ) : (
                      <span>{isRTL ? 'مباراة اللقب والكأس' : 'Trophy Match'}</span>
                    )}
                  </div>
                  <div
                    className={`font-semibold py-1 text-center truncate ${
                      final.winner?.id === final.player1.id ? 'text-emerald-400 font-bold text-sm' : 'text-slate-200'
                    }`}
                  >
                    {(isRTL && final.player1.nameAr) ? final.player1.nameAr : final.player1.name}
                  </div>
                  <div className="text-center text-slate-500 my-1 font-mono text-[10px]">VS</div>
                  <div
                    className={`font-semibold py-1 text-center truncate ${
                      final.winner?.id === final.player2.id ? 'text-emerald-400 font-bold text-sm' : 'text-slate-200'
                    }`}
                  >
                    {(isRTL && final.player2.nameAr) ? final.player2.nameAr : final.player2.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {userNextMatch
                ? isRTL ? `مباراتك التالية: ${userNextMatch.player1.name} ضد ${userNextMatch.player2.name}` : `Your next match: ${userNextMatch.player1.name} vs ${userNextMatch.player2.name}`
                : isRTL ? 'اكتملت مسيرة هذه البطولة بنجاح!' : 'Tournament completed!'}
            </span>

            {userNextMatch && (
              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  onStartMatch(userNextMatch);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-950/50 active:scale-95 transition-all"
              >
                🎱 {isRTL ? 'بدء المباراة التالية' : 'Play Next Match'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
