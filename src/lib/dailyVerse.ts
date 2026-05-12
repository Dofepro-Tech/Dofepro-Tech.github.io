import type { Verse } from '@/src/types';
import { getDeterministicIndex, getLocalDateKey } from '@/src/lib/challenges';
import type { AppLanguage } from '@/src/lib/language';

interface DailyVerseEntry {
  id: string;
  bookAbrev: string;
  chapter: number;
  verseNumber: number;
  labelEs: string;
  labelEn: string;
  textEs: string;
  textEn: string;
}

export interface DailyVerseSelection {
  id: string;
  bookAbrev: string;
  chapter: number;
  verse: Verse;
  label: string;
}

const DAILY_VERSE_HISTORY_KEY = 'biblia-nj-startup-verse-history';
const RECENT_VERSE_MEMORY = 4;

function mapDailyVerseEntry(entry: DailyVerseEntry, language: AppLanguage): DailyVerseSelection {
  return {
    id: entry.id,
    bookAbrev: entry.bookAbrev,
    chapter: entry.chapter,
    label: language === 'en' ? entry.labelEn : entry.labelEs,
    verse: {
      id: entry.verseNumber,
      number: entry.verseNumber,
      verse: language === 'en' ? entry.textEn : entry.textEs,
    },
  };
}

function readRecentVerseIds() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const rawHistory = window.localStorage.getItem(DAILY_VERSE_HISTORY_KEY);
    if (!rawHistory) {
      return [];
    }

    const parsedHistory = JSON.parse(rawHistory);
    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

function writeRecentVerseIds(nextHistory: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DAILY_VERSE_HISTORY_KEY, JSON.stringify(nextHistory));
  } catch {
    // Ignore storage failures and fall back to in-memory randomness.
  }
}

export function getRandomVerseId() {
  const recentVerseIds = readRecentVerseIds();
  const visibleHistory = recentVerseIds.slice(0, Math.min(RECENT_VERSE_MEMORY, Math.max(1, DAILY_VERSES.length - 1)));
  const availableVerses = DAILY_VERSES.filter((entry) => !visibleHistory.includes(entry.id));
  const selectionPool = availableVerses.length > 0
    ? availableVerses
    : DAILY_VERSES.filter((entry) => entry.id !== recentVerseIds[0]);
  const finalPool = selectionPool.length > 0 ? selectionPool : DAILY_VERSES;
  const randomIndex = Math.floor(Math.random() * finalPool.length);
  const selectedVerseId = finalPool[randomIndex]?.id ?? DAILY_VERSES[0].id;
  const nextHistory = [selectedVerseId, ...recentVerseIds.filter((id) => id !== selectedVerseId)]
    .slice(0, Math.min(RECENT_VERSE_MEMORY, DAILY_VERSES.length));

  writeRecentVerseIds(nextHistory);

  return selectedVerseId;
}

export function getVerseById(id: string, language: AppLanguage): DailyVerseSelection {
  const entry = DAILY_VERSES.find((candidate) => candidate.id === id) ?? DAILY_VERSES[0];
  return mapDailyVerseEntry(entry, language);
}

const DAILY_VERSES: DailyVerseEntry[] = [
  {
    id: 'jn-14-27',
    bookAbrev: 'JN',
    chapter: 14,
    verseNumber: 27,
    labelEs: 'Juan 14:27',
    labelEn: 'John 14:27',
    textEs: 'La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.',
    textEn: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.',
  },
  {
    id: 'sal-119-105',
    bookAbrev: 'SAL',
    chapter: 119,
    verseNumber: 105,
    labelEs: 'Salmo 119:105',
    labelEn: 'Psalm 119:105',
    textEs: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.',
    textEn: 'Thy word is a lamp unto my feet, and a light unto my path.',
  },
  {
    id: 'jer-29-11',
    bookAbrev: 'JER',
    chapter: 29,
    verseNumber: 11,
    labelEs: 'Jeremías 29:11',
    labelEn: 'Jeremiah 29:11',
    textEs: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
    textEn: 'For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.',
  },
  {
    id: 'ro-8-28',
    bookAbrev: 'RO',
    chapter: 8,
    verseNumber: 28,
    labelEs: 'Romanos 8:28',
    labelEn: 'Romans 8:28',
    textEs: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.',
    textEn: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
  },
  {
    id: 'fil-4-13',
    bookAbrev: 'FIL',
    chapter: 4,
    verseNumber: 13,
    labelEs: 'Filipenses 4:13',
    labelEn: 'Philippians 4:13',
    textEs: 'Todo lo puedo en Cristo que me fortalece.',
    textEn: 'I can do all things through Christ which strengtheneth me.',
  },
  {
    id: 'mt-11-28',
    bookAbrev: 'MT',
    chapter: 11,
    verseNumber: 28,
    labelEs: 'Mateo 11:28',
    labelEn: 'Matthew 11:28',
    textEs: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.',
    textEn: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
  },
  {
    id: '2co-12-9',
    bookAbrev: '2CO',
    chapter: 12,
    verseNumber: 9,
    labelEs: '2 Corintios 12:9',
    labelEn: '2 Corinthians 12:9',
    textEs: 'Y me ha dicho: Bástate mi gracia; porque mi poder se perfecciona en la debilidad. Por tanto, de buena gana me gloriaré más bien en mis debilidades, para que repose sobre mí el poder de Cristo.',
    textEn: 'And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness. Most gladly therefore will I rather glory in my infirmities, that the power of Christ may rest upon me.',
  },
  {
    id: 'jos-1-9',
    bookAbrev: 'JOS',
    chapter: 1,
    verseNumber: 9,
    labelEs: 'Josué 1:9',
    labelEn: 'Joshua 1:9',
    textEs: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.',
    textEn: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.',
  },
];

export function getDailyVerse(language: AppLanguage): DailyVerseSelection {
  const dateKey = getLocalDateKey();
  const entry = DAILY_VERSES[getDeterministicIndex(DAILY_VERSES.length, `${dateKey}-${language}-daily-verse`)];

  return mapDailyVerseEntry(entry, language);
}