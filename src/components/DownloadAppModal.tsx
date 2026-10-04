import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Smartphone, X } from 'lucide-react';
import { getAppApkUrl } from '@/src/lib/share';
import { trackEvent } from '@/src/lib/analytics';
import { useTranslation } from 'react-i18next';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export function DownloadAppModal({ isOpen, onClose, isDarkMode }: DownloadAppModalProps) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const isEnglish = (i18n.resolvedLanguage || i18n.language).toLowerCase().startsWith('en');
  const panelTone = isDarkMode ? 'border-white/10 bg-[#0b1a30] text-white' : 'border-slate-200 bg-white text-[#102542]';
  const supportingTone = isDarkMode ? 'text-white/65' : 'text-slate-600';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[150] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-[#020817]/75 backdrop-blur-sm" onClick={onClose} aria-label={isEnglish ? 'Close dialog' : 'Cerrar ventana'} />
          <motion.section role="dialog" aria-modal="true" aria-labelledby="download-app-title" className={`relative z-10 w-full max-w-md rounded-3xl border p-6 shadow-2xl ${panelTone}`} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
            <button type="button" onClick={onClose} className={`absolute right-4 top-4 rounded-xl p-2 transition-colors ${supportingTone} hover:bg-black/5`} aria-label={isEnglish ? 'Close' : 'Cerrar'}><X className="h-5 w-5" /></button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/12 text-[var(--primary)]"><Smartphone className="h-6 w-6" /></div>
            <h2 id="download-app-title" className="pr-8 text-xl font-bold">{isEnglish ? 'Get Biblia DJ' : 'Descarga Biblia DJ'}</h2>
            <p className={`mt-2 text-sm leading-6 ${supportingTone}`}>{isEnglish ? 'Install the Android app using the official APK.' : 'Instala la aplicación Android con el APK oficial.'}</p>
            <p role="note" className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${isDarkMode ? 'border-amber-300/20 bg-amber-300/10 text-amber-100' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
              {isEnglish
                ? 'Android may show a security warning because this app is not available on the Play Store yet. If you downloaded the APK from the official Biblia DJ link, you can choose “Download and install anyway” to continue. Thank you for your support. God bless you.'
                : 'Al descargar e instalar esta app, puede aparecer una advertencia de seguridad porque aún no está disponible en Play Store. Si descargaste el APK desde el enlace oficial de Biblia DJ, puedes elegir “Descargar e instalar de todos modos”. Muchas gracias por su apoyo. ¡Dios les bendiga!'}
            </p>
            <a href={getAppApkUrl()} target="_blank" rel="noreferrer" onClick={() => { void trackEvent({ name: 'apk_download_click' }); }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white transition hover:brightness-110">
              <Download className="h-5 w-5" />{isEnglish ? 'Download Android APK' : 'Descargar APK para Android'}
            </a>
            <div className={`mt-5 rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="text-sm font-bold">iPhone y iPad</h3>
              <p className={`mt-1 text-sm leading-6 ${supportingTone}`}>Mientras la app no esté en App Store, usa la versión web desde este mismo enlace. El contenido compartido seguirá abriendo correctamente la página pública.</p>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
