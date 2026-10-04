import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Gamepad2, HelpCircle, Info, Share2, Sparkles, X, Flame, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export function HelpGuideModal({ isOpen, onClose, isDarkMode }: HelpGuideModalProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

  const content = currentLanguage.startsWith('en')
    ? {
        title: 'User Guide',
        subtitle: 'Learn how to get the most out of Biblia DJ',
        sections: [
          {
            icon: <BookOpen className="h-5 w-5 text-blue-400" />,
            title: 'Bible Reader',
            description: 'Access all the books of the Bible. You can adjust the font size, accent colors, and listen to the text in high quality.'
          },
          {
            icon: <Sparkles className="h-5 w-5 text-purple-400" />,
            title: 'AI Biblical Study',
            description: 'Use the power of AI to explain verses, get historical context, or ask specific questions about any passage.'
          },
          {
            icon: <Gamepad2 className="h-5 w-5 text-green-400" />,
            title: 'Christian Games',
            description: 'Strengthen your biblical knowledge while having fun with our collection of interactive games.'
          },
          {
            icon: <Flame className="h-5 w-5 text-orange-400" />,
            title: 'Daily Challenges',
            description: 'Keep a constant rhythm with the verse of the day, reflections, and track your reading streak.'
          },
          {
            icon: <Share2 className="h-5 w-5 text-pink-400" />,
            title: 'Smart Sharing',
            description: 'Share verses as beautiful images or share the entire app (APK) with your friends even without internet.'
          }
        ],
        footer: 'Biblia DJ is a project dedicated to bringing the Word of God through technology. Thank you for using our app!'
      }
    : {
        title: 'Guía de Usuario',
        subtitle: 'Aprende a sacar el máximo provecho de Biblia DJ',
        sections: [
          {
            icon: <BookOpen className="h-5 w-5 text-[#4fa8ff]" />,
            title: 'Lector de la Biblia',
            description: 'Accede a todos los libros de la Biblia. Puedes ajustar el tamaño de fuente, colores de acento y escuchar el texto en alta calidad.'
          },
          {
            icon: <Sparkles className="h-5 w-5 text-[#a78bfa]" />,
            title: 'Estudio Bíblico con IA',
            description: 'Usa el poder de la IA para explicar versículos, obtener contexto histórico o hacer preguntas específicas sobre cualquier pasaje.'
          },
          {
            icon: <Gamepad2 className="h-5 w-5 text-[#4ade80]" />,
            title: 'Juegos Cristianos',
            description: 'Refuerza tu conocimiento bíblico mientras te diviertes con nuestra colección de juegos interactivos.'
          },
          {
            icon: <Flame className="h-5 w-5 text-[#fb923c]" />,
            title: 'Desafíos Diarios',
            description: 'Mantén un ritmo constante con el versículo del día, reflexiones y haz seguimiento a tu racha de lectura.'
          },
          {
            icon: <Share2 className="h-5 w-5 text-[#f472b6]" />,
            title: 'Compartir Inteligente',
            description: 'Comparte versículos como hermosas imágenes o comparte la app completa (APK) con tus amigos incluso sin internet.'
          }
        ],
        footer: 'Biblia DJ es un proyecto dedicado a llevar la Palabra de Dios a través de la tecnología. ¡Gracias por usarnos!'
      };

  const modalSurface = isDarkMode
    ? 'bg-[#07162b] text-white border-white/10'
    : 'bg-white text-[#102542] border-[#cfe0f2]';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[32px] border shadow-2xl flex flex-col",
              modalSurface
            )}
          >
            <div className="flex items-center justify-between border-b border-white/5 p-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/20 text-[var(--primary)]">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif">{content.title}</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest">{content.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              <div className="grid gap-4 sm:grid-cols-1">
                {content.sections.map((section, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-4 p-5 rounded-[24px] border transition-all",
                      isDarkMode ? "bg-white/[0.03] border-white/5" : "bg-[#f8fbff] border-[#d9e7f5]"
                    )}
                  >
                    <div className="shrink-0 mt-1">{section.icon}</div>
                    <div>
                      <h3 className="font-bold mb-1">{section.title}</h3>
                      <p className="text-sm opacity-70 leading-relaxed text-pretty">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={cn(
                "p-5 rounded-[24px] border-t border-dashed",
                isDarkMode ? "border-white/10" : "border-black/5"
              )}>
                <p className="text-xs italic text-center opacity-40 leading-relaxed">
                  {content.footer}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-black/5 shrink-0">
              <button
                onClick={onClose}
                className="w-full py-4 rounded-full bg-[var(--primary)] text-white font-bold uppercase tracking-widest text-xs hover:bg-[var(--primary-hover)] transition-all"
              >
                {currentLanguage.startsWith('en') ? 'Got it!' : '¡Entendido!'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
