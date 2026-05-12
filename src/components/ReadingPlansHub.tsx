import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, Eye, Heart, House, Search, Share2, User, Bookmark, Play, Users } from 'lucide-react';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { shareResource } from '@/src/lib/shareResource';
import { openExternalUrl } from '@/src/lib/openExternalUrl';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

interface ReadingPlansHubProps {
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenSearch: () => void;
  onOpenFavorites: () => void;
  onOpenUser: () => void;
}

type PlansTab = 'explore' | 'mine' | 'saved' | 'completed';

interface ReadingPlanItem {
  id: string;
  title: string;
  days: number;
  description: string;
  imageUrl: string;
  url: string;
}

const STORAGE_KEY = 'biblia_nj_reading_plans_v1';

const READING_PLANS: ReadingPlanItem[] = [
  {
    id: 'salvation',
    title: 'El Dios Que Nos Salva',
    days: 25,
    description: 'Un recorrido de Adviento y esperanza para contemplar la salvación de Dios paso a paso.',
    imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80',
    url: 'https://www.bible.com/reading-plans/21453-advent-the-god-who-saves',
  },
  {
    id: 'pentecost',
    title: 'Pentecostés',
    days: 7,
    description: 'Conoce mejor la obra del Espíritu Santo y cómo transforma la misión del creyente.',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
    url: 'https://www.bible.com/reading-plans/49691-pentecost',
  },
  {
    id: 'peace',
    title: 'Paz Para El Corazón',
    days: 15,
    description: 'Lecturas breves para bajar el ruido, volver al Evangelio y caminar con calma.',
    imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
    url: 'https://www.bible.com/reading-plans/18435-finding-peace-in-an-anxious-world',
  },
];

function readPlanState() {
  if (typeof window === 'undefined') {
    return { started: [] as string[], saved: [] as string[], completed: [] as string[] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { started: [] as string[], saved: [] as string[], completed: [] as string[] };
    }
    const parsed = JSON.parse(raw) as { started?: string[]; saved?: string[]; completed?: string[] };
    return {
      started: Array.isArray(parsed.started) ? parsed.started : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    };
  } catch {
    return { started: [] as string[], saved: [] as string[], completed: [] as string[] };
  }
}

export function ReadingPlansHub({ onGoBack, onGoHome, onOpenReader, onOpenSearch, onOpenFavorites, onOpenUser }: ReadingPlansHubProps) {
  const { i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'en' : 'es';
  const [activeTab, setActiveTab] = useState<PlansTab>('explore');
  const [durationFilter, setDurationFilter] = useState<'all' | 7 | 15 | 30 | 90>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [planState, setPlanState] = useState(() => readPlanState());

  const copy = currentLanguage === 'en'
    ? {
        title: 'Bible reading plans',
        search: 'Search...',
        tabs: { explore: 'Explore', mine: 'My plans', saved: 'Saved', completed: 'Completed' },
        filters: { all: 'All', 7: '7 days', 15: '15 days', 30: '30 days', 90: '90 days' },
        start: 'Start plan',
        view: 'View plan',
        save: 'Save plan',
        saved: 'Saved',
        share: 'Share',
        invite: 'Invite',
        empty: 'No plans match this filter yet.',
      }
    : {
        title: 'Planes de lectura bíblica',
        search: 'Buscar...',
        tabs: { explore: 'Explorar', mine: 'Mis planes', saved: 'Guardados', completed: 'Completados' },
        filters: { all: 'Todos', 7: '7 días', 15: '15 días', 30: '30 días', 90: '90 días' },
        start: 'Iniciar plan',
        view: 'Ver plan',
        save: 'Guardar plan',
        saved: 'Guardado',
        share: 'Compartir',
        invite: 'Invitar',
        empty: 'Todavía no hay planes para este filtro.',
      };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(planState));
    }
  }, [planState]);

  const filteredPlans = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let plans = READING_PLANS.filter((plan) => (
      (durationFilter === 'all' || plan.days === durationFilter) &&
      (!normalizedSearch || plan.title.toLowerCase().includes(normalizedSearch) || plan.description.toLowerCase().includes(normalizedSearch))
    ));

    if (activeTab === 'mine') {
      plans = plans.filter((plan) => planState.started.includes(plan.id));
    } else if (activeTab === 'saved') {
      plans = plans.filter((plan) => planState.saved.includes(plan.id));
    } else if (activeTab === 'completed') {
      plans = plans.filter((plan) => planState.completed.includes(plan.id));
    }

    return plans;
  }, [activeTab, durationFilter, planState.completed, planState.saved, planState.started, searchTerm]);

  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: currentLanguage === 'en' ? 'Home' : 'Inicio', icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: currentLanguage === 'en' ? 'Bible' : 'Biblia', icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: currentLanguage === 'en' ? 'Search' : 'Buscar', icon: <Search className="h-5 w-5" />, onClick: onOpenSearch },
    { id: 'plans', label: currentLanguage === 'en' ? 'Plans' : 'Planes', icon: <Calendar className="h-5 w-5" />, onClick: () => undefined, active: true },
    { id: 'favorites', label: currentLanguage === 'en' ? 'Saved' : 'Guardados', icon: <Heart className="h-5 w-5" />, onClick: onOpenFavorites },
    { id: 'user', label: currentLanguage === 'en' ? 'User' : 'Usuario', icon: <User className="h-5 w-5" />, onClick: onOpenUser },
  ]), [currentLanguage, onGoHome, onOpenFavorites, onOpenReader, onOpenSearch, onOpenUser]);

  const toggleSaved = (planId: string) => {
    setPlanState((current) => ({
      ...current,
      saved: current.saved.includes(planId)
        ? current.saved.filter((id) => id !== planId)
        : [...current.saved, planId],
    }));
  };

  const startPlan = async (plan: ReadingPlanItem) => {
    setPlanState((current) => ({
      ...current,
      started: current.started.includes(plan.id) ? current.started : [...current.started, plan.id],
    }));
    await openExternalUrl(plan.url);
  };

  const sharePlan = async (plan: ReadingPlanItem, invite = false) => {
    await shareResource({
      title: plan.title,
      text: invite
        ? `${currentLanguage === 'en' ? 'Join me in this reading plan:' : 'Te invito a este plan de lectura:'} ${plan.title}`
        : plan.description,
      url: plan.url,
    });
  };

  return (
    <div className="flex h-full flex-col bg-[#111820] text-white">
      <header className="border-b border-white/10 bg-[#050b14]/96 px-4 py-4 backdrop-blur-xl">
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
          <p className="text-[1.35rem] font-bold text-white">{copy.title}</p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['explore', 'mine', 'saved', 'completed'] as PlansTab[]).map((tab) => (
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
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={copy.search}
          className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/38"
        />

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 7, 15, 30, 90] as const).map((filter) => (
            <button
              key={String(filter)}
              type="button"
              onClick={() => setDurationFilter(filter)}
              className={cn(
                'rounded-full border px-3 py-2 text-[11px] font-bold transition-all',
                durationFilter === filter
                  ? 'border-white/25 bg-white text-[#111820]'
                  : 'border-white/10 bg-white/[0.03] text-white/68'
              )}
            >
              {copy.filters[filter]}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {filteredPlans.length > 0 ? filteredPlans.map((plan) => {
            const isSaved = planState.saved.includes(plan.id);

            return (
              <article key={plan.id} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_34px_rgba(0,0,0,0.2)]">
                <div className="flex gap-3">
                  <img src={plan.imageUrl} alt={plan.title} className="h-24 w-20 rounded-[18px] object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-bold text-white">{plan.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{plan.days} {currentLanguage === 'en' ? 'days' : 'días'}</p>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-white/72">{plan.description}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { void startPlan(plan); }} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#111820]">
                    <Play className="h-4 w-4" />
                    {copy.start}
                  </button>
                  <button type="button" onClick={() => { void openExternalUrl(plan.url); }} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    <Eye className="h-4 w-4" />
                    {copy.view}
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => toggleSaved(plan.id)} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    <Bookmark className="h-4 w-4" />
                    {isSaved ? copy.saved : copy.save}
                  </button>
                  <button type="button" onClick={() => { void sharePlan(plan); }} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    <Share2 className="h-4 w-4" />
                    {copy.share}
                  </button>
                  <button type="button" onClick={() => { void sharePlan(plan, true); }} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    <Users className="h-4 w-4" />
                    {copy.invite}
                  </button>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/68">{copy.empty}</div>
          )}
        </div>

        <MobilePageFooter className="mt-8" />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}