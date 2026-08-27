// Servicio para generación automática de imágenes para versículos usando Gemini API (o fallback)
// Si la API falla o no hay clave, retorna una imagen de respaldo

import { GEMINI_API_KEY } from './apiConfig';

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

export async function generateVerseImage(verseText: string, verseReference: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    return FALLBACK_IMAGE_URL;
  }
  try {
    const prompt = `Crea una imagen inspiradora y artística que represente visualmente el siguiente versículo bíblico: "${verseText}" (${verseReference}). Evita texto en la imagen, solo arte visual relevante al mensaje.`;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateImage?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: '3:4', style: 'photo, digital art, realistic' })
    });
    const data = await response.json();
    if (data?.images?.[0]?.url) {
      return data.images[0].url;
    }
    return FALLBACK_IMAGE_URL;
  } catch (e) {
    return FALLBACK_IMAGE_URL;
  }
}
