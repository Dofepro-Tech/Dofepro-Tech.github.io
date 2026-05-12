import type { AiRuntimeConfig, ChatMessage, StudyStep } from '@/src/types';
import { canUseConfiguredApi, resolveConfiguredApiUrl } from '@/src/lib/apiConfig';
import { markBackendReady, warmBackendIfLikelyNeeded } from '@/src/lib/backendStatus';
import { normalizeAppLanguage } from '@/src/lib/language';

const AI_MODEL_OVERRIDE_KEY = 'bible_ai_model_override';
const API_BASE_URL = resolveConfiguredApiUrl('/api/ai');

export function canUseAiFeatures() {
  return canUseConfiguredApi();
}

export function getAiUnavailableMessage(language: 'es' | 'en') {
  return language === 'en'
    ? 'AI features need a configured API service. They are unavailable until the backend is published or the web is served from the same backend origin.'
    : 'Las funciones de IA necesitan una API configurada. No están disponibles hasta publicar el backend o servir la web desde el mismo origen del backend.';
}

function ensureAiFeaturesAvailable(language: 'es' | 'en') {
  if (!canUseAiFeatures()) {
    throw new Error(getAiUnavailableMessage(language));
  }
}

function getStoredModelOverride() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(AI_MODEL_OVERRIDE_KEY) || '';
}

export function setStoredAiModelOverride(modelId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  if (modelId.trim()) {
    localStorage.setItem(AI_MODEL_OVERRIDE_KEY, modelId.trim());
    return;
  }

  localStorage.removeItem(AI_MODEL_OVERRIDE_KEY);
}

export function getStoredAiModelOverride() {
  return getStoredModelOverride();
}

async function postAI<T>(path: string, payload: unknown, language: 'es' | 'en'): Promise<T> {
  ensureAiFeaturesAvailable(language);
  warmBackendIfLikelyNeeded();

  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...((payload as Record<string, unknown>) || {}),
      modelOverride: getStoredModelOverride() || undefined,
    }),
  });
  markBackendReady();

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'AI request failed.');
  }

  return data as T;
}

export async function explainVerse(
  book: string,
  chapter: number,
  verse: number,
  text: string,
  type: 'explica' | 'contexto' | 'aplicacion',
  lang: string = 'es',
): Promise<string> {
  const normalizedLanguage = normalizeAppLanguage(lang);
  const data = await postAI<{ text?: string }>('explain', {
    book,
    chapter,
    verse,
    text,
    type,
    lang: normalizedLanguage,
  }, normalizedLanguage);

  return data.text || (normalizedLanguage === 'en' ? 'Could not generate a response.' : 'No se pudo generar una respuesta.');
}

export async function chatAboutVerse(
  book: string,
  chapter: number,
  verseText: string,
  history: ChatMessage[],
  message: string,
  lang: string = 'es',
): Promise<string> {
  const normalizedLanguage = normalizeAppLanguage(lang);
  const data = await postAI<{ text?: string }>('chat', {
    book,
    chapter,
    verseText,
    history,
    message,
    lang: normalizedLanguage,
  }, normalizedLanguage);

  return data.text || (normalizedLanguage === 'en' ? 'No response.' : 'Sin respuesta.');
}

export async function generateStudyStep(
  type: 'book' | 'theme',
  target: string,
  previousSteps: StudyStep[],
  lang: string = 'es',
): Promise<StudyStep> {
  const normalizedLanguage = normalizeAppLanguage(lang);
  const data = await postAI<{ step: StudyStep }>('study-step', {
    type,
    target,
    previousSteps,
    lang: normalizedLanguage,
  }, normalizedLanguage);

  return data.step;
}

export async function getAiRuntimeConfig(lang: string = 'es'): Promise<AiRuntimeConfig> {
  ensureAiFeaturesAvailable(normalizeAppLanguage(lang));
  warmBackendIfLikelyNeeded();

  const response = await fetch(`${API_BASE_URL}/runtime`);
  markBackendReady();

  if (!response.ok) {
    throw new Error('Could not load AI runtime configuration.');
  }

  return response.json() as Promise<AiRuntimeConfig>;
}