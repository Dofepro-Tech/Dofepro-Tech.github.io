import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronLeft, Share2, Volume2, VolumeX, Target, Headphones, Sparkles, CheckCircle2, Flame, Gem, House } from 'lucide-react';
import { DailyChallengeTaskId, ReadingChallengeSummary, Verse } from '@/src/types';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { getSpeechLanguage, normalizeAppLanguage } from '@/src/lib/language';
import { buildVerseShareText, getReaderShareUrl, type SharePayload } from '@/src/lib/share';
import { canUseSpeechSynthesis, cancelSpeech, speakText } from '@/src/lib/speech';

interface RandomVerseModalProps {
  onGoToVerse: (bookAbrev: string, chapter: number, verse: Verse) => void;
  onContinue: () => void;
  challengeSummary: ReadingChallengeSummary;
  onCompleteDailyTask: (taskId: DailyChallengeTaskId) => void;
  onGoHome?: () => void;
  onShareContent: (payload: SharePayload) => void | Promise<void>;
  dailyVerse: {
    id: string;
    bookAbrev: string;
    chapter: number;
    verse: Verse;
    label: string;
  };
}

export function RandomVerseModal({ onGoToVerse, onContinue, challengeSummary, onCompleteDailyTask, onGoHome, onShareContent, dailyVerse }: RandomVerseModalProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const appShareUrl = getReaderShareUrl({
    bookAbrev: dailyVerse.bookAbrev,
    chapter: dailyVerse.chapter,
    verseNumber: dailyVerse.verse.number,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const isSpeechAvailable = canUseSpeechSynthesis();

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const playVerse = () => {
    if (!dailyVerse || !isSpeechAvailable) return;
    if (isPlaying) {
      cancelSpeech();
      setIsPlaying(false);
      return;
    }

    const didSpeak = speakText({
      text: dailyVerse.verse.verse,
      lang: getSpeechLanguage(currentLanguage),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });

    if (!didSpeak) {
      return;
    }

    setIsPlaying(true);
  };

  const handleShareDailyVerse = async () => {
    if (!dailyVerse) {
      return;
    }

    const shareText = buildVerseShareText({
      reference: dailyVerse.label,
      verseText: dailyVerse.verse.verse,
      shareUrl: appShareUrl,
    });

    await onShareContent({
      title: dailyVerse.label,
      text: shareText,
      url: appShareUrl,
    });
  };

  const verseReference = dailyVerse
    ? dailyVerse.label
    : '';

  const handleOpenDailyVerse = () => {
    onCompleteDailyTask('open_daily_verse');
    onGoToVerse(dailyVerse.bookAbrev, dailyVerse.chapter, dailyVerse.verse);
  };

  const dailyChallenges = dailyVerse
    ? [
        {
          id: 'listen_daily_verse' as DailyChallengeTaskId,
          icon: Headphones,
          title: t('app.challenge_listen_title'),
          description: t('app.challenge_listen_body'),
          actionLabel: isPlaying ? t('audio.stop') : t('app.challenge_listen_now'),
          onClick: () => {
            onCompleteDailyTask('listen_daily_verse');
            playVerse();
          },
        },
        {
          id: 'pray_daily_verse' as DailyChallengeTaskId,
          icon: Sparkles,
          title: t('app.challenge_reflect_title'),
          description: t('app.challenge_reflect_body'),
          actionLabel: t('app.challenge_enter_app'),
          onClick: () => {
            onCompleteDailyTask('pray_daily_verse');
            onContinue();
          },
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="mx-auto my-4 flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-olive/10 bg-paper shadow-2xl max-h-[calc(100dvh-2rem)]"
      >
        <div className="overflow-y-auto px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-olive/10 bg-paper-light text-olive shadow-sm transition-all hover:bg-gold/10"
                aria-label={t('app.back')}
                title={t('app.back')}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {onGoHome ? (
                <button
                  type="button"
                  onClick={onGoHome}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-olive/10 bg-paper-light text-olive shadow-sm transition-all hover:bg-gold/10"
                  aria-label={t('app.home')}
                  title={t('app.home')}
                >
                  <House className="h-5 w-5" />
                </button>
              ) : null}
            </div>
            <span className="rounded-full border border-olive/10 bg-paper-light/80 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-olive/70">
              {t('menu.daily_challenges')}
            </span>
          </div>

          <div className="mb-6 rounded-[28px] border border-olive/10 bg-[linear-gradient(180deg,#13233f_0%,#0d1a30_100%)] p-5 shadow-[0_22px_50px_rgba(16,33,58,0.18)] sm:p-6">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#dcecff]">
              {t('app.verse_for_day')}
            </span>

            <button
              type="button"
              onClick={handleOpenDailyVerse}
              className="mt-6 block w-full text-left transition-opacity hover:opacity-95"
            >
              <p className="font-serif text-[1.75rem] italic leading-[1.28] text-white sm:text-[2rem]">
                {dailyVerse.verse.verse}
              </p>
              <p className="mt-4 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white/72">
                {verseReference}
              </p>
            </button>
          </div>

          <div className="mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { void handleShareDailyVerse(); }}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-olive/12 bg-paper-light px-4 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-olive transition-all hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
            >
              <Share2 className="h-4 w-4" />
              {t('app.share_verse')}
            </button>
            <button
              type="button"
              onClick={playVerse}
              disabled={!isSpeechAvailable}
              aria-label={isPlaying ? t('audio.stop') : t('app.challenge_listen_now')}
              title={isPlaying ? t('audio.stop') : t('app.challenge_listen_now')}
              className={cn(
                'inline-flex h-14 w-14 items-center justify-center rounded-2xl border transition-all',
                isPlaying
                  ? 'border-gold bg-gold text-white shadow-lg shadow-gold/20'
                  : 'border-olive/10 bg-paper-light text-olive hover:bg-gold/10',
                !isSpeechAvailable && 'cursor-not-allowed opacity-50'
              )}
            >
              {isPlaying ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-olive/10 bg-paper-light/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-gold">
                  <Flame className="h-4 w-4" />
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em]">{t('app.challenge_streak')}</span>
                </div>
                <p className="font-serif text-2xl font-bold text-ink">{challengeSummary.streak}</p>
              </div>
              <div className="rounded-2xl border border-olive/10 bg-paper-light/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-blue-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em]">{t('app.challenge_completed_today')}</span>
                </div>
                <p className="font-serif text-2xl font-bold text-ink">{challengeSummary.completedToday}/{challengeSummary.totalDailyTasks}</p>
              </div>
              <div className="rounded-2xl border border-olive/10 bg-paper-light/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-600">
                  <Gem className="h-4 w-4" />
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em]">{t('app.challenge_rewards')}</span>
                </div>
                <p className="font-serif text-2xl font-bold text-ink">{challengeSummary.totalRewardPoints}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-olive/10 bg-paper-light/80 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-olive/45">{t('app.daily_challenges')}</p>
                  <h3 className="font-serif text-lg font-bold text-ink">{t('app.challenge_of_day')}</h3>
                </div>
              </div>

              <div className="space-y-3">
                {dailyChallenges.map((challenge, index) => {
                  const Icon = challenge.icon;

                  return (
                    <div
                      key={challenge.id}
                      className={cn(
                        'rounded-2xl border bg-paper p-4 shadow-sm transition-colors',
                        challengeSummary.todayCompletedTaskIds.includes(challenge.id)
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-olive/10'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                            challengeSummary.todayCompletedTaskIds.includes(challenge.id)
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-olive/8 text-olive'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-gold/80">0{index + 1}</p>
                            {challengeSummary.todayCompletedTaskIds.includes(challenge.id) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {t('app.challenge_done')}
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif text-base font-bold text-ink">{challenge.title}</h4>
                          <p className="mt-1 font-sans text-sm leading-relaxed text-ink-light">{challenge.description}</p>
                          <button
                            onClick={challenge.onClick}
                            className={cn(
                              'mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] transition-all',
                              challengeSummary.todayCompletedTaskIds.includes(challenge.id)
                                ? 'border-emerald-200 bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100'
                                : 'border-olive/15 text-olive hover:border-gold/30 hover:bg-gold/10 hover:text-gold'
                            )}
                          >
                            {challenge.actionLabel}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
