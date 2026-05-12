import type { DailyResourceCard } from '@/src/lib/dailyContent';
import { canUseConfiguredApi, resolveConfiguredApiUrl } from '@/src/lib/apiConfig';

export interface RemoteDailyContentPayload {
  fetchedAt: string;
  reflections: DailyResourceCard[];
  sermons: DailyResourceCard[];
  newsItems: DailyResourceCard[];
  videos: DailyResourceCard[];
  testimonies: DailyResourceCard[];
}

export function canFetchDailyContentRemotely() {
  return canUseConfiguredApi();
}

export async function fetchDailyContent(language: 'es' | 'en', signal?: AbortSignal): Promise<RemoteDailyContentPayload> {
  const params = new URLSearchParams({ lang: language });
  const response = await fetch(`${resolveConfiguredApiUrl('/api/daily-content')}?${params.toString()}`, {
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch daily content');
  }

  return response.json();
}
