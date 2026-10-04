import { resolveConfiguredApiUrl } from '@/src/lib/apiConfig';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

export interface AuthSignUpResult {
  user: AuthUser;
  session: AuthTokens | null;
}

async function authRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(resolveConfiguredApiUrl(`/api/auth/${path}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'No se pudo completar la autenticación.');
  }

  return payload as T;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function signInWithEmail(email: string, password: string) {
  return authRequest<AuthTokens>('signin', { email: normalizeEmail(email), password });
}

export function signUpWithEmail(email: string, password: string, displayName: string) {
  return authRequest<AuthSignUpResult>('signup', { email: normalizeEmail(email), password, displayName });
}

export function resendSignupConfirmation(email: string) {
  return authRequest<{ message?: string }>('resend', { email: normalizeEmail(email) });
}

export function refreshAuthSession(refreshToken: string) {
  return authRequest<AuthTokens>('refresh', { refreshToken });
}

export function sendPasswordReset(email: string) {
  return authRequest<{ message?: string }>('recover', { email: normalizeEmail(email) });
}

export function signOutFromAuth(accessToken: string) {
  return authRequest<{ message?: string }>('signout', { accessToken });
}

export function updateAuthProfile(accessToken: string, displayName: string) {
  return authRequest<AuthUser>('profile', { accessToken, displayName });
}

export function createPkceVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createPkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getGoogleAuthorizationUrl(redirectTo: string, codeChallenge: string) {
  const query = new URLSearchParams({ redirectTo, codeChallenge });
  const response = await fetch(resolveConfiguredApiUrl(`/api/auth/google?${query.toString()}`));
  const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || 'No se pudo iniciar el acceso con Google.');
  }
  return payload.url;
}

export function exchangeGoogleAuthorizationCode(code: string, codeVerifier: string) {
  return authRequest<AuthTokens>('exchange', { code, codeVerifier });
}
