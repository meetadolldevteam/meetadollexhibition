import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, ClipboardList, Grid3X3, Users, CreditCard,
  Megaphone, ScrollText, StickyNote, UserPlus, LogOut, Menu, X,
} from "lucide-react";
import StatsPanel from "@/components/admin/StatsPanel";
import ReservationsPanel from "@/components/admin/ReservationsPanel";
import StallGridPanel from "@/components/admin/StallGridPanel";
import VendorsPanel from "@/components/admin/VendorsPanel";
import PaymentsPanel from "@/components/admin/PaymentsPanel";
import AnnouncementsPanel from "@/components/admin/AnnouncementsPanel";
import ActivityLogPanel from "@/components/admin/ActivityLogPanel";
import ShiftNotesPanel from "@/components/admin/ShiftNotesPanel";
import CreateAdminPanel from "@/components/admin/CreateAdminPanel";

type Panel =
  | "stats" | "reservations" | "stalls" | "vendors"
  | "payments" | "announcements" | "activity" | "shifts" | "team";

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  super_admin: { label: "Super Admin", cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  admin:       { label: "Admin",       cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  staff:       { label: "Staff",       cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
};

const ALLOWED_ROLES = ["super_admin", "admin", "staff"];

export default function AdminDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<Panel>("stats");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    navigate(user ? "/" : "/login?next=/admin", { replace: true });
    return null;
  }

  const role = user.role;
  const isManager = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  interface NavItem { id: Panel; label: string; icon: React.ReactNode; show: boolean }
  const navItems: NavItem[] = [
    { id: "stats",         label: "Dashboard",     icon: <LayoutDashboard className="w-4 h-4" />, show: true },
    { id: "reservations",  label: "Reservations",  icon: <ClipboardList className="w-4 h-4" />,  show: true },
    { id: "stalls",        label: "Stall Grid",    icon: <Grid3X3 className="w-4 h-4" />,        show: isManager },
    { id: "vendors",       label: "Vendors",       icon: <Users className="w-4 h-4" />,          show: true },
    { id: "payments",      label: "Payments",      icon: <CreditCard className="w-4 h-4" />,     show: isManager },
    { id: "announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" />,      show: isManager },
    { id: "activity",      label: "Activity Log",  icon: <ScrollText className="w-4 h-4" />,     show: isManager },
    { id: "shifts",        label: "Shift Notes",   icon: <StickyNote className="w-4 h-4" />,     show: true },
    { id: "team",          label: "Team",          icon: <UserPlus className="w-4 h-4" />,       show: isSuperAdmin },
  ];

  const PANEL_TITLES: Record<Panel, string> = {
    stats: "Dashboard", reservations: "Reservations", stalls: "Stall Grid",
    vendors: "Vendors", payments: "Payments", announcements: "Announcements",
    activity: "Activity Log", shifts: "Shift Notes", team: "Team Management",
  };

  const roleBadge = ROLE_BADGE[role] ?? { label: role, cls: "bg-zinc-100 text-zinc-700" };

  function nav(panel: Panel) {
    setActivePanel(panel);
    setSidebarOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const logo = "/assets/meetadoll-logo.jpg";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 z-40 flex flex-col
          bg-zinc-950 text-zinc-100 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Meetadoll" className="h-8 w-auto rounded" />
            <span className="font-display font-bold text-sm text-zinc-100">Admin</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.filter((n) => n.show).map((item) => (
            <button
              key={item.id}
              onClick={() => nav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                ${activePanel === item.id
                  ? "bg-white/10 text-white font-medium"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Admin info */}
        <div className="px-4 py-4 border-t border-zinc-800 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-100 truncate">{user.name}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.cls}`}>
              {roleBadge.label}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold">{PANEL_TITLES[activePanel]}</h1>
          <div className="ml-auto hidden sm:block">
            <span className="text-xs text-muted-foreground">
              Signed in as <strong>{user.name}</strong>
            </span>
          </div>
        </header>

        {/* Panel content */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          {activePanel === "stats"         && <StatsPanel />}
          {activePanel === "reservations"  && <ReservationsPanel canEdit={isManager} />}
          {activePanel === "stalls"        && isManager && <StallGridPanel canEdit={isManager} />}
          {activePanel === "vendors"       && <VendorsPanel />}
          {activePanel === "payments"      && isManager && <PaymentsPanel isSuperAdmin={isSuperAdmin} />}
          {activePanel === "announcements" && isManager && <AnnouncementsPanel />}
          {activePanel === "activity"      && isManager && <ActivityLogPanel />}
          {activePanel === "shifts"        && <ShiftNotesPanel />}
          {activePanel === "team"          && isSuperAdmin && <CreateAdminPanel />}
        </main>
      </div>
    </div>
  );
}
