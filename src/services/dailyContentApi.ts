import type { DailyResourceCard } from '@/src/lib/dailyContent';

export interface RemoteDailyContentPayload {
  fetchedAt: string;
  reflections: DailyResourceCard[];
  sermons: DailyResourceCard[];
  newsItems: DailyResourceCard[];
  videos: DailyResourceCard[];
  testimonies: DailyResourceCard[];
}

function resolveInternalApiUrl(path: string) {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return path;
  }

  return `${configuredBaseUrl.replace(/\/+$/, '')}${path}`;
}

export async function fetchDailyContent(language: 'es' | 'en', signal?: AbortSignal): Promise<RemoteDailyContentPayload> {
  const params = new URLSearchParams({ lang: language });
  const response = await fetch(`${resolveInternalApiUrl('/api/daily-content')}?${params.toString()}`, {
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch daily content');
  }

  return response.json();
}
