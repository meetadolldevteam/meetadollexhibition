import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Flag, RefreshCw } from "lucide-react";
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
    users: { name: string; email: string } | null;
    stalls: { stall_number: number } | null;
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
        <span className="ml-auto text-sm font-medium text-green-600">
          Revenue: {fmt(totalRevenue)}
        </span>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {["Vendor", "Stall", "Reference", "Amount", "Status", "Date", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payments found.</td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className={`hover:bg-secondary/20 transition-colors ${p.flagged ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.reservations?.users?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.reservations?.users?.email}</p>
                </td>
                <td className="px-4 py-3 font-semibold text-sm">
                  {p.reservations?.stalls?.stall_number ? `#${p.reservations.stalls.stall_number}` : "—"}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
