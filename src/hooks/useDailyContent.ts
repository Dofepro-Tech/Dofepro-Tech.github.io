import { useEffect, useMemo, useState } from 'react';
import { getDeterministicIndex, getLocalDateKey } from '@/src/lib/challenges';
import { getDailyContent, type DailyContentCollection, type DailyResourceCard } from '@/src/lib/dailyContent';
import { canFetchDailyContentRemotely, fetchDailyContent, type RemoteDailyContentPayload } from '@/src/services/dailyContentApi';

const SECTION_LIMIT = 4;

function getDateOrdinal(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function chooseFallbackCards(cards: DailyResourceCard[], seed: string, dateKey: string) {
  if (cards.length <= 1) return cards.slice(0, SECTION_LIMIT);
  const start = (getDateOrdinal(dateKey) + getDeterministicIndex(cards.length, seed)) % cards.length;
  return Array.from({ length: Math.min(SECTION_LIMIT, cards.length) }, (_value, offset) => cards[(start + offset) % cards.length]);
}

function chooseSectionCards(remoteCards: DailyResourceCard[] | undefined, fallbackCards: DailyResourceCard[], seed: string, dateKey: string) {
  if (remoteCards !== undefined) return remoteCards.slice(0, SECTION_LIMIT);
  return chooseFallbackCards(fallbackCards, seed, dateKey);
}

function applyVisualDefaults(cards: DailyResourceCard[], fallbackCards: DailyResourceCard[]) {
  if (fallbackCards.length === 0) return cards;
  return cards.map((card, index) => {
    const visualFallback = fallbackCards[index % fallbackCards.length] ?? fallbackCards[0];
    return {
      ...card,
      imageUrl: card.imageUrl ?? visualFallback.imageUrl,
      imageAlt: card.imageAlt ?? visualFallback.imageAlt ?? card.title,
      gradient: card.gradient ?? visualFallback.gradient,
      accent: card.accent ?? visualFallback.accent,
    } satisfies DailyResourceCard;
  });
}

export function buildDailyContentCollection(
  language: 'es' | 'en',
  fallbackContent: DailyContentCollection,
  remoteContent: RemoteDailyContentPayload | null,
  dateKey: string,
): DailyContentCollection {
  const reflections = chooseSectionCards(remoteContent?.reflections, fallbackContent.reflections, `${language}-reflections`, dateKey);
  const sermons = chooseSectionCards(remoteContent?.sermons, fallbackContent.sermons, `${language}-sermons`, dateKey);
  const newsItems = chooseSectionCards(remoteContent?.newsItems, fallbackContent.newsItems, `${language}-news`, dateKey);
  const videos = chooseSectionCards(remoteContent?.videos, fallbackContent.videos, `${language}-videos`, dateKey);
  const testimonies = chooseSectionCards(remoteContent?.testimonies, fallbackContent.testimonies, `${language}-testimonies`, dateKey);
  const images = chooseFallbackCards(fallbackContent.images, `${language}-images`, dateKey);

  const visualReflections = applyVisualDefaults(reflections, fallbackContent.reflections);
  const visualSermons = applyVisualDefaults(sermons, fallbackContent.sermons);
  const visualNews = applyVisualDefaults(newsItems, fallbackContent.newsItems);
  const visualVideos = applyVisualDefaults(videos, fallbackContent.videos);
  const visualTestimonies = applyVisualDefaults(testimonies, fallbackContent.testimonies);

  return {
    reflection: visualReflections[0],
    reflections: visualReflections,
    sermon: visualSermons[0],
    sermons: visualSermons,
    image: images[0],
    images,
    news: visualNews[0],
    newsItems: visualNews,
    video: visualVideos[0],
    videos: visualVideos,
    testimony: visualTestimonies[0],
    testimonies: visualTestimonies,
    sections: [
      { id: 'images', kind: 'image', items: images },
      { id: 'sermons', kind: 'sermon', items: visualSermons },
      { id: 'videos', kind: 'video', items: visualVideos },
      { id: 'reflections', kind: 'reflection', items: visualReflections },
      { id: 'testimonies', kind: 'testimony', items: visualTestimonies },
      { id: 'news', kind: 'news', items: visualNews },
    ],
  } satisfies DailyContentCollection;
}

export function useDailyContent(language: 'es' | 'en') {
  const [dateKey, setDateKey] = useState(() => getLocalDateKey());
  const fallbackContent = useMemo(() => getDailyContent(language, dateKey), [dateKey, language]);
  const [dailyContent, setDailyContent] = useState<DailyContentCollection>(() => buildDailyContentCollection(language, fallbackContent, null, dateKey));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncDateKey = () => {
      const nextDateKey = getLocalDateKey();
      setDateKey((currentDateKey) => currentDateKey === nextDateKey ? currentDateKey : nextDateKey);
    };

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 2, 0);
    const timer = window.setTimeout(syncDateKey, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') syncDateKey(); };
    window.addEventListener('focus', syncDateKey);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', syncDateKey);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dateKey]);

  useEffect(() => {
    setDailyContent(buildDailyContentCollection(language, fallbackContent, null, dateKey));
    if (!canFetchDailyContentRemotely()) return undefined;

    const controller = new AbortController();
    let isDisposed = false;
    const loadDailyContent = async () => {
      try {
        const remoteContent = await fetchDailyContent(language, controller.signal);
        if (!isDisposed) setDailyContent(buildDailyContentCollection(language, fallbackContent, remoteContent, dateKey));
      } catch (error) {
        if (!isDisposed && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error loading remote daily content:', error);
        }
      }
    };
    void loadDailyContent();

    return () => {
      isDisposed = true;
      controller.abort();
    };
  }, [dateKey, fallbackContent, language]);

  return dailyContent;
}
