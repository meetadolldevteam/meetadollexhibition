import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface ActivityEntry {
  id: string;
  action: string;
  admin_name: string;
  admin_role: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  RESERVATION_CANCELLED: "Cancelled reservation",
  VENDOR_CHECKED_IN: "Checked in vendor",
  STALL_STATUS_CHANGED: "Changed stall status",
  PAYMENT_FLAGGED: "Flagged payment",
  PAYMENT_UNFLAGGED: "Unflagged payment",
  REFUND_ISSUED: "Issued refund",
  ANNOUNCEMENT_SENT: "Sent announcement",
  SHIFT_NOTE_ADDED: "Added shift note",
  ADMIN_CREATED: "Created team member",
};

const ROLE_CLS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  admin:       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  staff:       "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export default function ActivityLogPanel() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ activities: ActivityEntry[]; total: number }>(`/admin/activity-log?page=${page}&limit=${limit}`)
      .then((d) => { setActivities(d.activities); setTotal(d.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} total entries</p>
        <Button variant="ghost" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-secondary/40" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm">No activity logged yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Admin actions will appear here once the activity_log table is created.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{a.admin_name}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_CLS[a.admin_role] ?? ""}`}>
                    {a.admin_role.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{ACTION_LABELS[a.action] ?? a.action}</p>
                {Object.keys(a.details ?? {}).length > 0 && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                    {Object.entries(a.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 sm:hidden">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <span className="hidden sm:block text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
