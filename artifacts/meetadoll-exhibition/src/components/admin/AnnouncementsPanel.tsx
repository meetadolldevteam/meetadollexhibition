import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Exhibition { id: string; name: string; }

export default function AnnouncementsPanel() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [exhibitionId, setExhibitionId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ exhibitions: Exhibition[] }>("/exhibitions").then((d) => setExhibitions(d.exhibitions));
  }, []);

  async function send() {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Subject and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const result = await api.post<{ message: string }>("/admin/announce", {
        subject,
        message,
        exhibition_id: exhibitionId || undefined,
      });
      setLastResult(result.message);
      toast({ title: result.message });
      setSubject("");
      setMessage("");
    } catch (e: any) {
      toast({ title: e.message || "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300">
        <strong>Note:</strong> This sends an email to all vendors with a <em>confirmed</em> reservation. Use sparingly.
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Exhibition (optional)</label>
          <select
            className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2"
            value={exhibitionId}
            onChange={(e) => setExhibitionId(e.target.value)}
          >
            <option value="">All exhibitions</option>
            {exhibitions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Subject</label>
          <input
            className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Important update from Meetadoll Exhibition"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Message</label>
          <textarea
            rows={8}
            className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Write your message here. Vendor names will be personalised automatically."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">{message.length} characters</p>
        </div>

        <Button className="gap-2" onClick={send} disabled={sending || !subject.trim() || !message.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending…" : "Send to Confirmed Vendors"}
        </Button>

        {lastResult && (
          <p className="text-sm text-green-600 font-medium">✓ {lastResult}</p>
        )}
      </div>
    </div>
  );
}
