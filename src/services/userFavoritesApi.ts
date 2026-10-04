import type { Bookmark } from '@/src/types';
import { resolveConfiguredApiUrl } from '@/src/lib/apiConfig';

async function requestUserFavorites<T>(accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveConfiguredApiUrl('/api/user-favorites'), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'No se pudieron sincronizar tus favoritos.');
  return payload;
}

export function loadUserFavorites(accessToken: string) {
  return requestUserFavorites<{ bookmarks: Bookmark[] | null }>(accessToken);
}

export function saveUserFavorites(accessToken: string, bookmarks: Bookmark[]) {
  return requestUserFavorites<{ bookmarks: Bookmark[] }>(accessToken, {
    method: 'PUT',
    body: JSON.stringify({ bookmarks }),
  });
}