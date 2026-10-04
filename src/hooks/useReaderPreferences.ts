import { useEffect, useState } from 'react';
import { getThemePalette, lightThemePalettes, darkThemePalettes } from '@/src/lib/themePalettes';

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
  const [lightAccent, setLightAccent] = useState(() => readStoredString('bible_accent_color_light', readStoredString('bible_accent_color', lightThemePalettes[0].id)));
  const [darkAccent, setDarkAccent] = useState(() => readStoredString('bible_accent_color_dark', darkThemePalettes[0].id));
  const accentColor = isDarkMode ? darkAccent : lightAccent;
  const setAccentColor = (color: string) => isDarkMode ? setDarkAccent(color) : setLightAccent(color);
  const [voiceURI, setVoiceURI] = useState(() => readStoredString('bible_voice_uri', ''));
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => readStoredBoolean('bible_has_seen_welcome', false));
  const [keepScreenOn, setKeepScreenOn] = useState(() => readStoredBoolean('bible_keep_screen_on', false));
  const [startupPage, setStartupPage] = useState<'home' | 'reader'>(() => (readStoredString('bible_startup_page', 'home') as 'home' | 'reader'));
  const [homeSections, setHomeSections] = useState(() => {
    const saved = localStorage.getItem('bible_home_sections_v1');
    return saved ? JSON.parse(saved) : {
      dailyVerse: true,
      devotional: true,
      images: true,
      news: true,
      videos: true,
      reflections: true,
      testimonies: true,
      game: true,
    };
  });

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

    const root = document.documentElement;
    const palette = getThemePalette(accentColor, isDarkMode);
    root.setAttribute('data-theme', palette.id);
    root.style.setProperty('--primary', palette.color);
    root.style.setProperty('--primary-hover', palette.hover);
    root.style.setProperty('--primary-rgb', `${parseInt(palette.color.slice(1, 3), 16)}, ${parseInt(palette.color.slice(3, 5), 16)}, ${parseInt(palette.color.slice(5, 7), 16)}`);
    localStorage.setItem(isDarkMode ? 'bible_accent_color_dark' : 'bible_accent_color_light', palette.id);
    localStorage.setItem('bible_accent_color', palette.id);
  }, [accentColor, isDarkMode]);

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

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    localStorage.setItem('bible_keep_screen_on', String(keepScreenOn));
  }, [keepScreenOn]);

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    localStorage.setItem('bible_startup_page', startupPage);
  }, [startupPage]);

  useEffect(() => {
    if (!canUseBrowserStorage()) {
      return;
    }

    localStorage.setItem('bible_home_sections_v1', JSON.stringify(homeSections));
  }, [homeSections]);

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
    keepScreenOn,
    setKeepScreenOn,
    startupPage,
    setStartupPage,
    homeSections,
    setHomeSections,
  };
}
