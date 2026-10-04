import { resolveConfiguredApiUrl } from '@/src/lib/apiConfig';

export interface GameProgress {
  currentLevel: number;
  completedLevels: number[];
  levelStars: Record<number, number>;
  wordsFoundTotal: number;
  rewardPoints: number;
  lastPlayedLevel: number;
}

async function requestProgress<T>(accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveConfiguredApiUrl('/api/game-progress'), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'No se pudo sincronizar el progreso del juego.');
  return payload;
}

export function loadGameProgress(accessToken: string) {
  return requestProgress<{ progress: GameProgress | null }>(accessToken);
}

export function saveGameProgress(accessToken: string, progress: GameProgress) {
  return requestProgress<{ progress: GameProgress }>(accessToken, {
    method: 'PUT',
    body: JSON.stringify({ progress }),
  });
}