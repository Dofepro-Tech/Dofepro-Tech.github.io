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
import { OpinionsHub } from '@/src/components/OpinionsHub';
import { DictionaryHub } from '@/src/components/DictionaryHub';
import { UserAccessHub } from '@/src/components/UserAccessHub';
import { ShareSheet } from '@/src/components/ShareSheet';
import { DownloadAppModal } from '@/src/components/DownloadAppModal';
import { SplashScreen } from '@/src/components/SplashScreen';
import { RandomVerseModal } from '@/src/components/RandomVerseModal';
import { AboutLegalModal, type AboutLegalType } from '@/src/components/AboutLegalModal';
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
import { buildAppShareMessage, getAppApkUrl, getAppShareUrl, shareContent, shareInstalledAndroidApp, type SharePayload } from '@/src/lib/share';
import { getRandomStartupVerse, hydrateStartupVerse } from '@/src/lib/dailyVerse';
import { Github, Globe, Linkedin, Loader2 } from 'lucide-react';

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

type MainView = 'home' | 'reader' | 'game' | 'search' | 'plans' | 'profile' | 'opinions' | 'dictionary';

import { initAnalytics, trackEvent } from '@/src/lib/analytics';

export default function App() {
  const { i18n, t } = useTranslation();
  const currentLang = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const currentAppVersion = getCurrentAppVersion();
  const isNativePlatform = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web');
  const minimumSplashDuration = isNativePlatform ? 520 : 3200;
  const bootstrapFallbackDuration = isNativePlatform ? 2600 : 5600;

  const [books, setBooks] = useState<Book[]>(FALLBACK_BIBLE_BOOKS);
  const [selectedBook, setSelectedBook] = useState<Book | null>(FALLBACK_BIBLE_BOOKS[0] ?? null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [favoriteToPlay, setFavoriteToPlay] = useState<Bookmark | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [suppressVersePanel, setSuppressVersePanel] = useState(false);
  const [pendingVerseNumber, setPendingVerseNumber] = useState<number | null>(null);
  const [chapterFetchRequestId, setChapterFetchRequestId] = useState(0);
  const [verseFocusRequestId, setVerseFocusRequestId] = useState(0);
  const [pendingStartupVerse, setPendingStartupVerse] = useState<{ bookAbrev: string; chapter: number; verseNumber: number } | null>(null);
  const [mainView, setMainView] = useState<MainView>(() => {
    if (typeof window === 'undefined') return 'home';
    if (['callback', 'confirmed'].includes(new URLSearchParams(window.location.search).get('auth') ?? '')) return 'profile';
    return localStorage.getItem('bible_startup_page') === 'reader' ? 'reader' : 'home';
  });
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
  const [aboutLegalState, setAboutLegalState] = useState<{ isOpen: boolean, type: AboutLegalType }>({ isOpen: false, type: 'mission' });

  const handleOpenAboutLegal = useEffectEvent((type: AboutLegalType) => {
    setAboutLegalState({ isOpen: true, type });
  });

  const [activeSearchQuery, setActiveSearchQuery] = useState<string | undefined>(undefined);

  // Sistema de Analíticas optimizado para la v1.0.4
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!isNativePlatform) return undefined;
    const handleOAuthDeepLink = ({ url }: { url: string }) => {
      if (!url.startsWith('com.dofepro.biblianj://auth/callback')) return;
      window.localStorage.setItem('biblia_nj_google_callback_url', url);
      setMainView('profile');
      window.setTimeout(() => window.dispatchEvent(new Event('biblia-google-oauth-callback')), 0);
    };
    const listener = CapacitorApp.addListener('appUrlOpen', handleOAuthDeepLink);
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) handleOAuthDeepLink({ url: launch.url });
    });
    return () => { void listener.then((entry) => entry.remove()); };
  }, [isNativePlatform]);

  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [readerSelectorRequestId, setReaderSelectorRequestId] = useState(0);
  const [bookPickerFilter, setBookPickerFilter] = useState<SidebarBookFilter>('all');
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  const [hasAppliedSharedReaderTarget, setHasAppliedSharedReaderTarget] = useState(false);
  const [availableAppUpdate, setAvailableAppUpdate] = useState<AppUpdateManifest | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload>({
    title: '',
    text: '',
    url: '',
  });
  // Versículo diario persistente por fecha
  const [startupVerse, setStartupVerse] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem('biblia-dj-daily-verse-cache:' + new Date().toISOString().slice(0, 10) + ':' + currentLang);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return getRandomStartupVerse(currentLang);
  });
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
    keepScreenOn,
    setKeepScreenOn,
    startupPage,
    setStartupPage,
    homeSections,
    setHomeSections,
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

  useEffect(() => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator) || !keepScreenOn) {
      return undefined;
    }

    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.error('Failed to acquire wake lock:', err);
      }
    };

    void requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        void wakeLock.release();
      }
    };
  }, [keepScreenOn]);

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
    const shareText = buildAppShareMessage({
      title: t('app.title'),
      message: t('app.share_app_message'),
      webUrl: shareUrl,
      apkUrl: getAppApkUrl(),
      language: i18n.language,
    });
    const shareData = {
      title: t('app.title'),
      text: shareText,
      url: shareUrl,
    };

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const apkShareResult = await shareInstalledAndroidApp({
        title: shareData.title,
        text: shareData.text,
        dialogTitle: t('menu.share'),
        fileName: 'biblia-dj-android.apk',
      });

      if (apkShareResult === 'shared' || apkShareResult === 'cancelled') {
        return;
      }
    }

    const shareResult = await shareContent(shareData);
    if (shareResult !== 'unsupported') {
      return;
    }

    openShareSheet(shareData);
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
    const canFocusLoadedVerse = verseNumber != null
      && selectedBook?.abrev.toUpperCase() === book.abrev.toUpperCase()
      && selectedChapter === chapter
      && chapterData?.chapter === chapter;
    const loadedVerse = canFocusLoadedVerse ? chapterData?.vers.find((verse) => verse.number === verseNumber) : undefined;
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSelectedVerse(loadedVerse ?? null);
    setPendingVerseNumber(verseNumber ?? null);
    if (verseNumber != null) {
      setVerseFocusRequestId((current) => current + 1);
      if (!loadedVerse) setChapterFetchRequestId((current) => current + 1);
    }
    navigateToMainView('reader');
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
    setIsDailyExperienceOpen(false);
  };

  const openSidebar = (filter: SidebarBookFilter = 'all', andNavigate = false) => {
    setSidebarFilter(filter);
    if (andNavigate) {
      navigateToMainView('reader');
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  };

  const openGameHub = () => {
    navigateToMainView('game');
    setSelectedVerse(null);
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
  };

  const openSearchHub = (query?: string) => {
    setActiveSearchQuery(typeof query === 'string' ? query : undefined);
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

  const openBookPicker = (filter: SidebarBookFilter) => {
    setBookPickerFilter(filter);
    openReaderSelector();
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

    setStartupVerse(getRandomStartupVerse(currentLang));

    void hydrateStartupVerse(currentLang).then((dailyVerse) => {
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


  // Eliminado: apertura automática del desafío diario al iniciar la app

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
        void trackEvent({ name: 'bible_read', params: { book: selectedBook.abrev, chapter: selectedChapter } });
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
  }, [selectedBook, selectedChapter, currentLang, chapterFetchRequestId]);

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
    if (suppressVersePanel && selectedVerse?.id === verse.id) {
      setSelectedVerse(verse);
    } else {
      setSelectedVerse((current) => current?.id === verse.id ? null : verse);
    }
    setSuppressVersePanel(false);
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

  // Navega y enfoca el versículo solicitado desde cualquier parte de la app
  const handleNavigateToVerse = (bookAbrev: string, chapter: number, verseNumber: number) => {
    setSuppressVersePanel(true);
    setReaderSelectorRequestId(0);
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
    const isCurrentChapter = selectedBook?.abrev.toUpperCase() === book.abrev.toUpperCase()
      && selectedChapter === chapter
      && chapterData?.chapter === chapter;
    const loadedVerse = isCurrentChapter ? chapterData?.vers.find((verse) => verse.number === verseNumber) : undefined;
    if (loadedVerse) {
      setSelectedVerse(loadedVerse);
      setPendingVerseNumber(null);
      setVerseFocusRequestId((current) => current + 1);
      navigateToMainView('reader');
      setIsSidebarOpen(false);
      setIsRightSidebarOpen(false);
      setIsDailyExperienceOpen(false);
      return;
    }
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSelectedVerse({
      id: verseNumber,
      number: verseNumber,
      verse: '', // El texto se cargará en BibleReader
    });
    setPendingVerseNumber(verseNumber);
    setChapterFetchRequestId((current) => current + 1);
    setVerseFocusRequestId((current) => current + 1);
    navigateToMainView('reader');
    setIsSidebarOpen(false);
    setIsRightSidebarOpen(false);
    setIsDailyExperienceOpen(false);
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

  const selectedVerseFavorite = selectedVerse && selectedBook && chapterData
    ? bookmarks.find((bookmark) => bookmark.bookAbrev.toUpperCase() === selectedBook.abrev.toUpperCase() && bookmark.chapter === chapterData.chapter && bookmark.verseNumber === selectedVerse.number)
    : undefined;
  const toggleSelectedVerseFavorite = () => {
    if (!selectedVerse || !selectedBook || !chapterData) return;
    if (selectedVerseFavorite) {
      handleRemoveBookmark(selectedVerseFavorite.id);
      return;
    }
    handleAddReaderBookmark(selectedBook.abrev, chapterData.chapter, selectedVerse.number, `${selectedBook.names[0]} ${chapterData.chapter}:${selectedVerse.number}`);
  };

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
        onOpenSearch={openSearchHub}
        onOpenPlans={openReadingPlansHub}
        onOpenOpinions={() => navigateToMainView('opinions')}
        onOpenDictionary={() => navigateToMainView('dictionary')}
        onOpenUser={openUserHub}
        onOpenAboutLegal={handleOpenAboutLegal}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        bookmarks={bookmarks}
        onSelectBookmark={handleSelectBookmark}
        onRemoveBookmark={handleRemoveBookmark}
        onPlayFavorite={(b) => setFavoriteToPlay(b)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        voiceURI={voiceURI}
        setVoiceURI={setVoiceURI}
        keepScreenOn={keepScreenOn}
        setKeepScreenOn={setKeepScreenOn}
        startupPage={startupPage}
        setStartupPage={setStartupPage}
        homeSections={homeSections}
        setHomeSections={setHomeSections}
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
            isNativeApp={isNativePlatform}
            books={books}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            bookmarksCount={bookmarks.length}
            bookmarks={bookmarks}
            challengeSummary={challengeSummary}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            fontSize={fontSize}
            setFontSize={setFontSize}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            voiceURI={voiceURI}
            setVoiceURI={setVoiceURI}
            keepScreenOn={keepScreenOn}
            setKeepScreenOn={setKeepScreenOn}
            startupPage={startupPage}
            setStartupPage={setStartupPage}
            homeSections={homeSections}
            setHomeSections={setHomeSections}
            onSelectBook={handleSelectBook}
            onSelectChapter={handleSelectChapter}
            onShare={handleShareApp}
            onMenuClick={() => openSidebar('all')}
            onOpenBooks={openSidebar}
            onOpenBookPicker={openBookPicker}
            onContinueReading={handleContinueReading}
            onOpenReaderSelector={openReaderSelector}
            onOpenStudy={() => setIsStudyModeOpen(true)}
            onOpenDailyExperience={() => setIsDailyExperienceOpen(true)}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenGame={openGameHub}
            onOpenSearch={openSearchHub}
            onOpenPlans={openReadingPlansHub}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            onOpenOpinions={() => navigateToMainView('opinions')}
            onOpenDictionary={() => navigateToMainView('dictionary')}
            onOpenUser={openUserHub}
            onOpenAboutLegal={handleOpenAboutLegal}
            onGoHome={handleGoHome}
            onOpenVerse={handleNavigateToVerse}
            onAddBookmark={handleAddReaderBookmark}
            onRemoveBookmark={handleRemoveBookmark}
            onShareContent={handleShareContent}
            availableAppUpdate={availableAppUpdate ? {
              version: availableAppUpdate.version,
              currentVersion: currentAppVersion,
              publishedAt: availableAppUpdate.publishedAt,
              notes: availableAppUpdate.notes,
              notesEn: availableAppUpdate.notesEn,
            } : null}
            onOpenAppUpdate={() => { void handleOpenAppUpdate(); }}
            onDismissAppUpdate={handleDismissAppUpdate}
          />
        ) : mainView === 'game' ? (
          <Suspense fallback={null}>
            <LazyChristianGameHub
              onBack={handleGoBack}
              onGoHome={handleGoHome}
              onOpenBooks={openReaderSelector}
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
              onOpenAboutLegal={handleOpenAboutLegal}
            />
          </Suspense>
        ) : mainView === 'search' ? (
          <SearchHub
            initialQuery={activeSearchQuery}
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenReader={openReaderSelector}
            onOpenPlans={openReadingPlansHub}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenUser={openUserHub}
            onOpenAboutLegal={handleOpenAboutLegal}
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
            onOpenAboutLegal={handleOpenAboutLegal}
          />
        ) : mainView === 'profile' ? (
          <UserAccessHub
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenReader={openReaderSelector}
            onOpenSearch={openSearchHub}
            onOpenPlans={openReadingPlansHub}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenAboutLegal={handleOpenAboutLegal}
          />
        ) : mainView === 'opinions' ? (
          <OpinionsHub
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenReader={() => navigateToMainView('reader')}
            onOpenPlans={openReadingPlansHub}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenUser={openUserHub}
            onOpenAboutLegal={handleOpenAboutLegal}
          />
        ) : mainView === 'dictionary' ? (
          <DictionaryHub
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
            onOpenReader={() => navigateToMainView('reader')}
            onOpenPlans={openReadingPlansHub}
            onOpenFavorites={() => setIsRightSidebarOpen(true)}
            onOpenUser={openUserHub}
            onOpenAboutLegal={handleOpenAboutLegal}
          />
        ) : (
          <BibleReader 
            isNativeApp={isNativePlatform}
            chapterData={chapterData} 
            isLoading={isLoading} 
            selectedVerse={selectedVerse} 
            onSelectVerse={handleSelectVerse}
            onMenuClick={() => openSidebar('all')}
            isSidebarOpen={isSidebarOpen}
            isRightSidebarOpen={isRightSidebarOpen}
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
            onOpenBooks={openSidebar}
            onOpenGame={openGameHub}
            onOpenSearch={openSearchHub}
            onOpenPlans={openReadingPlansHub}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            onOpenOpinions={() => navigateToMainView('opinions')}
            onOpenDictionary={() => navigateToMainView('dictionary')}
            onOpenUser={openUserHub}
            onOpenAboutLegal={handleOpenAboutLegal}
            onOpenStudy={() => setIsStudyModeOpen(true)}
            readerSelectorRequestId={readerSelectorRequestId}
            onReaderSelectorRequestHandled={() => setReaderSelectorRequestId(0)}
            bookPickerFilter={bookPickerFilter}
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
          {selectedVerse && chapterData && mainView === 'reader' && isDesktopViewport && !suppressVersePanel && (
            <LazyAIInsightPanel 
              verse={selectedVerse} 
              chapter={chapterData} 
              onClose={() => setSelectedVerse(null)} 
              onGoHome={handleGoHome}
              isFavorite={!!selectedVerseFavorite}
              onToggleFavorite={toggleSelectedVerseFavorite}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <AnimatePresence>
        {isBootSplashVisible && <SplashScreen isReady={hasCompletedBootstrap && hasMinimumSplashTimePassed} />}
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

      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      <AboutLegalModal
        isOpen={aboutLegalState.isOpen}
        type={aboutLegalState.type}
        onClose={() => setAboutLegalState(prev => ({ ...prev, isOpen: false }))}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

