import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Flag, RefreshCw, Building2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Payment {
  id: string;
  amount: number;
  status: string;
  flagged: boolean;
  transaction_reference: string;
  created_at: string;
  reservations: {
    id: string;
    reservation_code: string;
    users: {
      name: string;
      email: string;
      business_name: string | null;
      vendor_category: string | null;
      logo_url: string | null;
    } | null;
    stalls: { stall_number: number; package: string | null; category: string | null } | null;
  } | null;
}

const STATUS_CLS: Record<string, string> = {
  successful: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  failed:     "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  refunded:   "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
};

function fmt(n: number) {
  return `₦${(n ?? 0).toLocaleString("en-NG")}`;
}

function VendorAvatar({ logo, name }: { logo: string | null; name: string }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
      <Building2 className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

export default function PaymentsPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (flaggedOnly) params.set("flagged", "true");
    api
      .get<{ payments: Payment[] }>(`/admin/payments?${params}`)
      .then((d) => setPayments(d.payments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, flaggedOnly]);

  useEffect(() => { load(); }, [load]);

  async function toggleFlag(id: string, currentFlagged: boolean) {
    setActing(id);
    try {
      await api.patch(`/admin/payments/${id}/flag`);
      setPayments((prev) => prev.map((p) => p.id === id ? { ...p, flagged: !currentFlagged } : p));
      toast({ title: currentFlagged ? "Payment unflagged" : "Payment flagged for review" });
    } catch {
      toast({ title: "Failed to flag payment", variant: "destructive" });
    } finally {
      setActing(null);
    }
  }

  async function refund(payment: Payment) {
    if (!confirm(`Issue refund of ${fmt(payment.amount)} for ${payment.reservations?.users?.name ?? "vendor"}? This will cancel their reservation.`)) return;
    setActing(payment.id);
    try {
      await api.post(`/admin/payments/${payment.id}/refund`);
      setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, status: "refunded" } : p));
      toast({ title: "Refund processed ✓" });
    } catch (e: any) {
      toast({ title: e.message || "Refund failed", variant: "destructive" });
    } finally {
      setActing(null);
    }
  }

  const totalRevenue = payments.filter((p) => p.status === "successful").reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border border-border bg-background text-sm px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="successful">Successful</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="rounded"
          />
          Flagged only
        </label>
        <Button variant="ghost" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <span className="ml-auto text-sm font-semibold text-green-600">
          Revenue: {fmt(totalRevenue)}
        </span>
      </div>

      {/* ── Desktop table (md+) ── */}
      <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {["Business / Vendor", "Stall", "Reference", "Amount", "Status", "Date", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payments found.</td></tr>
            ) : payments.map((p) => {
              const u = p.reservations?.users;
              const stall = p.reservations?.stalls;
              return (
                <tr key={p.id} className={`hover:bg-secondary/20 transition-colors ${p.flagged ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <VendorAvatar logo={u?.logo_url ?? null} name={u?.name ?? ""} />
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[160px]">{u?.business_name || u?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u?.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u?.email}</p>
                        {u?.vendor_category && (
                          <span className="text-xs text-primary/70 font-medium capitalize">{u.vendor_category}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm">{stall?.stall_number ? `#${stall.stall_number}` : "—"}</p>
                    {stall?.package && <p className="text-xs text-muted-foreground capitalize">{stall.package}</p>}
                    {stall?.category && <p className="text-xs text-muted-foreground capitalize">{stall.category}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{p.transaction_reference?.slice(-16) ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {p.status}
                      </span>
                      {p.flagged && <Flag className="w-3 h-3 text-red-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${p.flagged ? "text-red-500" : "text-muted-foreground"}`}
                        disabled={acting === p.id}
                        onClick={() => toggleFlag(p.id, p.flagged)}
                        title={p.flagged ? "Unflag" : "Flag as suspicious"}
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </Button>
                      {isSuperAdmin && p.status === "successful" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          disabled={acting === p.id}
                          onClick={() => refund(p)}
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (< md) ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No payments found.</div>
        ) : payments.map((p) => {
          const u = p.reservations?.users;
          const stall = p.reservations?.stalls;
          return (
            <div
              key={p.id}
              className={`rounded-xl border border-border bg-card p-4 space-y-3 ${p.flagged ? "border-red-300 bg-red-50/30 dark:bg-red-950/10" : ""}`}
            >
              {/* Header row: logo + business + status */}
              <div className="flex items-start gap-3">
                <VendorAvatar logo={u?.logo_url ?? null} name={u?.name ?? ""} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{u?.business_name || u?.name || "—"}</p>
                  {u?.business_name && <p className="text-xs text-muted-foreground truncate">{u.name}</p>}
                  <p className="text-xs text-muted-foreground truncate">{u?.email}</p>
                  {u?.vendor_category && (
                    <span className="text-xs text-primary/70 font-medium capitalize">{u.vendor_category}</span>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {p.status}
                  </span>
                  {p.flagged && <Flag className="w-3 h-3 text-red-500 mt-1 ml-auto" />}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Stall</p>
                  <p className="font-semibold">{stall?.stall_number ? `#${stall.stall_number}` : "—"}</p>
                  {stall?.package && <p className="text-xs text-muted-foreground capitalize">{stall.package}</p>}
                  {stall?.category && <p className="text-xs text-muted-foreground capitalize">{stall.category}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
                  <p className="font-semibold text-green-700 dark:text-green-400">{fmt(p.amount)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Reference</p>
                  <p className="font-mono text-xs truncate">{p.transaction_reference ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 gap-1.5 text-xs ${p.flagged ? "text-red-500" : "text-muted-foreground"}`}
                  disabled={acting === p.id}
                  onClick={() => toggleFlag(p.id, p.flagged)}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {p.flagged ? "Unflag" : "Flag"}
                </Button>
                {isSuperAdmin && p.status === "successful" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive"
                    disabled={acting === p.id}
                    onClick={() => refund(p)}
                  >
                    Refund
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
