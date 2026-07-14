import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { setAccessToken } from "@/lib/apiClient";

interface DevLoginResponse {
  token: string;
  user: { id: string; email: string; name: string; role: string; vendor_category?: string | null };
}

export default function DevAuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const email = params.get("email");
    const password = params.get("password");
    const next = params.get("next") ?? "/";

    if (!email || !password) {
      navigate("/", { replace: true });
      return;
    }

    api
      .post<DevLoginResponse>("/auth/dev-login", { email, password }, { skipAuthRetry: true })
      .then((data) => {
        setAccessToken(data.token);
        window.location.replace(next);
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
