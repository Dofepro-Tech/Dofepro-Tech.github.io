import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Calendar, ChevronLeft, Gamepad2, Heart, Home, Map, Moon, Play, RotateCcw, Search, Share2, Sparkles, Star, Sun, Target, Trophy, User, Volume2, VolumeX } from 'lucide-react';
import { AppOverflowMenu } from '@/src/components/AppOverflowMenu';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { PanelNavButtons } from '@/src/components/PanelNavButtons';
import { WordSearchBoard } from '@/src/components/game/WordSearchBoard';
import { LEVELS, THEMES, type LevelDef } from '@/src/lib/wordBiblia/levels';
import { generateWordSearch, type PlacedWord, type WordSearchGrid } from '@/src/lib/wordBiblia/wordSearch';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

interface ChristianGameHubProps {
  onBack: () => void;
  onGoHome?: () => void;
  onOpenBooks: () => void;
  onOpenStudy: () => void;
  onOpenDailyExperience?: () => void;
  onOpenFavorites?: () => void;
  onOpenSearch?: () => void;
  onOpenPlans?: () => void;
  onOpenUser?: () => void;
  onShare: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  voiceURI: string;
  setVoiceURI: (uri: string) => void;
}

type GameView = 'home' | 'map' | 'level';

interface WordGameState {
  currentLevel: number;
  completedLevels: number[];
  wordsFoundTotal: number;
  rewardPoints: number;
  lastPlayedLevel: number;
}

const WORD_GAME_STORAGE_KEY = 'biblia_nj_word_game_v1';
const WORD_GAME_SOUND_STORAGE_KEY = 'biblia_nj_word_game_sound_v1';
const DEFAULT_WORD_GAME_STATE: WordGameState = {
  currentLevel: 1,
  completedLevels: [],
  wordsFoundTotal: 0,
  rewardPoints: 0,
  lastPlayedLevel: 1,
};

function readStoredWordGameState() {
  if (typeof window === 'undefined') {
    return DEFAULT_WORD_GAME_STATE;
  }

  try {
    const rawState = window.localStorage.getItem(WORD_GAME_STORAGE_KEY);
    if (!rawState) {
      return DEFAULT_WORD_GAME_STATE;
    }

    const parsedState = JSON.parse(rawState) as Partial<WordGameState>;
    return {
      ...DEFAULT_WORD_GAME_STATE,
      ...parsedState,
      currentLevel: Math.max(1, Math.min(parsedState.currentLevel ?? 1, LEVELS.length)),
      lastPlayedLevel: Math.max(1, Math.min(parsedState.lastPlayedLevel ?? 1, LEVELS.length)),
      completedLevels: Array.isArray(parsedState.completedLevels)
        ? parsedState.completedLevels.filter((levelNumber) => Number.isInteger(levelNumber) && levelNumber > 0 && levelNumber <= LEVELS.length)
        : [],
    };
  } catch (error) {
    console.error('Error loading word game state:', error);
    return DEFAULT_WORD_GAME_STATE;
  }
}

function readStoredWordGameSoundEnabled() {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const rawValue = window.localStorage.getItem(WORD_GAME_SOUND_STORAGE_KEY);
    if (rawValue === null) {
      return true;
    }

    return rawValue !== 'false';
  } catch (error) {
    console.error('Error loading word game sound state:', error);
    return true;
  }
}

type GameSoundKind = 'tap' | 'found' | 'complete' | 'replay';

function playGameSound(soundKind: GameSoundKind, audioContextRef: React.MutableRefObject<AudioContext | null>, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') {
    return;
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextCtor();
  }

  const context = audioContextRef.current;
  if (!context) {
    return;
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  const playTone = (frequency: number, startAt: number, duration: number, volume: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  };

  const now = context.currentTime;

  switch (soundKind) {
    case 'complete':
      playTone(523.25, now, 0.14, 0.06);
      playTone(659.25, now + 0.12, 0.16, 0.07);
      playTone(783.99, now + 0.26, 0.2, 0.08);
      break;
    case 'found':
      playTone(659.25, now, 0.08, 0.05);
      playTone(783.99, now + 0.07, 0.11, 0.06);
      break;
    case 'replay':
      playTone(392, now, 0.1, 0.05);
      playTone(329.63, now + 0.08, 0.14, 0.05);
      break;
    case 'tap':
    default:
      playTone(523.25, now, 0.07, 0.035);
      break;
  }
}

export function ChristianGameHub({
  onBack,
  onGoHome,
  onOpenBooks,
  onOpenStudy,
  onOpenDailyExperience,
  onOpenFavorites,
  onOpenSearch,
  onOpenPlans,
  onOpenUser,
  onShare,
  isDarkMode,
  onToggleDarkMode,
  fontSize,
  setFontSize,
  accentColor,
  setAccentColor,
  voiceURI,
  setVoiceURI,
}: ChristianGameHubProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'en' : 'es';
  const [view, setView] = useState<GameView>('home');
  const [gameState, setGameState] = useState<WordGameState>(() => readStoredWordGameState());
  const [activeLevelNumber, setActiveLevelNumber] = useState<number>(() => readStoredWordGameState().lastPlayedLevel);
  const [board, setBoard] = useState<WordSearchGrid | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [levelReward, setLevelReward] = useState(0);
  const [isGameSoundEnabled, setIsGameSoundEnabled] = useState(() => readStoredWordGameSoundEnabled());
  const audioContextRef = useRef<AudioContext | null>(null);

  const totalLevels = LEVELS.length;
  const nextLevelNumber = Math.min(gameState.currentLevel, totalLevels);
  const unlockedLevelCount = Math.max(1, Math.min(gameState.currentLevel, totalLevels));
  const completedLevelsCount = gameState.completedLevels.length;
  const completionPercent = Math.round((completedLevelsCount / totalLevels) * 100);
  const mobileNavItems = [
    {
      id: 'home',
      label: t('app.home'),
      icon: <Home className="h-5 w-5" />,
      onClick: () => onGoHome?.(),
    },
    {
      id: 'books',
      label: t('menu.books'),
      icon: <BookOpen className="h-5 w-5" />,
      onClick: onOpenBooks,
    },
    {
      id: 'daily',
      label: t('app.search_book'),
      icon: <Search className="h-5 w-5" />,
      onClick: () => onOpenSearch?.(),
    },
    {
      id: 'favorites',
      label: currentLanguage === 'en' ? 'Plans' : 'Planes',
      icon: <Calendar className="h-5 w-5" />,
      onClick: () => onOpenPlans?.(),
    },
    {
      id: 'saved',
      label: t('menu.favorites'),
      icon: <Heart className="h-5 w-5" />,
      onClick: () => onOpenFavorites?.(),
    },
    {
      id: 'user',
      label: currentLanguage === 'en' ? 'User' : 'Usuario',
      icon: <User className="h-5 w-5" />,
      onClick: () => onOpenUser?.(),
    },
  ];
  const activeLevel = useMemo(
    () => LEVELS.find((level) => level.levelNumber === activeLevelNumber) ?? LEVELS[0],
    [activeLevelNumber]
  );

  useEffect(() => {
    window.localStorage.setItem(WORD_GAME_STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(WORD_GAME_SOUND_STORAGE_KEY, String(isGameSoundEnabled));
  }, [isGameSoundEnabled]);

  useEffect(() => () => {
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (view !== 'level' || !activeLevel) {
      return;
    }

    setBoard(generateWordSearch(activeLevel.words, activeLevel.gridSize));
    setFoundWords([]);
    setIsLevelComplete(false);
    setLevelReward(0);
    setGameState((previous) => ({
      ...previous,
      lastPlayedLevel: activeLevel.levelNumber,
    }));
  }, [activeLevel, view]);

  const openLevel = (levelNumber: number) => {
    playGameSound('tap', audioContextRef, isGameSoundEnabled);
    setActiveLevelNumber(levelNumber);
    setView('level');
  };

  const handleStartGame = () => {
    openLevel(nextLevelNumber);
  };

  const handleWordFound = (word: PlacedWord) => {
    if (!board || foundWords.includes(word.word)) {
      return;
    }

    setBoard((previousBoard) => {
      if (!previousBoard) {
        return previousBoard;
      }

      return {
        ...previousBoard,
        words: previousBoard.words.map((currentWord) => (
          currentWord.word === word.word ? { ...currentWord, found: true } : currentWord
        )),
      };
    });

    setFoundWords((previousFoundWords) => {
      const nextFoundWords = [...previousFoundWords, word.word];
      const wordReward = 5;
      const didCompleteLevel = nextFoundWords.length === board.words.length;
      const completionBonus = didCompleteLevel ? 25 : 0;

      setLevelReward((previousReward) => previousReward + wordReward + completionBonus);
      setGameState((previousState) => {
        const alreadyCompleted = previousState.completedLevels.includes(activeLevel.levelNumber);
        const completedLevels = didCompleteLevel && !alreadyCompleted
          ? [...previousState.completedLevels, activeLevel.levelNumber]
          : previousState.completedLevels;

        return {
          ...previousState,
          wordsFoundTotal: previousState.wordsFoundTotal + 1,
          rewardPoints: previousState.rewardPoints + wordReward + completionBonus,
          completedLevels,
          currentLevel: didCompleteLevel
            ? Math.min(totalLevels, Math.max(previousState.currentLevel, activeLevel.levelNumber + 1))
            : previousState.currentLevel,
          lastPlayedLevel: activeLevel.levelNumber,
        };
      });

      if (didCompleteLevel) {
        playGameSound('complete', audioContextRef, isGameSoundEnabled);
        setIsLevelComplete(true);
      } else {
        playGameSound('found', audioContextRef, isGameSoundEnabled);
      }

      return nextFoundWords;
    });
  };

  const handleReplayLevel = () => {
    playGameSound('replay', audioContextRef, isGameSoundEnabled);
    setBoard(generateWordSearch(activeLevel.words, activeLevel.gridSize));
    setFoundWords([]);
    setIsLevelComplete(false);
    setLevelReward(0);
  };

  const handleOpenNextLevel = () => {
    const upcomingLevel = Math.min(activeLevel.levelNumber + 1, totalLevels);
    playGameSound('tap', audioContextRef, isGameSoundEnabled);
    setActiveLevelNumber(upcomingLevel);
    setView('level');
  };

  const themeSummaries = THEMES.map((theme) => {
    const levelsForTheme = LEVELS.filter((level) => level.themeId === theme.id);
    const completedInTheme = levelsForTheme.filter((level) => gameState.completedLevels.includes(level.levelNumber)).length;

    return {
      ...theme,
      firstLevel: levelsForTheme[0]?.levelNumber ?? 1,
      completedInTheme,
      levelsForTheme,
    };
  });

  const pageTone = isDarkMode
    ? 'bg-[#04101f] text-white'
    : 'bg-[linear-gradient(180deg,#eef5ff_0%,#f7fbff_44%,#f5f5f0_100%)] text-[#102542]';
  const headerTone = isDarkMode
    ? 'border-white/10 bg-[#07172e]/92'
    : 'border-[#cfe0f2] bg-white/92';
  const headerButtonTone = isDarkMode
    ? 'border-white/10 bg-white/5 text-white hover:border-[#4fa8ff]/40 hover:bg-[#10284f]'
    : 'border-[#d4e2f1] bg-white text-[#153153] hover:border-[#4fa8ff]/35 hover:bg-[#edf5ff]';
  const headerBadgeTone = isDarkMode ? 'text-[#87bfff]' : 'text-[#4d7bb3]';
  const headerTitleTone = isDarkMode ? 'text-white' : 'text-[#102542]';

  return (
    <div className={cn('h-full overflow-y-auto transition-colors duration-300', pageTone)}>
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-36 pt-4 sm:px-6 lg:px-8 lg:pb-20">
        <header className={cn('sticky top-0 z-20 rounded-[28px] border px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-5', headerTone)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-[#244b7d]/45 bg-[#061223]/78 p-1.5 shadow-[0_14px_36px_rgba(2,9,22,0.24)] sm:h-16 sm:w-16 sm:rounded-[22px]">
                <BrandSeal className="h-full w-full" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.32em]', headerBadgeTone)}>{t('menu.game')}</p>
                <h1 className={cn('truncate font-serif text-[1.35rem] font-bold sm:text-2xl', headerTitleTone)}>{t('game.title')}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setIsGameSoundEnabled((current) => !current)}
                className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border transition-all', headerButtonTone)}
                title={isGameSoundEnabled ? (currentLanguage === 'en' ? 'Disable game sound' : 'Desactivar sonido del juego') : (currentLanguage === 'en' ? 'Enable game sound' : 'Activar sonido del juego')}
                aria-label={isGameSoundEnabled ? (currentLanguage === 'en' ? 'Disable game sound' : 'Desactivar sonido del juego') : (currentLanguage === 'en' ? 'Enable game sound' : 'Activar sonido del juego')}
              >
                {isGameSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={cn('hidden h-11 w-11 items-center justify-center rounded-2xl border transition-all sm:flex', headerButtonTone)}
                title={isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
                aria-label={isDarkMode ? t('settings.change_to_light') : t('settings.change_to_dark')}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onShare}
                className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border transition-all', headerButtonTone)}
                title={t('menu.share')}
                aria-label={t('menu.share')}
              >
                <Share2 className="h-4 w-4" />
              </button>
              <AppOverflowMenu
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                fontSize={fontSize}
                setFontSize={setFontSize}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                voiceURI={voiceURI}
                setVoiceURI={setVoiceURI}
                onOpenBooks={onOpenBooks}
                onOpenStudy={onOpenStudy}
                onOpenDailyExperience={onOpenDailyExperience}
                onOpenFavorites={onOpenFavorites}
                onShare={onShare}
              />
              <PanelNavButtons
                onBack={onBack}
                onHome={onGoHome}
                backLabel={t('app.back')}
                homeLabel={t('app.home')}
                className="hidden shrink-0 sm:flex"
              />
            </div>
          </div>
        </header>

        <div className="mt-5 flex flex-wrap gap-2">
          <GameModeButton label={t('app.home')} active={view === 'home'} onClick={() => setView('home')} icon={<Home className="h-4 w-4" />} />
          <GameModeButton label={t('game.level_map')} active={view === 'map'} onClick={() => setView('map')} icon={<Map className="h-4 w-4" />} />
          {view === 'level' && (
            <GameModeButton
              label={t('game.current_level_badge', { level: activeLevel.levelNumber })}
              active
              onClick={() => setView('level')}
              icon={<Target className="h-4 w-4" />}
            />
          )}
        </div>

        {view === 'home' && (
          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 grid gap-5 lg:grid-cols-[0.96fr_1.04fr]"
          >
            <div className="rounded-[34px] border border-[#234770] bg-[radial-gradient(circle_at_top_left,_rgba(95,182,255,0.32),_transparent_34%),linear-gradient(135deg,_#10264d_0%,_#061123_55%,_#0c2241_100%)] p-6 shadow-[0_24px_80px_rgba(3,11,25,0.45)]">
              <BrandSeal className="mx-auto w-full max-w-[210px]" />
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8bc2ff]">{t('game.subtitle')}</p>
              <h2 className="mt-2 font-serif text-4xl font-bold text-white">{t('game.headline')}</h2>
              <p className="mt-4 font-sans text-sm leading-7 text-[#d2e5ff]">
                {t('game.description')}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4b9eff] px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(75,158,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#63adff]"
                >
                  <Play className="h-4 w-4" />
                  {t('game.continue_level', { level: nextLevelNumber })}
                </button>
                <button
                  type="button"
                  onClick={() => setView('map')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                >
                  <Map className="h-4 w-4" />
                  {t('game.level_map')}
                </button>
                <button
                  type="button"
                  onClick={onOpenBooks}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                >
                  <BookOpen className="h-4 w-4" />
                  {t('menu.books')}
                </button>
                <button
                  type="button"
                  onClick={onOpenStudy}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('menu.study')}
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(11.5rem,1fr))]">
                <GameStatCard label={t('game.current_level')} value={String(nextLevelNumber)} icon={<Target className="h-5 w-5" />} accent="blue" />
                <GameStatCard label={t('game.levels_unlocked')} value={String(unlockedLevelCount)} icon={<Map className="h-5 w-5" />} accent="gold" />
                <GameStatCard label={t('game.words_found_total')} value={String(gameState.wordsFoundTotal)} icon={<Gamepad2 className="h-5 w-5" />} accent="violet" />
                <GameStatCard label={t('game.reward_points')} value={String(gameState.rewardPoints)} icon={<Star className="h-5 w-5" />} accent="orange" />
              </div>

              <div className="rounded-[34px] border border-white/10 bg-[#07162b] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7fb8ff]">{t('game.level_map')}</p>
                    <h3 className="mt-2 font-serif text-3xl font-bold text-white">{t('game.progress_title')}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d6e9ff]">
                    {completionPercent}%
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {themeSummaries.slice(0, 4).map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setView('map')}
                      className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition-all hover:border-[#7dc3ff]/40 hover:bg-[#10284f]"
                    >
                      <div>
                        <p className="font-serif text-lg font-bold text-white">{theme.name}</p>
                        <p className="mt-1 font-sans text-xs text-[#bfd8f7]">
                          {theme.completedInTheme}/{theme.levelsCount} {t('game.levels_completed_theme')}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#4b9eff]/25 bg-[#4b9eff]/10 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#d8ecff]">
                        {theme.firstLevel}-{theme.firstLevel + theme.levelsCount - 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {view === 'map' && (
          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 rounded-[34px] border border-white/10 bg-[#07162b] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7fb8ff]">{t('game.level_map')}</p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-white">{t('game.map_title')}</h2>
                <p className="mt-2 font-sans text-sm leading-6 text-[#cfe2ff]">
                  {t('game.map_body', { count: totalLevels })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4b9eff] px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(75,158,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#63adff]"
              >
                <Play className="h-4 w-4" />
                {t('game.continue_level', { level: nextLevelNumber })}
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-10">
              {themeSummaries.map((theme) => {
                const isThemeUnlocked = unlockedLevelCount >= theme.firstLevel;

                return (
                  <div key={theme.id} className="relative">
                    <div className="mb-6 flex flex-col items-center">
                      <div className={cn(
                        'rounded-full px-6 py-2 text-sm font-bold uppercase tracking-[0.18em] shadow-md',
                        isThemeUnlocked ? 'bg-[#4b9eff] text-white' : 'bg-white/10 text-white/45'
                      )}>
                        {theme.name}
                      </div>
                      <p className="mt-2 font-sans text-xs text-[#9fbfe0]">
                        {theme.completedInTheme}/{theme.levelsCount} {t('game.levels_completed_theme')}
                      </p>
                    </div>

                    <div className="relative mx-auto flex max-w-3xl flex-wrap justify-center gap-4">
                      {theme.levelsForTheme.map((level) => {
                        const isCompleted = gameState.completedLevels.includes(level.levelNumber);
                        const isUnlocked = level.levelNumber <= unlockedLevelCount || isCompleted;
                        const isCurrent = level.levelNumber === nextLevelNumber && !isCompleted;

                        return (
                          <button
                            key={level.levelNumber}
                            type="button"
                            onClick={() => {
                              if (isUnlocked) {
                                openLevel(level.levelNumber);
                              }
                            }}
                            className={cn(
                              'relative flex h-16 w-16 items-center justify-center rounded-full border text-lg font-bold font-serif shadow-lg transition-all',
                              isCurrent
                                ? 'border-[#ffe39a] bg-[#f6c969] text-[#13223a] ring-4 ring-[#f6c969]/25'
                                : isCompleted
                                  ? 'border-[#4b9eff]/20 bg-[#143a64] text-white'
                                  : isUnlocked
                                    ? 'border-white/14 bg-white/10 text-white hover:border-[#7dc3ff]/50 hover:bg-[#10284f]'
                                    : 'cursor-not-allowed border-white/8 bg-white/5 text-white/35'
                            )}
                          >
                            {level.levelNumber}
                            {isCompleted && (
                              <div className="absolute -bottom-2 flex items-center gap-0.5 rounded-full border border-[#f6c969]/20 bg-[#07162b] px-2 py-0.5 shadow-sm">
                                <Star className="h-2.5 w-2.5 fill-[#f6c969] text-[#f6c969]" />
                                <Star className="h-2.5 w-2.5 fill-[#f6c969] text-[#f6c969]" />
                                <Star className="h-2.5 w-2.5 fill-[#f6c969] text-[#f6c969]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {view === 'level' && activeLevel && board && (
          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 grid gap-5 lg:grid-cols-[0.88fr_1.12fr]"
          >
            <div className="grid gap-5">
              <div className="rounded-[34px] border border-[#234770] bg-[radial-gradient(circle_at_top_left,_rgba(95,182,255,0.25),_transparent_34%),linear-gradient(135deg,_#10264d_0%,_#061123_55%,_#0c2241_100%)] p-6 shadow-[0_24px_80px_rgba(3,11,25,0.45)]">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setView('map')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('game.back_to_map')}
                  </button>
                  <span className="rounded-full border border-[#f6c969]/20 bg-[#f6c969]/10 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffe39a]">
                    {t('game.current_level_badge', { level: activeLevel.levelNumber })}
                  </span>
                </div>

                <h2 className="mt-5 font-serif text-4xl font-bold text-white">{activeLevel.themeName}</h2>
                <p className="mt-3 font-sans text-sm leading-7 text-[#d2e5ff]">
                  {t('game.objective')}
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <GameStatCard label={t('game.words_found')} shortLabel={currentLanguage === 'en' ? 'Words found' : 'Palabras'} value={`${foundWords.length}/${board.words.length}`} icon={<Target className="h-5 w-5" />} accent="blue" compact />
                  <GameStatCard label={t('game.grid_size')} shortLabel={currentLanguage === 'en' ? 'Board size' : 'Tablero'} value={`${board.grid.length}x${board.grid.length}`} icon={<Gamepad2 className="h-5 w-5" />} accent="violet" compact />
                  <GameStatCard label={t('game.level_reward')} shortLabel={currentLanguage === 'en' ? 'Level reward' : 'Recompensa'} value={String(levelReward)} icon={<Star className="h-5 w-5" />} accent="gold" compact />
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-[#07162b] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7fb8ff]">{t('game.daily_words')}</p>
                    <h3 className="mt-2 font-serif text-2xl font-bold text-white">{t('game.word_list')}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleReplayLevel}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('game.replay_level')}
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {board.words.map((word) => {
                    const isFound = foundWords.includes(word.word);
                    return (
                      <span
                        key={word.word}
                        className={cn(
                          'rounded-full border px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.16em] transition-all',
                          isFound
                            ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200 line-through'
                            : 'border-[#f6c969]/25 bg-[#f6c969]/10 text-[#ffe8ae]'
                        )}
                      >
                        {word.word}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[#07162b] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
              <WordSearchBoard
                grid={board.grid}
                words={board.words}
                onWordFound={handleWordFound}
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onOpenBooks}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                >
                  <BookOpen className="h-4 w-4" />
                  {t('menu.books')}
                </button>
                <button
                  type="button"
                  onClick={onOpenStudy}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('menu.study')}
                </button>
              </div>
            </div>
          </motion.section>
        )}

        <AnimatePresence>
          {isLevelComplete && activeLevel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020817]/75 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.94 }}
                className="w-full max-w-md overflow-hidden rounded-[34px] border border-white/12 bg-[#07162b] p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.38)]"
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#f6c969]/30 bg-[#f6c969]/12 text-[#ffe39a] shadow-lg">
                  <Trophy className="h-12 w-12" />
                </div>

                <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8bc2ff]">{t('game.integration_ready')}</p>
                <h2 className="mt-2 text-center font-serif text-3xl font-bold text-white">{t('game.level_complete_title')}</h2>
                <p className="mt-4 text-center font-sans text-sm leading-7 text-[#d2e5ff]">
                  {t('game.level_complete_body', { level: activeLevel.levelNumber, reward: levelReward })}
                </p>

                <div className="mt-6 grid gap-3">
                  {activeLevel.levelNumber < totalLevels && (
                    <button
                      type="button"
                      onClick={handleOpenNextLevel}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4b9eff] px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(75,158,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#63adff]"
                    >
                      <Play className="h-4 w-4" />
                      {t('game.next_level')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReplayLevel}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('game.replay_level')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('map')}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[#dbecff] transition-all hover:border-[#7dc3ff]/50 hover:bg-[#10284f]"
                  >
                    <Map className="h-4 w-4" />
                    {t('game.back_to_map')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MobilePageFooter className="mt-8" />

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}

interface GameModeButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function GameModeButton({ label, active, onClick, icon }: GameModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] transition-all',
        active
          ? 'border-[#7dc3ff]/40 bg-[#10284f] text-white'
          : 'border-white/12 bg-white/5 text-[#dbecff] hover:border-[#7dc3ff]/30 hover:bg-[#10284f]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface GameStatCardProps {
  label: string;
  shortLabel?: string;
  value: string;
  icon: React.ReactNode;
  accent: 'blue' | 'gold' | 'violet' | 'orange';
  compact?: boolean;
}

function GameStatCard({ label, shortLabel, value, icon, accent, compact = false }: GameStatCardProps) {
  const tone = accent === 'gold'
    ? 'border-[#f6c969]/16 bg-[#f6c969]/10 text-[#ffe39a]'
    : accent === 'violet'
      ? 'border-[#8f7dff]/16 bg-[#8f7dff]/10 text-[#d9d2ff]'
      : accent === 'orange'
        ? 'border-[#ff9b54]/16 bg-[#ff9b54]/10 text-[#ffd6b6]'
        : 'border-[#4b9eff]/16 bg-[#4b9eff]/10 text-[#d8ecff]';
  const displayLabel = compact && shortLabel ? shortLabel : label;

  return (
    <div className={cn('min-w-0 overflow-hidden rounded-[28px] border shadow-sm', tone, compact ? 'p-3.5' : 'p-4')} title={label}>
      <div className={cn('flex min-w-0', compact ? 'items-start gap-2.5' : 'items-center gap-3')}>
        <div className={cn('flex shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-black/10', compact ? 'h-10 w-10' : 'h-11 w-11')}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('break-words font-sans font-bold uppercase text-current/75 text-pretty', compact ? 'text-[9px] leading-4 tracking-[0.16em]' : 'text-[10px] leading-[1.25] tracking-[0.14em]')}>
            {displayLabel}
          </p>
          <p className={cn('mt-1 break-words font-serif font-bold text-white', compact ? 'text-[1.75rem] leading-none' : 'text-3xl')}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
