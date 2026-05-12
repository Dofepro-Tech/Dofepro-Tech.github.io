import { MessageCircle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BrandSeal } from '@/src/components/BrandSeal';
import { cn } from '@/src/lib/utils';

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
}

const SUPPORT_EMAIL = 'dofeprotech@gmail.com';
const SUPPORT_WHATSAPP_URL = 'https://wa.me/18492618830?text=Hola%2C%20quiero%20informacion%20sobre%20Biblia%20DJ.';

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
            onClick={item.onClick}
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
                  ? 'bg-[#165bb8] text-white shadow-[0_10px_22px_rgba(22,91,184,0.35)]'
                  : 'text-inherit'
              )}
            >
              {item.icon}
            </span>
            <span className="max-w-full truncate text-center font-sans text-[9px] font-medium leading-none text-inherit sm:text-[10px]">{item.label}</span>
            {item.active ? <span className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#f0c15c] sm:w-8" /> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function MobilePageFooter({ className }: MobilePageFooterProps) {
  return (
    <footer className={cn('w-full pt-5', className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-white/10 px-2 py-3 text-center font-sans text-[10px] font-medium leading-4 text-white/68 lg:text-[11px]">
        <BrandSeal className="h-4 w-4 shrink-0 opacity-85" showWordmark={false} />
        <span>© 2026 Dofepro-Tech</span>
        <span className="text-white/30">·</span>
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp 8492618830"
          title="WhatsApp 8492618830"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-inherit transition-colors hover:text-white"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </a>
        <span className="text-white/30">·</span>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="break-all text-inherit underline-offset-2 transition-colors hover:text-white hover:underline"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </footer>
  );
}