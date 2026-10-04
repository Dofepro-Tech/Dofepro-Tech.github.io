import { Capacitor } from '@capacitor/core';
import { resolveConfiguredApiUrl } from '@/src/lib/apiConfig';

const INSTALLATION_ID_KEY = 'biblia-dj-analytics-installation-id';

function getInstallationId() {
  try {
    const existingId = window.localStorage.getItem(INSTALLATION_ID_KEY);
    if (existingId) return existingId;
    const installationId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(INSTALLATION_ID_KEY, installationId);
    return installationId;
  } catch {
    return undefined;
  }
}

// Nota: Para que esto funcione en Android, debes instalar el plugin:
// npm install @capacitor-firebase/analytics
// npx cap sync

export type AnalyticsEvent =
  | { name: 'app_open'; params?: { platform: string; version: string } }
  | { name: 'apk_download_click'; params?: undefined }
  | { name: 'bible_read'; params: { book: string; chapter: number } }
  | { name: 'search_query'; params: { query: string } }
  | { name: 'share_content'; params: { type: 'apk' | 'verse' | 'image' } }
  | { name: 'game_start'; params: { level: number } }
  | { name: 'theme_change'; params: { mode: 'dark' | 'light' } };

export async function trackEvent(event: AnalyticsEvent) {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // 1. Registro en Consola (para desarrollo)
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Event: ${event.name}`, event.params);
  }

  // 2. Envío al Servidor Propio (Ligero y para todas las plataformas)
  try {
    // Usamos el API de beacon o fetch normal de forma asíncrona para no bloquear la UI
    void fetch(resolveConfiguredApiUrl('/api/stats/event'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event.name,
        platform,
        appVersion: (window as any).__APP_VERSION__ || '1.0.4',
        installationId: event.name === 'app_open' ? getInstallationId() : undefined,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Fallo silencioso
  }

  // 3. Preparado para Firebase Native (Solo si es Android/iOS)
  if (isNative) {
    try {
      // Aquí el plugin de Capacitor Firebase entrará en acción automáticamente
      // en cuanto el usuario añada el archivo google-services.json
      const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics');
      await FirebaseAnalytics.logEvent({
        name: event.name,
        params: event.params,
      });
    } catch (e) {
      // El plugin no está instalado o configurado todavía
    }
  }
}

export function initAnalytics() {
  const version = (window as any).__APP_VERSION__ || '1.0.4';
  void trackEvent({
    name: 'app_open',
    params: {
      platform: Capacitor.getPlatform(),
      version
    }
  });
}
