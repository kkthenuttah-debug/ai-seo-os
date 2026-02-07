/**
 * Client-side auth storage for Supabase session.
 * Used by api.ts to attach the token and by AuthContext to persist session.
 */

const ACCESS_TOKEN_KEY = "seo-access-token";
const REFRESH_TOKEN_KEY = "seo-refresh-token";
const USER_KEY = "seo-user";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setSession(accessToken: string, refreshToken: string, user: { id: string; email: string; name: string }): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): { id: string; email: string; name: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; email: string; name: string };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
