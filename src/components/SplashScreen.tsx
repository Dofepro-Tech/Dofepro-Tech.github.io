import logoUrl from '@/src/assets/biblia-nj-logo-splash.png';
import { motion } from 'motion/react';

export function SplashScreen({ isReady = false }: { isReady?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
      className="fixed inset-0 z-[200] overflow-hidden bg-[#0b1f4f]"
    >
      <div className="relative flex h-full items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center gap-9"
        >
          <div className="splash-logo-orbit relative aspect-square w-[58vw] min-w-[160px] max-w-[280px] sm:max-w-[320px]">
            <div className="absolute inset-x-4 bottom-4 h-8 rounded-full bg-[#08163a]/35 blur-2xl" />
            <div className="splash-logo-frame absolute inset-[3%] overflow-hidden rounded-[28%] border border-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.36)]">
              <img src={logoUrl} alt="Biblia DJ" className="h-full w-full object-cover" />
            </div>
            <span className="brand-seal-orbit splash-brand-orbit" aria-hidden="true" />
          </div>
          <div className="w-[min(62vw,240px)]" role="progressbar" aria-label="Cargando Biblia DJ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={isReady ? 100 : 78}>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15 shadow-inner">
              <motion.div
                initial={{ width: '8%' }}
                animate={{ width: isReady ? '100%' : '78%' }}
                transition={{ duration: isReady ? 0.35 : 2.8, ease: 'easeOut' }}
                className="splash-progress-fill h-full rounded-full"
              />
            </div>
          </div>
          <div className="max-w-xs text-center">
            <p className="font-serif text-sm italic leading-relaxed text-white/85">Haciéndolo de corazón, como para el Señor.</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/60">Colosenses 3:23</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}