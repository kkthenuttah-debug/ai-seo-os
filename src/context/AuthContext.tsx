import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "@/services/auth";
import { clearSession, getAccessToken, getStoredUser, setSession } from "@/lib/authStorage";
import type { User } from "@/types/models";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, company: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(profile: { id: string; email: string; company_name: string | null }): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.company_name || profile.email || "User",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (!res.session?.access_token || !res.user) throw new Error("Invalid login response");
      const minimalUser: { id: string; email: string; name: string } = {
        id: res.user.id,
        email: res.user.email ?? email,
        name: res.user.email ?? email,
      };
      setSession(res.session.access_token, res.session.refresh_token, minimalUser);
      const profile = await authService.me();
      const u = toUser({
        id: profile.id,
        email: profile.email,
        company_name: profile.company_name ?? null,
      });
      setSession(res.session.access_token, res.session.refresh_token, u);
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, company: string) => {
    setIsLoading(true);
    try {
      const res = await authService.signup(email, password, company);
      if (!res.session?.access_token || !res.user) throw new Error("Invalid signup response");
      const minimalUser: { id: string; email: string; name: string } = {
        id: res.user.id,
        email: res.user.email ?? email,
        name: (company && company.trim()) ? company.trim() : (res.user.email ?? email),
      };
      setSession(res.session.access_token, res.session.refresh_token, minimalUser);
      const profile = await authService.me();
      const u = toUser({
        id: profile.id,
        email: profile.email,
        company_name: profile.company_name ?? null,
      });
      setSession(res.session.access_token, res.session.refresh_token, u);
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      clearSession();
      setUser(null);
    }
  }, []);

  // Restore session from localStorage on mount so refresh keeps the user logged in
  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();
    if (token && stored?.id && stored?.email) {
      setUser(stored as User);
    } else if (!token && stored) {
      clearSession();
    }
    setIsRestoring(false);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading: isLoading || isRestoring, login, signup, logout }),
    [user, isLoading, isRestoring, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
