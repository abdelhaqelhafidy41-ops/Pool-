/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, Player } from '../types/game';
import { soundFX } from '../audio/soundFX';

interface GameOverModalProps {
  winner: Player | null;
  winReason?: string;
  winReasonAr?: string;
  coinsEarned: number;
  matchStake?: number;
  currentBalance?: number;
  isTournament?: boolean;
  tournamentStage?: 'semifinal_won' | 'semifinal_lost' | 'final_won' | 'final_lost';
  onContinueTournament?: () => void;
  onPlayAgain: () => void;
  onQuitToTitle: () => void;
  language: Language;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  winReason,
  winReasonAr,
  coinsEarned,
  matchStake = 0,
  currentBalance,
  isTournament = false,
  tournamentStage,
  onContinueTournament,
  onPlayAgain,
  onQuitToTitle,
  language,
}) => {
  const isRTL = language === 'ar';
  const isHumanWinner = winner && !winner.isAI;

  // Tournament customized icon and title
  let bannerIcon = isHumanWinner ? '🏆' : '🎱';
  let titleText = isHumanWinner
    ? isRTL ? 'مبروك الفوز!' : 'Victory!'
    : isRTL ? 'انتهت المباراة' : 'Match Over';

  if (isTournament) {
    if (tournamentStage === 'final_won') {
      bannerIcon = '👑';
      titleText = isRTL ? 'بطل مسيرة البطولة! 🏆' : 'Grand Champion! 🏆';
    } else if (tournamentStage === 'final_lost') {
      bannerIcon = '🥈';
      titleText = isRTL ? 'وصيف البطولة (المركز الثاني) 🥈' : 'Tournament Runner-Up 🥈';
    } else if (tournamentStage === 'semifinal_won') {
      bannerIcon = '🌟';
      titleText = isRTL ? 'تأهلت إلى النهائي الكبير! 🏆' : 'Qualified for Grand Final! 🏆';
    } else if (tournamentStage === 'semifinal_lost') {
      bannerIcon = '🎱';
      titleText = isRTL ? 'انتهت مسيرة البطولة في نصف النهائي' : 'Eliminated in Semifinals';
    }
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 select-none animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 md:p-8 flex flex-col items-center gap-3.5 shadow-2xl text-center">
        {/* Victory Icon / Banner */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 animate-bounce">
          {bannerIcon}
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-100">
          {titleText}
        </h2>

        {winner && (
          <p className="text-sm font-semibold text-amber-300">
            {isRTL ? `الفائز: ${winner.name}` : `Winner: ${winner.name}`}
          </p>
        )}

        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          {isRTL ? winReasonAr || 'انتهت المباراة بنجاح' : winReason || 'Match successfully concluded'}
        </p>

        {/* Tournament Highlights Badge */}
        {isTournament && (
          <div className="w-full py-2 px-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-around text-xs">
            {tournamentStage === 'final_won' && (
              <>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <span>🏆</span> {isRTL ? 'كأس البطولة' : 'Championship Trophy'}
                </span>
                <span className="font-mono font-black text-emerald-400">
                  +1,500 🪙 {isRTL ? 'عملة' : 'Coins'}
                </span>
              </>
            )}
            {tournamentStage === 'final_lost' && (
              <>
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <span>🥈</span> {isRTL ? 'المركز الثاني' : '2nd Place Prize'}
                </span>
                <span className="font-mono font-black text-amber-300">
                  +500 🪙 {isRTL ? 'عملة' : 'Coins'}
                </span>
              </>
            )}
            {tournamentStage === 'semifinal_won' && (
              <span className="font-bold text-sky-300 flex items-center gap-1">
                <span>🎯</span> {isRTL ? 'حجزت مقعدك في النهائي الكبير!' : 'Seat reserved in Grand Final!'}
              </span>
            )}
          </div>
        )}

        {/* Rewards / Stake Settlement Cluster */}
        <div className="w-full flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 my-1">
          {matchStake > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{isRTL ? 'مبلغ الرهان (خُصم مسبقاً):' : 'Match Wager (Deducted):'}</span>
                <span className="font-mono font-bold text-slate-300">{matchStake.toLocaleString()} 🪙</span>
              </div>

              {isHumanWinner ? (
                <>
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold px-1">
                    <span>{isRTL ? 'الجائزة المضاعفة المضافة:' : 'Doubled Pot Awarded:'}</span>
                    <span className="font-mono font-black text-emerald-300 tabular-nums">
                      +{(matchStake * 2).toLocaleString()} 🪙
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-300 font-bold px-1 border-t border-slate-800/80 pt-1">
                    <span>{isRTL ? 'صافي الربح:' : 'Net Profit:'}</span>
                    <span className="font-mono font-black tabular-nums">+{matchStake.toLocaleString()} 🪙</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-xs text-rose-400 font-semibold px-1">
                  <span>{isRTL ? 'نتيجة الرهان:' : 'Wager Result:'}</span>
                  <span className="font-mono font-black text-rose-400 tabular-nums">
                    -{matchStake.toLocaleString()} 🪙 ({isRTL ? 'خسارة الرهان' : 'Lost'})
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <span>{coinsEarned >= 0 ? (isRTL ? 'المكافأة المكتسبة:' : 'Reward Earned:') : (isRTL ? 'نتيجة:' : 'Result:')}</span>
              <span className={`font-mono font-bold tabular-nums ${coinsEarned >= 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                {coinsEarned >= 0 ? `+${coinsEarned}` : `${coinsEarned}`} 🪙
              </span>
            </div>
          )}

          {typeof currentBalance === 'number' && (
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1 border-t border-slate-800/80 pt-1 mt-0.5">
              <span className="flex items-center gap-1">
                <span>💰</span>
                <span>{isRTL ? 'رصيدك الحالي الكلي:' : 'Current Balance:'}</span>
              </span>
              <span className="font-mono font-black text-amber-400 tabular-nums">
                {currentBalance.toLocaleString()} 🪙
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 w-full mt-2">
          {/* Tournament Return / Continuation Button */}
          {isTournament && onContinueTournament && (
            <button
              onClick={() => {
                soundFX.playButtonClick();
                onContinueTournament();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🏆</span>
              <span>
                {tournamentStage === 'semifinal_won'
                  ? isRTL ? 'الرجوع لغرفة البطولة (المباراة النهائية)' : 'Return to Tournament Room (Final)'
                  : isRTL ? 'الرجوع لغرفة البطولة' : 'Return to Tournament Room'}
              </span>
            </button>
          )}

          {/* Play Again (Only if not tournament or as secondary option) */}
          {!isTournament && (
            <button
              onClick={() => {
                soundFX.playButtonClick();
                onPlayAgain();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-950/50 transition-all active:scale-95"
            >
              🎱 {isRTL ? 'لعب مباراة أخرى' : 'Play Again'}
            </button>
          )}

          {/* Main Menu */}
          <button
            onClick={() => {
              soundFX.playButtonClick();
              onQuitToTitle();
            }}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs uppercase tracking-wider transition-all"
          >
            {isRTL ? 'العودة للقائمة الرئيسية' : 'Return to Menu'}
          </button>
        </div>
      </div>
    </div>
  );
};
