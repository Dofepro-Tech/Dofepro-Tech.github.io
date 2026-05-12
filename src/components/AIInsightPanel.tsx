import React, { useState, useEffect, useRef } from 'react';
import { Verse, ChapterData, ChatMessage, AiRuntimeConfig } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Bird, BookOpen, Heart, MessageCircle, Send, Loader2, Share2, Check, Sparkles, Copy, Cpu } from 'lucide-react';
import { PanelNavButtons } from '@/src/components/PanelNavButtons';
import { canUseAiFeatures, chatAboutVerse, explainVerse, getAiRuntimeConfig, getAiUnavailableMessage, getStoredAiModelOverride, setStoredAiModelOverride } from '@/src/services/aiService';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { normalizeAppLanguage } from '@/src/lib/language';

interface AIInsightPanelProps {
  verse: Verse | null;
  chapter: ChapterData | null;
  onClose: () => void;
  onGoHome?: () => void;
}

export function AIInsightPanel({ verse, chapter, onClose, onGoHome }: AIInsightPanelProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const aiAvailable = canUseAiFeatures();
  const aiUnavailableMessage = getAiUnavailableMessage(currentLanguage);
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  const [isCopied, setIsCopied] = useState(false);
  const [insightType, setInsightType] = useState<'explica' | 'contexto' | 'aplicacion' | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState<AiRuntimeConfig | null>(null);
  const [selectedAiModel, setSelectedAiModel] = useState('');
  const showModelSelector = import.meta.env.DEV || import.meta.env.VITE_SHOW_MODEL_SELECTOR === 'true';
  
  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset state when verse changes
  useEffect(() => {
    setInsightType(null);
    setContent('');
    setChatHistory([]);
    setActiveTab('insights');
  }, [verse?.id]);

  useEffect(() => {
    if (chatEndRef.current && activeTab === 'chat') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  useEffect(() => {
    if (!showModelSelector || !aiAvailable) {
      return;
    }

    getAiRuntimeConfig(currentLanguage)
      .then((config) => {
        setRuntimeConfig(config);
        setSelectedAiModel(getStoredAiModelOverride());
      })
      .catch((error) => {
        console.error('Could not load AI runtime config:', error);
      });
  }, [aiAvailable, currentLanguage, showModelSelector]);

  if (!verse || !chapter) return null;

  const handleInsight = async (type: 'explica' | 'contexto' | 'aplicacion') => {
    if (!aiAvailable) {
      setInsightType(type);
      setContent(aiUnavailableMessage);
      return;
    }

    setInsightType(type);
    setLoading(true);
    setContent('');
    try {
      const resp = await explainVerse(chapter.name, chapter.chapter, verse.number, verse.verse, type, currentLanguage);
      setContent(resp);
    } catch (e) {
      console.error(e);
      setContent(e instanceof Error ? e.message : t('ai.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || loading) return;

    if (!aiAvailable) {
      setChatHistory((prev) => [...prev, { role: 'model', content: aiUnavailableMessage }]);
      setChatInput('');
      return;
    }
    
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await chatAboutVerse(chapter.name, chapter.chapter, verse.verse, chatHistory, userMsg, currentLanguage);
      setChatHistory(prev => [...prev, { role: 'model', content: response }]);
    } catch(e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', content: e instanceof Error ? e.message : t('ai.chat_error') }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  }

  const handleShare = async () => {
    const typeLabel = insightType === 'explica' ? t('ai.explain') : insightType === 'contexto' ? t('ai.context') : t('ai.application');
    const shareText = `"${verse.verse}" - ${chapter.name} ${chapter.chapter}:${verse.number}${content ? `\n\n${t('ai.share_label')} (${typeLabel}):\n${content}` : ''}`;
    
    // Check if running in a context where navigator.share is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('app.title')} - ${chapter.name} ${chapter.chapter}:${verse.number}`,
          text: shareText.substring(0, 1000), // Some platforms have limits
        });
        return;
      } catch (err) {
        console.log('Share failed or cancelled', err);
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleCopyVerse = () => {
    if (!verse || !chapter) return;
    const textToCopy = `"${verse.verse}"\n${chapter.name} ${chapter.chapter}:${verse.number}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleModelChange = (nextModel: string) => {
    setSelectedAiModel(nextModel);
    setStoredAiModelOverride(nextModel);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0.5 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 w-full md:w-[400px] lg:w-[450px] bg-paper border-l border-olive/20 z-40 shadow-2xl flex flex-col pt-safe-top transition-colors duration-300"
    >
      {/* Header */}
      <div className="p-4 border-b border-olive/10 shrink-0 bg-paper flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-olive rounded-lg shadow-sm">
            <Bird className="w-4 h-4 text-paper" />
          </div>
          <h2 className="font-serif text-xl font-bold tracking-wider text-ink uppercase">{t('ai.insight')}</h2>
        </div>
        <PanelNavButtons
          onBack={onClose}
          onHome={onGoHome ? () => { onClose(); onGoHome(); } : undefined}
          backLabel={t('app.back')}
          homeLabel={t('app.home')}
        />
      </div>

      {/* Share Toast */}
      <AnimatePresence>
        {showCopied && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-olive text-paper px-4 py-2 rounded-full text-xs font-sans font-bold flex items-center gap-2 shadow-lg z-50"
          >
            <Check className="w-3 h-3" /> {t('ai.copied')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Verse Context */}
      <div className="p-6 bg-paper-light shrink-0 border-b border-olive/10 shrink-0 relative group">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-olive">
            <BookOpen className="w-4 h-4" />
            <span className="font-sans text-xs uppercase tracking-widest font-bold">
              {chapter.name} {chapter.chapter}:{verse.number}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleCopyVerse}
              className="p-2 text-olive hover:bg-olive/5 rounded-full transition-all flex items-center gap-1.5"
              title={t('ai.copy_verse')}
            >
              {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="text-[10px] uppercase font-bold tracking-tighter">
                {isCopied ? t('ai.copied') : t('ai.copy')}
              </span>
            </button>
            <button 
              onClick={handleShare}
              className="p-2 text-olive hover:bg-olive/5 rounded-full transition-all flex items-center gap-1.5"
              title={t('ai.share')}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-tighter">{t('ai.share')}</span>
            </button>
          </div>
        </div>
        <p className="font-serif text-lg italic text-ink leading-relaxed border-l-2 border-gold pl-4">
          "{verse.verse}"
        </p>
      </div>

      {showModelSelector && aiAvailable && runtimeConfig?.overrideAllowed && (
        <div className="px-4 py-4 border-b border-olive/10 bg-paper-light/60">
          <div className="rounded-2xl border border-blue-600/10 bg-blue-600/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-sans text-[10px] uppercase tracking-[0.24em] font-bold text-blue-700">{t('ai.model_selector')}</p>
                    <h3 className="font-serif text-lg font-bold text-ink">{t('ai.model_selector_title')}</h3>
                  </div>
                  <span className="rounded-full bg-paper px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-olive">
                    {runtimeConfig.provider}
                  </span>
                </div>

                <p className="mt-2 font-sans text-xs leading-relaxed text-ink-light">{t('ai.model_selector_body')}</p>

                <label className="mt-3 block">
                  <span className="mb-2 block font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-olive/55">
                    {t('ai.model_selector_current', { model: selectedAiModel || runtimeConfig.currentModel })}
                  </span>
                  <select
                    value={selectedAiModel}
                    onChange={(event) => handleModelChange(event.target.value)}
                    className="w-full rounded-2xl border border-olive/15 bg-paper px-4 py-3 font-sans text-sm text-ink outline-none transition-colors focus:border-gold"
                  >
                    <option value="">{t('ai.model_selector_default', { model: runtimeConfig.currentModel })}</option>
                    {runtimeConfig.availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label} - {model.recommendedFor}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedAiModel && (
                  <p className="mt-2 font-sans text-xs text-ink-light">
                    {runtimeConfig.availableModels.find((model) => model.id === selectedAiModel)?.description || selectedAiModel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-4 pt-4 border-b border-olive/10 shrink-0 gap-4">
        <button 
          onClick={() => setActiveTab('insights')}
          className={cn(
            "pb-2 font-sans text-xs uppercase tracking-widest font-bold transition-all border-b-2",
            activeTab === 'insights' ? "border-gold text-ink" : "border-transparent text-olive/60 hover:text-olive"
          )}
        >
          {t('ai.insights')}
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={cn(
            "pb-2 font-sans text-xs uppercase tracking-widest font-bold transition-all border-b-2 flex items-center gap-1",
            activeTab === 'chat' ? "border-gold text-ink" : "border-transparent text-olive/60 hover:text-olive"
          )}
        >
          <MessageCircle className="w-3 h-3" /> {t('ai.ask')}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-paper relative no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'insights' ? (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 pb-24"
            >
              <div className="flex flex-col gap-3 mb-8">
                {!aiAvailable && (
                  <div className="rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 font-sans text-sm leading-relaxed text-amber-900">
                    {aiUnavailableMessage}
                  </div>
                )}
                <InsightButton 
                  icon={<Bird className="w-4 h-4" />} 
                  title={t('ai.explain_title')} 
                  desc={t('ai.explain_desc')}
                  active={insightType === 'explica'}
                  disabled={!aiAvailable}
                  onClick={() => handleInsight('explica')}
                />
                <InsightButton 
                  icon={<BookOpen className="w-4 h-4" />} 
                  title={t('ai.context_title')} 
                  desc={t('ai.context_desc')}
                  active={insightType === 'contexto'}
                  disabled={!aiAvailable}
                  onClick={() => handleInsight('contexto')}
                />
                <InsightButton 
                  icon={<Heart className="w-4 h-4" />} 
                  title={t('ai.application_title')} 
                  desc={t('ai.application_desc')}
                  active={insightType === 'aplicacion'}
                  disabled={!aiAvailable}
                  onClick={() => handleInsight('aplicacion')}
                />
              </div>

              {loading && insightType && (
                <div className="flex items-center justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ ease: "linear", duration: 2, repeat: Infinity }}>
                    <Loader2 className="w-6 h-6 text-gold" />
                  </motion.div>
                </div>
              )}

              {!loading && content && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-paper-light p-6 rounded-2xl shadow-sm border border-olive/10 text-ink font-sans text-sm leading-relaxed"
                >
                  <div className="markdown-body custom-markdown">
                    <Markdown>{content}</Markdown>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="text-center bg-paper-light/50 p-6 rounded-2xl border border-olive/10 mx-2 mt-4">
                    <MessageCircle className="w-8 h-8 mx-auto text-gold mb-3" />
                    <p className="font-sans text-ink-light text-sm">
                      {t('ai.empty_chat')}
                    </p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl p-4 font-sans text-sm",
                      msg.role === 'user' ? "bg-olive text-paper shadow-md rounded-br-sm" : "bg-paper-light text-ink shadow-sm border border-olive/10 rounded-bl-sm markdown-body custom-markdown"
                    )}>
                      {msg.role === 'user' ? msg.content : <Markdown>{msg.content}</Markdown>}
                    </div>
                  </div>
                ))}
                {loading && (
                   <div className="flex justify-start">
                     <div className="bg-paper-light p-3 rounded-2xl rounded-bl-sm border border-olive/10 flex gap-2 items-center">
                        <motion.div className="w-2 h-2 rounded-full bg-gold" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                        <motion.div className="w-2 h-2 rounded-full bg-gold" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="w-2 h-2 rounded-full bg-gold" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                     </div>
                   </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-paper-light border-t border-olive/10 shrink-0">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('ai.chat_placeholder')}
                    disabled={!aiAvailable}
                    className="w-full bg-paper border border-olive/20 rounded-full py-3 pl-5 pr-12 text-sm focus:outline-none focus:border-olive transition-colors font-sans text-ink"
                  />
                  <button 
                    onClick={handleChat}
                    disabled={!aiAvailable || !chatInput.trim() || loading}
                    className="absolute right-2 p-2 bg-olive text-paper rounded-full disabled:opacity-50 transition-opacity"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}

function InsightButton({ icon, title, desc, active, disabled, onClick }: { icon: React.ReactNode, title: string, desc: string, active: boolean, disabled?: boolean, onClick: () => void }) {
  return (
    <button 
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col text-left p-4 rounded-2xl transition-all border disabled:cursor-not-allowed disabled:opacity-60",
        active 
          ? "bg-paper-light border-gold shadow-md ring-1 ring-gold" 
          : "bg-paper-light/50 border-olive/10 hover:bg-paper-light hover:border-olive/30 shadow-sm"
      )}
    >
      <div className="flex items-center gap-2 mb-1 text-ink">
        <span className={cn(active ? "text-gold" : "text-olive")}>{icon}</span>
        <span className="font-sans font-bold text-sm tracking-wide">{title}</span>
      </div>
      <span className="font-sans text-xs text-olive/70 pl-6">{desc}</span>
    </button>
  );
}
