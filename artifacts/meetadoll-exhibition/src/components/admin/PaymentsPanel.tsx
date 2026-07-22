import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Flag, RefreshCw, Building2, X, ChevronRight } from "lucide-react";
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

function VendorAvatar({ logo, name, size = "sm" }: { logo: string | null; name: string; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-16 h-16 rounded-xl" : "w-9 h-9 rounded-lg";
  const iconCls = size === "lg" ? "w-7 h-7" : "w-4 h-4";
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className={`${cls} object-cover border border-border flex-shrink-0`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className={`${cls} bg-secondary flex items-center justify-center flex-shrink-0 border border-border`}>
      <Building2 className={`${iconCls} text-muted-foreground`} />
    </div>
  );
}

function PaymentDetailModal({
  payment,
  isSuperAdmin,
  onClose,
  onFlag,
  onRefund,
  acting,
}: {
  payment: Payment;
  isSuperAdmin: boolean;
  onClose: () => void;
  onFlag: (id: string, current: boolean) => void;
  onRefund: (p: Payment) => void;
  acting: string | null;
}) {
  const u = payment.reservations?.users;
  const stall = payment.reservations?.stalls;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Details</p>
            <p className="font-display font-bold text-lg">{fmt(payment.amount)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Business / Vendor */}
          <div className="flex items-center gap-4">
            <VendorAvatar logo={u?.logo_url ?? null} name={u?.name ?? ""} size="lg" />
            <div className="min-w-0">
              <p className="font-bold text-base leading-tight">{u?.business_name || u?.name || "—"}</p>
              {u?.business_name && <p className="text-sm text-muted-foreground">{u.name}</p>}
              <p className="text-sm text-muted-foreground truncate">{u?.email}</p>
              {u?.vendor_category && (
                <span className="inline-block mt-1 text-xs font-medium text-primary/80 capitalize bg-primary/10 px-2 py-0.5 rounded-full">
                  {u.vendor_category}
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${STATUS_CLS[payment.status] ?? "bg-zinc-100 text-zinc-600"}`}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </span>
            {payment.flagged && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                <Flag className="w-3.5 h-3.5" /> Flagged
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Stall</p>
              <p className="font-bold text-lg">#{stall?.stall_number ?? "—"}</p>
              {stall?.package && <p className="text-xs text-muted-foreground capitalize">{stall.package}</p>}
              {stall?.category && <p className="text-xs text-muted-foreground capitalize">{stall.category}</p>}
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount</p>
              <p className="font-bold text-lg text-green-700 dark:text-green-400">{fmt(payment.amount)}</p>
            </div>
          </div>

          {/* Transaction info */}
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Transaction Reference</p>
              <p className="font-mono text-sm break-all mt-0.5">{payment.transaction_reference ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Reservation ID</p>
              <p className="font-mono text-xs text-muted-foreground break-all mt-0.5">{payment.reservations?.id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Date & Time</p>
              <p className="text-sm mt-0.5">{new Date(payment.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant={payment.flagged ? "destructive" : "outline"}
              size="sm"
              className="flex-1 gap-1.5"
              disabled={acting === payment.id}
              onClick={() => onFlag(payment.id, payment.flagged)}
            >
              <Flag className="w-3.5 h-3.5" />
              {payment.flagged ? "Unflag" : "Flag as suspicious"}
            </Button>
            {isSuperAdmin && payment.status === "success" && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={acting === payment.id}
                onClick={() => onRefund(payment)}
              >
                Issue Refund
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Payment | null>(null);

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
      setSelected((prev) => prev?.id === id ? { ...prev, flagged: !currentFlagged } : prev);
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
      setSelected((prev) => prev?.id === payment.id ? { ...prev, status: "refunded" } : prev);
      toast({ title: "Refund processed ✓" });
    } catch (e: any) {
      toast({ title: e.message || "Refund failed", variant: "destructive" });
    } finally {
      setActing(null);
    }
  }

  const totalRevenue = payments.filter((p) => p.status === "success").reduce((s, p) => s + (p.amount ?? 0), 0);

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
          <option value="success">Successful</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="rounded" />
          Flagged only
        </label>
        <Button variant="ghost" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <span className="ml-auto text-sm font-semibold text-green-600">Revenue: {fmt(totalRevenue)}</span>
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
                <tr
                  key={p.id}
                  className={`hover:bg-secondary/20 transition-colors cursor-pointer ${p.flagged ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}
                  onClick={() => setSelected(p)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <VendorAvatar logo={u?.logo_url ?? null} name={u?.name ?? ""} />
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[160px]">{u?.business_name || u?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u?.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u?.email}</p>
                        {u?.vendor_category && <span className="text-xs text-primary/70 font-medium capitalize">{u.vendor_category}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm">{stall?.stall_number ? `#${stall.stall_number}` : "—"}</p>
                    {stall?.package && <p className="text-xs text-muted-foreground capitalize">{stall.package}</p>}
                    {stall?.category && <p className="text-xs text-muted-foreground capitalize">{stall.category}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs">{p.transaction_reference?.slice(-16) ?? "—"}</span></td>
                  <td className="px-4 py-3 font-semibold">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.status] ?? "bg-zinc-100 text-zinc-600"}`}>{p.status}</span>
                      {p.flagged && <Flag className="w-3 h-3 text-red-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="sm"
                        className={`h-7 w-7 p-0 ${p.flagged ? "text-red-500" : "text-muted-foreground"}`}
                        disabled={acting === p.id}
                        onClick={() => toggleFlag(p.id, p.flagged)}
                        title={p.flagged ? "Unflag" : "Flag as suspicious"}
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </Button>
                      {isSuperAdmin && p.status === "success" && (
                        <Button
                          variant="ghost" size="sm"
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
            <button
              key={p.id}
              className={`w-full text-left rounded-xl border border-border bg-card p-4 space-y-3 transition-colors active:bg-secondary/60 ${p.flagged ? "border-red-300 bg-red-50/30 dark:bg-red-950/10" : ""}`}
              onClick={() => setSelected(p)}
            >
              <div className="flex items-start gap-3">
                <VendorAvatar logo={u?.logo_url ?? null} name={u?.name ?? ""} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{u?.business_name || u?.name || "—"}</p>
                  {u?.business_name && <p className="text-xs text-muted-foreground truncate">{u.name}</p>}
                  <p className="text-xs text-muted-foreground truncate">{u?.email}</p>
                  {u?.vendor_category && <span className="text-xs text-primary/70 font-medium capitalize">{u.vendor_category}</span>}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.status] ?? "bg-zinc-100 text-zinc-600"}`}>{p.status}</span>
                  {p.flagged && <Flag className="w-3 h-3 text-red-500" />}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold">{fmt(p.amount)}</span>
                  <span className="text-muted-foreground text-xs ml-2">{stall?.stall_number ? `Stall #${stall.stall_number}` : ""}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <PaymentDetailModal
          payment={selected}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSelected(null)}
          onFlag={toggleFlag}
          onRefund={refund}
          acting={acting}
        />
      )}
    </div>
  );
}
