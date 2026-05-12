interface ShareResourcePayload {
  title: string;
  text?: string;
  url?: string;
}

export async function shareResource(payload: ShareResourcePayload) {
  const fallbackText = [payload.title, payload.text, payload.url].filter(Boolean).join('\n');

  try {
    if (navigator.share) {
      await navigator.share(payload);
      return 'shared' as const;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(payload.url || fallbackText);
      return 'copied' as const;
    }
  } catch (error) {
    console.error('Error sharing resource:', error);
  }

  return 'unavailable' as const;
}
