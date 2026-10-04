import { ArrowLeft, House } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PanelNavButtonsProps {
  onBack?: () => void;
  onHome?: () => void;
  backLabel: string;
  homeLabel: string;
  className?: string;
}

export function PanelNavButtons({ onBack, onHome, backLabel, homeLabel, className }: PanelNavButtonsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-1 sm:gap-2', className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title={backLabel}
          aria-label={backLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-olive/10 bg-paper-light text-olive transition-all hover:bg-olive/10 sm:h-10 sm:w-10"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      )}
      {onHome && (
        <button
          type="button"
          onClick={onHome}
          title={homeLabel}
          aria-label={homeLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-olive/10 bg-paper-light text-olive transition-all hover:bg-olive/10 sm:h-10 sm:w-10"
        >
          <House className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      )}
    </div>
  );
}
