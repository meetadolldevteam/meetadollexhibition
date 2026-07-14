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
  defaultTierFilter?: "tier1" | "tier2";
}

interface Exhibition { id: string; name: string; }
interface Stall {
  id: string;
  stall_number: number;
  status: string;
  price: number;
  package: string;
  category: string | null;
}

type Step = "picking" | "holding" | "held" | "paying";
interface HeldInfo { reservationId: string; code: string; stallNumber: number; price: number; }

type StallFilter = "all" | "tier1" | "tier2" | "Fashion & Others" | "Food";

const TIER1_COLOR = "#C41E3A";
const TIER2_COLOR = "#00AEAE";
const TIER1_PRICE = 250000;
const TIER2_PRICE = 210000;

function tierColor(price: number): string {
  return price === TIER2_PRICE ? TIER2_COLOR : TIER1_COLOR;
}

function canVendorBookStall(vendorCategory: string | null | undefined, stallCategory: string | null | undefined): boolean {
  if (!vendorCategory || !stallCategory) return true;
  if (vendorCategory === "food") return stallCategory === "Food";
  return stallCategory === "Fashion & Others";
}

function vendorAllowedCategory(vendorCategory: string | null | undefined): string | null {
  if (!vendorCategory) return null;
  if (vendorCategory === "food") return "Food";
  return "Fashion & Others";
}

export default function StallPickerModal({ open, onOpenChange, defaultTierFilter }: Props) {
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
  const [stallFilter, setStallFilter] = useState<StallFilter>("all");

  useEffect(() => {
    if (open) {
      if (defaultTierFilter) {
        setStallFilter(defaultTierFilter);
      } else if (user?.vendor_category) {
        const allowed = vendorAllowedCategory(user.vendor_category);
        if (allowed) setStallFilter(allowed as StallFilter);
      }
    }
    if (!open) setStallFilter("all");
  }, [open, defaultTierFilter, user?.vendor_category]);

  useEffect(() => {
    if (!open) return;
    api.get<{ exhibitions: Exhibition[] }>("/exhibitions")
      .then((d) => {
        setExhibitions(d.exhibitions);
        if (d.exhibitions.length > 0 && !exhibitionId) setExhibitionId(d.exhibitions[0].id);
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

  const reset = () => { setSelected(null); setStep("picking"); setHeld(null); setError(null); };
  const handleClose = (v: boolean) => { onOpenChange(v); if (!v) reset(); };

  const handleHold = async () => {
    if (!selected || !user) return;
    setError(null);
    setStep("holding");
    try {
      const data = await api.post<{ reservation: { id: string; reservation_code: string } }>(
        "/stalls/hold",
        { stall_id: selected.id }
      );
      setHeld({ reservationId: data.reservation.id, code: data.reservation.reservation_code, stallNumber: selected.stall_number, price: selected.price });
      setStep("held");
      setStalls((prev) => prev.map((s) => s.id === selected.id ? { ...s, status: "held" } : s));
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
      setError(err instanceof ApiError ? err.message : "Payment could not be initiated.");
      setStep("held");
    }
  };

  const stallMap = new Map(stalls.map((s) => [Number(s.stall_number), s]));
  const totalStalls = stalls.length > 0 ? Math.max(...stalls.map((s) => s.stall_number)) : 100;

  const allNumbers = Array.from({ length: totalStalls }, (_, i) => i + 1);

  const displayNumbers = allNumbers.filter((n) => {
    const stall = stallMap.get(n);
    if (!stall) return stallFilter === "all";
    if (stallFilter === "tier1") return stall.price === TIER1_PRICE;
    if (stallFilter === "tier2") return stall.price === TIER2_PRICE;
    if (stallFilter === "Fashion & Others") return stall.category === "Fashion & Others";
    if (stallFilter === "Food") return stall.category === "Food";
    return true;
  });

  const availableInView = stalls.filter((s) => {
    if (s.status !== "available") return false;
    if (stallFilter === "tier1") return s.price === TIER1_PRICE;
    if (stallFilter === "tier2") return s.price === TIER2_PRICE;
    if (stallFilter === "Fashion & Others") return s.category === "Fashion & Others";
    if (stallFilter === "Food") return s.category === "Food";
    return true;
  }).length;

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

  const allowedCat = vendorAllowedCategory(user.vendor_category);

  const FILTER_TABS: { value: StallFilter; label: string }[] = [
    { value: "all", label: "All Stalls" },
    { value: "tier1", label: "Tier 1 - ₦250k" },
    { value: "tier2", label: "Tier 2 - ₦210k" },
    { value: "Fashion & Others", label: "Fashion & Others" },
    { value: "Food", label: "Food" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {step === "held" ? "Stall held!" : "Pick your stall"}
          </DialogTitle>
          <DialogDescription>
            {step === "held"
              ? `Stall V${held?.stallNumber} is held for 15 minutes. Complete payment to confirm.`
              : allowedCat
              ? `Showing ${allowedCat} stalls for your vendor type.`
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
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm space-y-1">
              <p className="font-semibold">Reservation code: <span className="font-mono">{held.code}</span></p>
              <p className="text-muted-foreground">Stall V{held.stallNumber} · <strong className="text-foreground">₦{held.price.toLocaleString()}</strong></p>
              <p className="text-muted-foreground text-xs">Your stall is temporarily held. Pay now to lock it in.</p>
            </div>
            <Button className="rounded-full" onClick={handlePay} disabled={step === "paying"}>
              {step === "paying" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting...</> : "Pay now"}
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

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStallFilter(tab.value)}
                  className={`text-xs rounded-full px-3 py-1.5 border font-medium transition-colors ${
                    stallFilter === tab.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                {availableInView} available
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 inline-block" style={{ borderColor: TIER1_COLOR }} />
                Tier 1 - ₦250,000
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 inline-block" style={{ borderColor: TIER2_COLOR }} />
                Tier 2 - ₦210,000
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-300 inline-block" />
                Taken
              </span>
              {allowedCat && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-zinc-100 border border-zinc-300 opacity-40 inline-block" />
                  Not your category
                </span>
              )}
            </div>

            {/* Stall grid */}
            <div className="overflow-y-auto flex-1 -mx-2 px-2">
              <div className="mb-3 rounded-xl overflow-hidden border border-border">
                <img
                  src="/images/stall-guide.jpg"
                  alt="Stall layout guide showing tier locations, categories and prices"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>

              {loadingStalls ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : stalls.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">No stalls found for this exhibition.</p>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {displayNumbers.map((n) => {
                    const stall = stallMap.get(n);
                    if (!stall) return null;

                    const isAvailable = stall.status === "available";
                    const isTaken = !isAvailable;
                    const isSelected = selected?.stall_number === n;
                    const isRestricted = !canVendorBookStall(user.vendor_category, stall.category);
                    const color = tierColor(stall.price);
                    const catShort = stall.category === "Food" ? "Food" : "F&O";

                    let cellClass = "aspect-square rounded-md text-center border-2 transition-all flex flex-col items-center justify-center cursor-pointer select-none ";

                    if (isTaken) {
                      cellClass += "bg-zinc-300 border-zinc-300 text-zinc-500 cursor-not-allowed opacity-60";
                    } else if (isRestricted) {
                      cellClass += "bg-zinc-50 border-zinc-200 text-zinc-300 cursor-not-allowed opacity-40";
                    } else if (isSelected) {
                      cellClass += "text-white scale-105 shadow-md";
                    } else {
                      cellClass += "bg-white text-zinc-800 hover:scale-105 hover:shadow-sm";
                    }

                    return (
                      <button
                        key={n}
                        disabled={isTaken || isRestricted || step === "holding"}
                        onClick={() => isAvailable && !isRestricted && stall && setSelected(stall)}
                        className={cellClass}
                        style={
                          isSelected
                            ? { backgroundColor: color, borderColor: color }
                            : !isTaken && !isRestricted
                            ? { borderColor: color }
                            : undefined
                        }
                        title={isRestricted ? `Not available for your vendor type (${user.vendor_category})` : `V${n} - ${stall.category} - ₦${stall.price.toLocaleString()}`}
                      >
                        <span className="text-[10px] font-bold leading-tight">V{n}</span>
                        <span className="text-[7px] leading-tight opacity-70">{catShort}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer action bar */}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-3">
              <div className="text-sm min-w-0">
                {selected ? (
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-medium" style={{ color: tierColor(selected.price) }}>
                      <Check className="w-4 h-4 shrink-0" /> V{selected.stall_number} - {selected.category}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      ₦{selected.price.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No stall selected</span>
                )}
              </div>
              <Button
                onClick={handleHold}
                disabled={!selected || step === "holding"}
                className="rounded-full shrink-0"
              >
                {step === "holding" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Holding...</> : "Hold stall"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
