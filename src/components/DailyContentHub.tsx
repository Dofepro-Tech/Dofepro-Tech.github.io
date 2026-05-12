import { BookImage, ExternalLink, MessageSquareQuote, Newspaper, PlayCircle, Quote } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDailyContent } from '@/src/lib/dailyContent';
import { cn } from '@/src/lib/utils';

interface DailyContentHubProps {
  onNavigateToVerse?: (bookAbrev: string, chapter: number, verseNumber: number) => void;
}

const accentStyles = {
  gold: 'text-gold border-gold/20 bg-gold/5',
  blue: 'text-blue-700 border-blue-600/15 bg-blue-600/5',
  emerald: 'text-emerald-700 border-emerald-600/15 bg-emerald-600/5',
  rose: 'text-rose-700 border-rose-600/15 bg-rose-600/5',
  olive: 'text-olive border-olive/15 bg-olive/5',
} as const;

export function DailyContentHub({ onNavigateToVerse }: DailyContentHubProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'en' : 'es';
  const dailyContent = useMemo(() => getDailyContent(currentLanguage), [currentLanguage]);

  const externalCards = [
    { key: 'news', icon: Newspaper, data: dailyContent.news },
    { key: 'video', icon: PlayCircle, data: dailyContent.video },
    { key: 'testimony', icon: MessageSquareQuote, data: dailyContent.testimony },
  ];

  return (
    <section className="space-y-4">
      <div className="text-center">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-olive/45">{t('app.daily_companion')}</p>
        <h3 className="font-serif text-2xl font-bold text-ink">{t('app.daily_companion_title')}</h3>
        <p className="mx-auto mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-light">{t('app.daily_companion_body')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-olive/10 bg-paper-light/80 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-gold/80">{t('app.reflection_of_day')}</p>
              <h4 className="mt-2 font-serif text-xl font-bold text-ink">{dailyContent.reflection.title}</h4>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/10 text-gold">
              <Quote className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 font-sans text-sm leading-relaxed text-ink-light">{dailyContent.reflection.body}</p>

          {dailyContent.reflection.verseReference && (
            <button
              onClick={() => onNavigateToVerse?.(
                dailyContent.reflection.verseReference!.bookAbrev,
                dailyContent.reflection.verseReference!.chapter,
                dailyContent.reflection.verseReference!.verseNumber,
              )}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-olive/15 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-olive transition-all hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
            >
              {dailyContent.reflection.verseReference[currentLanguage === 'es' ? 'labelEs' : 'labelEn']}
            </button>
          )}

          {dailyContent.reflection.sourceUrl && (
            <a
              href={dailyContent.reflection.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 ml-3 inline-flex items-center gap-2 rounded-full border border-gold/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/10"
            >
              {dailyContent.reflection.sourceLabel || t('app.open_source')}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div
          className="rounded-3xl border border-olive/10 p-5 shadow-sm text-left text-white overflow-hidden"
          style={{ background: dailyContent.image.gradient }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">{t('app.image_of_day')}</p>
              <h4 className="mt-2 font-serif text-xl font-bold">{dailyContent.image.title}</h4>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
              <BookImage className="w-5 h-5" />
            </div>
          </div>

          {dailyContent.image.quote && (
            <blockquote className="mt-5 text-lg font-serif italic leading-relaxed">
              {dailyContent.image.quote}
            </blockquote>
          )}

          <p className="mt-4 font-sans text-sm leading-relaxed text-white/85">{dailyContent.image.body}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            {dailyContent.image.verseReference && (
              <button
                onClick={() => onNavigateToVerse?.(
                  dailyContent.image.verseReference!.bookAbrev,
                  dailyContent.image.verseReference!.chapter,
                  dailyContent.image.verseReference!.verseNumber,
                )}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-white/20"
              >
                {dailyContent.image.verseReference[currentLanguage === 'es' ? 'labelEs' : 'labelEn']}
              </button>
            )}

            {dailyContent.image.sourceUrl && (
              <a
                href={dailyContent.image.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-white/20"
              >
                {dailyContent.image.sourceLabel || t('app.open_source')}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {externalCards.map(({ key, icon: Icon, data }) => (
          <article key={key} className="rounded-3xl border border-olive/10 bg-paper-light/80 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-olive/45">
                  {key === 'news' ? t('app.news_of_day') : key === 'video' ? t('app.video_of_day') : t('app.testimony_of_day')}
                </p>
                <h4 className="mt-2 font-serif text-xl font-bold text-ink">{data.title}</h4>
              </div>
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', accentStyles[data.accent])}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-light">{data.body}</p>

            {data.sourceName && (
              <p className="mt-4 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-olive/45">{data.sourceName}</p>
            )}

            {data.sourceUrl && (
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-olive/15 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-olive transition-all hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
              >
                {data.sourceLabel || t('app.open_source')}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}