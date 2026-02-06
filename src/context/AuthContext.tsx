import { createContext, useCallback, useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { User } from "@/types/models";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, company: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [storedUser, setStoredUser] = useLocalStorage<User | null>("seo-user", null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    async (email: string, _password: string) => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setStoredUser({ id: "user-1", name: "Marketing Lead", email });
      setIsLoading(false);
    },
    [setStoredUser]
  );

  const signup = useCallback(
    async (email: string, _password: string, company: string) => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setStoredUser({ id: "user-1", name: company, email });
      setIsLoading(false);
    },
    [setStoredUser]
  );

  const logout = useCallback(() => {
    setStoredUser(null);
  }, [setStoredUser]);

  const value = useMemo(
    () => ({ user: storedUser, isLoading, login, signup, logout }),
    [storedUser, isLoading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
