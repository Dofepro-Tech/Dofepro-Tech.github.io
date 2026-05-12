import { startTransition, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Book, ReadingChallengeSummary, SidebarBookFilter, Verse } from '@/src/types';
import { type DailyContentKind, type DailyResourceCard } from '@/src/lib/dailyContent';
import { useDailyContent } from '@/src/hooks/useDailyContent';
import { normalizeAppLanguage } from '@/src/lib/language';
import { openExternalUrl } from '@/src/lib/openExternalUrl';
import { buildVerseShareText, getAppShareUrl, getReaderShareUrl, type SharePayload } from '@/src/lib/share';
import { canUseSpeechSynthesis, cancelSpeech, speakText } from '@/src/lib/speech';
import { cn } from '@/src/lib/utils';
import { AppOverflowMenu } from '@/src/components/AppOverflowMenu';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { VerseImageShareSheet } from '@/src/components/VerseImageShareSheet';
import { canNativeShareVerseImage, createVerseImageAsset, downloadVerseImage, nativeShareVerseImage, revokeVerseImageAsset, type VerseImageAsset } from '@/src/lib/shareVerseImage';
import { fetchChapter } from '@/src/services/bibleApi';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { BookHeart, BookOpen, Bookmark, Calendar, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Flame, Gamepad2, Heart, House, Image, LibraryBig, Menu, Moon, Newspaper, PlayCircle, Quote, Search, Share2, Sparkles, Star, Sun, SunMoon, User, Volume2, X } from 'lucide-react';

const SAVED_DAILY_IMAGE_STORAGE_KEY = 'biblia_nj_saved_daily_images_v1';

function readStoredSavedDailyImages() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const rawValue = window.localStorage.getItem(SAVED_DAILY_IMAGE_STORAGE_KEY);
    if (!rawValue) {
      return [] as string[];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === 'string')
      : [];
  } catch (error) {
    console.error('Error reading saved daily images:', error);
    return [] as string[];
  }
}

interface HomeScreenProps {
  books: Book[];
  selectedBook: Book | null;
  selectedChapter: number;
  bookmarksCount: number;
  challengeSummary: ReadingChallengeSummary;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  voiceURI: string;
  setVoiceURI: (uri: string) => void;
  onShare: () => void;
  onMenuClick: () => void;
  onOpenBooks: (filter?: SidebarBookFilter) => void;
  onContinueReading: () => void;
  onOpenReaderSelector?: () => void;
  onOpenStudy: () => void;
  onOpenDailyExperience: () => void;
  onOpenFavorites: () => void;
  onOpenGame: () => void;
  onOpenSearch?: () => void;
  onOpenPlans?: () => void;
  onOpenUser?: () => void;
  onGoHome?: () => void;
  onOpenVerse: (bookAbrev: string, chapter: number, verseNumber: number) => void;
  onShareContent: (payload: SharePayload) => void | Promise<void>;
  availableAppUpdate?: {
    version: string;
    currentVersion: string;
    publishedAt?: string;
  } | null;
  onOpenAppUpdate?: () => void;
  onDismissAppUpdate?: () => void;
  dailyVerse: {
    id: string;
    bookAbrev: string;
    chapter: number;
    verse: Verse;
    label: string;
  };
}

export function HomeScreen({
  books,
  selectedBook,
  selectedChapter,
  bookmarksCount,
  challengeSummary,
  isDarkMode,
  onToggleDarkMode,
  fontSize,
  setFontSize,
  accentColor,
  setAccentColor,
  voiceURI,
  setVoiceURI,
  onShare,
  onMenuClick,
  onOpenBooks,
  onContinueReading,
  onOpenReaderSelector,
  onOpenStudy,
  onOpenDailyExperience,
  onOpenFavorites,
  onOpenGame,
  onOpenSearch,
  onOpenPlans,
  onOpenUser,
  onGoHome,
  onOpenVerse,
  onShareContent,
  availableAppUpdate,
  onOpenAppUpdate,
  onDismissAppUpdate,
  dailyVerse,
}: HomeScreenProps) {
  const { t, i18n } = useTranslation();
  const [openMobileDevotionalId, setOpenMobileDevotionalId] = useState<'reflection' | 'passage' | 'prayer'>('reflection');
  const [isImageShareSheetOpen, setIsImageShareSheetOpen] = useState(false);
  const [isPreparingImageShare, setIsPreparingImageShare] = useState(false);
  const [sharedImageAsset, setSharedImageAsset] = useState<VerseImageAsset | null>(null);
  const [sharedImageTitle, setSharedImageTitle] = useState('');
  const [sharedImageText, setSharedImageText] = useState('');
  const [imageSheetMode, setImageSheetMode] = useState<'preview' | 'share'>('share');
  const [savedDailyImageIds, setSavedDailyImageIds] = useState<string[]>(() => readStoredSavedDailyImages());
  const [activeImageResourceId, setActiveImageResourceId] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window === 'undefined' ? false : window.innerWidth < 1024));
  const [isMobileDeferredContentReady, setIsMobileDeferredContentReady] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const oldTestamentCount = books.filter((book) => {
    const testament = book.testament.toLowerCase();
    return testament.includes('antiguo') || testament.includes('old');
  }).length;
  const newTestamentCount = books.length - oldTestamentCount;
  const resumeLabel = selectedBook ? `${selectedBook.names[0]} ${selectedChapter}` : t('menu.books');
  const dailyContent = useDailyContent(currentLanguage);
  const imageItem = dailyContent.image;
  const appShareUrl = getAppShareUrl();
  const dailyVerseShareUrl = getReaderShareUrl({
    bookAbrev: dailyVerse.bookAbrev,
    chapter: dailyVerse.chapter,
    verseNumber: dailyVerse.verse.number,
  });
  const pageTone = isDarkMode
    ? 'bg-[#04101f] text-white'
    : 'bg-[linear-gradient(180deg,#eef5ff_0%,#f7fbff_44%,#f5f5f0_100%)] text-[#102542]';
  const headerTone = isDarkMode
    ? 'border-white/10 bg-[#07172e]/92'
    : 'border-[#cfe0f2] bg-white/92';
  const headerButtonTone = isDarkMode
    ? 'border-white/10 bg-white/5 text-white hover:border-[#4fa8ff]/40 hover:bg-[#10284f]'
    : 'border-[#d4e2f1] bg-white text-[#153153] hover:border-[#4fa8ff]/35 hover:bg-[#edf5ff]';
  const headerBadgeTone = isDarkMode ? 'text-[#87bfff]' : 'text-[#4d7bb3]';
  const headerTitleTone = isDarkMode ? 'text-white' : 'text-[#102542]';
  const footerHintTone = isDarkMode ? 'text-[#8fb6de]' : 'text-[#587392]';
  const desktopSectionTone = isDarkMode
    ? 'border-white/10 bg-[#07162b] text-white shadow-[0_18px_60px_rgba(0,0,0,0.22)]'
    : 'border-[#d8e6f4] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] text-[#102542] shadow-[0_18px_50px_rgba(36,74,116,0.12)]';
  const desktopSectionBadgeTone = isDarkMode ? 'text-[#7fb8ff]' : 'text-[#4d7bb3]';
  const desktopSectionTitleTone = isDarkMode ? 'text-white' : 'text-[#102542]';
  const desktopSectionBodyTone = isDarkMode ? 'text-[#cfe2ff]' : 'text-[#4f6988]';
  const desktopChipTone = isDarkMode
    ? 'border-white/10 bg-white/5 text-[#d6e9ff]'
    : 'border-[#d4e2f1] bg-[#f2f8ff] text-[#153153]';
  const mobileCopy = currentLanguage === 'en'
    ? {
        devotional: 'Today\'s devotion',
        listen: 'Listen',
        read: 'Read',
        passage: 'Passage of the day',
        prayer: 'Prayer of the day',
        images: 'Images of the day',
        sermons: 'Sermons of the day',
        news: 'News of today',
        videos: 'Videos of the day',
        reflections: 'Reflections of the day',
        testimonies: 'Testimonies of the day',
        versesSection: 'Verse of the day',
        minRead: '4 min',
        chapterTab: 'Chapter',
        verseTab: 'Verse',
      }
    : {
        devotional: 'Devocional de hoy',
        listen: 'Escuchar',
        read: 'Leer',
        passage: 'Pasaje del día',
        prayer: 'Oración del día',
        images: 'Imágenes del día',
        sermons: 'Prédicas del día',
        news: 'Noticias de hoy',
        videos: 'Videos del día',
        reflections: 'Reflexiones del día',
        testimonies: 'Testimonios del día',
        versesSection: 'Versículo del día',
        minRead: '4 min',
        chapterTab: 'Capítulo',
        verseTab: 'Versículo',
      };
  const companionSections = dailyContent.sections.map((section) => ({
      ...section,
      title: getDailyCompanionSectionTitle(section.kind, mobileCopy),
      label: getDailyCompanionLabel(section.kind, t),
    }));
  const visibleMobileCompanionSections = isMobileDeferredContentReady
    ? companionSections
    : companionSections.slice(0, 2);
  const canListenReflection = canUseSpeechSynthesis();
  const verseReferenceLabel = dailyVerse.label;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateViewport = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobileViewport(nextIsMobile);

      if (!nextIsMobile) {
        setIsMobileDeferredContentReady(true);
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileDeferredContentReady(true);
      return undefined;
    }

    setIsMobileDeferredContentReady(false);

    let cancelled = false;
    const revealDeferredContent = () => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setIsMobileDeferredContentReady(true);
      });
    };

    const idleHandle = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(revealDeferredContent, { timeout: 900 })
      : window.setTimeout(revealDeferredContent, 420);

    return () => {
      cancelled = true;

      if (typeof idleHandle === 'number') {
        window.clearTimeout(idleHandle);
        return;
      }

      window.cancelIdleCallback?.(idleHandle);
    };
  }, [dailyContent, isMobileViewport]);

  useEffect(() => {
    return () => {
      revokeVerseImageAsset(sharedImageAsset);
    };
  }, [sharedImageAsset]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SAVED_DAILY_IMAGE_STORAGE_KEY, JSON.stringify(savedDailyImageIds));
  }, [savedDailyImageIds]);

  const handleScrollToTop = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.querySelector<HTMLElement>('[data-home-scroll-root="true"]');
    root?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mobileNavItems = [
    {
      id: 'home',
      label: t('app.home'),
      icon: <House className="h-5 w-5" />,
      onClick: handleScrollToTop,
      active: true,
    },
    {
      id: 'reader',
      label: t('menu.books'),
      icon: <BookOpen className="h-5 w-5" />,
      onClick: onOpenReaderSelector ?? onContinueReading,
    },
    {
      id: 'search',
      label: t('app.search_book'),
      icon: <Search className="h-5 w-5" />,
      onClick: () => onOpenSearch?.(),
    },
    {
      id: 'plans',
      label: currentLanguage === 'en' ? 'Plans' : 'Planes',
      icon: <Calendar className="h-5 w-5" />,
      onClick: () => onOpenPlans?.(),
    },
    {
      id: 'favorites',
      label: t('menu.favorites'),
      icon: <Heart className="h-5 w-5" />,
      onClick: onOpenFavorites,
    },
    {
      id: 'user',
      label: currentLanguage === 'en' ? 'User' : 'Usuario',
      icon: <User className="h-5 w-5" />,
      onClick: () => onOpenUser?.(),
    },
  ];

  const handleCompanionAction = async (kind: DailyCompanionKind, resource: DailyResourceCard) => {
    if (kind === 'image') {
      if (resource.sourceUrl || resource.imageUrl) {
        await openExternalUrl(resource.sourceUrl ?? resource.imageUrl ?? '');
        return;
      }

      if (resource.verseReference) {
        onOpenVerse(resource.verseReference.bookAbrev, resource.verseReference.chapter, resource.verseReference.verseNumber);
        return;
      }

      return;
    }

    if (resource.sourceUrl) {
      await openExternalUrl(resource.sourceUrl);
      return;
    }

    if (resource.verseReference) {
      onOpenVerse(resource.verseReference.bookAbrev, resource.verseReference.chapter, resource.verseReference.verseNumber);
      return;
    }

    onOpenDailyExperience();
  };

  const handleReflectionListen = () => {
    if (!canListenReflection) {
      void handleCompanionAction('reflection', dailyContent.reflection);
      return;
    }

    cancelSpeech();
    speakText({
      text: [dailyContent.reflection.title, dailyContent.reflection.body, dailyContent.reflection.quote].filter(Boolean).join('. '),
      lang: currentLanguage === 'en' ? 'en-US' : 'es-ES',
      voiceURI,
    });
  };

  const devotionalItems = [
    {
      id: 'reflection' as const,
      icon: <Quote className="h-4 w-4" />,
      title: t('app.reflection_of_day'),
      reference: dailyContent.reflection.verseReference
        ? dailyContent.reflection.verseReference[currentLanguage === 'en' ? 'labelEn' : 'labelEs']
        : verseReferenceLabel,
      detail: mobileCopy.minRead,
      body: dailyContent.reflection.body,
      primaryLabel: mobileCopy.listen,
      primaryAction: handleReflectionListen,
      secondaryLabel: mobileCopy.read,
      secondaryAction: () => { void handleCompanionAction('reflection', dailyContent.reflection); },
    },
    {
      id: 'passage' as const,
      icon: <BookOpen className="h-4 w-4" />,
      title: mobileCopy.passage,
      reference: verseReferenceLabel,
      detail: dailyVerse.label,
      body: dailyVerse.verse.verse,
      primaryLabel: t('app.challenge_open_passage'),
      primaryAction: () => onOpenVerse(dailyVerse.bookAbrev, dailyVerse.chapter, dailyVerse.verse.number),
    },
    {
      id: 'prayer' as const,
      icon: <Sparkles className="h-4 w-4" />,
      title: mobileCopy.prayer,
      reference: t('menu.daily_challenges'),
      detail: `${challengeSummary.completedToday}/${challengeSummary.totalDailyTasks}`,
      body: currentLanguage === 'en'
        ? 'Open your daily rhythm and turn today\'s passage into a short prayer.'
        : 'Abre tu rutina diaria y convierte el pasaje de hoy en una oración breve.',
      primaryLabel: t('menu.daily_challenges'),
      primaryAction: onOpenDailyExperience,
    },
  ];
  const renderCompanionCard = (kind: DailyCompanionKind, label: string, resource: DailyResourceCard, compact = false) => {
    if (kind === 'image') {
      return (
        <DailyImageCard
          key={resource.id}
          label={label}
          resource={resource}
          currentLanguage={currentLanguage}
          isDarkMode={isDarkMode}
          isSaved={savedDailyImageIds.includes(resource.id)}
          onToggleSaved={() => {
            setSavedDailyImageIds((currentSavedImages) => (
              currentSavedImages.includes(resource.id)
                ? currentSavedImages.filter((savedId) => savedId !== resource.id)
                : [resource.id, ...currentSavedImages]
            ));
          }}
          onOpenImage={() => { void handleImagePreview(resource); }}
          onOpenVerse={() => {
            if (resource.verseReference) {
              onOpenVerse(resource.verseReference.bookAbrev, resource.verseReference.chapter, resource.verseReference.verseNumber);
            }
          }}
          onShare={() => { void handleImageShare(resource); }}
          compact={compact}
        />
      );
    }

    return (
      <DailyCompanionCard
        key={resource.id}
        kind={kind}
        label={label}
        resource={resource}
        isDarkMode={isDarkMode}
        onClick={() => { void handleCompanionAction(kind, resource); }}
        compact={compact}
      />
    );
  };

  const resolveImageVerseText = async (resource: DailyResourceCard) => {
    const fallbackText = resource.quote ?? resource.body;
    const verseReference = resource.verseReference;

    if (!verseReference) {
      return fallbackText;
    }

    const book = books.find((currentBook) => currentBook.abrev.toUpperCase() === verseReference.bookAbrev.toUpperCase());
    if (!book) {
      return fallbackText;
    }

    try {
      const chapterData = await fetchChapter(book.names[0], verseReference.chapter, currentLanguage);
      const verse = chapterData.vers.find((currentVerse) => currentVerse.number === verseReference.verseNumber);

      return verse?.verse?.trim() || fallbackText;
    } catch (error) {
      console.error('Error resolving full verse for daily image share:', error);
      return fallbackText;
    }
  };

  const prepareImageAsset = async (resource: DailyResourceCard) => {
    const referenceLabel = resource.verseReference
      ? resource.verseReference[currentLanguage === 'en' ? 'labelEn' : 'labelEs']
      : t('app.image_of_day');
    const previewText = await resolveImageVerseText(resource);
    const asset = await createVerseImageAsset({
      imageUrl: resource.imageUrl,
      verseText: previewText,
      reference: referenceLabel,
      badge: getDailyCompanionLabel('image', t),
      appName: t('app.title'),
    });

    if (!asset) {
      return null;
    }

    setSharedImageAsset((currentAsset) => {
      revokeVerseImageAsset(currentAsset);
      return asset;
    });
    setActiveImageResourceId(resource.id);
    setSharedImageTitle(referenceLabel);
    setSharedImageText(previewText);

    return { asset, referenceLabel, previewText };
  };

  const handleImagePreview = async (resource: DailyResourceCard) => {
    if (isPreparingImageShare) {
      return;
    }

    setIsPreparingImageShare(true);
    try {
      const preparedImage = await prepareImageAsset(resource);
      if (!preparedImage) {
        return;
      }

      setImageSheetMode('preview');
      setIsImageShareSheetOpen(true);
    } finally {
      setIsPreparingImageShare(false);
    }
  };

  const handleImageShare = async (resource: DailyResourceCard) => {
    if (isPreparingImageShare) {
      return;
    }

    setIsPreparingImageShare(true);
    try {
      const preparedImage = await prepareImageAsset(resource);
      if (!preparedImage) {
        return;
      }

      if (canNativeShareVerseImage(preparedImage.asset)) {
        const shareResult = await nativeShareVerseImage(
          preparedImage.asset,
          preparedImage.referenceLabel,
        );

        if (shareResult !== 'unsupported') {
          setIsImageShareSheetOpen(false);
          return;
        }
      }

      setImageSheetMode('share');
      setIsImageShareSheetOpen(true);
    } finally {
      setIsPreparingImageShare(false);
    }
  };

  const handleNativeShareImage = async () => {
    if (!sharedImageAsset) {
      return;
    }

    if (!canNativeShareVerseImage(sharedImageAsset)) {
      setImageSheetMode('share');
      return;
    }

    const shareResult = await nativeShareVerseImage(
      sharedImageAsset,
      sharedImageTitle,
    );

    if (shareResult === 'shared') {
      setIsImageShareSheetOpen(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!sharedImageAsset) {
      return;
    }

    const result = await downloadVerseImage(sharedImageAsset);

    if (result.status === 'saved') {
      window.alert(
        currentLanguage === 'en'
          ? 'Image saved on this device.'
          : 'Imagen guardada en este dispositivo.'
      );
      return;
    }

    if (result.status === 'failed') {
      window.alert(
        currentLanguage === 'en'
          ? 'The image could not be saved on this device.'
          : 'No se pudo guardar la imagen en este dispositivo.'
      );
    }
  };

  const handleToggleActiveImageSaved = () => {
    if (!activeImageResourceId) {
      return;
    }

    setSavedDailyImageIds((currentSavedImages) => (
      currentSavedImages.includes(activeImageResourceId)
        ? currentSavedImages.filter((savedId) => savedId !== activeImageResourceId)
        : [activeImageResourceId, ...currentSavedImages]
    ));
  };

  const handleShareDailyVerse = async () => {
    const shareText = buildVerseShareText({
      reference: dailyVerse.label,
      verseText: dailyVerse.verse.verse,
      shareUrl: dailyVerseShareUrl,
    });

    await onShareContent({
      title: dailyVerse.label,
      text: shareText,
      url: dailyVerseShareUrl,
    });
  };

  const renderAppUpdateNotice = (className?: string) => {
    if (!availableAppUpdate || !onOpenAppUpdate) {
      return null;
    }

    const isEnglish = currentLanguage.startsWith('en');
    const updateBadge = isEnglish ? 'Update available' : 'Nueva versión disponible';
    const updateTitle = isEnglish
      ? `Version ${availableAppUpdate.version} is ready to install.`
      : `La versión ${availableAppUpdate.version} ya está lista para instalar.`;
    const updateBody = isEnglish
      ? `You currently have ${availableAppUpdate.currentVersion}. Open the download page to install the latest APK.`
      : `Ahora tienes la ${availableAppUpdate.currentVersion}. Abre la descarga para instalar la APK más reciente.`;
    const updateAction = isEnglish ? 'Download update' : 'Descargar actualización';
    const dismissLabel = isEnglish ? 'Dismiss update notice' : 'Ocultar aviso de actualización';

    return (
      <section className={cn('rounded-[26px] border border-[#f3c96f]/35 bg-[linear-gradient(135deg,_rgba(243,201,111,0.14),_rgba(7,21,37,0.94))] p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.22)]', className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#f5d991]">{updateBadge}</p>
            <p className="mt-2 text-sm font-semibold text-white">{updateTitle}</p>
            <p className="mt-2 text-sm leading-6 text-white/74">{updateBody}</p>
          </div>
          {onDismissAppUpdate ? (
            <button
              type="button"
              onClick={onDismissAppUpdate}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/72 transition-all hover:bg-white/10 hover:text-white"
              aria-label={dismissLabel}
              title={dismissLabel}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenAppUpdate}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f3c96f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#13233d] transition-all hover:-translate-y-0.5 hover:bg-[#ffd97c]"
          >
            {updateAction}
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  };

  return (
    <div data-home-scroll-root="true" className={cn('h-full overflow-y-auto transition-colors duration-300', pageTone)}>
      <VerseImageShareSheet
        isOpen={isImageShareSheetOpen}
        onClose={() => setIsImageShareSheetOpen(false)}
        onHome={() => {
          setIsImageShareSheetOpen(false);
          if (onGoHome) {
            onGoHome();
            return;
          }

          handleScrollToTop();
        }}
        mode={imageSheetMode}
        title={sharedImageTitle}
        text={sharedImageText}
        url={appShareUrl}
        previewUrl={sharedImageAsset?.objectUrl ?? null}
        canNativeShareImage={sharedImageAsset ? canNativeShareVerseImage(sharedImageAsset) : false}
        onNativeShareImage={() => { void handleNativeShareImage(); }}
        onDownloadImage={handleDownloadImage}
        isSaved={activeImageResourceId ? savedDailyImageIds.includes(activeImageResourceId) : false}
        onToggleSaved={handleToggleActiveImageSaved}
        headerBadge={imageSheetMode === 'preview' ? t('app.image_of_day') : t('app.share_verse_image')}
        headerTitle={imageSheetMode === 'preview' ? t('share_sheet.preview_title') : t('share_sheet.share_title')}
        headerSubtitle={imageSheetMode === 'preview' ? t('share_sheet.preview_subtitle') : t('share_sheet.share_subtitle')}
      />
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-36 pt-4 sm:px-6 lg:px-8 lg:pb-24">
        <div className="lg:hidden">
          <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/10 bg-[#030812]/96 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={onMenuClick}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
                  title={t('home.open_menu')}
                  aria-label={t('home.open_menu')}
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#1d4f96] bg-[#07152b] p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                    <BrandSeal className="h-full w-full" showWordmark={false} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-serif text-[1.45rem] font-bold leading-none text-white">{t('app.title')}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#7fb8ff]">RV1960</p>
                  </div>
                </div>
              </div>

              <AppOverflowMenu
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                fontSize={fontSize}
                setFontSize={setFontSize}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                voiceURI={voiceURI}
                setVoiceURI={setVoiceURI}
                onOpenBooks={() => onOpenBooks('all')}
                onOpenStudy={onOpenStudy}
                onOpenDailyExperience={onOpenDailyExperience}
                onOpenFavorites={onOpenFavorites}
                onOpenGame={onOpenGame}
                onShare={onShare}
              />
            </div>
          </header>

          {renderAppUpdateNotice('mb-4')}

          <section
            className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1220] p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.3)]"
            style={!isMobileViewport || isMobileDeferredContentReady ? imageItem.imageUrl ? {
              backgroundImage: `linear-gradient(180deg, rgba(3,8,18,0.2) 0%, rgba(3,8,18,0.84) 28%, rgba(3,8,18,0.96) 100%), url(${imageItem.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#cfe5ff]">{mobileCopy.versesSection}</p>
                <p className="mt-2 text-sm font-semibold text-white/90">{dailyVerse.label}</p>
              </div>
              <button
                type="button"
                onClick={() => { void handleShareDailyVerse(); }}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-black/20 text-white transition-all hover:bg-black/30"
                aria-label={t('menu.share')}
                title={t('menu.share')}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenVerse(dailyVerse.bookAbrev, dailyVerse.chapter, dailyVerse.verse.number)}
              className="mt-4 max-w-[18rem] text-left font-serif text-[1.35rem] leading-8 text-white transition-opacity hover:opacity-90"
            >
              {dailyVerse.verse.verse}
            </button>
          </section>

          <section className="mt-4 rounded-[28px] border border-white/10 bg-[#111820] p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">{mobileCopy.devotional}</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{challengeSummary.completedToday}/{challengeSummary.totalDailyTasks}</p>
              </div>
              <button
                type="button"
                onClick={onOpenDailyExperience}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d7e9ff]"
              >
                {t('menu.daily_challenges')}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {devotionalItems.map((item) => {
                const isOpen = openMobileDevotionalId === item.id;

                return (
                  <div key={item.id} className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenMobileDevotionalId((current) => current === item.id ? 'reflection' : item.id)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0f2d52] text-[#78b8ff]">
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{item.reference}</p>
                      </div>
                      <div className="flex items-center gap-2 text-white/45">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{item.detail}</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="mt-4 rounded-[20px] border border-white/8 bg-[#0c1118] p-4">
                        <p className="text-sm leading-6 text-white/78">{item.body}</p>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={item.primaryAction}
                            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white"
                          >
                            <Volume2 className="h-4 w-4" />
                            {item.primaryLabel}
                          </button>
                          {item.secondaryAction && item.secondaryLabel ? (
                            <button
                              type="button"
                              onClick={item.secondaryAction}
                              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white"
                            >
                              <BookOpen className="h-4 w-4" />
                              {item.secondaryLabel}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {visibleMobileCompanionSections.map((section) => (
            <section
              key={section.id}
              className="mt-5"
              style={{ contentVisibility: 'auto', containIntrinsicSize: '420px' }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[1.35rem] font-bold text-white">{section.title}</p>
                <ChevronRight className="h-5 w-5 text-white/70" />
              </div>
              <HorizontalDragRail className="mt-3 flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x" ariaLabel={section.title}>
                {section.items.map((resource) => renderCompanionCard(section.kind, section.label, resource, true))}
              </HorizontalDragRail>
            </section>
          ))}

          {!isMobileDeferredContentReady && companionSections.length > visibleMobileCompanionSections.length ? (
            <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-5 text-white/68" style={{ contentVisibility: 'auto', containIntrinsicSize: '120px' }}>
              <p className="text-sm font-semibold">{currentLanguage === 'en' ? 'Loading more sections...' : 'Cargando más secciones...'}</p>
            </section>
          ) : null}
        </div>

        <div className="hidden lg:flex lg:flex-col">
        <header className={cn('sticky top-0 z-20 mb-6 rounded-[28px] border px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-5', headerTone)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onMenuClick}
                className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border transition-all', headerButtonTone)}
                title={t('home.open_menu')}
                aria-label={t('home.open_menu')}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-[#244b7d]/45 bg-[#061223]/78 p-1.5 shadow-[0_14px_36px_rgba(2,9,22,0.24)] sm:h-16 sm:w-16 sm:rounded-[22px]">
                  <BrandSeal className="h-full w-full" />
                </div>

                <div className="min-w-0">
                  <h1 className={cn('truncate font-serif text-[1.35rem] font-bold sm:text-2xl', headerTitleTone)}>{t('app.title')}</h1>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap sm:gap-2">
              <button
                type="button"
                onClick={() => onOpenBooks('all')}
                className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border transition-all sm:h-11 sm:w-11', headerButtonTone)}
                title={t('menu.books')}
                aria-label={t('menu.books')}
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={cn('hidden h-10 w-10 items-center justify-center rounded-2xl border transition-all sm:flex sm:h-11 sm:w-11', headerButtonTone)}
                title={isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
                aria-label={isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onShare}
                className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border transition-all sm:h-11 sm:w-11', headerButtonTone)}
                title={t('menu.share')}
                aria-label={t('menu.share')}
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenFavorites}
                className={cn('hidden h-10 w-10 items-center justify-center rounded-2xl border transition-all lg:flex lg:h-11 lg:w-11', headerButtonTone)}
                title={t('menu.favorites')}
                aria-label={t('menu.favorites')}
              >
                <Heart className="h-4 w-4" />
              </button>
              <AppOverflowMenu
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                fontSize={fontSize}
                setFontSize={setFontSize}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                voiceURI={voiceURI}
                setVoiceURI={setVoiceURI}
                onOpenBooks={() => onOpenBooks('all')}
                onOpenStudy={onOpenStudy}
                onOpenDailyExperience={onOpenDailyExperience}
                onOpenFavorites={onOpenFavorites}
                onOpenGame={onOpenGame}
                onShare={onShare}
                buttonClassName="sm:h-11 sm:w-11"
              />
            </div>
          </div>
        </header>

        {renderAppUpdateNotice('mb-6')}

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative order-3 mt-6 overflow-hidden rounded-[32px] border border-[#244b7d]/85 bg-[radial-gradient(circle_at_top_left,_rgba(91,182,255,0.28),_transparent_32%),linear-gradient(135deg,_#10264d_0%,_#061123_58%,_#0a1c37_100%)] px-5 py-5 shadow-[0_18px_60px_rgba(3,11,25,0.34)] sm:px-6 sm:py-6"
        >
          <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#67b9ff]/18 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-[#f3c76b]/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#95c9ff]">{t('home.hero_badge')}</p>
              <h2 className="mt-2 max-w-2xl font-serif text-[2rem] font-bold leading-[1.08] text-white sm:text-[2.35rem] xl:text-[2.7rem]">
                {t('home.hero_title')}
              </h2>
              <p className="mt-3 max-w-xl font-sans text-[13px] leading-6 text-[#d2e5ff] sm:text-sm sm:leading-7">
                {t('home.hero_description')}
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-[31rem]">
                <QuickActionCard
                  icon={<BookOpen className="h-5 w-5" />}
                  label={t('home.continue_reading')}
                  detail={resumeLabel}
                  tone="gold"
                  onClick={selectedBook ? onContinueReading : () => onOpenBooks('all')}
                />
                <QuickActionCard
                  icon={<LibraryBig className="h-5 w-5" />}
                  label={t('menu.books')}
                  detail={t('home.open_books_detail')}
                  tone="blue"
                  onClick={() => onOpenBooks('all')}
                />
                <QuickActionCard
                  icon={<Gamepad2 className="h-5 w-5" />}
                  label={t('menu.game')}
                  detail={t('home.game_detail')}
                  tone="violet"
                  onClick={onOpenGame}
                />
                <QuickActionCard
                  icon={<Sparkles className="h-5 w-5" />}
                  label={t('menu.study')}
                  detail={t('home.study_detail')}
                  tone="sky"
                  onClick={onOpenStudy}
                />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="order-1 mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className={cn('rounded-[32px] border p-5 sm:p-6', desktopSectionTone)}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.32em]', desktopSectionBadgeTone)}>{t('app.verse_for_day')}</p>
                <h3 className={cn('mt-2 font-serif text-3xl font-bold', desktopSectionTitleTone)}>{dailyVerse.label}</h3>
              </div>
              <button
                type="button"
                onClick={onOpenDailyExperience}
                className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] transition-all', desktopChipTone, isDarkMode ? 'hover:border-[#7dc3ff] hover:bg-[#16335f]' : 'hover:border-[#7dc3ff] hover:bg-[#eaf4ff]')}
              >
                <SunMoon className="h-4 w-4" />
                {t('menu.daily_challenges')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenVerse(dailyVerse.bookAbrev, dailyVerse.chapter, dailyVerse.verse.number)}
              className={cn('mt-5 text-left font-serif text-[22px] leading-9 transition-opacity hover:opacity-90', desktopSectionTitleTone)}
            >
              “{dailyVerse.verse.verse}”
            </button>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenDailyExperience}
                className={cn('rounded-full border px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] transition-all', desktopChipTone, isDarkMode ? 'hover:border-[#7dc3ff]/50 hover:bg-[#10284f]' : 'hover:border-[#7dc3ff]/50 hover:bg-[#eaf4ff]')}
              >
                {t('app.challenge_daily_action')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 xl:grid-cols-3">
            <StatCard icon={<Flame className="h-5 w-5" />} label={t('app.challenge_streak')} shortLabel={currentLanguage === 'en' ? 'Streak' : 'Racha'} value={String(challengeSummary.streak)} accent="orange" isDarkMode={isDarkMode} />
            <StatCard icon={<Star className="h-5 w-5" />} label={t('app.challenge_rewards')} shortLabel={currentLanguage === 'en' ? 'Points' : 'Puntos'} value={String(challengeSummary.totalRewardPoints)} accent="gold" isDarkMode={isDarkMode} />
            <StatCard icon={<BookHeart className="h-5 w-5" />} label={t('menu.favorites')} shortLabel={currentLanguage === 'en' ? 'Saved' : 'Guardados'} value={String(bookmarksCount)} accent="blue" isDarkMode={isDarkMode} />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="order-2 mt-6 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]"
        >
          <div className={cn('relative overflow-hidden rounded-[32px] border p-5 sm:p-6', isDarkMode ? 'border-[#244b7d] bg-[radial-gradient(circle_at_top_left,_rgba(91,182,255,0.28),_transparent_34%),linear-gradient(140deg,_#12305f_0%,_#0a1d39_52%,_#102b53_100%)] shadow-[0_18px_60px_rgba(0,0,0,0.22)]' : 'border-[#d5e4f3] bg-[radial-gradient(circle_at_top_left,_rgba(91,182,255,0.16),_transparent_32%),linear-gradient(145deg,_#ffffff_0%,_#eef6ff_56%,_#f7fbff_100%)] shadow-[0_18px_50px_rgba(36,74,116,0.12)]')}>
            <div className="absolute -right-16 top-0 h-44 w-44 rounded-full bg-[#67b9ff]/18 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[#f3c76b]/10 blur-3xl" />
            <div className="relative">
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.32em]', desktopSectionBadgeTone)}>{t('app.daily_companion')}</p>
              <h3 className={cn('mt-2 font-serif text-[2rem] font-bold leading-tight sm:text-3xl', desktopSectionTitleTone)}>{t('app.daily_companion_title')}</h3>
              <p className={cn('mt-3 max-w-2xl font-sans text-sm leading-6 sm:leading-7', desktopSectionBodyTone)}>{t('app.daily_companion_body')}</p>

              <div className="mt-6 space-y-5">
                {companionSections.map((section) => (
                  <section key={section.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={cn('font-serif text-[1.2rem] font-bold', desktopSectionTitleTone)}>{section.title}</p>
                        <p className={cn('mt-1 font-sans text-[11px] uppercase tracking-[0.18em]', desktopSectionBadgeTone)}>
                          {currentLanguage === 'en' ? 'Slide left or right' : 'Desliza a izquierda o derecha'}
                        </p>
                      </div>
                      <ChevronRight className={cn('h-5 w-5', desktopSectionBadgeTone)} />
                    </div>

                    <HorizontalDragRail className="-mx-1 mt-3 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar snap-x" ariaLabel={section.title}>
                      {section.items.map((resource) => renderCompanionCard(section.kind, section.label, resource, true))}
                    </HorizontalDragRail>
                  </section>
                ))}
              </div>
            </div>
          </div>

          <div className={cn('rounded-[32px] border p-5 sm:p-6', desktopSectionTone)}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.32em]', desktopSectionBadgeTone)}>{t('app.weekly_goals')}</p>
                <h3 className={cn('mt-2 font-serif text-3xl font-bold', desktopSectionTitleTone)}>{t('app.challenge_focus_week')}</h3>
              </div>
              <span className={cn('rounded-full border px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em]', isDarkMode ? 'border-[#f6c969]/20 bg-[#f6c969]/10 text-[#ffe39a]' : 'border-[#f6c969]/30 bg-[#fff7df] text-[#946a14]')}>
                {challengeSummary.totalRewardPoints} pts
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                t('app.weekly_goal_daily'),
                t('app.weekly_goal_chapters'),
                t('app.weekly_goal_searches'),
                t('app.weekly_goal_bookmarks'),
                t('app.reading_goal_chapters'),
                t('app.reading_goal_verses'),
              ].map((goal, index) => (
                <div key={goal} className={cn('flex items-center justify-between rounded-[22px] border px-4 py-3.5', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-[#dbe8f5] bg-[#f7fbff]')}>
                  <div>
                    <p className={cn('font-sans text-[13px] font-semibold leading-5 sm:text-sm', desktopSectionTitleTone)}>{goal}</p>
                    <p className={cn('mt-1 font-sans text-[11px] sm:text-xs', desktopSectionBodyTone)}>{index < 4 ? t('app.weekly_goals') : t('app.reading_goals')}</p>
                  </div>
                  <span className={cn('rounded-full border px-2.5 py-1.5 font-sans text-[9px] font-bold uppercase tracking-[0.18em] sm:px-3 sm:text-[10px]', isDarkMode ? 'border-[#4b9eff]/25 bg-[#4b9eff]/10 text-[#d8ecff]' : 'border-[#4b9eff]/25 bg-[#edf5ff] text-[#2f64a1]')}>
                    {t('app.challenge_done')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="order-4 mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="rounded-[32px] border border-white/10 bg-[#07162b] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7fb8ff]">{t('home.section_explore')}</p>
                <h3 className="mt-2 font-serif text-3xl font-bold text-white">{t('home.explore_title')}</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d6e9ff]">
                {books.length} {t('menu.books').toLowerCase()}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <FeatureCard
                icon={<LibraryBig className="h-5 w-5" />}
                title={t('testaments.old')}
                detail={`${oldTestamentCount} ${t('menu.books').toLowerCase()}`}
                onClick={() => onOpenBooks('old')}
              />
              <FeatureCard
                icon={<LibraryBig className="h-5 w-5" />}
                title={t('testaments.new')}
                detail={`${newTestamentCount} ${t('menu.books').toLowerCase()}`}
                onClick={() => onOpenBooks('new')}
              />
              <FeatureCard
                icon={<Heart className="h-5 w-5" />}
                title={t('menu.favorites')}
                detail={t('home.saved_detail')}
                onClick={onOpenFavorites}
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title={t('menu.study')}
                detail={t('home.guided_detail')}
                onClick={onOpenStudy}
              />
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(155deg,_rgba(15,43,84,0.98)_0%,_rgba(8,19,37,0.95)_50%,_rgba(9,26,56,0.98)_100%)] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7fb8ff]">{t('home.section_game')}</p>
            <h3 className="mt-2 font-serif text-3xl font-bold text-white">{t('home.game_title')}</h3>
            <p className="mt-3 font-sans text-sm leading-7 text-[#cfe2ff]">
              {t('home.game_body')}
            </p>

            <div className="mt-5 grid grid-cols-5 gap-2 rounded-[24px] border border-white/8 bg-[#061223]/70 p-4">
              {['F', 'E', 'P', 'A', 'Z', 'J', 'E', 'S', 'U', 'S', 'G', 'R', 'A', 'C', 'I', 'A', 'O', 'R', 'A', 'R', 'L', 'U', 'Z', 'F', 'E'].map((letter, index) => (
                <div
                  key={`${letter}-${index}`}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-2xl border text-sm font-bold shadow-inner',
                    index === 0 || index === 1 || index === 22 || index === 23 || index === 24
                      ? 'border-[#f6c969]/40 bg-[#f6c969]/15 text-[#ffe6a3]'
                      : 'border-white/8 bg-white/5 text-[#e3f0ff]'
                  )}
                >
                  {letter}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenGame}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#4b9eff] px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(75,158,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#63adff]"
            >
              <Gamepad2 className="h-4 w-4" />
              {t('home.open_game_now')}
            </button>
          </div>
        </motion.section>

        <MobilePageFooter className="mt-8" />
        </div>
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}

function getDailyCompanionLabel(kind: DailyCompanionKind, t: (key: string) => string) {
  switch (kind) {
    case 'video':
      return t('app.video_of_day');
    case 'sermon':
      return t('app.sermon_of_day');
    case 'reflection':
      return t('app.reflection_of_day');
    case 'testimony':
      return t('app.testimony_of_day');
    case 'news':
      return t('app.news_of_day');
    case 'image':
    default:
      return t('app.image_of_day');
  }
}

function getDailyCompanionSectionTitle(kind: DailyCompanionKind, mobileCopy: {
  images: string;
  sermons: string;
  news: string;
  videos: string;
  reflections: string;
  testimonies: string;
}) {
  switch (kind) {
    case 'image':
      return mobileCopy.images;
    case 'sermon':
      return mobileCopy.sermons;
    case 'video':
      return mobileCopy.videos;
    case 'reflection':
      return mobileCopy.reflections;
    case 'testimony':
      return mobileCopy.testimonies;
    case 'news':
    default:
      return mobileCopy.news;
  }
}

function getDailyCompanionIcon(kind: DailyCompanionKind) {
  switch (kind) {
    case 'video':
      return <PlayCircle className="h-5 w-5" />;
    case 'sermon':
      return <Volume2 className="h-5 w-5" />;
    case 'reflection':
      return <Quote className="h-5 w-5" />;
    case 'testimony':
      return <Heart className="h-5 w-5" />;
    case 'news':
      return <Newspaper className="h-5 w-5" />;
    case 'image':
    default:
      return <Image className="h-5 w-5" />;
  }
}

function getDailyCompanionTone(kind: DailyCompanionKind, isDarkMode: boolean) {
  if (!isDarkMode) {
    switch (kind) {
      case 'video':
        return 'border-[#bfe7ff] bg-[linear-gradient(145deg,_#ffffff_0%,_#edf8ff_100%)] text-[#1d5b7f]';
      case 'sermon':
        return 'border-[#cfe6be] bg-[linear-gradient(145deg,_#ffffff_0%,_#f4faee_100%)] text-[#4b6f2d]';
      case 'reflection':
        return 'border-[#d7d0ff] bg-[linear-gradient(145deg,_#ffffff_0%,_#f3f0ff_100%)] text-[#4d4a94]';
      case 'testimony':
        return 'border-[#ffd0ae] bg-[linear-gradient(145deg,_#ffffff_0%,_#fff4ea_100%)] text-[#93572a]';
      case 'news':
        return 'border-[#c8ddff] bg-[linear-gradient(145deg,_#ffffff_0%,_#edf4ff_100%)] text-[#365f96]';
      case 'image':
      default:
        return 'border-[#f9dc9e] bg-[linear-gradient(145deg,_#ffffff_0%,_#fff8e8_100%)] text-[#8c6c1b]';
    }
  }

  switch (kind) {
    case 'video':
      return 'border-[#62d4ff]/24 bg-[#62d4ff]/10 text-[#ddf8ff]';
    case 'sermon':
      return 'border-[#9bd18f]/24 bg-[#9bd18f]/10 text-[#ecffd9]';
    case 'reflection':
      return 'border-[#8f7dff]/24 bg-[#8f7dff]/10 text-[#ecebff]';
    case 'testimony':
      return 'border-[#ff9b54]/24 bg-[#ff9b54]/10 text-[#ffd6b6]';
    case 'news':
      return 'border-[#5eb8ff]/24 bg-[#5eb8ff]/10 text-[#dff1ff]';
    case 'image':
    default:
      return 'border-[#f6c969]/24 bg-[#f6c969]/10 text-[#ffe7a8]';
  }
}

function getDailyCompanionFallbackGradient(kind: DailyCompanionKind, isDarkMode: boolean) {
  if (!isDarkMode) {
    switch (kind) {
      case 'video':
        return 'linear-gradient(135deg, rgba(78,188,255,0.88), rgba(27,108,185,0.94))';
      case 'sermon':
        return 'linear-gradient(135deg, rgba(114,197,151,0.9), rgba(26,100,111,0.94))';
      case 'reflection':
        return 'linear-gradient(135deg, rgba(111,143,255,0.84), rgba(138,102,216,0.9))';
      case 'testimony':
        return 'linear-gradient(135deg, rgba(255,184,127,0.88), rgba(189,103,84,0.92))';
      case 'news':
        return 'linear-gradient(135deg, rgba(102,163,255,0.84), rgba(66,103,170,0.94))';
      case 'image':
      default:
        return 'linear-gradient(135deg, rgba(91,182,255,0.86), rgba(246,201,105,0.88))';
    }
  }

  switch (kind) {
    case 'video':
      return 'linear-gradient(135deg, rgba(32,130,188,0.96), rgba(8,20,45,0.98))';
    case 'sermon':
      return 'linear-gradient(135deg, rgba(26,111,103,0.96), rgba(7,26,35,0.98))';
    case 'reflection':
      return 'linear-gradient(135deg, rgba(73,98,204,0.96), rgba(23,18,53,0.98))';
    case 'testimony':
      return 'linear-gradient(135deg, rgba(168,96,56,0.96), rgba(44,17,25,0.98))';
    case 'news':
      return 'linear-gradient(135deg, rgba(39,92,168,0.96), rgba(8,20,45,0.98))';
    case 'image':
    default:
      return 'linear-gradient(135deg, rgba(43,122,194,0.96), rgba(116,87,24,0.98))';
  }
}

type DailyCompanionKind = DailyContentKind;

interface DailyCompanionCardProps {
  kind: DailyCompanionKind;
  label: string;
  resource: DailyResourceCard;
  isDarkMode: boolean;
  onClick: () => void;
  compact?: boolean;
}

function DailyCompanionCard({ kind, label, resource, isDarkMode, onClick, compact = false }: DailyCompanionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group overflow-hidden rounded-[26px] border text-left transition-all hover:-translate-y-1',
        getDailyCompanionTone(kind, isDarkMode),
        compact ? 'w-[21.75rem] flex-shrink-0 snap-start p-3.5' : 'w-full p-4 sm:p-5'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[22px] border',
          isDarkMode ? 'border-white/10 bg-black/15' : 'border-white/70 bg-white/90 shadow-[0_14px_30px_rgba(36,74,116,0.12)]',
          compact ? 'aspect-[16/11]' : 'aspect-[16/10]'
        )}
        style={resource.imageUrl ? undefined : { backgroundImage: resource.gradient ?? getDailyCompanionFallbackGradient(kind, isDarkMode) }}
      >
        {resource.imageUrl ? (
          <img
            src={resource.imageUrl}
            alt={resource.imageAlt ?? resource.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/95">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/18 bg-black/15 backdrop-blur-sm">
              {getDailyCompanionIcon(kind)}
            </div>
          </div>
        )}

        <div className={cn('absolute inset-0', resource.imageUrl ? 'bg-[linear-gradient(180deg,rgba(4,11,20,0.14)_0%,rgba(4,11,20,0.24)_26%,rgba(4,11,20,0.9)_100%)]' : 'bg-[linear-gradient(180deg,rgba(4,11,20,0.06)_0%,rgba(4,11,20,0.22)_42%,rgba(4,11,20,0.78)_100%)]')} />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <span className="rounded-full border border-white/18 bg-black/25 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-white/92 backdrop-blur-sm">
            {label}
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/18 bg-black/20 text-white/92 backdrop-blur-sm">
            {getDailyCompanionIcon(kind)}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          {resource.sourceName ? (
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/78">
              {resource.sourceName}
            </p>
          ) : null}
          <h4 className={cn('mt-2 font-serif font-bold leading-tight text-pretty text-white', compact ? 'text-[1.2rem]' : 'text-[1.45rem]')}>
            {resource.title}
          </h4>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <p className={cn('font-sans text-pretty', isDarkMode ? 'text-current/85' : 'text-[#4e6786]', compact ? 'text-[13px] leading-5' : 'text-sm leading-6')}>
          {resource.body}
        </p>

        <div className="mt-4 flex items-center gap-2 text-current">
          <span className={cn('inline-flex rounded-full border font-sans font-bold uppercase tracking-[0.18em]', isDarkMode ? 'border-current/15 bg-black/10' : 'border-current/10 bg-white/75', compact ? 'px-3 py-1.5 text-[9px]' : 'px-3 py-2 text-[10px]')}>
            {resource.sourceLabel ?? 'Abrir'}
          </span>
          <ExternalLink className="h-4 w-4 opacity-75" />
        </div>
      </div>
    </button>
  );
}

interface DailyImageCardProps {
  label: string;
  resource: DailyResourceCard;
  currentLanguage: 'es' | 'en';
  isDarkMode: boolean;
  isSaved: boolean;
  onToggleSaved: () => void;
  onOpenImage: () => void;
  onOpenVerse: () => void;
  onShare: () => void;
  compact?: boolean;
}

function DailyImageCard({ label, resource, currentLanguage, isDarkMode, isSaved, onToggleSaved, onOpenImage, onOpenVerse, onShare, compact = false }: DailyImageCardProps) {
  const verseLabel = resource.verseReference
    ? resource.verseReference[currentLanguage === 'en' ? 'labelEn' : 'labelEs']
    : null;
  const quoteText = resource.quote ?? resource.body;
  const overlayQuote = quoteText.startsWith('“') ? quoteText : `“${quoteText.replace(/["“”]/g, '').trim()}”`;

  if (compact) {
    return (
      <article
        className={cn(
          'w-[11.25rem] flex-shrink-0 snap-start overflow-hidden rounded-[26px]',
          isDarkMode ? 'text-white' : 'text-[#102542]'
        )}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onOpenImage}
            className={cn(
              'group block w-full overflow-hidden rounded-[26px] border p-[0.22rem] shadow-[0_18px_42px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-0.5',
              isDarkMode ? 'border-[#274b7a] bg-[#143766]' : 'border-[#d9e7f5] bg-[#173763]'
            )}
            aria-label={resource.title}
            title={resource.title}
          >
            <div className="relative h-[13rem] w-full overflow-hidden rounded-[22px]">
              {resource.imageUrl ? (
                <img src={resource.imageUrl} alt={resource.imageAlt ?? resource.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className={cn('flex h-full w-full items-center justify-center', isDarkMode ? 'bg-white/5 text-[#ffe7a8]' : 'bg-[#edf5ff] text-[#3e79ac]')}>
                  <Image className="h-8 w-8" />
                </div>
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,11,20,0.12)_0%,rgba(4,11,20,0.14)_30%,rgba(4,11,20,0.76)_100%)]" />

              <div className="absolute left-3 top-3 rounded-full border border-white/16 bg-black/24 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/92 backdrop-blur-sm">
                {label}
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3.5 text-left text-white">
                <p className="line-clamp-4 font-sans text-[0.86rem] font-medium leading-6 text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                  {overlayQuote}
                </p>
                {verseLabel ? (
                  <p className="mt-2 font-sans text-[0.72rem] font-bold text-white/94 drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                    {verseLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onToggleSaved}
            className={cn(
              'absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-all',
              isSaved
                ? 'border-[#f6c969]/55 bg-[#f6c969]/22 text-[#ffe7a8]'
                : 'border-white/18 bg-black/28 text-white/88 hover:border-white/32 hover:bg-black/36'
            )}
            aria-label={currentLanguage === 'en' ? 'Save image' : 'Guardar imagen'}
            title={currentLanguage === 'en' ? 'Save image' : 'Guardar imagen'}
          >
            <Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group overflow-hidden',
        isDarkMode
          ? 'rounded-[24px] border border-[#f6c969]/24 bg-[linear-gradient(145deg,_rgba(32,73,128,0.96)_0%,_rgba(10,23,45,0.98)_60%,_rgba(13,35,66,0.98)_100%)] text-white shadow-[0_18px_50px_rgba(0,0,0,0.24)]'
          : 'rounded-[24px] border border-[#d5e4f3] bg-[linear-gradient(145deg,_#ffffff_0%,_#eef6ff_55%,_#f9fbff_100%)] text-[#102542] shadow-[0_18px_46px_rgba(36,74,116,0.12)]',
        compact ? 'w-[20.75rem] flex-shrink-0 snap-start p-3.5' : 'w-full p-4 sm:p-5'
      )}
    >
      <div className={cn('relative overflow-hidden rounded-[22px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]', isDarkMode ? 'border-white/10 bg-white/5' : 'border-[#d9e7f5] bg-white', compact ? 'h-[16.5rem]' : 'h-[24rem]')}>
        {resource.imageUrl ? (
          <img src={resource.imageUrl} alt={resource.imageAlt ?? resource.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center', isDarkMode ? 'text-[#ffe7a8]' : 'text-[#3e79ac]')}>
            <Image className="h-8 w-8" />
          </div>
        )}

        <div className={cn('absolute inset-0', resource.imageUrl ? 'bg-[linear-gradient(180deg,rgba(4,11,20,0.08)_0%,rgba(4,11,20,0.24)_28%,rgba(4,11,20,0.88)_100%)]' : 'bg-[linear-gradient(180deg,rgba(16,37,66,0.22)_0%,rgba(16,37,66,0.92)_100%)]')} />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <span className="rounded-full border border-white/18 bg-black/25 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-white/92 backdrop-blur-sm">
            {label}
          </span>
          {resource.sourceName ? (
            <span className="rounded-full border border-white/18 bg-black/25 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/88 backdrop-blur-sm">
              {resource.sourceName}
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          {resource.quote ? (
            <p className={cn('max-w-xl font-serif italic text-white text-pretty drop-shadow-[0_10px_26px_rgba(0,0,0,0.34)]', compact ? 'text-[0.96rem] leading-6' : 'text-[1.42rem] leading-8')}>
              {resource.quote}
            </p>
          ) : null}
          {verseLabel ? (
            <p className="mt-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
              {verseLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <h4 className={cn('font-serif font-bold leading-tight text-pretty', isDarkMode ? 'text-white' : 'text-[#102542]', compact ? 'text-[1.2rem]' : 'text-[1.4rem]')}>
          {resource.title}
        </h4>
        <p className={cn('mt-2 font-sans text-pretty', isDarkMode ? 'text-white/78' : 'text-[#4e6786]', compact ? 'text-[13px] leading-5' : 'text-sm leading-6')}>
          {resource.body}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onOpenImage}
          className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5', isDarkMode ? 'bg-[#4b9eff] text-white shadow-[0_12px_26px_rgba(75,158,255,0.35)] hover:bg-[#63adff]' : 'border border-[#6eaef3] bg-[#4b9eff] text-white shadow-[0_12px_24px_rgba(75,158,255,0.22)] hover:bg-[#3d93ff]')}
        >
          <ExternalLink className="h-4 w-4" />
          {resource.sourceLabel ?? (currentLanguage === 'en' ? 'View image' : 'Ver imagen')}
        </button>
        <button
          type="button"
          onClick={onOpenVerse}
          className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] transition-all', isDarkMode ? 'border-white/12 bg-white/5 text-[#dbeeff] hover:border-[#7dc3ff]/50 hover:bg-[#10284f]' : 'border-[#cfe0f2] bg-white text-[#2f64a1] hover:border-[#7dc3ff]/50 hover:bg-[#edf5ff]')}
        >
          <BookOpen className="h-4 w-4" />
          {currentLanguage === 'en' ? 'Open passage' : 'Abrir pasaje'}
        </button>
        <button
          type="button"
          onClick={onShare}
          className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] transition-all', isDarkMode ? 'border-[#f6c969]/25 bg-[#f6c969]/10 text-[#ffe7a8] hover:border-[#f6c969]/45 hover:bg-[#f6c969]/16' : 'border-[#f4d893] bg-[#fff7df] text-[#a87711] hover:border-[#efc863]/55 hover:bg-[#fff0c5]')}
        >
          <Share2 className="h-4 w-4" />
          {currentLanguage === 'en' ? 'Share image' : 'Compartir imagen'}
        </button>
      </div>
    </article>
  );
}

interface HorizontalDragRailProps {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}

function HorizontalDragRail({ className, children, ariaLabel }: HorizontalDragRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const updateScrollControls = () => {
      setCanScrollBack(rail.scrollLeft > 8);
      setCanScrollForward(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8);
    };

    updateScrollControls();
    rail.addEventListener('scroll', updateScrollControls, { passive: true });
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollControls) : null;
    resizeObserver?.observe(rail);

    return () => {
      rail.removeEventListener('scroll', updateScrollControls);
      resizeObserver?.disconnect();
    };
  }, []);

  const scrollRailBy = (direction: 'back' | 'forward') => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    rail.scrollBy({
      left: (direction === 'forward' ? 1 : -1) * Math.max(rail.clientWidth * 0.78, 320),
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scrollRailBy('back')}
        disabled={!canScrollBack}
        aria-label={ariaLabel ? `Desplazar ${ariaLabel} hacia la izquierda` : 'Desplazar hacia la izquierda'}
        className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#07162b]/88 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all hover:bg-[#10284f] disabled:pointer-events-none disabled:opacity-0 lg:flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={railRef}
        aria-label={ariaLabel}
        className={cn('touch-auto', className)}
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scrollRailBy('forward')}
        disabled={!canScrollForward}
        aria-label={ariaLabel ? `Desplazar ${ariaLabel} hacia la derecha` : 'Desplazar hacia la derecha'}
        className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#07162b]/88 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all hover:bg-[#10284f] disabled:pointer-events-none disabled:opacity-0 lg:flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

interface QuickActionCardProps {
  icon: ReactNode;
  label: string;
  detail: string;
  tone: 'gold' | 'blue' | 'violet' | 'sky';
  onClick: () => void;
}

function QuickActionCard({ icon, label, detail, tone, onClick }: QuickActionCardProps) {
  const tones: Record<QuickActionCardProps['tone'], string> = {
    gold: 'border-[#f6c969]/30 bg-[#f6c969]/12 text-[#ffe7a8] hover:bg-[#f6c969]/18',
    blue: 'border-[#5eb8ff]/30 bg-[#5eb8ff]/12 text-[#dff1ff] hover:bg-[#5eb8ff]/18',
    violet: 'border-[#7e7bff]/28 bg-[#7e7bff]/12 text-[#ecebff] hover:bg-[#7e7bff]/18',
    sky: 'border-[#62d4ff]/28 bg-[#62d4ff]/12 text-[#ddf8ff] hover:bg-[#62d4ff]/18',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-[24px] border p-3.5 text-left transition-all hover:-translate-y-0.5 sm:rounded-[26px] sm:p-4', tones[tone])}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/15 sm:h-11 sm:w-11">{icon}</div>
      </div>
      <p className="mt-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] sm:mt-4 sm:text-[11px] sm:tracking-[0.22em]">{label}</p>
      <p className="mt-2 font-sans text-[13px] leading-5 text-white/78 sm:text-sm sm:leading-6">{detail}</p>
    </button>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}

function FeatureCard({ icon, title, detail, onClick }: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#63b3ff]/35 hover:bg-[#0f2446] sm:rounded-[26px] sm:p-4"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#0d213f] text-[#b9dcff] sm:h-12 sm:w-12">
        {icon}
      </div>
      <h4 className="mt-3 font-serif text-lg font-bold leading-tight text-white sm:mt-4 sm:text-xl">{title}</h4>
      <p className="mt-2 font-sans text-[13px] leading-5 text-[#cfe2ff] sm:text-sm sm:leading-6">{detail}</p>
    </button>
  );
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  shortLabel: string;
  value: string;
  accent: 'orange' | 'gold' | 'blue';
  isDarkMode: boolean;
}

function StatCard({ icon, label, shortLabel, value, accent, isDarkMode }: StatCardProps) {
  const accents: Record<StatCardProps['accent'], { card: string; icon: string; label: string; value: string }> = isDarkMode
    ? {
        orange: {
          card: 'border-[#ff8d48]/25 bg-[linear-gradient(180deg,_rgba(255,141,72,0.16),_rgba(255,141,72,0.05))]',
          icon: 'bg-black/15 text-[#ffd4bd]',
          label: 'text-white/72',
          value: 'text-white',
        },
        gold: {
          card: 'border-[#f6c969]/25 bg-[linear-gradient(180deg,_rgba(246,201,105,0.18),_rgba(246,201,105,0.05))]',
          icon: 'bg-black/15 text-[#ffe8ac]',
          label: 'text-white/72',
          value: 'text-white',
        },
        blue: {
          card: 'border-[#66b8ff]/25 bg-[linear-gradient(180deg,_rgba(102,184,255,0.18),_rgba(102,184,255,0.05))]',
          icon: 'bg-black/15 text-[#d7edff]',
          label: 'text-white/72',
          value: 'text-white',
        },
      }
    : {
        orange: {
          card: 'border-[#ffd4bd] bg-[linear-gradient(180deg,_rgba(255,141,72,0.18),_rgba(255,255,255,0.98))]',
          icon: 'bg-white/80 text-[#c66d33] shadow-[0_10px_22px_rgba(198,109,51,0.12)]',
          label: 'text-[#b3866e]',
          value: 'text-[#925028]',
        },
        gold: {
          card: 'border-[#f7e3af] bg-[linear-gradient(180deg,_rgba(246,201,105,0.22),_rgba(255,255,255,0.98))]',
          icon: 'bg-white/80 text-[#b88a1d] shadow-[0_10px_22px_rgba(184,138,29,0.10)]',
          label: 'text-[#a78c55]',
          value: 'text-[#946f10]',
        },
        blue: {
          card: 'border-[#cde6fb] bg-[linear-gradient(180deg,_rgba(102,184,255,0.20),_rgba(255,255,255,0.98))]',
          icon: 'bg-white/80 text-[#3d7db3] shadow-[0_10px_22px_rgba(61,125,179,0.10)]',
          label: 'text-[#7a95b2]',
          value: 'text-[#2b5f90]',
        },
      };

  const tone = accents[accent];

  return (
    <div className={cn('rounded-[22px] border p-3 shadow-[0_14px_40px_rgba(0,0,0,0.18)] sm:rounded-[30px] sm:p-5', tone.card)}>
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-2xl sm:h-11 sm:w-11', tone.icon)}>{icon}</div>
      <p className={cn('mt-3 font-sans text-[8px] font-semibold uppercase tracking-[0.16em] sm:mt-4 sm:text-[11px] sm:tracking-[0.24em]', tone.label)}>
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </p>
      <p className={cn('mt-1.5 font-serif text-[2rem] font-bold leading-none sm:mt-2 sm:text-4xl', tone.value)}>{value}</p>
    </div>
  );
}
