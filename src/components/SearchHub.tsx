import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Heart, House, LoaderCircle, Search, User, X } from 'lucide-react';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { searchBible } from '@/src/services/bibleApi';
import { normalizeAppLanguage } from '@/src/lib/language';
import type { BibleSearchResult } from '@/src/types';
import { type AboutLegalType } from '@/src/components/AboutLegalModal';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';
import { getStrongReference, loadStrongLexicon, searchStrongEntries, type StrongLexiconData } from '@/src/lib/strongLexicon';

interface SearchHubProps {
  initialQuery?: string;
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenPlans: () => void;
  onOpenFavorites: () => void;
  onOpenUser: () => void;
  onOpenOpinions?: () => void;
  onOpenDictionary?: () => void;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
  onOpenVerse: (bookAbrev: string, chapter: number, verseNumber: number) => void;
}

type SearchTab = 'all' | 'bible' | 'dictionary' | 'strong' | 'plans';
const SEARCH_PAGE_SIZE = 24;

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

export function SearchHub({ initialQuery, onGoBack, onGoHome, onOpenReader, onOpenPlans, onOpenFavorites, onOpenUser, onOpenOpinions, onOpenDictionary, onOpenAboutLegal, onOpenVerse }: SearchHubProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const [activeTab, setActiveTab] = useState<SearchTab>('bible');
  const [query, setQuery] = useState(typeof initialQuery === 'string' ? initialQuery : '');
  const [scope, setScope] = useState(currentLanguage === 'en' ? 'All' : 'Todo');
  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [resultVersion, setResultVersion] = useState<'RVR1960' | 'RVR1909' | 'KJV' | null>(null);
  const [incompleteResults, setIncompleteResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [strongData, setStrongData] = useState<StrongLexiconData | null>(null);
  const [isStrongLoading, setIsStrongLoading] = useState(false);
  const [strongError, setStrongError] = useState<string | null>(null);

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
        strongPlaceholder: 'Strong number, lemma, or transliteration...',
        strongIntro: 'Search 14,298 Hebrew and Greek Strong entries by number, lemma, or transliteration. Source definitions are in English. Interlinear references omit 1 Kings 22 and 3 John 15.',
        strongLoading: 'Loading the Strong lexicon...',
        strongError: 'The Strong lexicon could not be loaded. Check your connection and try again.',
        strongVerses: 'verses with this Strong number',
        resultLabel: 'Results',
        previousPage: 'Previous results',
        nextPage: 'Next results',
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
        strongPlaceholder: 'Número Strong, lema o transliteración...',
        strongIntro: 'Consulta 14.298 entradas Strong hebreas y griegas por número, lema o transliteración. Las definiciones originales están en inglés. La fuente interlineal no incluye 1 Reyes 22 ni 3 Juan 15.',
        strongLoading: 'Cargando el léxico Strong...',
        strongError: 'No se pudo cargar el léxico Strong. Revisa tu conexión e inténtalo de nuevo.',
        strongVerses: 'versículos con este número Strong',
        resultLabel: 'Resultados',
        previousPage: 'Resultados anteriores',
        nextPage: 'Resultados siguientes',
      };

  useEffect(() => {
    if (query.trim().length < 2 || (activeTab !== 'all' && activeTab !== 'bible')) {
      setResults([]);
      setTotalResults(0);
      setResultVersion(null);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setIncompleteResults(false);

    const timer = window.setTimeout(() => {
      searchBible(query.trim(), currentLanguage, SEARCH_PAGE_SIZE, currentPage * SEARCH_PAGE_SIZE)
        .then((response) => {
          if (!cancelled) {
            setResults(response.results);
            setTotalResults(response.total);
            setResultVersion(response.version ?? null);
            setIncompleteResults(Boolean(response.incomplete));
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setResults([]);
            setTotalResults(0);
            setResultVersion(null);
            setIncompleteResults(false);
            setErrorMessage(error instanceof Error ? error.message : copy.noResults);
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
  }, [activeTab, copy.noResults, currentLanguage, currentPage, query]);

  useEffect(() => {
    if (activeTab !== 'strong' || strongData) return undefined;

    let isCancelled = false;
    setIsStrongLoading(true);
    setStrongError(null);
    void loadStrongLexicon()
      .then((data) => { if (!isCancelled) setStrongData(data); })
      .catch(() => { if (!isCancelled) setStrongError(copy.strongError); })
      .finally(() => { if (!isCancelled) setIsStrongLoading(false); });

    return () => { isCancelled = true; };
  }, [activeTab, copy.strongError, strongData]);

  const strongMatches = useMemo(
    () => strongData ? searchStrongEntries(strongData.entries, query, SEARCH_PAGE_SIZE) : [],
    [query, strongData],
  );

  const resultRangeStart = totalResults === 0 ? 0 : currentPage * SEARCH_PAGE_SIZE + 1;
  const resultRangeEnd = Math.min((currentPage + 1) * SEARCH_PAGE_SIZE, totalResults);
  const pageCount = Math.max(1, Math.ceil(totalResults / SEARCH_PAGE_SIZE));
  const displayedVersion = resultVersion === 'RVR1909' ? 'Reina Valera 1909' : resultVersion === 'KJV' ? 'King James Version' : copy.version;

  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: currentLanguage === 'en' ? 'Home' : 'Inicio', icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: currentLanguage === 'en' ? 'Bible' : 'Biblia', icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: t('menu.search'), icon: <Search className="h-5 w-5" />, onClick: () => undefined, active: true },
    { id: 'plans', label: t('menu.plans'), icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans },
    { id: 'favorites', label: t('menu.favorites'), icon: <Heart className="h-5 w-5" />, onClick: onOpenFavorites },
    { id: 'user', label: t('menu.user'), icon: <User className="h-5 w-5" />, onClick: onOpenUser },
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
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7fb8ff]">{displayedVersion}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'bible', 'dictionary', 'strong', 'plans'] as SearchTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setCurrentPage(0); }}
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
            onChange={(event) => { setQuery(event.target.value); setCurrentPage(0); setTotalResults(0); setResults([]); setResultVersion(null); }}
            placeholder={activeTab === 'strong' ? copy.strongPlaceholder : copy.placeholder}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.04] py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-white/38"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); setCurrentPage(0); setTotalResults(0); setResults([]); setResultVersion(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/45"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
          <button type="button" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
            <span className="truncate">{displayedVersion}</span>
            <ChevronRight className="h-4 w-4 rotate-90 text-[#f0c15c]" />
          </button>
          <button type="button" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
            <span>{scope}</span>
            <ChevronRight className="h-4 w-4 rotate-90 text-[#f0c15c]" />
          </button>
        </div>

        {activeTab === 'strong' ? (
          <section className="mt-4 space-y-3">
            {isStrongLoading ? (
              <div className="flex items-center gap-2 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/72">
                <LoaderCircle className="h-4 w-4 animate-spin" />{copy.strongLoading}
              </div>
            ) : strongError ? (
              <div className="rounded-[24px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{strongError}</div>
            ) : query.trim().length < 2 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/72">
                {strongData ? `${strongData.entries.length.toLocaleString(currentLanguage === 'en' ? 'en-US' : 'es-ES')} · ` : ''}{copy.strongIntro}
              </div>
            ) : strongMatches.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/72">{copy.noResults}</div>
            ) : (
              strongMatches.map((entry) => {
                const references = strongData?.concordance[entry.number] ?? [];
                return (
                  <article key={entry.number} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-xs font-black uppercase tracking-widest text-[#f0c15c]">{entry.number}</span>
                      <h2 className="text-lg font-bold text-white">{entry.xlit || entry.lemma}</h2>
                      <span className="text-sm text-white/60">{entry.lemma}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">{entry.pronounce}</p>
                    <p className="mt-3 text-sm leading-6 text-white/78">{entry.description}</p>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[#7fb8ff]">
                      {references.length.toLocaleString(currentLanguage === 'en' ? 'en-US' : 'es-ES')} {copy.strongVerses}
                    </p>
                    {references.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {references.slice(0, 12).map((referenceId) => {
                          const reference = getStrongReference(referenceId);
                          if (!reference) return null;
                          return (
                            <button key={referenceId} type="button" onClick={() => onOpenVerse(reference.book.abrev, reference.chapter, reference.verse)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:border-[#f0c15c]/50 hover:text-white">
                              {reference.book.names[0]} {reference.chapter}:{reference.verse}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        ) : query.trim().length < 2 ? (
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7fb8ff]">{copy.resultLabel}</p>
                <p className="mt-1 text-xs text-white/65">
                  {currentLanguage === 'en' ? `${totalResults} results found` : `${totalResults} resultados encontrados`}
                  {totalResults > 0 ? ` · ${resultRangeStart}–${resultRangeEnd}` : ''}
                </p>
                {incompleteResults && <p className="mt-1 text-xs text-amber-300">{currentLanguage === 'en' ? 'Some chapters could not be loaded; these results may be incomplete.' : 'No se pudieron cargar algunos capítulos; los resultados pueden estar incompletos.'}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                  disabled={isLoading || currentPage === 0}
                  aria-label={copy.previousPage}
                  title={copy.previousPage}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(pageCount - 1, page + 1))}
                  disabled={isLoading || currentPage >= pageCount - 1}
                  aria-label={copy.nextPage}
                  title={copy.nextPage}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
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

        <MobilePageFooter
        className="mt-8"
        onOpenAboutLegal={onOpenAboutLegal}
        onOpenOpinions={onOpenOpinions}
        onOpenDictionary={onOpenDictionary}
      />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}
