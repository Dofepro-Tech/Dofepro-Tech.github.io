import type { Verse } from '@/src/types';
import { getDeterministicIndex, getLocalDateKey } from '@/src/lib/challenges';
import { FALLBACK_BIBLE_BOOKS } from '@/src/lib/fallbackBooks';
import type { AppLanguage } from '@/src/lib/language';
import { fetchChapter } from '@/src/services/bibleApi';

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

const DAILY_VERSE_CACHE_PREFIX = 'biblia-nj-daily-verse-cache';

const DAILY_CHAPTER_POOL = FALLBACK_BIBLE_BOOKS.flatMap((book) => Array.from(
  { length: book.chapters },
  (_, index) => ({
    book,
    chapter: index + 1,
  }),
));

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

function getDailyVerseCacheKey(language: AppLanguage) {
  return `${DAILY_VERSE_CACHE_PREFIX}:${getLocalDateKey()}:${language}`;
}

function isDailyVerseSelection(value: unknown): value is DailyVerseSelection {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DailyVerseSelection> & { verse?: Partial<Verse> };
  return typeof candidate.id === 'string'
    && typeof candidate.bookAbrev === 'string'
    && typeof candidate.chapter === 'number'
    && typeof candidate.label === 'string'
    && !!candidate.verse
    && typeof candidate.verse.number === 'number'
    && typeof candidate.verse.verse === 'string';
}

function readCachedDailyVerse(language: AppLanguage) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(getDailyVerseCacheKey(language));
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!isDailyVerseSelection(parsedValue)) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function writeCachedDailyVerse(language: AppLanguage, selection: DailyVerseSelection) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getDailyVerseCacheKey(language), JSON.stringify(selection));
  } catch {
    // Ignore storage failures and fall back to the bundled verse list.
  }
}

function getBundledDailyVerse(language: AppLanguage): DailyVerseSelection {
  const dateKey = getLocalDateKey();
  const entry = DAILY_VERSES[getDeterministicIndex(DAILY_VERSES.length, `${dateKey}-bundled-daily-verse`)];

  return mapDailyVerseEntry(entry, language);
}

function buildDailyVerseLabel(bookName: string, chapter: number, verseNumber: number) {
  return `${bookName} ${chapter}:${verseNumber}`;
}

async function resolveWholeBibleDailyVerse(language: AppLanguage): Promise<DailyVerseSelection> {
  const dateKey = getLocalDateKey();
  const chapterEntry = DAILY_CHAPTER_POOL[
    getDeterministicIndex(DAILY_CHAPTER_POOL.length, `${dateKey}-whole-bible-daily-chapter`)
  ];

  if (!chapterEntry) {
    return getBundledDailyVerse(language);
  }

  const chapterData = await fetchChapter(chapterEntry.book.names[0], chapterEntry.chapter, language);
  const availableVerses = chapterData.vers.filter((verse) => verse.number > 0 && verse.verse.trim().length > 0);
  const selectedVerse = availableVerses[
    getDeterministicIndex(availableVerses.length, `${dateKey}-${chapterEntry.book.abrev}-${chapterEntry.chapter}-whole-bible-daily-verse`)
  ] ?? availableVerses[0];

  if (!selectedVerse) {
    return getBundledDailyVerse(language);
  }

  return {
    id: `daily-${dateKey}-${chapterEntry.book.abrev}-${chapterEntry.chapter}-${selectedVerse.number}`,
    bookAbrev: chapterEntry.book.abrev,
    chapter: chapterEntry.chapter,
    label: buildDailyVerseLabel(chapterData.name, chapterEntry.chapter, selectedVerse.number),
    verse: {
      id: selectedVerse.id,
      number: selectedVerse.number,
      study: selectedVerse.study,
      verse: selectedVerse.verse,
    },
  };
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
  return readCachedDailyVerse(language) ?? getBundledDailyVerse(language);
}

export async function hydrateDailyVerse(language: AppLanguage): Promise<DailyVerseSelection> {
  const cachedVerse = readCachedDailyVerse(language);
  if (cachedVerse) {
    return cachedVerse;
  }

  try {
    const selection = await resolveWholeBibleDailyVerse(language);
    writeCachedDailyVerse(language, selection);
    return selection;
  } catch {
    return getBundledDailyVerse(language);
  }
}