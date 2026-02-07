import { getAccessToken, getRefreshToken, getStoredUser, setSession } from "@/lib/authStorage";

const API_BASE_URL = "/api";

/** Parse API error response into a single user-facing message. */
function parseApiError(errorText: string): string {
  if (!errorText?.trim()) return "Request failed";
  try {
    const data = JSON.parse(errorText) as {
      message?: string | unknown;
      details?: Array<{ message?: string; path?: (string | number)[] }>;
    };
    if (data.details && Array.isArray(data.details) && data.details.length > 0) {
      const first = data.details[0];
      const msg = first.message ?? (typeof first === "string" ? first : "Validation failed");
      const field = first.path?.[0];
      return field ? `${String(field)}: ${msg}` : msg;
    }
    const raw = data.message;
    if (typeof raw === "string") {
      if (raw.startsWith("[")) {
        try {
          const arr = JSON.parse(raw) as Array<{ message?: string; path?: (string | number)[] }>;
          if (Array.isArray(arr) && arr[0]) {
            const msg = arr[0].message ?? "Validation failed";
            const field = arr[0].path?.[0];
            return field ? `${String(field)}: ${msg}` : msg;
          }
        } catch {
          // use raw
        }
      }
      return raw;
    }
    if (typeof raw === "object" && raw !== null && "message" in (raw as object))
      return String((raw as { message: string }).message);
  } catch {
    // Not JSON or unexpected shape
  }
  if (errorText.length > 200) return "Something went wrong. Please try again.";
  return errorText;
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      session?: { access_token: string; refresh_token: string };
      user?: { id: string; email?: string };
    };
    if (!data.session?.access_token) return false;
    const stored = getStoredUser();
    const user = data.user;
    setSession(
      data.session.access_token,
      data.session.refresh_token || refreshToken,
      stored ?? { id: user?.id ?? "", email: user?.email ?? "", name: user?.email ?? "" }
    );
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !retried) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, options, true);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const message = parseApiError(errorText);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
