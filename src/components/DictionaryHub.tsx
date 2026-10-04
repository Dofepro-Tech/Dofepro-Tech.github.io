import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, Heart, House, LoaderCircle, Search, User, X, Book as BookIcon, ChevronRight } from 'lucide-react';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { normalizeAppLanguage } from '@/src/lib/language';
import { type AboutLegalType } from '@/src/components/AboutLegalModal';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';
import { loadStrongLexicon, searchStrongEntries, type StrongLexiconEntry } from '@/src/lib/strongLexicon';

interface DictionaryEntry {
  word: string;
  definition: string;
  strongNumber?: string;
  lemma?: string;
}

const SAMPLE_ENTRIES: DictionaryEntry[] = [
  { word: 'Abba', definition: 'Palabra aramea que significa "padre". Aparece tres veces en el Nuevo Testamento (Marcos 14:36; Romanos 8:15; Gálatas 4:6) y expresa una relación de profunda confianza y cercanía con Dios.' },
  { word: 'Adonai', definition: 'Título hebreo que significa "mi Señor" o "mi Maestro". Es uno de los nombres más comunes usados para Dios en el Antiguo Testamento.' },
  { word: 'Aleluya', definition: 'Expresión de júbilo que significa "Alabad a Jehová". Se usa frecuentemente en los Salmos y en el libro de Apocalipsis.' },
  { word: 'Amen', definition: 'Palabra hebrea que significa "así sea", "en verdad" o "ciertamente". Se usa para confirmar una oración, una bendición o una promesa.' },
  { word: 'Bautismo', definition: 'Rito cristiano de iniciación que simboliza la purificación, el arrepentimiento y la unión con la muerte y resurrección de Cristo.' },
  { word: 'Cristo', definition: 'Del griego "Christos", que traduce el hebreo "Mesías" y significa "El Ungido". Es el título real de Jesús como el salvador prometido.' },
  { word: 'Fe', definition: 'Confianza y seguridad plena en Dios y en sus promesas, incluso cuando no vemos el resultado inmediato. (Hebreos 11:1)' },
  { word: 'Gracia', definition: 'Favor inmerecido de Dios hacia el ser humano. Es el regalo de la salvación a través de Jesucristo, no por obras nuestras.' },
  { word: 'Hosanna', definition: 'Grito de alabanza y súplica que significa "¡Sálvanos ahora!". Fue usado por la multitud durante la entrada triunfal de Jesús en Jerusalén.' },
  { word: 'Justificación', definition: 'Acto judicial de Dios por el cual declara justo al pecador sobre la base de la justicia de Cristo, recibida por medio de la fe.' },
  { word: 'Mesías', definition: 'Del hebreo "Mashíaj", significa "El Ungido". Se refiere al Rey libertador prometido por Dios a Israel.' },
  { word: 'Pecado', definition: 'Errar el blanco. Cualquier acción, pensamiento o actitud que se opone a la voluntad de Dios y rompe nuestra relación con Él.' },
  { word: 'Redención', definition: 'El acto de comprar de nuevo o liberar mediante el pago de un rescate. Cristo nos redimió de la esclavitud del pecado con su sangre.' },
  { word: 'Salvación', definition: 'La liberación del juicio de Dios y de las consecuencias del pecado, otorgada por Dios como regalo a través de Jesucristo.' },
  { word: 'Trinidad', definition: 'Concepto teológico que describe a un solo Dios que existe eternamente en tres personas co-iguales y co-eternas: Padre, Hijo y Espíritu Santo.' },
];

interface DictionaryHubProps {
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenPlans: () => void;
  onOpenFavorites: () => void;
  onOpenUser: () => void;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
}

export function DictionaryHub({ onGoBack, onGoHome, onOpenReader, onOpenPlans, onOpenFavorites, onOpenUser, onOpenAboutLegal }: DictionaryHubProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const [searchTerm, setSearchTerm] = useState('');
  const [strongEntries, setStrongEntries] = useState<StrongLexiconEntry[]>([]);
  const [isStrongLoading, setIsStrongLoading] = useState(true);
  const [strongLoadError, setStrongLoadError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    void loadStrongLexicon()
      .then((data) => { if (!isCancelled) setStrongEntries(data.entries); })
      .catch(() => { if (!isCancelled) setStrongLoadError(true); })
      .finally(() => { if (!isCancelled) setIsStrongLoading(false); });

    return () => { isCancelled = true; };
  }, []);

  const strongResults = useMemo(() => {
    const matches = searchTerm.trim()
      ? searchStrongEntries(strongEntries, searchTerm, 40)
      : strongEntries.slice(0, 24);
    return matches.map((entry) => ({
      word: entry.xlit || entry.lemma,
      definition: entry.description,
      strongNumber: entry.number,
      lemma: entry.lemma,
    }));
  }, [searchTerm, strongEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const curatedEntries = q
      ? SAMPLE_ENTRIES.filter((entry) => entry.word.toLowerCase().includes(q) || entry.definition.toLowerCase().includes(q))
      : SAMPLE_ENTRIES;
    return [...curatedEntries, ...strongResults].slice(0, 50);
  }, [searchTerm, strongResults]);
  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: t('app.home'), icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: t('menu.books'), icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: t('menu.search'), icon: <Search className="h-5 w-5" />, onClick: () => undefined },
    { id: 'user', label: t('menu.user'), icon: <User className="h-5 w-5" />, onClick: onOpenUser },
    { id: 'plans', label: t('menu.plans'), icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans },
  ]), [currentLanguage, onGoHome, onOpenPlans, onOpenReader, onOpenUser]);

  return (
    <div className="flex h-full flex-col bg-[#111820] text-white">
      <header className="border-b border-white/10 bg-[#050b14]/96 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onGoBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="text-xl font-bold font-serif">{currentLanguage === 'en' ? 'Bible Dictionary' : 'Diccionario Bíblico'}</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              placeholder={currentLanguage === 'en' ? 'Search word...' : 'Buscar término...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>
          <div className="mt-3 flex min-h-6 items-center gap-2 text-xs text-white/55">
            {isStrongLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {strongLoadError
              ? (currentLanguage === 'en' ? 'Strong lexicon is unavailable offline.' : 'El léxico Strong no está disponible sin conexión.')
              : strongEntries.length > 0
                ? (currentLanguage === 'en'
                  ? `${strongEntries.length.toLocaleString('en-US')} Strong entries · original definitions in English`
                  : `${strongEntries.length.toLocaleString('es-ES')} entradas Strong · definiciones originales en inglés`)
                : (currentLanguage === 'en' ? 'Loading complete Strong lexicon…' : 'Cargando el léxico Strong completo…')}
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-2">
          {filteredEntries.length === 0 ? (
            <div className="col-span-full text-center py-20 opacity-30 italic">No se encontraron términos para "{searchTerm}".</div>
          ) : (
            filteredEntries.map(e => (
              <div key={e.strongNumber ?? e.word} className="p-6 rounded-[28px] border border-white/5 bg-white/[0.03] hover:border-[var(--primary)]/20 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                   <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]"><BookIcon className="h-5 w-5" /></div>
                   <div className="min-w-0">
                     {e.strongNumber && <p className="text-[10px] font-bold uppercase tracking-wider text-[#f0c15c]">{e.strongNumber}</p>}
                     <h3 className="text-lg font-bold group-hover:text-[var(--primary)] transition-colors">{e.word}</h3>
                     {e.lemma && <p className="text-xs text-white/50">{e.lemma}</p>}
                   </div>
                </div>
                <p className="text-sm leading-relaxed text-white/70">{e.definition}</p>
              </div>
            ))
          )}
        </div>

          <div className="max-w-4xl mx-auto p-5 rounded-3xl border border-dashed border-white/10 text-center text-xs leading-5 text-white/55">
            {currentLanguage === 'en'
             ? 'Strong lexicon source: OpenScriptures-derived public-domain data (Unlicense). Original source definitions are in English. The Strong tab includes linked verse references.'
             : 'Fuente del léxico Strong: datos de dominio público derivados de OpenScriptures (Unlicense). Las definiciones originales están en inglés. La pestaña Strong incluye referencias a versículos; el interlineal fuente omite 1 Reyes 22 y 3 Juan 15.'}
        </div>

        <MobilePageFooter onOpenAboutLegal={onOpenAboutLegal} />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}
