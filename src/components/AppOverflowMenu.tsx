import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, Flame, Gamepad2, Globe, Heart, Info, Moon, MoreVertical, Settings, Share2, Sparkles, Sun, Volume2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { canUseSpeechSynthesis, getSpeechVoices, setSpeechVoicesChangedListener } from '@/src/lib/speech';

type AboutSectionId = 'mission' | 'vision' | 'values';
type PanelView = 'settings' | 'about';

interface AppOverflowMenuProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  voiceURI: string;
  setVoiceURI: (uri: string) => void;
  onOpenBooks?: () => void;
  onOpenStudy?: () => void;
  onOpenDailyExperience?: () => void;
  onOpenFavorites?: () => void;
  onOpenGame?: () => void;
  onShare?: () => void;
  buttonClassName?: string;
  menuClassName?: string;
}

const ACCENT_OPTIONS = [
  { id: 'violet', color: '#4c1d95', nameEs: 'Violeta', nameEn: 'Violet' },
  { id: 'olive', color: '#5A5A40', nameEs: 'Oliva', nameEn: 'Olive' },
  { id: 'indigo', color: '#6366f1', nameEs: 'Índigo', nameEn: 'Indigo' },
  { id: 'blue', color: '#3b82f6', nameEs: 'Azul', nameEn: 'Blue' },
  { id: 'teal', color: '#14b8a6', nameEs: 'Turquesa', nameEn: 'Teal' },
  { id: 'green', color: '#10b981', nameEs: 'Esmeralda', nameEn: 'Emerald' },
  { id: 'gold', color: '#c2a153', nameEs: 'Oro', nameEn: 'Gold' },
  { id: 'amber', color: '#f59e0b', nameEs: 'Ámbar', nameEn: 'Amber' },
  { id: 'orange', color: '#f97316', nameEs: 'Naranja', nameEn: 'Orange' },
  { id: 'red', color: '#ef4444', nameEs: 'Rubí', nameEn: 'Ruby' },
  { id: 'rose', color: '#f43f5e', nameEs: 'Rosa', nameEn: 'Rose' },
  { id: 'slate', color: '#475569', nameEs: 'Pizarra', nameEn: 'Slate' },
];

export function AppOverflowMenu({
  isDarkMode,
  onToggleDarkMode,
  fontSize,
  setFontSize,
  accentColor,
  setAccentColor,
  voiceURI,
  setVoiceURI,
  onOpenBooks,
  onOpenStudy,
  onOpenDailyExperience,
  onOpenFavorites,
  onOpenGame,
  onShare,
  buttonClassName,
  menuClassName,
}: AppOverflowMenuProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const aboutValuesRaw = t('about.values_items', { returnObjects: true });
  const aboutValues = Array.isArray(aboutValuesRaw)
    ? (aboutValuesRaw as Array<{ title: string; description: string }>)
    : [];
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const [aboutSection, setAboutSection] = useState<AboutSectionId | null>(null);
  const panelScrollRef = useRef<HTMLDivElement>(null);
  const missionSectionRef = useRef<HTMLDivElement>(null);
  const visionSectionRef = useRef<HTMLDivElement>(null);
  const valuesSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canUseSpeechSynthesis()) {
      setVoices([]);
      return;
    }

    const loadVoices = () => {
      setVoices(getSpeechVoices());
    };

    loadVoices();
    setSpeechVoicesChangedListener(loadVoices);

    return () => {
      setSpeechVoicesChangedListener(null);
    };
  }, []);

  useEffect(() => {
    if (panelView !== 'about' || !aboutSection) {
      return;
    }

    const container = panelScrollRef.current;
    if (!container) {
      return;
    }

    const targetRef = aboutSection === 'mission'
      ? missionSectionRef
      : aboutSection === 'vision'
        ? visionSectionRef
        : valuesSectionRef;

    const scrollToTarget = () => {
      if (aboutSection === 'mission') {
        container.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }

      targetRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    };

    const initialTimer = window.setTimeout(scrollToTarget, 80);
    const settleTimer = window.setTimeout(scrollToTarget, 260);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(settleTimer);
    };
  }, [aboutSection, panelView]);

  const openSettings = () => {
    setPanelView('settings');
    setIsMenuOpen(false);
  };

  const openAbout = (section?: AboutSectionId) => {
    setAboutSection(section ?? null);
    setPanelView('about');
    setIsMenuOpen(false);
  };

  const closePanel = () => {
    setPanelView(null);
    setAboutSection(null);
  };

  const handleAction = (callback?: () => void) => {
    callback?.();
    setIsMenuOpen(false);
  };

  const panelSurface = isDarkMode
    ? 'border-white/10 bg-[#07162b] text-white shadow-[0_28px_90px_rgba(0,0,0,0.34)]'
    : 'border-[#cfe0f2] bg-white text-[#102542] shadow-[0_28px_90px_rgba(21,53,91,0.18)]';
  const panelSubtle = isDarkMode ? 'text-[#b9d6f8]' : 'text-[#587392]';
  const panelBorder = isDarkMode ? 'border-white/10' : 'border-[#d9e7f5]';
  const fieldSurface = isDarkMode
    ? 'border-white/10 bg-white/5 text-white'
    : 'border-[#d4e2f1] bg-[#f8fbff] text-[#153153]';
  const buttonTone = isDarkMode
    ? 'border-white/10 bg-white/5 text-white hover:border-[#7dc3ff]/40 hover:bg-[#10284f]'
    : 'border-[#d4e2f1] bg-white text-[#153153] hover:border-[#7dc3ff]/40 hover:bg-[#edf5ff]';
  const activeTone = isDarkMode
    ? 'border-[#7dc3ff]/40 bg-[#10284f] text-white'
    : 'border-[#7dc3ff]/50 bg-[#edf5ff] text-[#153153]';
  const menuItemTone = isDarkMode
    ? 'text-white hover:bg-white/5 hover:text-white'
    : 'text-[#153153] hover:bg-[#edf5ff] hover:text-[#102542]';
  const menuItemIconTone = isDarkMode
    ? 'bg-black/10 text-[#b9d6f8]'
    : 'bg-[#edf5ff] text-[#153153] group-hover:bg-[#dcecff]';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsMenuOpen((previous) => !previous)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-2xl border transition-all sm:h-11 sm:w-11',
          buttonTone,
          buttonClassName,
        )}
        title={t('menu.more_options')}
        aria-label={t('menu.more_options')}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-[200]" onClick={() => setIsMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className={cn(
                'absolute right-0 top-12 z-[210] max-h-[min(72vh,640px)] w-[min(88vw,290px)] overflow-y-auto rounded-[26px] border backdrop-blur-xl',
                panelSurface,
                menuClassName,
              )}
            >
              <div className={cn('p-2', panelBorder)}>
                <MenuActionItem icon={<Settings className="h-4 w-4" />} label={t('menu.settings')} onClick={openSettings} tone={menuItemTone} iconTone={menuItemIconTone} />
                {onOpenBooks && <MenuActionItem icon={<BookOpen className="h-4 w-4" />} label={t('menu.books')} onClick={() => handleAction(onOpenBooks)} tone={menuItemTone} iconTone={menuItemIconTone} />}
                {onOpenStudy && <MenuActionItem icon={<Sparkles className="h-4 w-4" />} label={t('menu.study')} onClick={() => handleAction(onOpenStudy)} tone={menuItemTone} iconTone={menuItemIconTone} />}
                {onOpenDailyExperience && <MenuActionItem icon={<Flame className="h-4 w-4" />} label={t('menu.daily_challenges')} onClick={() => handleAction(onOpenDailyExperience)} tone={menuItemTone} iconTone={menuItemIconTone} />}
                {onOpenFavorites && <MenuActionItem icon={<Heart className="h-4 w-4" />} label={t('menu.favorites')} onClick={() => handleAction(onOpenFavorites)} tone={menuItemTone} iconTone={menuItemIconTone} />}
                {onOpenGame && <MenuActionItem icon={<Gamepad2 className="h-4 w-4" />} label={t('menu.game')} onClick={() => handleAction(onOpenGame)} tone={menuItemTone} iconTone={menuItemIconTone} />}
                {onShare && <MenuActionItem icon={<Share2 className="h-4 w-4" />} label={t('menu.share')} onClick={() => handleAction(onShare)} tone={menuItemTone} iconTone={menuItemIconTone} />}
                <div className={cn('mx-2 my-1 h-px', panelBorder, isDarkMode ? 'bg-white/10' : 'bg-[#d9e7f5]')} />
                <MenuActionItem icon={<ArrowRight className="h-4 w-4" />} label={t('menu.mission')} onClick={() => openAbout('mission')} tone={menuItemTone} iconTone={menuItemIconTone} />
                <MenuActionItem icon={<ArrowRight className="h-4 w-4" />} label={t('menu.vision')} onClick={() => openAbout('vision')} tone={menuItemTone} iconTone={menuItemIconTone} />
                <MenuActionItem icon={<ArrowRight className="h-4 w-4" />} label={t('menu.values')} onClick={() => openAbout('values')} tone={menuItemTone} iconTone={menuItemIconTone} />
                <MenuActionItem icon={<Info className="h-4 w-4" />} label={t('menu.about')} onClick={() => openAbout()} tone={menuItemTone} iconTone={menuItemIconTone} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
          {panelView && (
            <div className="fixed inset-0 z-[220]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePanel}
                className="absolute inset-0 bg-[#020817]/55 backdrop-blur-sm"
              />

              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className={cn(
                  'absolute inset-y-0 right-0 flex min-h-0 w-full max-w-xl flex-col overflow-hidden border-l',
                  panelSurface,
                )}
              >
                <div className={cn('flex items-center justify-between border-b px-5 py-4 sm:px-6', panelBorder)}>
                  <div>
                    <p className={cn('text-[10px] font-semibold uppercase tracking-[0.28em]', panelSubtle)}>{t('menu.more_options')}</p>
                    <h2 className="mt-1 font-serif text-2xl font-bold">
                      {panelView === 'settings' ? t('settings.title') : t('about.title')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closePanel}
                    className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border transition-all', buttonTone)}
                    title={t('share_sheet.close')}
                    aria-label={t('share_sheet.close')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div ref={panelScrollRef} className="flex-1 overflow-y-auto overscroll-contain scroll-pt-28 px-5 py-5 sm:px-6 sm:py-6">
                  {panelView === 'settings' ? (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{t('settings.language')}</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => i18n.changeLanguage('es')}
                            className={cn('flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all', i18n.language === 'es' ? activeTone : buttonTone)}
                          >
                            <Globe className="h-4 w-4" /> Esp
                          </button>
                          <button
                            type="button"
                            onClick={() => i18n.changeLanguage('en')}
                            className={cn('flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all', i18n.language === 'en' ? activeTone : buttonTone)}
                          >
                            <Globe className="h-4 w-4" /> Eng
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{t('settings.font_size')}</label>
                        <div className="flex items-center gap-4">
                          <button type="button" onClick={() => setFontSize(Math.max(16, fontSize - 2))} className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border transition-all', buttonTone)}>-</button>
                          <div className={cn('flex-1 rounded-2xl border px-4 py-3 text-center font-sans text-sm font-bold', fieldSurface)}>{fontSize}px</div>
                          <button type="button" onClick={() => setFontSize(Math.min(40, fontSize + 2))} className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border transition-all', buttonTone)}>+</button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{t('settings.accent_color')}</label>
                        <div className="flex flex-wrap gap-3">
                          {ACCENT_OPTIONS.map((theme) => (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => setAccentColor(theme.id)}
                              className={cn(
                                'h-10 w-10 rounded-full border-2 transition-all hover:scale-110',
                                accentColor === theme.id ? (isDarkMode ? 'border-white scale-110' : 'border-[#153153] scale-110') : 'border-transparent'
                              )}
                              style={{ backgroundColor: theme.color }}
                              title={currentLanguage.startsWith('es') ? theme.nameEs : theme.nameEn}
                              aria-label={currentLanguage.startsWith('es') ? theme.nameEs : theme.nameEn}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{currentLanguage.startsWith('es') ? 'Voz de lectura' : 'Reading voice'}</label>
                        <select
                          value={voiceURI}
                          onChange={(event) => setVoiceURI(event.target.value)}
                          className={cn('w-full rounded-2xl border px-4 py-3 text-sm font-sans font-bold outline-none transition-all', fieldSurface)}
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
                        <p className={cn('text-xs leading-6', panelSubtle)}>
                          {currentLanguage.startsWith('es')
                            ? 'Las voces disponibles dependen del navegador o del dispositivo móvil.'
                            : 'Available voices depend on the browser or mobile device.'}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{t('settings.reading_mode')}</label>
                        <button
                          type="button"
                          onClick={onToggleDarkMode}
                          className={cn('flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all', buttonTone)}
                        >
                          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                          {isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className={cn('rounded-[26px] border p-5', fieldSurface)}>
                        <p className={cn('font-sans text-sm leading-7', panelSubtle)}>{t('about.subtitle')}</p>
                      </div>

                      <div className="grid gap-4">
                        <AboutBlock innerRef={missionSectionRef} title={t('menu.mission')} body={t('about.mission_body')} active={aboutSection === 'mission'} isDarkMode={isDarkMode} />
                        <AboutBlock innerRef={visionSectionRef} title={t('menu.vision')} body={t('about.vision_body')} active={aboutSection === 'vision'} isDarkMode={isDarkMode} />
                        <AboutBlock innerRef={valuesSectionRef} title={t('menu.values')} body={t('about.values_body')} active={aboutSection === 'values'} isDarkMode={isDarkMode}>
                          <div className="mt-3 space-y-3">
                            {aboutValues.map((value) => (
                              <div
                                key={value.title}
                                className={cn(
                                  'rounded-2xl border px-4 py-3',
                                  isDarkMode ? 'border-white/10 bg-[#0d223f]/70' : 'border-[#d9e7f5] bg-white/90'
                                )}
                              >
                                <p className="font-sans text-sm font-bold">{value.title}</p>
                                <p className={cn('mt-1 font-sans text-sm leading-6', panelSubtle)}>{value.description}</p>
                              </div>
                            ))}
                          </div>
                        </AboutBlock>
                      </div>

                      <div className={cn('rounded-[26px] border p-5', fieldSurface)}>
                        <div className="grid gap-3 text-sm">
                          <InfoRow label={t('about.created_by')} value="Dofepro-Tech" subdued={panelSubtle} />
                          <InfoRow label={t('about.creation_year')} value="2026" subdued={panelSubtle} />
                          <InfoRow label={t('about.license')} value={t('about.license_value')} subdued={panelSubtle} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      ) : null}
    </div>
  );
}

function MenuActionItem({
  icon,
  label,
  onClick,
  tone,
  iconTone,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone: string;
  iconTone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-sans text-sm font-semibold transition-all', tone)}
    >
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-2xl transition-all', iconTone)}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AboutBlock({
  innerRef,
  title,
  body,
  children,
  active,
  isDarkMode,
}: {
  innerRef: RefObject<HTMLDivElement | null>;
  title: string;
  body: string;
  children?: ReactNode;
  active: boolean;
  isDarkMode: boolean;
}) {
  return (
    <div
      ref={innerRef}
      className={cn(
        'scroll-mt-28 rounded-[26px] border p-5 transition-all',
        active
          ? isDarkMode
            ? 'border-[#f6c969]/30 bg-[#f6c969]/10 ring-2 ring-[#f6c969]/15'
            : 'border-[#f6c969]/40 bg-[#fff7df] ring-2 ring-[#f6c969]/20'
          : isDarkMode
            ? 'border-white/10 bg-white/5'
            : 'border-[#d4e2f1] bg-[#f8fbff]'
      )}
    >
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#cfa94f]">{title}</p>
      <p className="mt-2 font-sans text-sm leading-7">{body}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value, subdued }: { label: string; value: string; subdued: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn('font-sans text-[10px] font-bold uppercase tracking-[0.22em]', subdued)}>{label}</span>
      <span className="font-sans text-sm font-bold">{value}</span>
    </div>
  );
}