import { Button } from "@/components/ui/button";
import { Check, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";
import StallPickerModal from "./StallPickerModal";
import { useAuth } from "@/context/AuthContext";

const TIER1_COLOR = "#8B0000";
const TIER2_COLOR = "#00AEAE";

interface StallData { price: number; status: string; }
interface Exhibition { id: string; }

const TIER1_FEATURES = [
  "Prime placement on the exhibition floor",
  "Access for the full 2-day event",
  "Connect and trade with fellow exhibitors",
  "On-site support from the Meetadoll team",
];

const TIER2_FEATURES = [
  "Placement on the exhibition floor",
  "Access for the full 2-day event",
  "Connect and trade with fellow exhibitors",
  "On-site support from the Meetadoll team",
];

const TicketsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTier, setPickerTier] = useState<"tier1" | "tier2" | undefined>(undefined);
  const [stalls, setStalls] = useState<StallData[]>([]);

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL ?? "/api";
    fetch(`${API}/exhibitions`)
      .then((r) => r.json())
      .then((d: { exhibitions: Exhibition[] }) => {
        const first = d.exhibitions?.[0];
        if (!first) return;
        return fetch(`${API}/stalls?exhibition_id=${first.id}&limit=200`);
      })
      .then((r) => r?.json())
      .then((s: { stalls: StallData[] } | undefined) => { if (s?.stalls) setStalls(s.stalls); })
      .catch(() => {});
  }, []);

  const tier1Total = stalls.filter((s) => s.price === 250000).length || 59;
  const tier2Total = stalls.filter((s) => s.price === 210000).length || 41;
  const tier1Available = stalls.length > 0 ? stalls.filter((s) => s.price === 250000 && s.status === "available").length : tier1Total;
  const tier2Available = stalls.length > 0 ? stalls.filter((s) => s.price === 210000 && s.status === "available").length : tier2Total;

  const tier1Taken = tier1Total - tier1Available;
  const tier2Taken = tier2Total - tier2Available;
  const tier1Pct = tier1Total > 0 ? (tier1Taken / tier1Total) * 100 : 0;
  const tier2Pct = tier2Total > 0 ? (tier2Taken / tier2Total) * 100 : 0;

  const handleReserve = (tier: "tier1" | "tier2") => {
    if (user) {
      setPickerTier(tier);
      setPickerOpen(true);
    } else {
      navigate("/register");
    }
  };

  const handlePickerChange = (open: boolean) => {
    setPickerOpen(open);
    if (!open) setPickerTier(undefined);
  };

  return (
    <section id="tickets" className="py-16 md:py-20 px-5 md:px-6 bg-foreground text-background">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-3">Exhibit with us</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 text-background">Only 100 Vendor Stalls Available</h2>
          <p className="text-background/70 max-w-2xl mb-10 md:mb-12">
            Secure your spot before they're gone. 100 stalls total across two price tiers.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Tier 1 Card */}
          <ScrollReveal>
            <div className="bg-card text-foreground rounded-xl p-5 md:p-6 flex flex-col h-full shadow-sm border-2" style={{ borderColor: TIER1_COLOR }}>
              <div className="flex items-center gap-2 mb-1">
                <Store size={14} style={{ color: TIER1_COLOR }} />
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Tier 1 Stalls</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                Fashion &amp; Others: V1–V25, V98–V100<br />
                Food: V26–V39, V81–V97
              </p>
              <p className="text-2xl md:text-3xl font-display font-bold mb-4" style={{ color: TIER1_COLOR }}>₦250,000</p>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="font-semibold" style={{ color: TIER1_COLOR }}>{tier1Available} slots left</span>
                  <span>{tier1Taken} / {tier1Total}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full transition-all rounded-full" style={{ width: `${tier1Pct}%`, backgroundColor: TIER1_COLOR }} />
                </div>
              </div>

              <Button
                size="sm"
                className="rounded-full w-full mb-4 text-white"
                style={{ backgroundColor: TIER1_COLOR, borderColor: TIER1_COLOR }}
                onClick={() => handleReserve("tier1")}
              >
                {user ? "Pick & reserve stall" : "Register to reserve"}
              </Button>

              <ul className="space-y-2 mt-auto">
                {TIER1_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: TIER1_COLOR }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Tier 2 Card */}
          <ScrollReveal delay={0.1}>
            <div className="bg-card text-foreground rounded-xl p-5 md:p-6 flex flex-col h-full shadow-sm border-2" style={{ borderColor: TIER2_COLOR }}>
              <div className="flex items-center gap-2 mb-1">
                <Store size={14} style={{ color: TIER2_COLOR }} />
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Tier 2 Stalls</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                Food only: V40–V80
              </p>
              <p className="text-2xl md:text-3xl font-display font-bold mb-4" style={{ color: TIER2_COLOR }}>₦210,000</p>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="font-semibold" style={{ color: TIER2_COLOR }}>{tier2Available} slots left</span>
                  <span>{tier2Taken} / {tier2Total}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full transition-all rounded-full" style={{ width: `${tier2Pct}%`, backgroundColor: TIER2_COLOR }} />
                </div>
              </div>

              <Button
                size="sm"
                className="rounded-full w-full mb-4 text-white"
                style={{ backgroundColor: TIER2_COLOR, borderColor: TIER2_COLOR }}
                onClick={() => handleReserve("tier2")}
              >
                {user ? "Pick & reserve stall" : "Register to reserve"}
              </Button>

              <ul className="space-y-2 mt-auto">
                {TIER2_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: TIER2_COLOR }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>

      <StallPickerModal open={pickerOpen} onOpenChange={handlePickerChange} defaultTierFilter={pickerTier} />
    </section>
  );
};

export default TicketsSection;
