import { getDeterministicIndex, getLocalDateKey } from '@/src/lib/challenges';

export interface DailyVerseReference {
  bookAbrev: string;
  chapter: number;
  verseNumber: number;
  labelEs: string;
  labelEn: string;
}

export interface DailyResourceCard {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  verseReference?: DailyVerseReference;
  quote?: string;
  accent: 'gold' | 'blue' | 'emerald' | 'rose' | 'olive';
  gradient?: string;
}

export type DailyContentKind = 'image' | 'video' | 'reflection' | 'sermon' | 'testimony' | 'news';

export interface DailyContentSection {
  id: string;
  kind: DailyContentKind;
  items: DailyResourceCard[];
}

interface LocalizedDailyResourceCard {
  id: string;
  title: { es: string; en: string };
  body: { es: string; en: string };
  imageUrl?: string;
  imageAlt?: { es: string; en: string };
  sourceName?: { es: string; en: string };
  sourceUrl?: string | { es: string; en: string };
  sourceLabel?: { es: string; en: string };
  verseReference?: DailyVerseReference;
  quote?: { es: string; en: string };
  accent: DailyResourceCard['accent'];
  gradient?: string;
}

interface LocalizedCardVisualPreset {
  imageUrl: string;
  imageAlt: { es: string; en: string };
  gradient: string;
}

const CARD_VISUAL_PRESETS: Record<string, LocalizedCardVisualPreset> = {
  'reflection-grace': {
    imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Biblia abierta con luz suave entrando por una ventana',
      en: 'Open Bible with soft light coming through a window',
    },
    gradient: 'linear-gradient(135deg, rgba(31,94,168,0.94), rgba(246,201,105,0.86))',
  },
  'reflection-peace': {
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Cuaderno y Biblia sobre una mesa en calma',
      en: 'Notebook and Bible on a calm table setting',
    },
    gradient: 'linear-gradient(135deg, rgba(36,126,186,0.92), rgba(124,89,214,0.86))',
  },
  'reflection-bread': {
    imageUrl: 'https://images.unsplash.com/photo-1461773518188-b3e86f98242f?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Amanecer suave sobre un paisaje silencioso',
      en: 'Soft sunrise over a quiet landscape',
    },
    gradient: 'linear-gradient(135deg, rgba(42,100,88,0.94), rgba(240,196,92,0.82))',
  },
  'sermon-hope': {
    imageUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Ambiente de adoracion en una iglesia',
      en: 'Worship atmosphere inside a church',
    },
    gradient: 'linear-gradient(135deg, rgba(18,122,110,0.94), rgba(45,93,178,0.82))',
  },
  'sermon-grace': {
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Microfono listo para una ensenanza',
      en: 'Microphone ready for a teaching session',
    },
    gradient: 'linear-gradient(135deg, rgba(20,103,176,0.92), rgba(246,201,105,0.82))',
  },
  'news-vatican': {
    imageUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Mesa con periodico, laptop y notas de actualidad',
      en: 'Desk with newspaper, laptop, and current events notes',
    },
    gradient: 'linear-gradient(135deg, rgba(62,91,138,0.94), rgba(86,133,102,0.82))',
  },
  'news-aci': {
    imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Lectura de noticias y contexto internacional',
      en: 'Reading news with international context',
    },
    gradient: 'linear-gradient(135deg, rgba(26,97,167,0.94), rgba(97,171,224,0.82))',
  },
  'news-aleteia': {
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Titulares y periodicos extendidos sobre una mesa',
      en: 'Headlines and newspapers spread over a table',
    },
    gradient: 'linear-gradient(135deg, rgba(124,93,32,0.94), rgba(40,84,168,0.8))',
  },
  'video-bibleproject': {
    imageUrl: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Laptop reproduciendo contenido audiovisual',
      en: 'Laptop playing audiovisual content',
    },
    gradient: 'linear-gradient(135deg, rgba(18,102,164,0.94), rgba(30,176,189,0.82))',
  },
  'video-ascension': {
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Pantalla con video y ambiente de proyeccion',
      en: 'Screen with video and projection atmosphere',
    },
    gradient: 'linear-gradient(135deg, rgba(34,110,187,0.94), rgba(246,201,105,0.82))',
  },
  'video-devotional': {
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Mesa creativa con pantalla y auriculares',
      en: 'Creative desk with screen and headphones',
    },
    gradient: 'linear-gradient(135deg, rgba(39,97,174,0.94), rgba(58,154,130,0.82))',
  },
  'testimony-iamsecond': {
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Grupo de personas compartiendo una historia de vida',
      en: 'Group of people sharing a life story',
    },
    gradient: 'linear-gradient(135deg, rgba(172,87,49,0.94), rgba(185,96,129,0.82))',
  },
  'testimony-cbn': {
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Dos personas conversando en un momento de apoyo',
      en: 'Two people talking in a moment of support',
    },
    gradient: 'linear-gradient(135deg, rgba(133,95,36,0.94), rgba(129,74,176,0.82))',
  },
  'testimony-guideposts': {
    imageUrl: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Persona levantando las manos con luz de esperanza',
      en: 'Person raising hands with hopeful light',
    },
    gradient: 'linear-gradient(135deg, rgba(140,93,28,0.94), rgba(214,127,86,0.82))',
  },
};

function localize(card: LocalizedDailyResourceCard, language: 'es' | 'en'): DailyResourceCard {
  const visualPreset = CARD_VISUAL_PRESETS[card.id];

  return {
    id: card.id,
    title: card.title[language],
    body: card.body[language],
    imageUrl: card.imageUrl ?? visualPreset?.imageUrl,
    imageAlt: card.imageAlt?.[language] ?? visualPreset?.imageAlt[language],
    sourceName: card.sourceName?.[language],
    sourceUrl: typeof card.sourceUrl === 'string' ? card.sourceUrl : card.sourceUrl?.[language],
    sourceLabel: card.sourceLabel?.[language],
    verseReference: card.verseReference,
    quote: card.quote?.[language],
    accent: card.accent,
    gradient: card.gradient ?? visualPreset?.gradient,
  };
}

function buildLocalizedRotation(
  cards: LocalizedDailyResourceCard[],
  language: 'es' | 'en',
  seed: string,
) {
  const localizedCards = cards.map((card) => localize(card, language));

  if (localizedCards.length <= 1) {
    return localizedCards;
  }

  const startIndex = getDeterministicIndex(localizedCards.length, seed);
  return localizedCards.slice(startIndex).concat(localizedCards.slice(0, startIndex));
}

export interface DailyContentCollection {
  reflection: DailyResourceCard;
  reflections: DailyResourceCard[];
  sermon: DailyResourceCard;
  sermons: DailyResourceCard[];
  image: DailyResourceCard;
  images: DailyResourceCard[];
  news: DailyResourceCard;
  newsItems: DailyResourceCard[];
  video: DailyResourceCard;
  videos: DailyResourceCard[];
  testimony: DailyResourceCard;
  testimonies: DailyResourceCard[];
  sections: DailyContentSection[];
}

const REFLECTIONS: LocalizedDailyResourceCard[] = [
  {
    id: 'reflection-grace',
    title: { es: 'Una pausa para aterrizar la lectura', en: 'A pause to ground today’s reading' },
    body: {
      es: 'Abre una reflexión breve y deja que la gracia de Dios baje del texto a tu día con más calma y claridad.',
      en: 'Open a short reflection and let God’s grace move from the text into your day with calm and clarity.',
    },
    sourceName: { es: 'Momento Decisivo', en: 'Crosswalk Devotional' },
    sourceUrl: {
      es: 'https://www.crosswalk.com/devotionals/momento-decisivo/',
      en: 'https://www.crosswalk.com/devotionals/crosswalk-devo/',
    },
    sourceLabel: { es: 'Abrir reflexión', en: 'Open reflection' },
    verseReference: {
      bookAbrev: '2Co',
      chapter: 12,
      verseNumber: 9,
      labelEs: '2 Corintios 12:9',
      labelEn: '2 Corinthians 12:9',
    },
    accent: 'gold',
  },
  {
    id: 'reflection-peace',
    title: { es: 'Pensamiento para volver a la paz', en: 'A thought that brings you back to peace' },
    body: {
      es: 'Cuando el día va rápido, esta lectura te ayuda a bajar el ritmo y a escuchar otra vez la voz de Cristo en medio del ruido.',
      en: 'When the day moves fast, this reading helps you slow down and hear Christ’s voice again in the middle of the noise.',
    },
    sourceName: { es: 'Alimento Diario', en: 'Your Daily Prayer' },
    sourceUrl: {
      es: 'https://www.crosswalk.com/devotionals/alimento-diario/',
      en: 'https://www.godtube.com/devotionals/your-daily-prayer/',
    },
    sourceLabel: { es: 'Leer ahora', en: 'Read now' },
    verseReference: {
      bookAbrev: 'Jn',
      chapter: 14,
      verseNumber: 27,
      labelEs: 'Juan 14:27',
      labelEn: 'John 14:27',
    },
    accent: 'blue',
  },
  {
    id: 'reflection-bread',
    title: { es: 'Una lectura breve para volver a lo esencial', en: 'A short reading that brings you back to what matters' },
    body: {
      es: 'Una reflexión corta para reenfocar el corazón, bajar el ruido y seguir leyendo con más claridad espiritual.',
      en: 'A short reflection to refocus your heart, lower the noise, and keep reading with spiritual clarity.',
    },
    sourceName: { es: 'Nuestro Pan Diario', en: 'Our Daily Bread' },
    sourceUrl: {
      es: 'https://es.odb.org/',
      en: 'https://ourdailybread.org/',
    },
    sourceLabel: { es: 'Abrir reflexión', en: 'Open reflection' },
    verseReference: {
      bookAbrev: 'Mt',
      chapter: 11,
      verseNumber: 28,
      labelEs: 'Mateo 11:28',
      labelEn: 'Matthew 11:28',
    },
    accent: 'olive',
  },
];

const IMAGE_CARDS: LocalizedDailyResourceCard[] = [
  {
    id: 'image-light',
    title: { es: 'Luz para arrancar el día', en: 'Light to begin the day' },
    body: {
      es: 'Una pausa visual para volver al pasaje con serenidad y recordar que la Palabra sigue alumbrando el camino.',
      en: 'A visual pause to return to the passage with calm and remember that Scripture still lights the way.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Paisaje montañoso iluminado por el amanecer',
      en: 'Mountain landscape lit by sunrise',
    },
    quote: {
      es: '“Lámpara es a mis pies tu palabra, y lumbrera a mi camino.”',
      en: '“Your word is a lamp for my feet, a light on my path.”',
    },
    sourceUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=90',
    sourceName: { es: 'Imagen remota del día', en: 'Remote image of the day' },
    sourceLabel: { es: 'Ver imagen', en: 'View image' },
    verseReference: {
      bookAbrev: 'Sal',
      chapter: 119,
      verseNumber: 105,
      labelEs: 'Salmo 119:105',
      labelEn: 'Psalm 119:105',
    },
    accent: 'blue',
    gradient: 'linear-gradient(135deg, rgba(18,104,180,0.95), rgba(235,194,74,0.9))',
  },
  {
    id: 'image-hope',
    title: { es: 'Esperanza para sostener la jornada', en: 'Hope to hold through the day' },
    body: {
      es: 'Una promesa para mirar el día con paz, incluso cuando todavía no ves todo el mapa completo.',
      en: 'A promise that helps you face the day with peace, even when you still cannot see the full map.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Lago sereno con montañas al fondo',
      en: 'Calm lake with mountains in the background',
    },
    quote: {
      es: '“Porque yo sé los pensamientos que tengo acerca de vosotros...”',
      en: '“For I know the plans I have for you...”',
    },
    sourceUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=90',
    sourceName: { es: 'Imagen remota del día', en: 'Remote image of the day' },
    sourceLabel: { es: 'Ver imagen', en: 'View image' },
    verseReference: {
      bookAbrev: 'Jer',
      chapter: 29,
      verseNumber: 11,
      labelEs: 'Jeremías 29:11',
      labelEn: 'Jeremiah 29:11',
    },
    accent: 'rose',
    gradient: 'linear-gradient(135deg, rgba(182,64,107,0.92), rgba(243,180,85,0.88))',
  },
  {
    id: 'image-rest',
    title: { es: 'Calma para respirar y seguir', en: 'Calm to breathe and keep going' },
    body: {
      es: 'Otra imagen para acompañar tu lectura con descanso visual y recordar que Dios sigue sosteniendo el camino.',
      en: 'Another image to accompany your reading with visual rest and remember that God still holds the way.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: {
      es: 'Orilla del mar con luz suave al amanecer',
      en: 'Seashore with soft morning light',
    },
    quote: {
      es: '“En paz me acostaré, y asimismo dormiré...”',
      en: '“In peace I will lie down and sleep...”',
    },
    sourceUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=90',
    sourceName: { es: 'Imagen remota del día', en: 'Remote image of the day' },
    sourceLabel: { es: 'Ver imagen', en: 'View image' },
    verseReference: {
      bookAbrev: 'Sal',
      chapter: 4,
      verseNumber: 8,
      labelEs: 'Salmo 4:8',
      labelEn: 'Psalm 4:8',
    },
    accent: 'gold',
    gradient: 'linear-gradient(135deg, rgba(42,122,174,0.94), rgba(246,201,105,0.9))',
  },
];

const SERMONS: LocalizedDailyResourceCard[] = [
  {
    id: 'sermon-hope',
    title: { es: 'Una prédica breve para el día', en: 'A short sermon for today' },
    body: {
      es: 'Abre una prédica o enseñanza real para escuchar una aplicación bíblica clara y seguir profundizando.',
      en: 'Open a real sermon or teaching to hear a clear biblical application and keep going deeper.',
    },
    sourceName: { es: 'YouTube', en: 'YouTube' },
    sourceUrl: {
      es: 'https://www.youtube.com/results?search_query=predica+cristiana+de+hoy',
      en: 'https://www.youtube.com/results?search_query=daily+christian+sermon',
    },
    sourceLabel: { es: 'Abrir prédica', en: 'Open sermon' },
    verseReference: {
      bookAbrev: 'Ro',
      chapter: 12,
      verseNumber: 2,
      labelEs: 'Romanos 12:2',
      labelEn: 'Romans 12:2',
    },
    accent: 'emerald',
  },
  {
    id: 'sermon-grace',
    title: { es: 'Enseñanza para escuchar con calma', en: 'A teaching to hear with calm attention' },
    body: {
      es: 'Una segunda opción para acompañar tu lectura con una explicación más pastoral y directa.',
      en: 'A second option to accompany your reading with a more pastoral and direct explanation.',
    },
    sourceName: { es: 'Desiring God', en: 'Desiring God' },
    sourceUrl: {
      es: 'https://www.youtube.com/results?search_query=predicacion+biblica+esperanza',
      en: 'https://www.desiringgod.org/messages',
    },
    sourceLabel: { es: 'Ver enseñanza', en: 'View teaching' },
    verseReference: {
      bookAbrev: 'He',
      chapter: 4,
      verseNumber: 16,
      labelEs: 'Hebreos 4:16',
      labelEn: 'Hebrews 4:16',
    },
    accent: 'blue',
  },
];

const NEWS_CARDS: LocalizedDailyResourceCard[] = [
  {
    id: 'news-vatican',
    title: { es: 'Noticias para mirar con discernimiento', en: 'News to read with discernment' },
    body: {
      es: 'Abre un portal cristiano actualizado y revisa la actualidad con una mirada de fe y contexto.',
      en: 'Open an updated Christian news portal and read current events through a lens of faith and context.',
    },
    sourceName: { es: 'Vatican News', en: 'Vatican News' },
    sourceUrl: {
      es: 'https://www.vaticannews.va/es.html',
      en: 'https://www.vaticannews.va/en.html',
    },
    sourceLabel: { es: 'Abrir portal', en: 'Open portal' },
    accent: 'olive',
  },
  {
    id: 'news-aci',
    title: { es: 'Portada cristiana del día', en: 'Christian front page for today' },
    body: {
      es: 'Consulta una portada real con noticias y cobertura social para acompañar tu oración y discernimiento.',
      en: 'Check a real front page with news and social coverage to accompany your prayer and discernment.',
    },
    sourceName: { es: 'ACI Prensa', en: 'ACI Prensa' },
    sourceUrl: {
      es: 'https://www.aciprensa.com/',
      en: 'https://cbn.com/news',
    },
    sourceLabel: { es: 'Abrir portada', en: 'Open homepage' },
    accent: 'blue',
  },
  {
    id: 'news-aleteia',
    title: { es: 'Otra mirada a la actualidad cristiana', en: 'Another view of Christian current events' },
    body: {
      es: 'Una segunda portada para seguir noticias, cultura y fe desde otra fuente real y actualizada.',
      en: 'A second front page to follow news, culture, and faith from another real and updated source.',
    },
    sourceName: { es: 'Aleteia', en: 'Christian Today' },
    sourceUrl: {
      es: 'https://es.aleteia.org/',
      en: 'https://www.christiantoday.com/',
    },
    sourceLabel: { es: 'Abrir noticias', en: 'Open news' },
    accent: 'gold',
  },
];

const VIDEO_CARDS: LocalizedDailyResourceCard[] = [
  {
    id: 'video-bibleproject',
    title: { es: 'Meditación guiada en video', en: 'Guided reflection in video' },
    body: {
      es: 'Abre un video real para acompañar tu lectura con una pausa devocional y una idea clara para hoy.',
      en: 'Open a real video to accompany your reading with a devotional pause and one clear idea for today.',
    },
    sourceName: { es: 'GodTube', en: 'GodTube' },
    sourceUrl: 'https://www.godtube.com/watch/?v=GGDLL7NX',
    sourceLabel: { es: 'Ver video', en: 'Watch video' },
    accent: 'emerald',
  },
  {
    id: 'video-ascension',
    title: { es: 'Historia bíblica para ver hoy', en: 'A Bible story to watch today' },
    body: {
      es: 'Un segundo video con narrativa y aplicación para cuando quieras profundizar sin salir de la app por error.',
      en: 'A second video with narrative and application for when you want to go deeper without ending up in a dead action.',
    },
    sourceName: { es: 'GodTube', en: 'GodTube' },
    sourceUrl: 'https://www.godtube.com/watch/?v=EEBCCJNU',
    sourceLabel: { es: 'Abrir video', en: 'Open video' },
    accent: 'gold',
  },
  {
    id: 'video-devotional',
    title: { es: 'Devocional visual para hoy', en: 'A visual devotional for today' },
    body: {
      es: 'Una tercera opción para ver un devocional o enseñanza breve y seguir meditando sin cortar el ritmo.',
      en: 'A third option to watch a short devotional or teaching and keep meditating without losing momentum.',
    },
    sourceName: { es: 'YouTube', en: 'YouTube' },
    sourceUrl: {
      es: 'https://www.youtube.com/results?search_query=devocional+cristiano+de+hoy',
      en: 'https://www.youtube.com/results?search_query=daily+christian+devotional+video',
    },
    sourceLabel: { es: 'Ver devocional', en: 'Watch devotional' },
    accent: 'blue',
  },
];

const TESTIMONIES: LocalizedDailyResourceCard[] = [
  {
    id: 'testimony-iamsecond',
    title: { es: 'Historias que sostienen la fe', en: 'Stories that strengthen faith' },
    body: {
      es: 'Abre un testimonio real de cambio, perseverancia y encuentro con Dios para acompañar tu jornada.',
      en: 'Open a real testimony of change, perseverance, and encounter with God to accompany your day.',
    },
    sourceName: { es: 'CBN', en: 'I Am Second' },
    sourceUrl: {
      es: 'https://es.cbn.com/tags/testimonio',
      en: 'https://www.iamsecond.com/films/',
    },
    sourceLabel: { es: 'Abrir testimonios', en: 'Open testimonies' },
    accent: 'rose',
  },
  {
    id: 'testimony-cbn',
    title: { es: 'Voces de restauración y esperanza', en: 'Voices of restoration and hope' },
    body: {
      es: 'Otra puerta real para leer o ver historias de fe que conectan con la vida cotidiana.',
      en: 'Another real place to read or watch stories of faith that connect with everyday life.',
    },
    sourceName: { es: 'CBN', en: 'CBN' },
    sourceUrl: {
      es: 'https://www1.cbn.com/testimonies',
      en: 'https://cbn.com/tags/testimony',
    },
    sourceLabel: { es: 'Abrir historias', en: 'Open stories' },
    accent: 'olive',
  },
  {
    id: 'testimony-guideposts',
    title: { es: 'Relatos de fe para seguir creyendo', en: 'Faith stories that help you keep believing' },
    body: {
      es: 'Una tercera selección con historias de transformación para acompañar la lectura con esperanza real.',
      en: 'A third selection of transformation stories to accompany your reading with real hope.',
    },
    sourceName: { es: 'Guideposts', en: 'Guideposts' },
    sourceUrl: {
      es: 'https://www.youtube.com/results?search_query=testimonio+cristiano+de+fe',
      en: 'https://guideposts.org/positive-living/guideposts-stories/',
    },
    sourceLabel: { es: 'Abrir testimonio', en: 'Open testimony' },
    accent: 'gold',
  },
];

export function getDailyContent(language: 'es' | 'en', dateKey: string = getLocalDateKey()) {

  const reflections = buildLocalizedRotation(REFLECTIONS, language, `${dateKey}-reflection`);
  const images = buildLocalizedRotation(IMAGE_CARDS, language, `${dateKey}-image`);
  const sermons = buildLocalizedRotation(SERMONS, language, `${dateKey}-sermon`);
  const newsItems = buildLocalizedRotation(NEWS_CARDS, language, `${dateKey}-news`);
  const videos = buildLocalizedRotation(VIDEO_CARDS, language, `${dateKey}-video`);
  const testimonies = buildLocalizedRotation(TESTIMONIES, language, `${dateKey}-testimony`);

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