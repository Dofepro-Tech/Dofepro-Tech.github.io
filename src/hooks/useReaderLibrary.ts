import { useCallback, useEffect, useState } from 'react';
import type { Book, Bookmark, Highlight } from '@/src/types';

function readStoredList<T>(key: string): T[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function useReaderLibrary(books: Book[]) {
  const [highlights, setHighlights] = useState<Highlight[]>(() => readStoredList<Highlight>('bible_highlights'));
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => readStoredList<Bookmark>('bible_bookmarks'));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem('bible_highlights', JSON.stringify(highlights));
  }, [highlights]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem('bible_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const handleHighlightVerse = useCallback((verseId: string, color: string | null) => {
    setHighlights((previousHighlights) => {
      const nextHighlights = previousHighlights.filter((highlight) => highlight.verseId !== verseId);
      return color ? [...nextHighlights, { verseId, color }] : nextHighlights;
    });
  }, []);

  const handleAddBookmark = useCallback((bookAbrev: string, chapter: number, verseNumber?: number, label?: string) => {
    setBookmarks((previousBookmarks) => {
      const exists = previousBookmarks.some(
        (bookmark) =>
          bookmark.bookAbrev === bookAbrev &&
          bookmark.chapter === chapter &&
          bookmark.verseNumber === verseNumber,
      );

      if (exists) {
        return previousBookmarks;
      }

      const bookName = books.find((book) => book.abrev === bookAbrev)?.names[0] || bookAbrev;
      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        bookAbrev,
        chapter,
        verseNumber,
        label: label || `${bookName} ${chapter}${verseNumber ? `:${verseNumber}` : ''}`,
        createdAt: Date.now(),
      };

      return [newBookmark, ...previousBookmarks];
    });
  }, [books]);

  const handleRemoveBookmark = useCallback((id: string) => {
    setBookmarks((previousBookmarks) => previousBookmarks.filter((bookmark) => bookmark.id !== id));
  }, []);

  return {
    highlights,
    bookmarks,
    handleHighlightVerse,
    handleAddBookmark,
    handleRemoveBookmark,
  };
}