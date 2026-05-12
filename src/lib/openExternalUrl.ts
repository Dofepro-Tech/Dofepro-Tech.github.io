import { Browser } from '@capacitor/browser';

export async function openExternalUrl(url: string) {
  if (!url) {
    return;
  }

  try {
    await Browser.open({ url });
    return;
  } catch {
    if (typeof window === 'undefined') {
      return;
    }

    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

    if (!openedWindow) {
      window.location.assign(url);
    }
  }
}