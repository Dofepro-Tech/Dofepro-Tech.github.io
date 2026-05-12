import { normalizeAppLanguage } from '@/src/lib/language';

export type DailyCompanionKind = 'image' | 'video' | 'reflection' | 'testimony' | 'news';
export type DailyCompanionAction = 'verse' | 'study' | 'daily' | 'books' | 'share';

export interface DailyCompanionItem {
  id: DailyCompanionKind;
  title: string;
  summary: string;
  body: string;
  meta: string;
  action: DailyCompanionAction;
  ctaLabel: string;
}

const content = {
  es: {
    image: [
      {
        id: 'image',
        title: 'Luz para empezar con calma',
        summary: 'Una pausa visual para volver al versículo del día con serenidad.',
        body: 'Una escena inspirada en la Palabra para acompañar tu lectura y ayudarte a comenzar con calma.',
        meta: 'Inspiración visual del día',
        action: 'verse',
        ctaLabel: 'Abrir versículo',
      },
      {
        id: 'image',
        title: 'Un recordatorio para guardar en mente',
        summary: 'La imagen de hoy resume el tono espiritual de esta jornada.',
        body: 'Una tarjeta breve para mirar, respirar y volver al mensaje central del pasaje.',
        meta: 'Tarjeta visual diaria',
        action: 'verse',
        ctaLabel: 'Ver pasaje',
      },
    ],
    video: [
      {
        id: 'video',
        title: 'Devocional breve para hoy',
        summary: 'Un contenido corto para escuchar y volver al enfoque principal del día.',
        body: 'Un devocional ágil para acompañar tu lectura con una idea clara y una pausa de fe.',
        meta: 'Devocional en formato breve',
        action: 'study',
        ctaLabel: 'Abrir estudio',
      },
      {
        id: 'video',
        title: 'Meditación guiada del día',
        summary: 'Ideal para móvil cuando solo tienes unos minutos disponibles.',
        body: 'Una meditación breve para escuchar, respirar y mantener presente el mensaje del día.',
        meta: 'Momento de enfoque',
        action: 'study',
        ctaLabel: 'Estudiar ahora',
      },
    ],
    reflection: [
      {
        id: 'reflection',
        title: 'Reflexión para aterrizar la lectura',
        summary: 'No todo se resuelve leyendo más; a veces toca detenerse y escuchar.',
        body: 'Una reflexión corta para pasar del texto a la vida diaria con más claridad.',
        meta: 'Pensamiento del día',
        action: 'daily',
        ctaLabel: 'Abrir desafío',
      },
      {
        id: 'reflection',
        title: 'Un pensamiento para acompañar tu jornada',
        summary: 'Una idea sencilla para guardar en el corazón durante el día.',
        body: 'Un espacio breve para meditar y volver al pasaje con una mirada más personal.',
        meta: 'Reflexión diaria',
        action: 'daily',
        ctaLabel: 'Continuar',
      },
    ],
    testimony: [
      {
        id: 'testimony',
        title: 'Testimonio para fortalecer la fe',
        summary: 'Historias reales recuerdan que la Palabra sigue produciendo fruto hoy.',
        body: 'Una historia de fe, perseverancia y esperanza para acompañar tu lectura.',
        meta: 'Historia inspiradora',
        action: 'daily',
        ctaLabel: 'Ver experiencia',
      },
      {
        id: 'testimony',
        title: 'Una historia para no caminar solo',
        summary: 'Cuando alguien más atravesó un proceso similar, la lectura adquiere otra cercanía.',
        body: 'Un testimonio cercano para recordar que la fe también se vive en procesos reales.',
        meta: 'Voz de esperanza',
        action: 'daily',
        ctaLabel: 'Abrir rutina',
      },
    ],
    news: [
      {
        id: 'news',
        title: 'Noticias y enfoque de oración',
        summary: 'Un resumen para mirar la actualidad con criterio, compasión y oración.',
        body: 'Una mirada breve a la actualidad desde una perspectiva de fe y discernimiento.',
        meta: 'Actualidad del día',
        action: 'books',
        ctaLabel: 'Seguir leyendo',
      },
      {
        id: 'news',
        title: 'Actualidad para discernir y orar',
        summary: 'Una noticia breve para pensar el presente con sabiduría y oración.',
        body: 'Una selección corta para mirar lo que sucede hoy sin perder el enfoque espiritual.',
        meta: 'Panorama diario',
        action: 'books',
        ctaLabel: 'Ir a la Biblia',
      },
    ],
  },
  en: {
    image: [
      {
        id: 'image',
        title: 'Light to begin with calm',
        summary: 'A visual pause that brings you back to today’s verse with calm.',
        body: 'A simple visual scene inspired by Scripture to accompany your reading.',
        meta: 'Daily visual inspiration',
        action: 'verse',
        ctaLabel: 'Open verse',
      },
      {
        id: 'image',
        title: 'A reminder to keep in mind',
        summary: 'Today’s image captures the spiritual tone of the day.',
        body: 'A short visual reminder to return to the central message of the passage.',
        meta: 'Daily visual card',
        action: 'verse',
        ctaLabel: 'View passage',
      },
    ],
    video: [
      {
        id: 'video',
        title: 'Short devotional for today',
        summary: 'A short piece to listen to and return to today’s main focus.',
        body: 'A brief devotional to accompany your reading with one clear idea.',
        meta: 'Short devotional format',
        action: 'study',
        ctaLabel: 'Open study',
      },
      {
        id: 'video',
        title: 'Guided meditation of the day',
        summary: 'Ideal on mobile when you only have a few minutes available.',
        body: 'A brief meditation to listen, pause, and keep the message close.',
        meta: 'Short focus moment',
        action: 'study',
        ctaLabel: 'Study now',
      },
    ],
    reflection: [
      {
        id: 'reflection',
        title: 'Reflection to ground the reading',
        summary: 'Not everything is solved by reading more; sometimes you need to stop and listen.',
        body: 'A short reflection to move from reading into daily life with clarity.',
        meta: 'Thought for today',
        action: 'daily',
        ctaLabel: 'Open challenge',
      },
      {
        id: 'reflection',
        title: 'A thought to carry through the day',
        summary: 'A simple idea to keep close through the day.',
        body: 'A brief space to meditate and return to the passage with a personal lens.',
        meta: 'Daily reflection',
        action: 'daily',
        ctaLabel: 'Continue',
      },
    ],
    testimony: [
      {
        id: 'testimony',
        title: 'A testimony to strengthen faith',
        summary: 'Real stories remind us that Scripture still bears fruit today.',
        body: 'A story of faith, perseverance, and hope to accompany your reading.',
        meta: 'Inspiring story',
        action: 'daily',
        ctaLabel: 'View experience',
      },
      {
        id: 'testimony',
        title: 'A story so you do not walk alone',
        summary: 'When someone else walked through a similar season, the reading feels closer and more human.',
        body: 'A close and human testimony that reminds you faith is also lived through real seasons.',
        meta: 'Voice of hope',
        action: 'daily',
        ctaLabel: 'Open routine',
      },
    ],
    news: [
      {
        id: 'news',
        title: 'News and prayer focus',
        summary: 'A summary that helps you look at current events with discernment, compassion, and prayer.',
        body: 'A short look at current events from a faith-centered perspective.',
        meta: 'Daily current events',
        action: 'books',
        ctaLabel: 'Keep reading',
      },
      {
        id: 'news',
        title: 'Current events for discernment and prayer',
        summary: 'A short news snapshot to think about the present with wisdom and prayer.',
        body: 'A brief selection to look at today without losing your spiritual focus.',
        meta: 'Daily overview',
        action: 'books',
        ctaLabel: 'Go to the Bible',
      },
    ],
  },
} as const;

const ORDER: DailyCompanionKind[] = ['image', 'video', 'reflection', 'testimony', 'news'];

export function getDailyCompanion(language: string): DailyCompanionItem[] {
  const normalizedLanguage = normalizeAppLanguage(language) === 'en' ? 'en' : 'es';
  const rotationSeed = new Date().getDate() + (new Date().getMonth() * 31);
  const localizedContent = content[normalizedLanguage];

  return ORDER.map((kind, index) => {
    const options = localizedContent[kind];
    return options[(rotationSeed + index) % options.length];
  });
}