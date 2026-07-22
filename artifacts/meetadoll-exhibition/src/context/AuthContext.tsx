import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, setAccessToken } from "@/lib/apiClient";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  vendor_category?: string | null;
  business_name?: string | null;
  business_category?: string | null;
  business_logo_url?: string | null;
  instagram_username?: string | null;
}

export interface OtpRequired {
  requiresOtp: true;
  userId: string;
  email?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<OtpRequired | void>;
  verifyOtp: (userId: string, otp: string, type: "registration" | "login") => Promise<void>;
  resendOtp: (userId: string, type: "registration" | "login") => Promise<void>;
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

  const login = useCallback(async (email: string, password: string): Promise<OtpRequired | void> => {
    const data = await api.post<{ requiresOtp?: boolean; userId?: string } | { token: string; user: User }>(
      "/auth/login",
      { email, password },
      { skipAuthRetry: true }
    );

    if ("requiresOtp" in data && data.requiresOtp) {
      return { requiresOtp: true, userId: data.userId! };
    }

    const full = data as { token: string; user: User };
    setAccessToken(full.token);
    setUser(full.user);
  }, []);

  const verifyOtp = useCallback(
    async (userId: string, otp: string, type: "registration" | "login"): Promise<void> => {
      const data = await api.post<{ token: string; user: User }>(
        "/auth/verify-otp",
        { userId, otp, type },
        { skipAuthRetry: true }
      );
      setAccessToken(data.token);
      setUser(data.user);
    },
    []
  );

  const resendOtp = useCallback(
    async (userId: string, type: "registration" | "login"): Promise<void> => {
      await api.post("/auth/resend-otp", { userId, type }, { skipAuthRetry: true });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, resendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
