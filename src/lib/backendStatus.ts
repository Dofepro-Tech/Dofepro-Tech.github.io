import { canUseConfiguredApi, resolveConfiguredApiUrl } from '@/src/lib/apiConfig';

export type BackendStatusPhase = 'idle' | 'waking' | 'ready' | 'error';

export interface BackendStatusSnapshot {
  phase: BackendStatusPhase;
  updatedAt: number;
  lastReadyAt: number | null;
}

const BACKEND_READY_TTL_MS = 12 * 60 * 1000;

let backendStatusSnapshot: BackendStatusSnapshot = {
  phase: 'idle',
  updatedAt: Date.now(),
  lastReadyAt: null,
};

let activeWarmupPromise: Promise<boolean> | null = null;

const listeners = new Set<(snapshot: BackendStatusSnapshot) => void>();

function emitBackendStatus() {
  const nextSnapshot = { ...backendStatusSnapshot };
  listeners.forEach((listener) => listener(nextSnapshot));
}

function updateBackendStatus(partialSnapshot: Partial<BackendStatusSnapshot>) {
  backendStatusSnapshot = {
    ...backendStatusSnapshot,
    ...partialSnapshot,
    updatedAt: Date.now(),
  };

  emitBackendStatus();
}

function hasFreshBackendReadySignal() {
  return typeof backendStatusSnapshot.lastReadyAt === 'number'
    && Date.now() - backendStatusSnapshot.lastReadyAt < BACKEND_READY_TTL_MS;
}

export function getBackendStatusSnapshot() {
  return { ...backendStatusSnapshot };
}

export function subscribeBackendStatus(listener: (snapshot: BackendStatusSnapshot) => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function markBackendReady() {
  updateBackendStatus({
    phase: 'ready',
    lastReadyAt: Date.now(),
  });
}

export function warmBackendIfLikelyNeeded() {
  if (!canUseConfiguredApi() || hasFreshBackendReadySignal()) {
    return;
  }

  void warmUpBackend();
}

export async function warmUpBackend() {
  if (!canUseConfiguredApi()) {
    return false;
  }

  if (hasFreshBackendReadySignal()) {
    if (backendStatusSnapshot.phase !== 'ready') {
      markBackendReady();
    }

    return true;
  }

  if (activeWarmupPromise) {
    return activeWarmupPromise;
  }

  updateBackendStatus({ phase: 'waking' });

  activeWarmupPromise = fetch(resolveConfiguredApiUrl('/api/health'), {
    cache: 'no-store',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Healthcheck failed with status ${response.status}`);
      }

      markBackendReady();
      return true;
    })
    .catch((error) => {
      console.warn('Backend warmup failed.', error);
      updateBackendStatus({ phase: 'error' });
      return false;
    })
    .finally(() => {
      activeWarmupPromise = null;
    });

  return activeWarmupPromise;
}

export function getBackendWarmupTitle(language: 'es' | 'en') {
  return language === 'en' ? 'Waking up the server' : 'Despertando el servidor';
}

export function getBackendWarmupDescription(language: 'es' | 'en') {
  return language === 'en'
    ? 'The first online request can take a few seconds while the free backend starts again.'
    : 'La primera consulta en linea puede tardar unos segundos mientras el backend gratuito vuelve a activarse.';
}