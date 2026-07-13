import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Search, X } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  reservations: Array<{
    id: string;
    status: string;
    reservation_code: string;
    checked_in_at: string | null;
    stalls: { stall_number: number; package: string } | null;
  }>;
}

const STATUS_CLS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  held: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-zinc-100 text-zinc-500",
};

export default function VendorsPanel() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ vendors: Vendor[] }>("/admin/vendors")
      .then((d) => setVendors(d.vendors))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = vendors.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {vendors.length} vendors</p>

      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {["Vendor", "Phone", "Stall / Status", "Registered", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No vendors found.</td></tr>
            ) : filtered.map((v) => {
              const activeRes = v.reservations?.find((r) => ["confirmed", "held"].includes(r.status));
              return (
                <tr key={v.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{v.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {activeRes ? (
                      <div>
                        <p className="font-semibold text-sm">Stall #{activeRes.stalls?.stall_number ?? "?"}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[activeRes.status] ?? ""}`}>
                          {activeRes.status}
                        </span>
                        {activeRes.checked_in_at && (
                          <p className="text-xs text-green-600 mt-0.5">✓ Checked in</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No active reservation</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(v)}
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vendor detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vendor Details</p>
              <h3 className="font-display text-xl font-bold">{selected.name}</h3>
              <p className="text-sm text-muted-foreground">{selected.email}</p>
              {selected.phone && <p className="text-sm text-muted-foreground">{selected.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Reservations ({selected.reservations?.length ?? 0})</p>
              {(selected.reservations ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No reservations yet.</p>
              ) : (
                <div className="space-y-2">
                  {(selected.reservations ?? []).map((r) => (
                    <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs">{r.reservation_code}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[r.status] ?? ""}`}>{r.status}</span>
                      </div>
                      {r.stalls && <p className="text-muted-foreground">Stall #{r.stalls.stall_number} · {r.stalls.package}</p>}
                      {r.checked_in_at && <p className="text-green-600 text-xs mt-1">✓ Checked in {new Date(r.checked_in_at).toLocaleString()}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
