import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_CLS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  admin:       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  staff:       "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const ROLE_DESC: Record<string, string> = {
  admin: "Manage reservations · stalls · announcements",
  staff: "View reservations · check in vendors",
};

export default function CreateAdminPanel() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ admins: AdminUser[] }>("/admin/admins")
      .then((d) => setAdmins(d.admins))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast({ title: "Name, valid email, and password (min 8 chars) are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const result = await api.post<{ user: AdminUser }>("/admin/admins", form);
      setAdmins((prev) => [...prev, result.user]);
      setForm({ name: "", email: "", password: "", role: "staff" });
      setShowForm(false);
      toast({ title: `${result.user.role === "staff" ? "Staff" : "Admin"} account created for ${result.user.name}` });
    } catch (e: any) {
      toast({ title: e.message || "Failed to create account", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Role explainer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(ROLE_DESC).map(([role, desc]) => (
          <div key={role} className="rounded-xl border border-border p-4">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${ROLE_CLS[role]}`}>
              {role.replace("_", " ")}
            </span>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Current team */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold">Current Team</h3>
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" /> Add member
          </Button>
        </div>

        {loading ? (
          <div className="h-24 rounded-xl bg-secondary/40 animate-pulse" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  {["Name", "Email", "Role", "Added"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{a.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_CLS[a.role] ?? ""}`}>
                        {a.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-display text-base font-bold">Add Team Member</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Fatima Mohammed"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="fatima@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password (min 8 chars)</label>
              <input
                type="password"
                className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <select
                className="w-full rounded-lg border border-border bg-background text-sm px-3 py-2"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="staff">Staff (view + check-in only)</option>
                <option value="admin">Admin (full management)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={create} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? "Creating…" : "Create Account"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
