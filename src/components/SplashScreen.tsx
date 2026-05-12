import logoUrl from '@/src/assets/biblia-nj-logo-splash.png';
import { motion } from 'motion/react';

export function SplashScreen() {
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
          className="flex items-center justify-center"
        >
          <div className="relative w-[56vw] max-w-[248px] min-w-[148px] sm:max-w-[300px]">
            <div className="absolute inset-x-4 bottom-4 h-8 rounded-full bg-[#08163a]/35 blur-2xl" />
            <img src={logoUrl} alt="Bíblia DJ" className="relative h-auto w-full drop-shadow-[0_16px_30px_rgba(0,0,0,0.28)]" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

