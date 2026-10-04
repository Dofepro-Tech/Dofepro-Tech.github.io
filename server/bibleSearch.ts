import { getBibleVersion, normalizeAppLanguage } from '../src/lib/language.ts';
import type { BibleSearchResponse, BibleSearchResult, Book, ChapterData } from '../src/types.ts';
import { FALLBACK_BIBLE_BOOKS } from '../src/lib/fallbackBooks.ts';

const BASE_URL = 'https://bible-api.deno.dev/api';
const API_BIBLE_BASE_URL = 'https://rest.api.bible/v1';
const DEFAULT_RESULT_LIMIT = 60;
const CHAPTER_CONCURRENCY = 6;
const RVR1909_USX_BASE_URL = 'https://raw.githubusercontent.com/BibleAquifer/ReinaValera1909/main/spa/usx';
const RVR1909_BOOK_CODES = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

const booksCache = new Map<string, Promise<Book[]>>();
const chapterCache = new Map<string, Promise<ChapterData>>();
const searchCache = new Map<string, Promise<BibleSearchResponse>>();
const rvr1909BookCache = new Map<string, Promise<string>>();

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function fetchBooks() {
  const cacheKey = 'books';

  if (!booksCache.has(cacheKey)) {
    booksCache.set(cacheKey, (async () => {
      try {
        const response = await fetch(`${BASE_URL}/books`);
        if (!response.ok) {
          throw new Error('Failed to fetch books for Bible search.');
        }

        return await response.json() as Book[];
      } catch (error) {
        console.warn('Using bundled Bible catalog for search.', error);
        return FALLBACK_BIBLE_BOOKS;
      }
    })().catch((error) => {
      chapterCache.delete(cacheKey);
      throw error;
    }));
  }

  return booksCache.get(cacheKey)!;
}

async function fetchChapter(bookName: string, chapter: number, language: string) {
  const version = getBibleVersion(language);
  const cacheKey = `${version}:${bookName}:${chapter}`;

  if (!chapterCache.has(cacheKey)) {
    chapterCache.set(cacheKey, (async () => {
      try {
        const response = await fetch(`${BASE_URL}/read/${version}/${encodeURIComponent(bookName)}/${chapter}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch chapter ${bookName} ${chapter} for Bible search.`);
        }

        return await response.json() as ChapterData;
      } catch (error) {
        if (normalizeAppLanguage(language) !== 'es') {
          throw error;
        }

        const book = FALLBACK_BIBLE_BOOKS.find((candidate) => candidate.names.includes(bookName));
        const bookIndex = book ? FALLBACK_BIBLE_BOOKS.indexOf(book) : -1;
        const bookCode = RVR1909_BOOK_CODES[bookIndex];
        if (bookIndex < 0 || !bookCode) {
          throw error;
        }

        const bookFile = `${String(bookIndex + 1).padStart(2, '0')}${bookCode}`;
        if (!rvr1909BookCache.has(bookFile)) {
          rvr1909BookCache.set(bookFile, (async () => {
            const source = await fetch(`${RVR1909_USX_BASE_URL}/${bookFile}RV09.usx`);
            if (!source.ok) {
              throw new Error(`RVR1909 source returned ${source.status}.`);
            }
            return source.text();
          })().catch((sourceError) => {
            rvr1909BookCache.delete(bookFile);
            throw sourceError;
          }));
        }

        const usx = await rvr1909BookCache.get(bookFile)!;
        const chapterStart = new RegExp(`<chapter\\s+number="${chapter}"[^>]*\\/?>`, 'i');
        const startMatch = chapterStart.exec(usx);
        if (!startMatch || startMatch.index === undefined) {
          throw new Error(`RVR1909 chapter ${chapter} was not found.`);
        }

        const chapterContent = usx.slice(startMatch.index + startMatch[0].length);
        const nextChapterIndex = chapterContent.search(/<chapter\s+number="\d+"[^>]*\/>/i);
        const chapterUsx = nextChapterIndex >= 0 ? chapterContent.slice(0, nextChapterIndex) : chapterContent;
        const verseMatches = Array.from(chapterUsx.matchAll(/<verse\s+number="(\d+)"[^>]*\/>/gi));
        const vers = verseMatches.map((match, index) => {
          const contentStart = (match.index ?? 0) + match[0].length;
          const contentEnd = index + 1 < verseMatches.length ? verseMatches[index + 1].index ?? chapterUsx.length : chapterUsx.length;
          const verse = chapterUsx.slice(contentStart, contentEnd)
            .replace(/<note[\s\S]*?<\/note>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
          return { id: Number(match[1]), number: Number(match[1]), verse };
        }).filter((verse) => verse.verse);

        if (vers.length === 0) {
          throw new Error(`RVR1909 chapter ${chapter} has no verses.`);
        }

        return { testament: '', name: bookName, num_chapters: book?.chapters ?? 0, chapter, vers };
      }
    })());
  }

  return chapterCache.get(cacheKey)!;
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let currentIndex = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const indexToProcess = currentIndex;
      currentIndex += 1;
      await worker(items[indexToProcess]);
    }
  });

  await Promise.all(runners);
}

export async function searchBible(query: string, language: string, limit: number = DEFAULT_RESULT_LIMIT, offset = 0): Promise<BibleSearchResponse> {
  const normalizedLanguage = normalizeAppLanguage(language);
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const safeOffset = Math.max(0, Math.floor(offset));

  if (normalizedQuery.length < 2) {
    return {
      query: trimmedQuery,
      total: 0,
      results: [],
      truncated: false,
    };
  }

  const apiKey = process.env.BIBLE_API_KEY;
  const spanishBibleId = process.env.BIBLE_API_ES_BIBLE_ID;
  if (normalizedLanguage === 'es' && apiKey && spanishBibleId) {
    try {
      return await searchApiBibleRvr1960(trimmedQuery, apiKey, spanishBibleId, safeLimit, safeOffset);
    } catch (error) {
      console.warn('API.Bible search failed; falling back to the bundled-source scan.', error);
    }
  }

  const cacheKey = `${normalizedLanguage}:${normalizedQuery}`;

  if (!searchCache.has(cacheKey)) {
    const searchPromise = (async () => {
    const books = await fetchBooks();
    const searchJobs = books.flatMap((book, bookIndex) => {
      return Array.from({ length: book.chapters }, (_, chapterOffset) => ({
        book,
        bookIndex,
        chapter: chapterOffset + 1,
      }));
    });

    const collectedResults: Array<BibleSearchResult & { bookIndex: number }> = [];
    let totalMatches = 0;
    let failedChapters = 0;

    await runWithConcurrency(searchJobs, CHAPTER_CONCURRENCY, async ({ book, bookIndex, chapter }) => {
      let chapterData: ChapterData;
      try {
        chapterData = await fetchChapter(book.names[0], chapter, normalizedLanguage);
      } catch (error) {
        failedChapters += 1;
        console.warn(`Skipping unavailable chapter during Bible search: ${book.names[0]} ${chapter}`, error);
        return;
      }

      for (const verse of chapterData.vers) {
        if (!normalizeSearchText(verse.verse).includes(normalizedQuery)) {
          continue;
        }

        totalMatches += 1;

        collectedResults.push({
          id: `${book.abrev}-${chapter}-${verse.number}`,
          bookAbrev: book.abrev,
          bookName: chapterData.name || book.names[0],
          chapter,
          verseNumber: verse.number,
          verseText: verse.verse,
          bookIndex,
        });
      }
    });

    collectedResults.sort((left, right) => {
      return left.bookIndex - right.bookIndex || left.chapter - right.chapter || left.verseNumber - right.verseNumber;
    });

    return {
      query: trimmedQuery,
      total: totalMatches,
      truncated: false,
      version: normalizedLanguage === 'es' ? 'RVR1909' : 'KJV',
      incomplete: failedChapters > 0,
      results: collectedResults.map(({ bookIndex: _bookIndex, ...result }) => result),
    } satisfies BibleSearchResponse;
    })().catch((error) => {
      searchCache.delete(cacheKey);
      throw error;
    });

    searchCache.set(cacheKey, searchPromise);
  }

  const fullResponse = await searchCache.get(cacheKey)!;
  // Never preserve a partial result: transient failures should be retried on the next search.
  if (fullResponse.incomplete) {
    searchCache.delete(cacheKey);
  }
  return {
    ...fullResponse,
    results: fullResponse.results.slice(safeOffset, safeOffset + safeLimit),
    truncated: safeOffset + safeLimit < fullResponse.total,
  };
}

async function searchApiBibleRvr1960(query: string, apiKey: string, bibleId: string, limit: number, offset: number): Promise<BibleSearchResponse> {
  const searchUrl = new URL(`${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(bibleId)}/search`);
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('limit', String(limit));
  searchUrl.searchParams.set('offset', String(offset));
  searchUrl.searchParams.set('sort', 'canonical');

  const response = await fetch(searchUrl, { headers: { 'api-key': apiKey } });
  if (!response.ok) {
    throw new Error(`API.Bible search returned ${response.status}.`);
  }

  const payload = await response.json() as {
    data?: {
      total?: number;
      verses?: Array<{ id?: string; bookId?: string; chapterId?: string; text?: string; reference?: string }>;
    };
  };
  const verses = payload.data?.verses ?? [];
  const results = verses.flatMap((verse) => {
    const bookCode = verse.bookId?.toUpperCase() || verse.id?.split('.').at(0)?.toUpperCase();
    const bookIndex = bookCode ? RVR1909_BOOK_CODES.indexOf(bookCode) : -1;
    const book = FALLBACK_BIBLE_BOOKS[bookIndex];
    const idParts = verse.id?.split('.') ?? [];
    const chapterParts = verse.chapterId?.split('.') ?? [];
    const refMatch = verse.reference?.match(/\b(\d+):(\d+)\b/);
    const chapter = Number(chapterParts.at(-1) || idParts.at(-2) || refMatch?.[1]);
    const verseNumber = Number(idParts.at(-1) || refMatch?.[2]);

    if (!book || !Number.isInteger(chapter) || !Number.isInteger(verseNumber) || !verse.text) {
      return [];
    }

    return [{
      id: `${book.abrev}-${chapter}-${verseNumber}`,
      bookAbrev: book.abrev,
      bookName: book.names[0],
      chapter,
      verseNumber,
      verseText: verse.text,
    }];
  });
  const total = Number(payload.data?.total ?? verses.length);

  return {
    query,
    total,
    results,
    truncated: offset + results.length < total,
    version: 'RVR1960',
  };
}
