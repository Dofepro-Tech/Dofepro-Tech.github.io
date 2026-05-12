import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Book, SidebarBookFilter } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { Home, BookOpen, Flame, Gamepad2, Heart, Moon, Share2, Sparkles, Sun, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  books: Book[];
  selectedBook: Book | null;
  selectedChapter: number;
  onSelectBook: (book: Book) => void;
  onSelectChapter: (chapter: number) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  filter: SidebarBookFilter;
  onFilterChange: (filter: SidebarBookFilter) => void;
  onOpenStudy: () => void;
  onOpenDailyExperience?: () => void;
  onOpenFavorites?: () => void;
  onOpenGame?: () => void;
  onShare?: () => void;
  onGoHome?: () => void;
  onOpenReader?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function Sidebar({
  books,
  selectedBook,
  selectedChapter,
  onSelectBook,
  onSelectChapter,
  isOpen,
  setIsOpen,
  filter,
  onFilterChange,
  onOpenStudy,
  onOpenDailyExperience,
  onOpenFavorites,
  onOpenGame,
  onShare,
  onGoHome,
  onOpenReader,
  isDarkMode = true,
  onToggleDarkMode,
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const sidebarRef = useRef<HTMLElement>(null);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const menuCopy = currentLanguage.startsWith('en')
    ? {
        configuration: 'Configuration',
        navigation: 'Navigation',
        daily: 'Daily content',
        openReader: 'Bible',
        continueReading: 'Continue reading',
        continueDetail: selectedBook ? `${selectedBook.names[0]} ${selectedChapter}` : 'Open the reader',
      }
    : {
        configuration: 'Configuración',
        navigation: 'Navegación',
        daily: 'Contenido diario',
        openReader: 'Biblia',
        continueReading: 'Continuar lectura',
        continueDetail: selectedBook ? `${selectedBook.names[0]} ${selectedChapter}` : 'Abrir el lector',
      };

  const sidebarSurface = isDarkMode
    ? 'border-white/10 bg-[#111820] text-white shadow-[0_28px_70px_rgba(0,0,0,0.38)]'
    : 'border-[#d8e4f2] bg-[#f7fbff] text-[#102542] shadow-[0_28px_70px_rgba(21,53,91,0.18)]';
  const headerSurface = isDarkMode
    ? 'border-white/10 bg-[linear-gradient(180deg,rgba(3,8,18,0.42)_0%,rgba(17,24,32,1)_100%)]'
    : 'border-[#d8e4f2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,251,255,1)_100%)]';
  const headerButtonTone = isDarkMode
    ? 'border-white/10 bg-black/25 text-white hover:bg-black/35'
    : 'border-[#d8e4f2] bg-white text-[#153153] hover:bg-[#edf5ff]';
  const toggleButtonTone = isDarkMode
    ? 'border-white/10 bg-black/25 text-white hover:-translate-y-0.5 hover:bg-[#10284f] hover:shadow-[0_12px_24px_rgba(77,163,255,0.2)]'
    : 'border-[#d8e4f2] bg-white text-[#153153] hover:-translate-y-0.5 hover:bg-[#edf5ff] hover:shadow-[0_12px_24px_rgba(21,53,91,0.12)]';
  const heroCardTone = isDarkMode
    ? 'border-white/12 bg-black/30 shadow-[0_18px_40px_rgba(0,0,0,0.25)]'
    : 'border-[#d8e4f2] bg-white shadow-[0_18px_40px_rgba(21,53,91,0.12)]';
  const heroIconTone = isDarkMode ? 'bg-[#1a63c0] text-white' : 'bg-[#dcebff] text-[#1a63c0]';
  const heroBadgeTone = isDarkMode ? 'text-[#8dc3ff]' : 'text-[#1a63c0]';
  const heroTitleTone = isDarkMode ? 'text-white' : 'text-[#102542]';
  const heroDetailTone = isDarkMode ? 'text-white/62' : 'text-[#587392]';
  const sectionTitleTone = isDarkMode ? 'text-[#e0a74b]' : 'text-[#b9851e]';
  const footerTone = isDarkMode ? 'border-white/10 text-white/35' : 'border-[#d8e4f2] text-[#6f84a0]';
  const titleTone = isDarkMode ? 'text-white' : 'text-[#102542]';
  const subtitleTone = isDarkMode ? 'text-white/72' : 'text-[#587392]';

  const closeMenu = () => setIsOpen(false);
  const runAndClose = (callback?: () => void) => {
    callback?.();
    closeMenu();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (sidebarRef.current?.contains(target)) {
        return;
      }

      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openReader = () => {
    if (onOpenReader) {
      runAndClose(onOpenReader);
      return;
    }

    const fallbackBook = selectedBook ?? books[0];
    if (fallbackBook) {
      onSelectBook(fallbackBook);
      onSelectChapter(selectedChapter || 1);
      onFilterChange(filter);
    }
    closeMenu();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className={cn('fixed inset-y-0 left-0 z-[90] flex w-[min(86vw,22rem)] flex-col overflow-hidden border-r', sidebarSurface)}
      >
        <div className={cn('relative overflow-hidden border-b px-5 pb-5 pt-4', headerSurface)}>
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={closeMenu}
                className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-all', headerButtonTone)}
                aria-label={t('app.back')}
                title={t('app.back')}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className={cn('truncate font-serif text-[1.45rem] font-bold leading-none', titleTone)}>{t('app.title')}</p>
                <p className={cn('mt-1 text-[11px]', subtitleTone)}>{selectedBook ? `${selectedBook.names[0]} ${selectedChapter}` : t('app.home')}</p>
              </div>
            </div>

            {onToggleDarkMode ? (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={cn('group flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-all duration-200', toggleButtonTone)}
                aria-label={isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
                title={isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
              >
                <span className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12">
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </span>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={openReader}
            className={cn('relative mt-5 flex w-full items-center gap-3 rounded-[24px] border px-4 py-4 text-left backdrop-blur-xl', heroCardTone)}
          >
            <span className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl', heroIconTone)}>
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[10px] font-bold uppercase tracking-[0.24em]', heroBadgeTone)}>{menuCopy.openReader}</span>
              <span className={cn('mt-1 block text-base font-semibold', heroTitleTone)}>{menuCopy.continueReading}</span>
              <span className={cn('mt-1 block truncate text-xs', heroDetailTone)}>{menuCopy.continueDetail}</span>
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {onShare ? (
          <SidebarSection title={menuCopy.configuration} isDarkMode={isDarkMode}>
            {onShare ? (
              <SidebarActionRow
                icon={<Share2 className="h-5 w-5" />}
                label={t('menu.share')}
                detail={currentLanguage.startsWith('en') ? 'Share the app' : 'Comparte la app'}
                onClick={() => runAndClose(onShare)}
                isDarkMode={isDarkMode}
              />
            ) : null}
          </SidebarSection>
          ) : null}

          <SidebarSection title={menuCopy.navigation} isDarkMode={isDarkMode}>
            {onGoHome ? (
              <SidebarActionRow icon={<Home className="h-5 w-5" />} label={t('app.home')} onClick={() => runAndClose(onGoHome)} isDarkMode={isDarkMode} />
            ) : null}
            <SidebarActionRow icon={<BookOpen className="h-5 w-5" />} label={menuCopy.openReader} onClick={openReader} isDarkMode={isDarkMode} />
            <SidebarActionRow icon={<Heart className="h-5 w-5" />} label={t('menu.favorites')} onClick={() => runAndClose(onOpenFavorites)} isDarkMode={isDarkMode} />
            <SidebarActionRow icon={<Sparkles className="h-5 w-5" />} label={t('menu.study')} onClick={() => runAndClose(onOpenStudy)} isDarkMode={isDarkMode} />
            {onOpenGame ? (
              <SidebarActionRow icon={<Gamepad2 className="h-5 w-5" />} label={t('menu.game')} onClick={() => runAndClose(onOpenGame)} isDarkMode={isDarkMode} />
            ) : null}
          </SidebarSection>

          <SidebarSection title={menuCopy.daily} isDarkMode={isDarkMode}>
            <SidebarActionRow
              icon={<Flame className="h-5 w-5" />}
              label={t('menu.daily_challenges')}
              detail={currentLanguage.startsWith('en') ? 'Verse, reflection, and daily rhythm' : 'Versículo, reflexión y ritmo diario'}
              onClick={() => runAndClose(onOpenDailyExperience)}
              isDarkMode={isDarkMode}
            />
          </SidebarSection>
        </div>

        <div className={cn('border-t px-5 py-4', footerTone)}>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.22em]">© 2026 Dofepro-Tech</p>
        </div>
      </motion.aside>
    </>
  );
}

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  isDarkMode: boolean;
}

function SidebarSection({ title, children, isDarkMode }: SidebarSectionProps) {
  return (
    <section className="mb-6">
      <p className={cn('mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'text-[#e0a74b]' : 'text-[#b9851e]')}>{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

interface SidebarActionRowProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  detail?: string;
  isDarkMode: boolean;
}

function SidebarActionRow({ icon, label, onClick, detail, isDarkMode }: SidebarActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition-all',
        isDarkMode
          ? 'border-white/8 bg-white/[0.03] hover:border-[#5aa8ff]/35 hover:bg-[#0f1f33]'
          : 'border-[#d8e4f2] bg-white hover:border-[#5aa8ff]/35 hover:bg-[#edf5ff]'
      )}
    >
      <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl', isDarkMode ? 'bg-[#0f2d52] text-[#79baff]' : 'bg-[#dcebff] text-[#1a63c0]')}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[15px] font-medium', isDarkMode ? 'text-white' : 'text-[#102542]')}>{label}</span>
        {detail ? <span className={cn('mt-0.5 block truncate text-xs', isDarkMode ? 'text-white/52' : 'text-[#587392]')}>{detail}</span> : null}
      </span>
    </button>
  );
}