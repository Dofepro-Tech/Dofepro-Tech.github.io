import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Copy, ExternalLink, MessageCircle, Send, Share2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url: string;
}

export function ShareSheet({ isOpen, onClose, title, text, url }: ShareSheetProps) {
  const { t } = useTranslation();
  const [didCopy, setDidCopy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDidCopy(false);
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const shareMessage = [title, text, url].filter(Boolean).join('\n');
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(shareMessage);
  const encodedText = encodeURIComponent([title, text].filter(Boolean).join('\n'));

  const handleNativeShare = async () => {
    if (!navigator.share) {
      return;
    }

    try {
      await navigator.share({ title, text, url });
      onClose();
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setDidCopy(true);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const networks = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedMessage}`,
      icon: <MessageCircle className="h-5 w-5" />,
      tone: 'border-[#25D366]/30 bg-[#25D366]/12 text-[#eafff2] hover:bg-[#25D366]/18',
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: <Send className="h-5 w-5" />,
      tone: 'border-[#229ED9]/30 bg-[#229ED9]/12 text-[#dff4ff] hover:bg-[#229ED9]/18',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <ExternalLink className="h-5 w-5" />,
      tone: 'border-[#1877F2]/30 bg-[#1877F2]/12 text-[#e7f1ff] hover:bg-[#1877F2]/18',
    },
    {
      id: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      icon: <Share2 className="h-5 w-5" />,
      tone: 'border-white/20 bg-white/8 text-white hover:bg-white/12',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[#020817]/70 p-4 backdrop-blur-sm sm:items-center"
        >
          <button type="button" className="absolute inset-0" onClick={onClose} aria-label={t('share_sheet.close')} />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border border-white/12 bg-[#07162b] text-white shadow-[0_30px_90px_rgba(0,0,0,0.38)]"
          >
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#87bfff]">{t('menu.share')}</p>
                  <h2 className="mt-2 font-serif text-2xl font-bold text-white">{t('share_sheet.title')}</h2>
                  <p className="mt-2 max-w-md font-sans text-sm leading-6 text-[#cfe2ff]">{t('share_sheet.subtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all hover:border-[#7dc3ff]/40 hover:bg-[#10284f]"
                  aria-label={t('share_sheet.close')}
                  title={t('share_sheet.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                <p className="font-serif text-lg font-bold text-white">{title}</p>
                <p className="mt-2 font-sans text-sm leading-6 text-[#d7e8ff]">{text}</p>
                <p className="mt-3 break-all font-sans text-xs text-[#87bfff]">{url}</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {networks.map((network) => (
                  <a
                    key={network.id}
                    href={network.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex min-h-[88px] flex-col justify-between rounded-[24px] border p-4 transition-all ${network.tone}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-current/20 bg-black/10">
                      {network.icon}
                    </div>
                    <span className="font-sans text-sm font-bold">{network.label}</span>
                  </a>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {navigator.share && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#4b9eff] px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(75,158,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#63adff]"
                  >
                    <Share2 className="h-4 w-4" />
                    {t('share_sheet.more_apps')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                >
                  <Copy className="h-4 w-4" />
                  {didCopy ? t('app.link_copied') : t('share_sheet.copy_link')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}