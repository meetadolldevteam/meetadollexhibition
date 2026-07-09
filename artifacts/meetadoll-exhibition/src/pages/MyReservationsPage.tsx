import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const logo = { url: "/assets/meetadoll-logo.jpg" };

interface Exhibition { name: string; venue: string; start_date: string; end_date: string; }
interface Stall { stall_number: number; package: string; price: number; exhibitions: Exhibition; }
interface Reservation {
  id: string;
  status: string;
  reservation_code: string;
  hold_expires_at: string | null;
  created_at: string;
  stalls: Stall;
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  held: { label: "Held", variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: "Confirmed", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  expired: { label: "Expired", variant: "outline", icon: <AlertCircle className="w-3 h-3" /> },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login?next=/my-reservations", { replace: true });
      return;
    }
    api.get<{ reservations: Reservation[] }>("/reservations/mine")
      .then((d) => setReservations(d.reservations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const handlePay = async (reservationId: string) => {
    setPayingId(reservationId);
    setPayError(null);
    try {
      const data = await api.post<{ payment_link: string }>("/payments/initiate", { reservation_id: reservationId });
      window.location.href = data.payment_link;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Payment initiation failed";
      setPayError(msg);
      setPayingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-5 py-4 flex items-center justify-between">
        <Link to="/">
          <img src={logo.url} alt="Meetadoll" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-display text-3xl font-bold mb-2">My Reservations</h1>
        <p className="text-muted-foreground text-sm mb-8">Your stall reservation history for all Meetadoll exhibitions.</p>

        {payError && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {payError}
          </div>
        )}

        {reservations.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No reservations yet</p>
            <p className="text-sm mt-1">Reserve a stall from the home page to get started.</p>
            <Button asChild className="rounded-full mt-6">
              <Link to="/">Browse stalls</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reservations.map((r) => {
              const meta = STATUS_META[r.status] ?? STATUS_META["held"];
              const exh = r.stalls?.exhibitions;
              const isHeld = r.status === "held";
              const holdExpiry = r.hold_expires_at ? new Date(r.hold_expires_at) : null;
              const holdExpired = holdExpiry ? holdExpiry < new Date() : false;

              return (
                <div key={r.id} className="border border-border rounded-xl p-5 bg-card flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-display font-bold text-lg">Stall #{r.stalls?.stall_number}</span>
                      <Badge variant={meta.variant} className="flex items-center gap-1 text-xs">
                        {meta.icon} {meta.label}
                      </Badge>
                    </div>
                    {exh && (
                      <p className="text-sm text-muted-foreground mb-1">{exh.name} · {exh.venue}</p>
                    )}
                    {exh?.start_date && (
                      <p className="text-xs text-muted-foreground mb-2">{formatDate(exh.start_date)}</p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground">Code: {r.reservation_code}</p>
                    {r.stalls?.price && (
                      <p className="text-sm font-semibold mt-1">₦{r.stalls.price.toLocaleString()}</p>
                    )}
                    {isHeld && holdExpiry && !holdExpired && (
                      <p className="text-xs text-amber-600 mt-1">
                        Hold expires {holdExpiry.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  {isHeld && !holdExpired && (
                    <Button
                      size="sm"
                      className="rounded-full shrink-0"
                      disabled={payingId === r.id}
                      onClick={() => handlePay(r.id)}
                    >
                      {payingId === r.id ? (
                        <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Redirecting…</>
                      ) : "Pay now"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
