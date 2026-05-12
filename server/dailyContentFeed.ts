import Parser from 'rss-parser';

type AppLanguage = 'es' | 'en';
type AccentTone = 'gold' | 'blue' | 'emerald' | 'rose' | 'olive';
type RemoteSectionKey = 'reflections' | 'sermons' | 'newsItems' | 'videos' | 'testimonies';

interface RemoteFeedItem {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  creator?: string;
  author?: string;
  enclosure?: {
    url?: string;
  };
  'content:encoded'?: string;
}

interface RemoteDailyResourceCard {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  accent: AccentTone;
}

export interface RemoteDailyContentResponse {
  fetchedAt: string;
  reflections: RemoteDailyResourceCard[];
  sermons: RemoteDailyResourceCard[];
  newsItems: RemoteDailyResourceCard[];
  videos: RemoteDailyResourceCard[];
  testimonies: RemoteDailyResourceCard[];
}

interface FeedSource {
  id: string;
  url: string;
  accent: AccentTone;
  sourceName: { es: string; en: string };
  sourceLabel: { es: string; en: string };
  fallbackTitle: { es: string; en: string };
  fallbackBody: { es: string; en: string };
}

interface RemoteCardCandidate extends RemoteDailyResourceCard {
  publishedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const SECTION_LIMIT = 16;
const FEED_TIMEOUT_MS = 8000;

const parser = new Parser<Record<string, never>, RemoteFeedItem>();
const dailyContentCache = new Map<AppLanguage, { expiresAt: number; payload: RemoteDailyContentResponse }>();

const FEED_SOURCES: Record<RemoteSectionKey, Partial<Record<AppLanguage, FeedSource[]>>> = {
  reflections: {
    es: [
      {
        id: 'nuestro-pan-diario',
        url: 'https://nuestropandiario.org/feed/',
        accent: 'gold',
        sourceName: { es: 'Nuestro Pan Diario', en: 'Our Daily Bread' },
        sourceLabel: { es: 'Abrir reflexion', en: 'Open reflection' },
        fallbackTitle: { es: 'Nueva reflexion para hoy', en: 'Fresh reflection for today' },
        fallbackBody: {
          es: 'Se detecto una nueva lectura breve para acompanar el dia con calma y enfoque.',
          en: 'A new short reading is available to accompany the day with calm and focus.',
        },
      },
      {
        id: 'aleteia-es-reflection',
        url: 'https://es.aleteia.org/feed/',
        accent: 'olive',
        sourceName: { es: 'Aleteia', en: 'Aleteia' },
        sourceLabel: { es: 'Abrir reflexion', en: 'Open reflection' },
        fallbackTitle: { es: 'Nueva reflexion para hoy', en: 'Fresh reflection for today' },
        fallbackBody: {
          es: 'Se encontro otra lectura reciente para acompanar tu tiempo con la Palabra.',
          en: 'Another recent reading was found to accompany your time in the Word.',
        },
      },
    ],
    en: [
      {
        id: 'odb-en',
        url: 'https://ourdailybread.org/feed/',
        accent: 'gold',
        sourceName: { es: 'Our Daily Bread', en: 'Our Daily Bread' },
        sourceLabel: { es: 'Abrir reflexion', en: 'Open reflection' },
        fallbackTitle: { es: 'Nueva reflexion para hoy', en: 'Fresh reflection for today' },
        fallbackBody: {
          es: 'Hay una lectura reciente lista para acompanar la meditacion de hoy.',
          en: 'A recent reading is ready to accompany today\'s meditation.',
        },
      },
      {
        id: 'aleteia-en-reflection',
        url: 'https://aleteia.org/feed/',
        accent: 'olive',
        sourceName: { es: 'Aleteia', en: 'Aleteia' },
        sourceLabel: { es: 'Abrir reflexion', en: 'Open reflection' },
        fallbackTitle: { es: 'Nueva reflexion para hoy', en: 'Fresh reflection for today' },
        fallbackBody: {
          es: 'Hay otra lectura reciente disponible para hoy.',
          en: 'Another recent reading is available for today.',
        },
      },
    ],
  },
  sermons: {
    es: [
      {
        id: 'desiring-god-youtube',
        url: 'https://www.youtube.com/feeds/videos.xml?user=desiringGod',
        accent: 'emerald',
        sourceName: { es: 'Desiring God', en: 'Desiring God' },
        sourceLabel: { es: 'Abrir predica', en: 'Open sermon' },
        fallbackTitle: { es: 'Nueva predica disponible', en: 'New sermon available' },
        fallbackBody: {
          es: 'Se encontro una ensenanza reciente para escuchar o leer hoy.',
          en: 'A recent teaching is available to read or listen to today.',
        },
      },
      {
        id: 'lifechurch-youtube',
        url: 'https://www.youtube.com/feeds/videos.xml?user=LifeChurchTV',
        accent: 'blue',
        sourceName: { es: 'Life.Church', en: 'Life.Church' },
        sourceLabel: { es: 'Abrir predica', en: 'Open sermon' },
        fallbackTitle: { es: 'Nueva predica disponible', en: 'New sermon available' },
        fallbackBody: {
          es: 'Hay una predica reciente lista para acompanar la lectura de hoy.',
          en: 'A recent sermon is ready to accompany today\'s reading.',
        },
      },
      {
        id: 'tony-evans-youtube',
        url: 'https://www.youtube.com/feeds/videos.xml?user=drtonyevans',
        accent: 'gold',
        sourceName: { es: 'Tony Evans', en: 'Tony Evans' },
        sourceLabel: { es: 'Abrir predica', en: 'Open sermon' },
        fallbackTitle: { es: 'Nueva predica disponible', en: 'New sermon available' },
        fallbackBody: {
          es: 'Se encontro un nuevo mensaje para reforzar la aplicacion biblica del dia.',
          en: 'A new message was found to deepen the day\'s biblical application.',
        },
      },
    ],
    en: [
      {
        id: 'desiring-god-youtube',
        url: 'https://www.youtube.com/feeds/videos.xml?user=desiringGod',
        accent: 'emerald',
        sourceName: { es: 'Desiring God', en: 'Desiring God' },
        sourceLabel: { es: 'Abrir predica', en: 'Open sermon' },
        fallbackTitle: { es: 'Nueva predica disponible', en: 'New sermon available' },
        fallbackBody: {
          es: 'Hay una nueva ensenanza disponible para hoy.',
          en: 'A new teaching is available for today.',
        },
      },
      {
        id: 'lifechurch-youtube',
        url: 'https://www.youtube.com/feeds/videos.xml?user=LifeChurchTV',
        accent: 'blue',
        sourceName: { es: 'Life.Church', en: 'Life.Church' },
        sourceLabel: { es: 'Abrir predica', en: 'Open sermon' },
        fallbackTitle: { es: 'Nueva predica disponible', en: 'New sermon available' },
        fallbackBody: {
          es: 'Hay una predica reciente lista para hoy.',
          en: 'A recent sermon is ready for today.',
        },
      },
      {
        id: 'tony-evans-youtube',
        url: 'https://www.youtube.com/feeds/videos.xml?user=drtonyevans',
        accent: 'gold',
        sourceName: { es: 'Tony Evans', en: 'Tony Evans' },
        sourceLabel: { es: 'Abrir predica', en: 'Open sermon' },
        fallbackTitle: { es: 'Nueva predica disponible', en: 'New sermon available' },
        fallbackBody: {
          es: 'Hay un nuevo mensaje disponible para hoy.',
          en: 'A new message is available for today.',
        },
      },
    ],
  },
  newsItems: {
    es: [
      {
        id: 'aleteia-es',
        url: 'https://es.aleteia.org/feed/',
        accent: 'gold',
        sourceName: { es: 'Aleteia', en: 'Aleteia' },
        sourceLabel: { es: 'Abrir noticia', en: 'Open story' },
        fallbackTitle: { es: 'Actualizacion reciente', en: 'Recent update' },
        fallbackBody: {
          es: 'Hay una actualizacion reciente lista para leer.',
          en: 'A recent update is ready to read.',
        },
      },
      {
        id: 'vatican-es',
        url: 'https://www.vaticannews.va/es.rss.xml',
        accent: 'olive',
        sourceName: { es: 'Vatican News', en: 'Vatican News' },
        sourceLabel: { es: 'Abrir noticia', en: 'Open story' },
        fallbackTitle: { es: 'Cobertura en vivo', en: 'Live coverage' },
        fallbackBody: {
          es: 'Se encontro una noticia reciente desde otra fuente cristiana.',
          en: 'A recent story was found from another Christian source.',
        },
      },
    ],
    en: [
      {
        id: 'aleteia-en',
        url: 'https://aleteia.org/feed/',
        accent: 'gold',
        sourceName: { es: 'Aleteia', en: 'Aleteia' },
        sourceLabel: { es: 'Abrir noticia', en: 'Open story' },
        fallbackTitle: { es: 'Actualizacion reciente', en: 'Recent update' },
        fallbackBody: {
          es: 'Hay una actualizacion reciente lista para leer.',
          en: 'A recent update is ready to read.',
        },
      },
      {
        id: 'vatican-en',
        url: 'https://www.vaticannews.va/en.rss.xml',
        accent: 'olive',
        sourceName: { es: 'Vatican News', en: 'Vatican News' },
        sourceLabel: { es: 'Abrir noticia', en: 'Open story' },
        fallbackTitle: { es: 'Cobertura en vivo', en: 'Live coverage' },
        fallbackBody: {
          es: 'Se encontro una noticia reciente desde otra fuente.',
          en: 'A recent story was found from another source.',
        },
      },
    ],
  },
  videos: {
    es: [
      {
        id: 'bibleproject-video',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCVfwlh9XpX2Y_tQfjeln9QA',
        accent: 'blue',
        sourceName: { es: 'BibleProject', en: 'BibleProject' },
        sourceLabel: { es: 'Ver video', en: 'Watch video' },
        fallbackTitle: { es: 'Nuevo video del dia', en: 'Fresh video for today' },
        fallbackBody: {
          es: 'Se detecto un video reciente para acompanar la lectura de hoy.',
          en: 'A recent video was found to accompany today\'s reading.',
        },
      },
    ],
    en: [
      {
        id: 'bibleproject-video',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCVfwlh9XpX2Y_tQfjeln9QA',
        accent: 'blue',
        sourceName: { es: 'BibleProject', en: 'BibleProject' },
        sourceLabel: { es: 'Ver video', en: 'Watch video' },
        fallbackTitle: { es: 'Nuevo video del dia', en: 'Fresh video for today' },
        fallbackBody: {
          es: 'Se detecto un video reciente para hoy.',
          en: 'A recent video was detected for today.',
        },
      },
    ],
  },
  testimonies: {
    es: [
      {
        id: 'aleteia-es-testimony',
        url: 'https://es.aleteia.org/feed/',
        accent: 'rose',
        sourceName: { es: 'Aleteia', en: 'Aleteia' },
        sourceLabel: { es: 'Abrir historia', en: 'Open story' },
        fallbackTitle: { es: 'Nuevo testimonio disponible', en: 'Fresh testimony available' },
        fallbackBody: {
          es: 'Se encontro una historia reciente para fortalecer la fe en el dia a dia.',
          en: 'A recent story was found to strengthen faith in everyday life.',
        },
      },
      {
        id: 'guideposts-stories',
        url: 'https://guideposts.org/feed/',
        accent: 'rose',
        sourceName: { es: 'Guideposts', en: 'Guideposts' },
        sourceLabel: { es: 'Abrir historia', en: 'Open story' },
        fallbackTitle: { es: 'Nuevo testimonio disponible', en: 'Fresh testimony available' },
        fallbackBody: {
          es: 'Se encontro una historia reciente de fe y restauracion.',
          en: 'A recent story of faith and restoration was found.',
        },
      },
    ],
    en: [
      {
        id: 'guideposts-stories',
        url: 'https://guideposts.org/feed/',
        accent: 'rose',
        sourceName: { es: 'Guideposts', en: 'Guideposts' },
        sourceLabel: { es: 'Abrir historia', en: 'Open story' },
        fallbackTitle: { es: 'Nuevo testimonio disponible', en: 'Fresh testimony available' },
        fallbackBody: {
          es: 'Se encontro una historia reciente de fe y restauracion.',
          en: 'A recent story of faith and restoration was found.',
        },
      },
    ],
  },
};

function decodeEntities(input: string) {
  return input
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-fA-F]+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(input?: string) {
  if (!input) {
    return '';
  }

  return decodeEntities(input)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(input: string, maxLength: number) {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function sanitizeId(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extractFirstImageUrl(input?: string) {
  if (!input) {
    return undefined;
  }

  const match = input.match(/https?:\/\/[^\s"'>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'>]*)?/i);
  return match?.[0];
}

function fetchXmlWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  return fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Bible NJ Feed/1.0',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  }).finally(() => clearTimeout(timeout));
}

async function fetchFeedItems(source: FeedSource) {
  const response = await fetchXmlWithTimeout(source.url);
  if (!response.ok) {
    throw new Error(`Feed request failed with ${response.status}`);
  }

  const xml = await response.text();
  const parsed = await parser.parseString(xml);
  return parsed.items ?? [];
}

function buildRemoteCard(language: AppLanguage, source: FeedSource, item: RemoteFeedItem): RemoteCardCandidate | null {
  const sourceUrl = item.link?.trim();
  if (!sourceUrl) {
    return null;
  }

  const itemTitle = stripHtml(item.title);
  const snippet = stripHtml(item.contentSnippet || item.summary || item['content:encoded'] || item.content);
  const publishedAt = Number.isFinite(Date.parse(item.isoDate || item.pubDate || ''))
    ? Date.parse(item.isoDate || item.pubDate || '')
    : 0;
  const imageUrl = item.enclosure?.url || extractFirstImageUrl(item['content:encoded']) || extractFirstImageUrl(item.content) || extractFirstImageUrl(item.summary);

  return {
    id: sanitizeId(`${source.id}-${item.guid || sourceUrl || itemTitle}`) || `${source.id}-${publishedAt}`,
    title: truncateText(itemTitle || source.fallbackTitle[language], 96),
    body: truncateText(snippet || source.fallbackBody[language], 180),
    imageUrl,
    imageAlt: itemTitle || source.fallbackTitle[language],
    sourceName: source.sourceName[language],
    sourceUrl,
    sourceLabel: source.sourceLabel[language],
    accent: source.accent,
    publishedAt,
  };
}

function dedupeAndTrim(cards: RemoteCardCandidate[], limit: number) {
  const seen = new Set<string>();

  return cards
    .sort((left, right) => right.publishedAt - left.publishedAt)
    .filter((card) => {
      const dedupeKey = card.sourceUrl || card.id;
      if (seen.has(dedupeKey)) {
        return false;
      }

      seen.add(dedupeKey);
      return true;
    })
    .slice(0, limit)
    .map(({ publishedAt: _publishedAt, ...card }) => card);
}

async function fetchSectionCards(language: AppLanguage, sectionKey: RemoteSectionKey) {
  const sources = FEED_SOURCES[sectionKey][language] ?? [];
  if (sources.length === 0) {
    return [];
  }

  const cards = await Promise.all(sources.map(async (source) => {
    try {
      const items = await fetchFeedItems(source);
      return items
        .map((item) => buildRemoteCard(language, source, item))
        .filter((card): card is RemoteCardCandidate => Boolean(card));
    } catch (error) {
      console.error(`Daily content feed error for ${sectionKey}/${source.id}:`, error);
      return [];
    }
  }));

  return dedupeAndTrim(cards.flat(), SECTION_LIMIT);
}

async function buildRemoteDailyContent(language: AppLanguage): Promise<RemoteDailyContentResponse> {
  const [reflections, sermons, newsItems, videos, testimonies] = await Promise.all([
    fetchSectionCards(language, 'reflections'),
    fetchSectionCards(language, 'sermons'),
    fetchSectionCards(language, 'newsItems'),
    fetchSectionCards(language, 'videos'),
    fetchSectionCards(language, 'testimonies'),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    reflections,
    sermons,
    newsItems,
    videos,
    testimonies,
  };
}

export async function getRemoteDailyContent(language: AppLanguage) {
  const cached = dailyContentCache.get(language);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const payload = await buildRemoteDailyContent(language);
  dailyContentCache.set(language, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload,
  });

  return payload;
}
