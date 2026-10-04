import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { ArrowRight, BookOpen, Download, Flame, Gamepad2, Globe, Heart, Info, Moon, MoreVertical, RefreshCw, Settings, Share2, Sparkles, Sun, Volume2, X, House } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { canUseSpeechSynthesis, getSpeechVoices, setSpeechVoicesChangedListener } from '@/src/lib/speech';
import { darkThemePalettes, lightThemePalettes } from '@/src/lib/themePalettes';

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
  keepScreenOn?: boolean;
  setKeepScreenOn?: (keep: boolean) => void;
  startupPage?: 'home' | 'reader';
  setStartupPage?: (page: 'home' | 'reader') => void;
  homeSections?: Record<string, boolean>;
  setHomeSections?: (sections: any) => void;
  onOpenBooks?: () => void;
  onOpenStudy?: () => void;
  onOpenDailyExperience?: () => void;
  onOpenFavorites?: () => void;
  onOpenGame?: () => void;
  onShare?: () => void;
  buttonClassName?: string;
  menuClassName?: string;
  inline?: boolean;
}

export function AppOverflowMenu({
  isDarkMode,
  onToggleDarkMode,
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
  onOpenBooks,
  onOpenStudy,
  onOpenDailyExperience,
  onOpenFavorites,
  onOpenGame,
  onShare,
  buttonClassName,
  menuClassName,
  inline = false,
}: AppOverflowMenuProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(inline);
  const [view, setView] = useState<PanelView>('settings');
  const [activeAboutSection, setActiveAboutSection] = useState<AboutSectionId | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const isAndroidApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  useEffect(() => {
    if (!canUseSpeechSynthesis()) return;
    let isDisposed = false;
    let removeAppStateListener: (() => void) | undefined;
    const loadVoices = async () => {
      try {
        const availableVoices = isAndroidApp
          ? (await TextToSpeech.getSupportedVoices()).voices
          : getSpeechVoices();
        if (!isDisposed) setVoices(availableVoices);
      } catch (error) {
        console.error('Error refreshing speech voices:', error);
      }
    };

    void loadVoices();
    setSpeechVoicesChangedListener(() => { void loadVoices(); });
    if (isAndroidApp) {
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void loadVoices();
      }).then((listener) => {
        if (isDisposed) void listener.remove();
        else removeAppStateListener = () => { void listener.remove(); };
      });
    }

    return () => {
      isDisposed = true;
      setSpeechVoicesChangedListener(null);
      removeAppStateListener?.();
    };
  }, []);

  useEffect(() => {
    if (voiceURI.startsWith('gemini-tts:')) setVoiceURI('');
  }, [voiceURI, setVoiceURI]);

  useEffect(() => {
    if (!isOpen || inline) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, inline]);

  const panelSurface = isDarkMode ? 'bg-[#0b1219] text-white border-white/10 shadow-2xl' : 'bg-white text-[#102542] border-slate-200 shadow-xl';
  const panelSubtle = isDarkMode ? 'text-white/45' : 'text-slate-400';
  const fieldSurface = isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200';
  const buttonTone = isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50';
  const activeTone = 'bg-[var(--primary)] border-[var(--primary)] text-white';
  const themePalettes = isDarkMode ? darkThemePalettes : lightThemePalettes;

  const openVoiceInstaller = async () => {
    try {
      await TextToSpeech.openInstall();
    } catch (error) {
      console.error('Error opening Android voice installer:', error);
    }
  };

  const refreshVoices = async () => {
    try {
      const result = await TextToSpeech.getSupportedVoices();
      setVoices(result.voices);
    } catch (error) {
      console.error('Error refreshing Android voices:', error);
    }
  };

  return (
    <div className="relative">
      {!inline && <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn('flex items-center justify-center rounded-2xl border transition-all', isDarkMode ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50', buttonClassName || 'h-10 w-10')}
      >
        <MoreVertical className="h-5 w-5" />
      </button>}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={cn('absolute right-0 top-12 z-[200] w-[min(90vw,24rem)] overflow-hidden rounded-[32px] border', panelSurface, menuClassName)}
          >
            <div className="flex border-b border-white/5 bg-black/10">
              <button onClick={() => setView('settings')} className={cn('flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all', view === 'settings' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'opacity-40')}>
                {t('menu.settings')}
              </button>
              <button onClick={() => setView('about')} className={cn('flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all', view === 'about' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'opacity-40')}>
                {t('menu.about')}
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 no-scrollbar">
              {view === 'settings' ? (
                <div className="space-y-6">
                  <div className="space-y-3 border-b border-white/5 pb-6">
                    <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{currentLanguage.startsWith('es') ? 'Modo de color' : 'Color mode'}</label>
                    <button type="button" onClick={onToggleDarkMode} className={cn('theme-toggle-action flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all', buttonTone)}>
                      <span className="flex items-center gap-3">
                        {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-rose-400" />}
                        {currentLanguage.startsWith('es') ? 'Cambiar apariencia' : 'Change appearance'}
                      </span>
                      <span className="rounded-full bg-[var(--primary)]/15 px-3 py-1 text-xs font-bold text-[var(--primary)]">{currentLanguage.startsWith('es') ? (isDarkMode ? 'Oscuro' : 'Claro') : (isDarkMode ? 'Dark' : 'Light')}</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{t('settings.font_size')}</label>
                    <div className="flex items-center gap-4 px-2">
                      <span className="text-xs">A</span>
                      <input type="range" min="14" max="32" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
                      <span className="text-lg">A</span>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-white/5 pt-6">
                    <label htmlFor="speech-voice" className={cn('flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>
                      <Volume2 className="h-4 w-4" />
                      {currentLanguage.startsWith('es') ? 'Voz para los audios' : 'Audio voice'}
                    </label>
                    <select
                      id="speech-voice"
                      value={voiceURI.startsWith('gemini-tts:') ? '' : voiceURI}
                      onChange={(event) => setVoiceURI(event.target.value)}
                      className={cn('min-h-12 w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60', fieldSurface)}
                    >
                      <option value="">{currentLanguage.startsWith('es') ? 'Automática (recomendada)' : 'Automatic (recommended)'}</option>
                      {voices.length > 0 && (
                        <optgroup label={currentLanguage.startsWith('es') ? 'Voces del dispositivo' : 'Device voices'}>
                          {voices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name}{voice.lang ? ` (${voice.lang})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={currentLanguage.startsWith('es') ? 'Gemini · Próximamente' : 'Gemini · Coming soon'}>
                        <option value="gemini-coming-soon" disabled>{currentLanguage.startsWith('es') ? 'Próximamente' : 'Coming soon'}</option>
                      </optgroup>
                    </select>
                    {voices.length === 0 && (
                      <p className={cn('text-xs leading-5', panelSubtle)}>
                        {currentLanguage.startsWith('es') ? 'No hay voces instaladas disponibles en este dispositivo.' : 'No installed voices are available on this device.'}
                      </p>
                    )}
                    {isAndroidApp && (
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { void openVoiceInstaller(); }} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors', buttonTone)}>
                          <Download className="h-4 w-4 shrink-0" />
                          {currentLanguage.startsWith('es') ? 'Instalar voces' : 'Install voices'}
                        </button>
                        <button type="button" onClick={() => { void refreshVoices(); }} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors', buttonTone)}>
                          <RefreshCw className="h-4 w-4 shrink-0" />
                          {currentLanguage.startsWith('es') ? 'Actualizar lista' : 'Refresh list'}
                        </button>
                      </div>
                    )}
                    <p className={cn('text-xs leading-5', panelSubtle)}>
                      {currentLanguage.startsWith('es') ? 'La cantidad de voces depende del motor de texto a voz instalado en Android.' : 'Voice availability depends on the text-to-speech engine installed on Android.'}
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{t('settings.language')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => i18n.changeLanguage('es')} className={cn('py-3 rounded-2xl border text-sm font-bold transition-all', currentLanguage.startsWith('es') ? activeTone : buttonTone)}>Español</button>
                      <button onClick={() => i18n.changeLanguage('en')} className={cn('py-3 rounded-2xl border text-sm font-bold transition-all', currentLanguage.startsWith('en') ? activeTone : buttonTone)}>English</button>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{currentLanguage.startsWith('es') ? 'Pantalla' : 'Display'}</label>
                    <SectionToggle label={currentLanguage.startsWith('es') ? 'Mantener encendida' : 'Keep screen on'} active={keepScreenOn} onChange={setKeepScreenOn} isDarkMode={isDarkMode} />
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <div>
                      <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{currentLanguage.startsWith('es') ? 'Paleta de temas' : 'Theme palette'}</label>
                      <p className={cn('mt-1 text-xs', panelSubtle)}>{currentLanguage.startsWith('es') ? `${isDarkMode ? 'Temas oscuros' : 'Temas claros'} (10)` : `${isDarkMode ? 'Dark themes' : 'Light themes'} (10)`}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {themePalettes.map((palette) => {
                        const selected = accentColor === palette.id;
                        return <button key={palette.id} type="button" onClick={() => setAccentColor(palette.id)} aria-pressed={selected} className={cn('theme-palette-choice flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition-colors', selected ? 'border-[var(--primary)] bg-[var(--primary)]/10' : buttonTone)}>
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: palette.color }} />
                          <span className="leading-tight">{palette.name}</span>
                        </button>;
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{currentLanguage.startsWith('es') ? 'Página de inicio' : 'Startup page'}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setStartupPage('home')} className={cn('flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all', startupPage === 'home' ? activeTone : buttonTone)}><House className="h-4 w-4" /> {currentLanguage.startsWith('es') ? 'Inicio' : 'Home'}</button>
                      <button onClick={() => setStartupPage('reader')} className={cn('flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all', startupPage === 'reader' ? activeTone : buttonTone)}><BookOpen className="h-4 w-4" /> {currentLanguage.startsWith('es') ? 'Biblia' : 'Bible'}</button>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <label className={cn('block font-sans text-xs font-bold uppercase tracking-[0.22em]', panelSubtle)}>{currentLanguage.startsWith('es') ? 'Contenido del Inicio' : 'Home Content'}</label>
                    <div className="space-y-2">
                      <SectionToggle label={currentLanguage.startsWith('es') ? 'Versículo' : 'Verse'} active={homeSections.dailyVerse} onChange={(val) => setHomeSections({...homeSections, dailyVerse: val})} isDarkMode={isDarkMode} />
                      <SectionToggle label={currentLanguage.startsWith('es') ? 'Devocional' : 'Devotion'} active={homeSections.devotional} onChange={(val) => setHomeSections({...homeSections, devotional: val})} isDarkMode={isDarkMode} />
                      <SectionToggle label={currentLanguage.startsWith('es') ? 'Imágenes' : 'Images'} active={homeSections.images} onChange={(val) => setHomeSections({...homeSections, images: val})} isDarkMode={isDarkMode} />
                      <SectionToggle label={currentLanguage.startsWith('es') ? 'Noticias' : 'News'} active={homeSections.news} onChange={(val) => setHomeSections({...homeSections, news: val})} isDarkMode={isDarkMode} />
                      <SectionToggle label={currentLanguage.startsWith('es') ? 'Vídeos' : 'Videos'} active={homeSections.videos} onChange={(val) => setHomeSections({...homeSections, videos: val})} isDarkMode={isDarkMode} />
                      <SectionToggle label={currentLanguage.startsWith('es') ? 'Juegos' : 'Games'} active={homeSections.game} onChange={(val) => setHomeSections({...homeSections, game: val})} isDarkMode={isDarkMode} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className={cn('rounded-[26px] border p-5', fieldSurface)}>
                      <div className="flex items-center gap-3 mb-4">
                         <div className="h-10 w-10 p-1 bg-[#07152b] rounded-lg border border-[#1d4f96]"><BrandSeal className="h-full w-full" showWordmark={false} /></div>
                         <h3 className="font-serif text-xl font-bold">{t('app.title')}</h3>
                      </div>
                      <p className="text-sm leading-relaxed opacity-70">
                         {currentLanguage.startsWith('es')
                           ? 'Una plataforma innovadora para fortalecer tu fe a través de la Palabra de Dios y la tecnología.'
                           : 'An innovative platform to strengthen your faith through God\'s Word and technology.'}
                      </p>
                   </div>

                   <div className="grid gap-3">
                      <InfoRow label={t('about.created_by')} value="Dofepro-Tech" subdued={panelSubtle} />
                      <InfoRow label={t('about.creation_year')} value="2026" subdued={panelSubtle} />
                      <InfoRow label={t('about.license')} value="Apache-2.0" subdued={panelSubtle} />
                   </div>
                </div>
              )}
            </div>

            {!inline && <div className="p-4 border-t border-white/5 bg-black/5">
               <button onClick={() => setIsOpen(false)} className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[var(--primary-hover)] transition-all">
                 {t('app.ready')}
               </button>
            </div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionToggle({ label, active, onChange, isDarkMode }: { label: string, active: boolean, onChange: (val: boolean) => void, isDarkMode: boolean }) {
  return (
    <button type="button" onClick={() => onChange(!active)} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all", isDarkMode ? "border-white/5 bg-white/5 hover:bg-white/10" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}>
      <span className="text-sm font-bold">{label}</span>
      <div className={cn("relative h-6 w-11 rounded-full transition-colors", active ? "bg-[var(--primary)]" : "bg-gray-400/30")}>
        <motion.div animate={{ x: active ? 22 : 4 }} className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
      </div>
    </button>
  );
}

function InfoRow({ label, value, subdued }: { label: string; value: string; subdued: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={cn('font-sans text-[10px] font-bold uppercase tracking-[0.22em]', subdued)}>{label}</span>
      <span className="font-sans text-sm font-bold">{value}</span>
    </div>
  );
}

function BrandSeal({ className, showWordmark = false }: { className?: string, showWordmark?: boolean }) {
  return <div className={cn("flex items-center justify-center", className)}><BookOpen className="h-full w-full text-[var(--primary)]" /></div>;
}
