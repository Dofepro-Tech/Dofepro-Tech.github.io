import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Info, Shield, FileText, Target, Eye, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';

export type AboutLegalType = 'about' | 'mission' | 'vision' | 'values' | 'terms' | 'privacy';

interface AboutLegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: AboutLegalType;
  isDarkMode: boolean;
}

export function AboutLegalModal({ isOpen, onClose, type, isDarkMode }: AboutLegalModalProps) {
  const { t } = useTranslation();

  const getIcon = () => {
    switch (type) {
      case 'about': return <Info className="h-6 w-6" />;
      case 'mission': return <Target className="h-6 w-6" />;
      case 'vision': return <Eye className="h-6 w-6" />;
      case 'values': return <Star className="h-6 w-6" />;
      case 'terms': return <FileText className="h-6 w-6" />;
      case 'privacy': return <Shield className="h-6 w-6" />;
      default: return <Info className="h-6 w-6" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'about': return t('menu.about');
      case 'mission': return t('menu.mission');
      case 'vision': return t('menu.vision');
      case 'values': return t('menu.values');
      case 'terms': return t('menu.terms');
      case 'privacy': return t('menu.privacy');
      default: return '';
    }
  };

  const getContent = () => {
    switch (type) {
      case 'about':
        return (
          <div className="space-y-4 text-left leading-relaxed">
            <p><strong>Biblia DJ</strong> es una plataforma innovadora diseñada para transformar la experiencia de lectura y estudio de las Sagradas Escrituras a través de la tecnología moderna.</p>
            <p>Nuestra aplicación combina el texto sagrado con herramientas de <strong>Inteligencia Artificial</strong>, juegos interactivos y recursos multimedia para que el mensaje de Dios sea más accesible, comprensible y cercano para la generación actual.</p>
            <p>Desarrollado por <strong>Dofepro-Tech</strong>, este proyecto nace del deseo de poner la mejor tecnología al servicio del Reino de Dios, permitiendo que cada usuario fortalezca su fe de manera dinámica y profunda.</p>
          </div>
        );
      case 'mission': return <p className="leading-relaxed">{t('about.mission_body')}</p>;
      case 'vision': return <p className="leading-relaxed">{t('about.vision_body')}</p>;
      case 'values':
        const values = t('about.values_items', { returnObjects: true }) as Array<{ title: string; description: string }>;
        return (
          <div className="space-y-4 text-left">
            <p className="mb-4">{t('about.values_body')}</p>
            {Array.isArray(values) && values.map((v, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <h4 className="font-bold text-[#f6c969] mb-1">{v.title}</h4>
                <p className="text-sm opacity-70">{v.description}</p>
              </div>
            ))}
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-4 text-left text-sm opacity-80 leading-relaxed">
            <p>Al usar Biblia DJ, usted acepta cumplir con nuestros términos de servicio. Esta aplicación se proporciona para uso personal y espiritual.</p>
            <p><strong>Uso de Contenido:</strong> El contenido bíblico es de dominio público o bajo licencia. Las funciones de IA son para fines educativos y de reflexión.</p>
            <p><strong>Responsabilidad:</strong> Dofepro-Tech no se hace responsable por el uso indebido de la información generada por la IA.</p>
            <p><strong>Actualizaciones:</strong> Nos reservamos el derecho de modificar la app y estos términos para mejorar la experiencia del usuario.</p>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4 text-left text-sm opacity-80 leading-relaxed">
            <p>Su privacidad es fundamental para nosotros. Biblia DJ ha sido diseñada para ser lo más privada posible.</p>
            <p><strong>Datos Locales:</strong> Sus favoritos, notas y progreso de lectura se guardan localmente en su dispositivo y no se envían a nuestros servidores.</p>
            <p><strong>Uso de IA:</strong> Al consultar a la IA, solo se envía el texto del versículo y su pregunta de forma anónima al proveedor de IA para procesar la respuesta.</p>
            <p><strong>Sin Rastreo:</strong> No vendemos sus datos ni rastreamos su comportamiento personal fuera de las estadísticas básicas de racha dentro de la app.</p>
          </div>
        );
      default: return null;
    }
  };

  const modalSurface = isDarkMode
    ? 'bg-[#07162b] text-white border-white/10'
    : 'bg-white text-[#102542] border-[#cfe0f2]';

  const accentColor = type === 'mission' ? 'text-blue-400 bg-blue-400/20' :
                     type === 'vision' ? 'text-purple-400 bg-purple-400/20' :
                     type === 'values' ? 'text-[#f6c969] bg-[#f6c969]/20' :
                     'text-slate-400 bg-slate-400/20';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-[32px] border shadow-2xl flex flex-col",
              modalSurface
            )}
          >
            <div className="flex items-center justify-between border-b border-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", accentColor)}>
                  {getIcon()}
                </div>
                <h2 className="text-xl font-bold font-serif">{getTitle()}</h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 text-center no-scrollbar">
              {getContent()}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/5">
              <button
                onClick={onClose}
                className="w-full py-4 rounded-full bg-[var(--primary)] text-white font-bold uppercase tracking-widest text-xs hover:bg-[var(--primary-hover)] transition-all"
              >
                {t('app.ready')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
