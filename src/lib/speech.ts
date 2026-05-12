import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

let nativeVoicesCache: SpeechSynthesisVoice[] = [];
let nativeLanguagesCache: string[] = [];
let nativeVoicesListener: (() => void) | null = null;
let isLoadingNativeVoices = false;
let isLoadingNativeLanguages = false;

function isNativeSpeechPlatform() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

function getUtteranceConstructor() {
  if (typeof window === 'undefined' || typeof window.SpeechSynthesisUtterance === 'undefined') {
    return null;
  }

  return window.SpeechSynthesisUtterance;
}

export function getSpeechSynthesis() {
  if (isNativeSpeechPlatform()) {
    return null;
  }

  if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
    return null;
  }

  return window.speechSynthesis;
}

export function canUseSpeechSynthesis() {
  if (isNativeSpeechPlatform()) {
    return true;
  }

  return getSpeechSynthesis() !== null && getUtteranceConstructor() !== null;
}

async function loadNativeVoices() {
  if (!isNativeSpeechPlatform() || isLoadingNativeVoices) {
    return nativeVoicesCache;
  }

  isLoadingNativeVoices = true;

  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    nativeVoicesCache = voices;
    nativeVoicesListener?.();
  } catch (error) {
    console.error('Error loading native speech voices:', error);
    nativeVoicesCache = [];
  } finally {
    isLoadingNativeVoices = false;
  }

  return nativeVoicesCache;
}

async function loadNativeLanguages() {
  if (!isNativeSpeechPlatform() || isLoadingNativeLanguages) {
    return nativeLanguagesCache;
  }

  isLoadingNativeLanguages = true;

  try {
    const { languages } = await TextToSpeech.getSupportedLanguages();
    nativeLanguagesCache = languages;
  } catch (error) {
    console.error('Error loading native speech languages:', error);
    nativeLanguagesCache = [];
  } finally {
    isLoadingNativeLanguages = false;
  }

  return nativeLanguagesCache;
}

async function resolveNativeLanguage(lang: string) {
  const supportedLanguages = await loadNativeLanguages();
  if (supportedLanguages.length === 0) {
    return lang;
  }

  if (supportedLanguages.includes(lang)) {
    return lang;
  }

  const baseLanguage = lang.split('-')[0]?.toLowerCase();
  if (!baseLanguage) {
    return null;
  }

  const compatibleLanguage = supportedLanguages.find((supportedLanguage) => supportedLanguage.toLowerCase() === baseLanguage)
    ?? supportedLanguages.find((supportedLanguage) => supportedLanguage.toLowerCase().startsWith(`${baseLanguage}-`));

  return compatibleLanguage ?? null;
}

export function getSpeechVoices() {
  if (isNativeSpeechPlatform()) {
    void loadNativeVoices();
    void loadNativeLanguages();
    return nativeVoicesCache;
  }

  return getSpeechSynthesis()?.getVoices() || [];
}

export function setSpeechVoicesChangedListener(listener: (() => void) | null) {
  if (isNativeSpeechPlatform()) {
    nativeVoicesListener = listener;

    if (!listener) {
      return;
    }

    if (nativeVoicesCache.length > 0) {
      window.setTimeout(listener, 0);
      return;
    }

    void loadNativeVoices();
    void loadNativeLanguages();
    return;
  }

  const speechSynthesis = getSpeechSynthesis();
  if (!speechSynthesis) {
    return;
  }

  speechSynthesis.onvoiceschanged = listener;
}

export function cancelSpeech() {
  if (isNativeSpeechPlatform()) {
    void TextToSpeech.stop().catch((error) => {
      console.error('Error stopping native speech:', error);
    });
    return;
  }

  getSpeechSynthesis()?.cancel();
}

interface SpeakTextOptions {
  text: string;
  lang: string;
  voiceURI?: string;
  onEnd?: () => void;
  onError?: () => void;
}

export function speakText({ text, lang, voiceURI, onEnd, onError }: SpeakTextOptions) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    onError?.();
    return false;
  }

  if (isNativeSpeechPlatform()) {
    const nativeVoiceIndex = voiceURI
      ? nativeVoicesCache.findIndex((voice) => voice.voiceURI === voiceURI)
      : -1;

    void (async () => {
      try {
        const fallbackLanguage = lang.split('-')[0]?.toLowerCase() || lang;
        const resolvedLanguage = await resolveNativeLanguage(lang) ?? fallbackLanguage;

        await TextToSpeech.speak({
          text: normalizedText,
          lang: resolvedLanguage,
          rate: 1,
          pitch: 1,
          volume: 1,
          queueStrategy: 0,
          ...(nativeVoiceIndex >= 0 ? { voice: nativeVoiceIndex } : {}),
        });

        onEnd?.();
      } catch (error) {
        console.error('Error speaking native text:', error);
        onError?.();
      }
    })();

    return true;
  }

  const speechSynthesis = getSpeechSynthesis();
  const Utterance = getUtteranceConstructor();

  if (!speechSynthesis || !Utterance) {
    return false;
  }

  speechSynthesis.cancel();

  const utterance = new Utterance(normalizedText);

  if (voiceURI) {
    const selectedVoice = speechSynthesis.getVoices().find((voice) => voice.voiceURI === voiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  utterance.lang = lang;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();
  speechSynthesis.speak(utterance);
  return true;
}