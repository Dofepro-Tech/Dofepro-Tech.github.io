import type { DailyChallengeTaskId } from '@/src/types';

export const DAILY_TASK_POINTS: Record<DailyChallengeTaskId, number> = {
  open_daily_verse: 15,
  listen_daily_verse: 10,
  pray_daily_verse: 20,
};

export const ACTIVITY_POINTS = {
  chapterRead: 6,
  verseFocus: 2,
  search: 3,
  bookmark: 4,
} as const;

export const WEEKLY_GOALS = [
  { id: 'daily_actions', labelKey: 'app.weekly_goal_daily', target: 5, rewardPoints: 35 },
  { id: 'chapters', labelKey: 'app.weekly_goal_chapters', target: 5, rewardPoints: 30 },
  { id: 'searches', labelKey: 'app.weekly_goal_searches', target: 3, rewardPoints: 18 },
  { id: 'bookmarks', labelKey: 'app.weekly_goal_bookmarks', target: 2, rewardPoints: 15 },
] as const;

export const READING_GOALS = [
  { id: 'reading_chapters', labelKey: 'app.reading_goal_chapters', target: 7, rewardPoints: 25 },
  { id: 'reading_verses', labelKey: 'app.reading_goal_verses', target: 12, rewardPoints: 20 },
] as const;

export function getLocalDateKey(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekKey(date: Date = new Date()) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const dayIndex = (normalized.getDay() + 6) % 7;
  normalized.setDate(normalized.getDate() - dayIndex);
  return getLocalDateKey(normalized);
}

export function getPreviousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
}

export function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getDeterministicIndex(length: number, seed: string) {
  if (length <= 0) {
    return 0;
  }

  return hashString(seed) % length;
}