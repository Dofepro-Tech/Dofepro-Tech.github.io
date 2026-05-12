import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTIVITY_POINTS,
  DAILY_TASK_POINTS,
  getLocalDateKey,
  getPreviousDateKey,
  getWeekKey,
  READING_GOALS,
  WEEKLY_GOALS,
} from '@/src/lib/challenges';
import type {
  ChallengeGoalProgress,
  DailyChallengeTaskId,
  ReadingChallengeState,
  ReadingChallengeSummary,
} from '@/src/types';

const STORAGE_KEY = 'bible_reading_challenges';

function canUseBrowserStorage() {
  return typeof window !== 'undefined';
}

function createInitialState(now: Date = new Date()): ReadingChallengeState {
  return {
    streak: 0,
    totalCompletedTasks: 0,
    totalRewardPoints: 0,
    lastCompletedDateKey: null,
    daily: {
      dateKey: getLocalDateKey(now),
      completedTaskIds: [],
    },
    weekly: {
      weekKey: getWeekKey(now),
      chapterRefs: [],
      verseRefs: [],
      searchTerms: [],
      bookmarkRefs: [],
      dailyTaskCount: 0,
      awardedRewardIds: [],
    },
  };
}

function normalizeState(state: ReadingChallengeState, now: Date = new Date()): ReadingChallengeState {
  const fallbackState = createInitialState(now);
  const todayKey = getLocalDateKey(now);
  const weekKey = getWeekKey(now);

  return {
    streak: Number.isFinite(state?.streak) ? state.streak : fallbackState.streak,
    totalCompletedTasks: Number.isFinite(state?.totalCompletedTasks) ? state.totalCompletedTasks : fallbackState.totalCompletedTasks,
    totalRewardPoints: Number.isFinite(state?.totalRewardPoints) ? state.totalRewardPoints : fallbackState.totalRewardPoints,
    lastCompletedDateKey: typeof state?.lastCompletedDateKey === 'string' ? state.lastCompletedDateKey : null,
    daily: {
      dateKey: state?.daily?.dateKey === todayKey ? todayKey : todayKey,
      completedTaskIds: state?.daily?.dateKey === todayKey && Array.isArray(state?.daily?.completedTaskIds)
        ? state.daily.completedTaskIds
        : [],
    },
    weekly: {
      weekKey,
      chapterRefs: state?.weekly?.weekKey === weekKey && Array.isArray(state?.weekly?.chapterRefs) ? state.weekly.chapterRefs : [],
      verseRefs: state?.weekly?.weekKey === weekKey && Array.isArray(state?.weekly?.verseRefs) ? state.weekly.verseRefs : [],
      searchTerms: state?.weekly?.weekKey === weekKey && Array.isArray(state?.weekly?.searchTerms) ? state.weekly.searchTerms : [],
      bookmarkRefs: state?.weekly?.weekKey === weekKey && Array.isArray(state?.weekly?.bookmarkRefs) ? state.weekly.bookmarkRefs : [],
      dailyTaskCount: state?.weekly?.weekKey === weekKey && Number.isFinite(state?.weekly?.dailyTaskCount) ? state.weekly.dailyTaskCount : 0,
      awardedRewardIds: state?.weekly?.weekKey === weekKey && Array.isArray(state?.weekly?.awardedRewardIds) ? state.weekly.awardedRewardIds : [],
    },
  };
}

function readStoredState() {
  if (!canUseBrowserStorage()) {
    return createInitialState();
  }

  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return createInitialState();
  }

  try {
    const parsedValue = JSON.parse(rawValue) as ReadingChallengeState;
    return normalizeState(parsedValue);
  } catch {
    return createInitialState();
  }
}

function awardIfReached(state: ReadingChallengeState, id: string, rewardPoints: number, reached: boolean) {
  if (!reached || state.weekly.awardedRewardIds.includes(id)) {
    return state;
  }

  return {
    ...state,
    totalRewardPoints: state.totalRewardPoints + rewardPoints,
    weekly: {
      ...state.weekly,
      awardedRewardIds: [...state.weekly.awardedRewardIds, id],
    },
  };
}

function awardWeeklyMilestones(state: ReadingChallengeState) {
  let nextState = state;

  nextState = awardIfReached(
    nextState,
    'daily_actions',
    WEEKLY_GOALS[0].rewardPoints,
    nextState.weekly.dailyTaskCount >= WEEKLY_GOALS[0].target,
  );

  nextState = awardIfReached(
    nextState,
    'chapters',
    WEEKLY_GOALS[1].rewardPoints,
    nextState.weekly.chapterRefs.length >= WEEKLY_GOALS[1].target,
  );

  nextState = awardIfReached(
    nextState,
    'searches',
    WEEKLY_GOALS[2].rewardPoints,
    nextState.weekly.searchTerms.length >= WEEKLY_GOALS[2].target,
  );

  nextState = awardIfReached(
    nextState,
    'bookmarks',
    WEEKLY_GOALS[3].rewardPoints,
    nextState.weekly.bookmarkRefs.length >= WEEKLY_GOALS[3].target,
  );

  nextState = awardIfReached(
    nextState,
    'reading_chapters',
    READING_GOALS[0].rewardPoints,
    nextState.weekly.chapterRefs.length >= READING_GOALS[0].target,
  );

  nextState = awardIfReached(
    nextState,
    'reading_verses',
    READING_GOALS[1].rewardPoints,
    nextState.weekly.verseRefs.length >= READING_GOALS[1].target,
  );

  return nextState;
}

function buildGoal(label: string, id: string, progress: number, target: number, rewardPoints: number): ChallengeGoalProgress {
  return {
    id,
    label,
    progress,
    target,
    rewardPoints,
    completed: progress >= target,
  };
}

export function useReadingChallenges() {
  const { t } = useTranslation();
  const [challengeState, setChallengeState] = useState(readStoredState);

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(challengeState));
  }, [challengeState]);

  const updateState = useCallback((updater: (state: ReadingChallengeState) => ReadingChallengeState) => {
    setChallengeState((previousState) => updater(normalizeState(previousState)));
  }, []);

  const completeDailyTask = useCallback((taskId: DailyChallengeTaskId) => {
    updateState((previousState) => {
      if (previousState.daily.completedTaskIds.includes(taskId)) {
        return previousState;
      }

      const todayKey = previousState.daily.dateKey;
      const isFirstCompletionToday = previousState.lastCompletedDateKey !== todayKey;
      const nextStreak = !isFirstCompletionToday
        ? previousState.streak
        : previousState.lastCompletedDateKey === getPreviousDateKey(todayKey)
          ? previousState.streak + 1
          : 1;

      const nextState: ReadingChallengeState = {
        ...previousState,
        streak: nextStreak,
        totalCompletedTasks: previousState.totalCompletedTasks + 1,
        totalRewardPoints: previousState.totalRewardPoints + DAILY_TASK_POINTS[taskId],
        lastCompletedDateKey: todayKey,
        daily: {
          ...previousState.daily,
          completedTaskIds: [...previousState.daily.completedTaskIds, taskId],
        },
        weekly: {
          ...previousState.weekly,
          dailyTaskCount: previousState.weekly.dailyTaskCount + 1,
        },
      };

      return awardWeeklyMilestones(nextState);
    });
  }, [updateState]);

  const trackChapterRead = useCallback((bookAbrev: string, chapter: number) => {
    const chapterRef = `${bookAbrev}-${chapter}`;

    updateState((previousState) => {
      if (previousState.weekly.chapterRefs.includes(chapterRef)) {
        return previousState;
      }

      return awardWeeklyMilestones({
        ...previousState,
        totalRewardPoints: previousState.totalRewardPoints + ACTIVITY_POINTS.chapterRead,
        weekly: {
          ...previousState.weekly,
          chapterRefs: [...previousState.weekly.chapterRefs, chapterRef],
        },
      });
    });
  }, [updateState]);

  const trackVerseFocus = useCallback((bookAbrev: string, chapter: number, verseNumber: number) => {
    const verseRef = `${bookAbrev}-${chapter}-${verseNumber}`;

    updateState((previousState) => {
      if (previousState.weekly.verseRefs.includes(verseRef)) {
        return previousState;
      }

      return awardWeeklyMilestones({
        ...previousState,
        totalRewardPoints: previousState.totalRewardPoints + ACTIVITY_POINTS.verseFocus,
        weekly: {
          ...previousState.weekly,
          verseRefs: [...previousState.weekly.verseRefs, verseRef],
        },
      });
    });
  }, [updateState]);

  const trackSearchQuery = useCallback((query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return;
    }

    updateState((previousState) => {
      if (previousState.weekly.searchTerms.includes(normalizedQuery)) {
        return previousState;
      }

      return awardWeeklyMilestones({
        ...previousState,
        totalRewardPoints: previousState.totalRewardPoints + ACTIVITY_POINTS.search,
        weekly: {
          ...previousState.weekly,
          searchTerms: [...previousState.weekly.searchTerms, normalizedQuery],
        },
      });
    });
  }, [updateState]);

  const trackBookmarkSaved = useCallback((bookAbrev: string, chapter: number, verseNumber?: number) => {
    const bookmarkRef = `${bookAbrev}-${chapter}${verseNumber ? `-${verseNumber}` : ''}`;

    updateState((previousState) => {
      if (previousState.weekly.bookmarkRefs.includes(bookmarkRef)) {
        return previousState;
      }

      return awardWeeklyMilestones({
        ...previousState,
        totalRewardPoints: previousState.totalRewardPoints + ACTIVITY_POINTS.bookmark,
        weekly: {
          ...previousState.weekly,
          bookmarkRefs: [...previousState.weekly.bookmarkRefs, bookmarkRef],
        },
      });
    });
  }, [updateState]);

  const challengeSummary = useMemo<ReadingChallengeSummary>(() => {
    const normalizedState = normalizeState(challengeState);

    return {
      streak: normalizedState.streak,
      completedToday: normalizedState.daily.completedTaskIds.length,
      totalDailyTasks: Object.keys(DAILY_TASK_POINTS).length,
      totalRewardPoints: normalizedState.totalRewardPoints,
      todayCompletedTaskIds: normalizedState.daily.completedTaskIds,
      weeklyGoals: [
        buildGoal(t(WEEKLY_GOALS[0].labelKey), WEEKLY_GOALS[0].id, normalizedState.weekly.dailyTaskCount, WEEKLY_GOALS[0].target, WEEKLY_GOALS[0].rewardPoints),
        buildGoal(t(WEEKLY_GOALS[1].labelKey), WEEKLY_GOALS[1].id, normalizedState.weekly.chapterRefs.length, WEEKLY_GOALS[1].target, WEEKLY_GOALS[1].rewardPoints),
        buildGoal(t(WEEKLY_GOALS[2].labelKey), WEEKLY_GOALS[2].id, normalizedState.weekly.searchTerms.length, WEEKLY_GOALS[2].target, WEEKLY_GOALS[2].rewardPoints),
        buildGoal(t(WEEKLY_GOALS[3].labelKey), WEEKLY_GOALS[3].id, normalizedState.weekly.bookmarkRefs.length, WEEKLY_GOALS[3].target, WEEKLY_GOALS[3].rewardPoints),
      ],
      readingGoals: [
        buildGoal(t(READING_GOALS[0].labelKey), READING_GOALS[0].id, normalizedState.weekly.chapterRefs.length, READING_GOALS[0].target, READING_GOALS[0].rewardPoints),
        buildGoal(t(READING_GOALS[1].labelKey), READING_GOALS[1].id, normalizedState.weekly.verseRefs.length, READING_GOALS[1].target, READING_GOALS[1].rewardPoints),
      ],
    };
  }, [challengeState, t]);

  return {
    challengeSummary,
    completeDailyTask,
    trackChapterRead,
    trackVerseFocus,
    trackSearchQuery,
    trackBookmarkSaved,
  };
}