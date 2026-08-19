import type { ApiError } from "@/types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
export const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API ?? "false") === "true";

export const MOCK_LATENCY_MS = 350;

export function delay<T>(value: T, ms = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function apiError(status: number, message: string): ApiError {
  return { status, message };
}

/**
 * Thin HTTP layer for the ASP.NET Core Web API.
 *
 * The Supabase access token is attached by `getAccessToken()` (see
 * `src/api/authApi.ts`). A 401 means the session is no longer authenticated.
 * A 403 means the authenticated user lacks permission and must never clear the
 * valid Supabase session (for example, an admin who has not completed MFA yet).
 */
let tokenProvider: () => Promise<string | null> = async () => null;
let unauthorizedHandler: () => void = () => {};

export function configureHttp(options: {
  getToken: () => Promise<string | null>;
  onUnauthorized: () => void;
}) {
  tokenProvider = options.getToken;
  unauthorizedHandler = options.onUnauthorized;
}

export async function http<T>(
  path: string,
  init: RequestInit = {},
  options: { preserveSessionOnUnauthorized?: boolean } = {},
): Promise<T> {
  const token = await tokenProvider();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401) {
    if (!options.preserveSessionOnUnauthorized) unauthorizedHandler();
    throw apiError(response.status, "Your session has expired. Please sign in again.");
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: string; title?: string };
      message = parsed.error ?? parsed.title ?? body;
    } catch {
      /* response was plain text */
    }
    throw apiError(response.status, message || "Request failed.");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function paginate<T>(items: T[], page = 1, pageSize = 10) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}
