import { GoogleGenAI } from '@google/genai';
import type { AiModelOption } from '../src/types.ts';

export type AppLanguage = 'en' | 'es';
export type AiProvider = 'openrouter' | 'gemini';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateAiTextOptions {
  temperature?: number;
  expectJson?: boolean;
  modelOverride?: string;
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
  };
};

class AiProviderError extends Error {
  status: number;
  provider: AiProvider;

  constructor(provider: AiProvider, status: number, message: string) {
    super(message);
    this.name = 'AiProviderError';
    this.status = status;
    this.provider = provider;
  }
}

let geminiClient: GoogleGenAI | null = null;

const OPENROUTER_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openrouter',
    description: 'Rápido, económico y equilibrado para chat y explicaciones.',
    recommendedFor: 'Uso diario',
  },
  {
    id: 'openai/gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    provider: 'openrouter',
    description: 'Buena calidad general con latencia contenida.',
    recommendedFor: 'Estudio guiado',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    label: 'Claude 3.5 Haiku',
    provider: 'openrouter',
    description: 'Muy ágil para respuestas cortas y tareas frecuentes.',
    recommendedFor: 'Chat rápido',
  },
  {
    id: 'anthropic/claude-3.7-sonnet',
    label: 'Claude 3.7 Sonnet',
    provider: 'openrouter',
    description: 'Más fino para explicaciones largas y tono más pulido.',
    recommendedFor: 'Reflexión profunda',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash',
    provider: 'openrouter',
    description: 'Rápido y útil para síntesis y respuestas concisas.',
    recommendedFor: 'Resúmenes',
  },
  {
    id: 'deepseek/deepseek-chat',
    label: 'DeepSeek Chat',
    provider: 'openrouter',
    description: 'Alternativa económica para pruebas y tareas generales.',
    recommendedFor: 'Pruebas',
  },
];

const GEMINI_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Modelo rápido para respuestas frecuentes.',
    recommendedFor: 'Uso diario',
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Mejor para contenido más extenso y elaborado.',
    recommendedFor: 'Estudio profundo',
  },
];

function getConfiguredProvider(): AiProvider {
  const explicitProvider = process.env.AI_PROVIDER?.toLowerCase();
  if (explicitProvider === 'openrouter' || explicitProvider === 'gemini') {
    return explicitProvider;
  }

  if (process.env.OPENROUTER_API_KEY) {
    return 'openrouter';
  }

  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }

  return 'openrouter';
}

function getConfiguredModel(provider: AiProvider): string {
  if (provider === 'openrouter') {
    return process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  }

  return process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}

function isModelOverrideAllowed() {
  return process.env.ALLOW_CLIENT_MODEL_OVERRIDE === 'true' || process.env.NODE_ENV !== 'production';
}

function resolveModel(provider: AiProvider, modelOverride?: string) {
  if (isModelOverrideAllowed() && typeof modelOverride === 'string' && modelOverride.trim()) {
    return modelOverride.trim();
  }

  return getConfiguredModel(provider);
}

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AiProviderError('gemini', 500, 'GEMINI_API_KEY is not configured.');
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return geminiClient;
}

function getOpenRouterHeaders() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new AiProviderError('openrouter', 500, 'OPENROUTER_API_KEY is not configured.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const referer = process.env.OPENROUTER_SITE_URL || process.env.APP_URL || 'http://localhost:3000';
  const appName = process.env.OPENROUTER_APP_NAME || 'Biblia NJ';

  if (referer) {
    headers['HTTP-Referer'] = referer;
  }

  if (appName) {
    headers['X-OpenRouter-Title'] = appName;
  }

  return headers;
}

function extractOpenRouterText(data: OpenRouterResponse) {
  const content = data.choices?.[0]?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const combinedText = content
      .filter((item) => item?.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text!.trim())
      .filter(Boolean)
      .join('\n');

    if (combinedText) {
      return combinedText;
    }
  }

  throw new AiProviderError('openrouter', 500, 'Empty response from OpenRouter.');
}

async function generateWithOpenRouter(messages: AiMessage[], options: GenerateAiTextOptions) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: getOpenRouterHeaders(),
    body: JSON.stringify({
      model: resolveModel('openrouter', options.modelOverride),
      messages,
      temperature: options.temperature ?? 0.7,
      ...(options.expectJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const rawText = await response.text();
  let data: OpenRouterResponse = {};

  try {
    data = rawText ? JSON.parse(rawText) as OpenRouterResponse : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errorMessage = data.error?.message || rawText || 'OpenRouter request failed.';
    throw new AiProviderError('openrouter', response.status, errorMessage);
  }

  return extractOpenRouterText(data);
}

async function generateWithGemini(messages: AiMessage[], options: GenerateAiTextOptions) {
  const systemInstruction = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  if (contents.length === 0) {
    throw new AiProviderError('gemini', 400, 'No prompt content was provided.');
  }

  const result = await getGeminiClient().models.generateContent({
    model: resolveModel('gemini', options.modelOverride),
    contents,
    config: {
      systemInstruction: systemInstruction || undefined,
      temperature: options.temperature ?? 0.7,
      ...(options.expectJson ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const text = result.text?.trim();
  if (!text) {
    throw new AiProviderError('gemini', 500, 'Empty response from Gemini.');
  }

  return text;
}

export async function generateAiText(messages: AiMessage[], options: GenerateAiTextOptions = {}) {
  const provider = getConfiguredProvider();

  if (provider === 'openrouter') {
    return generateWithOpenRouter(messages, options);
  }

  return generateWithGemini(messages, options);
}

export function getAiErrorDetails(error: unknown, language: AppLanguage, fallbackMessage: string) {
  const candidate = error as Partial<AiProviderError> & { message?: string };
  const provider = candidate.provider || getConfiguredProvider();
  const statusCode = typeof candidate.status === 'number' ? candidate.status : 500;
  const rawMessage = typeof candidate.message === 'string' ? candidate.message : '';
  const normalizedMessage = rawMessage.toLowerCase();

  if (provider === 'openrouter') {
    if (
      statusCode === 402 ||
      statusCode === 429 ||
      normalizedMessage.includes('insufficient credits') ||
      normalizedMessage.includes('insufficient balance') ||
      normalizedMessage.includes('payment required') ||
      normalizedMessage.includes('credits')
    ) {
      return {
        statusCode: statusCode === 402 ? 402 : 429,
        message: language === 'en'
          ? 'Your OpenRouter balance is depleted or unavailable. Review billing and credits in your OpenRouter dashboard.'
          : 'Tu saldo de OpenRouter está agotado o no disponible. Revisa la facturación y los créditos en tu panel de OpenRouter.',
      };
    }

    if (statusCode === 401 || statusCode === 403 || normalizedMessage.includes('invalid api key') || normalizedMessage.includes('unauthorized')) {
      return {
        statusCode,
        message: language === 'en'
          ? 'The OpenRouter API key is invalid or does not have access to the selected model.'
          : 'La clave de OpenRouter es inválida o no tiene acceso al modelo seleccionado.',
      };
    }
  }

  if (
    statusCode === 429 ||
    normalizedMessage.includes('prepayment credits are depleted') ||
    normalizedMessage.includes('resource_exhausted')
  ) {
    return {
      statusCode: 429,
      message: language === 'en'
        ? 'Your AI Studio credits are depleted. Go to https://ai.studio/projects to review billing or project credits.'
        : 'Tus créditos de AI Studio están agotados. Ve a https://ai.studio/projects para revisar la facturación o los créditos del proyecto.',
    };
  }

  if (statusCode === 401 || statusCode === 403 || normalizedMessage.includes('api key')) {
    return {
      statusCode,
      message: language === 'en'
        ? 'The Gemini API key is invalid or does not have access to this project.'
        : 'La clave de Gemini es inválida o no tiene acceso a este proyecto.',
    };
  }

  return {
    statusCode,
    message: fallbackMessage,
  };
}

export function getCurrentAiProvider() {
  return getConfiguredProvider();
}

export function getCurrentAiModel() {
  return getConfiguredModel(getConfiguredProvider());
}

export function getAvailableAiModels(provider: AiProvider = getConfiguredProvider()) {
  return provider === 'openrouter' ? OPENROUTER_MODEL_OPTIONS : GEMINI_MODEL_OPTIONS;
}

export function isClientModelOverrideAllowed() {
  return isModelOverrideAllowed();
}