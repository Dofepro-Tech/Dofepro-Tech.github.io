export const USER_SESSION_STORAGE_KEY = 'biblia_nj_user_session';
export const AUTH_SESSION_CHANGED_EVENT = 'biblia-auth-session-changed';

export interface AuthSessionSnapshot {
  userId: string;
  accessToken: string;
}

export function readCurrentAuthSession(): AuthSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawSession = window.localStorage.getItem(USER_SESSION_STORAGE_KEY);
    const session = rawSession ? JSON.parse(rawSession) as Partial<AuthSessionSnapshot> : null;
    return typeof session?.userId === 'string' && typeof session.accessToken === 'string'
      ? { userId: session.userId, accessToken: session.accessToken }
      : null;
  } catch {
    return null;
  }
}