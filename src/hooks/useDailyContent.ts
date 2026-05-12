import { useEffect, useMemo, useState } from 'react';
import { getDeterministicIndex, getLocalDateKey, getPreviousDateKey } from '@/src/lib/challenges';
import { getDailyContent, type DailyContentCollection, type DailyContentKind, type DailyResourceCard } from '@/src/lib/dailyContent';
import { canFetchDailyContentRemotely, fetchDailyContent, type RemoteDailyContentPayload } from '@/src/services/dailyContentApi';

const SECTION_LIMIT = 4;
const FRESH_SECTION_CARD_COUNT = 2;

const DAILY_SECTION_TOPICS: Record<Exclude<DailyContentKind, 'image'>, Record<'es' | 'en', string[]>> = {
  reflection: {
    es: ['gracia', 'paz', 'sabiduria', 'esperanza', 'oracion', 'familia', 'descanso'],
    en: ['grace', 'peace', 'wisdom', 'hope', 'prayer', 'family', 'rest'],
  },
  sermon: {
    es: ['identidad en Cristo', 'fe', 'esperanza', 'oracion', 'familia', 'discipulado', 'proposito'],
    en: ['identity in Christ', 'faith', 'hope', 'prayer', 'family', 'discipleship', 'purpose'],
  },
  news: {
    es: ['iglesia', 'comunidad', 'misiones', 'juventud', 'familia', 'solidaridad', 'mundo'],
    en: ['church', 'community', 'missions', 'youth', 'family', 'solidarity', 'world'],
  },
  video: {
    es: ['estudio biblico', 'salmos', 'evangelio', 'esperanza', 'oracion', 'familia', 'sabiduria'],
    en: ['bible study', 'psalms', 'gospel', 'hope', 'prayer', 'family', 'wisdom'],
  },
  testimony: {
    es: ['restauracion', 'fe', 'perseverancia', 'familia', 'provision', 'cambio de vida', 'sanidad'],
    en: ['restoration', 'faith', 'perseverance', 'family', 'provision', 'life change', 'healing'],
  },
};

function getDateOrdinal(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function getDailyStartIndex(length: number, seed: string, dateKey: string) {
  if (length <= 1) {
    return 0;
  }

  return (getDateOrdinal(dateKey) + getDeterministicIndex(length, seed)) % length;
}

function selectDailyCards(cards: DailyResourceCard[], seed: string, dateKey: string, limit: number = SECTION_LIMIT) {
  if (cards.length === 0) {
    return [];
  }

  const startIndex = getDailyStartIndex(cards.length, seed, dateKey);

  if (cards.length <= limit) {
    if (cards.length <= 1) {
      return cards;
    }

    return cards.slice(startIndex).concat(cards.slice(0, startIndex));
  }

  return Array.from({ length: limit }, (_value, offset) => cards[(startIndex + offset) % cards.length]);
}

function ensureFreshLeadCard(cards: DailyResourceCard[], previousLeadId?: string) {
  if (cards.length <= 1 || !previousLeadId || cards[0]?.id !== previousLeadId) {
    return cards;
  }

  return cards.slice(1).concat(cards[0]);
}

function mergeDailyCards(...cardGroups: Array<DailyResourceCard[] | undefined>) {
  const seen = new Set<string>();

  return cardGroups
    .flatMap((cards) => cards ?? [])
    .filter((card) => {
      const dedupeKey = card.sourceUrl || card.id;
      if (seen.has(dedupeKey)) {
        return false;
      }

      seen.add(dedupeKey);
      return true;
    });
}

function stabilizeCards(cards: DailyResourceCard[]) {
  return [...cards].sort((left, right) => left.id.localeCompare(right.id));
}

function buildFreshSectionUrl(kind: Exclude<DailyContentKind, 'image'>, language: 'es' | 'en', topic: string, dateKey: string) {
  const encodedQuery = encodeURIComponent(
    language === 'en'
      ? `${topic} christian ${kind} ${dateKey}`
      : `${topic} cristiano ${kind === 'news' ? 'noticias' : kind} ${dateKey}`
  );

  switch (kind) {
    case 'reflection':
      return `https://duckduckgo.com/?q=${encodedQuery}`;
    case 'sermon':
      return `https://www.youtube.com/results?search_query=${encodedQuery}`;
    case 'news':
      return `https://duckduckgo.com/?q=${encodedQuery}`;
    case 'video':
      return `https://www.youtube.com/results?search_query=${encodedQuery}`;
    case 'testimony':
      return `https://www.youtube.com/results?search_query=${encodedQuery}`;
  }
}

function buildFreshSectionTitle(kind: Exclude<DailyContentKind, 'image'>, language: 'es' | 'en', topic: string) {
  switch (kind) {
    case 'reflection':
      return language === 'en' ? `Fresh reflection: ${topic}` : `Reflexion renovada: ${topic}`;
    case 'sermon':
      return language === 'en' ? `Sermon focus for today: ${topic}` : `Predica de hoy: ${topic}`;
    case 'news':
      return language === 'en' ? `Christian news focus: ${topic}` : `Noticias cristianas: ${topic}`;
    case 'video':
      return language === 'en' ? `Video guide for today: ${topic}` : `Video de hoy: ${topic}`;
    case 'testimony':
      return language === 'en' ? `Testimony focus: ${topic}` : `Testimonio de hoy: ${topic}`;
  }
}

function buildFreshSectionBody(kind: Exclude<DailyContentKind, 'image'>, language: 'es' | 'en', topic: string) {
  switch (kind) {
    case 'reflection':
      return language === 'en'
        ? `A refreshed devotional path centered on ${topic} for today.`
        : `Una ruta devocional renovada centrada en ${topic} para hoy.`;
    case 'sermon':
      return language === 'en'
        ? `A refreshed sermon search focused on ${topic} for this day.`
        : `Una busqueda renovada de predicas enfocada en ${topic} para este dia.`;
    case 'news':
      return language === 'en'
        ? `A fresh Christian news angle around ${topic} for today.`
        : `Una mirada renovada a la actualidad cristiana sobre ${topic} para hoy.`;
    case 'video':
      return language === 'en'
        ? `A refreshed video route around ${topic} to accompany the day.`
        : `Una ruta de videos renovada sobre ${topic} para acompanar el dia.`;
    case 'testimony':
      return language === 'en'
        ? `A refreshed testimony route centered on ${topic} for today.`
        : `Una ruta renovada de testimonios centrada en ${topic} para hoy.`;
  }
}

function buildFreshSectionCards(
  kind: Exclude<DailyContentKind, 'image'>,
  language: 'es' | 'en',
  fallbackCards: DailyResourceCard[],
  dateKey: string,
) {
  if (fallbackCards.length === 0) {
    return [];
  }

  const topics = DAILY_SECTION_TOPICS[kind][language];
  const baseStartIndex = getDailyStartIndex(fallbackCards.length, `${kind}-${language}-base`, dateKey);

  return Array.from({ length: Math.min(FRESH_SECTION_CARD_COUNT, fallbackCards.length) }, (_value, index) => {
    const topic = topics[(getDateOrdinal(dateKey) + index) % topics.length] ?? topics[0];
    const baseCard = fallbackCards[(baseStartIndex + index) % fallbackCards.length] ?? fallbackCards[0];
    const topicSlug = topic.toLowerCase().replace(/[^a-z0-9]+/gi, '-');

    return {
      ...baseCard,
      id: `${kind}-refresh-${dateKey}-${index}-${topicSlug}`,
      title: buildFreshSectionTitle(kind, language, topic),
      body: buildFreshSectionBody(kind, language, topic),
      sourceUrl: buildFreshSectionUrl(kind, language, topic, dateKey),
      sourceName: baseCard.sourceName ?? (language === 'en' ? 'Daily selection' : 'Seleccion diaria'),
      sourceLabel: baseCard.sourceLabel ?? (language === 'en' ? 'Open resource' : 'Abrir recurso'),
    } satisfies DailyResourceCard;
  });
}

function applyVisualDefaults(cards: DailyResourceCard[], fallbackCards: DailyResourceCard[]) {
  if (fallbackCards.length === 0) {
    return cards;
  }

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

function buildFreshImageCards(language: 'es' | 'en', fallbackImages: DailyResourceCard[], dateKey: string) {
  return fallbackImages.slice(0, 2).map((fallbackImage, index) => {
    const imageSeed = `${dateKey}-${language}-${index}`;

    return {
      ...fallbackImage,
      id: `image-refresh-${imageSeed}`,
      title: language === 'en'
        ? index === 0 ? 'Fresh image for today' : 'Another image for today'
        : index === 0 ? 'Imagen renovada para hoy' : 'Otra imagen de hoy',
      body: language === 'en'
        ? 'A refreshed visual card for today while the biblical text stays in focus.'
        : 'Una tarjeta visual renovada para hoy manteniendo el texto biblico en el centro.',
      imageUrl: `https://picsum.photos/seed/biblia-dj-${imageSeed}/1200/1600`,
      sourceUrl: `https://picsum.photos/seed/biblia-dj-${imageSeed}/1600/2000`,
      sourceName: language === 'en' ? 'Updated image' : 'Imagen actualizada',
      sourceLabel: language === 'en' ? 'View image' : 'Ver imagen',
    } satisfies DailyResourceCard;
  });
}

export function buildDailyContentCollection(
  language: 'es' | 'en',
  fallbackContent: DailyContentCollection,
  remoteContent: RemoteDailyContentPayload | null,
  dateKey: string,
): DailyContentCollection {
  const stableReflections = stabilizeCards(fallbackContent.reflections);
  const stableSermons = stabilizeCards(fallbackContent.sermons);
  const stableNewsItems = stabilizeCards(fallbackContent.newsItems);
  const stableVideos = stabilizeCards(fallbackContent.videos);
  const stableTestimonies = stabilizeCards(fallbackContent.testimonies);
  const stableImages = stabilizeCards(fallbackContent.images);

  const reflections = selectDailyCards(
    applyVisualDefaults(
      mergeDailyCards(remoteContent?.reflections, buildFreshSectionCards('reflection', language, stableReflections, dateKey), stableReflections),
      stableReflections,
    ),
    `${language}-reflections`,
    dateKey,
  );
  const sermons = selectDailyCards(
    applyVisualDefaults(
      mergeDailyCards(remoteContent?.sermons, buildFreshSectionCards('sermon', language, stableSermons, dateKey), stableSermons),
      stableSermons,
    ),
    `${language}-sermons`,
    dateKey,
  );
  const newsItems = selectDailyCards(
    applyVisualDefaults(
      mergeDailyCards(remoteContent?.newsItems, buildFreshSectionCards('news', language, stableNewsItems, dateKey), stableNewsItems),
      stableNewsItems,
    ),
    `${language}-news`,
    dateKey,
  );
  const mergedVideos = applyVisualDefaults(
    mergeDailyCards(remoteContent?.videos, buildFreshSectionCards('video', language, stableVideos, dateKey), stableVideos),
    stableVideos,
  );
  const previousVideoLeadId = selectDailyCards(mergedVideos, `${language}-videos`, getPreviousDateKey(dateKey), 1)[0]?.id;
  const videos = ensureFreshLeadCard(
    selectDailyCards(mergedVideos, `${language}-videos`, dateKey),
    previousVideoLeadId,
  );
  const testimonies = selectDailyCards(
    applyVisualDefaults(
      mergeDailyCards(remoteContent?.testimonies, buildFreshSectionCards('testimony', language, stableTestimonies, dateKey), stableTestimonies),
      stableTestimonies,
    ),
    `${language}-testimonies`,
    dateKey,
  );
  const freshImages = buildFreshImageCards(language, stableImages, dateKey);
  const images = selectDailyCards(
    applyVisualDefaults(mergeDailyCards(freshImages, stableImages), stableImages),
    `${language}-images`,
    dateKey,
  );

  return {
    reflection: reflections[0],
    reflections,
    sermon: sermons[0],
    sermons,
    image: images[0],
    images,
    news: newsItems[0],
    newsItems,
    video: videos[0],
    videos,
    testimony: testimonies[0],
    testimonies,
    sections: [
      { id: 'images', kind: 'image', items: images },
      { id: 'sermons', kind: 'sermon', items: sermons },
      { id: 'videos', kind: 'video', items: videos },
      { id: 'reflections', kind: 'reflection', items: reflections },
      { id: 'testimonies', kind: 'testimony', items: testimonies },
      { id: 'news', kind: 'news', items: newsItems },
    ],
  } satisfies DailyContentCollection;
}

export function useDailyContent(language: 'es' | 'en') {
  const [dateKey, setDateKey] = useState(() => getLocalDateKey());
  const fallbackContent = useMemo(() => getDailyContent(language, dateKey), [dateKey, language]);
  const [dailyContent, setDailyContent] = useState<DailyContentCollection>(() => buildDailyContentCollection(language, fallbackContent, null, dateKey));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncDateKey = () => {
      const nextDateKey = getLocalDateKey();
      setDateKey((currentDateKey) => currentDateKey === nextDateKey ? currentDateKey : nextDateKey);
    };

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 2, 0);

    const timer = window.setTimeout(() => {
      syncDateKey();
    }, Math.max(1000, nextMidnight.getTime() - now.getTime()));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDateKey();
      }
    };

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

    if (!canFetchDailyContentRemotely()) {
      return undefined;
    }

    const controller = new AbortController();
    let isDisposed = false;

    const loadDailyContent = async () => {
      try {
        const remoteContent = await fetchDailyContent(language, controller.signal);
        if (!isDisposed) {
          setDailyContent(buildDailyContentCollection(language, fallbackContent, remoteContent, dateKey));
        }
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
