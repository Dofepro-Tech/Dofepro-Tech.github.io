import { FALLBACK_BIBLE_BOOKS } from '@/src/lib/fallbackBooks';
import type { Book } from '@/src/types';

export interface StrongLexiconEntry {
  number: string;
  lemma: string;
  xlit: string;
  pronounce: string;
  description: string;
}

export type StrongConcordanceIndex = Record<string, string[]>;

export interface StrongLexiconData {
  entries: StrongLexiconEntry[];
  concordance: StrongConcordanceIndex;
}

export interface StrongReference {
  book: Book;
  chapter: number;
  verse: number;
}

let strongLexiconPromise: Promise<StrongLexiconData> | null = null;

export function loadStrongLexicon() {
  if (!strongLexiconPromise) {
    strongLexiconPromise = Promise.all([
      fetch(new URL('strongs.json', document.baseURI), { cache: 'force-cache' }),
      fetch(new URL('strongs-concordance.json', document.baseURI), { cache: 'force-cache' }),
    ])
      .then(async ([lexiconResponse, concordanceResponse]) => {
        if (!lexiconResponse.ok || !concordanceResponse.ok) {
          throw new Error('No se pudo cargar el léxico Strong.');
        }

        const [entries, concordance] = await Promise.all([
          lexiconResponse.json() as Promise<StrongLexiconEntry[]>,
          concordanceResponse.json() as Promise<StrongConcordanceIndex>,
        ]);

        if (!Array.isArray(entries)) throw new Error('El archivo del léxico Strong no es válido.');
        return { entries, concordance };
      })
      .catch((error: unknown) => {
        strongLexiconPromise = null;
        throw error;
      });
  }

  return strongLexiconPromise;
}

export function searchStrongEntries(entries: StrongLexiconEntry[], query: string, limit = 24) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const normalizedNumber = normalizedQuery.replace(/[\s-]/g, '').toUpperCase();
  return entries
    .filter((entry) => entry.number.toUpperCase().includes(normalizedNumber)
      || entry.lemma.toLocaleLowerCase().includes(normalizedQuery)
      || entry.xlit.toLocaleLowerCase().includes(normalizedQuery)
      || entry.pronounce.toLocaleLowerCase().includes(normalizedQuery)
      || entry.description.toLocaleLowerCase().includes(normalizedQuery))
    .slice(0, limit);
}

export function getStrongReference(referenceId: string): StrongReference | null {
  if (!/^\d{8}$/.test(referenceId)) return null;

  const bookNumber = Number(referenceId.slice(0, 2));
  const book = FALLBACK_BIBLE_BOOKS[bookNumber - 1];
  const chapter = Number(referenceId.slice(2, 5));
  const verse = Number(referenceId.slice(5, 8));
  if (!book || chapter < 1 || verse < 1) return null;

  return { book, chapter, verse };
}