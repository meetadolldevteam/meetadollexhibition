import { Button } from "@/components/ui/button";
import { Check, Store } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";
import StallPickerModal from "./StallPickerModal";
import { useAuth } from "@/context/AuthContext";

const stall = {
  name: "Vendor Stall",
  subtitle: "Standard exhibition stall for the full 2 days",
  price: "₦210,000",
  features: [
    "Prime placement on the exhibition floor",
    "Access for the full 2-day event",
    "Vendor listing across our channels",
    "On-site support from the Meetadoll team",
  ],
  slots_total: 150,
  slots_taken: 42,
};

const TicketsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const left = Math.max(0, stall.slots_total - stall.slots_taken);
  const pct = (stall.slots_taken / stall.slots_total) * 100;

  const handleReserve = () => {
    if (user) {
      setPickerOpen(true);
    } else {
      navigate("/register");
    }
  };

  return (
    <section id="tickets" className="py-16 md:py-20 px-5 md:px-6 bg-foreground text-background">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-3">Exhibit with us</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 text-background">Only 150 Vendor Stalls Available</h2>
          <p className="text-primary font-display font-bold text-2xl md:text-3xl mb-3">₦210,000 per stall</p>
          <p className="text-background/70 max-w-2xl mb-10 md:mb-12">
            Secure your spot with just a small fee. Only 150 stalls available.
          </p>
        </ScrollReveal>
        <div className="max-w-md mx-auto">
          <ScrollReveal>
            <div className="bg-card text-foreground border border-border rounded-xl p-5 md:p-6 flex flex-col h-full shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Store size={14} className="text-primary" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest">{stall.name}</p>
              </div>
              <p className="text-foreground font-medium text-sm mb-3">{stall.subtitle}</p>
              <p className="text-2xl md:text-3xl font-display font-bold mb-4">{stall.price}</p>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="text-primary font-semibold">{left} slots left</span>
                  <span>{stall.slots_taken} / {stall.slots_total}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <Button size="sm" className="rounded-full w-full mb-4" onClick={handleReserve}>
                {user ? "Pick & reserve stall" : "Register to reserve"}
              </Button>

              <ul className="space-y-2 mt-auto">
                {stall.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <StallPickerModal open={pickerOpen} onOpenChange={setPickerOpen} />
    </section>
  );
};

export default TicketsSection;
