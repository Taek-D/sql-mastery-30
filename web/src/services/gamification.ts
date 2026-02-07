export interface LevelInfo {
  level: number;
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requiredXp: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
  totalXp: number;
  solvedProblems: Set<number>;
  perfectScores: Set<number>;
  hintsUsed: Set<number>;
  firstAttemptSolves: Set<number>;
  streak: number;
  longestStreak: number;
}

const LEVELS: LevelInfo[] = [
  { level: 1,  name: 'Bronze I',    tier: 'bronze',   requiredXp: 0 },
  { level: 2,  name: 'Bronze II',   tier: 'bronze',   requiredXp: 500 },
  { level: 3,  name: 'Bronze III',  tier: 'bronze',   requiredXp: 1200 },
  { level: 4,  name: 'Silver I',    tier: 'silver',   requiredXp: 2000 },
  { level: 5,  name: 'Silver II',   tier: 'silver',   requiredXp: 3000 },
  { level: 6,  name: 'Silver III',  tier: 'silver',   requiredXp: 4500 },
  { level: 7,  name: 'Gold I',      tier: 'gold',     requiredXp: 6000 },
  { level: 8,  name: 'Gold II',     tier: 'gold',     requiredXp: 8000 },
  { level: 9,  name: 'Gold III',    tier: 'gold',     requiredXp: 10000 },
  { level: 10, name: 'Platinum',    tier: 'platinum',  requiredXp: 12000 },
];

export const BADGES: Badge[] = [
  {
    id: 'first_query',
    name: '첫 쿼리',
    icon: '🚀',
    description: '첫 번째 문제를 풀었습니다',
    condition: (s) => s.solvedProblems.size >= 1,
  },
  {
    id: 'five_solved',
    name: '다섯 고개',
    icon: '🎯',
    description: '5개 문제를 풀었습니다',
    condition: (s) => s.solvedProblems.size >= 5,
  },
  {
    id: 'ten_solved',
    name: '열정의 10일',
    icon: '🔥',
    description: '10개 문제를 풀었습니다',
    condition: (s) => s.solvedProblems.size >= 10,
  },
  {
    id: 'twenty_solved',
    name: '숙련자',
    icon: '💎',
    description: '20개 문제를 풀었습니다',
    condition: (s) => s.solvedProblems.size >= 20,
  },
  {
    id: 'all_solved',
    name: '완전 정복',
    icon: '👑',
    description: '30개 문제를 모두 풀었습니다',
    condition: (s) => s.solvedProblems.size >= 30,
  },
  {
    id: 'perfectionist',
    name: '완벽주의자',
    icon: '✨',
    description: '10개 문제에서 만점을 받았습니다',
    condition: (s) => s.perfectScores.size >= 10,
  },
  {
    id: 'no_hints',
    name: '독학 천재',
    icon: '🧠',
    description: '힌트 없이 10개 문제를 풀었습니다',
    condition: (s) => {
      let noHintSolves = 0;
      for (const p of s.solvedProblems) {
        if (!s.hintsUsed.has(p)) noHintSolves++;
      }
      return noHintSolves >= 10;
    },
  },
  {
    id: 'first_try',
    name: '원샷 원킬',
    icon: '🎪',
    description: '5개 문제를 첫 시도에 풀었습니다',
    condition: (s) => s.firstAttemptSolves.size >= 5,
  },
];

export function getLevelInfo(xp: number): LevelInfo {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.requiredXp) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevelInfo(xp: number): LevelInfo | null {
  for (const level of LEVELS) {
    if (xp < level.requiredXp) {
      return level;
    }
  }
  return null;
}

export function getXpProgress(xp: number): { current: number; next: number; progress: number } {
  const currentLevel = getLevelInfo(xp);
  const nextLevel = getNextLevelInfo(xp);

  if (!nextLevel) {
    return { current: xp, next: xp, progress: 1 };
  }

  const currentBase = currentLevel.requiredXp;
  const nextRequired = nextLevel.requiredXp;
  const progress = (xp - currentBase) / (nextRequired - currentBase);

  return { current: xp - currentBase, next: nextRequired - currentBase, progress };
}

export type Difficulty = 'basic' | 'intermediate' | 'advanced';

export function calculateXp(
  difficulty: Difficulty,
  score: number,
  isFirstAttempt: boolean,
  usedHint: boolean,
): number {
  const baseXp: Record<Difficulty, number> = {
    basic: 100,
    intermediate: 200,
    advanced: 300,
  };

  let xp = baseXp[difficulty] * (score / 100);
  if (isFirstAttempt && score >= 80) xp += 50;
  if (usedHint) xp *= 0.7;

  return Math.round(xp);
}

export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: 'var(--bronze)',
    silver: 'var(--silver)',
    gold: 'var(--gold)',
    platinum: 'var(--platinum)',
  };
  return colors[tier] || 'var(--text-primary)';
}

export function checkNewBadges(stats: PlayerStats, earnedBadges: string[]): Badge[] {
  return BADGES.filter((b) => !earnedBadges.includes(b.id) && b.condition(stats));
}
