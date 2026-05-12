import { useEffect, useState } from 'react';

function canUseBrowserStorage() {
  return typeof window !== 'undefined';
}

function readStoredString(key: string, fallbackValue: string) {
  if (!canUseBrowserStorage()) {
    return fallbackValue;
  }

  return localStorage.getItem(key) || fallbackValue;
}

function readStoredNumber(key: string, fallbackValue: number) {
  if (!canUseBrowserStorage()) {
    return fallbackValue;
  }

  const rawValue = localStorage.getItem(key);
  const parsedValue = rawValue ? Number(rawValue) : NaN;
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function readStoredBoolean(key: string, fallbackValue: boolean) {
  if (!canUseBrowserStorage()) {
    return fallbackValue;
  }

  const rawValue = localStorage.getItem(key);
  if (rawValue === null) {
    return fallbackValue;
  }

  return rawValue === 'true';
}

function readInitialTheme() {
  if (!canUseBrowserStorage()) {
    return false;
  }

  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    return storedTheme === 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useReaderPreferences() {
  const [isDarkMode, setIsDarkMode] = useState(readInitialTheme);
  const [fontSize, setFontSize] = useState(() => readStoredNumber('bible_font_size', 22));
  const [accentColor, setAccentColor] = useState(() => readStoredString('bible_accent_color', 'blue'));
  const [voiceURI, setVoiceURI] = useState(() => readStoredString('bible_voice_uri', ''));
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => readStoredBoolean('bible_has_seen_welcome', false));

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    document.documentElement.setAttribute('data-theme', accentColor);
    localStorage.setItem('bible_accent_color', accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    localStorage.setItem('bible_voice_uri', voiceURI);
  }, [voiceURI]);

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    localStorage.setItem('bible_font_size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    localStorage.setItem('bible_has_seen_welcome', String(hasSeenWelcome));
  }, [hasSeenWelcome]);

  return {
    isDarkMode,
    setIsDarkMode,
    fontSize,
    setFontSize,
    accentColor,
    setAccentColor,
    voiceURI,
    setVoiceURI,
    hasSeenWelcome,
    setHasSeenWelcome,
  };
}