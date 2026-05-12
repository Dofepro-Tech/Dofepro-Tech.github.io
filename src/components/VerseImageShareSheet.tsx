import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Bookmark, Copy, Download, ExternalLink, House, MessageCircle, Send, Share2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';

interface VerseImageShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onHome?: () => void;
  mode?: 'preview' | 'share';
  title: string;
  text: string;
  url: string;
  previewUrl: string | null;
  canNativeShareImage: boolean;
  onNativeShareImage: () => void | Promise<void>;
  onDownloadImage: () => void | Promise<void>;
  isSaved?: boolean;
  onToggleSaved?: () => void | Promise<void>;
  headerBadge?: string;
  headerTitle?: string;
  headerSubtitle?: string;
}

export function VerseImageShareSheet({
  isOpen,
  onClose,
  onHome,
  mode = 'share',
  title,
  text,
  url,
  previewUrl,
  canNativeShareImage,
  onNativeShareImage,
  onDownloadImage,
  isSaved = false,
  onToggleSaved,
  headerBadge,
  headerTitle,
  headerSubtitle,
}: VerseImageShareSheetProps) {
  const { t } = useTranslation();
  const [didCopy, setDidCopy] = useState(false);
  const isShareMode = mode === 'share';
  const resolvedHeaderBadge = headerBadge ?? t('app.share_verse_image');
  const resolvedHeaderTitle = headerTitle ?? t('share_sheet.image_title');
  const resolvedHeaderSubtitle = headerSubtitle ?? t('share_sheet.image_subtitle');
  const previewCaption = title || resolvedHeaderBadge;
  const actionGridClass = canNativeShareImage
    ? onHome
      ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4'
      : 'grid gap-3 sm:grid-cols-3'
    : onHome
      ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
      : 'grid gap-3 sm:grid-cols-2';

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
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const shareMessage = [title, text, url].filter(Boolean).join('\n');
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(shareMessage);
  const encodedText = encodeURIComponent([title, text].filter(Boolean).join('\n'));

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setDidCopy(true);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleShareFallback = async () => {
    if (!navigator.share) {
      return;
    }

    try {
      await navigator.share({ title, text, url });
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-end justify-center bg-[#020817]/70 px-3 py-3 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <button type="button" className="absolute inset-0" onClick={onClose} aria-label={t('share_sheet.close')} />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className={cn(
              'relative z-10 flex min-h-0 flex-col overflow-hidden text-white shadow-[0_30px_90px_rgba(0,0,0,0.38)]',
              isShareMode
                ? 'max-h-[calc(100dvh-1.5rem)] w-full max-w-xl rounded-[32px] border border-white/12 bg-[#07162b] sm:max-h-[calc(100dvh-2rem)]'
                : 'h-[calc(100dvh-1rem)] w-full max-w-md rounded-[34px] border border-white/12 bg-[#040b15] sm:h-[calc(100dvh-2rem)]'
            )}
          >
            {isShareMode ? (
              <>
                <div className="shrink-0 border-b border-white/10 px-5 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#87bfff]">{resolvedHeaderBadge}</p>
                      <h2 className="mt-2 font-serif text-[2rem] font-bold leading-tight text-white sm:text-2xl">{resolvedHeaderTitle}</h2>
                      <p className="mt-2 max-w-md font-sans text-[13px] leading-5 text-[#cfe2ff] sm:text-sm sm:leading-6">{resolvedHeaderSubtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all hover:border-[#7dc3ff]/40 hover:bg-[#10284f]"
                        aria-label={t('app.back')}
                        title={t('app.back')}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      {onHome ? (
                        <button
                          type="button"
                          onClick={onHome}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all hover:border-[#7dc3ff]/40 hover:bg-[#10284f]"
                          aria-label={t('app.home')}
                          title={t('app.home')}
                        >
                          <House className="h-5 w-5" />
                        </button>
                      ) : null}
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
                </div>

                <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                  <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-start gap-3">
                      {previewUrl ? (
                        <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#020817] p-1.5">
                          <img src={previewUrl} alt={title} className="h-24 w-[4.5rem] rounded-[14px] object-cover" />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-lg font-bold text-white">{title}</p>
                        <p className="mt-2 line-clamp-4 font-sans text-sm leading-6 text-[#d7e8ff]">{text}</p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 rounded-[18px] border border-[#7dc3ff]/16 bg-[#0d2243]/70 px-4 py-3 font-sans text-[12px] leading-5 text-[#d7e8ff]">
                    {t('share_sheet.image_networks_hint')}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {networks.map((network) => (
                      <a
                        key={network.id}
                        href={network.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex min-h-[78px] flex-col justify-between rounded-[24px] border p-4 transition-all ${network.tone}`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-current/20 bg-black/10">
                          {network.icon}
                        </div>
                        <span className="font-sans text-[13px] font-bold">{network.label}</span>
                      </a>
                    ))}
                  </div>

                  {!canNativeShareImage ? (
                    <p className="mt-4 rounded-[22px] border border-[#7dc3ff]/18 bg-[#10284f]/55 px-4 py-3 font-sans text-sm leading-6 text-[#d7e8ff]">
                      {t('share_sheet.image_native_only')}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 border-t border-white/10 bg-[#07162b]/95 px-5 py-4 backdrop-blur-sm sm:px-6">
                  <div className={actionGridClass}>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {t('app.back')}
                    </button>

                    {onHome ? (
                      <button
                        type="button"
                        onClick={onHome}
                        className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                      >
                        <House className="h-4 w-4" />
                        {t('app.home')}
                      </button>
                    ) : null}

                    {canNativeShareImage ? (
                      <button
                        type="button"
                        onClick={onNativeShareImage}
                        className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#4b9eff] px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(75,158,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#63adff]"
                      >
                        <Share2 className="h-4 w-4" />
                        {t('share_sheet.share_image')}
                      </button>
                    ) : null}

                    {!canNativeShareImage && navigator.share ? (
                      <button
                        type="button"
                        onClick={handleShareFallback}
                        className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#4b9eff] px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(75,158,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#63adff]"
                      >
                        <Share2 className="h-4 w-4" />
                        {t('share_sheet.more_apps')}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={onDownloadImage}
                      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                    >
                      <Download className="h-4 w-4" />
                      {t('share_sheet.save_image')}
                    </button>

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
              </>
            ) : (
              <>
                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/24 text-white backdrop-blur-sm transition-all hover:border-[#7dc3ff]/40 hover:bg-black/36"
                    aria-label={t('app.back')}
                    title={t('app.back')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {onHome ? (
                      <button
                        type="button"
                        onClick={onHome}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/24 text-white backdrop-blur-sm transition-all hover:border-[#7dc3ff]/40 hover:bg-black/36"
                        aria-label={t('app.home')}
                        title={t('app.home')}
                      >
                        <House className="h-5 w-5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/24 text-white backdrop-blur-sm transition-all hover:border-[#7dc3ff]/40 hover:bg-black/36"
                      aria-label={t('share_sheet.close')}
                      title={t('share_sheet.close')}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,_rgba(84,166,255,0.18),_transparent_32%),linear-gradient(180deg,#08101c_0%,#06101f_38%,#040913_100%)]">
                  <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 pt-16 sm:px-5 sm:pb-5 sm:pt-20">
                    {previewUrl ? (
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[30px] border border-white/10 bg-[#061223] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.26)]">
                        <img src={previewUrl} alt={title} className="max-h-full w-full rounded-[24px] object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[30px] border border-white/10 bg-[#061223] px-6 text-center font-serif text-2xl font-bold text-white">
                        {resolvedHeaderTitle}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-white/10 bg-[#1297cf]/96 px-4 py-4 backdrop-blur-xl sm:px-5">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 line-clamp-2 font-sans text-[1.02rem] font-medium leading-6 text-white sm:line-clamp-1 sm:text-[1.1rem]">
                        {previewCaption}
                      </p>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={onDownloadImage}
                          className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/28 bg-[#1f7cab] text-white shadow-[0_10px_22px_rgba(3,19,42,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#298cc0]"
                          aria-label={t('share_sheet.save_image')}
                          title={t('share_sheet.save_image')}
                        >
                          <Download className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={onToggleSaved}
                          className={cn(
                            'flex h-14 w-14 items-center justify-center rounded-[20px] border text-white shadow-[0_10px_22px_rgba(3,19,42,0.24)] transition-all hover:-translate-y-0.5',
                            isSaved
                              ? 'border-[#ffe39a] bg-[#d9a72a]'
                              : 'border-white/28 bg-[#1f7cab] hover:bg-[#298cc0]'
                          )}
                          aria-label={t('app.save_verse')}
                          title={t('app.save_verse')}
                        >
                          <Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />
                        </button>

                        <button
                          type="button"
                          onClick={onNativeShareImage}
                          className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/28 bg-[#1f7cab] text-white shadow-[0_10px_22px_rgba(3,19,42,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#298cc0]"
                          aria-label={t('share_sheet.share_image')}
                          title={t('share_sheet.share_image')}
                        >
                          <Share2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}