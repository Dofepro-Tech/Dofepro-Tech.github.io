import { getBibleVersion, normalizeAppLanguage } from '../src/lib/language.ts';
import type { BibleSearchResponse, BibleSearchResult, Book, ChapterData } from '../src/types.ts';

const BASE_URL = 'https://bible-api.deno.dev/api';
const DEFAULT_RESULT_LIMIT = 60;
const CHAPTER_CONCURRENCY = 10;

const booksCache = new Map<string, Promise<Book[]>>();
const chapterCache = new Map<string, Promise<ChapterData>>();
const searchCache = new Map<string, Promise<BibleSearchResponse>>();

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
      const response = await fetch(`${BASE_URL}/books`);
      if (!response.ok) {
        throw new Error('Failed to fetch books for Bible search.');
      }

      return response.json() as Promise<Book[]>;
    })());
  }

  return booksCache.get(cacheKey)!;
}

async function fetchChapter(bookName: string, chapter: number, language: string) {
  const version = getBibleVersion(language);
  const cacheKey = `${version}:${bookName}:${chapter}`;

  if (!chapterCache.has(cacheKey)) {
    chapterCache.set(cacheKey, (async () => {
      const response = await fetch(`${BASE_URL}/read/${version}/${encodeURIComponent(bookName)}/${chapter}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch chapter ${bookName} ${chapter} for Bible search.`);
      }

      return response.json() as Promise<ChapterData>;
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

export async function searchBible(query: string, language: string, limit: number = DEFAULT_RESULT_LIMIT): Promise<BibleSearchResponse> {
  const normalizedLanguage = normalizeAppLanguage(language);
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeSearchText(trimmedQuery);

  if (normalizedQuery.length < 2) {
    return {
      query: trimmedQuery,
      total: 0,
      results: [],
      truncated: false,
    };
  }

  const cacheKey = `${normalizedLanguage}:${limit}:${normalizedQuery}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

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

    await runWithConcurrency(searchJobs, CHAPTER_CONCURRENCY, async ({ book, bookIndex, chapter }) => {
      const chapterData = await fetchChapter(book.names[0], chapter, normalizedLanguage);

      for (const verse of chapterData.vers) {
        if (!normalizeSearchText(verse.verse).includes(normalizedQuery)) {
          continue;
        }

        totalMatches += 1;

        if (collectedResults.length >= limit) {
          continue;
        }

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
      truncated: totalMatches > collectedResults.length,
      results: collectedResults.map(({ bookIndex: _bookIndex, ...result }) => result),
    } satisfies BibleSearchResponse;
  })().catch((error) => {
    searchCache.delete(cacheKey);
    throw error;
  });

  searchCache.set(cacheKey, searchPromise);
  return searchPromise;
}