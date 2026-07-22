import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Search, X, ChevronRight, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Reservation {
  id: string;
  status: string;
  reservation_code: string;
  checked_in_at: string | null;
  stalls: { stall_number: number; package: string } | null;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  vendor_category: string | null;
  business_name: string | null;
  business_logo_url: string | null;
  instagram_username: string | null;
  business_phone: string | null;
  business_profile_complete: boolean | null;
  reservations: Reservation[];
}

const STATUS_CLS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  held: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-zinc-100 text-zinc-500",
};

function hasPaid(v: Vendor) {
  return v.reservations?.some((r) => r.status === "confirmed");
}

async function downloadLogo(url: string, businessName: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("gif") ? "gif" : "jpg";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${businessName.replace(/[^a-z0-9]/gi, "_")}_logo.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function VendorsPanel() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"paid" | "all">("paid");
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

  const base = tab === "paid" ? vendors.filter(hasPaid) : vendors;
  const filtered = base.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.business_name?.toLowerCase().includes(q)
    );
  });

  const paidCount = vendors.filter(hasPaid).length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 w-fit">
        {(["paid", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "paid" ? `Paid (${paidCount})` : `All (${vendors.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Search by name, email or business…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} vendor{filtered.length !== 1 ? "s" : ""}</p>

      {/* Paid vendors — card grid with logo */}
      {tab === "paid" ? (
        loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-secondary/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">No paid vendors yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => {
              const confirmed = v.reservations?.find((r) => r.status === "confirmed");
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelected(v)}
                >
                  {/* Logo / avatar */}
                  <div className="relative h-36 bg-secondary/30 flex items-center justify-center overflow-hidden">
                    {v.business_logo_url ? (
                      <>
                        <img
                          src={v.business_logo_url}
                          alt={v.business_name ?? v.name}
                          className="w-full h-full object-contain p-3"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void downloadLogo(v.business_logo_url!, v.business_name ?? v.name);
                          }}
                          title="Download logo"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background shadow text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {(v.business_name ?? v.name ?? "?")[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-1">
                    <p className="font-semibold text-sm leading-tight truncate">
                      {v.business_name ?? v.name}
                    </p>
                    {v.business_name && (
                      <p className="text-xs text-muted-foreground truncate">{v.name}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {confirmed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          Stall #{confirmed.stalls?.stall_number ?? "?"}
                        </span>
                      )}
                      {v.vendor_category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground capitalize">
                          {v.vendor_category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* All vendors — table */
        <>
          <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  {["Vendor", "Phone", "Business", "Stall / Status", "Registered", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No vendors found.</td></tr>
                ) : filtered.map((v) => {
                  const activeRes = v.reservations?.find((r) => ["confirmed", "held"].includes(r.status));
                  return (
                    <tr key={v.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelected(v)}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{v.phone || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{v.business_name || "—"}</td>
                      <td className="px-4 py-3">
                        {activeRes ? (
                          <div>
                            <p className="font-semibold text-sm">Stall #{activeRes.stalls?.stall_number ?? "?"}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[activeRes.status] ?? ""}`}>{activeRes.status}</span>
                            {activeRes.checked_in_at && <p className="text-xs text-green-600 mt-0.5">✓ Checked in</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No active reservation</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setSelected(v); }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No vendors found.</div>
            ) : filtered.map((v) => {
              const activeRes = v.reservations?.find((r) => ["confirmed", "held"].includes(r.status));
              return (
                <button
                  key={v.id}
                  className="w-full text-left rounded-xl border border-border bg-card p-4 space-y-2 transition-colors active:bg-secondary/60"
                  onClick={() => setSelected(v)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{v.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                      {v.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="text-sm">
                    {activeRes ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Stall #{activeRes.stalls?.stall_number ?? "?"}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[activeRes.status] ?? ""}`}>{activeRes.status}</span>
                        {activeRes.checked_in_at && <span className="text-xs text-green-600">✓ Checked in</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No active reservation</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendor Details</p>
                <h3 className="font-display text-xl font-bold leading-tight">{selected.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Business profile */}
              {(selected.business_name || selected.business_logo_url) && (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Business Profile</p>

                  {selected.business_logo_url && (
                    <div className="flex items-center gap-3">
                      <img
                        src={selected.business_logo_url}
                        alt="Logo"
                        className="w-16 h-16 rounded-xl object-contain border border-border bg-secondary/30"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => void downloadLogo(selected.business_logo_url!, selected.business_name ?? selected.name)}
                        >
                          <Download className="w-3 h-3" /> Download Logo
                        </Button>
                        <a
                          href={selected.business_logo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3 h-3" /> View full size
                        </a>
                      </div>
                    </div>
                  )}

                  <dl className="space-y-1.5 text-sm">
                    {selected.business_name && (
                      <>
                        <dt className="text-xs text-muted-foreground">Business Name</dt>
                        <dd className="font-medium">{selected.business_name}</dd>
                      </>
                    )}
                    {selected.vendor_category && (
                      <>
                        <dt className="text-xs text-muted-foreground mt-1">Category</dt>
                        <dd className="capitalize">{selected.vendor_category}</dd>
                      </>
                    )}
                    {selected.business_phone && (
                      <>
                        <dt className="text-xs text-muted-foreground mt-1">Business Phone</dt>
                        <dd>
                          <a href={`tel:${selected.business_phone}`} className="text-primary hover:underline">
                            {selected.business_phone}
                          </a>
                        </dd>
                      </>
                    )}
                    {selected.instagram_username && (
                      <>
                        <dt className="text-xs text-muted-foreground mt-1">Instagram</dt>
                        <dd>
                          <a
                            href={`https://instagram.com/${selected.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{selected.instagram_username}
                          </a>
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {/* Contact */}
              <div className="rounded-xl border border-border p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
                <p className="text-sm">{selected.email}</p>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="text-sm text-primary hover:underline block">{selected.phone}</a>
                )}
                <p className="text-xs text-muted-foreground mt-1">Registered {new Date(selected.created_at).toLocaleDateString()}</p>
              </div>

              {/* Reservations */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Reservations ({selected.reservations?.length ?? 0})
                </p>
                {(selected.reservations ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reservations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(selected.reservations ?? []).map((r) => (
                      <div key={r.id} className="rounded-xl border border-border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground">{r.reservation_code}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[r.status] ?? ""}`}>{r.status}</span>
                        </div>
                        {r.stalls && (
                          <div>
                            <span className="font-semibold">Stall #{r.stalls.stall_number}</span>
                            <span className="text-muted-foreground text-sm ml-2 capitalize">{r.stalls.package}</span>
                          </div>
                        )}
                        {r.checked_in_at && (
                          <p className="text-green-600 text-xs">✓ Checked in {new Date(r.checked_in_at).toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
