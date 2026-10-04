import { ArrowUp, Github, Globe, Linkedin, MessageCircle, Target, Eye, Star, FileText, Shield } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { type AboutLegalType } from '@/src/components/AboutLegalModal';
import { BrandSeal } from '@/src/components/BrandSeal';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

export interface MobileBottomNavItem {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface MobileBottomNavProps {
  items: MobileBottomNavItem[];
  className?: string;
}

interface MobilePageFooterProps {
  className?: string;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
  onOpenOpinions?: () => void;
  onOpenDictionary?: () => void;
}

const SUPPORT_EMAIL = 'dofeprotech@gmail.com';
const SUPPORT_WHATSAPP_URL = 'https://wa.me/18492618830?text=Hola%2C%20quiero%20informacion%20sobre%20Biblia%20DJ.';
const WEBSITE_URL = 'https://dofepro.do';
const GITHUB_URL = 'https://github.com/dofepro';
const LINKEDIN_URL = 'https://www.linkedin.com/in/domingo-feliz-dofepro-tech';

function getScrollParent(element: HTMLElement | null): HTMLElement | Window {
  let current = element?.parentElement ?? null;

  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight;

    if (canScroll) {
      return current;
    }

    current = current.parentElement;
  }

  return window;
}

export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const navElement = navRef.current;

    if (!navElement || typeof window === 'undefined') {
      return undefined;
    }

    const scrollTarget = getScrollParent(navElement);
    const getScrollTop = () => (scrollTarget === window ? window.scrollY : (scrollTarget as HTMLElement).scrollTop);
    let lastScrollTop = getScrollTop();
    let ticking = false;

    const updateVisibility = () => {
      const currentScrollTop = getScrollTop();
      const delta = currentScrollTop - lastScrollTop;

      if (currentScrollTop <= 12) {
        setIsVisible(true);
      } else if (Math.abs(delta) >= 6) {
        setIsVisible(delta < 0);
      }

      lastScrollTop = currentScrollTop;
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    };

    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] transition-all duration-300 lg:hidden',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0',
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto grid w-full max-w-[32rem] grid-cols-6 items-end rounded-[28px] border border-white/10 bg-[#050d1a]/96 px-1.5 py-1.5 shadow-[0_-14px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => item.onClick()}
            className={cn(
              'relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[20px] px-0.5 py-1.5 transition-all',
              item.active
                ? 'text-white'
                : 'text-white/72 hover:bg-white/8 hover:text-white'
            )}
            title={item.label}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-2xl transition-all sm:h-9 sm:w-9',
                item.active
                  ? 'bg-[var(--primary)] text-white shadow-[0_10px_22px_rgba(var(--primary-rgb),0.35)]'
                  : 'text-inherit'
              )}
            >
              {item.icon}
            </span>
            <span className="max-w-full truncate text-center font-sans text-[9px] font-medium leading-none text-inherit sm:text-[10px]">{item.label}</span>
            {item.active ? <span className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[var(--primary)] sm:w-8" /> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function MobilePageFooter({ className, onOpenAboutLegal, onOpenOpinions, onOpenDictionary }: MobilePageFooterProps) {
  const { t } = useTranslation();

  return (
    <footer className={cn('w-full mt-auto pt-10 pb-28 lg:pb-8', className)}>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="mb-1 h-px w-full max-w-4xl" style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--primary-rgb), .45), transparent)' }} />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-sans text-[10px] font-bold uppercase tracking-widest text-white/40">
          <button onClick={() => onOpenAboutLegal?.('about')} className="hover:text-[var(--primary)] transition-colors">{t('menu.about')}</button>
          <button onClick={() => onOpenAboutLegal?.('mission')} className="hover:text-[var(--primary)] transition-colors">{t('menu.mission')}</button>
          <button onClick={() => onOpenAboutLegal?.('vision')} className="hover:text-[var(--primary)] transition-colors">{t('menu.vision')}</button>
          <button onClick={() => onOpenAboutLegal?.('values')} className="hover:text-[var(--primary)] transition-colors">{t('menu.values')}</button>
          <button onClick={() => onOpenOpinions?.()} className="hover:text-[var(--primary)] transition-colors">Opiniones</button>
          <button onClick={() => onOpenDictionary?.()} className="hover:text-[var(--primary)] transition-colors">Diccionario</button>
          <button onClick={() => onOpenAboutLegal?.('terms')} className="hover:text-[var(--primary)] transition-colors">{t('menu.terms')}</button>
          <button onClick={() => onOpenAboutLegal?.('privacy')} className="hover:text-[var(--primary)] transition-colors">{t('menu.privacy')}</button>
        </div>

        <div className="max-w-xl text-center">
          <p className="font-serif text-sm italic text-ink-light/80">Haciéndolo de corazón, como para el Señor.</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-olive/60">Colosenses 3:23</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-sans text-[10px] font-medium tracking-wide text-white/30">
          <span className="text-white/40">© 2026 DOFEPRO-TECH</span>
          <span className="hidden sm:inline opacity-20">•</span>

          <div className="flex items-center gap-3">
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.2 transition-colors hover:text-[var(--primary)]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </a>
            <span className="opacity-20">•</span>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-1.2 transition-colors hover:text-white"
            >
              <span>{SUPPORT_EMAIL}</span>
            </a>
          </div>

          <span className="hidden sm:inline opacity-20">•</span>

          <div className="flex items-center gap-3">
            <a href={WEBSITE_URL} target="_blank" rel="noreferrer" title="Website" className="transition-all text-[var(--primary)] opacity-60 hover:opacity-100">
              <Globe className="h-3.5 w-3.5" />
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" title="GitHub" className="transition-all text-[var(--primary)] opacity-60 hover:opacity-100">
              <Github className="h-3.5 w-3.5" />
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" title="LinkedIn" className="transition-all text-[var(--primary)] opacity-60 hover:opacity-100">
              <Linkedin className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function ScrollToTopButton({ targetSelector, label = 'Volver arriba' }: { targetSelector: string; label?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!target) return;

    const updateVisibility = () => setIsVisible(target.scrollTop > 360);
    updateVisibility();
    target.addEventListener('scroll', updateVisibility, { passive: true });
    return () => target.removeEventListener('scroll', updateVisibility);
  }, [targetSelector]);

  const scrollToTop = () => {
    document.querySelector<HTMLElement>(targetSelector)?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 12 }}
          whileHover={{ scale: 1.08, y: -3 }}
          whileTap={{ scale: 0.92 }}
          onClick={scrollToTop}
          aria-label={label}
          title={label}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-3 z-[55] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--primary)]/40 bg-[var(--primary)] text-white shadow-[0_8px_28px_rgba(var(--primary-rgb),0.4)] transition-shadow hover:shadow-[0_12px_34px_rgba(var(--primary-rgb),0.55)] sm:right-4 sm:h-12 sm:w-12 lg:bottom-6"
        >
          <ArrowUp className="scroll-top-arrow h-4 w-4 sm:h-5 sm:w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
