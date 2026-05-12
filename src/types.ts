export interface Book {
  names: string[];
  abrev: string;
  chapters: number;
  testament: string;
}

export type SidebarBookFilter = 'all' | 'old' | 'new';

export interface Verse {
  id: number;
  number: number;
  study?: string; /* Title for a section if exists */
  verse: string;
}

export interface ChapterData {
  testament: string;
  name: string;
  num_chapters: number;
  chapter: number;
  vers: Verse[];
}

export interface BibleSearchResult {
  id: string;
  bookAbrev: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
  verseText: string;
}

export interface BibleSearchResponse {
  query: string;
  total: number;
  results: BibleSearchResult[];
  truncated: boolean;
}

export interface AiModelOption {
  id: string;
  label: string;
  provider: 'openrouter' | 'gemini';
  description: string;
  recommendedFor: string;
}

export interface AiRuntimeConfig {
  provider: 'openrouter' | 'gemini';
  currentModel: string;
  overrideAllowed: boolean;
  availableModels: AiModelOption[];
}

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export interface Highlight {
  verseId: string; // book.abrev + chapter + verse.number
  color: string;
}

export interface Bookmark {
  id: string;
  bookAbrev: string;
  chapter: number;
  verseNumber?: number;
  label: string;
  createdAt: number;
}

export type DailyChallengeTaskId = 'open_daily_verse' | 'listen_daily_verse' | 'pray_daily_verse';

export interface DailyChallengeProgress {
  dateKey: string;
  completedTaskIds: DailyChallengeTaskId[];
}

export interface WeeklyChallengeProgress {
  weekKey: string;
  chapterRefs: string[];
  verseRefs: string[];
  searchTerms: string[];
  bookmarkRefs: string[];
  dailyTaskCount: number;
  awardedRewardIds: string[];
}

export interface ReadingChallengeState {
  streak: number;
  totalCompletedTasks: number;
  totalRewardPoints: number;
  lastCompletedDateKey: string | null;
  daily: DailyChallengeProgress;
  weekly: WeeklyChallengeProgress;
}

export interface ChallengeGoalProgress {
  id: string;
  label: string;
  progress: number;
  target: number;
  rewardPoints: number;
  completed: boolean;
}

export interface ReadingChallengeSummary {
  streak: number;
  completedToday: number;
  totalDailyTasks: number;
  totalRewardPoints: number;
  todayCompletedTaskIds: DailyChallengeTaskId[];
  weeklyGoals: ChallengeGoalProgress[];
  readingGoals: ChallengeGoalProgress[];
}

export interface StudySession {
  id: string;
  type: 'book' | 'theme';
  target: string; // Book name or theme string
  currentStep: number;
  steps: StudyStep[];
}

export interface StudyStep {
  title: string;
  content: string;
  prompt: string;
  verseReference?: {
    bookAbrev: string;
    chapter: number;
    verseNumber: number;
  };
}
