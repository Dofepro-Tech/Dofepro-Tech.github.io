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

function isInternalAppUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'capacitor:'
      || parsedUrl.protocol === 'file:'
      || parsedUrl.hostname === 'localhost'
      || parsedUrl.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getAppShareUrl() {
  const envUrl = import.meta.env.VITE_APP_DOWNLOAD_URL
    || import.meta.env.VITE_PLAY_STORE_URL
    || import.meta.env.VITE_APP_SHARE_URL;

  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  if (typeof window !== 'undefined') {
    return isInternalAppUrl(window.location.href) ? '' : window.location.href;
  }

  return '';
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

  try {
    await NativeAppShare.shareInstalledApk({
      title: normalizeShareField(options.title),
      text: normalizeShareField(options.text),
      fileName: normalizeShareField(options.fileName),
      dialogTitle: normalizeShareField(options.dialogTitle),
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

    console.error('Error sharing installed Android app:', error);
    return 'unsupported';
  }
}