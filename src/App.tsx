/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AIDifficulty,
  Ball,
  BallSnapshot,
  GameMode,
  GameStateScreen,
  Language,
  Player,
  PracticeRackType,
  RuleVariant,
  ShotReport,
  TournamentMatch,
  TurnPhase,
  Vector2D,
} from './types/game';
import { DEFAULT_CUES, DEFAULT_FELTS, StorageManager, UserSaveData } from './save/storage';
import { physicsEngine, PLAY_AREA, TABLE_WIDTH, TABLE_HEIGHT } from './physics/engine';
import { EightBallRuleEngine } from './rules/eightBallRules';
import { NineBallRuleEngine } from './rules/nineBallRules';
import { PracticeRuleEngine } from './rules/practiceRules';
import { BilliardsAI } from './ai/billiardsAI';
import { TournamentEngine } from './tournaments/tournamentEngine';
import { soundFX } from './audio/soundFX';
import { LocalTransport } from './network/localTransport';
import { MatchRounds, NetworkPacket } from './types/network';

import { TitleScreen } from './ui/TitleScreen';
import { TableCanvas } from './ui/TableCanvas';
import { TableCanvas3D } from './ui/TableCanvas3D';
import { GameHUD } from './ui/GameHUD';
import { CuePowerBar } from './ui/CuePowerBar';
import { CueShopModal } from './ui/CueShopModal';
import { TournamentModal } from './ui/TournamentModal';
import { LocalMultiplayerModal } from './ui/LocalMultiplayerModal';
import { RulesModal } from './ui/RulesModal';
import { PauseModal } from './ui/PauseModal';
import { GameOverModal } from './ui/GameOverModal';
import { DevTestsModal } from './ui/DevTestsModal';
import { ProfileModal } from './ui/ProfileModal';
import { ChallengesModal, OFFLINE_CHALLENGES } from './ui/ChallengesModal';
import { SettingsModal } from './ui/SettingsModal';
import { DailySpinModal } from './ui/DailySpinModal';

export default function App() {
  // Persistence
  const [saveData, setSaveData] = useState<UserSaveData>(() => StorageManager.load());
  const language = saveData.language;
  const isRTL = language === 'ar';

  // Game Screen & Mode
  const [currentScreen, setCurrentScreen] = useState<GameStateScreen>('TITLE');
  const [returnScreen, setReturnScreen] = useState<GameStateScreen>('TITLE');
  const [gameMode, setGameMode] = useState<GameMode>('8ball');
  const [matchStake, setMatchStake] = useState<number>(0);
  const [ruleVariant, setRuleVariant] = useState<RuleVariant>('wpa_official');
  const [isOpenTable, setIsOpenTable] = useState<boolean>(true);
  const [isBreakShot, setIsBreakShot] = useState<boolean>(true);

  // Camera Zoom (Overview vs Close-up)
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Multi-platform responsive orientation tracking (Phones, Tablets & Desktops)
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleScreenResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleScreenResize);
    window.addEventListener('orientationchange', handleScreenResize);
    return () => {
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('orientationchange', handleScreenResize);
    };
  }, []);

  // 2D vs 3D View Toggle (Synchronized with single authoritative physics state)
  const handleToggleViewMode = useCallback(() => {
    const nextMode = saveData.viewMode === '3d' ? '2d' : '3d';
    const updated = StorageManager.setViewMode(nextMode);
    setSaveData(updated);
  }, [saveData.viewMode]);

  // Quick 3D Camera Angle Cycler
  const handleCycleCameraPreset3D = useCallback(() => {
    const presets: ('angled' | 'top_perspective' | 'cue_behind')[] = ['angled', 'top_perspective', 'cue_behind'];
    const current = saveData.cameraPreset3D || 'angled';
    const next = presets[(presets.indexOf(current) + 1) % presets.length];
    const updated = StorageManager.setCameraPreset3D(next);
    setSaveData(updated);
  }, [saveData.cameraPreset3D]);

  // Status Toast Messages
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusMessageAr, setStatusMessageAr] = useState<string>('');

  // Players (Reflecting user chosen names and avatars from settings)
  const [player1, setPlayer1] = useState<Player>(() => ({
    id: 'p1',
    name: saveData.playerName || (isRTL ? 'إيميلي' : 'Emely'),
    isAI: false,
    group: 'undetermined',
    score: 0,
    avatarSeed: saveData.avatarIcon || 'player1',
    cueId: saveData.selectedCueId,
  }));

  const [player2, setPlayer2] = useState<Player>(() => ({
    id: 'p2',
    name: saveData.player2Name || (isRTL ? 'طارق المبتدئ' : 'Mike'),
    isAI: true,
    aiDifficulty: 'medium',
    group: 'undetermined',
    score: 0,
    avatarSeed: saveData.player2Avatar || 'mike',
    cueId: 'cue_classic_wood',
  }));

  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);

  // Authoritative Balls State & Practice Snapshots
  const [balls, setBalls] = useState<Ball[]>([]);
  const ballsRef = useRef<Ball[]>([]);
  ballsRef.current = balls;
  const evalScheduledRef = useRef<boolean>(false);
  const [practiceSnapshots, setPracticeSnapshots] = useState<BallSnapshot[]>([]);

  // Aiming, Power & Spin (Power strictly starts at 0% and only changes when pulling the cue)
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [cuePower, setCuePower] = useState<number>(0);
  const [spin, setSpin] = useState<Vector2D>({ x: 0, y: 0 });
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('AIMING');
  const [shotClock, setShotClock] = useState<number>(35);
  const [controlMode3D, setControlMode3D] = useState<'aim' | 'orbit'>('aim');

  // Tournament & Challenges
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [_currentTournamentMatch, setCurrentTournamentMatch] = useState<TournamentMatch | null>(null);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const foulsInMatchRef = useRef<number>(0);
  const scratchesInMatchRef = useRef<number>(0);

  // Game Over Details
  const [matchWinner, setMatchWinner] = useState<Player | null>(null);
  const [winReason, setWinReason] = useState<string>('');
  const [winReasonAr, setWinReasonAr] = useState<string>('');
  const [coinsEarned, setCoinsEarned] = useState<number>(0);

  // Rule Engines
  const rules8Ball = useRef(new EightBallRuleEngine());
  const rules9Ball = useRef(new NineBallRuleEngine());
  const rulesPractice = useRef(new PracticeRuleEngine());

  // Active Shot Report
  const shotReportRef = useRef<ShotReport>({
    cueBallHitFirst: null,
    ballsPocketedThisShot: [],
    cushionHitAfterFirstContact: false,
    cueBallPocketed: false,
    anyBallLeftTable: false,
  });

  // Network (Stage 4 Local Transport)
  const [isLanMatch, setIsLanMatch] = useState<boolean>(false);
  const [isLanHost, setIsLanHost] = useState<boolean>(false);
  const [lanLatency, setLanLatency] = useState<number>(8);
  const [lanReconnectingSeconds, setLanReconnectingSeconds] = useState<number | null>(null);
  const [lanRounds, setLanRounds] = useState<MatchRounds>(1);
  const [lanFramesWon, setLanFramesWon] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const localTransportRef = useRef<LocalTransport | null>(null);

  // Turn authorization (Host is p1 index 0, Client is p2 index 1)
  const isMyTurn = !isLanMatch || (isLanHost ? activePlayerIndex === 0 : activePlayerIndex === 1);

  // Equipped Cosmetics
  const equippedCue = DEFAULT_CUES.find(c => c.id === saveData.selectedCueId) || DEFAULT_CUES[0];
  const equippedFelt = DEFAULT_FELTS.find(f => f.id === saveData.selectedTableFeltId) || DEFAULT_FELTS[0];

  // Celebration & Particle states
  const [lastPocketedPos, setLastPocketedPos] = useState<Vector2D | null>(null);

  // Initialize audio, music, and haptic settings
  useEffect(() => {
    soundFX.setMuted(!saveData.soundEnabled);
    soundFX.setMusicEnabled(saveData.musicEnabled);
    soundFX.setHapticsEnabled(saveData.hapticsEnabled);
  }, [saveData.soundEnabled, saveData.musicEnabled, saveData.hapticsEnabled]);

  // Sync rule variant with 8-ball engine
  useEffect(() => {
    rules8Ball.current.setVariant(ruleVariant);
  }, [ruleVariant]);

  // Set document dir & lang attribute
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

  // Live synchronization of Player 1 and Player 2 with UserSaveData from Settings / Profile
  useEffect(() => {
    setPlayer1(p => ({
      ...p,
      name: saveData.playerName || (isRTL ? 'إيميلي' : 'Emely'),
      avatarSeed: saveData.avatarIcon || 'player1',
      cueId: saveData.selectedCueId,
    }));
  }, [saveData.playerName, saveData.avatarIcon, saveData.selectedCueId, isRTL]);

  useEffect(() => {
    if (saveData.player2Name || saveData.player2Avatar) {
      setPlayer2(p => ({
        ...p,
        name: saveData.player2Name || p.name,
        avatarSeed: saveData.player2Avatar || p.avatarSeed,
      }));
    }
  }, [saveData.player2Name, saveData.player2Avatar]);

  // Start a new game
  const startNewGame = useCallback(
    (mode: GameMode, vsAI: boolean, difficulty: AIDifficulty = 'medium', customPlayer2?: Partial<Player>, stake: number = 0) => {
      if (stake > 0) {
        const deductResult = StorageManager.deductMatchStake(stake);
        if (!deductResult.success) {
          soundFX.playFoulSound();
          return;
        }
        setSaveData(deductResult.data);
      }
      setMatchStake(stake);
      setGameMode(mode);
      setIsOpenTable(true);
      setIsBreakShot(true);
      setPracticeSnapshots([]);
      setStatusMessage('');
      setStatusMessageAr('');
      evalScheduledRef.current = false;

      const p1: Player = {
        id: 'p1',
        name: saveData.playerName || (isRTL ? 'إيميلي' : 'Emely'),
        nameAr: saveData.playerName || 'إيميلي',
        isAI: false,
        group: 'undetermined',
        score: 0,
        avatarSeed: saveData.avatarIcon || 'player1',
        cueId: saveData.selectedCueId,
      };

      const resolvedDiff = customPlayer2?.aiDifficulty || difficulty;
      const defaultAIName = resolvedDiff === 'easy'
        ? isRTL ? 'طارق المبتدئ' : 'Rookie Tarek'
        : resolvedDiff === 'medium'
        ? isRTL ? 'كابتن ماجد' : 'Captain Majed'
        : resolvedDiff === 'hard'
        ? isRTL ? 'زيد القناص' : 'Sniper Zaid'
        : isRTL ? 'الأستاذ سلطان' : 'Grandmaster Sultan';

      const p2: Player = {
        id: customPlayer2?.id || 'p2',
        name: customPlayer2?.name || (vsAI ? defaultAIName : (saveData.player2Name || (isRTL ? 'اللاعب 2' : 'Player 2'))),
        nameAr: customPlayer2?.nameAr || (vsAI ? defaultAIName : (saveData.player2Name || 'اللاعب 2')),
        isAI: vsAI,
        aiDifficulty: resolvedDiff,
        group: 'undetermined',
        score: 0,
        avatarSeed: customPlayer2?.avatarSeed || (vsAI ? (saveData.player2Avatar || 'mike') : (saveData.player2Avatar || 'player2')),
        cueId: customPlayer2?.cueId || 'cue_classic_wood',
      };

      setPlayer1(p1);
      setPlayer2(p2);
      setActivePlayerIndex(0);

      // Initialize balls based on mode
      let initBalls: Ball[] = [];
      if (mode === '8ball') initBalls = rules8Ball.current.initializeBalls();
      else if (mode === '9ball') initBalls = rules9Ball.current.initializeBalls();
      else initBalls = rulesPractice.current.initializeBalls('8ball_rack');

      setBalls(initBalls);
      ballsRef.current = initBalls;
      setAimAngle(0);
      setCuePower(0); // STRICTLY 0% before pulling the cue
      setSpin({ x: 0, y: 0 });
      setTurnPhase('AIMING');
      setShotClock(35);
      setCurrentScreen('PLAYING');
    },
    [saveData.playerName, saveData.avatarIcon, saveData.player2Name, saveData.player2Avatar, saveData.selectedCueId, isRTL]
  );

  // Execute Shot Action (Host-Authoritative Model)
  const executeShot = useCallback((angle: number, power: number, shotSpin: Vector2D) => {
    evalScheduledRef.current = false;
    setCuePower(0);

    // Save snapshot in practice mode for Undo
    if (gameMode === 'practice' || gameMode === 'challenge') {
      setPracticeSnapshots(prev => [
        ...prev.slice(-5), // keep last 5 shots
        {
          balls: JSON.parse(JSON.stringify(balls)),
          activePlayerIndex,
          isOpenTable,
        },
      ]);
    }

    // In a LAN match, if I am client, send SHOT_INTENT to Host
    if (isLanMatch && !isLanHost) {
      localTransportRef.current?.send({
        type: 'SHOT_INTENT',
        angle,
        power,
        spin: shotSpin,
      } as any);
      setTurnPhase('SIMULATING');
      return;
    }

    setBalls(prevBalls => {
      const cueBall = prevBalls.find(b => b.number === 0);
      if (!cueBall || cueBall.isPocketed) return prevBalls;

      // Reset shot report
      shotReportRef.current = {
        cueBallHitFirst: null,
        ballsPocketedThisShot: [],
        cushionHitAfterFirstContact: false,
        cueBallPocketed: false,
        anyBallLeftTable: false,
      };

      // Strike ball
      physicsEngine.strikeBall(cueBall, angle, power, shotSpin);

      // If LAN Host, broadcast executed shot to client
      if (isLanMatch && isLanHost) {
        localTransportRef.current?.send({
          type: 'SHOT_EXECUTED',
          angle,
          power,
          spin: shotSpin,
          cueBallPosition: { ...cueBall.position },
        } as any);
      }

      setTurnPhase('SIMULATING');
      return [...prevBalls];
    });
  }, [balls, activePlayerIndex, isOpenTable, gameMode, isLanMatch, isLanHost]);

  // Practice Mode Only: Undo Last Shot
  const handleUndoShot = useCallback(() => {
    if (practiceSnapshots.length === 0) return;
    const lastSnapshot = practiceSnapshots[practiceSnapshots.length - 1];
    setBalls(lastSnapshot.balls);
    setActivePlayerIndex(lastSnapshot.activePlayerIndex);
    setIsOpenTable(lastSnapshot.isOpenTable);
    setPracticeSnapshots(prev => prev.slice(0, -1));
    setTurnPhase('AIMING');
    setStatusMessage('Shot undone');
    setStatusMessageAr('تم التراجع عن الضربة');
  }, [practiceSnapshots]);

  // Practice Mode Only: Select Drill / Re-rack
  const handleSelectPracticeDrill = useCallback((drill: PracticeRackType) => {
    const newBalls = rulesPractice.current.initializeBalls(drill);
    setBalls(newBalls);
    setPracticeSnapshots([]);
    setTurnPhase('AIMING');
    setStatusMessage('Drill setup loaded');
    setStatusMessageAr('تم تحميل ترتيب التدريب');
    soundFX.playBallCollision(0.8);
  }, []);

  // Practice Mode Only: Free Ball In Hand
  const handleFreeBallInHand = useCallback(() => {
    setTurnPhase('BALL_IN_HAND');
    setStatusMessage('Tap anywhere to place cue ball');
    setStatusMessageAr('انقر في أي مكان لوضع الكرة البيضاء');
  }, []);

  // Practice Mode Only: AI Coach Hint
  const handleGetPracticeHint = useCallback(() => {
    const cueBall = balls.find(b => b.number === 0);
    if (!cueBall || cueBall.isPocketed) return;
    const hint = BilliardsAI.getPracticeHint(cueBall, balls, player1, gameMode, { isOpenTable });
    if (hint) {
      setStatusMessage(hint.adviceEn);
      setStatusMessageAr(hint.adviceAr);
      soundFX.playButtonClick();
    } else {
      setStatusMessage('No direct pot line found. Consider a safety bank shot.');
      setStatusMessageAr('لا توجد تسديدة مباشرة واضحة. فكّر بضربة ارتدادية دفاعية.');
    }
  }, [balls, player1, gameMode, isOpenTable]);

  // Place cue ball in hand
  const handlePlaceBallInHand = useCallback((pos: Vector2D) => {
    if (isLanMatch && !isLanHost) {
      localTransportRef.current?.send({
        type: 'BALL_PLACEMENT',
        position: pos,
      } as any);
      return;
    }

    const mustBeKitchen = ruleVariant === 'house_rules' && isBreakShot;
    const validation = physicsEngine.isValidCueBallPlacement(pos, balls, mustBeKitchen);

    if (!validation.valid) {
      soundFX.playFoulSound();
      setStatusMessage(validation.reason || 'Invalid placement position');
      setStatusMessageAr('موضع غير صالح للكرة البيضاء');
      return;
    }

    setBalls(prevBalls => {
      const cueBall = prevBalls.find(b => b.number === 0);
      if (!cueBall) return prevBalls;

      cueBall.position = { ...pos };
      cueBall.velocity = { x: 0, y: 0 };
      cueBall.isPocketed = false;
      cueBall.visible = true;

      if (isLanMatch && isLanHost) {
        localTransportRef.current?.send({
          type: 'BALL_PLACEMENT',
          position: pos,
        } as any);
      }

      setTurnPhase('AIMING');
      soundFX.playBallCollision(0.4);
      return [...prevBalls];
    });
  }, [balls, ruleVariant, isBreakShot, isLanMatch, isLanHost]);

  // Main Simulation Loop (60fps tick)
  useEffect(() => {
    if (turnPhase !== 'SIMULATING') return;

    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      setBalls(prevBalls => {
        const { isStillMoving, newPocketedBalls } = physicsEngine.step(prevBalls, dt, shotReportRef.current);
        ballsRef.current = prevBalls;

        if (newPocketedBalls && newPocketedBalls.length > 0) {
          const pocketedBall = prevBalls.find(b => b.number === newPocketedBalls[0]);
          if (pocketedBall) {
            setLastPocketedPos({ x: pocketedBall.position.x, y: pocketedBall.position.y });
          }
        }

        if (!isStillMoving && !evalScheduledRef.current) {
          evalScheduledRef.current = true;
          setTimeout(() => {
            evaluateShotCompletion();
          }, 60);
        }

        return [...prevBalls];
      });

      if (turnPhase === 'SIMULATING') {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [turnPhase]);

  // Evaluate the completed shot (Host-Authoritative)
  const evaluateShotCompletion = useCallback(() => {
    // In LAN matches, Client waits for Host's authoritative evaluation
    if (isLanMatch && !isLanHost) {
      setTurnPhase('EVALUATING');
      return;
    }

    setTurnPhase('EVALUATING');
    setCuePower(0);
    evalScheduledRef.current = false;
    const activePlayer = activePlayerIndex === 0 ? player1 : player2;
    const otherPlayer = activePlayerIndex === 0 ? player2 : player1;
    const currentBalls = ballsRef.current && ballsRef.current.length > 0 ? ballsRef.current : balls;

    let evalResult;
    if (gameMode === '8ball') {
      evalResult = rules8Ball.current.evaluateShot(
        shotReportRef.current,
        activePlayer,
        otherPlayer,
        currentBalls,
        { isOpenTable, isBreakShot }
      );
    } else if (gameMode === '9ball') {
      evalResult = rules9Ball.current.evaluateShot(
        shotReportRef.current,
        activePlayer,
        otherPlayer,
        currentBalls
      );
    } else {
      evalResult = rulesPractice.current.evaluateShot(
        shotReportRef.current,
        activePlayer,
        otherPlayer,
        currentBalls
      );
    }

    // Set banner messages
    setStatusMessage(evalResult.message);
    setStatusMessageAr(evalResult.messageAr);

    // After first shot is evaluated, break shot flag is cleared
    setIsBreakShot(false);

    // Play feedback sound and record stats
    if (evalResult.isFoul) {
      foulsInMatchRef.current += 1;
      soundFX.playFoulSound();
    }
    if (shotReportRef.current.cueBallPocketed) {
      scratchesInMatchRef.current += 1;
    }

    // Check Game Over
    if (evalResult.isGameOver) {
      const winner = evalResult.winnerPlayerId === player1.id ? player1 : player2;
      setMatchWinner(winner);
      setWinReason(evalResult.winReason || '');
      setWinReasonAr(evalResult.winReasonAr || '');

      const isHumanWin = winner.id === player1.id;
      const modeLabel = gameMode === '8ball' ? '8-Ball Match' : gameMode === '9ball' ? '9-Ball Rotation' : 'Challenge Drill';
      const modeLabelAr = gameMode === '8ball' ? 'مباراة الكرة الثامنة' : gameMode === '9ball' ? 'دوران الكرة التاسعة' : 'تحدي مهارة';
      const scoreLabel = `${player1.score} - ${player2.score}`;

      let updated: UserSaveData;
      let earned = 0;

      if (matchStake > 0) {
        const settle = StorageManager.settleMatchStake(isHumanWin, matchStake, {
          mode: modeLabel,
          modeAr: modeLabelAr,
          opponent: player2.name,
          score: scoreLabel,
          fouls: foulsInMatchRef.current,
          scratches: scratchesInMatchRef.current,
        });
        updated = settle.updated;
        earned = settle.netCoinsChange;
      } else {
        updated = StorageManager.recordGameResult(isHumanWin, {
          mode: modeLabel,
          modeAr: modeLabelAr,
          opponent: player2.name,
          score: scoreLabel,
          fouls: foulsInMatchRef.current,
          scratches: scratchesInMatchRef.current,
        });
        earned = isHumanWin ? 50 : 15;
      }

      setCoinsEarned(earned);

      if (gameMode === 'challenge' && activeChallengeId && isHumanWin) {
        const challenge = OFFLINE_CHALLENGES.find(c => c.id === activeChallengeId);
        if (challenge) {
          updated = StorageManager.recordChallengeCompletion(activeChallengeId, challenge.starsReward, challenge.coinReward);
        }
      }

      if (_currentTournamentMatch) {
        const isChampionship = _currentTournamentMatch.round === 3;
        const updatedTourney = tournamentMatches.map(m => {
          if (m.id === _currentTournamentMatch.id) {
            return {
              ...m,
              winner,
              isCompleted: true,
              score: isHumanWin ? '2 - 0' : '0 - 2',
            };
          }
          return m;
        });
        const simulated = TournamentEngine.simulateOtherMatches(updatedTourney);
        setTournamentMatches(simulated);
        StorageManager.saveTournamentCareer(simulated);

        if (isHumanWin && isChampionship) {
          updated.trophies = (updated.trophies || 0) + 1;
          updated.coins = (updated.coins || 0) + 500;
          setCoinsEarned(500);
          setWinReason('Grand Tournament Champion! You won the Trophy and 500 Coins!');
          setWinReasonAr('بطل مسيرة البطولات! فزت بكأس البطولة و500 عملة ذهبية!');
        }
      }

      if (isLanMatch && isLanHost) {
        localTransportRef.current?.send({
          type: 'TURN_RESULT',
          nextPlayerId: winner.id,
          awardBallInHand: false,
          message: evalResult.winReason || 'Match Over',
          messageAr: evalResult.winReasonAr || 'انتهت المباراة',
          balls: balls,
          p1Score: player1.score,
          p2Score: player2.score,
          isGameOver: true,
          winnerPlayerId: winner.id,
          winReason: evalResult.winReason,
          winReasonAr: evalResult.winReasonAr,
        } as any);
      }

      setSaveData(updated);

      if (isHumanWin) soundFX.playVictoryChime();
      setCurrentScreen('GAME_OVER');
      return;
    }

    // Handle group assignments
    if (evalResult.assignedGroupPlayer1 && evalResult.assignedGroupPlayer2) {
      setPlayer1(p => ({ ...p, group: evalResult.assignedGroupPlayer1! }));
      setPlayer2(p => ({ ...p, group: evalResult.assignedGroupPlayer2! }));
      setIsOpenTable(false);
    }

    // Switch turns or continue
    const nextPlayerIndex = evalResult.nextPlayerId === player1.id ? 0 : 1;
    setActivePlayerIndex(nextPlayerIndex);

    // Ball in hand ONLY when cue ball was pocketed (Scratch) as requested by user!
    if (shotReportRef.current.cueBallPocketed) {
      setBalls(prevBalls => {
        const cue = prevBalls.find(b => b.number === 0);
        if (cue) {
          cue.position = { x: TABLE_WIDTH / 2 - 100, y: TABLE_HEIGHT / 2 };
          cue.velocity = { x: 0, y: 0 };
          cue.isPocketed = false;
        }
        return [...prevBalls];
      });
      setTurnPhase('BALL_IN_HAND');
    } else {
      // Normal shot, continuing turn, or miss: cue ball stays exactly where it stopped!
      setTurnPhase('AIMING');
    }

    // Host sends authoritative turn transition packet to client
    if (isLanMatch && isLanHost) {
      localTransportRef.current?.send({
        type: 'TURN_RESULT',
        nextPlayerId: evalResult.nextPlayerId,
        awardBallInHand: shotReportRef.current.cueBallPocketed,
        message: evalResult.message,
        messageAr: evalResult.messageAr,
        balls: balls,
        p1Score: player1.score,
        p2Score: player2.score,
        isGameOver: false,
      } as any);
    }

    setShotClock(35);
  }, [activePlayerIndex, balls, gameMode, isOpenTable, isBreakShot, player1, player2, isLanMatch, isLanHost]);

  // AI Turn Handling - Fast, Smooth, Reliable and Non-Blocking
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentScreen !== 'PLAYING') {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      return;
    }
    const activePlayer = activePlayerIndex === 0 ? player1 : player2;

    if (!activePlayer.isAI) {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      return;
    }

    if (turnPhase !== 'AIMING' && turnPhase !== 'BALL_IN_HAND') {
      return;
    }

    // Clear any pending timer
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    // 1. Immediately ensure cue ball is on table if in hand or pocketed
    let activeCueBall = balls.find(b => b.number === 0);
    let updatedBalls = [...balls];

    if (!activeCueBall || activeCueBall.isPocketed || turnPhase === 'BALL_IN_HAND') {
      const placeX = PLAY_AREA.left + 220 + Math.random() * 140;
      const placeY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2 + (Math.random() - 0.5) * 120;
      const placedPos = { x: placeX, y: placeY };

      updatedBalls = updatedBalls.map(b => {
        if (b.number === 0) {
          return {
            ...b,
            position: placedPos,
            velocity: { x: 0, y: 0 },
            isPocketed: false,
            visible: true,
          };
        }
        return b;
      });

      setBalls(updatedBalls);
      activeCueBall = updatedBalls.find(b => b.number === 0);
    }

    if (!activeCueBall) return;

    // 2. Plan shot smoothly
    const decision = BilliardsAI.planShot(activeCueBall, updatedBalls, activePlayer, gameMode, { isOpenTable });
    setAimAngle(decision.angle);
    setCuePower(decision.power);

    // 3. Execute shot smoothly after 500ms
    aiTimerRef.current = setTimeout(() => {
      executeShot(decision.angle, decision.power, decision.spin);
    }, 500);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [activePlayerIndex, currentScreen, turnPhase]);

  // Shot Clock Countdown
  useEffect(() => {
    if (
      currentScreen !== 'PLAYING' ||
      turnPhase === 'SIMULATING' ||
      turnPhase === 'EVALUATING' ||
      turnPhase === 'AI_THINKING'
    ) {
      return;
    }

    const interval = setInterval(() => {
      setShotClock(prev => {
        if (prev <= 1) {
          soundFX.playFoulSound();
          setActivePlayerIndex(curr => (curr === 0 ? 1 : 0));
          setTurnPhase('AIMING');
          return 35;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentScreen, turnPhase]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentScreen === 'PLAYING') {
        setCurrentScreen('PAUSED');
      } else if (e.key === 'ArrowLeft' && turnPhase === 'AIMING') {
        setAimAngle(a => a - 0.02);
      } else if (e.key === 'ArrowRight' && turnPhase === 'AIMING') {
        setAimAngle(a => a + 0.02);
      } else if (e.key === ' ' && turnPhase === 'AIMING') {
        executeShot(aimAngle, cuePower, spin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, turnPhase, aimAngle, cuePower, spin, executeShot]);

  // Language & Sound Toggles
  const handleToggleLanguage = () => {
    const newLang: Language = language === 'ar' ? 'en' : 'ar';
    const updated: UserSaveData = { ...saveData, language: newLang };
    StorageManager.save(updated);
    setSaveData(updated);
  };

  const handleToggleSound = () => {
    const newSound = !saveData.soundEnabled;
    const updated = { ...saveData, soundEnabled: newSound };
    StorageManager.save(updated);
    setSaveData(updated);
  };

  // Tournament flow
  const handleOpenTournament = () => {
    let matches = saveData.activeTournamentCareer;
    if (!matches || matches.length === 0) {
      matches = TournamentEngine.createTournament(player1);
      const updatedData = StorageManager.saveTournamentCareer(matches);
      setSaveData(updatedData);
    }
    setTournamentMatches(matches);
    setCurrentScreen('TOURNAMENT');
  };

  const handleStartTournamentMatch = (match: TournamentMatch) => {
    setCurrentTournamentMatch(match);
    // Strictly escalating round difficulty: Round 1 = Easy, Round 2 = Hard, Round 3 = Grandmaster
    const roundDifficulty: AIDifficulty = match.round === 1 ? 'easy' : match.round === 2 ? 'hard' : 'master';
    const opponent: Player = {
      ...match.player2,
      aiDifficulty: roundDifficulty,
      name: isRTL && match.player2.nameAr ? match.player2.nameAr : match.player2.name,
    };
    setPlayer1(match.player1);
    setPlayer2(opponent);
    startNewGame('8ball', true, roundDifficulty, opponent);
  };

  // Inbound LAN Packet Dispatcher (Host-Authoritative Sync)
  const handleInboundLanPacket = useCallback((packet: NetworkPacket, asHost: boolean) => {
    if (asHost) {
      // HOST handlers
      if (packet.type === 'JOIN_REQUEST') {
        soundFX.playVictoryChime();
        const guestPlayer: Player = {
          id: packet.senderId,
          name: packet.playerName,
          isAI: false,
          group: 'undetermined',
          score: 0,
          avatarSeed: packet.playerAvatar || 'player2',
          cueId: 'cue_classic_wood',
        };
        setPlayer2(guestPlayer);

        // Host responds with JOIN_ACCEPT and authoritative MATCH_START
        localTransportRef.current?.send({
          type: 'JOIN_ACCEPT',
          hostName: player1.name,
          mode: gameMode,
          ruleVariant,
          rounds: lanRounds,
        } as any);

        localTransportRef.current?.send({
          type: 'MATCH_START',
          initialBalls: balls,
          mode: gameMode,
          ruleVariant,
          rounds: lanRounds,
          player1,
          player2: guestPlayer,
        } as any);

        setStatusMessage(`${packet.playerName} joined! Your break shot.`);
        setStatusMessageAr(`انضم ${packet.playerName}! دورك في ضربة البداية.`);
      } else if (packet.type === 'SHOT_INTENT') {
        const cue = balls.find(b => b.number === 0);
        if (cue && !cue.isPocketed) {
          physicsEngine.strikeBall(cue, packet.angle, packet.power, packet.spin);
          localTransportRef.current?.send({
            type: 'SHOT_EXECUTED',
            angle: packet.angle,
            power: packet.power,
            spin: packet.spin,
            cueBallPosition: { ...cue.position },
          } as any);
          setTurnPhase('SIMULATING');
        }
      } else if (packet.type === 'BALL_PLACEMENT') {
        handlePlaceBallInHand(packet.position);
      }
    } else {
      // CLIENT handlers
      if (packet.type === 'JOIN_ACCEPT') {
        setStatusMessage('Joined room! Synchronizing table...');
        setStatusMessageAr('تم الانضمام للغرفة! جاري مزامنة الطاولة...');
      } else if (packet.type === 'MATCH_START') {
        setBalls(packet.initialBalls);
        setPlayer1(packet.player1);
        setPlayer2(packet.player2);
        setGameMode(packet.mode);
        setRuleVariant(packet.ruleVariant);
        setLanRounds(packet.rounds);
        setActivePlayerIndex(0);
        setTurnPhase('AIMING');
        setStatusMessage('Match started! Host has break shot.');
        setStatusMessageAr('بدأت المباراة! المضيف لديه ضربة البداية.');
        soundFX.playBallCollision(0.8);
      } else if (packet.type === 'SHOT_EXECUTED') {
        setBalls(prevBalls => {
          const cue = prevBalls.find(b => b.number === 0);
          if (cue) {
            cue.position = { ...packet.cueBallPosition };
            physicsEngine.strikeBall(cue, packet.angle, packet.power, packet.spin);
          }
          return [...prevBalls];
        });
        setTurnPhase('SIMULATING');
      } else if (packet.type === 'BALL_PLACEMENT') {
        setBalls(prevBalls => {
          const cue = prevBalls.find(b => b.number === 0);
          if (cue) {
            cue.position = { ...packet.position };
            cue.isPocketed = false;
            cue.velocity = { x: 0, y: 0 };
          }
          return [...prevBalls];
        });
        setTurnPhase('AIMING');
      } else if (packet.type === 'TURN_RESULT') {
        setBalls(packet.balls);
        setStatusMessage(packet.message);
        setStatusMessageAr(packet.messageAr);

        if (packet.isGameOver) {
          const winner = packet.winnerPlayerId === player1.id ? player1 : player2;
          setMatchWinner(winner);
          setWinReason(packet.winReason || '');
          setWinReasonAr(packet.winReasonAr || '');
          setCurrentScreen('GAME_OVER');
          return;
        }

        const nextIdx = packet.nextPlayerId === player1.id ? 0 : 1;
        setActivePlayerIndex(nextIdx);

        if (packet.awardBallInHand) {
          setTurnPhase('BALL_IN_HAND');
        } else {
          setTurnPhase('AIMING');
        }
        setShotClock(35);
      }
    }
  }, [balls, gameMode, ruleVariant, lanRounds, player1, player2, handlePlaceBallInHand]);

  // Host a Local LAN Match
  const handleStartLanHost = useCallback((config: {
    roomCode: string;
    mode: GameMode;
    ruleVariant: RuleVariant;
    rounds: MatchRounds;
  }) => {
    setIsLanMatch(true);
    setIsLanHost(true);
    setLanRounds(config.rounds);
    setLanFramesWon({ p1: 0, p2: 0 });
    setGameMode(config.mode);
    setRuleVariant(config.ruleVariant);

    const transport = new LocalTransport({
      onStateChange: (state, detail) => {
        if (state === 'DISCONNECTED') {
          setStatusMessage(detail || 'Opponent disconnected');
          setStatusMessageAr(detail || 'انقطع اتصال الخصم');
        }
      },
      onPacket: (packet) => {
        handleInboundLanPacket(packet, true);
      },
      onDiscoveredRoomsUpdate: () => {},
      onReconnectionCountdown: (sec) => {
        setLanReconnectingSeconds(sec);
      },
    });

    localTransportRef.current = transport;
    transport.startHosting({
      roomCode: config.roomCode,
      mode: config.mode,
      ruleVariant: config.ruleVariant,
      rounds: config.rounds,
      hostPlayer: player1,
    });

    startNewGame(config.mode, false);
    setPlayer2({
      id: 'p2_waiting',
      name: isRTL ? 'بانتظار الخصم...' : 'Waiting for opponent...',
      isAI: false,
      group: 'undetermined',
      score: 0,
      avatarSeed: 'lan_guest',
      cueId: 'cue_classic_wood',
    });
    setStatusMessage(`Room ${config.roomCode} opened. Waiting for opponent...`);
    setStatusMessageAr(`تم فتح الغرفة ${config.roomCode}. بانتظار انضمام الخصم...`);
    setCurrentScreen('PLAYING');
  }, [player1, startNewGame, isRTL, handleInboundLanPacket]);

  // Join a Local LAN Match
  const handleJoinLanRoom = useCallback((roomCode: string) => {
    setIsLanMatch(true);
    setIsLanHost(false);
    setLanFramesWon({ p1: 0, p2: 0 });

    const transport = new LocalTransport({
      onStateChange: (state, detail) => {
        if (state === 'DISCONNECTED') {
          setStatusMessage(detail || 'Disconnected from host');
          setStatusMessageAr(detail || 'انقطع الاتصال بالمضيف');
        }
      },
      onPacket: (packet) => {
        handleInboundLanPacket(packet, false);
      },
      onDiscoveredRoomsUpdate: () => {},
      onReconnectionCountdown: (sec) => {
        setLanReconnectingSeconds(sec);
      },
    });

    localTransportRef.current = transport;
    transport.joinRoom(roomCode, player1);

    setStatusMessage(`Connecting to room ${roomCode}...`);
    setStatusMessageAr(`جاري الاتصال بالغرفة ${roomCode}...`);
    setCurrentScreen('PLAYING');
  }, [player1, handleInboundLanPacket]);

  // Hot-Seat (Pass & Play on Same Device)
  const handleStartHotSeat = useCallback((mode: GameMode, variant: RuleVariant) => {
    setIsLanMatch(false);
    setIsLanHost(true);
    setRuleVariant(variant);
    startNewGame(mode, false);
    setPlayer1({
      ...player1,
      name: saveData.playerName || 'Player 1',
    });
    setPlayer2({
      id: 'p2',
      name: isRTL ? 'اللاعب 2' : 'Player 2',
      isAI: false,
      group: 'undetermined',
      score: 0,
      avatarSeed: 'player2',
      cueId: 'cue_classic_wood',
    });
    setCurrentScreen('PLAYING');
  }, [player1, saveData.playerName, startNewGame, isRTL]);

  // Start Standalone Skill Challenge
  const handleStartChallenge = (drillType: PracticeRackType, challengeId: string) => {
    setActiveChallengeId(challengeId);
    startNewGame('challenge', false);
    handleSelectPracticeDrill(drillType);
    setCurrentScreen('PLAYING');
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`relative w-full h-screen bg-[#070b12] text-slate-100 flex flex-col select-none ${
        currentScreen === 'TITLE' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden justify-center items-center'
      }`}
    >
      {/* 1. Title Screen */}
      {currentScreen === 'TITLE' && (
        <TitleScreen
          onStartGame={startNewGame}
          onOpenTournament={handleOpenTournament}
          onOpenShop={() => setCurrentScreen('CUE_SHOP')}
          onOpenDailySpin={() => {
            setReturnScreen('TITLE');
            setCurrentScreen('DAILY_SPIN');
          }}
          onOpenProfile={() => setCurrentScreen('PROFILE')}
          onOpenChallenges={() => setCurrentScreen('CHALLENGES')}
          onOpenLanLobby={() => setCurrentScreen('LAN_LOBBY')}
          onOpenRules={() => {
            setReturnScreen('TITLE');
            setCurrentScreen('RULES');
          }}
          onOpenSettings={() => {
            setReturnScreen('TITLE');
            setCurrentScreen('SETTINGS');
          }}
          onRunDevTests={() => setCurrentScreen('DEV_TESTS')}
          saveData={saveData}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          soundEnabled={saveData.soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* 2. Playing Field Viewport */}
      {currentScreen === 'PLAYING' && (
        <div
          className="relative w-full h-full flex items-center justify-center p-1 sm:p-2 md:p-4 overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, #172033 0%, #0d1322 50%, #060912 100%)',
          }}
        >
          {/* World-matched Game HUD (less than 15% occlusion) */}
          <GameHUD
            player1={player1}
            player2={player2}
            activePlayerIndex={activePlayerIndex}
            gameMode={gameMode}
            ruleVariant={ruleVariant}
            turnPhase={turnPhase}
            shotClock={shotClock}
            statusMessage={statusMessage}
            statusMessageAr={statusMessageAr}
            balls={balls}
            spin={spin}
            isZoomed={isZoomed}
            onToggleZoom={() => setIsZoomed(z => !z)}
            onSpinChange={setSpin}
            onAngleNudge={(delta) => setAimAngle(a => a + delta)}
            onPause={() => setCurrentScreen('PAUSED')}
            onToggleSound={handleToggleSound}
            soundEnabled={saveData.soundEnabled}
            onShowRules={() => {
              setReturnScreen('PLAYING');
              setCurrentScreen('RULES');
            }}
            onUndoShot={handleUndoShot}
            canUndo={practiceSnapshots.length > 0}
            onSelectPracticeDrill={handleSelectPracticeDrill}
            onFreeBallInHand={handleFreeBallInHand}
            onGetHint={handleGetPracticeHint}
            isLanMatch={isLanMatch}
            isHost={isLanHost}
            lanLatency={lanLatency}
            reconnectingSeconds={lanReconnectingSeconds}
            isMyTurn={isMyTurn}
            viewMode={saveData.viewMode}
            onToggleViewMode={handleToggleViewMode}
            controlMode3D={controlMode3D}
            onToggleControlMode3D={() => setControlMode3D(m => m === 'aim' ? 'orbit' : 'aim')}
            cameraPreset3D={saveData.cameraPreset3D}
            onCycleCameraPreset3D={handleCycleCameraPreset3D}
            currentStake={matchStake}
            language={language}
          />

          {/* Main 60fps Table Canvas with safe gutter to prevent power gauge from covering pockets */}
          <div
            className={`relative w-full h-full flex-1 flex items-center justify-center min-h-0 overflow-hidden transition-all ${
              saveData.powerGaugePosition === 'left'
                ? (isPortrait ? 'pl-14 sm:pl-16 pr-1' : 'pl-20 pr-4')
                : (isPortrait ? 'pr-14 sm:pr-16 pl-1' : 'pr-20 pl-4')
            }`}
          >
            {saveData.viewMode === '3d' ? (
              <TableCanvas3D
                balls={balls}
                aimAngle={aimAngle}
                cuePower={cuePower}
                cueItem={equippedCue}
                feltTheme={equippedFelt}
                ballStyle={saveData.selectedBallStyleId}
                highContrastMode={saveData.highContrastMode}
                reducedMotion={saveData.reducedMotion}
                dragSensitivity={saveData.dragSensitivity}
                turnPhase={turnPhase}
                gameMode={gameMode}
                disabled={!isMyTurn}
                controlMode={controlMode3D}
                cameraPreset3D={saveData.cameraPreset3D}
                onAimAngleChange={setAimAngle}
                onPlaceBallInHand={handlePlaceBallInHand}
                onFallback2D={handleToggleViewMode}
                language={language}
              />
            ) : (
              <TableCanvas
                balls={balls}
                aimAngle={aimAngle}
                cuePower={cuePower}
                cueItem={equippedCue}
                feltTheme={equippedFelt}
                trailStyle={saveData.trailStyle}
                ballStyle={saveData.selectedBallStyleId}
                highContrastMode={saveData.highContrastMode}
                reducedMotion={saveData.reducedMotion}
                dragSensitivity={saveData.dragSensitivity}
                lastPocketedPos={lastPocketedPos}
                isMatchWon={matchWinner !== null && matchWinner.id === 'p1'}
                turnPhase={turnPhase}
                gameMode={gameMode}
                isZoomed={isZoomed}
                disabled={!isMyTurn}
                onAimAngleChange={setAimAngle}
                onPlaceBallInHand={handlePlaceBallInHand}
                language={language}
              />
            )}
          </div>

          {/* Vertical Power Gauge (Right or Left side, ergonomically adapted for portrait and landscape) */}
          <div
            className={`absolute z-30 transition-all origin-center ${
              isPortrait
                ? (saveData.powerGaugePosition === 'left' ? 'left-0.5 sm:left-1 top-1/2 -translate-y-1/2 scale-85' : 'right-0.5 sm:right-1 top-1/2 -translate-y-1/2 scale-85')
                : (saveData.powerGaugePosition === 'left' ? 'left-3 md:left-6 top-1/2 -translate-y-1/2' : 'right-3 md:right-6 top-1/2 -translate-y-1/2')
            }`}
          >
            <CuePowerBar
              power={cuePower}
              onChange={setCuePower}
              onShoot={(shotPower) => {
                const finalPower = typeof shotPower === 'number' && shotPower > 0 ? shotPower : (cuePower > 0 ? cuePower : 0.45);
                executeShot(aimAngle, finalPower, spin);
                setCuePower(0);
              }}
              disabled={(turnPhase !== 'AIMING' && turnPhase !== 'PULLING_CUE') || !isMyTurn}
              language={language}
            />
          </div>
        </div>
      )}

      {/* 3. Pause Modal */}
      {currentScreen === 'PAUSED' && (
        <PauseModal
          onResume={() => setCurrentScreen('PLAYING')}
          onRestart={() => startNewGame(gameMode, player2.isAI, player2.aiDifficulty, undefined, matchStake)}
          onQuitToTitle={() => setCurrentScreen('TITLE')}
          soundEnabled={saveData.soundEnabled}
          onToggleSound={handleToggleSound}
          onOpenSettings={() => {
            setReturnScreen('PAUSED');
            setCurrentScreen('SETTINGS');
          }}
          ruleVariant={ruleVariant}
          onToggleRuleVariant={setRuleVariant}
          language={language}
        />
      )}

      {/* 4. Game Over Modal with Tournament Continuation */}
      {currentScreen === 'GAME_OVER' && (
        <GameOverModal
          winner={matchWinner}
          winReason={winReason}
          winReasonAr={winReasonAr}
          coinsEarned={coinsEarned}
          isTournament={Boolean(_currentTournamentMatch)}
          onContinueTournament={() => {
            setCurrentScreen('TOURNAMENT');
            setCurrentTournamentMatch(null);
          }}
          onPlayAgain={() => {
            setCurrentTournamentMatch(null);
            startNewGame(gameMode, player2.isAI, player2.aiDifficulty, undefined, matchStake);
          }}
          onQuitToTitle={() => {
            setCurrentTournamentMatch(null);
            setCurrentScreen('TITLE');
          }}
          language={language}
        />
      )}

      {/* 5. Cue & Felt Pro Shop ("NAME THIS CUE!" feature) */}
      {currentScreen === 'CUE_SHOP' && (
        <CueShopModal
          saveData={saveData}
          onUpdateSaveData={setSaveData}
          onClose={() => setCurrentScreen('TITLE')}
          onOpenDailySpin={() => {
            setReturnScreen('CUE_SHOP');
            setCurrentScreen('DAILY_SPIN');
          }}
          language={language}
        />
      )}

      {/* 6. Tournament Bracket Modal */}
      {currentScreen === 'TOURNAMENT' && (
        <TournamentModal
          matches={tournamentMatches}
          player1={player1}
          onUpdateMatches={(updated) => {
            setTournamentMatches(updated);
            const saved = StorageManager.saveTournamentCareer(updated);
            setSaveData(saved);
          }}
          onStartMatch={handleStartTournamentMatch}
          onClose={() => setCurrentScreen('TITLE')}
          language={language}
        />
      )}

      {/* 7. Local Multiplayer Modal (Wi-Fi/LAN, Hot-Seat & Bluetooth Architecture) */}
      {currentScreen === 'LAN_LOBBY' && (
        <LocalMultiplayerModal
          player1={player1}
          onStartLanHost={handleStartLanHost}
          onJoinLanRoom={handleJoinLanRoom}
          onStartHotSeat={handleStartHotSeat}
          onClose={() => setCurrentScreen('TITLE')}
          language={language}
        />
      )}

      {/* 8. Rules & Physics Modal */}
      {currentScreen === 'RULES' && (
        <RulesModal
          onClose={() => setCurrentScreen(returnScreen || 'TITLE')}
          language={language}
        />
      )}

      {/* 9. Dev Self-Test Harness Modal */}
      {currentScreen === 'DEV_TESTS' && (
        <DevTestsModal
          onClose={() => setCurrentScreen('TITLE')}
          language={language}
        />
      )}

      {/* 10. Player Profile & Career Stats Modal */}
      {currentScreen === 'PROFILE' && (
        <ProfileModal
          saveData={saveData}
          onUpdateSaveData={setSaveData}
          onClose={() => setCurrentScreen('TITLE')}
          language={language}
        />
      )}

      {/* 11. Standalone Offline Skill Challenges Modal */}
      {currentScreen === 'CHALLENGES' && (
        <ChallengesModal
          saveData={saveData}
          onStartChallenge={handleStartChallenge}
          onClose={() => setCurrentScreen('TITLE')}
          language={language}
        />
      )}

      {/* 12. Settings & Accessibility Modal (Stage 5) */}
      {currentScreen === 'SETTINGS' && (
        <SettingsModal
          saveData={saveData}
          onUpdateSaveData={setSaveData}
          onClose={() => setCurrentScreen(returnScreen || 'TITLE')}
          language={language}
          onToggleLanguage={handleToggleLanguage}
        />
      )}

      {/* 13. Daily Free Lucky Wheel Modal */}
      {currentScreen === 'DAILY_SPIN' && (
        <DailySpinModal
          saveData={saveData}
          onUpdateSaveData={setSaveData}
          onClose={() => setCurrentScreen(returnScreen || 'TITLE')}
          language={language}
        />
      )}
    </div>
  );
}
