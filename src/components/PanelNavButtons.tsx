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
    <div className={cn('flex items-center gap-2', className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title={backLabel}
          aria-label={backLabel}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-olive/10 bg-paper-light text-olive transition-all hover:bg-olive/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      {onHome && (
        <button
          type="button"
          onClick={onHome}
          title={homeLabel}
          aria-label={homeLabel}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-olive/10 bg-paper-light text-olive transition-all hover:bg-olive/10"
        >
          <House className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
