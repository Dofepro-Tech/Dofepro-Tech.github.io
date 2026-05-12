import { cn } from '@/src/lib/utils';
import logoUrl from '@/src/assets/biblia-nj-logo-ui.png';

interface BrandSealProps {
  className?: string;
  showWordmark?: boolean;
}

export function BrandSeal({ className, showWordmark = true }: BrandSealProps) {
  return (
    <div className={cn('relative aspect-square', className)}>
      <img
        src={logoUrl}
        alt="Biblia DJ"
        loading="lazy"
        decoding="async"
        className={cn('h-full w-full object-contain', !showWordmark && 'scale-[0.98]')}
      />
    </div>
  );
}
