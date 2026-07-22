import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, X, UserCheck } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Reservation {
  id: string;
  status: string;
  reservation_code: string;
  created_at: string;
  checked_in_at: string | null;
  users: { id: string; name: string; email: string; phone: string };
  stalls: { stall_number: number; package: string; price: number; exhibitions: { name: string } };
  payments: Array<{ status: string; amount: number; transaction_reference: string }> | null;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  confirmed:  { label: "Confirmed",  cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  held:       { label: "Held",       cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  cancelled:  { label: "Cancelled",  cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  expired:    { label: "Expired",    cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

function exportCsv(rows: Reservation[]) {
  const headers = ["Code", "Vendor", "Email", "Phone", "Exhibition", "Stall #", "Package", "Price", "Status", "Checked In", "Date"];
  const lines = rows.map((r) => [
    r.reservation_code,
    r.users?.name ?? "",
    r.users?.email ?? "",
    r.users?.phone ?? "",
    r.stalls?.exhibitions?.name ?? "",
    r.stalls?.stall_number ?? "",
    r.stalls?.package ?? "",
    r.stalls?.price ?? "",
    r.status,
    r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "No",
    new Date(r.created_at).toLocaleString(),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReservationsPanel({ canEdit }: { canEdit: boolean }) {
  const [all, setAll] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ reservations: Reservation[] }>("/admin/reservations")
      .then((d) => setAll(d.reservations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = all.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.users?.name?.toLowerCase().includes(q) ||
        r.users?.email?.toLowerCase().includes(q) ||
        r.reservation_code?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function cancel(id: string) {
    if (!confirm("Cancel this reservation? The stall will be released back to available.")) return;
    setCancelling(id);
    try {
      await api.delete(`/admin/reservations/${id}`);
      setAll((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" } : r));
      toast({ title: "Reservation cancelled" });
    } catch {
      toast({ title: "Failed to cancel reservation", variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  }

  async function checkIn(id: string) {
    setCheckingIn(id);
    try {
      await api.post(`/admin/reservations/${id}/checkin`);
      const now = new Date().toISOString();
      setAll((prev) => prev.map((r) => r.id === id ? { ...r, checked_in_at: now } : r));
      toast({ title: "Vendor checked in ✓" });
    } catch (e: any) {
      toast({ title: e.message || "Check-in failed", variant: "destructive" });
    } finally {
      setCheckingIn(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Search vendor name, email or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-border bg-background text-sm px-3 py-2 focus:outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="held">Held</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(filtered)}>
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {all.length} records</p>

      {/* ── Desktop table (md+) ── */}
      <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 sticky top-0">
            <tr>
              {["Vendor", "Exhibition / Stall", "Code", "Status", "Check-in", "Date", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No reservations found.</td></tr>
            ) : filtered.map((r) => {
              const meta = STATUS_META[r.status] ?? { label: r.status, cls: "bg-zinc-100 text-zinc-600" };
              return (
                <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight">{r.users?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.users?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-muted-foreground text-xs">{r.stalls?.exhibitions?.name}</p>
                    <p className="font-semibold">Stall #{r.stalls?.stall_number}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.stalls?.package}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.reservation_code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.checked_in_at ? (
                      <span className="text-green-600 font-medium">✓ {new Date(r.checked_in_at).toLocaleTimeString()}</span>
                    ) : r.status === "confirmed" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={checkingIn === r.id}
                        onClick={() => checkIn(r.id)}
                      >
                        <UserCheck className="w-3 h-3" />
                        {checkingIn === r.id ? "…" : "Check in"}
                      </Button>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && !["cancelled", "expired"].includes(r.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        disabled={cancelling === r.id}
                        onClick={() => cancel(r.id)}
                        title="Cancel reservation"
                      >
                        {cancelling === r.id ? "…" : <X className="w-4 h-4" />}
                      </Button>
                    )}
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
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No reservations found.</div>
        ) : filtered.map((r) => {
          const meta = STATUS_META[r.status] ?? { label: r.status, cls: "bg-zinc-100 text-zinc-600" };
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{r.users?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.users?.email}</p>
                </div>
                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Stall</p>
                  <p className="font-semibold">#{r.stalls?.stall_number ?? "—"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.stalls?.package}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Exhibition</p>
                  <p className="text-xs font-medium leading-snug">{r.stalls?.exhibitions?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Code</p>
                  <p className="font-mono text-xs">{r.reservation_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                  <p className="text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Check-in status */}
              {r.checked_in_at ? (
                <p className="text-xs text-green-600 font-medium">✓ Checked in at {new Date(r.checked_in_at).toLocaleTimeString()}</p>
              ) : null}

              {/* Actions */}
              {(r.status === "confirmed" && !r.checked_in_at) || (canEdit && !["cancelled", "expired"].includes(r.status)) ? (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  {r.status === "confirmed" && !r.checked_in_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 flex-1"
                      disabled={checkingIn === r.id}
                      onClick={() => checkIn(r.id)}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {checkingIn === r.id ? "Checking in…" : "Check in"}
                    </Button>
                  )}
                  {canEdit && !["cancelled", "expired"].includes(r.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive gap-1.5"
                      disabled={cancelling === r.id}
                      onClick={() => cancel(r.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                      {cancelling === r.id ? "Cancelling…" : "Cancel"}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
