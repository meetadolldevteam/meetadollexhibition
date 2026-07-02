import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Frontend-only demo: mark a few stalls as already taken
const TAKEN = new Set<number>([3, 7, 12, 18, 24, 31, 45, 52, 60, 68, 77, 84, 91, 99, 105, 112, 120, 128, 133, 140]);
const TOTAL = 150;

const WHATSAPP = (n: number) =>
  `https://wa.me/2349063604449?text=${encodeURIComponent(
    `Hi Meetadoll, I'd like to reserve vendor stall #${n} (₦210,000).`,
  )}`;

const StallPickerModal = ({ open, onOpenChange }: Props) => {
  const [selected, setSelected] = useState<number | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    window.open(WHATSAPP(selected), "_blank", "noopener,noreferrer");
    onOpenChange(false);
    setSelected(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSelected(null);
      }}
    >
      <DialogContent className="bg-background border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Pick your stall</DialogTitle>
          <DialogDescription>
            ₦210,000 per stall · Tap an available number to reserve it via WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 text-xs text-muted-foreground py-2">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary inline-block" /> Selected</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-border inline-block" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted inline-block" /> Taken</span>
        </div>

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => {
              const taken = TAKEN.has(n);
              const isSelected = selected === n;
              return (
                <button
                  key={n}
                  disabled={taken}
                  onClick={() => setSelected(n)}
                  className={[
                    "aspect-square rounded-md text-xs font-semibold border transition-all flex items-center justify-center",
                    taken
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
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm">
            {selected ? (
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <Check className="w-4 h-4" /> Stall #{selected} selected
              </span>
            ) : (
              <span className="text-muted-foreground">No stall selected</span>
            )}
          </p>
          <Button onClick={handleConfirm} disabled={!selected} className="rounded-full">
            Reserve on WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StallPickerModal;
