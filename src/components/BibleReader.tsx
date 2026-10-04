import React, { useRef, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Book, ChapterData, Verse, Highlight, Bookmark, ReadingChallengeSummary, SidebarBookFilter } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { PanelNavButtons } from '@/src/components/PanelNavButtons';
import { MobileBottomNav, MobilePageFooter, ScrollToTopButton } from '@/src/components/MobileBottomNav';
import { fetchChapter } from '@/src/services/bibleApi';
import { getSpeechLanguage } from '@/src/lib/language';
import { BookOpen, Calendar, Download, Gamepad2, Menu, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, Palette, Trash2, MoreVertical, Heart, Info, Share2, Settings, X, Search, ArrowRight, Bookmark as BookmarkIcon, Globe, Volume2, VolumeX, Copy, House, Flame, Star, User, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { canUseSpeechSynthesis, cancelSpeech, getSpeechVoices, setSpeechVoicesChangedListener, speakText } from '@/src/lib/speech';
import { BrandSeal } from '@/src/components/BrandSeal';
import { trackEvent } from '@/src/lib/analytics';

interface BibleReaderProps {
  isNativeApp: boolean;
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
  challengeSummary: ReadingChallengeSummary;
  onGoBack?: () => void;
  onGoHome?: () => void;
  onOpenBooks?: (filter: SidebarBookFilter, andNavigate?: boolean) => void;
  onOpenGame?: () => void;
  onOpenSearch?: () => void;
  onOpenPlans?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenUser?: () => void;
  onOpenOpinions?: () => void;
  onOpenDictionary?: () => void;
  onOpenStudy?: () => void;
  onOpenAboutLegal?: (type: any) => void;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  onTrackSearchQuery?: (query: string) => void;
  readerSelectorRequestId?: number;
  onReaderSelectorRequestHandled?: () => void;
  bookPickerFilter?: SidebarBookFilter;
  verseFocusRequestId?: number;
  onShareContent?: (payload: any) => void | Promise<void>;
  onClearSelectedVerse?: () => void;
}

export function BibleReader(props: BibleReaderProps) {
  const {
    isNativeApp, chapterData, isLoading, selectedVerse, onSelectVerse, onMenuClick, books, selectedBook, selectedChapter, onSelectBook, onSelectChapter,
    isDarkMode, onToggleDarkMode, highlights, onHighlightVerse, fontSize, setFontSize, accentColor, setAccentColor, voiceURI, setVoiceURI,
    onAddBookmark, bookmarks, onOpenFavorites, onNavigateToVerse, onOpenDailyExperience, challengeSummary, onGoBack, onGoHome, onOpenGame, onOpenSearch, onOpenPlans, onOpenDownloadModal, onOpenOpinions, onOpenDictionary, onOpenUser, onOpenStudy, onOpenAboutLegal
  } = props;

  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const speechLanguage = getSpeechLanguage(currentLanguage);
  const isSpeechAvailable = canUseSpeechSynthesis();
  const [isPlayingChapter, setIsPlayingChapter] = useState(false);
  const [isPlayingVerseNumber, setIsPlayingVerseNumber] = useState<number | null>(null);
  const [showWelcomeBookPicker, setShowWelcomeBookPicker] = useState(false);
  const [welcomePickerStep, setWelcomePickerStep] = useState<'books' | 'chapters' | 'verses'>('books');
  const [welcomePickerFilter, setWelcomePickerFilter] = useState<SidebarBookFilter>('all');
  const [welcomeTempBook, setWelcomeTempBook] = useState<Book | null>(null);
  const [welcomeTempChapter, setWelcomeTempChapter] = useState(1);
  const [welcomeVersesCount, setWelcomeVersesCount] = useState(0);
  const [isWelcomeVersesLoading, setIsWelcomeVersesLoading] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.readerSelectorRequestId) return;
    setWelcomePickerFilter(props.bookPickerFilter ?? 'all');
    setWelcomePickerStep('books');
    setShowWelcomeBookPicker(true);
    props.onReaderSelectorRequestHandled?.();
  }, [props.readerSelectorRequestId]);

  useEffect(() => {
    if (!props.verseFocusRequestId) return;
    setShowWelcomeBookPicker(false);
    setWelcomePickerStep('books');
  }, [props.verseFocusRequestId]);

  useEffect(() => {
    if (!props.verseFocusRequestId || !selectedVerse?.verse) return;
    const verseNode = mainScrollRef.current?.querySelector<HTMLElement>(`[data-verse-number="${selectedVerse.number}"]`);
    if (!verseNode) return;

    const frameId = window.requestAnimationFrame(() => {
      verseNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [props.verseFocusRequestId, chapterData, selectedVerse?.id, selectedVerse?.verse]);

  const readerCopy = currentLanguage.startsWith('en')
    ? { book: 'Book', chapter: 'Chapter', verse: 'Verse', old: 'Old Testament', new: 'New Testament' }
    : { book: 'Libro', chapter: 'Capítulo', verse: 'Versículo', old: 'Antiguo Testamento', new: 'Nuevo Testamento' };

  const handleWelcomeBookSelect = (book: Book) => {
    setWelcomeTempBook(book);
    setWelcomePickerStep('chapters');
  };

  const openBookPicker = (filter: SidebarBookFilter) => {
    setWelcomePickerFilter(filter);
    setWelcomePickerStep('books');
    setShowWelcomeBookPicker(true);
  };

  const oldTestamentBooks = books.filter((book) => book.testament.toLowerCase().includes('antiguo') || book.testament.toLowerCase().includes('old'));
  const newTestamentBooks = books.filter((book) => !oldTestamentBooks.includes(book));

  const stopAudio = () => {
    cancelSpeech();
    setIsPlayingChapter(false);
    setIsPlayingVerseNumber(null);
  };

  const playChapter = () => {
    if (!chapterData || !isSpeechAvailable) return;
    if (isPlayingChapter) {
      stopAudio();
      return;
    }

    stopAudio();
    const didSpeak = speakText({
      text: `${chapterData.name} ${chapterData.chapter}. ${chapterData.vers.map((verse) => verse.verse).join('. ')}`,
      lang: speechLanguage,
      voiceURI,
      onEnd: () => setIsPlayingChapter(false),
      onError: () => setIsPlayingChapter(false),
    });
    if (didSpeak) setIsPlayingChapter(true);
  };

  const playVerse = (verse: Verse) => {
    if (!isSpeechAvailable) return;
    if (isPlayingVerseNumber === verse.number) {
      stopAudio();
      return;
    }

    stopAudio();
    const didSpeak = speakText({
      text: verse.verse,
      lang: speechLanguage,
      voiceURI,
      onEnd: () => setIsPlayingVerseNumber(null),
      onError: () => setIsPlayingVerseNumber(null),
    });
    if (didSpeak) setIsPlayingVerseNumber(verse.number);
  };

  useEffect(() => () => cancelSpeech(), []);

  useEffect(() => {
    if (!props.favoriteToPlay || !isSpeechAvailable) return;

    const { bookAbrev, chapter, verseNumber } = props.favoriteToPlay;
    const book = books.find((candidate) => candidate.abrev === bookAbrev);
    if (!book || !verseNumber) {
      props.onFavoritePlayed?.();
      return;
    }

    void fetchChapter(book.names[0], chapter, currentLanguage)
      .then((data) => {
        const verse = data.vers.find((candidate) => candidate.number === verseNumber);
        if (verse) playVerse(verse);
      })
      .finally(() => props.onFavoritePlayed?.());
  }, [props.favoriteToPlay, books, currentLanguage, isSpeechAvailable]);

  const handleWelcomeChapterSelect = async (chapter: number) => {
    if (!welcomeTempBook) return;
    setWelcomeTempChapter(chapter);
    setWelcomePickerStep('verses');
    setIsWelcomeVersesLoading(true);
    try {
      const data = await fetchChapter(welcomeTempBook.names[0], chapter, currentLanguage);
      setWelcomeVersesCount(data.vers.length);
    } catch (e) {
      setWelcomeVersesCount(30);
    } finally {
      setIsWelcomeVersesLoading(false);
    }
  };

  const handleWelcomeVerseSelect = (verseNumber: number) => {
    if (!welcomeTempBook || !onNavigateToVerse) return;
    onNavigateToVerse(welcomeTempBook.abrev, welcomeTempChapter, verseNumber);
    setShowWelcomeBookPicker(false);
    setWelcomePickerStep('books');
  };

  const WebNavItem = ({ label, onClick, active }: { label: string, onClick?: () => void, active?: boolean }) => (
    <button onClick={onClick} className={cn("px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap", isDarkMode ? "text-white/60 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100", active && "text-[var(--primary)]")}>{label}</button>
  );

  const WebNavDropdown = ({ label, items, onClick }: { label: string, items: { label: string, onClick: () => void }[], onClick?: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="relative group" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
        <button onClick={onClick} className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all", isDarkMode ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
          {label} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 top-full pt-2 z-[100] min-w-[600px]">
              <div className={cn("rounded-2xl border shadow-2xl p-6", isDarkMode ? "bg-[#0b1a30] border-white/10" : "bg-white border-slate-200")}>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-4 pb-2 border-b", isDarkMode ? "text-white/30 border-white/5" : "text-slate-400 border-slate-100")}>{label}</p>
                <div className="grid grid-cols-3 gap-4">
                  {items.map((item, idx) => (
                    <button key={idx} onClick={() => { item.onClick(); setIsOpen(false); }} className={cn("text-left text-[13px] font-medium hover:text-[var(--primary)]", isDarkMode ? "text-white/70" : "text-slate-600")}>{item.label}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-screen flex flex-col items-center justify-center bg-[#111820] transition-colors duration-300">
        <motion.div animate={{ rotate: 360 }} transition={{ ease: "linear", duration: 2, repeat: Infinity }}>
          <BookOpen className="w-12 h-12 text-[var(--primary)]/40" />
        </motion.div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-white/30 animate-pulse">Cargando la Palabra...</p>
      </div>
    );
  }

  return (
    <div ref={mainScrollRef} data-reader-scroll-root="true" className={cn('relative flex-1 h-screen overflow-y-auto transition-colors duration-300', isDarkMode ? 'bg-[#04101f] text-white' : 'bg-[#f7fbff] text-[#102542]')}>
      {/* HEADER WEB */}
      <header className={cn('hidden lg:flex sticky top-0 z-50 border-b px-6 py-2 backdrop-blur-xl transition-colors duration-300', isDarkMode ? 'bg-[#030812]/95 border-white/10' : 'bg-white/95 border-slate-200')}>
        <div className="mx-auto w-full max-w-[1600px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button onClick={onMenuClick} className={cn('rounded-xl border p-2 transition-all', isDarkMode ? 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white' : 'border-[#cbd8e8] bg-[#edf5ff] text-[#174a80] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]')} title="Menú"><Menu className="h-5 w-5" /></button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
                <div className={cn("h-9 w-9 p-1 rounded-lg border transition-colors", isDarkMode ? "bg-[#07152b] border-[#1d4f96]" : "bg-[#f8fbff] border-blue-200")}>
                  <BrandSeal className="h-full w-full" />
                </div>
                <div className="flex flex-col">
                  <h1 className="font-serif text-xl font-bold whitespace-nowrap">{t('app.title')}</h1>
                  <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.12em] leading-tight">{chapterData?.version ?? 'RVR1960'}{chapterData ? ` · ${chapterData.name} ${chapterData.chapter}${selectedVerse ? `:${selectedVerse.number}` : ''}` : ''}</p>
                </div>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              <button onClick={onGoHome} className="p-2 rounded-xl hover:bg-white/5 transition-all"><House className="h-5 w-5" /></button>
              <WebNavDropdown label="Biblia y Estudio" onClick={() => openBookPicker('all')} items={[
                { label: 'Toda la Biblia', onClick: () => openBookPicker('all') },
                { label: 'Antiguo Testamento', onClick: () => openBookPicker('old') },
                { label: 'Nuevo Testamento', onClick: () => openBookPicker('new') },
                { label: 'Estudio con IA', onClick: onOpenStudy },
                { label: 'Planes de lectura', onClick: onOpenPlans },
                { label: 'Opiniones', onClick: onOpenOpinions },
                { label: 'Diccionario', onClick: onOpenDictionary },
              ]} />
              <WebNavItem label="Juegos" onClick={onOpenGame} />
            </nav>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => i18n.changeLanguage(currentLanguage === 'es' ? 'en' : 'es')} className="px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold bg-white/5 transition-all"><Globe className="h-3.5 w-3.5 mr-2 inline" />{currentLanguage === 'es' ? 'Español' : 'English'}</button>
             <button onClick={onOpenUser} className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] transition-all">Iniciar Sesión</button>
             {!isNativeApp && !Capacitor.isNativePlatform() && <button onClick={onOpenDownloadModal} className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/35 bg-[var(--primary)]/12 px-3 py-2 text-xs font-bold text-[var(--primary)] transition-all hover:bg-[var(--primary)]/20"><Download className="h-4 w-4" />Descargar APK</button>}
             <button onClick={onToggleDarkMode} className="theme-toggle-action p-2 rounded-xl hover:bg-white/5 transition-all" aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>{isDarkMode ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-rose-400" />}</button>
          </div>
        </div>
      </header>

      {/* HEADER MOVIL SLIM */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-white/10 bg-[#030812]/96 px-4 py-3 backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--primary)]/35 bg-[var(--primary)]/15 text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/25"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0">
             <p className="truncate font-serif text-xl font-bold leading-none text-white">{t('app.title')}</p>
              <p className="mt-1 truncate text-[10px] font-semibold text-[var(--primary)]">{chapterData?.version ?? 'RVR1960'}{chapterData ? ` · ${chapterData.name} ${chapterData.chapter}${selectedVerse ? `:${selectedVerse.number}` : ''}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {!isNativeApp && !Capacitor.isNativePlatform() && <button onClick={onOpenDownloadModal} className="rounded-xl border border-[var(--primary)]/35 bg-[var(--primary)]/15 p-2 text-[var(--primary)]" title="Descargar APK" aria-label="Descargar APK"><Download className="h-5 w-5" /></button>}
           <button onClick={() => onOpenSearch?.()} className="p-2 text-white/50"><Search className="h-5 w-5" /></button>
           <button onClick={() => i18n.changeLanguage(currentLanguage === 'es' ? 'en' : 'es')} className="text-[10px] font-bold uppercase">{currentLanguage === 'es' ? 'ES' : 'EN'}</button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8">
        {chapterData && selectedBook && !showWelcomeBookPicker && (
          <nav aria-label={currentLanguage.startsWith('en') ? 'Bible navigation' : 'Navegación bíblica'} className={cn('reader-theme-nav sticky top-[64px] z-20 mb-6 grid grid-cols-3 gap-1 rounded-2xl border p-2 backdrop-blur-xl sm:gap-2 lg:top-[56px]', isDarkMode ? 'border-white/10 bg-[#071321]/95 text-white' : 'border-[#d8e4f2] bg-[#f7fbff]/95 text-[#102542]')}>
            <ReaderStepper
              label={readerCopy.book}
              value={selectedBook.names[0]}
              previousDisabled={books.findIndex((book) => book.abrev === selectedBook.abrev) <= 0}
              nextDisabled={books.findIndex((book) => book.abrev === selectedBook.abrev) >= books.length - 1}
              isDarkMode={isDarkMode}
              previousLabel={currentLanguage.startsWith('en') ? 'Previous book' : 'Libro anterior'}
              nextLabel={currentLanguage.startsWith('en') ? 'Next book' : 'Libro siguiente'}
              onPrevious={() => {
                const index = books.findIndex((book) => book.abrev === selectedBook.abrev);
                if (index > 0) onSelectBook(books[index - 1]);
              }}
              onNext={() => {
                const index = books.findIndex((book) => book.abrev === selectedBook.abrev);
                if (index >= 0 && index < books.length - 1) onSelectBook(books[index + 1]);
              }}
            />
            <ReaderStepper
              label={readerCopy.chapter}
              value={String(selectedChapter)}
              previousDisabled={selectedChapter <= 1}
              nextDisabled={selectedChapter >= selectedBook.chapters}
              isDarkMode={isDarkMode}
              previousLabel={currentLanguage.startsWith('en') ? 'Previous chapter' : 'Capítulo anterior'}
              nextLabel={currentLanguage.startsWith('en') ? 'Next chapter' : 'Capítulo siguiente'}
              onPrevious={() => selectedChapter > 1 && onSelectChapter(selectedChapter - 1)}
              onNext={() => selectedChapter < selectedBook.chapters && onSelectChapter(selectedChapter + 1)}
            />
            <ReaderStepper
              label={readerCopy.verse}
              value={selectedVerse ? String(selectedVerse.number) : '—'}
              previousDisabled={!selectedVerse || selectedVerse.number <= 1}
              nextDisabled={!!selectedVerse && selectedVerse.number >= chapterData.vers.length}
              isDarkMode={isDarkMode}
              previousLabel={currentLanguage.startsWith('en') ? 'Previous verse' : 'Versículo anterior'}
              nextLabel={currentLanguage.startsWith('en') ? 'Next verse' : 'Versículo siguiente'}
              onPrevious={() => selectedVerse && selectedVerse.number > 1 && onNavigateToVerse?.(selectedBook.abrev, selectedChapter, selectedVerse.number - 1)}
              onNext={() => {
                const nextVerse = (selectedVerse?.number ?? 0) + 1;
                if (nextVerse <= chapterData.vers.length) onNavigateToVerse?.(selectedBook.abrev, selectedChapter, nextVerse);
              }}
            />
          </nav>
        )}
        {chapterData && isSpeechAvailable && (
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-1/2 z-40 flex w-[min(calc(100vw-1.5rem),32rem)] -translate-x-1/2 items-center justify-between gap-1 rounded-full border border-white/10 bg-[#0a1d33]/95 p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:bottom-6 lg:left-6 lg:w-max lg:max-w-[calc(100vw-5.5rem)] lg:translate-x-0">
            <button type="button" onClick={playChapter} className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-bold transition-colors', isPlayingChapter ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-white hover:bg-white/15')}>
              {isPlayingChapter ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{isPlayingChapter ? t('audio.stop') : (currentLanguage.startsWith('en') ? 'Chapter' : 'Capítulo')}</span>
            </button>
            <div className="flex min-w-0 items-center gap-1 px-1 text-[10px] font-bold text-white/80" title={`${chapterData.name} ${chapterData.chapter}${selectedVerse ? `:${selectedVerse.number}` : ''}`}>
              <BookOpen className="h-4 w-4 shrink-0 text-[#8bc2ff]" />
              <span className="truncate">{chapterData.name} {chapterData.chapter}{selectedVerse ? `:${selectedVerse.number}` : ''}</span>
            </div>
            {selectedVerse && (
              <>
                <button type="button" onClick={() => playVerse(selectedVerse)} className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-bold transition-colors', isPlayingVerseNumber === selectedVerse.number ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-white hover:bg-white/15')}>
                  {isPlayingVerseNumber === selectedVerse.number ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  <span>{isPlayingVerseNumber === selectedVerse.number ? t('audio.stop') : (currentLanguage.startsWith('en') ? 'Verse' : 'Versículo')}</span>
                </button>
                <button type="button" onClick={() => props.onClearSelectedVerse?.()} className="shrink-0 rounded-full p-2 text-white/65 transition-colors hover:bg-white/10 hover:text-white" title={t('app.close_verse_actions')} aria-label={t('app.close_verse_actions')}>
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
        {!chapterData || showWelcomeBookPicker ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
            <div className={cn("w-full max-w-3xl rounded-[40px] border p-8 sm:p-12 shadow-2xl transition-all", isDarkMode ? "bg-[#0b1a30] border-white/10" : "bg-white border-slate-200")}>
              {!showWelcomeBookPicker ? (
                <>
                  <BookOpen className="mx-auto mb-8 h-20 w-20 text-[var(--primary)]/20" />
                  <h2 className="font-serif text-4xl font-bold mb-4">{t('app.welcome')}</h2>
                  <p className="text-lg opacity-60 max-w-lg mx-auto mb-10">{t('app.description')}</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => setShowWelcomeBookPicker(true)} className="rounded-full bg-[var(--primary)] px-8 py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-blue-500/20 flex items-center gap-3"><Menu className="h-5 w-5" />{t('menu.books')}</button>
                    <button onClick={onGoHome} className="rounded-full border border-current opacity-60 px-8 py-4 text-xs font-bold uppercase tracking-widest hover:opacity-100 transition-all flex items-center gap-3"><House className="h-5 w-5" />{t('app.home')}</button>
                  </div>
                  <div className="mt-12 grid grid-cols-3 gap-6">
                    <CompactReaderStat icon={<Flame className="h-5 w-5" />} label="Racha" value={String(challengeSummary.streak)} />
                    <CompactReaderStat icon={<Star className="h-5 w-5" />} label="Puntos" value={String(challengeSummary.totalRewardPoints)} />
                    <CompactReaderStat icon={<BookmarkIcon className="h-5 w-5" />} label="Hoy" value={`${challengeSummary.completedToday}/${challengeSummary.totalDailyTasks}`} />
                  </div>
                </>
              ) : (
                <div className="text-left">
                   <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-4">
                        {welcomePickerStep !== 'books' && <button onClick={() => setWelcomePickerStep(welcomePickerStep === 'verses' ? 'chapters' : 'books')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10"><ChevronLeft className="h-6 w-6" /></button>}
                        <h3 className="font-serif text-2xl font-bold uppercase tracking-wider">{welcomePickerStep === 'books' ? 'Seleccionar Libro' : welcomePickerStep === 'chapters' ? welcomeTempBook?.names[0] : `${welcomeTempBook?.names[0]} ${welcomeTempChapter}`}</h3>
                      </div>
                      <button onClick={() => setShowWelcomeBookPicker(false)} className="p-2 opacity-40 hover:opacity-100"><X className="h-6 w-6" /></button>
                   </div>

                   {welcomePickerStep === 'books' && (
                     <div className={cn('grid gap-8', welcomePickerFilter === 'all' ? 'md:grid-cols-2' : 'grid-cols-1')}>
                       {welcomePickerFilter !== 'new' && <div>
                         <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-500"/> {readerCopy.old}</h4>
                         <div className="grid grid-cols-2 gap-2">
                           {oldTestamentBooks.map(book => (
                             <button key={book.abrev} onClick={() => handleWelcomeBookSelect(book)} className="text-left py-2.5 px-4 rounded-xl text-sm font-medium bg-white/5 hover:bg-[var(--primary)] hover:text-white transition-all">{book.names[0]}</button>
                           ))}
                         </div>
                       </div>}
                       {welcomePickerFilter !== 'old' && <div>
                         <h4 className="text-xs font-bold uppercase tracking-widest text-gold mb-6 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-gold"/> {readerCopy.new}</h4>
                         <div className="grid grid-cols-2 gap-2">
                           {newTestamentBooks.map(book => (
                             <button key={book.abrev} onClick={() => handleWelcomeBookSelect(book)} className="text-left py-2.5 px-4 rounded-xl text-sm font-medium bg-white/5 hover:bg-[var(--primary)] hover:text-white transition-all">{book.names[0]}</button>
                           ))}
                         </div>
                       </div>}
                     </div>
                   )}

                   {welcomePickerStep === 'chapters' && (
                     <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-3">
                        {Array.from({ length: welcomeTempBook?.chapters || 0 }, (_, i) => i + 1).map(ch => (
                          <button key={ch} onClick={() => handleWelcomeChapterSelect(ch)} className="aspect-square flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold hover:bg-[var(--primary)] hover:text-white transition-all">{ch}</button>
                        ))}
                     </div>
                   )}

                   {welcomePickerStep === 'verses' && (
                     <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-3">
                        {Array.from({ length: welcomeVersesCount }, (_, i) => i + 1).map(v => (
                          <button key={v} onClick={() => handleWelcomeVerseSelect(v)} className="aspect-square flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold hover:bg-[var(--primary)] hover:text-white transition-all">{v}</button>
                        ))}
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {chapterData.vers.map((v) => (
               <div key={v.id} className="relative group">
                  {v.study && <h3 className="mt-12 mb-6 border-l-4 border-[var(--primary)] pl-6 font-serif text-lg font-bold uppercase tracking-widest text-[var(--primary)]">{v.study}</h3>}
                   <p
                     data-verse-number={v.number}
                     onClick={() => onSelectVerse(v)}
                     style={{ fontSize: `${fontSize}px` }}
                     className={cn(
                      "font-serif text-xl leading-relaxed cursor-pointer p-4 rounded-3xl transition-all duration-300",
                      selectedVerse?.id === v.id ? "bg-[var(--primary)]/15 ring-2 ring-[var(--primary)]/25" : "hover:bg-[var(--primary)]/5"
                    )}
                  >
                    <span className="text-[var(--primary)] font-bold mr-3 text-sm align-top">{v.number}</span>
                    {v.verse}
                  </p>
               </div>
             ))}
             <MobilePageFooter
               className="mt-20"
               onOpenAboutLegal={onOpenAboutLegal}
               onOpenOpinions={onOpenOpinions}
               onOpenDictionary={onOpenDictionary}
             />
          </div>
        )}
      </div>
      <MobileBottomNav items={[
        { id: 'home', label: 'Inicio', icon: <House />, onClick: onGoHome! },
        { id: 'books', label: 'Libros', icon: <BookOpen />, onClick: () => { setShowWelcomeBookPicker(true); setWelcomePickerStep('books'); } },
        { id: 'search', label: 'Buscar', icon: <Search />, onClick: onOpenSearch! },
        { id: 'user', label: 'Tú', icon: <User />, onClick: onOpenUser! },
        { id: 'game', label: 'Juegos', icon: <Gamepad2 />, onClick: onOpenGame! },
        { id: 'plans', label: 'Planes', icon: <Calendar />, onClick: onOpenPlans! },
      ]} />
      <ScrollToTopButton targetSelector='[data-reader-scroll-root="true"]' label={currentLanguage.startsWith('en') ? 'Back to top' : 'Volver arriba'} />
    </div>
  );
}

function CompactReaderStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-6 transition-all hover:bg-white/10">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/20 text-[var(--primary)] mx-auto mb-4">{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">{label}</p>
      <p className="text-3xl font-serif font-bold text-white">{value}</p>
    </div>
  );
}

interface ReaderStepperProps {
  label: string;
  value: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  previousLabel: string;
  nextLabel: string;
  isDarkMode: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

function ReaderStepper({ label, value, previousDisabled, nextDisabled, previousLabel, nextLabel, isDarkMode, onPrevious, onNext }: ReaderStepperProps) {
  const arrowTone = isDarkMode
    ? 'border-white/10 bg-white/5 text-white/80 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] disabled:text-white/20'
    : 'border-[#d8e4f2] bg-white text-[#23466c] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] disabled:text-slate-300';

  return (
    <div className="mx-auto grid w-fit min-w-0 max-w-full grid-cols-[28px_minmax(48px,64px)_28px] items-center justify-items-center gap-1 rounded-xl px-0.5 py-1 sm:grid-cols-[32px_minmax(68px,92px)_32px] sm:gap-2">
      <button type="button" onClick={onPrevious} disabled={previousDisabled} aria-label={previousLabel} title={previousLabel} className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8', arrowTone)}>
        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <div className="min-w-0 w-full text-center leading-tight">
        <span className={cn('block truncate text-[9px] font-bold uppercase tracking-[0.12em]', isDarkMode ? 'text-white/45' : 'text-[#587392]')}>{label}</span>
        <span className="block truncate text-xs font-semibold sm:text-sm">{value}</span>
      </div>
      <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel} title={nextLabel} className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8', arrowTone)}>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}
