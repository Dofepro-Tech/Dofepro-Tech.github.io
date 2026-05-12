import type { BibleSearchResponse, Book, ChapterData } from '@/src/types';
import { canUseConfiguredApi, resolveConfiguredApiUrl } from '@/src/lib/apiConfig';
import { markBackendReady, warmBackendIfLikelyNeeded } from '@/src/lib/backendStatus';
import { FALLBACK_BIBLE_BOOKS } from '@/src/lib/fallbackBooks';
import { getBibleVersion, normalizeAppLanguage } from '@/src/lib/language';

const BASE_URL = 'https://bible-api.deno.dev/api';

interface ParsedBibleReference {
  book: Book;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
}

const SEARCH_BOOK_ALIASES = FALLBACK_BIBLE_BOOKS
  .flatMap((book) => {
    const aliases = new Set([...book.names, book.abrev]);
    return Array.from(aliases).map((alias) => ({
      book,
      normalizedAlias: normalizeReferenceToken(alias),
    }));
  })
  .sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length);

function normalizeReferenceToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9:\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canUseRemoteBibleSearchApi() {
  return canUseConfiguredApi();
}

function getBibleSearchUnavailableMessage(language: 'es' | 'en') {
  return language === 'en'
    ? 'Full-text search needs a configured API. Reference searches like John 3:16 or Psalms 91 still work without it.'
    : 'La búsqueda por palabra necesita una API configurada. Las referencias como Juan 3:16 o Salmos 91 sí funcionan sin ella.';
}

function parseSingleBibleReference(segment: string): ParsedBibleReference | null {
  const normalizedSegment = normalizeReferenceToken(segment);
  if (!normalizedSegment) {
    return null;
  }

  for (const aliasEntry of SEARCH_BOOK_ALIASES) {
    if (
      normalizedSegment !== aliasEntry.normalizedAlias
      && !normalizedSegment.startsWith(`${aliasEntry.normalizedAlias} `)
    ) {
      continue;
    }

    const remainder = normalizedSegment.slice(aliasEntry.normalizedAlias.length).trim();
    const match = remainder.match(/^(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/);
    if (!match) {
      continue;
    }

    const chapter = Number(match[1]);
    const startVerse = match[2] ? Number(match[2]) : undefined;
    const endVerse = match[3] ? Number(match[3]) : startVerse;

    if (!Number.isInteger(chapter) || chapter <= 0 || chapter > aliasEntry.book.chapters) {
      return null;
    }

    if (startVerse !== undefined && (!Number.isInteger(startVerse) || startVerse <= 0)) {
      return null;
    }

    if (endVerse !== undefined && (!Number.isInteger(endVerse) || endVerse < (startVerse ?? 1))) {
      return null;
    }

    return {
      book: aliasEntry.book,
      chapter,
      startVerse,
      endVerse,
    };
  }

  return null;
}

async function searchBibleByReference(query: string, lang: string, limit: number): Promise<BibleSearchResponse | null> {
  const segments = query
    .split(/[\/;,]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const parsedReferences = segments.map(parseSingleBibleReference);
  if (parsedReferences.some((reference) => reference === null)) {
    return null;
  }

  const results: BibleSearchResponse['results'] = [];
  let total = 0;

  for (const reference of parsedReferences) {
    const currentReference = reference!;
    const chapterData = await fetchChapter(currentReference.book.names[0], currentReference.chapter, lang);
    const selectedVerses = chapterData.vers.filter((verse) => {
      if (currentReference.startVerse === undefined) {
        return true;
      }

      return verse.number >= currentReference.startVerse && verse.number <= (currentReference.endVerse ?? currentReference.startVerse);
    });

    total += selectedVerses.length;

    for (const verse of selectedVerses) {
      if (results.length >= limit) {
        break;
      }

      results.push({
        id: `${currentReference.book.abrev}-${currentReference.chapter}-${verse.number}`,
        bookAbrev: currentReference.book.abrev,
        bookName: chapterData.name || currentReference.book.names[0],
        chapter: currentReference.chapter,
        verseNumber: verse.number,
        verseText: verse.verse,
      });
    }
  }

  return {
    query: query.trim(),
    total,
    results,
    truncated: total > results.length,
  };
}

export async function fetchBooks(): Promise<Book[]> {
  try {
    const res = await fetch(`${BASE_URL}/books`);
    if (!res.ok) {
      throw new Error('Failed to fetch books');
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Empty book catalog');
    }

    return data as Book[];
  } catch (error) {
    console.warn('Falling back to bundled Bible catalog.', error);
    return FALLBACK_BIBLE_BOOKS;
  }
}

/**
 * 
 * @param bookName - the name of the book
 * @param chapter - the chapter number
 * @returns 
 */
export async function fetchChapter(bookName: string, chapter: number, lang: string = 'es'): Promise<ChapterData> {
  const version = getBibleVersion(lang);
  const res = await fetch(`${BASE_URL}/read/${version}/${encodeURIComponent(bookName)}/${chapter}`);
  if (!res.ok) throw new Error('Failed to fetch chapter');
  return res.json();
}

export async function searchBible(query: string, lang: string = 'es', limit: number = 60): Promise<BibleSearchResponse> {
  const normalizedLanguage = normalizeAppLanguage(lang);
  const params = new URLSearchParams({
    query,
    lang: normalizedLanguage,
    limit: String(limit),
  });

  const fallbackReferenceSearch = async () => {
    const referenceSearch = await searchBibleByReference(query, normalizedLanguage, limit);
    if (referenceSearch) {
      return referenceSearch;
    }

    throw new Error(getBibleSearchUnavailableMessage(normalizedLanguage));
  };

  if (!canUseRemoteBibleSearchApi()) {
    return fallbackReferenceSearch();
  }

  try {
    warmBackendIfLikelyNeeded();
    const response = await fetch(`${resolveConfiguredApiUrl('/api/bible/search')}?${params.toString()}`);
    markBackendReady();
    if (!response.ok) {
      throw new Error('Failed to search Bible');
    }

    return response.json();
  } catch (error) {
    const referenceSearch = await searchBibleByReference(query, normalizedLanguage, limit);
    if (referenceSearch) {
      return referenceSearch;
    }

    throw error;
  }
}
