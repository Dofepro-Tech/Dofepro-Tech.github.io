export type AppLanguage = 'en' | 'es';

export function normalizeAppLanguage(language?: string | null): AppLanguage {
  return language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function getBibleVersion(language?: string | null): 'kjv' | 'rv1960' {
  return normalizeAppLanguage(language) === 'en' ? 'kjv' : 'rv1960';
}

export function getSpeechLanguage(language?: string | null): string {
  return normalizeAppLanguage(language) === 'en' ? 'en-US' : 'es-ES';
}