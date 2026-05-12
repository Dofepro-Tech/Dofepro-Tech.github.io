import type { BibleSearchResponse, Book, ChapterData } from '@/src/types';
import { FALLBACK_BIBLE_BOOKS } from '@/src/lib/fallbackBooks';
import { getBibleVersion, normalizeAppLanguage } from '@/src/lib/language';

const BASE_URL = 'https://bible-api.deno.dev/api';

function resolveInternalApiUrl(path: string) {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return path;
  }

  return `${configuredBaseUrl.replace(/\/+$/, '')}${path}`;
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
  const params = new URLSearchParams({
    query,
    lang: normalizeAppLanguage(lang),
    limit: String(limit),
  });

  const response = await fetch(`${resolveInternalApiUrl('/api/bible/search')}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to search Bible');
  }

  return response.json();
}
