import { getAppShareUrl } from '@/src/lib/share';

const DISMISSED_APP_UPDATE_STORAGE_KEY = 'biblia_dj_dismissed_update_version_v1';

export interface AppUpdateManifest {
  version: string;
  downloadUrl: string;
  apkUrl?: string;
  updateUrl?: string;
  publishedAt?: string;
  channel?: string;
  notes?: string[];
}

function parseVersionParts(version: string) {
  return version
    .split('.')
    .map((segment) => {
      const digits = segment.match(/\d+/)?.[0];
      return digits ? Number(digits) : 0;
    });
}

function resolveRemoteUrl(value: string | undefined, manifestUrl: string) {
  if (!value || value.trim().length === 0) {
    return '';
  }

  try {
    return new URL(value.trim(), manifestUrl).toString();
  } catch {
    return '';
  }
}

export function getCurrentAppVersion() {
  return typeof __APP_VERSION__ === 'string' && __APP_VERSION__.trim().length > 0
    ? __APP_VERSION__.trim()
    : '0.0.0';
}

export function compareAppVersions(left: string, right: string) {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

export function getAppUpdateManifestUrl() {
  const explicitUrl = import.meta.env.VITE_APP_UPDATE_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl = import.meta.env.VITE_APP_DOWNLOAD_URL?.trim()
    || import.meta.env.VITE_PLAY_STORE_URL?.trim()
    || import.meta.env.VITE_APP_SHARE_URL?.trim()
    || getAppShareUrl();

  if (!baseUrl) {
    return '';
  }

  try {
    return new URL('app-update.json', baseUrl).toString();
  } catch {
    return '';
  }
}

export async function fetchLatestAppUpdate(signal?: AbortSignal) {
  const manifestUrl = getAppUpdateManifestUrl();
  if (!manifestUrl) {
    return null;
  }

  const response = await fetch(manifestUrl, {
    cache: 'no-store',
    signal,
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as Partial<AppUpdateManifest>;
  if (!payload || typeof payload.version !== 'string' || payload.version.trim().length === 0) {
    return null;
  }

  const downloadUrl = resolveRemoteUrl(payload.downloadUrl, manifestUrl);
  const apkUrl = resolveRemoteUrl(payload.apkUrl, manifestUrl);

  return {
    version: payload.version.trim(),
    downloadUrl,
    apkUrl: apkUrl || undefined,
    updateUrl: manifestUrl,
    publishedAt: typeof payload.publishedAt === 'string' ? payload.publishedAt : undefined,
    channel: typeof payload.channel === 'string' ? payload.channel : undefined,
    notes: Array.isArray(payload.notes)
      ? payload.notes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
      : undefined,
  } satisfies AppUpdateManifest;
}

export function shouldPromptForAppUpdate(update: AppUpdateManifest) {
  return compareAppVersions(update.version, getCurrentAppVersion()) > 0;
}

export function getAppUpdateTargetUrl(update: AppUpdateManifest) {
  return update.apkUrl || update.downloadUrl;
}

export function getDismissedAppUpdateVersion() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(DISMISSED_APP_UPDATE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function dismissAppUpdateVersion(version: string) {
  if (typeof window === 'undefined' || !version) {
    return;
  }

  try {
    window.localStorage.setItem(DISMISSED_APP_UPDATE_STORAGE_KEY, version);
  } catch {
    // Ignore storage errors on restricted devices.
  }
}