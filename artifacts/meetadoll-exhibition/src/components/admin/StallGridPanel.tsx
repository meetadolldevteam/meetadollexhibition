import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { X } from "lucide-react";

interface Stall {
  id: string;
  stall_number: number;
  status: string;
  price: number;
  package: string;
  exhibition_id: string;
}

interface Exhibition { id: string; name: string; }

const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-100 hover:bg-green-200 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200",
  held:      "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200",
  reserved:  "bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200",
  blocked:   "bg-zinc-200 hover:bg-zinc-300 border-zinc-400 text-zinc-600 dark:bg-zinc-700/60 dark:border-zinc-600 dark:text-zinc-400",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  held: "On Hold",
  reserved: "Reserved",
  blocked: "Blocked",
};

export default function StallGridPanel({ canEdit }: { canEdit: boolean }) {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedExh, setSelectedExh] = useState<string>("");
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.get<{ exhibitions: Exhibition[] }>("/exhibitions").then((d) => {
      setExhibitions(d.exhibitions);
      if (d.exhibitions.length > 0) setSelectedExh(d.exhibitions[0].id);
    });
  }, []);

  const loadStalls = useCallback(() => {
    if (!selectedExh) return;
    setLoading(true);
    api
      .get<{ stalls: Stall[] }>(`/stalls?exhibition_id=${selectedExh}&limit=200`)
      .then((d) => setStalls(d.stalls))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedExh]);

  useEffect(() => { loadStalls(); }, [loadStalls]);

  async function updateStallStatus(stallId: string, newStatus: string) {
    setUpdating(true);
    try {
      const result = await api.patch<{ stall: Stall }>(`/admin/stalls/${stallId}`, { status: newStatus });
      setStalls((prev) => prev.map((s) => s.id === stallId ? { ...s, status: result.stall.status } : s));
      if (selectedStall?.id === stallId) setSelectedStall((p) => p ? { ...p, status: result.stall.status } : p);
      toast({ title: `Stall #${selectedStall?.stall_number} set to ${newStatus}` });
    } catch {
      toast({ title: "Failed to update stall", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  }

  const counts = stalls.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {exhibitions.length > 1 && (
        <select
          className="rounded-lg border border-border bg-background text-sm px-3 py-2"
          value={selectedExh}
          onChange={(e) => setSelectedExh(e.target.value)}
        >
          {exhibitions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${STATUS_COLOR[k]}`} />
            <span className="text-muted-foreground">{v} ({counts[k] ?? 0})</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-10 sm:grid-cols-15 gap-1 animate-pulse">
          {Array.from({ length: 150 }).map((_, i) => (
            <div key={i} className="h-9 rounded bg-secondary/40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))" }}>
          {stalls.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStall(s)}
              className={`h-10 rounded border text-xs font-semibold transition-all ${STATUS_COLOR[s.status] ?? "bg-secondary"}`}
              title={`Stall #${s.stall_number} - ${STATUS_LABEL[s.status] ?? s.status}`}
            >
              {s.stall_number}
            </button>
          ))}
        </div>
      )}

      {/* Stall detail modal */}
      {selectedStall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStall(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStall(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Stall Details</p>
              <h3 className="font-display text-2xl font-bold">#{selectedStall.stall_number}</h3>
            </div>

            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[selectedStall.status] ?? ""}`}>
                  {STATUS_LABEL[selectedStall.status] ?? selectedStall.status}
                </span>
              </dd>
              <dt className="text-muted-foreground">Package</dt>
              <dd className="capitalize font-medium">{selectedStall.package}</dd>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium">₦{selectedStall.price?.toLocaleString("en-NG")}</dd>
            </dl>

            {canEdit && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Change Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["available", "held", "blocked"] as const).map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      disabled={updating || selectedStall.status === s}
                      onClick={() => updateStallStatus(selectedStall.id, s)}
                      className="capitalize text-xs"
                    >
                      {s === "blocked" ? "🔒 Block" : s === "held" ? "⏸ Hold" : "✓ Release"}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
