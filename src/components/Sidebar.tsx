import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Book, Bookmark, SidebarBookFilter } from '@/src/types';
import type { AboutLegalType } from '@/src/components/AboutLegalModal';
import { AppOverflowMenu } from '@/src/components/AppOverflowMenu';
import { cn } from '@/src/lib/utils';
import { ArrowLeft, BookOpen, Flame, Gamepad2, Heart, Home, Moon, Share2, Sparkles, Sun, X, Search, Calendar, MessageCircle, Github, Linkedin, Globe, Target, Eye, Star as StarIcon, Shield, FileText, Info, MessageSquare, Book as BookIcon } from 'lucide-react';
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
  onOpenSearch?: () => void;
  onOpenPlans?: () => void;
  onOpenOpinions?: () => void;
  onOpenDictionary?: () => void;
  onOpenUser?: () => void;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  bookmarks: Bookmark[];
  onSelectBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (id: string) => void;
  onPlayFavorite?: (bookmark: Bookmark) => void;
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
  onOpenSearch,
  onOpenPlans,
  onOpenOpinions,
  onOpenDictionary,
  onOpenUser,
  onOpenAboutLegal,
  isDarkMode = true,
  onToggleDarkMode,
  bookmarks,
  onSelectBookmark,
  onRemoveBookmark,
  onPlayFavorite,
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
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const sidebarRef = useRef<HTMLElement>(null);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const [activeTab, setActivePage] = useState<'menu' | 'favorites' | 'settings'>('menu');

  const menuCopy = currentLanguage.startsWith('en')
    ? {
        configuration: 'Configuration',
        navigation: 'Navigation',
        daily: 'Daily content',
        openReader: 'Bible',
        continueReading: 'Continue reading',
        continueDetail: selectedBook ? `${selectedBook.names[0]} ${selectedChapter}` : 'Open the reader',
        tools: 'Tools',
        social: 'Social',
      }
    : {
        configuration: 'Configuración',
        navigation: 'Navegación',
        daily: 'Contenido diario',
        openReader: 'Biblia',
        continueReading: 'Continuar lectura',
        continueDetail: selectedBook ? `${selectedBook.names[0]} ${selectedChapter}` : 'Abrir el lector',
        tools: 'Herramientas',
        social: 'Redes Sociales',
      };

  const sidebarSurface = isDarkMode
    ? 'border-white/10 bg-[#0b1219] text-white shadow-[0_28px_70px_rgba(0,0,0,0.45)]'
    : 'border-[#d8e4f2] bg-[#f7fbff] text-[#102542] shadow-[0_28px_70px_rgba(21,53,91,0.18)]';

  const closeMenu = () => setIsOpen(false);
  const runAndClose = (callback?: () => void) => {
    callback?.();
    closeMenu();
  };

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
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className={cn('fixed inset-y-0 left-0 z-[90] flex w-[min(90vw,24rem)] flex-col overflow-hidden border-r', sidebarSurface)}
      >
        {/* Header Tabs - Estilo Bibliatodo */}
        <div className={cn('flex border-b', isDarkMode ? 'border-white/5 bg-black/20' : 'border-[#d8e4f2] bg-white')}>
          <button
            onClick={() => setActivePage('menu')}
            className={cn('flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all', activeTab === 'menu' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : isDarkMode ? 'text-white/45' : 'text-[#64748b] hover:text-[#102542]')}
          >
            Menú
          </button>
          <button
            onClick={() => setActivePage('favorites')}
            className={cn('flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all', activeTab === 'favorites' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : isDarkMode ? 'text-white/45' : 'text-[#64748b] hover:text-[#102542]')}
          >
            {t('menu.favorites')}
          </button>
          <button
            onClick={() => setActivePage('settings')}
            className={cn('flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all', activeTab === 'settings' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : isDarkMode ? 'text-white/45' : 'text-[#64748b] hover:text-[#102542]')}
          >
            {t('menu.settings')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {activeTab === 'menu' && (
            <div className="p-4 space-y-6">
              <SidebarSection title={menuCopy.navigation} isDarkMode={isDarkMode}>
                <SidebarActionRow icon={<Home className="h-5 w-5" />} label={t('app.home')} onClick={() => runAndClose(onGoHome)} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<BookOpen className="h-5 w-5" />} label={menuCopy.openReader} onClick={openReader} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Search className="h-5 w-5" />} label={t('menu.search')} onClick={() => runAndClose(onOpenSearch)} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Calendar className="h-5 w-5" />} label={t('menu.plans')} onClick={() => runAndClose(onOpenPlans)} isDarkMode={isDarkMode} />
              </SidebarSection>

              <SidebarSection title={menuCopy.tools} isDarkMode={isDarkMode}>
                <SidebarActionRow icon={<Sparkles className="h-5 w-5" />} label={t('menu.study')} detail="IA Bíblica" onClick={() => runAndClose(onOpenStudy)} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<MessageSquare className="h-5 w-5" />} label="Opiniones" onClick={() => runAndClose(onOpenOpinions)} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<BookIcon className="h-5 w-5" />} label="Diccionario" onClick={() => runAndClose(onOpenDictionary)} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Gamepad2 className="h-5 w-5" />} label={t('menu.game')} onClick={() => runAndClose(onOpenGame)} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Globe className="h-5 w-5" />} label="Ver Portafolio" onClick={() => window.location.assign('https://dofepro-tech.github.io/Mi-Portafolio/')} isDarkMode={isDarkMode} />
              </SidebarSection>

              <SidebarSection title={menuCopy.daily} isDarkMode={isDarkMode}>
                <SidebarActionRow icon={<Flame className="h-5 w-5" />} label={t('menu.daily_challenges')} onClick={() => runAndClose(onOpenDailyExperience)} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Share2 className="h-5 w-5" />} label={t('menu.share')} detail="Compartir App" onClick={() => runAndClose(onShare)} isDarkMode={isDarkMode} />
              </SidebarSection>

              <SidebarSection title={t('menu.about')} isDarkMode={isDarkMode}>
                <SidebarActionRow icon={<Info className="h-5 w-5" />} label={t('menu.about')} onClick={() => runAndClose(() => onOpenAboutLegal?.('about'))} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Target className="h-5 w-5" />} label={t('menu.mission')} onClick={() => runAndClose(() => onOpenAboutLegal?.('mission'))} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Eye className="h-5 w-5" />} label={t('menu.vision')} onClick={() => runAndClose(() => onOpenAboutLegal?.('vision'))} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<StarIcon className="h-5 w-5" />} label={t('menu.values')} onClick={() => runAndClose(() => onOpenAboutLegal?.('values'))} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<FileText className="h-5 w-5" />} label={t('menu.terms')} onClick={() => runAndClose(() => onOpenAboutLegal?.('terms'))} isDarkMode={isDarkMode} />
                <SidebarActionRow icon={<Shield className="h-5 w-5" />} label={t('menu.privacy')} onClick={() => runAndClose(() => onOpenAboutLegal?.('privacy'))} isDarkMode={isDarkMode} />
              </SidebarSection>

              <div className={cn('pt-4 border-t', isDarkMode ? 'border-white/5' : 'border-[#d8e4f2]')}>
                <p className={cn('px-2 text-[10px] font-bold uppercase tracking-widest mb-4', isDarkMode ? 'text-white/45' : 'text-[#587392]')}>{menuCopy.social}</p>
                <div className="flex gap-4 px-2">
                  <a href="https://wa.me/18492618830" target="_blank" rel="noreferrer" aria-label="WhatsApp" className={cn('rounded-2xl p-3 transition-all', isDarkMode ? 'bg-white/5 text-[#25D366] hover:bg-white/10' : 'border border-[#d8e4f2] bg-white text-[#128c4a] hover:bg-[#edf5ff]')}><MessageCircle className="h-5 w-5" /></a>
                  <a href="https://github.com/dofepro" target="_blank" rel="noreferrer" aria-label="GitHub" className={cn('rounded-2xl p-3 transition-all', isDarkMode ? 'bg-white/5 text-white/80 hover:bg-white/10' : 'border border-[#d8e4f2] bg-white text-[#24292f] hover:bg-[#edf5ff]')}><Github className="h-5 w-5" /></a>
                  <a href="https://www.linkedin.com/in/domingo-feliz-dofepro-tech" target="_blank" rel="noreferrer" aria-label="LinkedIn" className={cn('rounded-2xl p-3 transition-all', isDarkMode ? 'bg-white/5 text-[#36a9e8] hover:bg-white/10' : 'border border-[#d8e4f2] bg-white text-[#0a66c2] hover:bg-[#edf5ff]')}><Linkedin className="h-5 w-5" /></a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-6 px-2">
                <Heart className="h-5 w-5 text-[#ff7f7f] fill-[#ff7f7f]" />
                <h3 className="font-serif text-xl font-bold uppercase">{t('menu.favorites')}</h3>
              </div>
              {bookmarks.length === 0 ? (
                <div className={cn('py-20 text-center font-serif italic', isDarkMode ? 'text-white/45' : 'text-[#587392]')}>{t('verses.no_bookmarks')}</div>
              ) : (
                <div className="space-y-3">
                  {bookmarks.map(b => (
                    <div key={b.id} className={cn('group relative rounded-2xl border p-4 transition-all', isDarkMode ? 'border-white/5 bg-white/[0.03] hover:border-[#ff7f7f]/30' : 'border-[#d8e4f2] bg-white hover:border-[#d64255]/30')}>
                      <button onClick={() => { onSelectBookmark(b); closeMenu(); }} className="w-full text-left pr-8">
                        <p className="font-serif font-bold text-white mb-1">{b.label}</p>
                        <p className={cn('text-[10px] uppercase tracking-widest', isDarkMode ? 'text-white/45' : 'text-[#587392]')}>{new Date(b.createdAt).toLocaleDateString()}</p>
                      </button>
                      <button onClick={() => onRemoveBookmark(b.id)} className={cn('absolute right-4 top-1/2 -translate-y-1/2 p-2 transition-all', isDarkMode ? 'text-white/45 hover:text-[#ff7f7f]' : 'text-[#64748b] hover:text-[#d64255]')}><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="p-4">
                <AppOverflowMenu
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={onToggleDarkMode!}
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
                   menuClassName="static w-full shadow-none border-none bg-transparent"
                   inline
                 />
             </div>
          )}
        </div>
        <div className={cn('shrink-0 border-t px-4 py-3 text-center', isDarkMode ? 'border-white/5 bg-black/10' : 'border-[#d8e4f2] bg-white/70')}>
          <p className={cn('font-serif text-sm italic', isDarkMode ? 'text-white/65' : 'text-[#334155]')}>Haciéndolo de corazón, como para el Señor.</p>
          <p className={cn('mt-1 text-[10px] font-bold uppercase tracking-widest', isDarkMode ? 'text-white/40' : 'text-[#64748b]')}>Colosenses 3:23</p>
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
      <p className={cn('mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'text-[#e0a74b]' : 'text-[#8c5b00]')}>{title}</p>
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
          ? 'border-white/8 bg-white/[0.03] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/10'
          : 'border-[#d8e4f2] bg-white hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5'
      )}
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[15px] font-medium', isDarkMode ? 'text-white' : 'text-[#102542]')}>{label}</span>
        {detail ? <span className={cn('mt-0.5 block truncate text-xs', isDarkMode ? 'text-white/52' : 'text-[#587392]')}>{detail}</span> : null}
      </span>
    </button>
  );
}
