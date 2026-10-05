import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calendar, ChevronLeft, Eye, EyeOff, Heart, House, Search, User, LogOut, PencilLine, LoaderCircle } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { BrandSeal } from '@/src/components/BrandSeal';
import { MobileBottomNav, MobilePageFooter } from '@/src/components/MobileBottomNav';
import { type AboutLegalType } from '@/src/components/AboutLegalModal';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';
import { createPkceChallenge, createPkceVerifier, exchangeGoogleAuthorizationCode, getGoogleAuthorizationUrl, refreshAuthSession, resendSignupConfirmation, sendPasswordReset, signInWithEmail, signOutFromAuth, signUpWithEmail, updateAuthProfile, type AuthTokens } from '@/src/services/authApi';
import { AUTH_SESSION_CHANGED_EVENT, USER_SESSION_STORAGE_KEY } from '@/src/lib/authSession';

interface UserAccessHubProps {
  onGoBack: () => void;
  onGoHome: () => void;
  onOpenReader: () => void;
  onOpenSearch: () => void;
  onOpenPlans: () => void;
  onOpenFavorites: () => void;
  onOpenAboutLegal?: (type: AboutLegalType) => void;
}

interface StoredSession {
  name: string;
  email: string;
  provider: 'email' | 'google';
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const GOOGLE_VERIFIER_KEY = 'biblia_nj_google_pkce_verifier';
const GOOGLE_CALLBACK_KEY = 'biblia_nj_google_callback_url';

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_SESSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<StoredSession> : null;
    if (!parsed?.accessToken || !parsed.refreshToken || !parsed.userId) {
      window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

function toStoredSession(tokens: AuthTokens, provider: StoredSession['provider'] = 'email'): StoredSession {
  const metadata = tokens.user.user_metadata ?? {};
  const metadataName = metadata.display_name ?? metadata.full_name ?? metadata.name;
  const email = tokens.user.email ?? '';
  return {
    name: typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : email.split('@')[0] || 'Usuario',
    email,
    provider,
    userId: tokens.user.id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + Math.max(0, tokens.expires_in - 60) * 1000,
  };
}
export function UserAccessHub({ onGoBack, onGoHome, onOpenReader, onOpenSearch, onOpenPlans, onOpenFavorites, onOpenAboutLegal }: UserAccessHubProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'en' : 'es';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(() => readSession());
  const [profileName, setProfileName] = useState(() => readSession()?.name ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth') === 'confirmed'
      ? (currentLanguage === 'en' ? 'Your email is confirmed. You can sign in now.' : 'Tu correo está confirmado. Ya puedes iniciar sesión.')
      : null
  ));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  const copy = currentLanguage === 'en'
    ? {
        title: 'User access',
        signIn: 'Sign in',
        createAccount: 'Create account',
        email: 'Email address',
        password: 'Password',
        name: 'Display name',
        submitLogin: 'Sign in',
        submitSignup: 'Create account',
        forgot: 'Forgot my password',
        providerEmail: 'Email access',
        providerGoogle: 'Google account',
        saveName: 'Save profile',
        logout: 'Sign out',
        showPassword: 'Show password',
        hidePassword: 'Hide password',
        resendConfirmation: 'Resend confirmation email',
      }
    : {
        title: 'Usuario',
        signIn: 'Iniciar sesión',
        createAccount: 'Crear cuenta',
        email: 'Correo electrónico',
        password: 'Contraseña',
        name: 'Nombre para mostrar',
        submitLogin: 'Iniciar sesión',
        submitSignup: 'Crear cuenta',
        forgot: 'Olvidé mi contraseña',
        providerEmail: 'Acceso por correo',
        providerGoogle: 'Cuenta de Google',
        saveName: 'Guardar perfil',
        logout: 'Cerrar sesión',
        showPassword: 'Mostrar contraseña',
        hidePassword: 'Ocultar contraseña',
        resendConfirmation: 'Reenviar correo de confirmación',
      };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
    }
    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
  }, [session]);

  useEffect(() => {
    if (session) setProfileName(session.name);
  }, [session?.name]);

  useEffect(() => {
    if (!session?.refreshToken) return;
    let isCancelled = false;
    const refresh = () => {
      void refreshAuthSession(session.refreshToken)
        .then((tokens) => {
          if (!isCancelled) setSession(toStoredSession(tokens));
        })
        .catch(() => {
          if (!isCancelled) setSession(null);
        });
    };
    const delay = session.expiresAt - Date.now();
    const timeoutId = delay > 60_000 ? window.setTimeout(refresh, delay - 60_000) : window.setTimeout(refresh, 0);
    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [session?.expiresAt, session?.refreshToken]);

  useEffect(() => {
    const finishGoogleLogin = async (callbackUrl: string) => {
      const url = new URL(callbackUrl);
      const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');
      if (oauthError) {
        window.localStorage.removeItem(GOOGLE_VERIFIER_KEY);
        window.localStorage.removeItem(GOOGLE_CALLBACK_KEY);
        setStatusMessage(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
        return;
      }
      const code = url.searchParams.get('code');
      const verifier = window.localStorage.getItem(GOOGLE_VERIFIER_KEY);
      if (!code || !verifier) return;

      window.localStorage.removeItem(GOOGLE_VERIFIER_KEY);
      window.localStorage.removeItem(GOOGLE_CALLBACK_KEY);
      setIsGoogleSubmitting(true);
      setStatusMessage(null);
      try {
        const tokens = await exchangeGoogleAuthorizationCode(code, verifier);
        setSession(toStoredSession(tokens, 'google'));
        setStatusMessage(currentLanguage === 'en' ? 'Signed in with Google.' : 'Has iniciado sesión con Google.');
        if (!Capacitor.isNativePlatform()) {
          window.history.replaceState({}, '', `${url.pathname}${url.hash}`);
        }
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : (currentLanguage === 'en' ? 'Google sign-in failed.' : 'No se pudo iniciar sesión con Google.'));
      } finally {
        setIsGoogleSubmitting(false);
      }
    };

    const pendingCallback = window.localStorage.getItem(GOOGLE_CALLBACK_KEY);
    const currentUrl = new URL(window.location.href);
    if (pendingCallback) void finishGoogleLogin(pendingCallback);
    else if (currentUrl.searchParams.has('code') || currentUrl.searchParams.has('error')) void finishGoogleLogin(currentUrl.toString());

    const handleCallbackEvent = () => {
      const callbackUrl = window.localStorage.getItem(GOOGLE_CALLBACK_KEY);
      if (callbackUrl) void finishGoogleLogin(callbackUrl);
    };
    window.addEventListener('biblia-google-oauth-callback', handleCallbackEvent);
    return () => window.removeEventListener('biblia-google-oauth-callback', handleCallbackEvent);
  }, [currentLanguage]);

  const mobileNavItems = useMemo(() => ([
    { id: 'home', label: currentLanguage === 'en' ? 'Home' : 'Inicio', icon: <House className="h-5 w-5" />, onClick: onGoHome },
    { id: 'reader', label: currentLanguage === 'en' ? 'Bible' : 'Biblia', icon: <BookOpen className="h-5 w-5" />, onClick: onOpenReader },
    { id: 'search', label: t('menu.search'), icon: <Search className="h-5 w-5" />, onClick: onOpenSearch },
    { id: 'plans', label: t('menu.plans'), icon: <Calendar className="h-5 w-5" />, onClick: onOpenPlans },
    { id: 'favorites', label: t('menu.favorites'), icon: <Heart className="h-5 w-5" />, onClick: onOpenFavorites },
    { id: 'user', label: t('menu.user'), icon: <User className="h-5 w-5" />, onClick: () => undefined, active: true },
  ]), [copy.title, currentLanguage, onGoHome, onOpenFavorites, onOpenPlans, onOpenReader, onOpenSearch]);

  const submitAccess = async () => {
    if (!email.trim() || !password.trim()) {
      setStatusMessage(currentLanguage === 'en' ? 'Complete email and password.' : 'Completa correo y contraseña.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setStatusMessage(currentLanguage === 'en' ? 'Use a password with at least 8 characters.' : 'Usa una contraseña de al menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setCanResendConfirmation(false);
    try {
      if (mode === 'signup') {
        const result = await signUpWithEmail(email.trim(), password, name.trim());
        if (result.session) {
          setSession(toStoredSession(result.session));
          setStatusMessage(currentLanguage === 'en' ? 'Your account is ready.' : 'Tu cuenta está lista.');
        } else {
          setCanResendConfirmation(true);
          setStatusMessage(currentLanguage === 'en' ? 'Check your email to confirm your account, then sign in.' : 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
        }
      } else {
        const tokens = await signInWithEmail(email.trim(), password);
        setSession(toStoredSession(tokens));
        setStatusMessage(currentLanguage === 'en' ? 'You are signed in.' : 'Has iniciado sesión.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : (currentLanguage === 'en' ? 'Authentication failed.' : 'No se pudo autenticar la cuenta.');
      if (/email[_ ]not[_ ]confirmed|email not confirmed/i.test(message)) setCanResendConfirmation(true);
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatusMessage(currentLanguage === 'en' ? 'Enter your account email first.' : 'Primero escribe el correo de tu cuenta.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await resendSignupConfirmation(normalizedEmail);
      setStatusMessage(currentLanguage === 'en'
        ? 'If the account needs confirmation, a new email has been sent. Check your inbox and spam folder.'
        : 'Si la cuenta necesita confirmación, se envió un nuevo correo. Revisa la bandeja de entrada y el correo no deseado.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : (currentLanguage === 'en' ? 'Could not resend the confirmation email.' : 'No se pudo reenviar el correo de confirmación.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    setStatusMessage(null);
    try {
      const verifier = createPkceVerifier();
      const challenge = await createPkceChallenge(verifier);
      const redirectTo = Capacitor.isNativePlatform()
        ? 'com.dofepro.biblianj://auth/callback'
        : `${window.location.origin}/?auth=callback`;
      window.localStorage.setItem(GOOGLE_VERIFIER_KEY, verifier);
      const authorizationUrl = await getGoogleAuthorizationUrl(redirectTo, challenge);
      if (Capacitor.isNativePlatform()) await Browser.open({ url: authorizationUrl });
      else window.location.assign(authorizationUrl);
    } catch (error) {
      window.localStorage.removeItem(GOOGLE_VERIFIER_KEY);
      setStatusMessage(error instanceof Error ? error.message : (currentLanguage === 'en' ? 'Google sign-in could not start.' : 'No se pudo iniciar el acceso con Google.'));
      setIsGoogleSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setStatusMessage(currentLanguage === 'en' ? 'Enter your account email first.' : 'Primero escribe el correo de tu cuenta.');
      return;
    }
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await sendPasswordReset(email.trim());
      setStatusMessage(currentLanguage === 'en' ? 'If the account exists, a password reset email is on its way.' : 'Si la cuenta existe, recibirás un correo para restablecer la contraseña.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : (currentLanguage === 'en' ? 'Could not send the reset email.' : 'No se pudo enviar el correo de recuperación.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      await signOutFromAuth(session.accessToken);
    } catch {
      // Clear the local session even if the network is unavailable.
    } finally {
      setSession(null);
      setIsSubmitting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!session) return;
    const displayName = profileName.trim();
    if (!displayName) {
      setStatusMessage(currentLanguage === 'en' ? 'Enter a display name.' : 'Escribe un nombre para mostrar.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const user = await updateAuthProfile(session.accessToken, displayName);
      const savedName = user.user_metadata?.display_name;
      if (typeof savedName !== 'string' || savedName.trim() !== displayName) {
        throw new Error(currentLanguage === 'en' ? 'The server did not confirm the profile change.' : 'El servidor no confirmó el cambio del perfil.');
      }
      setSession({ ...session, name: savedName.trim() });
      setStatusMessage(currentLanguage === 'en' ? 'Profile updated.' : 'Perfil actualizado.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : (currentLanguage === 'en' ? 'Could not save the profile.' : 'No se pudo guardar el perfil.'));
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="mx-auto max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] border border-[#1d4f96] bg-[#07152b] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.35)]">
                <BrandSeal className="h-full w-full" showWordmark={false} />
              </div>
              <h2 className="mt-6 text-[2rem] font-bold tracking-tight text-white">{copy.title}</h2>
              <p className="mt-2 text-sm text-[#8dc3ff]/70">{currentLanguage === 'en' ? 'Your personal space in the Word.' : 'Tu espacio personal en la Palabra.'}</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => { setMode('login'); setStatusMessage(null); setCanResendConfirmation(false); setIsPasswordVisible(false); }} className={cn('relative rounded-[24px] py-3.5 text-sm font-bold transition-all', mode === 'login' ? 'text-white' : 'text-white/50 hover:bg-white/5')}>
                  {mode === 'login' && <motion.span layoutId="access-mode-highlight" className="absolute inset-0 rounded-[24px] bg-[var(--primary)] shadow-lg" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                  <span className="relative z-10">{copy.signIn}</span>
                </button>
                <button type="button" onClick={() => { setMode('signup'); setStatusMessage(null); setCanResendConfirmation(false); setIsPasswordVisible(false); }} className={cn('relative rounded-[24px] py-3.5 text-sm font-bold transition-all', mode === 'signup' ? 'text-white' : 'text-white/50 hover:bg-white/5')}>
                  {mode === 'signup' && <motion.span layoutId="access-mode-highlight" className="absolute inset-0 rounded-[24px] bg-[var(--primary)] shadow-lg" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                  <span className="relative z-10">{copy.createAccount}</span>
                </button>
              </div>
            </div>

            <button type="button" onClick={() => void startGoogleLogin()} disabled={isGoogleSubmitting || isSubmitting} className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-md transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60">
              {isGoogleSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span aria-hidden="true" className="font-black text-lg text-[#4285F4]">G</span>}
              {currentLanguage === 'en' ? 'Continue with Google' : 'Continuar con Google'}
            </button>

            <motion.form onSubmit={(event) => { event.preventDefault(); void submitAccess(); }} key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="mt-4 space-y-4 rounded-[32px] border border-white/10 bg-[#0a121e]/80 p-6 shadow-xl backdrop-blur-xl">
              {mode === 'signup' && (
                <div>
                  <span className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">{copy.name}</span>
                  <input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-[var(--primary)]/50 focus:bg-black/30 transition-all" placeholder="Juan Pérez" />
                </div>
              )}
              <div>
                <span className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">{copy.email}</span>
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-[var(--primary)]/50 focus:bg-black/30 transition-all" placeholder="ejemplo@correo.com" />
              </div>
              <div>
                <span className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">{copy.password}</span>
                <div className="relative">
                  <input type={isPasswordVisible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-sm text-white outline-none focus:border-[var(--primary)]/50 focus:bg-black/30 transition-all" placeholder="••••••••" />
                  <button type="button" onClick={() => setIsPasswordVisible((visible) => !visible)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white" aria-label={isPasswordVisible ? copy.hidePassword : copy.showPassword} title={isPasswordVisible ? copy.hidePassword : copy.showPassword}>
                    {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:bg-[var(--primary-hover)] active:scale-95 disabled:cursor-wait disabled:opacity-70">
                {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? copy.submitLogin : copy.submitSignup}
              </button>

              <button type="button" onClick={() => void handlePasswordReset()} disabled={isSubmitting} className="w-full py-2 text-center text-xs font-medium text-[#8dc3ff]/50 transition-colors hover:text-[var(--primary)] disabled:opacity-40">
                {copy.forgot}
              </button>
            </motion.form>

            {statusMessage && (
              <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-3 text-center text-xs font-bold text-[#8dc3ff]">
                {statusMessage}
              </motion.div>
            )}
            {canResendConfirmation && (
              <button type="button" onClick={() => void handleResendConfirmation()} disabled={isSubmitting || !email.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-xs font-bold text-[#8dc3ff] transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-50">
                {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {copy.resendConfirmation}
              </button>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-6">
            {/* Perfil Card */}
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,#0a1526_0%,#050b14_100%)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--primary)]/10 blur-[60px]" />
              <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#f0c15c]/10 blur-[60px]" />

              <div className="relative flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary)_0%,#4fa8ff_50%,#f0c15c_100%)] p-1 shadow-xl">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#050b14] text-3xl font-black text-white">
                    {session.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <h3 className="mt-5 text-2xl font-bold text-white">{session.name}</h3>
                <p className="text-sm text-[#8dc3ff]/60">{session.email}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]">
                  {session.provider === 'google' ? copy.providerGoogle : copy.providerEmail}
                </div>
              </div>

              {/* Stats Mini Grid */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#f0c15c] mb-1">Racha</p>
                  <p className="text-2xl font-black text-white flex items-center justify-center gap-1.5">
                    7 <span className="text-xs text-[#f0c15c]">días</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-1">Puntos</p>
                  <p className="text-2xl font-black text-white">1,240</p>
                </div>
              </div>
            </div>

            {/* Settings Area */}
            <div className="rounded-[32px] border border-white/10 bg-[#0a121e]/60 p-6 backdrop-blur-xl">
               <div className="space-y-5">
                  <div>
                    <span className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[#8dc3ff]/60">
                      <PencilLine className="h-3 w-3" /> {copy.name}
                    </span>
                    <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-[var(--primary)]/40 transition-all" />
                  </div>

                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => void handleSaveProfile()} disabled={isSubmitting} className="w-full rounded-full bg-[var(--primary)] py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:cursor-wait disabled:opacity-70">
                      {copy.saveName}
                    </button>
                    <button type="button" onClick={() => void handleSignOut()} disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
                      <LogOut className="h-3.5 w-3.5" />
                      {copy.logout}
                    </button>
                  </div>
                  {statusMessage && (
                    <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-3 text-center text-xs font-bold text-[#8dc3ff]">
                      {statusMessage}
                    </motion.div>
                  )}
               </div>
            </div>
            {statusMessage && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-3 text-center text-xs font-bold text-[#8dc3ff]"
              >
                {statusMessage}
              </motion.div>
            )}
          </div>
        )}

        <MobilePageFooter className="mt-8" onOpenAboutLegal={onOpenAboutLegal} />
      </div>

      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}
