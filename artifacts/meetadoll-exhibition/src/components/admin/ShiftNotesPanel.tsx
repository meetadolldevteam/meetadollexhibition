import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ShiftNote {
  id: string;
  admin_name: string;
  note: string;
  created_at: string;
}

export default function ShiftNotesPanel() {
  const [notes, setNotes] = useState<ShiftNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ notes: ShiftNote[] }>("/admin/shift-notes")
      .then((d) => setNotes(d.notes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const result = await api.post<{ note: ShiftNote }>("/admin/shift-notes", { note });
      setNotes((prev) => [result.note, ...prev]);
      setNote("");
      toast({ title: "Note saved" });
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-800 dark:text-blue-300">
        Leave notes for the next shift — anything they should know before taking over.
      </div>

      {/* Add note */}
      <div className="rounded-2xl border border-border p-4 space-y-3">
        <label className="block text-sm font-medium">Add a handover note</label>
        <textarea
          rows={4}
          className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder="E.g. Stall 42 may have an issue with payment confirmation. Vendor Aisha confirmed she paid — check with Paystack."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="sm" className="gap-2" onClick={addNote} disabled={saving || !note.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {saving ? "Saving…" : "Post Note"}
        </Button>
      </div>

      {/* Notes list */}
      <div>
        <h3 className="font-display text-base font-bold mb-3">Recent Shift Notes</h3>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-secondary/40" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-muted-foreground text-sm">No shift notes yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Notes you write will appear here for the next team member.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{n.admin_name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
