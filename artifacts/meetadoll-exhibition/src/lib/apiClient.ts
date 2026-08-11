const API_URL = "https://meetadollexhibition-api.onrender.com/api";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface ApiErrorBody {
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          setAccessToken(null);
          return null;
        }

        const data = (await res.json()) as { token: string };
        setAccessToken(data.token);
        return data.token;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;

  const isFormData = body instanceof FormData;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders = new Headers(headers);
    if (!isFormData) {
      finalHeaders.set("Content-Type", "application/json");
    }
    if (accessToken) {
      finalHeaders.set("Authorization", `Bearer ${accessToken}`);
    }

    return fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: finalHeaders,
      body: body !== undefined ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry) {
    const errorBody = await parseErrorBody(res.clone());
    if (errorBody.code === "TOKEN_EXPIRED" || errorBody.code === "TOKEN_INVALID") {
      const newToken = await refreshAccessToken();
      if (newToken) {
        res = await doFetch();
      }
    }
  }

  if (!res.ok) {
    const errorBody = await parseErrorBody(res);
    throw new ApiError(res.status, errorBody.error ?? `Request failed with status ${res.status}`, errorBody.code);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};
