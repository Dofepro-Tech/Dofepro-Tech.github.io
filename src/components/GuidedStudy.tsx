import React, { useState, useEffect } from 'react';
import { Book, StudySession, StudyStep } from '@/src/types';
import { generateStudyStep } from '@/src/services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, GraduationCap, ChevronRight, ChevronLeft, Loader2, PlayCircle, Library, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { PanelNavButtons } from '@/src/components/PanelNavButtons';
import { useTranslation } from 'react-i18next';
import { getSpeechLanguage } from '@/src/lib/language';
import { canUseSpeechSynthesis, cancelSpeech, speakText } from '@/src/lib/speech';

interface GuidedStudyProps {
  books: Book[];
  onClose: () => void;
  onNavigate: (bookAbrev: string, chapter: number) => void;
  onGoHome?: () => void;
  voiceURI?: string;
}

export function GuidedStudy({ books, onClose, onNavigate, onGoHome, voiceURI }: GuidedStudyProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const [step, setStep] = useState<'setup' | 'studying'>('setup');
  const [studyType, setStudyType] = useState<'book' | 'theme'>('book');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [theme, setTheme] = useState('');
  const [session, setSession] = useState<StudySession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSpeechAvailable = canUseSpeechSynthesis();

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const stopAudio = () => {
    cancelSpeech();
    setIsAudioPlaying(false);
  };

  const playContent = (text: string) => {
    if (!isSpeechAvailable) {
      return;
    }

    if (isAudioPlaying) {
      stopAudio();
      return;
    }

    stopAudio();
    const cleanText = text.replace(/[*#_\[\]()]/g, '');
    const didSpeak = speakText({
      text: cleanText,
      lang: getSpeechLanguage(currentLanguage),
      voiceURI,
      onEnd: () => setIsAudioPlaying(false),
      onError: () => setIsAudioPlaying(false),
    });

    if (!didSpeak) {
      return;
    }

    setIsAudioPlaying(true);
  };

  const startStudy = async () => {
    if (studyType === 'book' && !selectedBook) return;
    if (studyType === 'theme' && !theme.trim()) return;

    const target = studyType === 'book' ? selectedBook!.names[0] : theme.trim();
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const firstStep = await generateStudyStep(studyType, target, [], currentLanguage);
      setSession({
        id: crypto.randomUUID(),
        type: studyType,
        target,
        currentStep: 0,
        steps: [firstStep]
      });
      setStep('studying');
    } catch (error) {
      console.error('Error starting guided study:', error);
      setErrorMessage(error instanceof Error ? error.message : t('study.error_start'));
      setStep('setup');
    } finally {
      setIsGenerating(false);
    }
  };

  const nextStep = async () => {
    if (!session) return;
    
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const next = await generateStudyStep(session.type, session.target, session.steps, currentLanguage);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentStep: prev.currentStep + 1,
          steps: [...prev.steps, next]
        };
      });
    } catch (error) {
      console.error('Error generating next study step:', error);
      setErrorMessage(error instanceof Error ? error.message : t('study.error_next'));
    } finally {
      setIsGenerating(false);
    }
  };

  const currentStudyStep = session?.steps[session.currentStep];
  const handleBack = () => {
    if (step === 'studying') {
      stopAudio();
      setStep('setup');
      setSession(null);
      setIsGenerating(false);
      setErrorMessage(null);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-paper w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl border border-olive/20 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-olive/10 flex items-center justify-between shrink-0 bg-paper-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink leading-tight">{t('study.title')}</h2>
              <p className="font-sans text-[10px] uppercase tracking-widest text-olive/60 font-medium">{t('study.ai_powered')}</p>
            </div>
          </div>
          <PanelNavButtons
            onBack={handleBack}
            onHome={onGoHome ? () => { onClose(); onGoHome(); } : undefined}
            backLabel={t('app.back')}
            homeLabel={t('app.home')}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10">
          <AnimatePresence mode="wait">
            {step === 'setup' ? (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="max-w-xl mx-auto space-y-8"
              >
                <div className="text-center space-y-2">
                  <h3 className="font-serif text-3xl text-ink">{t('study.setup_title')}</h3>
                  <p className="font-sans text-sm text-ink-light italic">{t('study.setup_desc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setStudyType('book');
                      setErrorMessage(null);
                    }}
                    className={cn(
                      "p-6 rounded-3xl border-2 transition-all text-left space-y-4 group",
                      studyType === 'book' ? "border-gold bg-gold/5 shadow-inner" : "border-olive/10 hover:border-gold/30"
                    )}
                  >
                    <BookOpen className={cn("w-8 h-8", studyType === 'book' ? "text-gold" : "text-olive/40")} />
                    <div>
                      <h4 className="font-serif text-xl font-bold text-ink">{t('study.by_book')}</h4>
                      <p className="font-sans text-xs text-ink-light">{t('study.by_book_desc')}</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setStudyType('theme');
                      setErrorMessage(null);
                    }}
                    className={cn(
                      "p-6 rounded-3xl border-2 transition-all text-left space-y-4 group",
                      studyType === 'theme' ? "border-gold bg-gold/5 shadow-inner" : "border-olive/10 hover:border-gold/30"
                    )}
                  >
                    <Library className={cn("w-8 h-8", studyType === 'theme' ? "text-gold" : "text-olive/40")} />
                    <div>
                      <h4 className="font-serif text-xl font-bold text-ink">{t('study.by_theme')}</h4>
                      <p className="font-sans text-xs text-ink-light">{t('study.by_theme_desc')}</p>
                    </div>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {studyType === 'book' ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <label className="font-sans text-[10px] uppercase tracking-widest font-bold text-olive/60 px-1">{t('study.select_book')}</label>
                      <select 
                        className="w-full bg-paper-light border border-olive/10 rounded-2xl p-4 font-sans text-sm focus:outline-none focus:border-gold transition-colors text-ink"
                        onChange={(e) => {
                          setSelectedBook(books.find(b => b.abrev === e.target.value) || null);
                          setErrorMessage(null);
                        }}
                      >
                        <option value="">{t('study.select_placeholder')}</option>
                        {books.map(b => (
                          <option key={b.abrev} value={b.abrev}>{b.names[0]}</option>
                        ))}
                      </select>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <label className="font-sans text-[10px] uppercase tracking-widest font-bold text-olive/60 px-1">{t('study.theme_label')}</label>
                      <input 
                        type="text" 
                        placeholder={t('study.theme_placeholder')} 
                        value={theme}
                        onChange={(e) => {
                          setTheme(e.target.value);
                          setErrorMessage(null);
                        }}
                        className="w-full bg-paper-light border border-olive/10 rounded-2xl p-4 font-sans text-sm focus:outline-none focus:border-gold transition-colors text-ink"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {errorMessage && (
                  <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 font-sans text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <button 
                  onClick={startStudy}
                  disabled={isGenerating || (studyType === 'book' && !selectedBook) || (studyType === 'theme' && !theme.trim())}
                  className="w-full py-5 bg-gold text-white rounded-3xl font-sans font-bold uppercase tracking-widest shadow-xl hover:bg-gold/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                  {t('study.start_session')}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="studying"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col max-w-2xl mx-auto"
              >
                {isGenerating && !currentStudyStep ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                    <Loader2 className="w-12 h-12 text-gold animate-spin" />
                    <p className="font-serif text-xl italic text-ink-light px-8">{t('study.loading')}</p>
                  </div>
                ) : currentStudyStep ? (
                  <div className="space-y-8 pb-10">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <span className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-gold">{t('study.step')} {session!.currentStep + 1} {t('study.of')} {session!.target}</span>
                         <button 
                           onClick={() => playContent(currentStudyStep.content)}
                           className={cn(
                             "p-3 rounded-2xl border transition-all flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-widest",
                             isAudioPlaying ? "bg-gold text-white border-gold shadow-lg" : "bg-paper-light border-olive/10 text-olive hover:bg-gold/10"
                           )}
                         >
                           {isAudioPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                           {isAudioPlaying ? t('audio.stop') : t('audio.read')}
                         </button>
                       </div>
                       <h3 className="font-serif text-4xl font-bold text-ink leading-tight">{currentStudyStep.title}</h3>
                    </div>

                    <div className="prose prose-olive max-w-none font-serif text-lg leading-relaxed text-ink/80 custom-markdown bg-paper-light p-8 rounded-[2rem] border border-olive/5 shadow-sm">
                      <ReactMarkdown>{currentStudyStep.content}</ReactMarkdown>
                    </div>

                    {currentStudyStep.verseReference && (
                      <div className="bg-gold/5 border border-gold/10 p-6 rounded-3xl flex items-center justify-between group">
                        <div className="space-y-1">
                          <p className="font-sans text-[10px] uppercase tracking-widest font-bold text-gold">{t('ai.context')}</p>
                          <p className="font-serif text-xl font-bold text-ink">{currentStudyStep.verseReference.bookAbrev} {currentStudyStep.verseReference.chapter}:{currentStudyStep.verseReference.verseNumber}</p>
                        </div>
                        <button 
                          onClick={() => onNavigate(currentStudyStep.verseReference!.bookAbrev, currentStudyStep.verseReference!.chapter)}
                          className="px-4 py-2 bg-gold/10 text-gold rounded-full font-sans font-bold text-[10px] uppercase tracking-widest hover:bg-gold/20 transition-all flex items-center gap-2"
                        >
                          {t('study.go_to_text')} <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="bg-olive/5 p-8 rounded-[2rem] border-l-4 border-olive/30 space-y-4">
                      <p className="font-sans text-[10px] uppercase tracking-widest font-bold text-olive/60">{t('study.reflection')}</p>
                      <p className="font-serif text-xl italic text-ink leading-relaxed">"{currentStudyStep.prompt}"</p>
                    </div>

                    {errorMessage && (
                      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 font-sans text-sm text-red-700 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <span>{errorMessage}</span>
                        <button
                          onClick={nextStep}
                          className="px-4 py-2 rounded-full bg-red-100 text-red-700 font-bold uppercase tracking-widest text-[10px] hover:bg-red-200 transition-colors"
                        >
                          {t('study.try_again')}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4">
                      <button 
                        onClick={nextStep}
                        disabled={isGenerating}
                        className="flex-1 py-4 bg-olive text-white rounded-3xl font-sans font-bold uppercase tracking-widest shadow-lg hover:bg-olive/90 transition-all flex items-center justify-center gap-2"
                      >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                        {t('study.next_step')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
