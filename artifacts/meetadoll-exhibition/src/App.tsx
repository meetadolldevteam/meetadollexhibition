import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useEffect } from "react";
import { initGA, trackPageView } from "@/lib/analytics";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import PaymentCallbackPage from "./pages/PaymentCallbackPage.tsx";
import MyReservationsPage from "./pages/MyReservationsPage.tsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import DevAuthPage from "./pages/DevAuthPage.tsx";

const CANONICAL_BASE = "https://meetadollexhibition.com";
const DEFAULT_DESCRIPTION =
  "Reserve your vendor stall for the Meetadoll Exhibition. Nigeria's premier curated marketplace of lifestyle, commerce, and entertainment.";

interface PageMetaConfig {
  title: string;
  description: string;
  noIndex?: boolean;
}

const PAGE_META: Record<string, PageMetaConfig> = {
  "/": {
    title: "Meetadoll Exhibition | Reserve Your Vendor Stall",
    description:
      "Secure your vendor stall at Nigeria's premier curated exhibition of lifestyle, commerce and entertainment. 100 stalls, two days, Umar Musa Yar'adua Hall, Kaduna State.",
  },
  "/register": {
    title: "Register as a Vendor | Meetadoll Exhibition",
    description:
      "Create your vendor account to reserve a stall at the Meetadoll Exhibition. Join 100 exhibitors at Umar Musa Yar'adua Hall, Kaduna State.",
  },
  "/login": {
    title: "Sign In | Meetadoll Exhibition",
    description:
      "Sign in to manage your Meetadoll Exhibition vendor reservation and stall booking.",
  },
  "/terms": {
    title: "Terms & Conditions | Meetadoll Exhibition",
    description:
      "Read the terms and conditions for vendor participation at the Meetadoll Exhibition.",
  },
  "/privacy": {
    title: "Privacy Policy | Meetadoll Exhibition",
    description:
      "Learn how Meetadoll Exhibition collects, uses, and protects your personal data.",
  },
  "/my-reservations": {
    title: "My Reservations | Meetadoll Exhibition",
    description: "View and manage your vendor stall reservations for the Meetadoll Exhibition.",
    noIndex: true,
  },
  "/admin": {
    title: "Admin Dashboard | Meetadoll Exhibition",
    description: "Meetadoll Exhibition administration dashboard.",
    noIndex: true,
  },
  "/payment/callback": {
    title: "Payment Processing | Meetadoll Exhibition",
    description: "Processing your payment for the Meetadoll Exhibition stall reservation.",
    noIndex: true,
  },
};

function setMeta(nameAttr: string, nameValue: string, content: string) {
  let el = document.querySelector(
    `meta[${nameAttr}="${nameValue}"]`
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(nameAttr, nameValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function PageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = PAGE_META[pathname];
    const title = meta?.title ?? "Meetadoll Exhibition";
    const description = meta?.description ?? DEFAULT_DESCRIPTION;
    const noIndex = meta?.noIndex ?? false;

    document.title = title;
    setMeta("name", "description", description);
    setCanonical(CANONICAL_BASE + pathname);
    setMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initGA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PageMeta />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/payment/callback" element={<PaymentCallbackPage />} />
              <Route path="/my-reservations" element={<MyReservationsPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              {import.meta.env.DEV && <Route path="/dev-auth" element={<DevAuthPage />} />}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
