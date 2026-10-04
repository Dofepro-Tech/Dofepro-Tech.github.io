import { Capacitor, registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export interface ReaderShareTarget {
  bookAbrev: string;
  chapter: number;
  verseNumber?: number | null;
}

interface BuildVerseShareTextOptions {
  reference: string;
  verseText: string;
  shareUrl?: string;
}

export type ShareContentResult = 'shared' | 'cancelled' | 'unsupported';

interface NativeAppShareOptions {
  title?: string;
  text?: string;
  fileName?: string;
  dialogTitle?: string;
}

interface NativeAppSharePlugin {
  shareInstalledApk(options: NativeAppShareOptions): Promise<void>;
}

const NativeAppShare = registerPlugin<NativeAppSharePlugin>('AppShare');

function normalizeShareField(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getAppShareUrl() {
  const envUrl = import.meta.env.VITE_APP_SHARE_URL
    || import.meta.env.VITE_APP_DOWNLOAD_URL
    || import.meta.env.VITE_PLAY_STORE_URL;

  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  return 'https://bibliadj.dofepro.do/download.html';
}

export function getAppApkUrl() {
  const envApkUrl = import.meta.env.VITE_APK_DOWNLOAD_URL;
  if (typeof envApkUrl === 'string' && envApkUrl.trim().length > 0) {
    return envApkUrl.trim();
  }

  return 'https://dofepro-tech.github.io/biblia-dj-android.apk';
}

interface BuildAppShareMessageOptions {
  title: string;
  message?: string;
  webUrl?: string;
  apkUrl?: string;
  language?: string;
}

export function buildAppShareMessage({ title, message, webUrl, apkUrl, language = 'es' }: BuildAppShareMessageOptions) {
  const isEn = language.startsWith('en');
  const resolvedWeb = webUrl || getAppShareUrl();
  const resolvedApk = apkUrl || getAppApkUrl();

  if (isEn) {
    const lines = [
      `📖 ${title} - Bible Study & AI App`,
      message || 'Read, listen, and study the Bible with AI.',
      '',
      `🌐 Web Version: ${resolvedWeb}`,
      `📲 Download Android APK: ${resolvedApk}`,
    ];
    return lines.join('\n');
  }

  const lines = [
    `📖 ${title} - Bíblia DJ con Inteligencia Artificial`,
    message || 'Una increíble aplicación para leer, escuchar y estudiar la Biblia con IA.',
    '',
    `🌐 Versión Web: ${resolvedWeb}`,
    `📲 Descargar APK directa (Android): ${resolvedApk}`,
  ];
  return lines.join('\n');
}

export function getReaderShareUrl(target?: ReaderShareTarget) {
  const shareUrl = getAppShareUrl();

  if (!shareUrl || !target) {
    return shareUrl;
  }

  try {
    const parsedUrl = new URL(shareUrl);
    parsedUrl.searchParams.set('book', target.bookAbrev);
    parsedUrl.searchParams.set('chapter', String(target.chapter));

    if (typeof target.verseNumber === 'number' && Number.isInteger(target.verseNumber) && target.verseNumber > 0) {
      parsedUrl.searchParams.set('verse', String(target.verseNumber));
    } else {
      parsedUrl.searchParams.delete('verse');
    }

    return parsedUrl.toString();
  } catch {
    return shareUrl;
  }
}

export function buildVerseShareText({ reference, verseText, shareUrl }: BuildVerseShareTextOptions) {
  return [normalizeShareField(reference), normalizeShareField(verseText), normalizeShareField(shareUrl)]
    .filter(Boolean)
    .join('\n\n');
}

export async function shareContent(payload: SharePayload): Promise<ShareContentResult> {
  const title = normalizeShareField(payload.title);
  const text = normalizeShareField(payload.text);
  const url = normalizeShareField(payload.url);

  try {
    const { value: canShare } = await Share.canShare();
    if (!canShare) {
      return 'unsupported';
    }

    await Share.share({
      title: title || undefined,
      text: text || undefined,
      url: url || undefined,
      dialogTitle: title || undefined,
    });

    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    if (errorMessage.includes('abort') || errorMessage.includes('cancel')) {
      return 'cancelled';
    }

    console.error('Error sharing content:', error);
    return 'unsupported';
  }
}

export async function shareInstalledAndroidApp(options: NativeAppShareOptions): Promise<ShareContentResult> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return 'unsupported';
  }

  // Intentamos compartir directamente el archivo .APK instalado en el celular
  try {
    await NativeAppShare.shareInstalledApk({
      title: normalizeShareField(options.title || 'Bíblia DJ'),
      text: normalizeShareField(options.text),
      fileName: normalizeShareField(options.fileName || 'biblia-dj-android.apk'),
      dialogTitle: normalizeShareField(options.dialogTitle || 'Compartir App'),
    });
    return 'shared';
  } catch (error) {
    console.error('Error sharing installed APK file directly, falling back to link share:', error);

    const downloadUrl = getAppShareUrl();
    try {
      await Share.share({
        title: options.title || 'Bíblia DJ',
        text: options.text,
        url: downloadUrl,
        dialogTitle: options.dialogTitle || 'Bíblia DJ',
      });
      return 'shared';
    } catch (innerError) {
      return 'unsupported';
    }
  }
}
