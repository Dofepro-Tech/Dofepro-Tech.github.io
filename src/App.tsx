/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, useEffect, useEffectEvent, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Sidebar } from '@/src/components/Sidebar';
import { BibleReader } from '@/src/components/BibleReader';
import { HomeScreen } from '@/src/components/HomeScreen';
import { SearchHub } from '@/src/components/SearchHub';
import { ReadingPlansHub } from '@/src/components/ReadingPlansHub';
import { UserAccessHub } from '@/src/components/UserAccessHub';
import { ShareSheet } from '@/src/components/ShareSheet';
import { SplashScreen } from '@/src/components/SplashScreen';
import { RandomVerseModal } from '@/src/components/RandomVerseModal';
import { FALLBACK_BIBLE_BOOKS } from '@/src/lib/fallbackBooks';
import { fetchBooks, fetchChapter } from '@/src/services/bibleApi';
import type { Book, Bookmark, ChapterData, SidebarBookFilter, Verse } from '@/src/types';
import { AnimatePresence, motion } from 'motion/react';
import { RightSidebar } from '@/src/components/RightSidebar';
import { useTranslation } from 'react-i18next';
import { normalizeAppLanguage } from '@/src/lib/language';
import { lazyWithRetry } from '@/src/lib/lazyWithRetry';
import { openExternalUrl } from '@/src/lib/openExternalUrl';
import { useReaderPreferences } from '@/src/hooks/useReaderPreferences';
import { useReaderLibrary } from '@/src/hooks/useReaderLibrary';
import { useReadingChallenges } from '@/src/hooks/useReadingChallenges';
import { dismissAppUpdateVersion, fetchLatestAppUpdate, getAppUpdateTargetUrl, getCurrentAppVersion, getDismissedAppUpdateVersion, shouldPromptForAppUpdate, type AppUpdateManifest } from '@/src/lib/appUpdate';
import { getBackendStatusSnapshot, getBackendWarmupDescription, getBackendWarmupTitle, subscribeBackendStatus, type BackendStatusSnapshot, warmBackendIfLikelyNeeded } from '@/src/lib/backendStatus';
import { getAppShareUrl, shareContent, shareInstalledAndroidApp, type SharePayload } from '@/src/lib/share';
import { getDailyVerse, hydrateDailyVerse } from '@/src/lib/dailyVerse';
import { Loader2 } from 'lucide-react';

function normalizeBookKey(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

interface SharedReaderTarget {
  bookAbrev: string;
  chapter: number;
  verseNumber: number;
}

function parseSharedReaderTarget() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const bookAbrev = params.get('book')?.trim();
  const chapter = Number(params.get('chapter'));
  const verseParam = params.get('verse')?.split('-')[0] ?? '';
  const verseNumber = Number(verseParam);

  if (!bookAbrev || !Number.isInteger(chapter) || chapter <= 0 || !Number.isInteger(verseNumber) || verseNumber <= 0) {
    return null;
  }

  return {
    bookAbrev,
    chapter,
    verseNumber,
  } satisfies SharedReaderTarget;
}

const LazyAIInsightPanel = lazyWithRetry(
  () => import('@/src/components/AIInsightPanel').then((module) => ({ default: module.AIInsightPanel })),
  'ai-insight-panel',
);
const LazyGuidedStudy = lazyWithRetry(
  () => import('@/src/components/GuidedStudy').then((module) => ({ default: module.GuidedStudy })),
  'guided-study',
);
const LazyChristianGameHub = lazyWithRetry(
  () => import('@/src/components/ChristianGameHub').then((module) => ({ default: module.ChristianGameHub })),
  'christian-game-hub',
);

type MainView = 'home' | 'reader' | 'game' | 'search' | 'plans' | 'profile';

export default function App() {
  const { i18n, t } = useTranslation();
  const currentLang = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const currentAppVersion = getCurrentAppVersion();
  const isNativePlatform = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const minimumSplashDuration = isNativePlatform ? 520 : 3200;
  const bootstrapFallbackDuration = isNativePlatform ? 2600 : 5600;

  const [books, setBooks] = useState<Book[]>(FALLBACK_BIBLE_BOOKS);
  const [selectedBook, setSelectedBook] = useState<Book | null>(FALLBACK_BIBLE_BOOKS[0] ?? null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [favoriteToPlay, setFavoriteToPlay] = useState<Bookmark | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [pendingVerseNumber, setPendingVerseNumber] = useState<number | null>(null);
  const [verseFocusRequestId, setVerseFocusRequestId] = useState(0);
  const [pendingStartupVerse, setPendingStartupVerse] = useState<{ bookAbrev: string; chapter: number; verseNumber: number } | null>(null);
  const [mainView, setMainView] = useState<MainView>('home');
  const [viewHistory, setViewHistory] = useState<MainView[]>([]);
  const [sidebarFilter, setSidebarFilter] = useState<SidebarBookFilter>('all');
  const [isBootSplashVisible, setIsBootSplashVisible] = useState(!isNativePlatform);
  const [hasCompletedBootstrap, setHasCompletedBootstrap] = useState(false);
  const [hasMinimumSplashTimePassed, setHasMinimumSplashTimePassed] = useState(false);
  const [hasShownStartupDailyVerse, setHasShownStartupDailyVerse] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);
  const [isDailyExperienceOpen, setIsDailyExperienceOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [readerSelectorRequestId, setReaderSelectorRequestId] = useState(0);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  const [hasAppliedSharedReaderTarget, setHasAppliedSharedReaderTarget] = useState(false);
  const [availableAppUpdate, setAvailableAppUpdate] = useState<AppUpdateManifest | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload>({
    title: '',
    text: '',
    url: '',
  });
  const [startupVerse, setStartupVerse] = useState(() => getDailyVerse(currentLang));
  const [backendStatus, setBackendStatus] = useState<BackendStatusSnapshot>(() => getBackendStatusSnapshot());
  const {
    isDarkMode,
    setIsDarkMode,
    fontSize,
    setFontSize,
    accentColor,
    setAccentColor,
    voiceURI,
    setVoiceURI,
  } = useReaderPreferences();
  const {
    highlights,
    bookmarks,
    handleHighlightVerse,
    handleAddBookmark,
    handleRemoveBookmark,
  } = useReaderLibrary(books);
  const {
    challengeSummary,
    completeDailyTask,
    trackChapterRead,
    trackVerseFocus,
    trackSearchQuery,
    trackBookmarkSaved,
  } = useReadingChallenges();

  const findBookByAbrev = (bookAbrev: string) => books.find(
    (book) => normalizeBookKey(book.abrev) === normalizeBookKey(bookAbrev),
  );

  const navigateToMainView = (nextView: MainView) => {
    if (nextView === mainView) {
      return;
    }

    setViewHistory((current) => [...current, mainView]);
    setMainView(nextView);
  };

  const openShareSheet = (payload: SharePayload) => {
    setSharePayload(payload);
    setIsShareSheetOpen(true);
  };

  const handleShareContent = async (payload: SharePayload) => {
    const normalizedPayload = {
      title: payload.title.trim(),
      text: payload.text.trim(),
      url: payload.url || getAppShareUrl(),
    };

    const shareResult = await shareContent(normalizedPayload);
    if (shareResult === 'shared' || shareResult === 'cancelled') {
      return;
    }

    openShareSheet(normalizedPayload);
  };

  const handleShareApp = async () => {
    const shareUrl = getAppShareUrl();
    const shareData = {
      title: t('app.title'),
      text: t('app.share_app_message'),
      url: shareUrl,
    };

    if (!shareUrl) {
      const apkShareResult = await shareInstalledAndroidApp({
        title: t('app.title'),
        text: t('app.share_app_android_apk'),
        fileName: 'biblia-dj-android.apk',
        dialogTitle: t('menu.share'),
      });

      if (apkShareResult === 'shared' || apkShareResult === 'cancelled') {
        return;
      }
    }

    await handleShareContent(shareData);
  };

  const handleOpenAppUpdate = useEffectEvent(async () => {
    const targetUrl = availableAppUpdate ? getAppUpdateTargetUrl(availableAppUpdate) : getAppShareUrl();
    if (!targetUrl) {
      return;
    }

    await openExternalUrl(targetUrl);
  });

  const handleDismissAppUpdate = useEffectEvent(() => {
    if (availableAppUpdate) {
      dismissAppUpdateVersion(availableAppUpdate.version);
    }

    setAvailableAppUpdate(null);
  });

  const openReaderLocation = (book: Book, chapter: number, verseNumber?: number | null) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSelectedVerse(null);
    setPendingVerseNumber(verseNumber ?? null);
    if (verseNumber != null) {
      setVerseFocusRequestId((current) => current + 1);
    }
    navigateToMainView('reader');
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
    setIsDailyExperienceOpen(false);
  };

  const openSidebar = (filter: SidebarBookFilter = 'all') => {
    setSidebarFilter(filter);
    setIsSidebarOpen(true);
  };

  const openGameHub = () => {
    navigateToMainView('game');
    setSelectedVerse(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
  };

  const openSearchHub = () => {
    navigateToMainView('search');
    setSelectedVerse(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
  };

  const openReadingPlansHub = () => {
    navigateToMainView('plans');
    setSelectedVerse(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
  };

  const openUserHub = () => {
    navigateToMainView('profile');
    setSelectedVerse(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
  };

  const openReaderSelector = () => {
    if (!selectedBook) {
      const fallbackBook = books[0] ?? FALLBACK_BIBLE_BOOKS[0] ?? null;
      if (fallbackBook) {
        setSelectedBook(fallbackBook);
        setSelectedChapter(1);
      }
    }

    navigateToMainView('reader');
    setSelectedVerse(null);
    setPendingVerseNumber(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
    setIsDailyExperienceOpen(false);
    setReaderSelectorRequestId((current) => current + 1);
  };

  const handleContinueReading = () => {
    if (!selectedBook) {
      const fallbackBook = books[0] ?? FALLBACK_BIBLE_BOOKS[0] ?? null;
      if (fallbackBook) {
        setSelectedBook(fallbackBook);
        setSelectedChapter(1);
      }
    }

    navigateToMainView('reader');
    setSelectedVerse(null);
  };

  useEffect(() => {
    let isDisposed = false;

    setStartupVerse(getDailyVerse(currentLang));

    void hydrateDailyVerse(currentLang).then((dailyVerse) => {
      if (!isDisposed) {
        setStartupVerse(dailyVerse);
      }
    });

    return () => {
      isDisposed = true;
    };
  }, [currentLang]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasMinimumSplashTimePassed(true);
    }, minimumSplashDuration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [minimumSplashDuration]);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setHasCompletedBootstrap(true);
    }, bootstrapFallbackDuration);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [bootstrapFallbackDuration]);

  useEffect(() => {
    if (hasCompletedBootstrap && hasMinimumSplashTimePassed) {
      setIsBootSplashVisible(false);
    }
  }, [hasCompletedBootstrap, hasMinimumSplashTimePassed]);

  useEffect(() => {
    if (isBootSplashVisible || !hasCompletedBootstrap || !hasMinimumSplashTimePassed || hasShownStartupDailyVerse) {
      return;
    }

    setIsDailyExperienceOpen(true);
    setHasShownStartupDailyVerse(true);
  }, [isBootSplashVisible, hasCompletedBootstrap, hasMinimumSplashTimePassed, hasShownStartupDailyVerse]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setIsDesktopViewport(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (hasAppliedSharedReaderTarget) {
      return;
    }

    const sharedReaderTarget = parseSharedReaderTarget();
    setHasAppliedSharedReaderTarget(true);

    if (!sharedReaderTarget) {
      return;
    }

    setHasShownStartupDailyVerse(true);
    setIsDailyExperienceOpen(false);

    const book = books.find((candidate) => normalizeBookKey(candidate.abrev) === normalizeBookKey(sharedReaderTarget.bookAbrev));

    if (book) {
      openReaderLocation(book, sharedReaderTarget.chapter, sharedReaderTarget.verseNumber);
      return;
    }

    setPendingStartupVerse(sharedReaderTarget);
    navigateToMainView('reader');
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
  }, [books, hasAppliedSharedReaderTarget]);

  useEffect(() => {
    let isCancelled = false;

    fetchBooks()
      .then((data) => {
        if (isCancelled) {
          return;
        }

        setBooks(data);

        const savedAbrev = localStorage.getItem('last_book_abrev');
        const savedChapter = Number(localStorage.getItem('last_chapter'));

        if (data.length === 0) {
          return;
        }

        const savedBook = savedAbrev ? data.find((book) => book.abrev === savedAbrev) : null;
        const initialBook = savedBook ?? data[0];
        const initialChapter = savedBook && Number.isInteger(savedChapter) && savedChapter > 0
          ? Math.min(savedChapter, savedBook.chapters)
          : 1;

        setSelectedBook(initialBook);
        setSelectedChapter(initialChapter);
      })
      .catch((error) => console.error('Error loading books:', error))
      .finally(() => {
        if (!isCancelled) {
          setHasCompletedBootstrap(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedBook) {
      localStorage.setItem('last_book_abrev', selectedBook.abrev);
      localStorage.setItem('last_chapter', selectedChapter.toString());
    }
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    return subscribeBackendStatus((nextSnapshot) => {
      setBackendStatus(nextSnapshot);
    });
  }, []);

  useEffect(() => {
    const triggerWarmup = () => {
      warmBackendIfLikelyNeeded();
    };

    triggerWarmup();

    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerWarmup();
      }
    };

    window.addEventListener('focus', triggerWarmup);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let isDisposed = false;
    let nativeListener: { remove: () => void } | null = null;
    let nativeListenerPromise: Promise<{ remove: () => void }> | null = null;

    if (isNativePlatform) {
      nativeListenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          triggerWarmup();
        }
      });

      void nativeListenerPromise.then((listener) => {
        if (isDisposed) {
          void listener.remove();
          return;
        }

        nativeListener = listener;
      });
    }

    return () => {
      isDisposed = true;
      window.removeEventListener('focus', triggerWarmup);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (nativeListener) {
        void nativeListener.remove();
      } else if (nativeListenerPromise) {
        void nativeListenerPromise.then((listener) => listener.remove());
      }
    };
  }, [isNativePlatform]);

  useEffect(() => {
    if (!selectedBook || !selectedChapter) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    if (!pendingVerseNumber) {
      setSelectedVerse(null);
    }

    fetchChapter(selectedBook.names[0], selectedChapter, currentLang)
      .then((data) => {
        if (isCancelled) {
          return;
        }

        setChapterData(data);
        trackChapterRead(selectedBook.abrev, selectedChapter);
        if (pendingVerseNumber) {
          const pendingVerse = data.vers.find((verse) => verse.number === pendingVerseNumber);
          if (pendingVerse) {
            setSelectedVerse(pendingVerse);
            trackVerseFocus(selectedBook.abrev, selectedChapter, pendingVerse.number);
          }
          setPendingVerseNumber(null);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(error);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedBook, selectedChapter, currentLang, pendingVerseNumber]);

  useEffect(() => {
    if (!isNativePlatform) {
      return undefined;
    }

    let isDisposed = false;
    let activeController: AbortController | null = null;

    const checkForAppUpdate = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const nextUpdate = await fetchLatestAppUpdate(controller.signal);
        if (isDisposed || controller.signal.aborted) {
          return;
        }

        if (!nextUpdate || !shouldPromptForAppUpdate(nextUpdate)) {
          setAvailableAppUpdate(null);
          return;
        }

        const dismissedVersion = getDismissedAppUpdateVersion();
        if (dismissedVersion === nextUpdate.version) {
          setAvailableAppUpdate(null);
          return;
        }

        setAvailableAppUpdate(nextUpdate);
      } catch (error) {
        if (!isDisposed && !controller.signal.aborted) {
          console.error('Error checking app update:', error);
        }
      }
    };

    void checkForAppUpdate();

    const listenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void checkForAppUpdate();
      }
    });

    return () => {
      isDisposed = true;
      activeController?.abort();
      void listenerPromise.then((listener) => listener.remove());
    };
  }, [isNativePlatform]);

  useEffect(() => {
    if (!pendingStartupVerse || books.length === 0) {
      return;
    }

    const book = findBookByAbrev(pendingStartupVerse.bookAbrev);
    if (!book) {
      return;
    }

    setSelectedBook(book);
    setSelectedChapter(pendingStartupVerse.chapter);
    setPendingVerseNumber(pendingStartupVerse.verseNumber);
    setVerseFocusRequestId((current) => current + 1);
    navigateToMainView('reader');
    setPendingStartupVerse(null);
  }, [pendingStartupVerse, books]);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerse(null);
    setPendingVerseNumber(null);
  };

  const handleSelectChapter = (chapter: number) => {
    setSelectedChapter(chapter);
    setSelectedVerse(null);
    setPendingVerseNumber(null);
    navigateToMainView('reader');
  };

  const handleSelectVerse = (verse: Verse) => {
    setSelectedVerse((current) => current?.id === verse.id ? null : verse);
    setIsSidebarOpen(false);

    if (selectedBook && chapterData) {
      trackVerseFocus(selectedBook.abrev, chapterData.chapter, verse.number);
    }
  };

  const handleAddReaderBookmark = (bookAbrev: string, chapter: number, verseNumber?: number, label?: string) => {
    handleAddBookmark(bookAbrev, chapter, verseNumber, label);
    trackBookmarkSaved(bookAbrev, chapter, verseNumber);
  };

  const handleSelectBookmark = (bookmark: Bookmark) => {
    const book = findBookByAbrev(bookmark.bookAbrev);
    if (!book) {
      return;
    }

    openReaderLocation(book, bookmark.chapter, bookmark.verseNumber || null);
  };

  const handleNavigateToVerse = (bookAbrev: string, chapter: number, verseNumber: number) => {
    const book = findBookByAbrev(bookAbrev);
    if (!book) {
      setSelectedVerse(null);
      setPendingStartupVerse({ bookAbrev, chapter, verseNumber });
      navigateToMainView('reader');
      setIsSidebarOpen(false);
      setIsRightSidebarOpen(false);
      setIsDailyExperienceOpen(false);
      return;
    }

    openReaderLocation(book, chapter, verseNumber);
  };

  const handleGoHome = () => {
    setViewHistory([]);
    setMainView('home');
    setSelectedVerse(null);
    setPendingVerseNumber(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
    setIsStudyModeOpen(false);
    setIsDailyExperienceOpen(false);
  };

  const applyAppBackNavigation = () => {
    const previousView = viewHistory.at(-1);

    if (!previousView) {
      return false;
    }

    setViewHistory((current) => current.slice(0, -1));
    setMainView(previousView);
    setSelectedVerse(null);
    setPendingVerseNumber(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
    setIsStudyModeOpen(false);
    setIsDailyExperienceOpen(false);

    return true;
  };

  const handleGoBack = () => {
    applyAppBackNavigation();
  };

  const handleAndroidBackButton = useEffectEvent(() => {
    if (isShareSheetOpen) {
      setIsShareSheetOpen(false);
      return;
    }

    if (selectedVerse) {
      setSelectedVerse(null);
      return;
    }

    if (isStudyModeOpen) {
      setIsStudyModeOpen(false);
      return;
    }

    if (isDailyExperienceOpen) {
      setIsDailyExperienceOpen(false);
      return;
    }

    if (isRightSidebarOpen) {
      setIsRightSidebarOpen(false);
      return;
    }

    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return;
    }

    if (applyAppBackNavigation()) {
      return;
    }

    if (mainView !== 'home') {
      handleGoHome();
      return;
    }

    void CapacitorApp.exitApp();
  });

  useEffect(() => {
    if (!isNativePlatform || Capacitor.getPlatform() !== 'android') {
      return undefined;
    }

    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      handleAndroidBackButton();
    });

    return () => {
      void listenerPromise.then((listener) => listener.remove());
    };
  }, [handleAndroidBackButton, isNativePlatform]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-paper transition-colors duration-300">
      <Sidebar 
        books={books} 
        selectedBook={selectedBook} 
        selectedChapter={selectedChapter} 
        onSelectBook={handleSelectBook} 
        onSelectChapter={handleSelectChapter}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        filter={sidebarFilter}
        onFilterChange={setSidebarFilter}
        onOpenStudy={() => setIsStudyModeOpen(true)}
        onOpenDailyExperience={() => setIsDailyExperienceOpen(true)}
        onOpenFavorites={() => setIsRightSidebarOpen(true)}
        onOpenGame={openGameHub}
        onShare={handleShareApp}
        onGoHome={handleGoHome}
        onOpenReader={openReaderSelector}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <RightSidebar 
        isOpen={isRightSidebarOpen}
        onClose={() => setIsRightSidebarOpen(false)}
        bookmarks={bookmarks}
        onSelectBookmark={handleSelectBookmark}
        onRemoveBookmark={handleRemoveBookmark}
        onPlayFavorite={(b) => setFavoriteToPlay(b)}
        onGoHome={handleGoHome}
      />
      
      <main className="flex-1 min-w-0 relative h-full">
        <AnimatePresence>
          {!isBootSplashVisible && backendStatus.phase === 'waking' && (
            <motion.div
              initial={{ opacity: 0, y: -12, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -12, x: '-50%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed left-1/2 z-[70] w-[min(92vw,36rem)]"
              style={{ top: 'max(env(safe-area-inset-top), 0.75rem)' }}
            >
              <div className="rounded-[28px] border border-[#f0c15c]/30 bg-[#081426]/92 px-4 py-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f0c15c]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f0c15c]">{getBackendWarmupTitle(currentLang)}</p>
                    <p className="mt-1 text-sm leading-6 text-white/82">{getBackendWarmupDescription(currentLang)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {mainView === 'home' ? (
          <HomeScreen
            books={books}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            bookmarksCount={bookmarks.length}
            challengeSummary={challengeSummary}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            fontSize={fontSize}
            setFontSize={setFontSize}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            voiceURI={voiceURI}
            setVoiceURI={setVoiceURI}
            onShare={handleShareApp}
            onMenuClick={() => openSidebar('all')}
            onOpenBooks={openSidebar}
            onContinueReading={handleContinueReading}
            onOpenReaderSelector={openReaderSelector}
            onOpenStudy={() => setIsStudyModeOpen(true)}
            onOpenDailyExperience={() => setIsDailyExperienceOpen(true)}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenGame={openGameHub}
            onOpenSearch={openSearchHub}
            onOpenPlans={openReadingPlansHub}
            onOpenUser={openUserHub}
            onGoHome={handleGoHome}
            onOpenVerse={handleNavigateToVerse}
            onShareContent={handleShareContent}
            availableAppUpdate={availableAppUpdate ? {
              version: availableAppUpdate.version,
              currentVersion: currentAppVersion,
              publishedAt: availableAppUpdate.publishedAt,
            } : null}
            onOpenAppUpdate={() => { void handleOpenAppUpdate(); }}
            onDismissAppUpdate={handleDismissAppUpdate}
            dailyVerse={startupVerse}
          />
        ) : mainView === 'game' ? (
          <Suspense fallback={null}>
            <LazyChristianGameHub
              onBack={handleGoBack}
              onGoHome={handleGoHome}
              onOpenBooks={() => openSidebar('all')}
              onOpenStudy={() => setIsStudyModeOpen(true)}
              onOpenDailyExperience={() => setIsDailyExperienceOpen(true)}
              onOpenFavorites={() => setIsRightSidebarOpen(true)}
              onShare={handleShareApp}
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              fontSize={fontSize}
              setFontSize={setFontSize}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              voiceURI={voiceURI}
              setVoiceURI={setVoiceURI}
              onOpenSearch={openSearchHub}
              onOpenPlans={openReadingPlansHub}
              onOpenUser={openUserHub}
            />
          </Suspense>
        ) : mainView === 'search' ? (
          <SearchHub
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenReader={openReaderSelector}
            onOpenPlans={openReadingPlansHub}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenUser={openUserHub}
            onOpenVerse={handleNavigateToVerse}
          />
        ) : mainView === 'plans' ? (
          <ReadingPlansHub
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenReader={openReaderSelector}
            onOpenSearch={openSearchHub}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenUser={openUserHub}
          />
        ) : mainView === 'profile' ? (
          <UserAccessHub
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenReader={openReaderSelector}
            onOpenSearch={openSearchHub}
            onOpenPlans={openReadingPlansHub}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
          />
        ) : (
          <BibleReader 
            chapterData={chapterData} 
            isLoading={isLoading} 
            selectedVerse={selectedVerse} 
            onSelectVerse={handleSelectVerse}
            onMenuClick={() => openSidebar('all')}
            isSidebarOpen={isSidebarOpen}
            books={books}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            onSelectBook={handleSelectBook}
            onSelectChapter={handleSelectChapter}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            highlights={highlights}
            onHighlightVerse={handleHighlightVerse}
            fontSize={fontSize}
            setFontSize={setFontSize}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            voiceURI={voiceURI}
            setVoiceURI={setVoiceURI}
            onAddBookmark={handleAddReaderBookmark}
            bookmarks={bookmarks}
            favoriteToPlay={favoriteToPlay}
            onFavoritePlayed={() => setFavoriteToPlay(null)}
            onOpenFavorites={() => {
              setIsRightSidebarOpen(true);
            }}
            onNavigateToVerse={handleNavigateToVerse}
            onOpenDailyExperience={() => setIsDailyExperienceOpen(true)}
            onTrackSearchQuery={trackSearchQuery}
            challengeSummary={challengeSummary}
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenGame={openGameHub}
            onOpenSearch={openSearchHub}
            onOpenPlans={openReadingPlansHub}
            onOpenUser={openUserHub}
            readerSelectorRequestId={readerSelectorRequestId}
            verseFocusRequestId={verseFocusRequestId}
            onShareContent={handleShareContent}
            onClearSelectedVerse={() => setSelectedVerse(null)}
          />
        )}
      </main>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isStudyModeOpen && (
            <LazyGuidedStudy 
              books={books} 
              onClose={() => setIsStudyModeOpen(false)} 
              onGoHome={handleGoHome}
              voiceURI={voiceURI}
              onNavigate={(bookAbrev, chapter) => {
                const book = books.find((currentBook) => currentBook.abrev === bookAbrev);
                if (book) {
                  setSelectedBook(book);
                  setSelectedChapter(chapter);
                  navigateToMainView('reader');
                  setIsStudyModeOpen(false);
                }
              }}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {selectedVerse && chapterData && mainView === 'reader' && isDesktopViewport && (
            <LazyAIInsightPanel 
              verse={selectedVerse} 
              chapter={chapterData} 
              onClose={() => setSelectedVerse(null)} 
              onGoHome={handleGoHome}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <AnimatePresence>
        {isBootSplashVisible && <SplashScreen />}
      </AnimatePresence>

      <AnimatePresence>
        {isDailyExperienceOpen && (
          <RandomVerseModal 
            challengeSummary={challengeSummary}
            onCompleteDailyTask={completeDailyTask}
            onContinue={() => {
              completeDailyTask('pray_daily_verse');
              setIsDailyExperienceOpen(false);
            }}
            onGoHome={() => {
              completeDailyTask('pray_daily_verse');
              handleGoHome();
              setIsDailyExperienceOpen(false);
            }}
            onGoToVerse={(abrev, chapter, verse) => {
              completeDailyTask('open_daily_verse');
              setIsDailyExperienceOpen(false);
              window.setTimeout(() => {
                handleNavigateToVerse(abrev, chapter, verse.number);
              }, 30);
            }}
            onShareContent={handleShareContent}
            dailyVerse={startupVerse}
          />
        )}
      </AnimatePresence>

      <ShareSheet
        isOpen={isShareSheetOpen}
        onClose={() => setIsShareSheetOpen(false)}
        title={sharePayload.title}
        text={sharePayload.text}
        url={sharePayload.url}
      />
    </div>
  );
}

