import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { TrendingUp, Clock, LayoutGrid, Users, CheckCircle2, AlertTriangle } from "lucide-react";

interface Stats {
  stalls: { total: number; available: number; held: number; reserved: number; blocked: number };
  revenue: number;
  pendingPayments: number;
  newRegistrationsToday: number;
  recentActivity: Array<{
    id: string;
    action: string;
    admin_name: string;
    admin_role: string;
    entity_type: string | null;
    created_at: string;
  }>;
}

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    RESERVATION_CANCELLED: "Cancelled a reservation",
    VENDOR_CHECKED_IN: "Checked in a vendor",
    STALL_STATUS_CHANGED: "Changed stall status",
    PAYMENT_FLAGGED: "Flagged a payment",
    PAYMENT_UNFLAGGED: "Unflagged a payment",
    REFUND_ISSUED: "Issued a refund",
    ANNOUNCEMENT_SENT: "Sent an announcement",
    SHIFT_NOTE_ADDED: "Added shift note",
    ADMIN_CREATED: "Created a team member",
  };
  return map[action] ?? action;
}

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Stats>("/admin/stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-secondary/40" />
        ))}
      </div>
    );
  }

  if (!stats) return <p className="text-destructive text-sm">Failed to load stats.</p>;

  const cards = [
    {
      icon: <LayoutGrid className="w-5 h-5 text-blue-600" />,
      label: "Total Stalls",
      value: stats.stalls.total.toString(),
      sub: `${stats.stalls.available} available · ${stats.stalls.held} held`,
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      label: "Reserved",
      value: stats.stalls.reserved.toString(),
      sub: `${Math.round((stats.stalls.reserved / (stats.stalls.total || 1)) * 100)}% sold`,
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      label: "Revenue Collected",
      value: fmt(stats.revenue),
      sub: "from confirmed payments",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      label: "Pending Payments",
      value: stats.pendingPayments.toString(),
      sub: "awaiting confirmation",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      icon: <Users className="w-5 h-5 text-violet-600" />,
      label: "Registrations Today",
      value: stats.newRegistrationsToday.toString(),
      sub: "new vendor accounts",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      label: "Blocked Stalls",
      value: stats.stalls.blocked.toString(),
      sub: "manually blocked",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl p-5 border border-border ${c.bg}`}>
            <div className="flex items-center gap-2 mb-3">
              {c.icon}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="font-display text-2xl font-bold mb-0.5">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-bold mb-4">Recent Activity</h2>
        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet. Actions from all admins will appear here.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{a.admin_name}</span>
                    <span className="text-muted-foreground"> {actionLabel(a.action)}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
