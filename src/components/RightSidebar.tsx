import React, { useEffect, useRef } from 'react';
import { Bookmark } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { PanelNavButtons } from '@/src/components/PanelNavButtons';
import { X, Heart, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  onSelectBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (id: string) => void;
  onPlayFavorite?: (bookmark: Bookmark) => void;
  onGoHome?: () => void;
}

export function RightSidebar({ 
  isOpen, 
  onClose,
  bookmarks,
  onSelectBookmark,
  onRemoveBookmark,
  onPlayFavorite,
  onGoHome,
}: RightSidebarProps) {
  const { t, i18n } = useTranslation();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

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

      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/50"
          />
        )}
      </AnimatePresence>

      {/* Sidebar surface */}
      <motion.div
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 right-0 z-[100] flex w-80 flex-col overflow-hidden border-l border-olive/20 bg-paper shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-olive/10 flex items-center justify-between bg-paper shrink-0">
          <div className="flex items-center gap-2 text-gold">
            <Heart className="w-5 h-5 fill-gold" />
            <h2 className="font-serif text-xl font-bold tracking-wider uppercase">{t('menu.favorites')}</h2>
          </div>
          <PanelNavButtons
            onBack={onClose}
            onHome={onGoHome ? () => { onClose(); onGoHome(); } : undefined}
            backLabel={t('app.back')}
            homeLabel={t('app.home')}
          />
        </div>

        {/* Favorites List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-24">
          <AnimatePresence mode="popLayout">
            {bookmarks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 px-4 italic text-ink-light/40 font-serif"
              >
                {t('verses.no_bookmarks')}
              </motion.div>
            ) : (
              bookmarks.map(b => (
                <motion.div 
                  key={b.id} 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group relative"
                >
                  <button
                    onClick={() => { onSelectBookmark(b); onClose(); }}
                    className="w-full text-left p-4 rounded-2xl bg-paper-light border border-olive/10 hover:border-gold/30 transition-all space-y-1 relative pr-12 group-hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                      <span className="font-serif font-bold text-ink truncate block flex-1">{b.label}</span>
                    </div>
                    <p className="font-sans text-[10px] text-olive/40 uppercase tracking-widest">
                      {new Date(b.createdAt).toLocaleDateString(currentLanguage)}
                    </p>
                  </button>
                  
                  <div className="absolute top-1/2 -translate-y-1/2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onPlayFavorite?.(b); }}
                      className="p-1.5 text-gold hover:bg-gold/10 rounded-full transition-colors"
                      title={t('audio.play_verse')}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveBookmark(b.id); }}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                      title={t('common.remove')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="p-6 border-t border-olive/10 bg-paper-light text-center shrink-0">
          <p className="text-[10px] text-olive/30 font-sans tracking-wide">
            © 2026 Dofepro-Tech <br/>
            Derechos Reservados
          </p>
        </div>
      </motion.div>
    </>
  );
}
