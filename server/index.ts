import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { getBibleVersion, normalizeAppLanguage } from '../src/lib/language.ts';
import type { ChapterData, ChatMessage, StudyStep } from '../src/types.ts';
import {
  generateAiText,
  getAiErrorDetails,
  getAvailableAiModels,
  getCurrentAiModel,
  getCurrentAiProvider,
  isAiProviderConfigured,
  isClientModelOverrideAllowed,
} from './aiProvider.ts';
import { searchBible } from './bibleSearch.ts';
import { getRemoteDailyContent } from './dailyContentFeed.ts';
import { FALLBACK_BIBLE_BOOKS } from '../src/lib/fallbackBooks.ts';

type ExplainType = 'explica' | 'contexto' | 'aplicacion';
type StudyMode = 'book' | 'theme';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distIndexPath = path.resolve(projectRoot, 'dist', 'index.html');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

const app = express();
const serverStartedAt = new Date().toISOString();
const API_BIBLE_BASE_URL = 'https://rest.api.bible/v1';
const DEFAULT_ENGLISH_BIBLE_ID = 'de4e12af7f28f599-01';
const RVR1909_USX_BASE_URL = 'https://raw.githubusercontent.com/BibleAquifer/ReinaValera1909/main/spa/usx';
const RVR1909_BOOK_CODES = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];
const rvr1909BookCache = new Map<string, Promise<string>>();
const explicitAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const supabaseEmailRedirectUrl = (process.env.SUPABASE_EMAIL_REDIRECT_URL || 'https://bibliadj.dofepro.do/?auth=confirmed').trim();
const allowedOrigins = new Set([
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://127.0.0.1:3000',
  'https://localhost',
  'https://bibliadj.dofepro.do',
  'capacitor://localhost',
  'ionic://localhost',
  process.env.APP_URL || '',
  process.env.OPENROUTER_SITE_URL || '',
  ...explicitAllowedOrigins,
].filter(Boolean));

function isAllowedLanOrigin(origin: string) {
  return /^https?:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isAllowedLanOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));

function sendError(response: Response, statusCode: number, message: string) {
  response.status(statusCode).json({ error: message });
}

function isExplainType(value: unknown): value is ExplainType {
  return value === 'explica' || value === 'contexto' || value === 'aplicacion';
}

function isStudyMode(value: unknown): value is StudyMode {
  return value === 'book' || value === 'theme';
}

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every((message) => {
    return (
      typeof message === 'object' &&
      message !== null &&
      (message.role === 'user' || message.role === 'model') &&
      typeof message.content === 'string'
    );
  });
}

function isVerseReference(value: unknown): value is NonNullable<StudyStep['verseReference']> {
  const candidate = value as {
    bookAbrev?: unknown;
    chapter?: unknown;
    verseNumber?: unknown;
  };

  return (
    typeof value === 'object' &&
    value !== null &&
    typeof candidate.bookAbrev === 'string' &&
    typeof candidate.chapter === 'number' &&
    Number.isFinite(candidate.chapter) &&
    typeof candidate.verseNumber === 'number' &&
    Number.isFinite(candidate.verseNumber)
  );
}

function parseStudyStep(rawResponse: string | undefined): StudyStep {
  if (!rawResponse) {
    throw new Error('Empty study step response.');
  }

  const trimmedResponse = rawResponse.trim();
  const jsonCandidate = trimmedResponse.startsWith('```')
    ? trimmedResponse.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    : trimmedResponse;
  const firstBraceIndex = jsonCandidate.indexOf('{');
  const lastBraceIndex = jsonCandidate.lastIndexOf('}');
  const normalizedJson = firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex
    ? jsonCandidate.slice(firstBraceIndex, lastBraceIndex + 1)
    : jsonCandidate;

  const parsedResponse = JSON.parse(normalizedJson);
  const isValidStep =
    typeof parsedResponse === 'object' &&
    parsedResponse !== null &&
    typeof parsedResponse.title === 'string' &&
    typeof parsedResponse.content === 'string' &&
    typeof parsedResponse.prompt === 'string' &&
    (parsedResponse.verseReference === undefined || isVerseReference(parsedResponse.verseReference));

  if (!isValidStep) {
    throw new Error('Invalid study step response.');
  }

  return parsedResponse as StudyStep;
}

function getSystemInstruction(language: 'en' | 'es') {
  if (language === 'en') {
    return `You are a biblical scholar, theologian, and wise, empathetic spiritual guide.
The user will share a Bible verse or chapter.
Your goal is to provide deep insights, historical context, or practical application of the Word.
Be reverent, clear, and accessible for believers of all levels.
If asked to 'Explain', break down the meaning.
If asked for 'Context', explain who wrote it, to whom, and the cultural and historical situation.
If asked for 'Application', suggest how to live this verse today.
Return results using Markdown for an enjoyable reading experience.
Do not go on too long unless asked; keep your answers concise and easy to read.
ALWAYS respond in English.`;
  }

  return `Eres un erudito bíblico, teólogo y guía espiritual sabio y empático.
El usuario te compartirá un versículo o capítulo de la Biblia.
Tu objetivo es proveer percepciones profundas, contexto histórico o aplicación práctica de la Palabra.
Sé reverente, claro y accesible para creyentes de todos los niveles.
Si se te pide 'Explicar', desglosa el significado.
Si se te pide 'Contexto', explica quién lo escribió, a quién y la situación cultural e histórica.
Si se te pide 'Aplicación', sugiere cómo vivir este versículo hoy.
Retorna resultados usando Markdown para una lectura agradable.
No te extiendas demasiado a menos que se te pida; mantén tus respuestas concisas y fáciles de leer.
SIEMPRE responde en Español.`;
}

function getExplainPrompt(language: 'en' | 'es', book: string, chapter: number, verse: number, text: string, type: ExplainType) {
  if (language === 'en') {
    return `Analyze the following verse: ${book} ${chapter}:${verse} - "${text}".\nPlease give me a ${type === 'explica' ? 'deep and spiritual explanation' : type === 'contexto' ? 'historical and cultural context' : 'practical application for my daily life'} of this passage.`;
  }

  return `Analiza el siguiente versículo: ${book} ${chapter}:${verse} - "${text}".\nPor favor, dame un(a) ${type === 'explica' ? 'explicación profunda y espiritual' : type === 'contexto' ? 'contexto histórico y cultural' : 'aplicación práctica para mi vida diaria'} de este pasaje.`;
}

function getStudyPrompt(language: 'en' | 'es', type: StudyMode, target: string, previousSteps: StudyStep[]) {
  if (language === 'en') {
    return `You are creating a guided Bible study session.
${type === 'book' ? `The book of study is: ${target}` : `The theme of study is: ${target}`}

Previous steps of the study: ${JSON.stringify(previousSteps)}

Your task is to generate the NEXT logical step of the study.
Return a JSON object with the following structure:
{
  "title": "Brief title of the step",
  "content": "Deep, devotional, and theological explanation of the current concept (in Markdown)",
  "prompt": "A reflection question or action for the user",
  "verseReference": {
    "bookAbrev": "Book abbreviation (e.g., Gn, Ex, Mt)",
    "chapter": 1,
    "verseNumber": 1
  }
}

Ensure the Biblical reference is real and relevant to the theme or progress in the book.
Use an inspiring and transformative tone. Respond in English.`;
  }

  return `Estás creando una sesión de estudio bíblico guiado.
${type === 'book' ? `El libro objeto de estudio es: ${target}` : `El tema objeto de estudio es: ${target}`}

Pasos anteriores del estudio: ${JSON.stringify(previousSteps)}

Tu tarea es generar el SIGUIENTE paso lógico del estudio.
Retorna un objeto JSON con la siguiente estructura:
{
  "title": "Breve título del paso",
  "content": "Explicación profunda, devocional y teológica del concepto actual (en Markdown)",
  "prompt": "Una pregunta de reflexión o acción para el usuario",
  "verseReference": {
    "bookAbrev": "Abreviatura del libro (ej: Gn, Ex, Mt)",
    "chapter": 1,
    "verseNumber": 1
  }
}

Asegúrate de que la referencia bíblica sea real y relevante para el tema o el progreso en el libro.
Usa un tono inspirador y transformador. Responde en Español.`;
}

function getModelOverride(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

const handleExplain: RequestHandler = async (request, response) => {
  const language = normalizeAppLanguage(request.body?.lang);
  const { book, chapter, verse, text, type } = request.body ?? {};
  const modelOverride = getModelOverride(request.body?.modelOverride);

  if (
    typeof book !== 'string' ||
    typeof chapter !== 'number' ||
    !Number.isFinite(chapter) ||
    typeof verse !== 'number' ||
    !Number.isFinite(verse) ||
    typeof text !== 'string' ||
    !isExplainType(type)
  ) {
    return sendError(response, 400, language === 'en' ? 'Invalid explain request.' : 'Solicitud de explicación inválida.');
  }

  try {
    const textResponse = await generateAiText([
      { role: 'system', content: getSystemInstruction(language) },
      { role: 'user', content: getExplainPrompt(language, book, chapter, verse, text, type) },
    ], {
      temperature: 0.7,
      modelOverride,
    });

    return response.json({
      text: textResponse || (language === 'en' ? 'Could not generate a response.' : 'No se pudo generar una respuesta.'),
    });
  } catch (error) {
    console.error('Explain route error:', error);
    const errorDetails = getAiErrorDetails(
      error,
      language,
      language === 'en' ? 'Could not generate a response.' : 'No se pudo generar una respuesta.',
    );
    return sendError(response, errorDetails.statusCode, errorDetails.message);
  }
};

const handleChat: RequestHandler = async (request, response) => {
  const language = normalizeAppLanguage(request.body?.lang);
  const { book, chapter, verseText, history, message } = request.body ?? {};
  const modelOverride = getModelOverride(request.body?.modelOverride);

  if (
    typeof book !== 'string' ||
    typeof chapter !== 'number' ||
    !Number.isFinite(chapter) ||
    typeof verseText !== 'string' ||
    !isChatMessageArray(history) ||
    typeof message !== 'string'
  ) {
    return sendError(response, 400, language === 'en' ? 'Invalid chat request.' : 'Solicitud de chat inválida.');
  }

  try {
    const textResponse = await generateAiText([
      { role: 'system', content: getSystemInstruction(language) },
      {
        role: 'user',
        content: language === 'en'
          ? `We are talking about this verse: ${book} ${chapter} - "${verseText}"`
          : `Estamos hablando sobre este versículo: ${book} ${chapter} - "${verseText}"`,
      },
      {
        role: 'assistant',
        content: language === 'en'
          ? 'Understood. What would you like to know about this passage?'
          : 'Entendido. ¿Qué te gustaría saber sobre este pasaje?',
      },
      ...history.map((historyItem): { role: 'assistant' | 'user'; content: string } => ({
        role: historyItem.role === 'model' ? 'assistant' : 'user',
        content: historyItem.content,
      })),
      { role: 'user', content: message },
    ], {
      temperature: 0.7,
      modelOverride,
    });

    return response.json({
      text: textResponse || (language === 'en' ? 'No response.' : 'Sin respuesta.'),
    });
  } catch (error) {
    console.error('Chat route error:', error);
    const errorDetails = getAiErrorDetails(
      error,
      language,
      language === 'en' ? 'No response.' : 'Sin respuesta.',
    );
    return sendError(response, errorDetails.statusCode, errorDetails.message);
  }
};

const handleStudyStep: RequestHandler = async (request, response) => {
  const language = normalizeAppLanguage(request.body?.lang);
  const { type, target, previousSteps } = request.body ?? {};
  const modelOverride = getModelOverride(request.body?.modelOverride);

  if (!isStudyMode(type) || typeof target !== 'string' || !Array.isArray(previousSteps)) {
    return sendError(response, 400, language === 'en' ? 'Invalid study request.' : 'Solicitud de estudio inválida.');
  }

  try {
    const textResponse = await generateAiText([
      { role: 'system', content: getSystemInstruction(language) },
      { role: 'user', content: getStudyPrompt(language, type, target, previousSteps as StudyStep[]) },
    ], {
      expectJson: true,
      temperature: 0.7,
      modelOverride,
    });

    return response.json({
      step: parseStudyStep(textResponse),
    });
  } catch (error) {
    console.error('Study route error:', error);
    const errorDetails = getAiErrorDetails(
      error,
      language,
      language === 'en' ? 'Could not generate the study step.' : 'No se pudo generar el paso del estudio.',
    );
    return sendError(response, errorDetails.statusCode, errorDetails.message);
  }
};

const handleBibleSearch: RequestHandler = async (request, response) => {
  const requestedLanguage = typeof request.query.lang === 'string' ? request.query.lang : undefined;
  const language = normalizeAppLanguage(requestedLanguage);
  const query = typeof request.query.query === 'string' ? request.query.query : '';
  const requestedLimit = typeof request.query.limit === 'string' ? Number(request.query.limit) : NaN;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 60;
  const requestedOffset = typeof request.query.offset === 'string' ? Number(request.query.offset) : 0;
  const offset = Number.isFinite(requestedOffset) && requestedOffset > 0 ? Math.floor(requestedOffset) : 0;

  if (query.trim().length < 2) {
    return response.json({
      query: query.trim(),
      total: 0,
      results: [],
      truncated: false,
    });
  }

  try {
    const searchResponse = await searchBible(query, language, limit, offset);
    return response.json(searchResponse);
  } catch (error) {
    console.error('Bible search route error:', error);
    return sendError(response, 500, language === 'en' ? 'Could not complete Bible search.' : 'No se pudo completar la búsqueda bíblica.');
  }
};

const handleBibleRead: RequestHandler = async (request, response) => {
  const book = typeof request.query.book === 'string' ? request.query.book.trim() : '';
  const chapter = typeof request.query.chapter === 'string' ? Number(request.query.chapter) : NaN;
  const language = normalizeAppLanguage(typeof request.query.lang === 'string' ? request.query.lang : undefined);

  if (!book || !Number.isInteger(chapter) || chapter < 1) {
    return sendError(response, 400, language === 'en' ? 'Invalid Bible reference.' : 'Referencia bíblica inválida.');
  }

  try {
    if (language === 'es') {
      const spanishApiKey = process.env.BIBLE_API_KEY;
      const spanishBibleId = process.env.BIBLE_API_ES_BIBLE_ID;
      if (spanishApiKey && spanishBibleId) {
        return response.json(await fetchApiBibleChapter(book, chapter, spanishApiKey, spanishBibleId));
      }
      return response.json(await fetchRvr1909Chapter(book, chapter));
    }

    const apiKey = process.env.BIBLE_API_KEY;
    const bibleId = process.env.BIBLE_API_EN_BIBLE_ID || DEFAULT_ENGLISH_BIBLE_ID;

    if (!apiKey || !bibleId) {
      return sendError(response, 503, 'Bible content is not configured.');
    }

    const chapterId = `${getApiBibleBookId(book)}.${chapter}`;
    const bibleResponse = await fetch(
      `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}?content-type=json&include-notes=false&include-titles=true`,
      { headers: { 'api-key': apiKey } },
    );
    if (!bibleResponse.ok) {
      throw new Error(`API.Bible returned ${bibleResponse.status}.`);
    }

    const apiResponse = await bibleResponse.json() as { data?: { bookId?: string; number?: string; reference?: string; content?: unknown } };
    const verses = extractApiBibleVerses(apiResponse.data?.content);
    if (verses.length === 0) {
      throw new Error('API.Bible returned a chapter without verses.');
    }

    return response.json({
      testament: '',
      name: apiResponse.data?.reference?.replace(/\s+\d+$/, '') || book,
      num_chapters: 0,
      chapter,
      vers: verses,
      version: 'KJV',
    });
  } catch (error) {
    console.error('Bible read route error:', error);
    return sendError(response, 502, language === 'en' ? 'Could not load this Bible chapter.' : 'No se pudo cargar este capítulo bíblico.');
  }
};

async function fetchApiBibleChapter(bookName: string, chapter: number, apiKey: string, bibleId: string): Promise<ChapterData> {
  const chapterId = `${getApiBibleBookId(bookName)}.${chapter}`;
  const bibleResponse = await fetch(
    `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}?content-type=json&include-notes=false&include-titles=true`,
    { headers: { 'api-key': apiKey } },
  );
  if (!bibleResponse.ok) {
    throw new Error(`API.Bible chapter request returned ${bibleResponse.status}.`);
  }

  const apiResponse = await bibleResponse.json() as { data?: { reference?: string; content?: unknown } };
  const verses = extractApiBibleVerses(apiResponse.data?.content);
  if (verses.length === 0) {
    throw new Error('API.Bible returned a chapter without verses.');
  }

  return {
    testament: '',
    name: apiResponse.data?.reference?.replace(/\s+\d+$/, '') || bookName,
    num_chapters: FALLBACK_BIBLE_BOOKS.find((book) => book.names.includes(bookName))?.chapters ?? 0,
    chapter,
    vers: verses,
    version: 'RVR1960',
  };
}

async function fetchRvr1909Chapter(bookName: string, chapter: number) {
  const bookCode = getApiBibleBookId(bookName);
  const bookIndex = RVR1909_BOOK_CODES.indexOf(bookCode);
  if (bookIndex < 0) {
    throw new Error(`RVR1909 does not recognize book ${bookName}.`);
  }

  const paddedBookNumber = String(bookIndex + 1).padStart(2, '0');
  const cacheKey = `${paddedBookNumber}${bookCode}`;
  if (!rvr1909BookCache.has(cacheKey)) {
    rvr1909BookCache.set(cacheKey, (async () => {
      const sourceResponse = await fetch(`${RVR1909_USX_BASE_URL}/${cacheKey}RV09.usx`);
      if (!sourceResponse.ok) {
        throw new Error(`RVR1909 source returned ${sourceResponse.status}.`);
      }
      return sourceResponse.text();
    })().catch((error) => {
      rvr1909BookCache.delete(cacheKey);
      throw error;
    }));
  }

  const usx = await rvr1909BookCache.get(cacheKey)!;
  const chapterStart = new RegExp(`<chapter\\s+number="${chapter}"[^>]*\\/?>`, 'i');
  const startMatch = chapterStart.exec(usx);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(`RVR1909 chapter ${chapter} was not found.`);
  }

  const chapterContent = usx.slice(startMatch.index + startMatch[0].length);
  const nextChapterIndex = chapterContent.search(/<chapter\s+number="\d+"[^>]*\/>/i);
  const chapterUsx = nextChapterIndex >= 0 ? chapterContent.slice(0, nextChapterIndex) : chapterContent;
  const verseMatches = Array.from(chapterUsx.matchAll(/<verse\s+number="(\d+)"[^>]*\/>/gi));
  const vers = verseMatches.map((match, index) => {
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = index + 1 < verseMatches.length ? verseMatches[index + 1].index ?? chapterUsx.length : chapterUsx.length;
    return {
      id: Number(match[1]),
      number: Number(match[1]),
      verse: decodeUsxText(chapterUsx.slice(contentStart, contentEnd)),
    };
  }).filter((verse) => verse.verse);

  if (vers.length === 0) {
    throw new Error(`RVR1909 chapter ${chapter} has no verses.`);
  }

  return { testament: '', name: bookName, num_chapters: 0, chapter, vers, version: 'RVR1909' };
}

function decodeUsxText(value: string) {
  return value
    .replace(/<note[\s\S]*?<\/note>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function getApiBibleBookId(bookName: string) {
  const aliases: Record<string, string> = {
    GENESIS: 'GEN', EXODO: 'EXO', EXODUS: 'EXO', LEVITICO: 'LEV', LEVITICUS: 'LEV',
    NUMEROS: 'NUM', NUMBERS: 'NUM', DEUTERONOMIO: 'DEU', DEUTERONOMY: 'DEU', JOSUE: 'JOS', JOSHUA: 'JOS',
    JUECES: 'JDG', JUDGES: 'JDG', RUT: 'RUT', RUTH: 'RUT', SALMOS: 'PSA', PSALMS: 'PSA',
    PROVERBIOS: 'PRO', PROVERBS: 'PRO', MATEO: 'MAT', MATTHEW: 'MAT', MARCOS: 'MRK', MARK: 'MRK',
    LUCAS: 'LUK', LUKE: 'LUK', JUAN: 'JHN', JOHN: 'JHN', HECHOS: 'ACT', ACTS: 'ACT',
    ROMANOS: 'ROM', ROMANS: 'ROM', APOCALIPSIS: 'REV', REVELATION: 'REV',
  };
  const normalizedName = bookName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const aliasedBookId = aliases[normalizedName];
  if (aliasedBookId) {
    return aliasedBookId;
  }

  const normalizedToken = normalizedName.replace(/[^A-Z0-9]/g, '');
  const fallbackBookIndex = FALLBACK_BIBLE_BOOKS.findIndex((book) => book.names.some((name) => {
    const normalizedAlias = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalizedAlias === normalizedToken;
  }));
  return fallbackBookIndex >= 0 ? RVR1909_BOOK_CODES[fallbackBookIndex] : normalizedToken;
}

function extractApiBibleVerses(content: unknown) {
  const collected = new Map<number, string[]>();

  const visit = (node: unknown, verseNumber?: number) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    const item = node as { text?: unknown; attrs?: { verseId?: unknown }; items?: unknown[] };
    const verseId = typeof item.attrs?.verseId === 'string' ? item.attrs.verseId : undefined;
    const resolvedVerseNumber = verseId ? Number(verseId.split('.').at(-1)) : verseNumber;

    if (typeof item.text === 'string' && Number.isInteger(resolvedVerseNumber)) {
      const parts = collected.get(resolvedVerseNumber) || [];
      parts.push(item.text);
      collected.set(resolvedVerseNumber, parts);
    }

    item.items?.forEach((child) => visit(child, resolvedVerseNumber));
  };

  if (Array.isArray(content)) {
    content.forEach((node) => visit(node));
  }

  return Array.from(collected.entries())
    .map(([number, parts]) => ({ id: number, number, verse: parts.join('').replace(/\s+/g, ' ').trim() }))
    .filter((verse) => verse.verse)
    .sort((left, right) => left.number - right.number);
}

const handleDailyContent: RequestHandler = async (request, response) => {
  const requestedLanguage = typeof request.query.lang === 'string' ? request.query.lang : undefined;
  const language = normalizeAppLanguage(requestedLanguage);

  try {
    const dailyContent = await getRemoteDailyContent(language);
    return response.json(dailyContent);
  } catch (error) {
    console.error('Daily content route error:', error);
    return sendError(response, 500, language === 'en' ? 'Could not load daily content.' : 'No se pudo cargar el contenido diario.');
  }
};

const handleAiRuntimeConfig: RequestHandler = (_request, response) => {
  const provider = getCurrentAiProvider();

  return response.json({
    provider,
    currentModel: getCurrentAiModel(),
    overrideAllowed: isClientModelOverrideAllowed(),
    availableModels: getAvailableAiModels(provider),
  });
};

const handleHealth: RequestHandler = (_request, response) => {
  const provider = getCurrentAiProvider();

  return response.json({
    status: 'ok',
    service: 'biblia-dj-api',
    timestamp: new Date().toISOString(),
    startedAt: serverStartedAt,
    deploymentMode: existsSync(distIndexPath) ? 'fullstack' : 'api-only',
    appUrl: process.env.APP_URL || null,
    ai: {
      provider,
      configured: isAiProviderConfigured(provider),
      currentModel: getCurrentAiModel(),
      overrideAllowed: isClientModelOverrideAllowed(),
    },
  });
};

function registerAiRoutes(routeBase: string) {
  app.post(`${routeBase}/explain`, handleExplain);
  app.post(`${routeBase}/chat`, handleChat);
  app.post(`${routeBase}/study-step`, handleStudyStep);
}

registerAiRoutes('/api/ai');
registerAiRoutes('/api/gemini');
app.get('/api/health', handleHealth);
app.get('/api/ai/runtime', handleAiRuntimeConfig);
app.get('/api/bible/read', handleBibleRead);
app.get('/api/bible/search', handleBibleSearch);
app.get('/api/daily-content', handleDailyContent);

const supabaseAuthUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const ANDROID_OAUTH_REDIRECT_URL = 'com.dofepro.biblianj://auth/callback';

function isAllowedAuthRedirect(value: string) {
  if (value === ANDROID_OAUTH_REDIRECT_URL) {
    return true;
  }

  try {
    const redirect = new URL(value);
    return (redirect.protocol === 'https:' || redirect.protocol === 'http:')
      && allowedOrigins.has(redirect.origin);
  } catch {
    return false;
  }
}

app.get('/api/auth/google', (request, response) => {
  const redirectTo = typeof request.query.redirectTo === 'string' ? request.query.redirectTo : '';
  const codeChallenge = typeof request.query.codeChallenge === 'string' ? request.query.codeChallenge : '';
  if (!supabaseAuthUrl || !supabaseAnonKey) {
    return sendError(response, 503, 'El acceso con cuentas no está configurado en el servidor.');
  }
  if (!isAllowedAuthRedirect(redirectTo) || !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) {
    return sendError(response, 400, 'La dirección de retorno o el desafío OAuth no son válidos.');
  }
  const authorizeUrl = new URL(`${supabaseAuthUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('apikey', supabaseAnonKey);
  authorizeUrl.searchParams.set('redirect_to', redirectTo);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 's256');
  authorizeUrl.searchParams.set('scopes', 'openid email profile');
  return response.json({ url: authorizeUrl.toString() });
});

app.post('/api/auth/exchange', (request, response) => {
  const { code, codeVerifier } = request.body as { code?: unknown; codeVerifier?: unknown };
  if (typeof code !== 'string' || !code || typeof codeVerifier !== 'string' || !/^[a-f0-9]{96}$/.test(codeVerifier)) {
    return sendError(response, 400, 'El código o el verificador OAuth no son válidos.');
  }
  return proxySupabaseAuth(response, 'token?grant_type=pkce', { auth_code: code, code_verifier: codeVerifier });
});

async function proxySupabaseAuth(response: Response, endpoint: string, body: Record<string, unknown>, accessToken?: string, method = 'POST', query?: Record<string, string>) {
  if (!supabaseAuthUrl || !supabaseAnonKey) {
    return sendError(response, 503, 'El acceso con cuentas no está configurado en el servidor.');
  }

  try {
    const upstreamUrl = new URL(`${supabaseAuthUrl}/auth/v1/${endpoint}`);
    Object.entries(query ?? {}).forEach(([key, value]) => upstreamUrl.searchParams.set(key, value));
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await upstream.json().catch(() => ({})) as Record<string, unknown>;

    if (!upstream.ok) {
      const message = [result.msg, result.message, result.error_description, result.error]
        .find((value): value is string => typeof value === 'string');
      return sendError(response, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, message || 'El servicio de autenticación rechazó la solicitud.');
    }

    if (endpoint === 'signup') {
      const returnedSession = result.session && typeof result.session === 'object'
        ? result.session as Record<string, unknown>
        : (typeof result.access_token === 'string' ? result : null);
      return response.status(upstream.status).json({ user: result.user, session: returnedSession });
    }

    if (upstream.status === 204) {
      return response.status(204).end();
    }

    return response.status(upstream.status).json(result);
  } catch (error) {
    console.error('[AUTH] Supabase request failed:', error);
    return sendError(response, 502, 'No se pudo conectar con el servicio de autenticación.');
  }
}

app.post('/api/auth/signup', (request, response) => {
  const { email, password, displayName } = request.body as { email?: unknown; password?: unknown; displayName?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || password.length < 8) {
    return sendError(response, 400, 'Introduce un correo válido y una contraseña de al menos 8 caracteres.');
  }
  if (!isAllowedAuthRedirect(supabaseEmailRedirectUrl)) {
    return sendError(response, 503, 'La dirección de confirmación de cuenta no está configurada correctamente.');
  }

  return proxySupabaseAuth(response, 'signup', {
    email: email.trim().toLowerCase(),
    password,
    data: { display_name: typeof displayName === 'string' ? displayName.trim().slice(0, 80) : '' },
  }, undefined, 'POST', { redirect_to: supabaseEmailRedirectUrl });
});

app.post('/api/auth/resend', (request, response) => {
  const { email } = request.body as { email?: unknown };
  if (typeof email !== 'string' || !email.trim()) {
    return sendError(response, 400, 'Introduce el correo de la cuenta que quieres confirmar.');
  }
  if (!isAllowedAuthRedirect(supabaseEmailRedirectUrl)) {
    return sendError(response, 503, 'La dirección de confirmación de cuenta no está configurada correctamente.');
  }

  return proxySupabaseAuth(response, 'resend', {
    type: 'signup',
    email: email.trim().toLowerCase(),
  }, undefined, 'POST', { redirect_to: supabaseEmailRedirectUrl });
});

app.post('/api/auth/signin', (request, response) => {
  const { email, password } = request.body as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return sendError(response, 400, 'Introduce tu correo y contraseña.');
  }

  return proxySupabaseAuth(response, 'token?grant_type=password', { email: email.trim().toLowerCase(), password });
});

app.post('/api/auth/refresh', (request, response) => {
  const { refreshToken } = request.body as { refreshToken?: unknown };
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return sendError(response, 400, 'La sesión ya no es válida. Inicia sesión de nuevo.');
  }

  return proxySupabaseAuth(response, 'token?grant_type=refresh_token', { refresh_token: refreshToken });
});

app.post('/api/auth/recover', (request, response) => {
  const { email } = request.body as { email?: unknown };
  if (typeof email !== 'string' || !email.trim()) {
    return sendError(response, 400, 'Introduce el correo de tu cuenta.');
  }
  return proxySupabaseAuth(response, 'recover', { email: email.trim().toLowerCase() });
});

app.post('/api/auth/signout', (request, response) => {
  const { accessToken } = request.body as { accessToken?: unknown };
  if (typeof accessToken !== 'string' || !accessToken) {
    return sendError(response, 400, 'La sesión ya no es válida.');
  }
  return proxySupabaseAuth(response, 'logout', {}, accessToken);
});

app.post('/api/auth/profile', (request, response) => {
  const { accessToken, displayName } = request.body as { accessToken?: unknown; displayName?: unknown };
  if (typeof accessToken !== 'string' || !accessToken || typeof displayName !== 'string' || !displayName.trim()) {
    return sendError(response, 400, 'Introduce un nombre para el perfil y una sesión válida.');
  }

  return proxySupabaseAuth(response, 'user', {
    data: { display_name: displayName.trim().slice(0, 80) },
  }, accessToken, 'PUT');
});

interface GameProgressPayload {
  currentLevel: number;
  completedLevels: number[];
  levelStars: Record<number, number>;
  wordsFoundTotal: number;
  rewardPoints: number;
  lastPlayedLevel: number;
}

function getAccessToken(request: Request) {
  return request.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
}

function normalizeGameProgress(value: unknown): GameProgressPayload | null {
  if (!value || typeof value !== 'object') return null;
  const progress = value as Partial<GameProgressPayload>;
  const readInteger = (candidate: unknown, minimum: number, maximum: number) => (
    typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= minimum && candidate <= maximum ? candidate : null
  );
  const currentLevel = readInteger(progress.currentLevel, 1, 250);
  const lastPlayedLevel = readInteger(progress.lastPlayedLevel, 1, 250);
  const wordsFoundTotal = readInteger(progress.wordsFoundTotal, 0, 100000);
  const rewardPoints = readInteger(progress.rewardPoints, 0, 1000000);
  if (currentLevel === null || lastPlayedLevel === null || wordsFoundTotal === null || rewardPoints === null || !Array.isArray(progress.completedLevels)) return null;
  const completedLevels = [...new Set(progress.completedLevels)]
    .filter((level): level is number => typeof level === 'number' && Number.isInteger(level) && level > 0 && level <= 250)
    .sort((left, right) => left - right);
  const levelStars = Object.fromEntries(Object.entries(progress.levelStars ?? {}).filter(([level, stars]) => (
    Number.isInteger(Number(level)) && Number(level) > 0 && Number(level) <= 250 && stars >= 1 && stars <= 3 && Number.isInteger(stars)
  )).map(([level, stars]) => [Number(level), stars]));
  return { currentLevel, completedLevels, levelStars, wordsFoundTotal, rewardPoints, lastPlayedLevel };
}

async function getAuthenticatedUserId(accessToken: string) {
  if (!supabaseAuthUrl || !supabaseAnonKey || !accessToken) return null;
  const profileResponse = await fetch(`${supabaseAuthUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
  });
  const profile = await profileResponse.json().catch(() => null) as { id?: unknown } | null;
  return profileResponse.ok && typeof profile?.id === 'string' ? profile.id : null;
}

app.get('/api/game-progress', async (request, response) => {
  const accessToken = getAccessToken(request);
  if (!supabaseAuthUrl || !supabaseAnonKey) return sendError(response, 503, 'El progreso del juego no está configurado.');
  const userId = await getAuthenticatedUserId(accessToken);
  if (!userId) return sendError(response, 401, 'Tu sesión expiró. Inicia sesión de nuevo para sincronizar el juego.');
  try {
    const result = await fetch(`${supabaseAuthUrl}/rest/v1/user_game_progress?user_id=eq.${encodeURIComponent(userId)}&select=progress&limit=1`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    });
    const payload = await result.json().catch(() => []);
    if (!result.ok) return sendError(response, 502, 'No se pudo cargar el progreso del juego.');
    const progress = Array.isArray(payload) ? normalizeGameProgress(payload[0]?.progress) : null;
    return response.json({ progress });
  } catch {
    return sendError(response, 502, 'No se pudo conectar con el progreso del juego.');
  }
});

app.put('/api/game-progress', async (request, response) => {
  const accessToken = getAccessToken(request);
  const progress = normalizeGameProgress(request.body?.progress);
  if (!supabaseAuthUrl || !supabaseAnonKey) return sendError(response, 503, 'El progreso del juego no está configurado.');
  const userId = await getAuthenticatedUserId(accessToken);
  if (!userId) return sendError(response, 401, 'Tu sesión expiró. Inicia sesión de nuevo para sincronizar el juego.');
  if (!progress) return sendError(response, 400, 'El progreso del juego no es válido.');
  try {
    const result = await fetch(`${supabaseAuthUrl}/rest/v1/user_game_progress?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ user_id: userId, progress, updated_at: new Date().toISOString() }),
    });
    if (!result.ok) return sendError(response, 502, 'No se pudo guardar el progreso del juego.');
    return response.json({ progress });
  } catch {
    return sendError(response, 502, 'No se pudo conectar con el progreso del juego.');
  }
});

interface BibleBookmarkPayload {
  id: string;
  bookAbrev: string;
  chapter: number;
  verseNumber?: number;
  label: string;
  createdAt: number;
}

function normalizeBibleBookmarks(value: unknown): BibleBookmarkPayload[] | null {
  if (!Array.isArray(value) || value.length > 1000) return null;
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const bookmark = entry as Partial<BibleBookmarkPayload>;
    if (
      typeof bookmark.id !== 'string' || !bookmark.id || bookmark.id.length > 80
      || typeof bookmark.bookAbrev !== 'string' || !/^[A-Za-z0-9]{1,12}$/.test(bookmark.bookAbrev)
      || typeof bookmark.chapter !== 'number' || !Number.isInteger(bookmark.chapter) || bookmark.chapter < 1 || bookmark.chapter > 200
      || (bookmark.verseNumber !== undefined && (typeof bookmark.verseNumber !== 'number' || !Number.isInteger(bookmark.verseNumber) || bookmark.verseNumber < 1 || bookmark.verseNumber > 200))
      || typeof bookmark.label !== 'string' || bookmark.label.length > 200
      || typeof bookmark.createdAt !== 'number' || !Number.isFinite(bookmark.createdAt) || bookmark.createdAt < 0
    ) return [];
    return [{
      id: bookmark.id,
      bookAbrev: bookmark.bookAbrev,
      chapter: bookmark.chapter,
      verseNumber: bookmark.verseNumber,
      label: bookmark.label,
      createdAt: bookmark.createdAt,
    }];
  });
}

app.get('/api/user-favorites', async (request, response) => {
  const accessToken = getAccessToken(request);
  if (!supabaseAuthUrl || !supabaseAnonKey) return sendError(response, 503, 'Los favoritos de perfil no están configurados.');
  const userId = await getAuthenticatedUserId(accessToken);
  if (!userId) return sendError(response, 401, 'Tu sesión expiró. Inicia sesión de nuevo para sincronizar tus favoritos.');
  try {
    const result = await fetch(`${supabaseAuthUrl}/rest/v1/user_bible_bookmarks?user_id=eq.${encodeURIComponent(userId)}&select=bookmarks&limit=1`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    });
    const payload = await result.json().catch(() => []);
    if (!result.ok) return sendError(response, 502, 'No se pudieron cargar tus favoritos de perfil.');
    const row = Array.isArray(payload) ? payload[0] : undefined;
    const bookmarks = row ? normalizeBibleBookmarks(row.bookmarks) : null;
    if (row && bookmarks === null) return sendError(response, 502, 'Los favoritos guardados tienen un formato no válido.');
    return response.json({ bookmarks });
  } catch {
    return sendError(response, 502, 'No se pudo conectar con tus favoritos de perfil.');
  }
});

app.put('/api/user-favorites', async (request, response) => {
  const accessToken = getAccessToken(request);
  const bookmarks = normalizeBibleBookmarks(request.body?.bookmarks);
  if (!supabaseAuthUrl || !supabaseAnonKey) return sendError(response, 503, 'Los favoritos de perfil no están configurados.');
  const userId = await getAuthenticatedUserId(accessToken);
  if (!userId) return sendError(response, 401, 'Tu sesión expiró. Inicia sesión de nuevo para sincronizar tus favoritos.');
  if (!bookmarks) return sendError(response, 400, 'La lista de favoritos no es válida.');
  try {
    const result = await fetch(`${supabaseAuthUrl}/rest/v1/user_bible_bookmarks?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ user_id: userId, bookmarks, updated_at: new Date().toISOString() }),
    });
    if (!result.ok) return sendError(response, 502, 'No se pudieron guardar tus favoritos de perfil.');
    return response.json({ bookmarks });
  } catch {
    return sendError(response, 502, 'No se pudo conectar con tus favoritos de perfil.');
  }
});
const opinionsSupabaseUrl = process.env.OPINIONS_SUPABASE_URL;
const opinionsSupabaseKey = process.env.OPINIONS_SUPABASE_SECRET_KEY || process.env.OPINIONS_SUPABASE_SERVICE_ROLE_KEY;

function getOpinionsSupabaseHeaders(extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { apikey: opinionsSupabaseKey || '', ...extraHeaders };
  // New sb_secret keys are API keys, not JWTs; legacy service_role keys are JWTs.
  if (opinionsSupabaseKey && !opinionsSupabaseKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${opinionsSupabaseKey}`;
  }
  return headers;
}

const handleSaveOpinion: RequestHandler = async (request, response) => {
  const content = typeof request.body?.content === 'string' ? request.body.content.trim() : '';
  const submittedAuthor = typeof request.body?.author === 'string' ? request.body.author.trim().slice(0, 80) : '';
  const submittedEmail = typeof request.body?.email === 'string' ? request.body.email.trim().slice(0, 254) : '';
  if (!content) return sendError(response, 400, 'Content is required');
  if (content.length > 2000) return sendError(response, 400, 'Opinion must be 2000 characters or fewer.');
  if (submittedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail)) return sendError(response, 400, 'Introduce un correo electrónico válido.');
  if (!opinionsSupabaseUrl || !opinionsSupabaseKey) return sendError(response, 503, 'Opinions are not configured on the server yet.');

  try {
    let author = submittedAuthor || 'Anonymous';
    let authorEmail = submittedEmail || null;
    const authorization = request.get('authorization') || '';
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

    if (accessToken) {
      if (!supabaseAuthUrl || !supabaseAnonKey) return sendError(response, 503, 'Account verification is not configured.');
      const profileResponse = await fetch(`${supabaseAuthUrl}/auth/v1/user`, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileResponse.json().catch(() => null) as { email?: string; user_metadata?: Record<string, unknown> } | null;
      if (!profileResponse.ok || !profile) return sendError(response, 401, 'Tu sesión expiró. Inicia sesión de nuevo antes de publicar.');
      const metadataName = profile.user_metadata?.full_name ?? profile.user_metadata?.name ?? profile.user_metadata?.display_name;
      author = typeof metadataName === 'string' && metadataName.trim()
        ? metadataName.trim().slice(0, 80)
        : profile.email?.split('@')[0] || author;
      authorEmail = profile.email || authorEmail;
    }

    const result = await fetch(`${opinionsSupabaseUrl.replace(/\/$/, '')}/rest/v1/opinions?select=id,content,author_name,created_at`, {
      method: 'POST',
      headers: getOpinionsSupabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({ content, author_name: author, author_email: authorEmail }),
    });
    const payload = await result.json().catch(() => null);
    if (!result.ok) {
      console.error('[OPINION] Supabase insert failed:', result.status, payload);
      return sendError(response, result.status === 404 ? 503 : 502, result.status === 404
        ? 'Opinions table is missing from Supabase.'
        : 'Could not save the opinion. Please try again.');
    }
    return response.status(201).json(Array.isArray(payload) ? payload[0] : payload);
  } catch (error) {
    console.error('Save opinion error:', error);
    return sendError(response, 502, 'Could not save the opinion.');
  }
};

const handleGetOpinions: RequestHandler = async (_request, response) => {
  if (!opinionsSupabaseUrl || !opinionsSupabaseKey) return sendError(response, 503, 'Opinions are not configured on the server yet.');
  try {
    const result = await fetch(`${opinionsSupabaseUrl.replace(/\/$/, '')}/rest/v1/opinions?select=id,content,author_name,created_at&order=created_at.desc&limit=100`, {
      headers: getOpinionsSupabaseHeaders(),
    });
    const payload = await result.json().catch(() => null);
    if (!result.ok) {
      console.error('[OPINION] Supabase select failed:', result.status, payload);
      return sendError(response, result.status === 404 ? 503 : 502, result.status === 404
        ? 'Opinions table is missing from Supabase.'
        : 'Could not load opinions.');
    }
    return response.json(Array.isArray(payload) ? payload : []);
  } catch (error) {
    console.error('Get opinions error:', error);
    return sendError(response, 502, 'Could not load opinions.');
  }
};
const handleStatsEvent: RequestHandler = async (request, response) => {
  const eventName = request.body?.name;
  const allowedEvents = new Set(['app_open', 'apk_download_click', 'bible_read', 'search_query', 'share_content', 'game_start', 'theme_change']);
  const platform = typeof request.body?.platform === 'string' ? request.body.platform.slice(0, 20) : 'web';
  const appVersion = typeof request.body?.appVersion === 'string' ? request.body.appVersion.slice(0, 32) : null;
  const installationId = typeof request.body?.installationId === 'string' ? request.body.installationId.slice(0, 128) : '';
  if (typeof eventName !== 'string' || !allowedEvents.has(eventName)) return sendError(response, 400, 'Invalid analytics event.');
  if (!opinionsSupabaseUrl || !opinionsSupabaseKey) return sendError(response, 503, 'Analytics storage is not configured.');

  try {
    const baseUrl = opinionsSupabaseUrl.replace(/\/$/, '');
    if (eventName === 'app_open' && installationId && ['android', 'ios'].includes(platform)) {
      const installationHash = createHash('sha256').update(installationId).digest('hex');
      const installResponse = await fetch(`${baseUrl}/rest/v1/app_installations`, {
        method: 'POST',
        headers: getOpinionsSupabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        }),
        body: JSON.stringify({ installation_id_hash: installationHash, platform, app_version: appVersion }),
      });
      if (!installResponse.ok) {
        const payload = await installResponse.text();
        console.error('[ANALYTICS] Supabase install insert failed:', installResponse.status, payload);
        return sendError(response, 502, 'Could not record app installation.');
      }
    }

    const eventResponse = await fetch(`${baseUrl}/rest/v1/app_analytics_events`, {
      method: 'POST',
      headers: getOpinionsSupabaseHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ event_name: eventName, platform, app_version: appVersion }),
    });
    if (!eventResponse.ok) {
      const payload = await eventResponse.text();
      console.error('[ANALYTICS] Supabase event insert failed:', eventResponse.status, payload);
      return sendError(response, 502, 'Could not record analytics event.');
    }
    return response.status(202).json({ status: 'accepted' });
  } catch (error) {
    console.error('Analytics event error:', error);
    return sendError(response, 502, 'Could not record analytics event.');
  }
};

app.post('/api/opinions', handleSaveOpinion);
app.get('/api/opinions', handleGetOpinions);
app.post('/api/stats/event', handleStatsEvent);

if (existsSync(distIndexPath)) {
  const distPath = path.resolve(projectRoot, 'dist');

  app.use(express.static(distPath, {
    index: false,
    setHeaders(response, servedPath) {
      if (servedPath.includes(`${path.sep}assets${path.sep}`)) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      response.setHeader('Cache-Control', 'no-cache');
    },
  }));

  app.get(/^(?!\/api).*/, (request, response) => {
    if (path.extname(request.path)) {
      response.status(404).end();
      return;
    }

    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(distIndexPath);
  });
}

const port = Number(process.env.PORT) || 3001;

// Configuración de Supabase (Nueva v1.0.5)
if (opinionsSupabaseUrl && opinionsSupabaseKey) {
  console.log('[SUPABASE] Conexión detectada y lista para v1.0.5');
}

app.listen(port, () => {
  console.log(`Bible NJ API listening on http://localhost:${port}`);
});
