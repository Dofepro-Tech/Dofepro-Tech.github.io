import React, { useRef, useEffect } from 'react';
import { BibleSearchResponse, Book, ChapterData, Verse, Highlight, Bookmark, ReadingChallengeSummary } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { PanelNavButtons } from '@/src/components/PanelNavButtons';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { fetchChapter, searchBible } from '@/src/services/bibleApi';
import { getSpeechLanguage } from '@/src/lib/language';
import { BookOpen, Calendar, Gamepad2, Menu, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, Palette, Trash2, MoreVertical, Heart, Info, Share2, Settings, X, Search, ArrowRight, Bookmark as BookmarkIcon, Globe, Volume2, VolumeX, Copy, House, Flame, Star, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { canUseSpeechSynthesis, cancelSpeech, getSpeechVoices, setSpeechVoicesChangedListener, speakText } from '@/src/lib/speech';
import { buildVerseShareText, getAppShareUrl, getReaderShareUrl, type SharePayload } from '@/src/lib/share';

interface BibleReaderProps {
  chapterData: ChapterData | null;
  isLoading: boolean;
  selectedVerse: Verse | null;
  onSelectVerse: (verse: Verse) => void;
  onMenuClick: () => void;
  books: Book[];
  selectedBook: Book | null;
  selectedChapter: number;
  onSelectBook: (book: Book) => void;
  onSelectChapter: (chapter: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  highlights: Highlight[];
  onHighlightVerse: (verseId: string, color: string | null) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  voiceURI: string;
  setVoiceURI: (uri: string) => void;
  onAddBookmark: (bookAbrev: string, chapter: number, verseNumber?: number, label?: string) => void;
  bookmarks: Bookmark[];
  isSidebarOpen: boolean;
  favoriteToPlay?: Bookmark | null;
  onFavoritePlayed?: () => void;
  onOpenFavorites?: () => void;
  onNavigateToVerse?: (bookAbrev: string, chapter: number, verseNumber: number) => void;
  onOpenDailyExperience?: () => void;
  onTrackSearchQuery?: (query: string) => void;
  challengeSummary: ReadingChallengeSummary;
  onGoBack?: () => void;
  onGoHome?: () => void;
  onOpenGame?: () => void;
  onOpenSearch?: () => void;
  onOpenPlans?: () => void;
  onOpenUser?: () => void;
  readerSelectorRequestId?: number;
  verseFocusRequestId?: number;
  onShareContent: (payload: SharePayload) => void | Promise<void>;
  onClearSelectedVerse?: () => void;
}

type AboutSectionId = 'mission' | 'vision' | 'values';
const ACCENT_OPTIONS = [
  { id: 'violet', color: '#4c1d95', nameEs: 'Violeta', nameEn: 'Violet' },
  { id: 'olive', color: '#5A5A40', nameEs: 'Oliva', nameEn: 'Olive' },
  { id: 'indigo', color: '#6366f1', nameEs: 'Indigo', nameEn: 'Indigo' },
  { id: 'blue', color: '#3b82f6', nameEs: 'Azul', nameEn: 'Blue' },
  { id: 'teal', color: '#14b8a6', nameEs: 'Turquesa', nameEn: 'Teal' },
  { id: 'green', color: '#10b981', nameEs: 'Esmeralda', nameEn: 'Emerald' },
  { id: 'gold', color: '#c2a153', nameEs: 'Oro', nameEn: 'Gold' },
  { id: 'amber', color: '#f59e0b', nameEs: 'Ambar', nameEn: 'Amber' },
  { id: 'orange', color: '#f97316', nameEs: 'Naranja', nameEn: 'Orange' },
  { id: 'red', color: '#ef4444', nameEs: 'Rubi', nameEn: 'Ruby' },
  { id: 'rose', color: '#f43f5e', nameEs: 'Rosa', nameEn: 'Rose' },
  { id: 'slate', color: '#475569', nameEs: 'Pizarra', nameEn: 'Slate' },
];

export function BibleReader({ 
  chapterData, 
  isLoading, 
  selectedVerse, 
  onSelectVerse, 
  onMenuClick,
  isSidebarOpen,
  books,
  selectedBook,
  selectedChapter,
  onSelectBook,
  onSelectChapter,
  isDarkMode,
  onToggleDarkMode,
  highlights,
  onHighlightVerse,
  fontSize,
  setFontSize,
  accentColor,
  setAccentColor,
  voiceURI,
  setVoiceURI,
  onAddBookmark,
  bookmarks,
  favoriteToPlay,
  onFavoritePlayed,
  onOpenFavorites,
  onNavigateToVerse,
  onOpenDailyExperience,
  onTrackSearchQuery,
  challengeSummary,
  onGoBack,
  onGoHome,
  onOpenGame,
  onOpenSearch,
  onOpenPlans,
  onOpenUser,
  readerSelectorRequestId,
  verseFocusRequestId,
  onShareContent,
  onClearSelectedVerse,
}: BibleReaderProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const aboutValuesRaw = t('about.values_items', { returnObjects: true });
  const aboutValues = Array.isArray(aboutValuesRaw)
    ? (aboutValuesRaw as Array<{ title: string; description: string }>)
    : [];
  const speechLanguage = getSpeechLanguage(currentLanguage);
  const appShareUrl = getAppShareUrl();
  const isSpeechAvailable = canUseSpeechSynthesis();
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);
  const [aboutSection, setAboutSection] = React.useState<AboutSectionId | null>(null);
  const aboutScrollRef = useRef<HTMLDivElement>(null);
  const missionSectionRef = useRef<HTMLDivElement>(null);
  const visionSectionRef = useRef<HTMLDivElement>(null);
  const valuesSectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isSpeechAvailable) {
      setVoices([]);
      return;
    }

    const loadVoices = () => {
      const v = getSpeechVoices();
      setVoices(v);
    };

    loadVoices();
    setSpeechVoicesChangedListener(loadVoices);

    return () => {
      setSpeechVoicesChangedListener(null);
    };
  }, [isSpeechAvailable]);
  const booksScrollRef = useRef<HTMLDivElement>(null);
  const chaptersScrollRef = useRef<HTMLDivElement>(null);
  const versesScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const mobileHeaderRef = useRef<HTMLDivElement>(null);
  const mobileActionSheetRef = useRef<HTMLDivElement>(null);
  const verseRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const focusRetryTimerRef = useRef<number | null>(null);
  const colorScrollRef = useRef<HTMLDivElement>(null);
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isVerseActionSheetExpanded, setIsVerseActionSheetExpanded] = React.useState(false);
  const [isMobilePickerOpen, setIsMobilePickerOpen] = React.useState(false);
  const [mobileSelectionTab, setMobileSelectionTab] = React.useState<'book' | 'chapter' | 'verse'>('book');
  const [mobileBookSearchTerm, setMobileBookSearchTerm] = React.useState('');
  const [mobileBookTestamentFilter, setMobileBookTestamentFilter] = React.useState<'old' | 'new'>('old');
  const [blinkingVerseId, setBlinkingVerseId] = React.useState<number | null>(null);
  const [headerSearchTerm, setHeaderSearchTerm] = React.useState('');
  const [verseSearchTerm, setVerseSearchTerm] = React.useState('');
  const [focusedVerseId, setFocusedVerseId] = React.useState<number | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isReadingVerse, setIsReadingVerse] = React.useState<number | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = React.useState(false);
  const [multiSelectedVerseNumbers, setMultiSelectedVerseNumbers] = React.useState<number[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = React.useState<BibleSearchResponse | null>(null);
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = React.useState(false);
  const showDeveloperTools = import.meta.env.DEV || import.meta.env.VITE_SHOW_PROVIDER_LINK === 'true';
  const readerCopy = currentLanguage.startsWith('en')
    ? {
        book: 'Book',
        chapter: 'Chapter',
        verse: 'Verse',
        searchBook: 'Search book',
        version: 'Reina Valera 1960',
        old: 'Old Testament',
        new: 'New Testament',
        openSelector: 'Open Bible selector',
      }
    : {
        book: 'Libro',
        chapter: 'Capítulo',
        verse: 'Versículo',
        searchBook: 'Buscar libro',
        version: 'Reina Valera 1960',
        old: 'Antiguo Testamento',
        new: 'Nuevo Testamento',
        openSelector: 'Abrir selector bíblico',
      };
  const mobileNavItems = [
    {
      id: 'home',
      label: t('app.home'),
      icon: <House className="h-5 w-5" />,
      onClick: () => onGoHome?.(),
    },
    {
      id: 'books',
      label: t('menu.books'),
      icon: <BookOpen className="h-5 w-5" />,
      onClick: () => {
        setIsMobilePickerOpen(true);
        setMobileSelectionTab('book');
      },
      active: true,
    },
    {
      id: 'search',
      label: t('app.search_book'),
      icon: <Search className="h-5 w-5" />,
      onClick: () => onOpenSearch?.(),
    },
    {
      id: 'plans',
      label: currentLanguage.startsWith('en') ? 'Plans' : 'Planes',
      icon: <Calendar className="h-5 w-5" />,
      onClick: () => onOpenPlans?.(),
    },
    {
      id: 'favorites',
      label: t('menu.favorites'),
      icon: <Heart className="h-5 w-5" />,
      onClick: () => onOpenFavorites?.(),
    },
    {
      id: 'user',
      label: currentLanguage.startsWith('en') ? 'User' : 'Usuario',
      icon: <User className="h-5 w-5" />,
      onClick: () => onOpenUser?.(),
    },
  ];
  const multiSelectCopy = currentLanguage.startsWith('en')
    ? {
        action: 'Select several',
        hint: 'Tap verses to add them',
        open: 'Open verse',
        share: 'Share selection',
        copy: 'Copy selection',
        cancel: 'Cancel',
        copied: 'Verses copied',
        selected: 'selected',
      }
    : {
        action: 'Seleccionar varios',
        hint: 'Toca versículos para agregarlos',
        open: 'Abrir versículo',
        share: 'Compartir selección',
        copy: 'Copiar selección',
        cancel: 'Cancelar',
        copied: 'Versículos copiados',
        selected: 'seleccionados',
      };
  const readerActionCopy = currentLanguage.startsWith('en')
    ? {
        highlight: 'Highlight',
        save: 'Save',
        read: 'Read',
        share: 'Share',
        copy: 'Copy',
        multi: 'Select several',
      }
    : {
        highlight: 'Resaltar',
        save: 'Guardar',
        read: 'Leer',
        share: 'Compartir',
        copy: 'Copiar',
        multi: 'Seleccionar varios',
      };
  const activeVerseNumber = selectedVerse?.number
    ?? chapterData?.vers.find((currentVerse) => currentVerse.id === focusedVerseId)?.number
    ?? chapterData?.vers[0]?.number
    ?? 1;
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 1024;
  const isVerseActionMenuVisible = Boolean(selectedVerse && !isMultiSelectMode && !isMobilePickerOpen);
  const aboutSheetSurface = isDarkMode
    ? 'border-white/10 bg-[#07162b] text-white'
    : 'border-olive/20 bg-paper text-ink';
  const aboutSheetBorder = isDarkMode ? 'border-white/10' : 'border-olive/10';
  const aboutSheetSubtle = isDarkMode ? 'text-[#b9d6f8]' : 'text-olive/45';
  const aboutCardSurface = isDarkMode ? 'border-white/10 bg-[#0d223f]/72' : 'border-olive/10 bg-paper-light';
  const aboutValueCardSurface = isDarkMode ? 'border-white/10 bg-[#10284f]' : 'border-olive/10 bg-white/80';
  const aboutBodyTone = isDarkMode ? 'text-[#dcecff]' : 'text-olive/80';
  const aboutValueTitleTone = isDarkMode ? 'text-white' : 'text-olive';
  const aboutValueBodyTone = isDarkMode ? 'text-[#dcecff]' : 'text-olive/75';
  const aboutMetaValueTone = isDarkMode ? 'text-white' : 'text-olive';
  const selectThemeStyle = { colorScheme: isDarkMode ? 'dark' : 'light' } as const;
  const optionThemeStyle = {
    color: isDarkMode ? '#f8fafc' : '#102542',
    backgroundColor: isDarkMode ? '#0d1016' : '#f5f1e6',
  };

  const getMobileVerseFocusOffsets = () => {
    const fallbackOffsets = isVerseActionMenuVisible
      ? { topOffset: 104, bottomOffset: 248 }
      : isMultiSelectMode
        ? { topOffset: 104, bottomOffset: 196 }
        : { topOffset: 104, bottomOffset: 152 };

    const containerRect = mainScrollRef.current?.getBoundingClientRect();
    if (!containerRect) {
      return fallbackOffsets;
    }

    const headerRect = mobileHeaderRef.current?.getBoundingClientRect();
    const actionSheetRect = mobileActionSheetRef.current?.getBoundingClientRect();
    const maxTopOffset = Math.max(containerRect.height * 0.45, fallbackOffsets.topOffset);
    const maxBottomOffset = Math.max(containerRect.height * 0.55, fallbackOffsets.bottomOffset);

    let topOffset = headerRect
      ? Math.min(
          Math.max((headerRect.bottom - containerRect.top) + 18, fallbackOffsets.topOffset),
          maxTopOffset,
        )
      : fallbackOffsets.topOffset;

    let bottomOffset = actionSheetRect
      ? Math.min(
          Math.max((containerRect.bottom - actionSheetRect.top) + 18, fallbackOffsets.bottomOffset),
          maxBottomOffset,
        )
      : fallbackOffsets.bottomOffset;

    const maxCombinedOffset = Math.max(containerRect.height - 96, fallbackOffsets.topOffset + fallbackOffsets.bottomOffset);
    if (topOffset + bottomOffset > maxCombinedOffset) {
      bottomOffset = Math.max(fallbackOffsets.bottomOffset, maxCombinedOffset - topOffset);
    }

    return { topOffset, bottomOffset };
  };

  const closeAboutDialog = () => {
    setIsAboutOpen(false);
    setAboutSection(null);
  };

  const closeFeatureMenu = () => {
    setIsFeatureMenuOpen(false);
  };

  const openAboutDialog = (section?: AboutSectionId) => {
    setAboutSection(section ?? null);
    setIsAboutOpen(true);
    closeFeatureMenu();
  };

  const openSettingsPanel = () => {
    setIsSettingsOpen(true);
    closeFeatureMenu();
  };

  const renderFeatureMenu = (className: string) => (
    <AnimatePresence>
      {isFeatureMenuOpen && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={closeFeatureMenu} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10, x: 20 }}
            className={className}
          >
            <MenuNavItem
              icon={isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              label={isDarkMode ? t('menu.light_mode') : t('menu.dark_mode')}
              onClick={() => { onToggleDarkMode(); closeFeatureMenu(); }}
            />
            <MenuNavItem
              icon={isPlaying && isReadingVerse === null ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              label={isPlaying && isReadingVerse === null ? t('audio.stop') : t('audio.read')}
              onClick={() => { playChapter(); closeFeatureMenu(); }}
            />
            <MenuNavItem
              icon={<BookmarkIcon className="w-4 h-4" />}
              label={t('verses.bookmark_chapter')}
              onClick={() => {
                if (selectedBook && chapterData) {
                  onAddBookmark(selectedBook.abrev, chapterData.chapter);
                }
                closeFeatureMenu();
              }}
            />
            <div className="mx-2 my-1 h-px bg-olive/10" />
            <MenuNavItem icon={<Settings className="w-4 h-4" />} label={t('menu.settings')} onClick={openSettingsPanel} />
            <MenuNavItem icon={<BookOpen className="w-4 h-4" />} label={t('menu.daily_challenges')} onClick={() => { onOpenDailyExperience?.(); closeFeatureMenu(); }} />
            <MenuNavItem icon={<Heart className="w-4 h-4" />} label={t('menu.favorites')} onClick={() => { onOpenFavorites?.(); closeFeatureMenu(); }} />
            {onOpenGame && <MenuNavItem icon={<Gamepad2 className="w-4 h-4" />} label={t('menu.game')} onClick={() => { onOpenGame(); closeFeatureMenu(); }} />}
            <MenuNavItem icon={<Share2 className="w-4 h-4" />} label={t('menu.share')} onClick={() => { handleShare(); closeFeatureMenu(); }} />
            <div className="mx-2 my-1 h-px bg-olive/10" />
            <MenuNavItem icon={<ArrowRight className="w-4 h-4" />} label={t('menu.mission')} onClick={() => openAboutDialog('mission')} />
            <MenuNavItem icon={<ArrowRight className="w-4 h-4" />} label={t('menu.vision')} onClick={() => openAboutDialog('vision')} />
            <MenuNavItem icon={<ArrowRight className="w-4 h-4" />} label={t('menu.values')} onClick={() => openAboutDialog('values')} />
            <MenuNavItem icon={<Info className="w-4 h-4" />} label={t('menu.about')} onClick={() => openAboutDialog()} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  useEffect(() => {
    if (!isAboutOpen || !aboutSection) {
      return;
    }

    const targetRef =
      aboutSection === 'mission'
        ? missionSectionRef
        : aboutSection === 'vision'
          ? visionSectionRef
          : valuesSectionRef;

    const scrollToTarget = () => {
      targetRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    };

    const initialTimer = window.setTimeout(scrollToTarget, 80);
    const settleTimer = window.setTimeout(scrollToTarget, 260);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(settleTimer);
    };
  }, [aboutSection, isAboutOpen]);

  useEffect(() => {
    if (chapterData && !selectedVerse && mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [chapterData?.chapter, selectedBook?.abrev]);

  useEffect(() => {
    setIsMultiSelectMode(false);
    setMultiSelectedVerseNumbers([]);
  }, [chapterData?.chapter, selectedBook?.abrev]);

  useEffect(() => {
    if (!selectedVerse && !isMultiSelectMode) {
      setMultiSelectedVerseNumbers([]);
    }
  }, [isMultiSelectMode, selectedVerse]);

  useEffect(() => {
    if (!readerSelectorRequestId) {
      return;
    }

    setIsMobilePickerOpen(true);
    setMobileSelectionTab('book');
    setMobileBookSearchTerm('');
    setMobileBookTestamentFilter(selectedBook?.testament.toLowerCase().includes('nuevo') || selectedBook?.testament.toLowerCase().includes('new') ? 'new' : 'old');
  }, [readerSelectorRequestId]);

  useEffect(() => {
    return () => {
      cancelSpeech();
      if (focusRetryTimerRef.current !== null) {
        window.clearTimeout(focusRetryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsVerseActionSheetExpanded(false);
  }, [selectedVerse?.id]);

  useEffect(() => {
    if (!selectedVerse) {
      setBlinkingVerseId(null);
      return;
    }

    setBlinkingVerseId(selectedVerse.id);
    const timer = window.setTimeout(() => {
      setBlinkingVerseId(null);
    }, 1700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedVerse?.id]);

  const stopAudio = () => {
    cancelSpeech();
    setIsPlaying(false);
    setIsReadingVerse(null);
  };

  const copyTextToClipboard = async (text: string, successMessage: string) => {
    if (!navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      window.alert(successMessage);
    } catch (error) {
      console.error('Error copying verse:', error);
    }
  };

  const copyVerseToClipboard = async (verse: Verse) => {
    if (!selectedBook || !chapterData) {
      return;
    }

    const reference = `${selectedBook.names[0]} ${chapterData.chapter}:${verse.number}`;
    const text = `${reference}\n${verse.verse}`;

    await copyTextToClipboard(text, t('app.verse_copied'));
  };

  const copySelectedVersesToClipboard = async () => {
    if (!selectedBook || !chapterData || multiSelectedVerseNumbers.length === 0) {
      return;
    }

    const selectedVerses = multiSelectedVerseNumbers
      .map((verseNumber) => chapterData.vers.find((verse) => verse.number === verseNumber))
      .filter((verse): verse is Verse => Boolean(verse));

    if (selectedVerses.length === 0) {
      return;
    }

    const text = selectedVerses
      .map((verse) => `${selectedBook.names[0]} ${chapterData.chapter}:${verse.number}\n${verse.verse}`)
      .join('\n\n');

    await copyTextToClipboard(text, multiSelectCopy.copied);
    setIsMultiSelectMode(false);
    setMultiSelectedVerseNumbers([]);
  };

  const shareSelectedVerses = async () => {
    if (!selectedBook || !chapterData || multiSelectedVerseNumbers.length === 0) {
      return;
    }

    const selectedVerses = multiSelectedVerseNumbers
      .map((verseNumber) => chapterData.vers.find((verse) => verse.number === verseNumber))
      .filter((verse): verse is Verse => Boolean(verse));

    if (selectedVerses.length === 0) {
      return;
    }

    const firstVerse = selectedVerses[0]?.number;
    const lastVerse = selectedVerses[selectedVerses.length - 1]?.number;
    const verseRange = firstVerse === lastVerse ? String(firstVerse) : `${firstVerse}-${lastVerse}`;
    const reference = `${selectedBook.names[0]} ${chapterData.chapter}:${verseRange}`;
    const verseBody = selectedVerses
      .map((verse) => `${verse.number}. ${verse.verse}`)
      .join('\n');
    const shareUrl = getReaderShareUrl({
      bookAbrev: selectedBook.abrev,
      chapter: chapterData.chapter,
      verseNumber: selectedVerses[0]?.number,
    });
    const text = [reference, verseBody, shareUrl].filter(Boolean).join('\n\n');

    await onShareContent({
      title: reference,
      text,
      url: shareUrl,
    });

    setIsMultiSelectMode(false);
    setMultiSelectedVerseNumbers([]);
  };

  const startMultiSelect = () => {
    setIsVerseActionSheetExpanded(false);
    setIsMultiSelectMode(true);
    setMultiSelectedVerseNumbers(selectedVerse ? [selectedVerse.number] : []);
  };

  const stopMultiSelect = () => {
    setIsMultiSelectMode(false);
    setMultiSelectedVerseNumbers([]);
  };

  const toggleVerseMultiSelection = (verse: Verse) => {
    setFocusedVerseId(verse.id);
    setMultiSelectedVerseNumbers((currentSelection) => {
      if (currentSelection.includes(verse.number)) {
        return currentSelection.filter((verseNumber) => verseNumber !== verse.number);
      }

      return [...currentSelection, verse.number].sort((left, right) => left - right);
    });
  };

  const isOldTestamentBook = (book: Book) => {
    const testament = book.testament.toLowerCase();
    return testament.includes('antiguo') || testament.includes('old');
  };

  const pickerSearchTerm = mobileBookSearchTerm.trim().toLowerCase();
  const visibleBooks = pickerSearchTerm
    ? books.filter((book) => book.names.some((name) => name.toLowerCase().includes(pickerSearchTerm)) || book.abrev.toLowerCase().includes(pickerSearchTerm))
    : books;
  const oldTestamentBooks = visibleBooks.filter((book) => isOldTestamentBook(book));
  const newTestamentBooks = visibleBooks.filter((book) => !isOldTestamentBook(book));
  const filteredMobileBooks = mobileBookTestamentFilter === 'old' ? oldTestamentBooks : newTestamentBooks;

  const handleOpenMobilePicker = (tab: 'book' | 'chapter' | 'verse' = 'book') => {
    setIsMobilePickerOpen(true);
    setMobileSelectionTab(tab);

    if (tab === 'book') {
      setMobileBookTestamentFilter(selectedBook && !isOldTestamentBook(selectedBook) ? 'new' : 'old');
    }
  };

  const handlePickBook = (book: Book) => {
    onSelectBook(book);
    setFocusedVerseId(null);
    setMobileSelectionTab('chapter');
  };

  const handlePickChapter = (chapter: number) => {
    onSelectChapter(chapter);
    setFocusedVerseId(null);
    setMobileSelectionTab('verse');
  };

  const selectVerseNumber = (verseNumber: number, shouldSelect = true) => {
    const verse = chapterData?.vers.find((currentVerse) => currentVerse.number === verseNumber);
    if (!verse) {
      return false;
    }

    setFocusedVerseId(verse.id);

    if (shouldSelect) {
      onSelectVerse(verse);
    } else {
      onClearSelectedVerse?.();
    }

    return true;
  };

  const clearScheduledVerseFocus = () => {
    if (focusRetryTimerRef.current !== null) {
      window.clearTimeout(focusRetryTimerRef.current);
      focusRetryTimerRef.current = null;
    }
  };

  const isVerseElementInFocusZone = (verseEl: HTMLElement) => {
    if (mainScrollRef.current && isMobileViewport) {
      const containerRect = mainScrollRef.current.getBoundingClientRect();
      const verseRect = verseEl.getBoundingClientRect();
      const { topOffset, bottomOffset } = getMobileVerseFocusOffsets();
      const focusTop = containerRect.top + topOffset;
      const focusBottom = containerRect.bottom - bottomOffset;

      return verseRect.top >= focusTop - 12 && verseRect.bottom <= focusBottom + 12;
    }

    if (typeof window === 'undefined') {
      return true;
    }

    const verseRect = verseEl.getBoundingClientRect();
    return verseRect.top >= 72 && verseRect.bottom <= window.innerHeight - 72;
  };

  const requestVerseFocus = (verseNumber: number, initialDelay = 0) => {
    clearScheduledVerseFocus();

    let attempts = 0;
    const maxAttempts = 14;

    const runFocus = () => {
      const scrollBehavior: ScrollBehavior = attempts === 0 ? 'smooth' : 'auto';
      const didFocus = focusVerseElement(verseNumber, scrollBehavior);
      const verseEl = verseRefs.current[verseNumber];
      const isSettled = didFocus && verseEl ? isVerseElementInFocusZone(verseEl) : false;

      if (isSettled && attempts >= 1) {
        focusRetryTimerRef.current = null;
        return;
      }

      if (attempts >= maxAttempts) {
        focusRetryTimerRef.current = null;
        return;
      }

      attempts += 1;
      focusRetryTimerRef.current = window.setTimeout(runFocus, isSettled ? 220 : 140);
    };

    focusRetryTimerRef.current = window.setTimeout(runFocus, initialDelay);
  };

  const handlePickVerse = (verseNumber: number) => {
    const shouldDelayFocus = isMobilePickerOpen;

    if (!selectVerseNumber(verseNumber)) {
      return;
    }

    setIsMobilePickerOpen(false);
    requestVerseFocus(verseNumber, shouldDelayFocus ? 140 : 0);
  };

  const openSelectedVerseFromPicker = () => {
    const verseNumber = multiSelectedVerseNumbers[multiSelectedVerseNumbers.length - 1];
    if (!verseNumber) {
      return;
    }

    if (!selectVerseNumber(verseNumber)) {
      return;
    }

    setIsMobilePickerOpen(false);
    setIsMultiSelectMode(false);
    setMultiSelectedVerseNumbers([]);

    requestVerseFocus(verseNumber, 140);
  };

  const handleShare = async () => {
    const reference = selectedBook && chapterData
      ? `${selectedBook.names[0]} ${chapterData.chapter}${selectedVerse ? `:${selectedVerse.number}` : ''}`
      : t('app.title');
    const shareUrl = selectedBook && chapterData && selectedVerse
      ? getReaderShareUrl({
          bookAbrev: selectedBook.abrev,
          chapter: chapterData.chapter,
          verseNumber: selectedVerse.number,
        })
      : appShareUrl;
    const text = selectedVerse
      ? buildVerseShareText({
          reference,
          verseText: selectedVerse.verse,
          shareUrl,
        })
      : selectedBook && chapterData
        ? [reference, `${t('app.title')} · ${reference}`, shareUrl].filter(Boolean).join('\n\n')
        : [t('app.description'), shareUrl].filter(Boolean).join('\n\n');

    await onShareContent({
      title: reference,
      text,
      url: shareUrl,
    });
  };

  const focusVerseElement = (verseNumber: number, behavior: ScrollBehavior = 'smooth') => {
    const verseEl = verseRefs.current[verseNumber];
    if (!verseEl) {
      return false;
    }

    if (mainScrollRef.current && isMobileViewport) {
      const containerRect = mainScrollRef.current.getBoundingClientRect();
      const verseRect = verseEl.getBoundingClientRect();
      const { topOffset, bottomOffset } = getMobileVerseFocusOffsets();
      const visibleHeight = Math.max(containerRect.height - topOffset - bottomOffset, verseRect.height);
      const verseTopInContainer = mainScrollRef.current.scrollTop + (verseRect.top - containerRect.top);
      const targetTop = verseTopInContainer - topOffset - ((visibleHeight - verseRect.height) / 2);

      mainScrollRef.current.scrollTo({
        top: Math.max(targetTop, 0),
        behavior,
      });
    } else {
      verseEl.scrollIntoView({ behavior, block: 'center' });
    }

    verseEl.focus({ preventScroll: true });
    return true;
  };

  const playChapter = () => {
    if (!chapterData || !isSpeechAvailable) return;
    if (isPlaying && isReadingVerse === null) {
      stopAudio();
      return;
    }
    stopAudio();
    const text = `${chapterData.name} ${chapterData.chapter}. ${chapterData.vers.map(v => v.verse).join('. ')}`;
    const didSpeak = speakText({
      text,
      lang: speechLanguage,
      voiceURI,
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });

    if (!didSpeak) {
      return;
    }

    setIsPlaying(true);
  };

  const playVerse = (verseText: string, verseNumber: number) => {
    if (!isSpeechAvailable) {
      return;
    }

    if (isReadingVerse === verseNumber) {
      stopAudio();
      return;
    }
    stopAudio();
    const didSpeak = speakText({
      text: verseText,
      lang: speechLanguage,
      voiceURI,
      onEnd: () => setIsReadingVerse(null),
      onError: () => setIsReadingVerse(null),
    });

    if (!didSpeak) {
      return;
    }

    setIsReadingVerse(verseNumber);
  };

  // Play audio when signaled from outside (e.g., from favorites in sidebar)
  useEffect(() => {
    if (favoriteToPlay) {
      const { bookAbrev, chapter, verseNumber } = favoriteToPlay;
      
      const performPlayback = async () => {
        try {
          if (!isSpeechAvailable) {
            return;
          }

          const book = books.find(b => b.abrev === bookAbrev);
          if (!book) return;
          
          const data = await fetchChapter(book.names[0], chapter, currentLanguage);
          if (!data) return;

          if (verseNumber) {
            const verse = data.vers.find(v => v.number === verseNumber);
            if (verse) {
              playVerse(verse.verse, verse.number);
            }
          } else {
            stopAudio();
            const text = `${data.name} ${data.chapter}. ${data.vers.map(v => v.verse).join('. ')}`;
            const didSpeak = speakText({
              text,
              lang: speechLanguage,
              voiceURI,
              onEnd: () => setIsPlaying(false),
              onError: () => setIsPlaying(false),
            });

            if (!didSpeak) {
              return;
            }

            setIsPlaying(true);
          }
        } catch (error) {
          console.error("Error playing favorite audio:", error);
        } finally {
          onFavoritePlayed?.();
        }
      };

      performPlayback();
    }
  }, [favoriteToPlay, books, currentLanguage, isSpeechAvailable, speechLanguage, voiceURI]);

  // Sync focused verse with selected verse when it changes from external sources
  useEffect(() => {
    if (selectedVerse) {
      setFocusedVerseId(selectedVerse.id);
    }
  }, [selectedVerse?.id]);

  const searchTerm = (headerSearchTerm || verseSearchTerm).trim();
  const normalizedSearchTerm = searchTerm.toLowerCase();
  const verseLookupNumber = /^\d+$/.test(searchTerm) ? Number(searchTerm) : null;
  const shouldSearchGlobally = searchTerm.length >= 2 && /[^\d\s:]/.test(searchTerm);

  const filteredSearchBooks = searchTerm
    ? books.filter((book) =>
        book.names.some((name) => name.toLowerCase().includes(normalizedSearchTerm)) ||
        book.abrev.toLowerCase().includes(normalizedSearchTerm)
      )
    : [];

  const filteredVerses = verseLookupNumber && chapterData
    ? chapterData.vers.filter((verse) => verse.number === verseLookupNumber)
    : [];
  const visibleGlobalVerseResults = globalSearchResults?.results || [];
  const displayedResultsCount = filteredSearchBooks.length + filteredVerses.length + visibleGlobalVerseResults.length;
  const totalResultsCount = filteredSearchBooks.length + filteredVerses.length + (globalSearchResults?.total || 0);

  const highlightSearchText = (text: string) => {
    if (!searchTerm || verseLookupNumber) {
      return text;
    }

    const escapedQuery = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    const parts = text.split(regex);

    if (parts.length === 1) {
      return text;
    }

    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase()
        ? (
            <mark key={`${part}-${index}`} className="rounded bg-gold/20 px-0.5 text-ink">
              {part}
            </mark>
          )
        : (
            <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
          )
    );
  };

  useEffect(() => {
    if (!isSearchOpen || !searchTerm || !shouldSearchGlobally) {
      setGlobalSearchResults(null);
      setIsGlobalSearchLoading(false);
      return;
    }

    let isCancelled = false;
    setIsGlobalSearchLoading(true);

    const timer = window.setTimeout(() => {
      searchBible(searchTerm, currentLanguage)
        .then((results) => {
          if (!isCancelled) {
            setGlobalSearchResults(results);
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            console.error('Global Bible search failed:', error);
            setGlobalSearchResults({
              query: searchTerm,
              total: 0,
              results: [],
              truncated: false,
            });
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsGlobalSearchLoading(false);
          }
        });
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentLanguage, isSearchOpen, searchTerm, shouldSearchGlobally]);

  useEffect(() => {
    if (!isSearchOpen || !searchTerm || verseLookupNumber || searchTerm.trim().length < 2) {
      return;
    }

    const timer = window.setTimeout(() => {
      onTrackSearchQuery?.(searchTerm);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isSearchOpen, onTrackSearchQuery, searchTerm, verseLookupNumber]);

  // Scroll active elements into view and manage DOM focus
  useEffect(() => {
    if (selectedVerse) {
      requestVerseFocus(selectedVerse.number, isMobileViewport ? 180 : 320);
      return clearScheduledVerseFocus;
    }

    clearScheduledVerseFocus();
    return undefined;
  }, [chapterData?.chapter, isMobileViewport, selectedVerse?.id, selectedVerse?.number, verseFocusRequestId]);

  useEffect(() => {
    if (selectedVerse && versesScrollRef.current) {
      const activeEl = versesScrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedVerse?.number]);

  useEffect(() => {
    if (selectedBook && booksScrollRef.current) {
      const activeEl = booksScrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedBook]);

  useEffect(() => {
    if (chapterData && chaptersScrollRef.current) {
      const activeEl = chaptersScrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [chapterData?.chapter]);

  const scrollHorizontally = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 150;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const goToChapter = (direction: 'next' | 'prev') => {
    if (!chapterData) return;
    const current = chapterData.chapter;
    if (direction === 'next' && current < chapterData.num_chapters) {
      onSelectChapter(current + 1);
    } else if (direction === 'prev' && current > 1) {
      onSelectChapter(current - 1);
    }
  };

  const handleSidebarMenuOpen = () => {
    setIsMobilePickerOpen(false);
    setIsFeatureMenuOpen(false);
    onMenuClick();
  };

  const highlightColors = [
    { name: 'Amarillo', value: 'rgba(252, 211, 77, 0.4)' },
    { name: 'Azul', value: 'rgba(59, 130, 246, 0.4)' },
    { name: 'Rojo', value: 'rgba(239, 68, 68, 0.4)' },
    { name: 'Verde', value: 'rgba(34, 197, 94, 0.4)' },
    { name: 'Violeta', value: 'rgba(168, 85, 247, 0.4)' },
    { name: 'Naranja', value: 'rgba(251, 146, 60, 0.4)' },
    { name: 'Rosa', value: 'rgba(244, 114, 182, 0.4)' },
    { name: 'Cian', value: 'rgba(34, 211, 238, 0.4)' },
    { name: 'Lima', value: 'rgba(163, 230, 53, 0.4)' },
    { name: 'Esmeralda', value: 'rgba(52, 211, 153, 0.4)' },
  ];

  const getVerseHighlight = (vNum: number) => {
    if (!selectedBook || !chapterData) return null;
    const vId = `${selectedBook.abrev}-${chapterData.chapter}-${vNum}`;
    return highlights.find(h => h.verseId === vId)?.color || null;
  };

  const isChapterBookmarked = () => {
    if (!selectedBook || !chapterData) return false;
    return bookmarks.some(b => b.bookAbrev === selectedBook.abrev && b.chapter === chapterData.chapter && !b.verseNumber);
  };

  const isVerseBookmarked = (vNum: number) => {
    if (!selectedBook || !chapterData) return false;
    return bookmarks.some(b => b.bookAbrev === selectedBook.abrev && b.chapter === chapterData.chapter && b.verseNumber === vNum);
  };

  const isCurrentSelectionBookmarked = () => {
    if (selectedVerse) {
      return isVerseBookmarked(selectedVerse.number);
    }
    return isChapterBookmarked();
  };

  const toggleAudio = () => {
    if (isPlaying || isReadingVerse !== null) {
      stopAudio();
      return;
    }
    
    if (selectedVerse) {
      playVerse(selectedVerse.verse, selectedVerse.number);
    } else {
      playChapter();
    }
  };
  
  if (isLoading && !isMobilePickerOpen) {
    return (
      <div className="flex-1 h-screen flex items-center justify-center bg-[#111820] transition-colors duration-300 lg:bg-paper">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ ease: "linear", duration: 2, repeat: Infinity }}
        >
          <BookOpen className="w-8 h-8 text-olive/30" />
        </motion.div>
      </div>
    );
  }


  return (
    <div 
      ref={mainScrollRef}
      className="relative flex-1 h-screen overflow-y-auto bg-[#111820] transition-colors duration-300 lg:bg-paper"
    >
      <div ref={mobileHeaderRef} className="sticky top-0 z-40 border-b border-white/10 bg-[#050b14]/96 px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onGoBack ?? onMenuClick}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label={t('app.back')}
            title={t('app.back')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onGoHome?.()}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label={t('app.home')}
            title={t('app.home')}
          >
            <House className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleSidebarMenuOpen}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#2a66b6] bg-[#12345e] text-[#f0c15c]"
            aria-label={t('home.open_menu')}
            title={t('home.open_menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onOpenSearch?.()}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label={t('app.search_book')}
            title={t('app.search_book')}
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleAudio}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#f0c15c]"
            aria-label={t('audio.read')}
            title={t('audio.read')}
          >
            {isPlaying && isReadingVerse === null ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <div className="relative flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenMobilePicker(isMobilePickerOpen ? mobileSelectionTab : 'book')}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white"
            >
              <span className="truncate">RV1960</span>
              <ChevronDown className="h-4 w-4 text-[#f0c15c]" />
            </button>
            <button
              type="button"
              onClick={() => setIsFeatureMenuOpen((current) => !current)}
              className={cn(
                'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-all',
                isFeatureMenuOpen ? 'border-[#f0c15c] bg-[#12345e] text-[#f0c15c]' : 'border-white/10 bg-white/5 text-white'
              )}
              aria-label={t('menu.more_options')}
              title={t('menu.more_options')}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {renderFeatureMenu('absolute right-0 top-14 z-[120] w-[min(84vw,17rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1626] py-2 shadow-2xl')}
          </div>
        </div>

        {isMobilePickerOpen ? (
          <div className="mt-4 grid grid-cols-3 border-b border-white/10">
            {([
              ['book', readerCopy.book],
              ['chapter', readerCopy.chapter],
              ['verse', readerCopy.verse],
            ] as const).map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setMobileSelectionTab(tabId)}
                className={cn(
                  'border-b-2 px-2 pb-3 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] transition-all',
                  mobileSelectionTab === tabId
                    ? 'border-[#8d72ff] text-[#8d72ff]'
                    : 'border-transparent text-white/55'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : chapterData ? (
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_4.9rem_4.9rem] gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenMobilePicker('book')}
              className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
            >
              <span className="truncate">{selectedBook?.names[0] ?? readerCopy.book}</span>
              <ChevronDown className="h-4 w-4 text-[#f0c15c]" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenMobilePicker('chapter')}
              className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
            >
              <span>{chapterData.chapter}</span>
              <ChevronDown className="h-4 w-4 text-[#f0c15c]" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenMobilePicker('verse')}
              className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white"
            >
              <span>{activeVerseNumber}</span>
              <ChevronDown className="h-4 w-4 text-[#f0c15c]" />
            </button>
          </div>
        ) : null}
      </div>

      {isMobilePickerOpen ? (
        <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+7.6rem)] pt-4 lg:hidden">
          {mobileSelectionTab === 'book' ? (
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                <input
                  type="text"
                  value={mobileBookSearchTerm}
                  onChange={(event) => setMobileBookSearchTerm(event.target.value)}
                  placeholder={currentLanguage.startsWith('en') ? 'Search' : 'Buscar'}
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/38"
                />
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                {filteredMobileBooks.length > 0 ? (
                  filteredMobileBooks.map((book, index) => (
                    <button
                      key={book.abrev}
                      type="button"
                      onClick={() => handlePickBook(book)}
                      className={cn(
                        'flex w-full items-center justify-between px-4 py-4 text-left text-lg font-medium transition-all',
                        index !== filteredMobileBooks.length - 1 && 'border-b border-white/10',
                        selectedBook?.abrev === book.abrev
                          ? 'bg-[#16263a] text-white'
                          : 'bg-transparent text-white/88'
                      )}
                    >
                      <span>{book.names[0]}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-5 text-sm text-white/62">
                    {currentLanguage.startsWith('en') ? 'No books found in this testament.' : 'No hay libros en este testamento con esa búsqueda.'}
                  </div>
                )}
              </div>

              <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 px-3 lg:hidden">
                <div className="pointer-events-auto mx-auto grid w-full max-w-[32rem] grid-cols-2 overflow-hidden rounded-[28px] border border-white/10 bg-[#11161f]/96 shadow-[0_-14px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => setMobileBookTestamentFilter('old')}
                    className={cn(
                      'flex min-h-[4.7rem] flex-col items-center justify-center px-3 text-center font-serif text-lg font-semibold transition-all',
                      mobileBookTestamentFilter === 'old'
                        ? 'bg-[#1b2230] text-[#e6c190]'
                        : 'bg-transparent text-white/62 hover:bg-white/6 hover:text-white'
                    )}
                  >
                    <span>{currentLanguage.startsWith('en') ? 'Old' : 'Antiguo'}</span>
                    <span>{currentLanguage.startsWith('en') ? 'Testament' : 'Testamento'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileBookTestamentFilter('new')}
                    className={cn(
                      'flex min-h-[4.7rem] flex-col items-center justify-center border-l border-white/10 px-3 text-center font-serif text-lg font-semibold transition-all',
                      mobileBookTestamentFilter === 'new'
                        ? 'bg-[#1b2230] text-[#e6c190]'
                        : 'bg-transparent text-white/62 hover:bg-white/6 hover:text-white'
                    )}
                  >
                    <span>{currentLanguage.startsWith('en') ? 'New' : 'Nuevo'}</span>
                    <span>{currentLanguage.startsWith('en') ? 'Testament' : 'Testamento'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : mobileSelectionTab === 'chapter' ? (
            selectedBook ? (
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((chapter) => (
                  <button
                    key={chapter}
                    type="button"
                    onClick={() => handlePickChapter(chapter)}
                    className={cn(
                      'flex min-h-[3.1rem] items-center justify-center rounded-[18px] border text-lg font-semibold transition-all',
                      chapterData?.chapter === chapter
                        ? 'border-[#2c6dc3] bg-[#16263a] text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/88'
                    )}
                  >
                    {chapter}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 text-sm text-white/62">{currentLanguage.startsWith('en') ? 'Choose a book first.' : 'Elige primero un libro.'}</p>
            )
          ) : chapterData && chapterData.chapter === selectedChapter && selectedBook ? (
            <div className="grid grid-cols-5 gap-3">
              {chapterData.vers.map((verse) => (
                <button
                  key={verse.id}
                  type="button"
                  onClick={() => {
                    void handlePickVerse(verse.number);
                  }}
                  className={cn(
                    'flex min-h-[3.1rem] items-center justify-center rounded-[18px] border text-lg font-semibold transition-all',
                    multiSelectedVerseNumbers.includes(verse.number)
                      ? 'border-[#f0c15c] bg-[#3b2f12]/80 text-white underline decoration-2 underline-offset-8'
                      : focusedVerseId === verse.id || selectedVerse?.id === verse.id
                        ? 'border-[#2c6dc3] bg-[#16263a] text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/88'
                  )}
                >
                  {verse.number}
                </button>
              ))}
            </div>
          ) : isLoading ? (
            <div className="flex min-h-[12rem] items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.03]">
              <p className="text-sm text-white/62">{currentLanguage.startsWith('en') ? 'Loading verses...' : 'Cargando versículos...'}</p>
            </div>
          ) : (
            <p className="px-1 text-sm text-white/62">{currentLanguage.startsWith('en') ? 'Choose a chapter first.' : 'Elige primero un capítulo.'}</p>
          )}
        </div>
      ) : null}

      {/* Dynamic Header with Quick Nav */}
      <div className="sticky top-0 hidden border-b border-olive/10 bg-paper/95 backdrop-blur-md shrink-0 z-40 lg:flex lg:flex-col">
        {/* Top bar: Menu + Book Name + Search + Settings */}
        <div className="flex items-center px-4 py-3 md:px-8 border-b border-olive/5">
          <div className="mr-3 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onGoBack ?? onMenuClick}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-olive/12 bg-paper-light text-olive transition-all hover:bg-olive hover:text-paper"
              aria-label={t('app.back')}
              title={t('app.back')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onGoHome?.()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-olive/12 bg-paper-light text-olive transition-all hover:bg-olive hover:text-paper"
              aria-label={t('app.home')}
              title={t('app.home')}
            >
              <House className="w-5 h-5" />
            </button>
          </div>

          <button onClick={handleSidebarMenuOpen} className="p-2 mr-3 bg-paper rounded-full text-olive shrink-0 sm:mr-4">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center flex-1 min-w-0 mr-2">
            {!isSearchOpen ? (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 min-w-0"
              >
                <div className="hidden items-center gap-1 shrink-0 sm:flex">
                  <button 
                    onClick={() => goToChapter('prev')}
                    disabled={!chapterData || chapterData.chapter <= 1}
                    className="flex items-center gap-1 px-2 py-1 text-olive hover:bg-olive/10 rounded-full disabled:opacity-20 transition-all font-sans text-[10px] font-bold uppercase tracking-tighter"
                    title={t('app.prev')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('app.prev')}</span>
                  </button>
                  <button 
                    onClick={() => goToChapter('next')}
                    disabled={!chapterData || chapterData.chapter >= chapterData.num_chapters}
                    className="flex items-center gap-1 px-2 py-1 text-olive hover:bg-olive/10 rounded-full disabled:opacity-20 transition-all font-sans text-[10px] font-bold uppercase tracking-tighter"
                    title={t('app.next')}
                  >
                    <span className="hidden sm:inline">{t('app.next')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <h1 className="font-serif text-lg md:text-2xl font-bold text-ink truncate flex-1 min-w-0">
                  {chapterData ? `${chapterData.name} ${chapterData.chapter}:${activeVerseNumber}` : t('app.title')}
                </h1>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                className="relative flex-1"
              >
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-olive/50" />
                <input 
                  autoFocus
                  type="text"
                  placeholder={t('app.search_book')}
                  value={searchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHeaderSearchTerm(val);
                    setVerseSearchTerm(val);
                  }}
                  className="w-full bg-paper-light border border-olive/20 rounded-full py-2 pl-9 pr-10 text-sm focus:outline-none focus:border-gold transition-colors font-sans text-ink"
                />
                <button 
                  onClick={() => { 
                    setIsSearchOpen(false); 
                    setHeaderSearchTerm(''); 
                    setVerseSearchTerm('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-olive/40 hover:text-olive"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Search Results Dropdown */}
                {searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-paper border border-olive/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 no-scrollbar">
                    <div className="px-4 py-2 border-b border-olive/5 bg-paper-light/80">
                      <p className="font-sans text-[10px] uppercase tracking-widest text-olive/50">
                        {isGlobalSearchLoading
                          ? t('app.searching_bible')
                          : t('app.search_results_count', { shown: displayedResultsCount, count: totalResultsCount })}
                      </p>
                    </div>

                    {filteredSearchBooks.length > 0 && (
                      <>
                        <div className="px-4 pt-3 pb-1 text-[10px] font-sans font-bold uppercase tracking-widest text-olive/40">
                          {t('menu.books')}
                        </div>
                        {filteredSearchBooks.map((book) => (
                          <button
                            key={book.abrev}
                            onClick={() => {
                              onSelectBook(book);
                              setIsSearchOpen(false);
                              setHeaderSearchTerm('');
                              setVerseSearchTerm('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gold/5 border-b border-olive/5 last:border-0 transition-colors flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="font-sans font-bold text-sm text-ink">{highlightSearchText(book.names[0])}</span>
                              <span className="font-sans text-[10px] text-olive/40 uppercase tracking-tighter">{book.testament}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gold/40" />
                          </button>
                        ))}
                      </>
                    )}

                    {filteredVerses.length > 0 && (
                      <>
                        <div className="px-4 pt-3 pb-1 text-[10px] font-sans font-bold uppercase tracking-widest text-olive/40">
                          {t('app.search_current_chapter')}
                        </div>
                        {filteredVerses.map((verse) => (
                          <button
                            key={verse.id}
                            onClick={() => {
                              setFocusedVerseId(verse.id);
                              requestVerseFocus(verse.number);
                              setIsSearchOpen(false);
                              setHeaderSearchTerm('');
                              setVerseSearchTerm('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gold/5 border-b border-olive/5 last:border-0 transition-colors"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-sans font-bold text-[10px] text-gold uppercase tracking-widest">Versículo {verse.number}</span>
                              <p className="font-serif text-sm text-ink line-clamp-2 italic leading-relaxed">
                                "{highlightSearchText(verse.verse)}"
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {visibleGlobalVerseResults.length > 0 && (
                      <>
                        <div className="px-4 pt-3 pb-1 text-[10px] font-sans font-bold uppercase tracking-widest text-olive/40">
                          {t('app.search_all_bible')}
                        </div>
                        {visibleGlobalVerseResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              onNavigateToVerse?.(result.bookAbrev, result.chapter, result.verseNumber);
                              setIsSearchOpen(false);
                              setHeaderSearchTerm('');
                              setVerseSearchTerm('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gold/5 border-b border-olive/5 last:border-0 transition-colors"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-sans font-bold text-[10px] text-gold uppercase tracking-widest">
                                {highlightSearchText(result.bookName)} {result.chapter}:{result.verseNumber}
                              </span>
                              <p className="font-serif text-sm text-ink line-clamp-2 italic leading-relaxed">
                                "{highlightSearchText(result.verseText)}"
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {!isGlobalSearchLoading && filteredSearchBooks.length === 0 && filteredVerses.length === 0 && visibleGlobalVerseResults.length === 0 && (
                      <div className="p-4 text-center text-xs text-olive/40 font-sans italic">{t('app.search_results')}</div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-1 relative">
             {!isSearchOpen && (
               <button 
                 onClick={() => setIsSearchOpen(true)}
                 className="p-2 text-olive hover:bg-olive/5 rounded-full transition-all"
                 title={t('app.search_book')}
               >
                 <Search className="w-5 h-5" />
               </button>
             )}

             {!isSearchOpen && (
               <button 
                 onClick={handleShare}
                 className="p-2 text-olive hover:bg-olive/5 rounded-full transition-all"
                 title={t('menu.share')}
               >
                 <Share2 className="w-5 h-5" />
               </button>
             )}

             <button 
               onClick={onToggleDarkMode}
               className="hidden p-2 bg-paper-light border border-olive/10 rounded-full text-olive hover:bg-olive hover:text-paper transition-all sm:flex"
               title={isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
             >
               {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
             </button>

             
             <button 
               onClick={() => {
                 if (selectedBook && chapterData) {
                   onAddBookmark(selectedBook.abrev, chapterData.chapter, selectedVerse?.number);
                 }
               }}
               disabled={isCurrentSelectionBookmarked()}
               className={cn(
                 "hidden sm:flex p-2 rounded-full border transition-all",
                 isCurrentSelectionBookmarked() ? "bg-gold/10 text-gold border-gold/20" : "bg-paper-light border-olive/10 text-olive hover:bg-gold hover:text-paper"
               )}
               title={selectedVerse ? "Añadir versículo a Favoritos" : "Añadir capítulo a Favoritos"}
             >
               <Heart className={cn("w-4 h-4", isCurrentSelectionBookmarked() && "fill-gold")} />
             </button>

             <button 
               onClick={() => setIsFeatureMenuOpen((current) => !current)}
               className={cn(
                 "p-2 rounded-full border transition-all",
                 isFeatureMenuOpen ? "bg-olive text-paper border-olive" : "bg-paper-light border-olive/10 text-olive hover:bg-olive hover:text-paper"
               )}
               title={t('menu.more_options')}
             >
               <MoreVertical className="w-4 h-4" />
             </button>
             {renderFeatureMenu('absolute top-12 right-0 z-[120] w-64 overflow-hidden rounded-2xl border border-olive/20 bg-paper py-2 shadow-2xl')}
          </div>
        </div>

        {chapterData && (
          <div className="border-t border-olive/5 bg-paper/70 px-4 py-4 md:px-8">
            <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 lg:grid-cols-[minmax(0,1fr)_7rem_7rem_9rem]">
              <details className={cn(
                'relative min-w-0 rounded-[26px] px-4 pb-3 pt-2 [&[open]>summary_svg]:rotate-180',
                isDarkMode
                  ? 'border border-white/10 bg-[#0d1016] shadow-[0_14px_28px_rgba(0,0,0,0.22)]'
                  : 'border border-olive/12 bg-paper shadow-[0_14px_28px_rgba(18,33,64,0.05)]'
              )}>
                <span className={cn(
                  'block text-[10px] font-bold uppercase tracking-[0.18em]',
                  isDarkMode ? 'text-white/45' : 'text-olive/45'
                )}>{readerCopy.book}</span>
                <summary
                  className={cn(
                    'mt-1 flex cursor-pointer list-none items-center justify-between gap-3 pr-8 font-serif text-lg font-bold outline-none [&::-webkit-details-marker]:hidden',
                    isDarkMode ? 'text-white' : 'text-ink'
                  )}
                  aria-label={readerCopy.openSelector}
                >
                  <span className="truncate">{selectedBook?.names[0] ?? readerCopy.book}</span>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold transition-transform" />
                </summary>

                <div
                  className={cn(
                    'absolute left-0 top-[calc(100%+0.75rem)] z-[130] w-[min(92vw,46rem)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[30px] border p-4 shadow-2xl',
                    isDarkMode
                      ? 'border-white/10 bg-[#0d1626] text-white shadow-[0_24px_70px_rgba(0,0,0,0.4)]'
                      : 'border-[#d8e4f2] bg-white text-[#102542] shadow-[0_24px_70px_rgba(21,53,91,0.18)]'
                  )}
                >
                  <div className="mb-2">
                    <p className={cn(
                      'text-[10px] font-bold uppercase tracking-[0.24em]',
                      isDarkMode ? 'text-[#8fc4ff]' : 'text-[#4d7bb3]'
                    )}>{readerCopy.book}</p>
                  </div>

                  <div className="grid max-h-[24rem] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
                    <section
                      className={cn(
                        'min-w-0 overflow-hidden rounded-[24px] border',
                        isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-[#dbe7f3] bg-[#f8fbff]'
                      )}
                    >
                      <div className={cn('border-b px-4 py-3', isDarkMode ? 'border-white/10 bg-[#10284f]/65' : 'border-[#dbe7f3] bg-white/92')}>
                        <p className={cn('text-xs font-bold uppercase tracking-[0.22em]', isDarkMode ? 'text-[#8fc4ff]' : 'text-[#4d7bb3]')}>
                          {readerCopy.old}
                        </p>
                      </div>
                      <div className="p-2">
                        {oldTestamentBooks.map((book) => {
                          const isActive = selectedBook?.abrev === book.abrev;

                          return (
                            <button
                              key={book.abrev}
                              type="button"
                              onClick={(event) => {
                                const detailsElement = event.currentTarget.closest('details');
                                if (detailsElement instanceof HTMLDetailsElement) {
                                  detailsElement.open = false;
                                }
                                setFocusedVerseId(null);
                                onSelectBook(book);
                              }}
                              className={cn(
                                'flex w-full items-center rounded-[18px] px-3 py-2.5 text-left font-sans text-sm transition-all',
                                isActive
                                  ? isDarkMode
                                    ? 'bg-[#17345f] text-white shadow-[0_10px_24px_rgba(8,22,42,0.32)]'
                                    : 'bg-[#e8f1fb] text-[#102542] shadow-[0_8px_20px_rgba(36,74,116,0.12)]'
                                  : isDarkMode
                                    ? 'text-white/82 hover:bg-white/6 hover:text-white'
                                    : 'text-[#153153] hover:bg-[#edf5ff]'
                              )}
                            >
                              <span className="truncate">{book.names[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section
                      className={cn(
                        'min-w-0 overflow-hidden rounded-[24px] border',
                        isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-[#dbe7f3] bg-[#f8fbff]'
                      )}
                    >
                      <div className={cn('border-b px-4 py-3', isDarkMode ? 'border-white/10 bg-[#10284f]/65' : 'border-[#dbe7f3] bg-white/92')}>
                        <p className={cn('text-xs font-bold uppercase tracking-[0.22em]', isDarkMode ? 'text-[#8fc4ff]' : 'text-[#4d7bb3]')}>
                          {readerCopy.new}
                        </p>
                      </div>
                      <div className="p-2">
                        {newTestamentBooks.map((book) => {
                          const isActive = selectedBook?.abrev === book.abrev;

                          return (
                            <button
                              key={book.abrev}
                              type="button"
                              onClick={(event) => {
                                const detailsElement = event.currentTarget.closest('details');
                                if (detailsElement instanceof HTMLDetailsElement) {
                                  detailsElement.open = false;
                                }
                                setFocusedVerseId(null);
                                onSelectBook(book);
                              }}
                              className={cn(
                                'flex w-full items-center rounded-[18px] px-3 py-2.5 text-left font-sans text-sm transition-all',
                                isActive
                                  ? isDarkMode
                                    ? 'bg-[#17345f] text-white shadow-[0_10px_24px_rgba(8,22,42,0.32)]'
                                    : 'bg-[#e8f1fb] text-[#102542] shadow-[0_8px_20px_rgba(36,74,116,0.12)]'
                                  : isDarkMode
                                    ? 'text-white/82 hover:bg-white/6 hover:text-white'
                                    : 'text-[#153153] hover:bg-[#edf5ff]'
                              )}
                            >
                              <span className="truncate">{book.names[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </div>
              </details>

              <label className={cn(
                'relative rounded-[26px] px-4 pb-3 pt-2',
                isDarkMode
                  ? 'border border-white/10 bg-[#0d1016] shadow-[0_14px_28px_rgba(0,0,0,0.22)]'
                  : 'border border-olive/12 bg-paper shadow-[0_14px_28px_rgba(18,33,64,0.05)]'
              )}>
                <span className={cn(
                  'block text-[10px] font-bold uppercase tracking-[0.18em]',
                  isDarkMode ? 'text-white/45' : 'text-olive/45'
                )}>{readerCopy.chapter}</span>
                <select
                  value={String(chapterData.chapter)}
                  onChange={(event) => {
                    onSelectChapter(Number(event.target.value));
                    setFocusedVerseId(null);
                  }}
                  style={selectThemeStyle}
                  className={cn(
                    'mt-1 w-full appearance-none bg-transparent pr-8 font-serif text-lg font-bold outline-none',
                    isDarkMode ? 'text-white' : 'text-ink'
                  )}
                >
                  {Array.from({ length: selectedBook?.chapters ?? 0 }, (_, index) => index + 1).map((chapter) => (
                    <option key={chapter} value={chapter} style={optionThemeStyle}>
                      {chapter}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
              </label>

              <label className={cn(
                'relative rounded-[26px] px-4 pb-3 pt-2',
                isDarkMode
                  ? 'border border-white/10 bg-[#0d1016] shadow-[0_14px_28px_rgba(0,0,0,0.22)]'
                  : 'border border-olive/12 bg-paper shadow-[0_14px_28px_rgba(18,33,64,0.05)]'
              )}>
                <span className={cn(
                  'block text-[10px] font-bold uppercase tracking-[0.18em]',
                  isDarkMode ? 'text-white/45' : 'text-olive/45'
                )}>{readerCopy.verse}</span>
                <select
                  value={String(activeVerseNumber)}
                  onChange={(event) => {
                    void handlePickVerse(Number(event.target.value));
                  }}
                  style={selectThemeStyle}
                  className={cn(
                    'mt-1 w-full appearance-none bg-transparent pr-8 font-serif text-lg font-bold outline-none',
                    isDarkMode ? 'text-white' : 'text-ink'
                  )}
                >
                  {chapterData.vers.map((verse) => (
                    <option key={verse.id} value={verse.number} style={optionThemeStyle}>
                      {verse.number}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
              </label>

              <div className={cn(
                'hidden rounded-[26px] px-4 pb-3 pt-2 lg:block',
                isMultiSelectMode
                  ? 'border border-[#f0c15c]/35 bg-[#fff2c6] shadow-[0_14px_28px_rgba(240,193,92,0.16)]'
                  : isDarkMode
                    ? 'border border-white/10 bg-[#0d1016] shadow-[0_14px_28px_rgba(0,0,0,0.22)]'
                    : 'border border-olive/12 bg-paper shadow-[0_14px_28px_rgba(18,33,64,0.05)]'
              )}>
                <span className={cn(
                  'block text-[10px] font-bold uppercase tracking-[0.18em]',
                  isMultiSelectMode
                    ? 'text-[#8b691c]'
                    : isDarkMode
                      ? 'text-white/45'
                      : 'text-olive/45'
                )}>
                  {currentLanguage.startsWith('en') ? 'Selection' : 'Selección'}
                </span>
                <button
                  type="button"
                  onClick={isMultiSelectMode ? stopMultiSelect : startMultiSelect}
                  className={cn(
                    'mt-1 flex min-h-[2rem] w-full items-center justify-start text-left font-sans text-sm font-bold outline-none transition-colors',
                    isMultiSelectMode
                      ? 'text-[#6f5314]'
                      : isDarkMode
                        ? 'text-white'
                        : 'text-ink'
                  )}
                  title={isMultiSelectMode ? multiSelectCopy.cancel : multiSelectCopy.action}
                  aria-label={isMultiSelectMode ? multiSelectCopy.cancel : multiSelectCopy.action}
                >
                  <span className="line-clamp-2 leading-5">
                    {isMultiSelectMode
                      ? `${Math.max(multiSelectedVerseNumbers.length, 1)} ${multiSelectCopy.selected}`
                      : multiSelectCopy.action}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={cn('mx-auto w-full max-w-3xl flex-1 px-4 pb-72 pt-6 md:px-12 lg:py-10 lg:pb-32', isMobilePickerOpen && 'hidden lg:block')}>
        {!chapterData ? (
          <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-3xl rounded-[32px] border border-olive/10 bg-paper-light/90 p-6 shadow-[0_20px_60px_rgba(18,33,64,0.08)] sm:p-8">
              {isLoading ? (
                <>
                  <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-blue-600/10" />
                  <h2 className="mt-5 font-serif text-3xl font-bold text-ink">{t('app.loading_daily_verse')}</h2>
                  <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-7 text-ink-light">
                    {selectedBook ? selectedBook.names[0] : t('app.description')}
                  </p>
                </>
              ) : (
                <>
                  <BookOpen className="mx-auto mb-6 h-20 w-20 text-olive/12" />
                  <h2 className="font-serif text-3xl font-bold text-olive">{t('app.welcome')}</h2>
                  <p className="mx-auto mt-3 max-w-lg font-sans text-sm leading-7 text-ink-light">
                    {t('app.description')}
                  </p>

                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <button onClick={handleSidebarMenuOpen} className="rounded-full bg-olive px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-paper transition-all hover:bg-olive-dark flex items-center gap-2">
                      <Menu className="h-4 w-4" />
                      {t('menu.books')}
                    </button>
                    <button onClick={() => onGoHome?.()} className="rounded-full border border-olive/15 bg-paper px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-olive transition-all hover:bg-olive/5 flex items-center gap-2">
                      <House className="h-4 w-4" />
                      {t('app.home')}
                    </button>
                    <button onClick={() => onOpenDailyExperience?.()} className="rounded-full border border-blue-600/20 bg-blue-600/8 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 transition-all hover:bg-blue-600/12 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {t('menu.daily_challenges')}
                    </button>
                    {onOpenGame && (
                      <button onClick={() => onOpenGame()} className="rounded-full border border-violet-500/20 bg-violet-500/8 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700 transition-all hover:bg-violet-500/12 flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4" />
                        {t('menu.game')}
                      </button>
                    )}
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3 text-left">
                    <CompactReaderStat icon={<Flame className="h-4 w-4" />} label={t('app.challenge_streak')} value={String(challengeSummary.streak)} />
                    <CompactReaderStat icon={<Star className="h-4 w-4" />} label={t('app.challenge_rewards')} value={String(challengeSummary.totalRewardPoints)} />
                    <CompactReaderStat icon={<BookmarkIcon className="h-4 w-4" />} label={t('app.challenge_completed_today')} value={`${challengeSummary.completedToday}/${challengeSummary.totalDailyTasks}`} />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {chapterData.vers.map((v) => {
            const hColor = getVerseHighlight(v.number);
            const isFocused = focusedVerseId === v.id;
            const isSelected = selectedVerse?.id === v.id;
            const isMultiSelected = multiSelectedVerseNumbers.includes(v.number);
            
            return (
              <motion.div 
                initial={isMobileViewport ? false : { opacity: 0, y: 10 }}
                animate={isMobileViewport ? undefined : { opacity: 1, y: 0 }}
                key={v.id} 
                className="mb-1 relative"
              >
                {v.study && (
                  <h3 className="mt-8 mb-4 border-l-2 border-gold pl-3 font-sans text-sm font-bold uppercase tracking-widest text-[#f0c15c] lg:text-olive">
                    {v.study}
                  </h3>
                )}
                
                <motion.span
                  tabIndex={0}
                  ref={el => { verseRefs.current[v.number] = el; }}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleVerseMultiSelection(v);
                      return;
                    }

                    if (isSelected) {
                      onSelectVerse(v);
                      return;
                    }

                    setFocusedVerseId(v.id);

                    onSelectVerse(v);

                    requestVerseFocus(v.number);
                  }}
                  animate={isFocused ? { 
                    scale: blinkingVerseId === v.id ? [1, 1.05, 1, 1.05, 1, 1.04, 1] : [1, 1.05, 1.02],
                    opacity: blinkingVerseId === v.id ? [1, 0.35, 1, 0.35, 1, 0.35, 1] : 1,
                    backgroundColor: hColor 
                      ? hColor 
                      : "rgba(38, 93, 164, 0.28)",
                    boxShadow: "0 10px 40px -10px rgba(38, 93, 164, 0.4)",
                  } : {
                    scale: 1,
                    opacity: 1,
                    backgroundColor: hColor ? hColor : isMultiSelected ? "rgba(240, 193, 92, 0.22)" : isSelected ? "rgba(38, 93, 164, 0.14)" : "transparent",
                    boxShadow: isMultiSelected ? "0 8px 24px -14px rgba(240, 193, 92, 0.42)" : "none",
                  }}
                  whileHover={{ backgroundColor: hColor ? hColor : "rgba(var(--primary-rgb), 0.05)" }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 25,
                    scale: { type: "tween", duration: blinkingVerseId === v.id ? 1.5 : 0.4 },
                    opacity: { duration: blinkingVerseId === v.id ? 1.5 : 0.2 },
                    backgroundColor: { duration: 0.2 }
                  }}
                  className={cn(
                    "inline font-serif cursor-pointer p-2 -m-2 rounded-[18px] origin-left transition-all duration-300 relative z-0 outline-none",
                    isFocused 
                      ? "z-10 border border-[#4d84c4] bg-[#163255] text-white shadow-[0_8px_26px_rgba(17,45,79,0.42)] lg:border-[#6fa2d8] lg:bg-[#d7e6f7] lg:text-ink lg:shadow-[0_8px_26px_rgba(55,96,144,0.18)]" 
                      : isMultiSelected
                        ? "border border-[#f0c15c]/55 bg-[#3b2f12]/65 text-white shadow-[0_8px_24px_rgba(240,193,92,0.22)] lg:border-[#f0c15c]/45 lg:bg-[#fff2c6] lg:text-ink"
                        : isSelected
                          ? "border border-[#4d84c4]/45 bg-[#163255]/55 text-white lg:border-[#9fc4ea] lg:bg-[#e9f2fb] lg:text-ink"
                      : "border border-transparent text-white/92 lg:text-ink"
                  )}
                  style={{ 
                    fontSize: `${fontSize}px`,
                    lineHeight: '1.8'
                  }}
                >
                  <sup className={cn(
                    "font-sans text-[11px] font-bold mr-1.5 align-super select-none transition-colors",
                    isFocused ? "text-[#f0c15c]" : "text-[#f0c15c] lg:text-olive/60"
                  )}>
                    {v.number}
                  </sup>
                  {v.verse}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>

      <MobilePageFooter className="mt-8" />

      <AnimatePresence>
        {selectedVerse && chapterData && selectedBook && !isMultiSelectMode && !isMobilePickerOpen && (
          <motion.div
            ref={mobileActionSheetRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.9rem)] z-50 rounded-t-[32px] border border-olive/12 bg-[#0d1016]/98 px-4 pb-4 pt-3 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:bottom-0 lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <div className="mx-auto max-w-3xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-white/20" />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">{selectedBook.names[0]} {chapterData.chapter}:{selectedVerse.number}</p>
                  <p className="mt-2 line-clamp-2 font-serif text-base leading-7 text-white/92">{selectedVerse.verse}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectVerse(selectedVerse)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white/70 transition-all hover:bg-white/8 hover:text-white"
                  aria-label={t('app.back')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <AnimatePresence>
                {isVerseActionSheetExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {highlightColors.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => onHighlightVerse(`${selectedBook.abrev}-${chapterData.chapter}-${selectedVerse.number}`, color.value)}
                          className="h-10 w-10 shrink-0 rounded-full border border-white/12"
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => onHighlightVerse(`${selectedBook.abrev}-${chapterData.chapter}-${selectedVerse.number}`, null)}
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-white/78"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('app.remove_highlight')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-6">
                <ReaderActionButton
                  icon={<Palette className="h-5 w-5" />}
                  label={readerActionCopy.highlight}
                  onClick={() => setIsVerseActionSheetExpanded((value) => !value)}
                  active={isVerseActionSheetExpanded}
                />
                <ReaderActionButton
                  icon={<Heart className={cn('h-5 w-5', isVerseBookmarked(selectedVerse.number) && 'fill-current')} />}
                  label={readerActionCopy.save}
                  onClick={() => {
                    if (!isVerseBookmarked(selectedVerse.number)) {
                      onAddBookmark(selectedBook.abrev, chapterData.chapter, selectedVerse.number);
                    }
                  }}
                  disabled={isVerseBookmarked(selectedVerse.number)}
                />
                <ReaderActionButton
                  icon={isReadingVerse === selectedVerse.number ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  label={readerActionCopy.read}
                  onClick={() => playVerse(selectedVerse.verse, selectedVerse.number)}
                  active={isReadingVerse === selectedVerse.number}
                />
                <ReaderActionButton
                  icon={<Share2 className="h-5 w-5" />}
                  label={readerActionCopy.share}
                  onClick={() => { void handleShare(); }}
                />
                <ReaderActionButton
                  icon={<Copy className="h-5 w-5" />}
                  label={readerActionCopy.copy}
                  onClick={() => { void copyVerseToClipboard(selectedVerse); }}
                />
                <ReaderActionButton
                  icon={<Copy className="h-5 w-5" />}
                  label={readerActionCopy.multi}
                  onClick={startMultiSelect}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMultiSelectMode && chapterData && selectedBook && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={cn(
              'fixed inset-x-0 z-50 px-4 lg:bottom-6',
              isMobilePickerOpen ? 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+9.75rem)]'
            )}
          >
            <div className="mx-auto max-w-xl rounded-[30px] border border-white/10 bg-[#0d1016]/96 px-4 py-4 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#f0c15c]">
                    {multiSelectedVerseNumbers.length} {multiSelectCopy.selected}
                  </p>
                  <p className="mt-1 text-sm text-white/72">{multiSelectCopy.hint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isMobilePickerOpen && mobileSelectionTab === 'verse' ? (
                    <button
                      type="button"
                      onClick={openSelectedVerseFromPicker}
                      disabled={multiSelectedVerseNumbers.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white/88 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ArrowRight className="h-4 w-4" />
                      {multiSelectCopy.open}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { void shareSelectedVerses(); }}
                    disabled={multiSelectedVerseNumbers.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white/88 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Share2 className="h-4 w-4" />
                    {multiSelectCopy.share}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void copySelectedVersesToClipboard(); }}
                    disabled={multiSelectedVerseNumbers.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f0c15c] px-4 py-3 text-sm font-bold text-[#102542] transition-all disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Copy className="h-4 w-4" />
                    {multiSelectCopy.copy}
                  </button>
                  <button
                    type="button"
                    onClick={stopMultiSelect}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white/88 transition-all hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                    {multiSelectCopy.cancel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileBottomNav items={mobileNavItems} className={isMobilePickerOpen ? 'hidden' : undefined} />

      {/* Settings Modal */}
      {/* Floating Audio Button */}
      <AnimatePresence>
        {chapterData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            className="fixed bottom-6 right-6 z-50 hidden md:block md:bottom-10 md:right-10"
          >
            <button
              onClick={toggleAudio}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all group relative overflow-hidden",
                (isPlaying || isReadingVerse !== null) ? "bg-gold text-white scale-110 shadow-gold/40" : "bg-paper border border-olive/20 text-olive hover:scale-105 hover:border-gold/30"
              )}
              title={(isPlaying || isReadingVerse !== null) ? t('audio.stop') : t('audio.read')}
            >
              <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {(isPlaying || isReadingVerse !== null) ? (
                <div className="flex items-center gap-0.5">
                  <motion.div animate={{ height: [8, 16, 8] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-white rounded-full" />
                  <motion.div animate={{ height: [16, 8, 16] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }} className="w-1 bg-white rounded-full" />
                  <motion.div animate={{ height: [12, 16, 12] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }} className="w-1 bg-white rounded-full" />
                </div>
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
              
              {/* Tooltip for desktop */}
              <span className="absolute right-full mr-4 px-3 py-1 bg-ink text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                {(isPlaying || isReadingVerse !== null) ? t('audio.stop') : t('audio.read')}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[150]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute inset-y-0 right-0 flex min-h-0 w-full max-w-xl flex-col overflow-hidden border-l border-olive/10 bg-paper shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-olive/10 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-olive/45">{t('menu.more_options')}</p>
                  <h3 className="mt-1 font-serif text-2xl font-bold text-ink">{t('settings.title')}</h3>
                </div>
                <PanelNavButtons
                  onBack={() => setIsSettingsOpen(false)}
                  onHome={onGoHome ? () => { setIsSettingsOpen(false); onGoHome(); } : undefined}
                  backLabel={t('app.back')}
                  homeLabel={t('app.home')}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="block font-sans text-xs font-bold uppercase tracking-[0.22em] text-olive/60">{t('settings.font_size')}</label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setFontSize(Math.max(16, fontSize - 2))}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-olive/10 bg-paper-light text-lg font-bold text-olive transition-all hover:bg-olive/5"
                      >
                        -
                      </button>
                      <div className="flex-1 rounded-2xl border border-olive/10 bg-paper-light px-4 py-3 text-center font-sans text-sm font-bold text-olive">
                        {fontSize}px
                      </div>
                      <button
                        type="button"
                        onClick={() => setFontSize(Math.min(40, fontSize + 2))}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-olive/10 bg-paper-light text-lg font-bold text-olive transition-all hover:bg-olive/5"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block font-sans text-xs font-bold uppercase tracking-[0.22em] text-olive/60">{t('settings.accent_color')}</label>
                    <div className="flex flex-wrap gap-3">
                      {ACCENT_OPTIONS.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setAccentColor(theme.id)}
                          className={cn(
                            'h-10 w-10 rounded-full border-2 transition-all hover:scale-110',
                            accentColor === theme.id ? 'border-ink scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: theme.color }}
                          title={currentLanguage.startsWith('es') ? theme.nameEs : theme.nameEn}
                          aria-label={currentLanguage.startsWith('es') ? theme.nameEs : theme.nameEn}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block font-sans text-xs font-bold uppercase tracking-[0.22em] text-olive/60">
                      {currentLanguage.startsWith('es') ? 'Voz de lectura' : 'Reading voice'}
                    </label>
                    <select
                      value={voiceURI}
                      onChange={(event) => setVoiceURI(event.target.value)}
                      className="w-full rounded-2xl border border-olive/10 bg-paper-light px-4 py-3 text-sm font-sans font-bold text-olive outline-none transition-all"
                    >
                      <option value="">{currentLanguage.startsWith('es') ? 'Voz predeterminada del sistema' : 'System default voice'}</option>
                      {voices
                        .filter((voice) => voice.lang.includes('es') || voice.lang.includes('en'))
                        .map((voice) => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                    </select>
                    <p className="text-xs leading-6 text-olive/50">
                      {currentLanguage.startsWith('es')
                        ? 'Las voces disponibles dependen del navegador o del dispositivo móvil.'
                        : 'Available voices depend on the browser or mobile device.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="block font-sans text-xs font-bold uppercase tracking-[0.22em] text-olive/60">{t('settings.reading_mode')}</label>
                    <button
                      type="button"
                      onClick={onToggleDarkMode}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-olive/10 bg-paper-light px-4 py-3 text-sm font-bold text-olive transition-all hover:bg-olive/5"
                    >
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="mt-10 w-full rounded-2xl bg-olive py-4 font-sans font-bold uppercase tracking-widest text-paper shadow-lg"
                >
                  {t('app.ready')}
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
        {/* About Dialog */}
        <AnimatePresence>
          {isAboutOpen && (
            <div className="fixed inset-0 z-[220]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeAboutDialog}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className={cn(
                  'absolute inset-y-0 right-0 flex min-h-0 w-full max-w-xl flex-col overflow-hidden border-l shadow-2xl font-sans',
                  aboutSheetSurface,
                )}
              >
                <div className={cn('flex items-center justify-between border-b px-5 py-4 sm:px-6', aboutSheetBorder)}>
                  <div>
                    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.28em]', aboutSheetSubtle)}>{t('menu.more_options')}</p>
                    <h2 className={cn('mt-1 font-serif text-2xl font-bold', aboutMetaValueTone)}>{t('about.title')}</h2>
                  </div>
                  <PanelNavButtons
                    onBack={closeAboutDialog}
                    onHome={onGoHome ? () => { closeAboutDialog(); onGoHome(); } : undefined}
                    backLabel={t('app.back')}
                    homeLabel={t('app.home')}
                  />
                </div>

                <div ref={aboutScrollRef} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-5 font-sans">
                  <div className={cn('rounded-[26px] border p-5', aboutCardSurface)}>
                    <p className={cn('text-sm leading-7', aboutBodyTone)}>{t('about.subtitle')}</p>
                  </div>

                  <div className="grid gap-4 text-left">
                    <div
                      ref={missionSectionRef}
                      className={cn(
                        'scroll-mt-24 rounded-[26px] border p-5 transition-all',
                        aboutSection === 'mission'
                          ? 'border-gold/35 bg-gold/10 ring-2 ring-gold/20'
                          : aboutCardSurface
                      )}
                    >
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">{t('menu.mission')}</h3>
                      <p className={cn('mt-2 text-sm leading-7', aboutBodyTone)}>{t('about.mission_body')}</p>
                    </div>
                    <div
                      ref={visionSectionRef}
                      className={cn(
                        'scroll-mt-24 rounded-[26px] border p-5 transition-all',
                        aboutSection === 'vision'
                          ? 'border-gold/35 bg-gold/10 ring-2 ring-gold/20'
                          : aboutCardSurface
                      )}
                    >
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">{t('menu.vision')}</h3>
                      <p className={cn('mt-2 text-sm leading-7', aboutBodyTone)}>{t('about.vision_body')}</p>
                    </div>
                    <div
                      ref={valuesSectionRef}
                      className={cn(
                        'scroll-mt-24 rounded-[26px] border p-5 transition-all',
                        aboutSection === 'values'
                          ? 'border-gold/35 bg-gold/10 ring-2 ring-gold/20'
                          : aboutCardSurface
                      )}
                    >
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">{t('menu.values')}</h3>
                      <p className={cn('mt-2 text-sm leading-7', aboutBodyTone)}>{t('about.values_body')}</p>
                      <div className="mt-3 space-y-3">
                        {aboutValues.map((value) => (
                          <div key={value.title} className={cn('rounded-2xl border px-4 py-4', aboutValueCardSurface)}>
                            <p className={cn('text-sm font-bold', aboutValueTitleTone)}>{value.title}</p>
                            <p className={cn('mt-1 text-sm leading-6', aboutValueBodyTone)}>{value.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={cn('rounded-[26px] border p-5', aboutCardSurface)}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className={cn('text-[10px] font-bold uppercase tracking-[0.22em]', aboutSheetSubtle)}>{t('about.created_by')}</span>
                        <span className={cn('font-bold', aboutMetaValueTone)}>Dofepro-Tech</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className={cn('text-[10px] font-bold uppercase tracking-[0.22em]', aboutSheetSubtle)}>{t('about.creation_year')}</span>
                        <span className={cn('font-bold', aboutMetaValueTone)}>2026</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className={cn('text-[10px] font-bold uppercase tracking-[0.22em]', aboutSheetSubtle)}>{t('about.license')}</span>
                        <span className={cn('font-bold', aboutMetaValueTone)}>{t('about.license_value')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-olive/5 pt-4">
                    <p className="text-xs leading-6 text-olive/40 font-medium">
                      {t('about.footer_line_one')} <br/>
                      {t('about.footer_line_two')}
                    </p>
                  </div>

                  {showDeveloperTools && (
                    <div className="w-full p-4 bg-blue-50 rounded-2xl border border-blue-100 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">
                        {t('about.dev_only')}
                      </p>
                      <a
                        href="https://openrouter.ai/settings/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
                      >
                        {t('about.openrouter_dashboard')}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}

function MenuNavItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-sans font-bold text-olive hover:bg-olive/5 transition-colors text-left first:rounded-t-2xl last:rounded-b-2xl"
    >
      <span className="text-gold/60">{icon}</span>
      {label}
    </button>
  );
}

function ReaderActionButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-[22px] border px-2 py-3 text-center transition-all',
        active
          ? 'border-[#6fa2d8] bg-[#2a4461] text-white'
          : 'border-white/10 bg-white/8 text-white/88 hover:bg-white/12',
        disabled && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      <span>{icon}</span>
      <span className="line-clamp-2 font-sans text-[9px] font-bold uppercase leading-tight tracking-[0.08em] sm:text-[10px]">{label}</span>
    </button>
  );
}

function CompactReaderStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-olive/10 bg-paper p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/10 text-gold">
        {icon}
      </div>
      <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-olive/50">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}
