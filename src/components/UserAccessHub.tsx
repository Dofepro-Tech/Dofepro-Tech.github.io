import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, Heart, House, Mail, Search, User, LogOut, PencilLine } from 'lucide-react';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

interface UserAccessHubProps {
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenSearch: () => void;
  onOpenPlans: () => void;
  onOpenFavorites: () => void;
}

interface StoredSession {
  name: string;
  email: string;
  provider: 'email' | 'google';
}

const STORAGE_KEY = 'biblia_nj_user_session';

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredSession : null;
  } catch {
    return null;
  }
}

export function UserAccessHub({ onGoBack, onGoHome, onOpenReader, onOpenSearch, onOpenPlans, onOpenFavorites }: UserAccessHubProps) {
  const { i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'en' : 'es';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<StoredSession | null>(() => readSession());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const copy = currentLanguage === 'en'
    ? {
        title: 'User access',
        signIn: 'Sign in',
        createAccount: 'Create account',
        continueGoogle: 'Continue with Google',
        email: 'Email address',
        password: 'Password',
        name: 'Display name',
        submitLogin: 'Sign in',
        submitSignup: 'Create account',
        forgot: 'Forgot my password',
        providerEmail: 'Email access',
        providerGoogle: 'Google access',
        saveName: 'Save profile',
        logout: 'Sign out',
      }
    : {
        title: 'Usuario',
        signIn: 'Iniciar sesión',
        createAccount: 'Crear cuenta',
        continueGoogle: 'Continuar con Google',
        email: 'Correo electrónico',
        password: 'Contraseña',
        name: 'Nombre para mostrar',
        submitLogin: 'Iniciar sesión',
        submitSignup: 'Crear cuenta',
        forgot: 'Olvidé mi contraseña',
        providerEmail: 'Acceso por correo',
        providerGoogle: 'Acceso con Google',
        saveName: 'Guardar perfil',
        logout: 'Cerrar sesión',
      };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: currentLanguage === 'en' ? 'Home' : 'Inicio', icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: currentLanguage === 'en' ? 'Bible' : 'Biblia', icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: currentLanguage === 'en' ? 'Search' : 'Buscar', icon: <Search className="h-5 w-5" />, onClick: onOpenSearch },
    { id: 'plans', label: currentLanguage === 'en' ? 'Plans' : 'Planes', icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans },
    { id: 'favorites', label: currentLanguage === 'en' ? 'Saved' : 'Guardados', icon: <Heart className="h-5 w-5" />, onClick: onOpenFavorites },
    { id: 'user', label: copy.title, icon: <User className="h-5 w-5" />, onClick: () => undefined, active: true },
  ]), [copy.title, currentLanguage, onGoHome, onOpenFavorites, onOpenPlans, onOpenReader, onOpenSearch]);

  const submitAccess = () => {
    if (!email.trim() || !password.trim()) {
      setStatusMessage(currentLanguage === 'en' ? 'Complete email and password.' : 'Completa correo y contraseña.');
      return;
    }

    const displayName = mode === 'signup' && name.trim() ? name.trim() : email.split('@')[0];
    setSession({
      name: displayName,
      email: email.trim(),
      provider: 'email',
    });
    setStatusMessage(currentLanguage === 'en' ? 'Access ready on this device.' : 'Acceso listo en este dispositivo.');
  };

  const signInWithGoogle = () => {
    setSession({
      name: currentLanguage === 'en' ? 'Google user' : 'Usuario Google',
      email: 'google@local.app',
      provider: 'google',
    });
    setStatusMessage(currentLanguage === 'en' ? 'Google access simulated locally.' : 'Acceso con Google simulado de forma local.');
  };

  return (
    <div className="flex h-full flex-col bg-[#06090f] text-white">
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
          <div>
            <p className="text-[1.35rem] font-bold text-white">{copy.title}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7fb8ff]">
              {currentLanguage === 'en' ? 'Access and profile' : 'Acceso y perfil'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6">
        {!session ? (
          <div className="mx-auto max-w-sm text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#1d4f96] bg-[#07152b] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <BrandSeal className="h-full w-full" showWordmark={false} />
            </div>
            <p className="mt-4 text-[1.6rem] font-bold text-white">{copy.title}</p>
            <p className="mt-2 text-sm text-white/58">{currentLanguage === 'en' ? 'Quick access on this device.' : 'Acceso rápido en este dispositivo.'}</p>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-1">
              <button type="button" onClick={() => setMode('login')} className={cn('rounded-[18px] px-3 py-3 text-sm font-semibold transition-all', mode === 'login' ? 'bg-[#1b8be0] text-white' : 'text-white/65')}>
                {copy.signIn}
              </button>
              <button type="button" onClick={() => setMode('signup')} className={cn('rounded-[18px] px-3 py-3 text-sm font-semibold transition-all', mode === 'signup' ? 'bg-[#1b8be0] text-white' : 'text-white/65')}>
                {copy.createAccount}
              </button>
            </div>

            <button type="button" onClick={signInWithGoogle} className="mt-4 flex w-full items-center justify-center gap-3 rounded-[18px] border border-[#1c3c69] bg-[#08192f] px-4 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,0,0,0.22)]">
              <Mail className="h-4 w-4 text-[#f0c15c]" />
              {copy.continueGoogle}
            </button>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-left">
              {mode === 'signup' ? (
                <label className="mb-3 block">
                  <span className="mb-2 block text-xs text-white/48">{copy.name}</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#121920] px-4 py-3 text-sm text-white outline-none" />
                </label>
              ) : null}
              <label className="mb-3 block">
                <span className="mb-2 block text-xs text-white/48">{copy.email}</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#121920] px-4 py-3 text-sm text-white outline-none" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs text-white/48">{copy.password}</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#121920] px-4 py-3 text-sm text-white outline-none" />
              </label>

              <button type="button" onClick={submitAccess} className="mt-5 w-full rounded-full bg-white px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#111820]">
                {mode === 'login' ? copy.submitLogin : copy.submitSignup}
              </button>

              <p className="mt-4 text-center text-sm text-white/48">{copy.forgot}</p>
              {statusMessage ? <p className="mt-4 text-center text-sm text-[#8dc3ff]">{statusMessage}</p> : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1b8be0_0%,#f0c15c_100%)] text-xl font-bold text-white">
                  {session.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold text-white">{session.name}</p>
                  <p className="truncate text-sm text-white/58">{session.email}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8dc3ff]">{session.provider === 'google' ? copy.providerGoogle : copy.providerEmail}</p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 flex items-center gap-2 text-xs text-white/48"><PencilLine className="h-4 w-4" />{copy.name}</span>
                <input value={session.name} onChange={(event) => setSession({ ...session, name: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#121920] px-4 py-3 text-sm text-white outline-none" />
              </label>

              <button type="button" onClick={() => setStatusMessage(currentLanguage === 'en' ? 'Profile updated locally.' : 'Perfil actualizado de forma local.')} className="mt-5 w-full rounded-full bg-[#1b8be0] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                {copy.saveName}
              </button>
              <button type="button" onClick={() => setSession(null)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                <LogOut className="h-4 w-4" />
                {copy.logout}
              </button>
              {statusMessage ? <p className="mt-4 text-center text-sm text-[#8dc3ff]">{statusMessage}</p> : null}
            </div>
          </div>
        )}

        <MobilePageFooter className="mt-8" />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}