import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Exhibition { id: string; name: string; }
interface Stall { id: string; stall_number: number; status: string; price: number; package: string; }

type Step = "picking" | "holding" | "held" | "paying";

interface HeldInfo { reservationId: string; code: string; stallNumber: number; }

export default function StallPickerModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [exhibitionId, setExhibitionId] = useState<string | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [selected, setSelected] = useState<Stall | null>(null);
  const [step, setStep] = useState<Step>("picking");
  const [held, setHeld] = useState<HeldInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.get<{ exhibitions: Exhibition[] }>("/exhibitions")
      .then((d) => {
        setExhibitions(d.exhibitions);
        if (d.exhibitions.length > 0 && !exhibitionId) {
          setExhibitionId(d.exhibitions[0].id);
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!exhibitionId || !open) return;
    setLoadingStalls(true);
    setSelected(null);
    api.get<{ stalls: Stall[] }>(`/stalls?exhibition_id=${exhibitionId}`)
      .then((d) => setStalls(d.stalls))
      .catch(() => setStalls([]))
      .finally(() => setLoadingStalls(false));
  }, [exhibitionId, open]);

  const reset = () => {
    setSelected(null);
    setStep("picking");
    setHeld(null);
    setError(null);
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) reset();
  };

  const handleHold = async () => {
    if (!selected || !user) return;
    setError(null);
    setStep("holding");
    try {
      const data = await api.post<{ reservation: { id: string; reservation_code: string } }>(
        "/stalls/hold",
        { stall_id: selected.id }
      );
      setHeld({ reservationId: data.reservation.id, code: data.reservation.reservation_code, stallNumber: selected.stall_number });
      setStep("held");
      setStalls((prev) => prev.filter((s) => s.id !== selected.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to hold stall. Please try again.");
      setStep("picking");
    }
  };

  const handlePay = async () => {
    if (!held) return;
    setError(null);
    setStep("paying");
    try {
      const data = await api.post<{ payment_link: string }>("/payments/initiate", { reservation_id: held.reservationId });
      window.location.href = data.payment_link;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Payment could not be initiated.";
      setError(msg);
      setStep("held");
    }
  };

  const allStallNumbers = new Set(stalls.map((s) => s.stall_number));

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-background border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Sign in to reserve</DialogTitle>
            <DialogDescription>You need an account to reserve a vendor stall.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button className="rounded-full" onClick={() => { handleClose(false); navigate("/login"); }}>Sign in</Button>
            <Button variant="outline" className="rounded-full" onClick={() => { handleClose(false); navigate("/register"); }}>Create account</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-background border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {step === "held" ? "Stall held!" : "Pick your stall"}
          </DialogTitle>
          <DialogDescription>
            {step === "held"
              ? `Stall #${held?.stallNumber} is held for 15 minutes. Complete payment to confirm.`
              : "Select an available stall then click Hold."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {(step === "held" || step === "paying") && held ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm">
              <p className="font-semibold mb-1">Reservation code: <span className="font-mono">{held.code}</span></p>
              <p className="text-muted-foreground">Your stall is temporarily held. Pay now to lock it in.</p>
            </div>
            <Button className="rounded-full" onClick={handlePay} disabled={step === "paying"}>
              {step === "paying" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Redirecting…</> : "Pay now →"}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => navigate("/my-reservations")}>
              Pay later from My Reservations
            </Button>
          </div>
        ) : (
          <>
            {exhibitions.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {exhibitions.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setExhibitionId(e.id)}
                    className={`text-xs rounded-full px-3 py-1 border transition-colors ${exhibitionId === e.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground py-1">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary inline-block" /> Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-border inline-block" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted inline-block" /> Taken</span>
            </div>

            <div className="overflow-y-auto flex-1 -mx-2 px-2">
              {loadingStalls ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : stalls.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">No available stalls for this exhibition.</p>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                  {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => {
                    const stall = stalls.find((s) => s.stall_number === n);
                    const available = allStallNumbers.has(n);
                    const isSelected = selected?.stall_number === n;
                    return (
                      <button
                        key={n}
                        disabled={!available || step === "holding"}
                        onClick={() => stall && setSelected(stall)}
                        className={[
                          "aspect-square rounded-md text-xs font-semibold border transition-all flex items-center justify-center",
                          !available
                            ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed line-through"
                            : isSelected
                            ? "bg-primary text-primary-foreground border-primary scale-105 shadow"
                            : "bg-background border-border hover:border-primary hover:text-primary",
                        ].join(" ")}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm">
                {selected ? (
                  <span className="flex items-center gap-1.5 text-primary font-medium">
                    <Check className="w-4 h-4" /> Stall #{selected.stall_number} · ₦{selected.price?.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No stall selected</span>
                )}
              </p>
              <Button onClick={handleHold} disabled={!selected || step === "holding"} className="rounded-full">
                {step === "holding" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Holding…</> : "Hold stall"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
