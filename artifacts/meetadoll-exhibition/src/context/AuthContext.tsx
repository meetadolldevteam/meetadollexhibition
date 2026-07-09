import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, setAccessToken } from "@/lib/apiClient";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const hydrate = useCallback(async () => {
    try {
      const data = await api.post<{ token: string; user: User }>("/auth/refresh", undefined, {
        skipAuthRetry: true,
      });
      setAccessToken(data.token);
      setUser(data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void hydrate();
  }, [hydrate]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>("/auth/login", { email, password }, { skipAuthRetry: true });
    setAccessToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (body: { name: string; email: string; password: string; phone?: string }) => {
      await api.post("/auth/register", body, { skipAuthRetry: true });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
