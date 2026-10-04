import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book, Bookmark, Highlight } from '@/src/types';
import { AUTH_SESSION_CHANGED_EVENT, readCurrentAuthSession, type AuthSessionSnapshot } from '@/src/lib/authSession';
import { loadUserFavorites, saveUserFavorites } from '@/src/services/userFavoritesApi';

const LOCAL_BOOKMARKS_KEY = 'bible_bookmarks';
const LEGACY_BOOKMARK_OWNER_KEY = 'bible_bookmarks_legacy_owner_v1';

function getBookmarksStorageKey(session: AuthSessionSnapshot | null) {
  return session ? `${LOCAL_BOOKMARKS_KEY}:${session.userId}` : LOCAL_BOOKMARKS_KEY;
}

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
  const [session, setSession] = useState(() => readCurrentAuthSession());
  const [highlights, setHighlights] = useState<Highlight[]>(() => readStoredList<Highlight>('bible_highlights'));
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => readStoredList<Bookmark>(getBookmarksStorageKey(readCurrentAuthSession())));
  const [isBookmarkSyncReady, setIsBookmarkSyncReady] = useState(() => !readCurrentAuthSession());
  const syncRequestIdRef = useRef(0);

  useEffect(() => {
    const refreshSession = () => {
      const nextSession = readCurrentAuthSession();
      setSession(nextSession);
      setIsBookmarkSyncReady(!nextSession);
      setBookmarks(readStoredList<Bookmark>(getBookmarksStorageKey(nextSession)));
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, refreshSession);
    window.addEventListener('storage', refreshSession);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, refreshSession);
      window.removeEventListener('storage', refreshSession);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setIsBookmarkSyncReady(true);
      return undefined;
    }

    const requestId = ++syncRequestIdRef.current;
    let isCancelled = false;
    const userBookmarks = readStoredList<Bookmark>(getBookmarksStorageKey(session));
    const legacyOwner = window.localStorage.getItem(LEGACY_BOOKMARK_OWNER_KEY);
    const legacyBookmarks = !legacyOwner || legacyOwner === session.userId
      ? readStoredList<Bookmark>(LOCAL_BOOKMARKS_KEY)
      : [];

    const importLegacyFavorites = () => {
      if (legacyBookmarks.length > 0 && (!legacyOwner || legacyOwner === session.userId)) {
        window.localStorage.setItem(LEGACY_BOOKMARK_OWNER_KEY, session.userId);
      }
    };

    void loadUserFavorites(session.accessToken).then(({ bookmarks: remoteBookmarks }) => {
      if (isCancelled || requestId !== syncRequestIdRef.current) return;
      const nextBookmarks = mergeBookmarks(remoteBookmarks ?? [], userBookmarks, legacyBookmarks);
      importLegacyFavorites();
      setBookmarks((currentBookmarks) => mergeBookmarks(nextBookmarks, currentBookmarks));
      setIsBookmarkSyncReady(true);
    }).catch(() => {
      if (isCancelled || requestId !== syncRequestIdRef.current) return;
      importLegacyFavorites();
      setBookmarks((currentBookmarks) => mergeBookmarks(currentBookmarks, userBookmarks, legacyBookmarks));
      setIsBookmarkSyncReady(true);
    });

    return () => {
      isCancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem('bible_highlights', JSON.stringify(highlights));
  }, [highlights]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isBookmarkSyncReady) return;
    localStorage.setItem(getBookmarksStorageKey(session), JSON.stringify(bookmarks));
  }, [bookmarks, isBookmarkSyncReady, session]);

  useEffect(() => {
    if (!session || !isBookmarkSyncReady) return undefined;
    const timeoutId = window.setTimeout(() => {
      void saveUserFavorites(session.accessToken, bookmarks).then(() => {
        if (window.localStorage.getItem(LEGACY_BOOKMARK_OWNER_KEY) === session.userId) {
          window.localStorage.removeItem(LOCAL_BOOKMARKS_KEY);
        }
      }).catch((error) => {
        console.error('Error syncing profile favorites:', error);
      });
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [bookmarks, isBookmarkSyncReady, session]);

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

function mergeBookmarks(...groups: Bookmark[][]) {
  const bookmarksByVerse = new Map<string, Bookmark>();
  for (const bookmark of groups.flat()) {
    const key = `${bookmark.bookAbrev}:${bookmark.chapter}:${bookmark.verseNumber ?? 0}`;
    const existing = bookmarksByVerse.get(key);
    if (!existing || bookmark.createdAt > existing.createdAt) bookmarksByVerse.set(key, bookmark);
  }
  return [...bookmarksByVerse.values()].sort((left, right) => right.createdAt - left.createdAt);
}