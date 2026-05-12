import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Heart, House, Search, User, X } from 'lucide-react';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { searchBible } from '@/src/services/bibleApi';
import { normalizeAppLanguage } from '@/src/lib/language';
import type { BibleSearchResult } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

interface SearchHubProps {
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenPlans: () => void;
  onOpenFavorites: () => void;
  onOpenUser: () => void;
  onOpenVerse: (bookAbrev: string, chapter: number, verseNumber: number) => void;
}

type SearchTab = 'all' | 'bible' | 'dictionary' | 'strong' | 'plans';

const SEARCH_EXAMPLES = {
  es: [
    'Búsqueda por versículo: Juan 3:16',
    'Búsqueda por capítulo: Salmos 91',
    'Búsqueda por palabra: Amor',
    'Versículos seguidos: Eclesiastés 11:1-10',
    'Varios libros y combinaciones: Juan 1:1-4 / Mateo 2:2-6',
  ],
  en: [
    'Verse search: John 3:16',
    'Chapter search: Psalms 91',
    'Word search: Love',
    'Verse range: Ecclesiastes 11:1-10',
    'Multiple references: John 1:1-4 / Matthew 2:2-6',
  ],
};

export function SearchHub({ onGoBack, onGoHome, onOpenReader, onOpenPlans, onOpenFavorites, onOpenUser, onOpenVerse }: SearchHubProps) {
  const { i18n } = useTranslation();
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const [activeTab, setActiveTab] = useState<SearchTab>('bible');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(currentLanguage === 'en' ? 'All' : 'Todo');
  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const copy = currentLanguage === 'en'
    ? {
        title: 'Search',
        placeholder: 'Word, passage, or topic...',
        version: 'Reina Valera 1960',
        tabs: {
          all: 'All',
          bible: 'Bible',
          dictionary: 'Dictionary',
          strong: 'Strong',
          plans: 'Plans',
        },
        helpTitle: 'We help you with these examples to search Scripture',
        empty: 'Type at least 2 characters to search the Bible.',
        emptyCategory: 'This category is not connected yet. Switch to Bible or All to search real verses.',
        loading: 'Searching across the Bible...',
        noResults: 'No matches found.',
        resultLabel: 'Results',
      }
    : {
        title: 'Buscar',
        placeholder: 'Palabra, pasaje o tema...',
        version: 'Reina Valera 1960',
        tabs: {
          all: 'Todos',
          bible: 'Biblia',
          dictionary: 'Diccionario',
          strong: 'Strong',
          plans: 'Planes',
        },
        helpTitle: 'Te ayudamos con estos ejemplos para utilizar la Concordancia Bíblica',
        empty: 'Escribe al menos 2 caracteres para buscar en la Biblia.',
        emptyCategory: 'Esta categoría todavía no está conectada. Cambia a Biblia o Todos para buscar versículos reales.',
        loading: 'Buscando en toda la Biblia...',
        noResults: 'No se encontraron coincidencias.',
        resultLabel: 'Resultados',
      };

  useEffect(() => {
    if (query.trim().length < 2 || (activeTab !== 'all' && activeTab !== 'bible')) {
      setResults([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    const timer = window.setTimeout(() => {
      searchBible(query.trim(), currentLanguage, 24)
        .then((response) => {
          if (!cancelled) {
            setResults(response.results);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error('SearchHub search failed:', error);
            setResults([]);
            setErrorMessage(copy.noResults);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, copy.noResults, currentLanguage, query]);

  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: currentLanguage === 'en' ? 'Home' : 'Inicio', icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: currentLanguage === 'en' ? 'Bible' : 'Biblia', icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: copy.title, icon: <Search className="h-5 w-5" />, onClick: () => undefined, active: true },
    { id: 'plans', label: currentLanguage === 'en' ? 'Plans' : 'Planes', icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans },
    { id: 'favorites', label: currentLanguage === 'en' ? 'Saved' : 'Guardados', icon: <Heart className="h-5 w-5" />, onClick: onOpenFavorites },
    { id: 'user', label: currentLanguage === 'en' ? 'User' : 'Usuario', icon: <User className="h-5 w-5" />, onClick: onOpenUser },
  ]), [copy.title, currentLanguage, onGoHome, onOpenFavorites, onOpenPlans, onOpenReader, onOpenUser]);

  return (
    <div className="flex h-full flex-col bg-[#111820] text-white">
      <header className="border-b border-white/10 bg-[#050b14]/96 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-all hover:bg-white/[0.08]"
            aria-label={currentLanguage === 'en' ? 'Back' : 'Volver'}
            title={currentLanguage === 'en' ? 'Back' : 'Volver'}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-all hover:bg-white/[0.08]"
            aria-label={currentLanguage === 'en' ? 'Home' : 'Inicio'}
            title={currentLanguage === 'en' ? 'Home' : 'Inicio'}
          >
            <House className="h-5 w-5" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1d4f96] bg-[#07152b] p-1.5">
            <BrandSeal className="h-full w-full" showWordmark={false} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-serif text-[1.45rem] font-bold leading-none text-white">{copy.title}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7fb8ff]">{copy.version}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'bible', 'dictionary', 'strong', 'plans'] as SearchTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-all',
                activeTab === tab
                  ? 'border-[#f0c15c] bg-[#1a2638] text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/58'
              )}
            >
              {copy.tabs[tab]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.04] py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-white/38"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/45"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
          <button type="button" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
            <span className="truncate">{copy.version}</span>
            <ChevronRight className="h-4 w-4 rotate-90 text-[#f0c15c]" />
          </button>
          <button type="button" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
            <span>{scope}</span>
            <ChevronRight className="h-4 w-4 rotate-90 text-[#f0c15c]" />
          </button>
        </div>

        {query.trim().length < 2 ? (
          <section className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <h2 className="max-w-sm text-xl font-bold leading-7 text-white">{copy.helpTitle}</h2>
            <div className="mt-4 space-y-3 text-sm text-white/72">
              {SEARCH_EXAMPLES[currentLanguage].map((example) => (
                <div key={example} className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#f0c15c]" />
                  <p>{example}</p>
                </div>
              ))}
            </div>
          </section>
        ) : activeTab !== 'all' && activeTab !== 'bible' ? (
          <section className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/72">
            {copy.emptyCategory}
          </section>
        ) : (
          <section className="mt-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7fb8ff]">{copy.resultLabel}</p>
            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/72">{copy.loading}</div>
              ) : results.length > 0 ? (
                results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => onOpenVerse(result.bookAbrev, result.chapter, result.verseNumber)}
                    className="w-full rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-[#5aa8ff]/35 hover:bg-[#0f1f33]"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f0c15c]">{result.bookName} {result.chapter}:{result.verseNumber}</p>
                    <p className="mt-2 font-serif text-base leading-7 text-white/92">{result.verseText}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/72">
                  {errorMessage ?? copy.empty}
                </div>
              )}
            </div>
          </section>
        )}

        <MobilePageFooter className="mt-8" />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}