/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIDifficulty, BallStyleTheme, CueItem, Language, RuleVariant, TableFeltTheme, TableViewMode, TournamentMatch } from '../types/game';

export interface MatchHistoryItem {
  id: string;
  date: string;
  mode: string;
  modeAr: string;
  opponent: string;
  won: boolean;
  score: string;
}

export interface UserSaveData {
  version: number;
  playerName: string;
  avatarIcon: string;
  player2Name?: string;
  player2Avatar?: string;
  nameFrame: string;
  trailStyle: string;
  preferredDifficulty: AIDifficulty;
  preferredRuleVariant: RuleVariant;
  coins: number;
  trophies: number;
  gamesPlayed: number;
  gamesWon: number;
  foulsCount: number;
  scratchesCount: number;
  currentStreak: number;
  bestStreak: number;
  challengesCompleted: number;
  challengeStars: Record<string, number>;
  selectedCueId: string;
  selectedTableFeltId: string;
  selectedBallStyleId: string;
  unlockedCues: string[];
  unlockedFelts: string[];
  unlockedFrames: string[];
  unlockedTrails: string[];
  unlockedBallStyles: string[];
  customCueNames: Record<string, string>; // "NAME THIS CUE!" feature mappings
  activeTournamentCareer: TournamentMatch[] | null;
  matchHistory: MatchHistoryItem[];
  language: Language;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  dragSensitivity: number; // 0.5 to 1.5
  uiScale: 'normal' | 'large';
  highContrastMode: boolean;
  reducedMotion: boolean;
  powerGaugePosition: 'right' | 'left';
  viewMode: TableViewMode; // '2d' | '3d'
  cameraPreset3D: 'angled' | 'top_perspective' | 'cue_behind';
  lastDailySpinTimestamp: number;
  diagnosticLogs: string[];
}

export const BALL_STYLES: BallStyleTheme[] = [
  {
    id: 'ball_style_classic',
    name: 'Classic Tournament',
    nameAr: 'الكلاسيكي المعتمد للبطولات',
    badgeStyle: 'classic',
    price: 0,
    isUnlocked: true,
    description: 'Standard gloss billiard balls with sharp numbers and clean stripes',
    descriptionAr: 'كرات كلاسيكية لامعة عالية التباين مع أرقام دقيقة وشريط ملون ناصع',
  },
  {
    id: 'ball_style_high_contrast',
    name: 'High Contrast & Badges',
    nameAr: 'عالي التباين وشارات سهولة الرؤية',
    badgeStyle: 'high_contrast',
    price: 0,
    isUnlocked: true,
    description: 'Thick outer rings, bold center badges, and distinct solid vs stripe geometry for full visual accessibility',
    descriptionAr: 'حلقات بارزة وشارات هندسية واضحة للتمييز بين السادة والمخطط دون الاعتماد على اللون وحده',
  },
  {
    id: 'ball_style_neon',
    name: 'Cyberpunk Neon',
    nameAr: 'نيون السايبر المتوهج',
    badgeStyle: 'neon',
    price: 350,
    isUnlocked: false,
    description: 'Vibrant glowing edge rings with dark futuristic styling',
    descriptionAr: 'توهج نيون مستقبلي على الحواف مع مراكز داكنة عالية الجمالية',
  },
  {
    id: 'ball_style_matte',
    name: 'Matte Velvet Pro',
    nameAr: 'المخمل المطفي الاحترافي',
    badgeStyle: 'matte',
    price: 500,
    isUnlocked: false,
    description: 'Non-glare matte finish designed for minimal glare and maximum focus',
    descriptionAr: 'سطح مطفي مخملي يقلل الانعكاسات ويمنح مظهراً متميزاً وعصرياً',
  },
];

export interface CosmeticFrame {
  id: string;
  name: string;
  nameAr: string;
  borderClass: string;
  icon: string;
  price: number;
  isUnlocked: boolean;
  requirement: string;
  requirementAr: string;
}

export interface BallTrailStyle {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  glow: string;
  price: number;
  isUnlocked: boolean;
  requirement: string;
  requirementAr: string;
}

export const COSMETIC_FRAMES: CosmeticFrame[] = [
  {
    id: 'frame_bronze',
    name: 'Bronze Contender',
    nameAr: 'إطار البرونز المبتدئ',
    borderClass: 'border-amber-700/60 shadow-amber-900/20',
    icon: '🥉',
    price: 0,
    isUnlocked: true,
    requirement: 'Default',
    requirementAr: 'افتراضي',
  },
  {
    id: 'frame_silver',
    name: 'Silver Striker',
    nameAr: 'إطار الفضة المحترف',
    borderClass: 'border-slate-300 shadow-slate-300/30',
    icon: '🥈',
    price: 300,
    isUnlocked: false,
    requirement: 'Win 3 games or 300 Coins',
    requirementAr: 'فز بـ 3 مباريات أو 300 عملة',
  },
  {
    id: 'frame_gold',
    name: 'Golden Champion',
    nameAr: 'إطار الذهب الملكي',
    borderClass: 'border-amber-400 shadow-amber-400/50',
    icon: '👑',
    price: 750,
    isUnlocked: false,
    requirement: 'Win a Tournament Championship or 750 Coins',
    requirementAr: 'فز بلقب البطولة أو 750 عملة',
  },
  {
    id: 'frame_diamond',
    name: 'Diamond Master',
    nameAr: 'إطار الماس الأسطوري',
    borderClass: 'border-cyan-400 shadow-cyan-400/60 ring-1 ring-cyan-300',
    icon: '💎',
    price: 1200,
    isUnlocked: false,
    requirement: 'Clear 3 Challenges or 1200 Coins',
    requirementAr: 'أكمل 3 تحديات أو 1200 عملة',
  },
];

export const BALL_TRAILS: BallTrailStyle[] = [
  {
    id: 'trail_classic',
    name: 'Classic No-Trail',
    nameAr: 'كلاسيكي بدون أثر',
    color: 'rgba(255, 255, 255, 0)',
    glow: 'none',
    price: 0,
    isUnlocked: true,
    requirement: 'Default',
    requirementAr: 'افتراضي',
  },
  {
    id: 'trail_cyan_vector',
    name: 'Cyan Laser Comet',
    nameAr: 'مذنب الليزر السماوي',
    color: 'rgba(56, 189, 248, 0.4)',
    glow: 'rgba(56, 189, 248, 0.6)',
    price: 250,
    isUnlocked: false,
    requirement: '250 Coins',
    requirementAr: '250 عملة',
  },
  {
    id: 'trail_gold_spark',
    name: 'Royal Gold Stardust',
    nameAr: 'غبار الذهب الملكي',
    color: 'rgba(251, 191, 36, 0.45)',
    glow: 'rgba(251, 191, 36, 0.7)',
    price: 450,
    isUnlocked: false,
    requirement: '450 Coins',
    requirementAr: '450 عملة',
  },
  {
    id: 'trail_crimson_flame',
    name: 'Phoenix Blaze',
    nameAr: 'لهيب العنقاء الأحمر',
    color: 'rgba(239, 68, 68, 0.45)',
    glow: 'rgba(239, 68, 68, 0.7)',
    price: 600,
    isUnlocked: false,
    requirement: '600 Coins',
    requirementAr: '600 عملة',
  },
];

export const DEFAULT_CUES: CueItem[] = [
  {
    id: 'cue_classic_wood',
    name: 'Classic Ash Cue',
    nameAr: 'عصا الدردار الكلاسيكية',
    power: 1.0,
    aimGuideLength: 420,
    spinControl: 0.8,
    price: 0,
    isUnlocked: true,
    colorScheme: {
      tip: '#38bdf8',
      shaft: '#d4a373',
      wrap: '#582f0e',
      butt: '#331800',
      glow: 'rgba(212, 163, 115, 0.4)',
    },
  },
  {
    id: 'cue_fire_dragon',
    name: 'Dragon Blaze',
    nameAr: 'لهيب التنين',
    power: 1.15,
    aimGuideLength: 480,
    spinControl: 0.95,
    price: 350,
    isUnlocked: false,
    colorScheme: {
      tip: '#f97316',
      shaft: '#ea580c',
      wrap: '#991b1b',
      butt: '#450a0a',
      glow: 'rgba(249, 115, 22, 0.6)',
    },
  },
  {
    id: 'cue_neon_cyber',
    name: 'Cyberpunk Vector',
    nameAr: 'فيكتور سايبر',
    power: 1.22,
    aimGuideLength: 540,
    spinControl: 1.05,
    price: 600,
    isUnlocked: false,
    colorScheme: {
      tip: '#06b6d4',
      shaft: '#0284c7',
      wrap: '#3b82f6',
      butt: '#1e1b4b',
      glow: 'rgba(6, 182, 212, 0.7)',
    },
  },
  {
    id: 'cue_royal_gold',
    name: 'Imperial Sovereign',
    nameAr: 'العصا الملكية الذهبية',
    power: 1.28,
    aimGuideLength: 600,
    spinControl: 1.15,
    price: 1000,
    isUnlocked: false,
    colorScheme: {
      tip: '#fbbf24',
      shaft: '#f59e0b',
      wrap: '#b45309',
      butt: '#78350f',
      glow: 'rgba(251, 191, 36, 0.8)',
    },
  },
  {
    id: 'cue_stealth_carbon',
    name: 'Carbon Phantom',
    nameAr: 'شبح الكاربون الأسود',
    power: 1.25,
    aimGuideLength: 560,
    spinControl: 1.1,
    price: 800,
    isUnlocked: false,
    colorScheme: {
      tip: '#94a3b8',
      shaft: '#334155',
      wrap: '#1e293b',
      butt: '#0f172a',
      glow: 'rgba(148, 163, 184, 0.5)',
    },
  },
  {
    id: 'cue_medium_striker',
    name: 'Swift Cheetah Pro',
    nameAr: 'عصا الفهد السريع (المتوسطة)',
    power: 1.18,
    aimGuideLength: 500,
    spinControl: 1.0,
    price: 450,
    isUnlocked: false,
    colorScheme: {
      tip: '#f59e0b',
      shaft: '#d97706',
      wrap: '#78350f',
      butt: '#451a03',
      glow: 'rgba(245, 158, 11, 0.5)',
    },
  },
  {
    id: 'cue_falcon_gold',
    name: 'Golden Falcon Sovereign',
    nameAr: 'عصا الصقر الذهبي الأسطورية',
    power: 1.30,
    aimGuideLength: 620,
    spinControl: 1.20,
    price: 1200,
    isUnlocked: false,
    colorScheme: {
      tip: '#fef08a',
      shaft: '#fbbf24',
      wrap: '#b45309',
      butt: '#1c1917',
      glow: 'rgba(251, 191, 36, 0.8)',
    },
  },
  {
    id: 'cue_plasma_beast',
    name: 'Dragon Plasma Beast',
    nameAr: 'عصا بلازما التنين الخارقة',
    power: 1.40,
    aimGuideLength: 680,
    spinControl: 1.30,
    price: 2500,
    isUnlocked: false,
    colorScheme: {
      tip: '#38bdf8',
      shaft: '#818cf8',
      wrap: '#c084fc',
      butt: '#312e81',
      glow: 'rgba(168, 85, 247, 0.8)',
    },
  },
  {
    id: 'cue_cosmic_titan',
    name: 'Cosmic Titan Singularity',
    nameAr: 'عصا تيتان المجرات الكونية',
    power: 1.48,
    aimGuideLength: 740,
    spinControl: 1.35,
    price: 4000,
    isUnlocked: false,
    colorScheme: {
      tip: '#e0e7ff',
      shaft: '#6366f1',
      wrap: '#4338ca',
      butt: '#0f172a',
      glow: 'rgba(99, 102, 241, 0.9)',
    },
  },
];

export const DEFAULT_FELTS: TableFeltTheme[] = [
  {
    id: 'felt_classic_green',
    name: 'Tournament Emerald',
    nameAr: 'الزمرد الكلاسيكي المعتمد',
    feltColor: '#0d6938',
    railColor: '#128045',
    woodColor: '#38220f',
    cushionGlow: 'rgba(18, 128, 69, 0.3)',
    price: 0,
    isUnlocked: true,
  },
  {
    id: 'felt_royal_blue',
    name: 'Royal Sapphire',
    nameAr: 'الياقوت الأزرق الملكي',
    feltColor: '#104f91',
    railColor: '#1a64b5',
    woodColor: '#1a1f2c',
    cushionGlow: 'rgba(26, 100, 181, 0.35)',
    price: 250,
    isUnlocked: false,
  },
  {
    id: 'felt_crimson_red',
    name: 'Grand Velvet Ruby',
    nameAr: 'المخمل الياقوتي الأحمر',
    feltColor: '#8a1c2a',
    railColor: '#a82434',
    woodColor: '#2b1115',
    cushionGlow: 'rgba(168, 36, 52, 0.35)',
    price: 400,
    isUnlocked: false,
  },
  {
    id: 'felt_midnight_black',
    name: 'Midnight Onyx',
    nameAr: 'العقيق الليلي الأسود',
    feltColor: '#1e2530',
    railColor: '#2d3748',
    woodColor: '#0a0d14',
    cushionGlow: 'rgba(45, 55, 72, 0.4)',
    price: 550,
    isUnlocked: false,
  },
  {
    id: 'felt_ocean_turquoise',
    name: 'Turquoise Azure Waves',
    nameAr: 'طاولة الأمواج الفيروزية الملكية',
    feltColor: '#0c4a56',
    railColor: '#0f766e',
    woodColor: '#112932',
    cushionGlow: 'rgba(20, 184, 166, 0.5)',
    price: 650,
    isUnlocked: false,
  },
  {
    id: 'felt_violet_dusk',
    name: 'Mystic Amethyst',
    nameAr: 'الجمشت البنفسجي الساحر',
    feltColor: '#4a1d6d',
    railColor: '#632891',
    woodColor: '#210d33',
    cushionGlow: 'rgba(99, 40, 145, 0.4)',
    price: 700,
    isUnlocked: false,
  },
  {
    id: 'felt_imperial_gold',
    name: 'Imperial Gold Cloth',
    nameAr: 'طاولة الذهب الملكي الإمبراطورية',
    feltColor: '#2d2817',
    railColor: '#b45309',
    woodColor: '#1c170d',
    cushionGlow: 'rgba(251, 191, 36, 0.5)',
    price: 950,
    isUnlocked: false,
  },
  {
    id: 'felt_cyber_neon',
    name: 'Cyber Neon Horizon',
    nameAr: 'طاولة سايبر المستقبل المتوهجة',
    feltColor: '#09182a',
    railColor: '#0284c7',
    woodColor: '#070f1a',
    cushionGlow: 'rgba(6, 182, 212, 0.6)',
    price: 1300,
    isUnlocked: false,
  },
  {
    id: 'felt_dragon_ruby',
    name: 'Dragonscale Ruby',
    nameAr: 'طاولة حراشف التنين الملكية',
    feltColor: '#5c0e18',
    railColor: '#991b1b',
    woodColor: '#1f0609',
    cushionGlow: 'rgba(239, 68, 68, 0.55)',
    price: 1800,
    isUnlocked: false,
  },
];

const STORAGE_KEY_V2 = 'cue_masters_pool_v2';
const STORAGE_KEY_V1 = 'cue_masters_pool_v1';

export class StorageManager {
  private static defaultData: UserSaveData = {
    version: 2,
    playerName: 'Emely',
    avatarIcon: 'player1',
    player2Name: 'Mike',
    player2Avatar: 'mike',
    nameFrame: 'frame_bronze',
    trailStyle: 'trail_classic',
    preferredDifficulty: 'medium',
    preferredRuleVariant: 'wpa_official',
    coins: 200,
    trophies: 1,
    gamesPlayed: 0,
    gamesWon: 0,
    foulsCount: 0,
    scratchesCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    challengesCompleted: 0,
    challengeStars: {},
    selectedCueId: 'cue_classic_wood',
    selectedTableFeltId: 'felt_classic_green',
    selectedBallStyleId: 'ball_style_classic',
    unlockedCues: ['cue_classic_wood'],
    unlockedFelts: ['felt_classic_green'],
    unlockedFrames: ['frame_bronze'],
    unlockedTrails: ['trail_classic'],
    unlockedBallStyles: ['ball_style_classic', 'ball_style_high_contrast'],
    customCueNames: {
      cue_classic_wood: 'The Standard',
    },
    activeTournamentCareer: null,
    matchHistory: [],
    language: 'ar',
    soundEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    dragSensitivity: 1.0,
    uiScale: 'normal',
    highContrastMode: false,
    reducedMotion: false,
    powerGaugePosition: 'left',
    viewMode: '2d',
    cameraPreset3D: 'angled',
    lastDailySpinTimestamp: 0,
    diagnosticLogs: [
      `[${new Date().toISOString()}] System initialized (v2 schema, Stage 6 2D/3D ready).`,
    ],
  };

  private static inMemoryStore: string | null = null;

  /**
   * Loads data with safe backward-compatible migration from v1 to v2,
   * plus auto-recovery if localStorage contains corrupted or partial JSON.
   */
  public static load(): UserSaveData {
    try {
      const storedV2 = typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_V2)
        : this.inMemoryStore;
      if (storedV2) {
        try {
          const parsed = JSON.parse(storedV2);
          if (parsed && typeof parsed === 'object') {
            return {
              ...this.defaultData,
              ...parsed,
              unlockedBallStyles: Array.isArray(parsed.unlockedBallStyles) && parsed.unlockedBallStyles.length > 0
                ? parsed.unlockedBallStyles
                : this.defaultData.unlockedBallStyles,
              diagnosticLogs: Array.isArray(parsed.diagnosticLogs)
                ? parsed.diagnosticLogs.slice(0, 30)
                : this.defaultData.diagnosticLogs,
              version: 2,
            };
          }
        } catch {
          // Corrupted v2 JSON - attempt graceful auto-recovery without wiping valid data silently
          console.warn('[StorageManager] Corrupted v2 save detected. Restoring safe defaults with recovery log.');
          const recovered: UserSaveData = {
            ...this.defaultData,
            diagnosticLogs: [
              `[${new Date().toISOString()}] Warning: Corrupted save data detected and auto-recovered safely.`,
            ],
          };
          this.save(recovered);
          return recovered;
        }
      }

      // Check and migrate from v1
      const storedV1 = localStorage.getItem(STORAGE_KEY_V1);
      if (storedV1) {
        try {
          const parsedV1 = JSON.parse(storedV1);
          const migrated: UserSaveData = {
            ...this.defaultData,
            ...parsedV1,
            version: 2,
            diagnosticLogs: [
              `[${new Date().toISOString()}] Migrated save from v1 to v2 successfully.`,
            ],
          };
          this.save(migrated);
          return migrated;
        } catch {
          // Ignore bad v1 data
        }
      }

      // First time initialization
      this.save(this.defaultData);
      return { ...this.defaultData };
    } catch {
      return { ...this.defaultData };
    }
  }

  public static save(data: UserSaveData): void {
    const serialized = JSON.stringify(data);
    if (typeof window === 'undefined') {
      this.inMemoryStore = serialized;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_V2, serialized);
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  public static resetProgress(): UserSaveData {
    const reset = { ...this.defaultData };
    this.save(reset);
    return reset;
  }

  public static addCoins(amount: number): UserSaveData {
    const data = this.load();
    data.coins = Math.max(0, data.coins + amount);
    this.save(data);
    return data;
  }

  /**
   * Checks if user has a free daily spin available (24-hour interval)
   */
  public static canSpinDaily(): boolean {
    const data = this.load();
    if (!data.lastDailySpinTimestamp) return true;
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    return now - data.lastDailySpinTimestamp >= TWENTY_FOUR_HOURS_MS;
  }

  /**
   * Returns milliseconds remaining until next free daily spin
   */
  public static getTimeUntilNextDailySpin(): number {
    const data = this.load();
    if (!data.lastDailySpinTimestamp) return 0;
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const diff = now - data.lastDailySpinTimestamp;
    return Math.max(0, TWENTY_FOUR_HOURS_MS - diff);
  }

  /**
   * Claims a prize from the daily lucky wheel
   */
  public static claimDailySpinReward(reward: {
    type: 'coins' | 'cue' | 'felt';
    value: number | string;
    name: string;
    nameAr: string;
  }): { updated: UserSaveData; rewardGranted: string; rewardGrantedAr: string } {
    const data = this.load();
    data.lastDailySpinTimestamp = Date.now();
    let grantMsg = '';
    let grantMsgAr = '';

    if (reward.type === 'coins') {
      const amount = Number(reward.value);
      data.coins += amount;
      grantMsg = `+${amount} Coins added to your balance!`;
      grantMsgAr = `تمت إضافة +${amount} عملة ذهبية إلى رصيدك!`;
    } else if (reward.type === 'cue') {
      const cueId = String(reward.value);
      if (data.unlockedCues.includes(cueId)) {
        // Fallback: If already unlocked, give 800 coins compensation!
        data.coins += 800;
        grantMsg = `You already own this cue! +800 Coins bonus compensation awarded!`;
        grantMsgAr = `أنت تمتلك هذه العصا بالفعل! تم منحك +800 عملة تعويضية!`;
      } else {
        data.unlockedCues.push(cueId);
        data.selectedCueId = cueId;
        grantMsg = `New Cue unlocked: ${reward.name}! Automatically equipped!`;
        grantMsgAr = `تم فتح عصا جديدة: ${reward.nameAr}! وتم تجهيزها بنجاح!`;
      }
    } else if (reward.type === 'felt') {
      const feltId = String(reward.value);
      if (data.unlockedFelts.includes(feltId)) {
        // Fallback: If already unlocked, give 1000 coins compensation!
        data.coins += 1000;
        grantMsg = `You already own this table! +1000 Coins bonus compensation awarded!`;
        grantMsgAr = `أنت تمتلك هذه الطاولة بالفعل! تم منحك +1000 عملة تعويضية!`;
      } else {
        data.unlockedFelts.push(feltId);
        data.selectedTableFeltId = feltId;
        grantMsg = `New Table Felt unlocked: ${reward.name}! Automatically equipped!`;
        grantMsgAr = `تم فتح طاولة جديدة: ${reward.nameAr}! وتم تجهيزها بنجاح!`;
      }
    }

    this.save(data);
    return { updated: data, rewardGranted: grantMsg, rewardGrantedAr: grantMsgAr };
  }

  /**
   * Safely deducts match stake before match begins.
   * Returns true if player had sufficient funds.
   */
  public static deductMatchStake(stake: number): { success: boolean; data: UserSaveData } {
    const data = this.load();
    if (stake <= 0) {
      return { success: true, data };
    }
    if (data.coins < stake) {
      return { success: false, data };
    }
    data.coins -= stake;
    this.save(data);
    return { success: true, data };
  }

  /**
   * Settle match stake at end of game
   */
  public static settleMatchStake(
    won: boolean,
    stake: number,
    details?: {
      mode: string;
      modeAr: string;
      opponent: string;
      score: string;
      fouls?: number;
      scratches?: number;
    }
  ): { updated: UserSaveData; netCoinsChange: number } {
    const data = this.load();
    data.gamesPlayed += 1;
    if (details?.fouls) data.foulsCount += details.fouls;
    if (details?.scratches) data.scratchesCount += details.scratches;

    let netChange = 0;
    if (won) {
      data.gamesWon += 1;
      data.currentStreak += 1;
      data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
      data.trophies += 1;
      if (stake > 0) {
        // Stake was already deducted upon entry. Total pot is stake * 2.
        // Winner receives full pot of stake * 2, so net gain is +stake.
        data.coins += stake * 2;
        netChange = stake;
      } else {
        // Free friendly match bonus
        data.coins += 30;
        netChange = 30;
      }
    } else {
      data.currentStreak = 0;
      if (stake > 0) {
        // Stake was already deducted upon entry.
        netChange = -stake;
      } else {
        // Free friendly loss consolation
        data.coins += 10;
        netChange = 10;
      }
    }

    if (details) {
      const historyItem: MatchHistoryItem = {
        id: `m_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        mode: details.mode,
        modeAr: details.modeAr,
        opponent: details.opponent,
        won,
        score: details.score,
      };
      data.matchHistory = [historyItem, ...(data.matchHistory || []).slice(0, 15)];
    }

    this.save(data);
    return { updated: data, netCoinsChange: netChange };
  }

  public static recordGameResult(
    won: boolean,
    details?: {
      mode: string;
      modeAr: string;
      opponent: string;
      score: string;
      fouls?: number;
      scratches?: number;
    }
  ): UserSaveData {
    const data = this.load();
    data.gamesPlayed += 1;
    if (details?.fouls) data.foulsCount += details.fouls;
    if (details?.scratches) data.scratchesCount += details.scratches;

    if (won) {
      data.gamesWon += 1;
      data.currentStreak += 1;
      data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
      data.trophies += 1;
      data.coins += 150;
    } else {
      data.currentStreak = 0;
      data.coins += 25;
    }

    // Add match history log
    if (details) {
      const historyItem: MatchHistoryItem = {
        id: `m_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        mode: details.mode,
        modeAr: details.modeAr,
        opponent: details.opponent,
        won,
        score: details.score,
      };
      data.matchHistory = [historyItem, ...(data.matchHistory || []).slice(0, 15)];
    }

    this.save(data);
    return data;
  }

  public static recordChallengeCompletion(challengeId: string, stars: number, coinReward: number): UserSaveData {
    const data = this.load();
    const prevStars = data.challengeStars[challengeId] || 0;
    if (stars > prevStars) {
      data.challengeStars[challengeId] = stars;
      if (prevStars === 0) {
        data.challengesCompleted += 1;
        data.coins += coinReward;
      }
    }
    this.save(data);
    return data;
  }

  public static saveTournamentCareer(matches: TournamentMatch[] | null): UserSaveData {
    const data = this.load();
    data.activeTournamentCareer = matches;
    this.save(data);
    return data;
  }

  public static renameCue(cueId: string, customName: string): UserSaveData {
    const data = this.load();
    data.customCueNames[cueId] = customName.trim();
    this.save(data);
    return data;
  }

  public static selectBallStyle(styleId: string): UserSaveData {
    const data = this.load();
    data.selectedBallStyleId = styleId;
    this.save(data);
    return data;
  }

  public static unlockBallStyle(styleId: string, price: number): UserSaveData {
    const data = this.load();
    if (data.coins >= price && !data.unlockedBallStyles.includes(styleId)) {
      data.coins -= price;
      data.unlockedBallStyles.push(styleId);
      data.selectedBallStyleId = styleId;
      this.save(data);
    }
    return data;
  }

  public static setViewMode(mode: TableViewMode): UserSaveData {
    const data = this.load();
    data.viewMode = mode;
    this.save(data);
    return data;
  }

  public static setCameraPreset3D(preset: 'angled' | 'top_perspective' | 'cue_behind'): UserSaveData {
    const data = this.load();
    data.cameraPreset3D = preset;
    this.save(data);
    return data;
  }

  public static logDiagnostic(message: string): UserSaveData {
    const data = this.load();
    const timestamp = new Date().toLocaleTimeString();
    const cleanMsg = `[${timestamp}] ${message.slice(0, 160)}`;
    data.diagnosticLogs = [cleanMsg, ...(data.diagnosticLogs || []).slice(0, 29)];
    this.save(data);
    return data;
  }

  public static exportSaveJSON(): string {
    const data = this.load();
    return JSON.stringify(data, null, 2);
  }

  public static importSaveJSON(jsonStr: string): { success: boolean; data?: UserSaveData; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Invalid JSON format' };
      }
      const restored: UserSaveData = {
        ...this.defaultData,
        ...parsed,
        version: 2,
        diagnosticLogs: [
          `[${new Date().toLocaleTimeString()}] Restored save data from user backup.`,
          ...(Array.isArray(parsed.diagnosticLogs) ? parsed.diagnosticLogs.slice(0, 28) : []),
        ],
      };
      this.save(restored);
      return { success: true, data: restored };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
}

