import { useState, useCallback, useEffect } from 'react';
import type { Difficulty, PlayerStats } from '../services/gamification';
import { calculateXp, checkNewBadges, type Badge } from '../services/gamification';

const STORAGE_KEY = 'sql-mastery-30-progress';

export interface ProblemProgress {
  solved: boolean;
  bestScore: number;
  attempts: number;
  usedHint: boolean;
  lastCode: string;
}

interface ProgressData {
  xp: number;
  problems: Record<number, ProblemProgress>;
  badges: string[];
  streak: number;
  longestStreak: number;
  lastPlayDate: string | null;
}

const defaultProgress: ProgressData = {
  xp: 0,
  problems: {},
  badges: [],
  streak: 0,
  longestStreak: 0,
  lastPlayDate: null,
};

function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultProgress };
    return JSON.parse(raw) as ProgressData;
  } catch {
    return { ...defaultProgress };
  }
}

function saveProgress(data: ProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressData>(loadProgress);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const getProblemProgress = useCallback(
    (dayNum: number): ProblemProgress | undefined => {
      return progress.problems[dayNum];
    },
    [progress],
  );

  const recordAttempt = useCallback(
    (
      dayNum: number,
      score: number,
      difficulty: Difficulty,
      code: string,
      usedHint: boolean,
    ): { xpGained: number; newBadges: Badge[] } => {
      const prev = progress.problems[dayNum];
      const isFirstAttempt = !prev || prev.attempts === 0;
      const wasSolved = prev?.solved ?? false;
      const prevBestScore = prev?.bestScore ?? 0;

      const xpGained =
        score >= 80 && !wasSolved
          ? calculateXp(difficulty, score, isFirstAttempt, usedHint)
          : 0;

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      let streak = progress.streak;
      let longestStreak = progress.longestStreak;
      if (progress.lastPlayDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (progress.lastPlayDate === yesterday) {
          streak += 1;
        } else if (progress.lastPlayDate !== today) {
          streak = 1;
        }
        longestStreak = Math.max(longestStreak, streak);
      }

      const newProblemProgress: ProblemProgress = {
        solved: wasSolved || score >= 80,
        bestScore: Math.max(prevBestScore, score),
        attempts: (prev?.attempts ?? 0) + 1,
        usedHint: (prev?.usedHint ?? false) || usedHint,
        lastCode: code,
      };

      const newProblems = { ...progress.problems, [dayNum]: newProblemProgress };

      // Build player stats for badge checking
      const solvedProblems = new Set<number>();
      const perfectScores = new Set<number>();
      const hintsUsed = new Set<number>();
      const firstAttemptSolves = new Set<number>();

      for (const [key, p] of Object.entries(newProblems)) {
        const num = Number(key);
        if (p.solved) solvedProblems.add(num);
        if (p.bestScore === 100) perfectScores.add(num);
        if (p.usedHint) hintsUsed.add(num);
        if (p.solved && p.attempts === 1) firstAttemptSolves.add(num);
      }

      const stats: PlayerStats = {
        totalXp: progress.xp + xpGained,
        solvedProblems,
        perfectScores,
        hintsUsed,
        firstAttemptSolves,
        streak,
        longestStreak,
      };

      const badges = checkNewBadges(stats, progress.badges);
      const newBadgeIds = [...progress.badges, ...badges.map((b) => b.id)];

      const newProgress: ProgressData = {
        xp: progress.xp + xpGained,
        problems: newProblems,
        badges: newBadgeIds,
        streak,
        longestStreak,
        lastPlayDate: today,
      };

      setProgress(newProgress);
      if (badges.length > 0) {
        setNewBadges(badges);
      }

      return { xpGained, newBadges: badges };
    },
    [progress],
  );

  const saveCode = useCallback(
    (dayNum: number, code: string) => {
      const prev = progress.problems[dayNum];
      setProgress({
        ...progress,
        problems: {
          ...progress.problems,
          [dayNum]: {
            solved: prev?.solved ?? false,
            bestScore: prev?.bestScore ?? 0,
            attempts: prev?.attempts ?? 0,
            usedHint: prev?.usedHint ?? false,
            lastCode: code,
          },
        },
      });
    },
    [progress],
  );

  const markHintUsed = useCallback(
    (dayNum: number) => {
      const prev = progress.problems[dayNum];
      setProgress({
        ...progress,
        problems: {
          ...progress.problems,
          [dayNum]: {
            solved: prev?.solved ?? false,
            bestScore: prev?.bestScore ?? 0,
            attempts: prev?.attempts ?? 0,
            usedHint: true,
            lastCode: prev?.lastCode ?? '',
          },
        },
      });
    },
    [progress],
  );

  const clearNewBadges = useCallback(() => {
    setNewBadges([]);
  }, []);

  const totalSolved = Object.values(progress.problems).filter((p) => p.solved).length;

  return {
    xp: progress.xp,
    badges: progress.badges,
    totalSolved,
    streak: progress.streak,
    getProblemProgress,
    recordAttempt,
    saveCode,
    markHintUsed,
    newBadges,
    clearNewBadges,
  };
}
