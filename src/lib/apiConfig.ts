function sanitizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export function getConfiguredApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return configuredBaseUrl ? sanitizeBaseUrl(configuredBaseUrl) : undefined;
}

export function shouldUseSameOriginApi() {
  if (import.meta.env.VITE_USE_SAME_ORIGIN_API !== 'true') {
    return false;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  const protocol = window.location.protocol.trim().toLowerCase();
  return protocol === 'http:' || protocol === 'https:';
}

export function canUseLocalProxyApi() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname.trim().toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function canUseConfiguredApi() {
  return Boolean(getConfiguredApiBaseUrl()) || shouldUseSameOriginApi() || canUseLocalProxyApi();
}

export function resolveConfiguredApiUrl(path: string) {
  const configuredBaseUrl = getConfiguredApiBaseUrl();
  return configuredBaseUrl ? `${configuredBaseUrl}${path}` : path;
}