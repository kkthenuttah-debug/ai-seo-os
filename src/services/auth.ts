import { api } from "@/services/api";

export interface AuthSession {
  session: { access_token: string; refresh_token: string };
  user: { id: string; email: string | undefined };
}

export interface AuthProfile {
  id: string;
  email: string;
  company_name: string | null;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthSession>("/auth/login", { email, password }),
  signup: (email: string, password: string, companyName: string) =>
    api.post<AuthSession>("/auth/signup", { email, password, companyName }),
  logout: () => api.post<{ success: boolean }>("/auth/logout"),
  refresh: (refresh_token: string) =>
    api.post<AuthSession>("/auth/refresh", { refresh_token }),
  me: () => api.get<AuthProfile>("/auth/me"),
};
