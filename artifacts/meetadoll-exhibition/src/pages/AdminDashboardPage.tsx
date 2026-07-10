import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";

const logo = { url: "/assets/meetadoll-logo.jpg" };

interface Exhibition { id: string; name: string; venue: string; }
interface Stall { stall_number: number; exhibition_id: string; exhibitions: Exhibition; }
interface ReservationUser { name: string; email: string; }
interface AdminReservation {
  id: string;
  status: string;
  reservation_code: string;
  created_at: string;
  users: ReservationUser;
  stalls: Stall;
}
interface PaymentSummary {
  exhibitions: {
    id: string;
    name: string;
    venue: string;
    successful: { count: number; total: number };
    pending: { count: number; total: number };
    failed: { count: number; total: number };
  }[];
  overall: { revenue: number; pending: number; failed: number };
}

const PAYMENT_STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmed", variant: "default" },
  held: { label: "Held", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
};

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login?next=/admin", { replace: true }); return; }
    if (user.role !== "admin") { navigate("/", { replace: true }); return; }

    Promise.all([
      api.get<PaymentSummary>("/admin/payments/summary"),
      api.get<{ reservations: AdminReservation[] }>("/admin/reservations"),
    ])
      .then(([s, r]) => {
        setSummary(s);
        setReservations(r.reservations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-5 py-4 flex items-center justify-between">
        <Link to="/">
          <img src={logo.url} alt="Meetadoll" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name} · Admin</span>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="font-display text-3xl font-bold mb-8">Payment Reconciliation</h1>

        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                label="Total Revenue"
                value={fmt(summary.overall.revenue)}
                sub="from successful payments"
                bg="bg-green-50 dark:bg-green-950/30"
              />
              <StatCard
                icon={<Clock className="w-5 h-5 text-amber-600" />}
                label="Pending"
                value={fmt(summary.overall.pending)}
                sub="awaiting payment"
                bg="bg-amber-50 dark:bg-amber-950/30"
              />
              <StatCard
                icon={<XCircle className="w-5 h-5 text-destructive" />}
                label="Failed / Abandoned"
                value={fmt(summary.overall.failed)}
                sub="not completed"
                bg="bg-red-50 dark:bg-red-950/30"
              />
            </div>

            <h2 className="font-display text-xl font-bold mb-4">Per Exhibition</h2>
            <div className="flex flex-col gap-4 mb-12">
              {summary.exhibitions.map((exh) => (
                <div key={exh.id} className="border border-border rounded-xl p-5 bg-card">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-bold text-base">{exh.name}</p>
                      <p className="text-xs text-muted-foreground">{exh.venue}</p>
                    </div>
                    <p className="font-display font-bold text-lg text-green-600 shrink-0">{fmt(exh.successful.total)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <MiniStat label="Successful" count={exh.successful.count} amount={fmt(exh.successful.total)} color="text-green-600" />
                    <MiniStat label="Pending" count={exh.pending.count} amount={fmt(exh.pending.total)} color="text-amber-600" />
                    <MiniStat label="Failed" count={exh.failed.count} amount={fmt(exh.failed.total)} color="text-destructive" />
                  </div>
                </div>
              ))}
              {summary.exhibitions.length === 0 && (
                <p className="text-muted-foreground text-sm">No payment data yet.</p>
              )}
            </div>
          </>
        )}

        <h2 className="font-display text-xl font-bold mb-4">All Reservations</h2>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Vendor</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Exhibition</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Stall</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservations.map((r) => {
                const meta = PAYMENT_STATUS_META[r.status] ?? { label: r.status, variant: "outline" as const };
                return (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.users?.name ?? "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{r.users?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.stalls?.exhibitions?.name ?? "N/A"}</td>
                    <td className="px-4 py-3 font-semibold">#{r.stalls?.stall_number ?? "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.reservation_code}</td>
                    <td className="px-4 py-3">
                      <Badge variant={meta.variant} className="text-xs">
                        {meta.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No reservations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub, bg }: { icon: React.ReactNode; label: string; value: string; sub: string; bg: string }) {
  return (
    <div className={`rounded-xl p-5 border border-border ${bg}`}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-sm font-medium text-muted-foreground">{label}</span></div>
      <p className="font-display text-2xl font-bold mb-0.5">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function MiniStat({ label, count, amount, color }: { label: string; count: number; amount: string; color: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-2.5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold text-sm ${color}`}>{count} <span className="font-normal text-xs">stalls</span></p>
      <p className="text-xs text-muted-foreground mt-0.5">{amount}</p>
    </div>
  );
}
