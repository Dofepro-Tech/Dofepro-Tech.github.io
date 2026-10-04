import { startTransition, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import type { AboutLegalType } from '@/src/components/AboutLegalModal';
import { Book, Bookmark as BibleBookmark, ReadingChallengeSummary, SidebarBookFilter } from '@/src/types';
import { type DailyContentKind, type DailyResourceCard } from '@/src/lib/dailyContent';
import { useDailyContent } from '@/src/hooks/useDailyContent';
import { normalizeAppLanguage } from '@/src/lib/language';
import { buildVerseShareText, getAppShareUrl, getReaderShareUrl, type SharePayload } from '@/src/lib/share';
import { canUseSpeechSynthesis, cancelSpeech, speakText } from '@/src/lib/speech';
import { openExternalUrl } from '@/src/lib/openExternalUrl';
import { cn } from '@/src/lib/utils';
import { AppOverflowMenu } from '@/src/components/AppOverflowMenu';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter, ScrollToTopButton } from '@/src/components/MobileBottomNav';
import { HelpGuideModal } from '@/src/components/HelpGuideModal';
import { VerseImageShareSheet } from '@/src/components/VerseImageShareSheet';
import { canNativeShareVerseImage, createVerseImageAsset, downloadVerseImage, nativeShareVerseImage, revokeVerseImageAsset } from '@/src/lib/shareVerseImage';
import { fetchChapter } from '@/src/services/bibleApi';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { BookHeart, BookOpen, Bookmark, Calendar, ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, Flame, Gamepad2, Heart, House, Image, LibraryBig, Menu, Moon, Newspaper, PlayCircle, Quote, Search, Share2, Sparkles, Star, Sun, SunMoon, User, Volume2, X, HelpCircle } from 'lucide-react';

const SAVED_DAILY_IMAGE_STORAGE_KEY = 'biblia_nj_saved_daily_images_v1';

function readStoredSavedDailyImages() {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const rawValue = window.localStorage.getItem(SAVED_DAILY_IMAGE_STORAGE_KEY);
    if (!rawValue) return [] as string[];
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue.filter((v): v is string => typeof v === 'string') : [];
  } catch (error) {
    console.error('Error reading saved daily images:', error);
    return [] as string[];
  }
}

type DailyCompanionKind = DailyContentKind;

interface HomeScreenProps {
  isNativeApp: boolean;
  books: Book[];
  selectedBook: Book | null;
  selectedChapter: number;
  bookmarksCount: number;
  bookmarks: BibleBookmark[];
  challengeSummary: ReadingChallengeSummary;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  voiceURI: string;
  setVoiceURI: (uri: string) => void;
  keepScreenOn: boolean;
  setKeepScreenOn: (keep: boolean) => void;
  startupPage: 'home' | 'reader';
  setStartupPage: (page: 'home' | 'reader') => void;
  homeSections: Record<string, boolean>;
  setHomeSections: (sections: any) => void;
  onShare: () => void;
  onMenuClick: () => void;
  onOpenBooks: (filter?: SidebarBookFilter, andNavigate?: boolean) => void;
  onOpenBookPicker?: (filter: SidebarBookFilter) => void;
  onContinueReading: () => void;
  onOpenReaderSelector?: () => void;
  onOpenStudy: () => void;
  onOpenDailyExperience: () => void;
  onOpenFavorites: () => void;
  onOpenGame: () => void;
  onOpenSearch?: (query?: string) => void;
  onOpenPlans?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenOpinions?: () => void;
  onOpenDictionary?: () => void;
  onOpenUser?: () => void;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
  onSelectBook: (book: Book) => void;
  onSelectChapter: (chapter: number) => void;
  onGoHome?: () => void;
  onOpenVerse: (bookAbrev: string, chapter: number, verseNumber: number) => void;
  onAddBookmark: (bookAbrev: string, chapter: number, verseNumber?: number, label?: string) => void;
  onRemoveBookmark: (id: string) => void;
  onShareContent: (payload: SharePayload) => void | Promise<void>;
  availableAppUpdate?: { version: string; currentVersion: string; publishedAt?: string; notes?: string[]; notesEn?: string[]; } | null;
  onOpenAppUpdate?: () => void;
  onDismissAppUpdate?: () => void;
}

export function HomeScreen(props: HomeScreenProps) {
  const {
    isNativeApp, books, selectedBook, selectedChapter, bookmarksCount, bookmarks, challengeSummary, isDarkMode,
    onToggleDarkMode, fontSize, setFontSize, accentColor, setAccentColor, voiceURI, setVoiceURI,
    keepScreenOn, setKeepScreenOn, startupPage, setStartupPage, homeSections, setHomeSections,
    onShare, onMenuClick, onOpenBooks, onOpenBookPicker, onContinueReading, onOpenReaderSelector, onOpenStudy,
    onOpenDailyExperience, onOpenFavorites, onOpenGame, onOpenSearch, onOpenPlans, onOpenDownloadModal, onOpenOpinions, onOpenDictionary, onOpenUser, onOpenAboutLegal,
    onGoHome, onOpenVerse, onAddBookmark, onRemoveBookmark, onShareContent, availableAppUpdate, onOpenAppUpdate, onDismissAppUpdate,
    onSelectBook, onSelectChapter,
  } = props;

  const { t, i18n } = useTranslation();
  const [savedDailyImageIds, setSavedDailyImageIds] = useState<string[]>(() => readStoredSavedDailyImages());
  const [activeImageResourceId, setActiveImageResourceId] = useState<string | null>(null);
  const [activeImageVerseReference, setActiveImageVerseReference] = useState<DailyResourceCard['verseReference'] | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window === 'undefined' ? false : window.innerWidth < 1024));
  const [isMobileDeferredContentReady, setIsMobileDeferredContentReady] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  const [dailyVerse, setDailyVerse] = useState<any>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [dailyImage, setDailyImage] = useState<string | null>(null);
  const [sharedImageAsset, setSharedImageAsset] = useState<any>(null);
  const [sharedImageTitle, setSharedImageTitle] = useState<string>('');
  const [sharedImageText, setSharedImageText] = useState<string>('');
  const [openMobileDevotionalId, setOpenMobileDevotionalId] = useState<'reflection' | 'passage' | 'prayer' | null>(null);
  const [isImageShareSheetOpen, setIsImageShareSheetOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [imageSheetMode, setImageSheetMode] = useState<'preview' | 'share'>('preview');
  const [isPreparingImageShare, setIsPreparingImageShare] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sectionRefs = {
    image: useRef<HTMLElement>(null),
    news: useRef<HTMLElement>(null),
    video: useRef<HTMLElement>(null),
    reflection: useRef<HTMLElement>(null),
    testimony: useRef<HTMLElement>(null),
  };

  const scrollToSection = (kind: keyof typeof sectionRefs) => {
    sectionRefs[kind]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim() && onOpenSearch) {
      onOpenSearch(searchQuery.trim());
    }
  };
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);

  const oldTestamentCount = books.filter(b => b.testament.toLowerCase().includes('antiguo') || b.testament.toLowerCase().includes('old')).length;
  const newTestamentCount = books.length - oldTestamentCount;
  const resumeLabel = selectedBook ? `${selectedBook.names[0]} ${selectedChapter}` : t('home.open_books_detail');
  const dailyContent = useDailyContent(currentLanguage);
  const appShareUrl = getAppShareUrl();

  const preferredDailyVerseNumber = dailyVerse ? (() => {
    const labelText = String(dailyVerse?.label ?? '');
    const match = labelText.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : dailyVerse?.verse?.number;
  })() : undefined;

  const dailyVerseShareUrl = dailyVerse ? getReaderShareUrl({
    bookAbrev: dailyVerse.bookAbrev,
    chapter: dailyVerse.chapter,
    verseNumber: preferredDailyVerseNumber ?? dailyVerse.verse.number,
  }) : '';

  useEffect(() => {
    let mounted = true;
    async function loadDaily() {
      setLoadingDaily(true);
      try {
        const { getDailyVerseWithImage } = await import('@/src/lib/dailyVerse');
        const result = await getDailyVerseWithImage(currentLanguage);
        if (mounted) {
          setDailyVerse(result);
          setDailyImage(result.imageUrl || null);
        }
      } catch (e) {
        if (mounted) { setDailyVerse(null); setDailyImage(null); }
      } finally {
        if (mounted) setLoadingDaily(false);
      }
    }
    loadDaily();
    return () => { mounted = false; };
  }, [currentLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobileViewport(nextIsMobile);
      if (!nextIsMobile) setIsMobileDeferredContentReady(true);
    };
    window.addEventListener('resize', updateViewport);
    updateViewport();
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) { setIsMobileDeferredContentReady(true); return; }
    setIsMobileDeferredContentReady(false);
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      startTransition(() => setIsMobileDeferredContentReady(true));
    };
    const handle = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(reveal, { timeout: 900 })
      : window.setTimeout(reveal, 420);
    return () => { cancelled = true; typeof handle === 'number' ? window.clearTimeout(handle) : window.cancelIdleCallback?.(handle); };
  }, [isMobileViewport]);

  useEffect(() => () => revokeVerseImageAsset(sharedImageAsset), [sharedImageAsset]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(SAVED_DAILY_IMAGE_STORAGE_KEY, JSON.stringify(savedDailyImageIds));
  }, [savedDailyImageIds]);

  const handleScrollToTop = () => {
    const root = document.querySelector<HTMLElement>('[data-home-scroll-root="true"]');
    root?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHomeClick = () => {
    if (onGoHome) {
      onGoHome();
    }
    handleScrollToTop();
  };

  const mobileNavItems = [
    { id: 'home', label: t('app.home'), icon: <House className="h-5 w-5" />, onClick: handleHomeClick, active: true },
    { id: 'reader', label: t('menu.books'), icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReaderSelector ?? onContinueReading },
    { id: 'search', label: t('menu.search'), icon: <Search className="h-5 w-5" />, onClick: onOpenSearch ?? (() => {}) },
    { id: 'user', label: t('menu.user'), icon: <User className="h-5 w-5" />, onClick: onOpenUser ?? (() => {}) },
    { id: 'game', label: t('menu.game'), icon: <Gamepad2 className="h-5 w-5" />, onClick: onOpenGame },
    { id: 'plans', label: t('menu.plans'), icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans ?? (() => {}) },
  ];

  const handleCompanionAction = (kind: DailyContentKind, resource: DailyResourceCard) => {
    if (resource.verseReference) {
      onOpenVerse(resource.verseReference.bookAbrev, resource.verseReference.chapter, resource.verseReference.verseNumber);
      return;
    }
    if (kind === 'image') { void handleImagePreview(resource); return; }
    if (resource.sourceUrl) { void openExternalUrl(resource.sourceUrl); return; }
    onOpenDailyExperience();
  };

  const handleReflectionListen = () => {
    if (!canUseSpeechSynthesis()) { void handleCompanionAction('reflection', dailyContent.reflection); return; }
    cancelSpeech();
    speakText({
      text: [dailyContent.reflection.title, dailyContent.reflection.body, dailyContent.reflection.quote].filter(Boolean).join('. '),
      lang: currentLanguage === 'en' ? 'en-US' : 'es-ES',
      voiceURI,
    });
  };

  const mobileCopy = currentLanguage === 'en'
    ? { devotional: 'Today\'s devotion', listen: 'Listen', read: 'Read', passage: 'Passage of the day', prayer: 'Prayer of the day', images: 'Visual inspiration', sermons: 'Recent sermons', news: 'Recent news', videos: 'Recent videos', reflections: 'Recent reflections', testimonies: 'Faith stories', versesSection: 'Verse of the day', minRead: '4 min' }
    : { devotional: 'Devocional de hoy', listen: 'Escuchar', read: 'Leer', passage: 'Pasaje del día', prayer: 'Oración del día', images: 'Inspiración visual', sermons: 'Prédicas recientes', news: 'Noticias recientes', videos: 'Videos recientes', reflections: 'Reflexiones recientes', testimonies: 'Historias de fe', versesSection: 'Versículo del día', minRead: '4 min' };

  const devotionalItems = [
    { id: 'reflection' as const, icon: <Quote className="h-4 w-4" />, title: t('app.reflection_of_day'), reference: dailyContent.reflection.verseReference ? dailyContent.reflection.verseReference[currentLanguage === 'en' ? 'labelEn' : 'labelEs'] : dailyVerse?.label ?? '', detail: mobileCopy.minRead, body: dailyContent.reflection.body, primaryLabel: mobileCopy.listen, primaryAction: handleReflectionListen, secondaryLabel: mobileCopy.read, secondaryAction: () => { void handleCompanionAction('reflection', dailyContent.reflection); } },
    { id: 'passage' as const, icon: <BookOpen className="h-4 w-4" />, title: mobileCopy.passage, reference: dailyVerse?.label ?? '', detail: dailyVerse?.label ?? '', body: dailyVerse?.verse?.verse ?? '', primaryLabel: t('app.challenge_open_passage'), primaryAction: dailyVerse ? () => onOpenVerse(dailyVerse.bookAbrev, dailyVerse.chapter, preferredDailyVerseNumber ?? dailyVerse.verse.number) : () => {} },
    { id: 'prayer' as const, icon: <Sparkles className="h-4 w-4" />, title: mobileCopy.prayer, reference: t('menu.daily_challenges'), detail: `${challengeSummary.completedToday}/${challengeSummary.totalDailyTasks}`, body: currentLanguage === 'en' ? 'Open your daily rhythm and turn today\'s passage into a short prayer.' : 'Abre tu rutina diaria y convierte el pasaje de hoy en una oración breve.', primaryLabel: t('menu.daily_challenges'), primaryAction: onOpenDailyExperience },
  ];

  const handleImagePreview = async (resource: DailyResourceCard) => {
    if (isPreparingImageShare) return;
    setIsPreparingImageShare(true);
    try {
      const referenceLabel = resource.verseReference ? resource.verseReference[currentLanguage === 'en' ? 'labelEn' : 'labelEs'] : t('app.image_of_day');
      let previewText = resource.quote ?? resource.body;
      if (resource.verseReference) {
        try {
          const book = books.find(b => b.abrev.toUpperCase() === resource.verseReference?.bookAbrev.toUpperCase());
          if (book) {
            const ch = await fetchChapter(book.names[0], resource.verseReference.chapter, currentLanguage);
            const v = ch.vers.find(vv => vv.number === resource.verseReference?.verseNumber);
            if (v) previewText = v.verse.trim();
          }
        } catch (e) {}
      }
      const asset = await createVerseImageAsset({ imageUrl: resource.imageUrl, verseText: previewText, reference: referenceLabel, badge: getDailyCompanionLabel('image', t), appName: t('app.title') });
      if (!asset) return;
      setSharedImageAsset((curr: any) => { revokeVerseImageAsset(curr); return asset; });
      setActiveImageResourceId(resource.id);
      setActiveImageVerseReference(resource.verseReference ?? null);
      setSharedImageTitle(referenceLabel);
      setSharedImageText(previewText);
      setImageSheetMode('preview');
      setIsImageShareSheetOpen(true);
    } finally { setIsPreparingImageShare(false); }
  };

  const handleShareDailyVerse = async () => {
    if (!dailyVerse) return;
    const shareText = buildVerseShareText({ reference: dailyVerse.label, verseText: dailyVerse.verse.verse, shareUrl: dailyVerseShareUrl });
    await onShareContent({ title: dailyVerse.label, text: shareText, url: dailyVerseShareUrl });
  };

  const renderAppUpdateNotice = (cls?: string) => {
    if (!availableAppUpdate || !onOpenAppUpdate) return null;
    const isEn = currentLanguage.startsWith('en');
    const releaseNotes = isEn && availableAppUpdate.notesEn?.length
      ? availableAppUpdate.notesEn
      : availableAppUpdate.notes;
    return (
      <section className={cn('rounded-[26px] border border-[#f3c96f]/35 bg-[linear-gradient(135deg,_rgba(243,201,111,0.14),_rgba(7,21,37,0.94))] p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.22)]', cls)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#f5d991]">{isEn ? 'Update available' : 'Actualización'}</p>
            <p className="mt-2 text-sm font-semibold text-white">{isEn ? `Version ${availableAppUpdate.version} ready` : `Versión ${availableAppUpdate.version} lista`}</p>
          </div>
          {onDismissAppUpdate && (
            <button onClick={onDismissAppUpdate} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-white/72 transition-all hover:text-white"><X className="h-4 w-4" /></button>
          )}
        </div>
        {releaseNotes && releaseNotes.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-white/80">
            {releaseNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        )}
        <button onClick={onOpenAppUpdate} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f3c96f] px-5 py-3 text-[11px] font-bold uppercase text-[#13233d] transition-all hover:-translate-y-0.5">
          {isEn ? 'Download' : 'Descargar'} <ExternalLink className="h-4 w-4" />
        </button>
      </section>
    );
  };

  const WebNavDropdown = ({ label, items, isDarkMode, onClick }: { label: string, items: { label: string, onClick: () => void }[], isDarkMode: boolean, onClick?: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div
        className="relative group"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button
          onClick={onClick}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all",
            isDarkMode ? "text-white/60 hover:text-white" : "text-[#102542]/60 hover:text-[var(--primary)]"
          )}
        >
          {label}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 top-full pt-2 z-[100] min-w-[600px]"
            >
              <div className={cn(
                "rounded-2xl border shadow-2xl overflow-hidden p-6",
                isDarkMode ? "bg-[#0b1a30] border-white/10" : "bg-white border-slate-200"
              )}>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-4 pb-2 border-b", isDarkMode ? "text-white/30 border-white/5" : "text-slate-400 border-slate-100")}>
                  {label}
                </p>
                <div className="grid grid-cols-3 gap-y-4 gap-x-8">
                  {items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { item.onClick(); setIsOpen(false); }}
                      className={cn(
                        "text-left text-[13px] font-medium transition-colors hover:text-[var(--primary)]",
                        isDarkMode ? "text-white/70" : "text-slate-600"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const WebNavItem = ({ label, onClick, active, isDarkMode }: { label: string, onClick?: () => void, active?: boolean, isDarkMode?: boolean }) => (
    <button onClick={onClick} className={cn("px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all", isDarkMode ? "text-white/60 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-[#102542]/60 hover:text-[var(--primary)] hover:bg-[#102542]/5", active && "text-[var(--primary)]")}>{label}</button>
  );

  const companionSections = dailyContent.sections.filter(s => s.items.length > 0).map(s => ({ ...s, title: getDailyCompanionSectionTitle(s.kind, mobileCopy), label: getDailyCompanionLabel(s.kind, t) }));

  const renderCompanionCard = (kind: DailyCompanionKind, label: string, resource: DailyResourceCard, compact = false) => {
    if (kind === 'image') return <DailyImageCard key={resource.id} label={label} resource={resource} currentLanguage={currentLanguage} isDarkMode={isDarkMode} isSaved={savedDailyImageIds.includes(resource.id)} onToggleSaved={() => setSavedDailyImageIds(curr => curr.includes(resource.id) ? curr.filter(id => id !== resource.id) : [resource.id, ...curr])} onOpenImage={() => { void handleImagePreview(resource); }} onOpenVerse={() => resource.verseReference && onOpenVerse(resource.verseReference.bookAbrev, resource.verseReference.chapter, resource.verseReference.verseNumber)} onShare={() => { void handleImagePreview(resource); }} compact={compact} />;
    return <DailyCompanionCard key={resource.id} kind={kind} label={label} resource={resource} isDarkMode={isDarkMode} onClick={() => { void handleCompanionAction(kind, resource); }} compact={compact} />;
  };

  return (
    <div data-home-scroll-root="true" className={cn('h-full overflow-y-auto transition-colors duration-300 flex flex-col', isDarkMode ? 'bg-[#04101f] text-white' : 'bg-[#f7fbff] text-[#102542]')}>
      <VerseImageShareSheet
        isOpen={isImageShareSheetOpen} onClose={() => setIsImageShareSheetOpen(false)} onHome={() => { setIsImageShareSheetOpen(false); if (onGoHome) onGoHome(); else handleScrollToTop(); }}
        mode={imageSheetMode} title={sharedImageTitle} text={sharedImageText} url={appShareUrl} previewUrl={sharedImageAsset?.objectUrl ?? null}
        canNativeShareImage={sharedImageAsset ? canNativeShareVerseImage(sharedImageAsset) : true}
        onNativeShareImage={async () => {
          if (sharedImageAsset) {
            const shareResult = await nativeShareVerseImage(sharedImageAsset, sharedImageTitle, sharedImageText);
            if (shareResult === 'unsupported') {
              setImageSheetMode('share');
            }
          } else {
            setImageSheetMode('share');
          }
        }}
        onDownloadImage={async () => {
          if (sharedImageAsset) {
            await downloadVerseImage(sharedImageAsset);
          }
        }}
        isSaved={activeImageVerseReference
          ? bookmarks.some((bookmark) => bookmark.bookAbrev.toUpperCase() === activeImageVerseReference.bookAbrev.toUpperCase() && bookmark.chapter === activeImageVerseReference.chapter && bookmark.verseNumber === activeImageVerseReference.verseNumber)
          : !!activeImageResourceId && savedDailyImageIds.includes(activeImageResourceId)}
        onToggleSaved={activeImageVerseReference ? () => {
          const reference = activeImageVerseReference;
          const favorite = bookmarks.find((bookmark) => bookmark.bookAbrev.toUpperCase() === reference.bookAbrev.toUpperCase() && bookmark.chapter === reference.chapter && bookmark.verseNumber === reference.verseNumber);
          if (favorite) onRemoveBookmark(favorite.id);
          else onAddBookmark(reference.bookAbrev, reference.chapter, reference.verseNumber, currentLanguage.startsWith('en') ? reference.labelEn : reference.labelEs);
        } : activeImageResourceId ? () => setSavedDailyImageIds((current) => current.includes(activeImageResourceId) ? current.filter((id) => id !== activeImageResourceId) : [activeImageResourceId, ...current]) : undefined}
        onViewInBible={activeImageVerseReference ? () => {
          const reference = activeImageVerseReference;
          setIsImageShareSheetOpen(false);
          onOpenVerse(reference.bookAbrev, reference.chapter, reference.verseNumber);
        } : undefined}
        headerBadge={imageSheetMode === 'preview' ? t('app.image_of_day') : t('app.share_verse_image')} headerTitle={imageSheetMode === 'preview' ? t('share_sheet.preview_title') : t('share_sheet.share_title')} headerSubtitle={imageSheetMode === 'preview' ? t('share_sheet.preview_subtitle') : t('share_sheet.share_subtitle')}
      />

      <div className="mx-auto flex flex-col flex-1 w-full max-w-[1600px]">
        {/* HEADER MOVIL */}
        <header className="lg:hidden sticky top-0 z-30 border-b border-white/10 bg-[#030812]/96 px-4 py-3 backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"><Menu className="h-5 w-5" /></button>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 p-1.5 bg-[#07152b] rounded-2xl border border-[#1d4f96]"><BrandSeal className="h-full w-full" showWordmark={false} /></div>
              <div className="min-w-0"><p className="truncate font-serif text-xl font-bold leading-none text-white">{t('app.title')}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#7fb8ff]">RV1960</p></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNativeApp && !Capacitor.isNativePlatform() && <button onClick={onOpenDownloadModal} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--primary)]/35 bg-[var(--primary)]/15 text-[var(--primary)]" title="Descargar APK" aria-label="Descargar APK"><Download className="h-5 w-5" /></button>}
            <button onClick={() => setIsHelpModalOpen(true)} className="help-action flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"><HelpCircle className="h-5 w-5 text-sky-400" /></button>
          </div>
        </header>

        {/* HEADER WEB */}
        <header className={cn('hidden lg:flex sticky top-0 z-50 border-b px-4 xl:px-6 py-2 backdrop-blur-xl transition-colors duration-300', isDarkMode ? 'bg-[#030812]/95 border-white/10' : 'bg-white/95 border-slate-200')}>
          <div className="mx-auto w-full max-w-[1600px] flex items-center justify-between gap-2 xl:gap-4">
            <div className="flex items-center gap-3 xl:gap-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={onMenuClick}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isDarkMode ? "text-white/60 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5"
                  )}
                  title="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer group" onClick={handleHomeClick}>
                  <div className={cn("h-8 w-8 xl:h-9 xl:w-9 p-1 rounded-lg border transition-colors shrink-0", isDarkMode ? "bg-[#07152b] border-[#1d4f96]" : "bg-[#f8fbff] border-blue-200")}>
                    <BrandSeal className="h-full w-full" showWordmark={false} />
                  </div>
                  <div className="flex flex-col">
                    <h1 className={cn('font-serif text-base xl:text-xl font-bold transition-colors whitespace-nowrap overflow-hidden', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t('app.title')}
                    </h1>
                    <p className="text-[9px] xl:text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)] leading-none">RV1960</p>
                  </div>
                </div>
              </div>
              <nav className="flex items-center gap-0.5 xl:gap-1">
                <button
                  onClick={handleHomeClick}
                  className={cn(
                    "help-action p-2 rounded-xl transition-all",
                    isDarkMode ? "text-white/60 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5"
                  )}
                  title="Inicio"
                >
                  <House className="h-5 w-5" />
                </button>
                <WebNavDropdown
                  label="Biblia y Estudio"
                  isDarkMode={isDarkMode}
                  onClick={() => { if (onOpenBookPicker) onOpenBookPicker('all'); else onOpenBooks('all', true); }}
                  items={[
                    { label: 'Toda la Biblia', onClick: () => onOpenBookPicker?.('all') },
                    { label: 'Antiguo Testamento', onClick: () => onOpenBookPicker?.('old') },
                    { label: 'Nuevo Testamento', onClick: () => onOpenBookPicker?.('new') },
                    { label: 'Estudio con IA', onClick: onOpenStudy },
                    { label: 'Planes de lectura', onClick: onOpenPlans ?? (() => {}) },
                    { label: 'Diccionario', onClick: onOpenDictionary ?? (() => {}) },
                  ]}
                />
                <WebNavDropdown
                  label="Noticias"
                  isDarkMode={isDarkMode}
                  items={[
                    { label: 'Noticias de hoy', onClick: () => scrollToSection('news') },
                    { label: 'Mundo Cristiano', onClick: () => scrollToSection('news') },
                    { label: 'Israel', onClick: () => scrollToSection('news') },
                  ]}
                />
                <WebNavDropdown
                  label="Recursos"
                  isDarkMode={isDarkMode}
                  items={[
                    { label: 'Testimonios Cristianos', onClick: () => scrollToSection('testimony') },
                    { label: 'Imágenes Cristianas', onClick: () => scrollToSection('image') },
                    { label: 'Predicaciones', onClick: () => scrollToSection('video') },
                    { label: 'Videos Cristianos', onClick: () => scrollToSection('video') },
                    { label: 'Reflexiones Cristianas', onClick: () => scrollToSection('reflection') },
                    { label: 'Aceptar a Jesús', onClick: onOpenDailyExperience },
                    { label: 'Mapa del sitio', onClick: () => {} },
                    { label: 'Widgets y plugins', onClick: () => {} },
                    { label: 'Contáctanos', onClick: () => window.location.assign('mailto:domingofeliztech@gmail.com') },
                  ]}
                />
                <WebNavItem label="Juegos" onClick={onOpenGame} isDarkMode={isDarkMode} />
              </nav>
            </div>
            <div className="flex items-center gap-2 xl:gap-4 shrink-0">
              <WebNavItem label={currentLanguage === 'en' ? 'Opinions' : 'Opiniones'} onClick={onOpenOpinions ?? (() => {})} isDarkMode={isDarkMode} />

              <button
                onClick={onOpenUser}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-blue-500/20"
              >
                <User className="h-4 w-4" />
                <span>Iniciar Sesión</span>
              </button>

              {!isNativeApp && !Capacitor.isNativePlatform() && (
                <button
                  type="button"
                  onClick={onOpenDownloadModal}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/35 bg-[var(--primary)]/12 px-3 py-2 text-xs font-bold text-[var(--primary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--primary)]/20"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar APK</span>
                </button>
              )}

              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={onToggleDarkMode}
                  className={cn(
                    "theme-toggle-action p-2 rounded-xl transition-all",
                    isDarkMode ? "text-white/50 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                  title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDarkMode ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-rose-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(true)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isDarkMode ? "text-white/50 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                  title="Ayuda"
                >
                  <HelpCircle className="help-action-icon h-5 w-5 text-sky-500" />
                </button>
              </div>
            </div>
          </div>
        </header>


        <div className="hidden lg:flex lg:flex-col">
          <div className="bg-[#0b1a30] py-8 border-b border-white/5">
            <div className="mx-auto max-w-6xl px-6">
              <form onSubmit={handleSearchSubmit} className="flex gap-2 p-1 bg-white rounded-lg shadow-xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Texto a consultar o Libro Cap:Ver (Ej: Juan 3:16)"
                  className="flex-1 px-4 py-3 text-slate-800 outline-none font-medium"
                />
                <button type="submit" className="bg-[#334155] p-3 rounded-md text-white transition-colors hover:bg-slate-700">
                  <Search className="h-6 w-6" />
                </button>
                <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-4 pr-2">
                  <select className="bg-transparent text-slate-600 text-sm font-bold outline-none cursor-pointer">
                    <option>Versiones</option>
                    <option>RV1960</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-widest text-white/40">
                 {['Toda la Biblia', 'Antiguo Testamento', 'Nuevo Testamento'].map(f => <label key={f} className="flex items-center gap-2 cursor-pointer hover:text-white"><input type="radio" name="filter" className="accent-[var(--primary)]" defaultChecked={f==='Toda la Biblia'} /> {f}</label>)}
                 <div className="h-4 w-px bg-white/10" />
                 {['Solo Biblia', 'Diccionario'].map(f => <label key={f} className="flex items-center gap-2 cursor-pointer hover:text-white"><input type="checkbox" className="accent-[var(--primary)]" defaultChecked={f==='Solo Biblia'} /> {f}</label>)}
              </div>
            </div>
          </div>
        </div>

        <main className="px-4 py-6 sm:px-6 lg:px-8 flex-1">
          {renderAppUpdateNotice('mb-6')}

          {/* BANNER VERSICULO WEB */}
          {homeSections.dailyVerse && dailyVerse && (
            <section className="hidden lg:block relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl mb-8 group cursor-pointer" onClick={() => void handleImagePreview({ id: 'dv', title: dailyVerse.label, body: dailyVerse.verse.verse, imageUrl: dailyImage, verseReference: { bookAbrev: dailyVerse.bookAbrev, chapter: dailyVerse.chapter, verseNumber: preferredDailyVerseNumber ?? dailyVerse.verse.number, labelEs: dailyVerse.label, labelEn: dailyVerse.label } } as any)}>
              <div className="absolute inset-0 z-0">
                {dailyImage ? <img src={dailyImage} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Daily" /> : <div className="h-full w-full bg-slate-900" />}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
              </div>
              <div className="relative z-10 p-10 flex flex-col justify-center min-h-[260px]">
                <div className="flex items-center gap-3 mb-4"><Sun className="h-6 w-6 text-[#f6c969]" /><span className="text-[#f6c969] font-bold uppercase tracking-[0.3em] text-xs">Versículo del día</span><div className="h-4 w-px bg-white/20 mx-2" /><span className="text-white text-xl font-serif font-bold">{dailyVerse.label}</span></div>
                <p className="text-3xl font-serif leading-relaxed text-white max-w-3xl mb-6">« {dailyVerse.verse.verse} »</p>
                <p className="text-white/50 text-sm font-medium">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </section>
          )}

          {/* VERSICULO MOVIL */}
          {homeSections.dailyVerse && dailyVerse && (
            <section className="lg:hidden relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1220] p-4 text-white shadow-xl mb-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#cfe5ff]">{mobileCopy.versesSection}</p><p className="mt-2 text-sm font-semibold text-white/90">{dailyVerse.label}</p></div>
                <button onClick={() => { void handleShareDailyVerse(); }} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 text-white"><Share2 className="h-4 w-4" /></button>
              </div>
              <button onClick={() => void handleImagePreview({ id: 'dv', title: dailyVerse.label, body: dailyVerse.verse.verse, imageUrl: dailyImage, verseReference: { bookAbrev: dailyVerse.bookAbrev, chapter: dailyVerse.chapter, verseNumber: preferredDailyVerseNumber ?? dailyVerse.verse.number, labelEs: dailyVerse.label, labelEn: dailyVerse.label } } as any)} className="mt-4 text-left font-serif text-[1.35rem] leading-8 text-white">{dailyVerse.verse.verse}</button>
            </section>
          )}

          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
            <div className="min-w-0 space-y-6">
              {/* DEVOCIONAL MOVIL */}
              {homeSections.devotional && (
                <section className="rounded-2xl border border-white/10 bg-[#111820] p-3.5 text-white sm:p-4">
                  <div className="mb-2 flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{mobileCopy.devotional}</p><span className="rounded-full bg-[#0f2d52] px-2 py-0.5 text-xs font-bold text-[#78b8ff]">{challengeSummary.completedToday}/{challengeSummary.totalDailyTasks}</span></div>
                  <div className="divide-y divide-white/8">
                    {devotionalItems.map(item => {
                      const isOpen = openMobileDevotionalId === item.id;
                      return (
                        <div key={item.id} className="py-1">
                          <button type="button" aria-expanded={isOpen} onClick={() => setOpenMobileDevotionalId(current => current === item.id ? null : item.id)} className="flex min-h-12 w-full min-w-0 items-center gap-3 py-2 text-left">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0f2d52] text-[#78b8ff]">{item.icon}</span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{item.title}</span>
                            <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/45 transition-transform', isOpen && 'rotate-180')} />
                          </button>
                          {isOpen && (
                            <div className="pb-3 pl-12 pr-1 pt-1">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#78b8ff]">{item.reference}</p>
                              <p className="text-sm leading-6 text-white/78">{item.body}</p>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button type="button" onClick={item.primaryAction} className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-2 py-2 text-[10px] font-bold uppercase text-white"><Volume2 className="h-4 w-4 shrink-0" />{item.primaryLabel}</button>
                                {item.secondaryAction && <button type="button" onClick={item.secondaryAction} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-bold uppercase text-white"><BookOpen className="h-4 w-4 shrink-0" />{item.secondaryLabel}</button>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* COMPANION SECTIONS (NOTICIAS, VIDEOS) */}
              {companionSections.map(section => {
                if (section.kind === 'image' && !homeSections.images) return null;
                if (section.kind === 'news' && !homeSections.news) return null;
                if (section.kind === 'video' && !homeSections.videos) return null;
                return (
                  <section key={section.id} ref={sectionRefs[section.kind] as any}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className={cn('text-xl font-bold', isDarkMode ? 'text-white' : 'text-[#102542]')}>{section.title}</h3>
                      <ChevronRight className={cn('h-5 w-5', isDarkMode ? 'text-white/30' : 'text-slate-400')} />
                    </div>
                      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
                        {section.items.slice(0, 4).map(r => renderCompanionCard(section.kind, section.label, r, true))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* SIDEBAR DERECHO WEB */}
            <aside className="hidden lg:block space-y-6">
               <div className="rounded-[32px] border border-white/10 bg-[#07162b] p-6 shadow-xl">
                 <div className="flex items-center justify-between gap-4 mb-6"><h3 className="font-serif text-xl font-bold text-white">Tu Progreso</h3><StatCard icon={<Flame className="h-4 w-4" />} label="" shortLabel="" value={String(challengeSummary.streak)} accent="orange" isDarkMode={isDarkMode} /></div>
                 <div className="space-y-3">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><p className="text-[10px] font-bold text-[#f6c969] uppercase tracking-widest mb-1">Recompensas</p><p className="text-2xl font-bold text-white">{challengeSummary.totalRewardPoints} pts</p></div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><p className="text-[10px] font-bold text-[#4fa8ff] uppercase tracking-widest mb-1">Libros Guardados</p><p className="text-2xl font-bold text-white">{bookmarksCount}</p></div>
                 </div>
               </div>
               <div className="rounded-[32px] border border-white/10 bg-[#07162b] p-6 shadow-xl">
                  <h3 className="font-serif text-xl font-bold text-white mb-4">Metas Semanales</h3>
                  <div className="space-y-2">
                     {[t('app.weekly_goal_daily'), t('app.weekly_goal_chapters'), t('app.weekly_goal_searches')].map(goal => (
                       <div key={goal} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-xs"><span className="text-white/70">{goal}</span><span className="text-[#4fa8ff]">Listo</span></div>
                     ))}
                  </div>
               </div>
            </aside>
          </div>
        </main>
        <MobilePageFooter
          className="mt-auto"
          onOpenAboutLegal={onOpenAboutLegal}
          onOpenOpinions={onOpenOpinions}
          onOpenDictionary={onOpenDictionary}
        />
      </div>

      <HelpGuideModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} isDarkMode={isDarkMode} />
      <MobileBottomNav items={mobileNavItems} />
      <ScrollToTopButton targetSelector='[data-home-scroll-root="true"]' label={currentLanguage.startsWith('en') ? 'Back to top' : 'Volver arriba'} />
    </div>
  );
}

function getDailyCompanionLabel(kind: DailyCompanionKind, t: (key: string) => string) {
  switch (kind) {
    case 'video': return t('app.video_of_day');
    case 'sermon': return t('app.sermon_of_day');
    case 'reflection': return t('app.reflection_of_day');
    case 'testimony': return t('app.testimony_of_day');
    case 'news': return t('app.news_of_day');
    case 'image': default: return t('app.image_of_day');
  }
}

function getDailyCompanionSectionTitle(kind: DailyCompanionKind, mc: any) {
  switch (kind) {
    case 'image': return mc.images;
    case 'sermon': return mc.sermons;
    case 'video': return mc.videos;
    case 'reflection': return mc.reflections;
    case 'testimony': return mc.testimonies;
    case 'news': default: return mc.news;
  }
}

function getDailyCompanionIcon(kind: DailyCompanionKind) {
  switch (kind) {
    case 'video': return <PlayCircle className="h-5 w-5" />;
    case 'sermon': return <Volume2 className="h-5 w-5" />;
    case 'reflection': return <Quote className="h-5 w-5" />;
    case 'testimony': return <Heart className="h-5 w-5" />;
    case 'news': return <Newspaper className="h-5 w-5" />;
    case 'image': default: return <Image className="h-5 w-5" />;
  }
}

function getDailyCompanionTone(kind: DailyCompanionKind, isDarkMode: boolean) {
  if (!isDarkMode) {
    switch (kind) {
      case 'video': return 'border-[#bfe7ff] bg-[#edf8ff] text-[#1d5b7f]';
      case 'sermon': return 'border-[#cfe6be] bg-[#f4faee] text-[#4b6f2d]';
      case 'reflection': return 'border-[#d7d0ff] bg-[#f3f0ff] text-[#4d4a94]';
      case 'testimony': return 'border-[#ffd0ae] bg-[#fff4ea] text-[#93572a]';
      case 'news': return 'border-[#c8ddff] bg-[#edf4ff] text-[#365f96]';
      case 'image': default: return 'border-[#f9dc9e] bg-[#fff8e8] text-[#8c6c1b]';
    }
  }
  switch (kind) {
    case 'video': return 'border-[#62d4ff]/24 bg-[#62d4ff]/10 text-[#ddf8ff]';
    case 'sermon': return 'border-[#9bd18f]/24 bg-[#9bd18f]/10 text-[#ecffd9]';
    case 'reflection': return 'border-[#8f7dff]/24 bg-[#8f7dff]/10 text-[#ecebff]';
    case 'testimony': return 'border-[#ff9b54]/24 bg-[#ff9b54]/10 text-[#ffd6b6]';
    case 'news': return 'border-[#5eb8ff]/24 bg-[#5eb8ff]/10 text-[#dff1ff]';
    case 'image': default: return 'border-[#f6c969]/24 bg-[#f6c969]/10 text-[#ffe7a8]';
  }
}

function DailyCompanionCard({ kind, label, resource, isDarkMode, onClick, compact = false }: { kind: DailyCompanionKind, label: string, resource: DailyResourceCard, isDarkMode: boolean, onClick: () => void, compact?: boolean }) {
  const publishedLabel = resource.publishedAt && Number.isFinite(Date.parse(resource.publishedAt))
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(resource.publishedAt))
    : null;
  return (
    <button type="button" onClick={onClick} className={cn('group overflow-hidden rounded-[26px] border text-left transition-all', getDailyCompanionTone(kind, isDarkMode), compact ? 'w-[min(86vw,22rem)] shrink-0 snap-start p-3.5 sm:w-full sm:min-w-0' : 'w-full p-4')}>
      <div className={cn('relative overflow-hidden rounded-[22px] aspect-[16/10] bg-black/20')}>
        {resource.imageUrl && <img src={resource.imageUrl} className="h-full w-full object-cover" loading="lazy" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4"><h4 className="font-serif font-bold text-white leading-tight">{resource.title}</h4></div>
      </div>
      <div className="mt-4"><p className="text-sm line-clamp-2 opacity-80">{resource.body}</p><p className="mt-2 text-xs opacity-60">{resource.sourceName}{publishedLabel ? ` · ${publishedLabel}` : ''}</p></div>
    </button>
  );
}

function DailyImageCard({ label, resource, currentLanguage, isDarkMode, isSaved, onToggleSaved, onOpenImage, onOpenVerse, onShare, compact = false }: any) {
  return (
    <article className={cn('group overflow-hidden rounded-[24px] border', compact ? 'w-[min(86vw,22rem)] shrink-0 snap-start p-3.5 sm:w-full sm:min-w-0' : 'w-full p-4', isDarkMode ? 'border-white/10 bg-white/5' : 'border-[#d5e4f3] bg-white')}>
      <div className="relative overflow-hidden rounded-[20px] aspect-[16/10] cursor-pointer" onClick={onOpenImage}>
        {resource.imageUrl && <img src={resource.imageUrl} className="h-full w-full object-cover" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white"><p className="font-serif italic text-lg leading-tight line-clamp-3">{resource.quote || resource.title}</p></div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onOpenImage} className="flex-1 rounded-full bg-[var(--primary)] py-2 text-[10px] font-bold uppercase text-white">Ver</button>
        <button onClick={onShare} className="flex-1 rounded-full border border-white/10 py-2 text-[10px] font-bold uppercase">Compartir</button>
      </div>
    </article>
  );
}

function HorizontalDragRail({ className, children, ariaLabel }: { className?: string, children: ReactNode, ariaLabel?: string }) {
  return <div className={cn('flex gap-4 overflow-x-auto no-scrollbar', className)}>{children}</div>;
}

function QuickActionCard({ icon, label, detail, tone, onClick }: any) {
  const ts: any = { gold: 'bg-[#f6c969]/10 text-[#ffe7a8] border-[#f6c969]/20', blue: 'bg-[#5eb8ff]/10 text-[#dff1ff] border-[#5eb8ff]/20', violet: 'bg-[#7e7bff]/10 text-[#ecebff] border-[#7e7bff]/20', sky: 'bg-[#62d4ff]/10 text-[#ddf8ff] border-[#62d4ff]/20' };
  return <button onClick={onClick} className={cn('rounded-[24px] border p-4 text-left transition-all hover:scale-[1.02]', ts[tone])}><div className="h-10 w-10 flex items-center justify-center rounded-xl bg-black/20 mb-3">{icon}</div><p className="text-[10px] font-bold uppercase tracking-widest">{label}</p><p className="text-xs opacity-70 mt-1">{detail}</p></button>;
}

function StatCard({ icon, label, shortLabel, value, accent, isDarkMode }: any) {
  const as: any = { orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20', gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  return <div className={cn('rounded-2xl border p-4 flex flex-col items-center justify-center text-center', as[accent])}><div className="mb-2">{icon}</div><p className="text-[10px] font-bold uppercase opacity-60 mb-1">{shortLabel || label}</p><p className="text-3xl font-serif font-bold">{value}</p></div>;
}
