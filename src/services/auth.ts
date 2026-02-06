import { api } from "@/services/api";
import type { ApiResponse } from "@/types/api";
import type { User } from "@/types/models";

export const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<User>>("/auth/login", { email, password }),
  signup: (email: string, password: string, company: string) =>
    api.post<ApiResponse<User>>("/auth/signup", { email, password, company }),
  logout: () => api.post<ApiResponse<null>>("/auth/logout"),
  refresh: () => api.post<ApiResponse<User>>("/auth/refresh"),
};
