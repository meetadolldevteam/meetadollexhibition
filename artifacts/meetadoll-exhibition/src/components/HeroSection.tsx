import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import StallPickerModal from "./StallPickerModal";

const EVENT_DATE = new Date("2026-12-05T10:00:00+01:00");
const VENUE = "Umar Musa Yar'adua Hall, Kaduna State";
const logo = { url: "/assets/meetadoll-logo.jpg" };

const HeroSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, EVENT_DATE.getTime() - Date.now());
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCTA = () => {
    if (user) {
      setPickerOpen(true);
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      <div className="relative z-10 w-full flex flex-col items-center justify-center gap-10 md:gap-16">
        <ScrollReveal>
          <img
            src={logo.url}
            alt="Meetadoll Exhibition"
            className="w-[85vw] md:w-[60vw] max-w-3xl h-auto mix-blend-multiply"
          />
        </ScrollReveal>

        <ScrollReveal>
          <div className="flex items-center gap-2 text-muted-foreground text-sm px-4 text-center">
            <MapPin size={16} className="text-primary shrink-0" />
            <span>{VENUE}</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex gap-4 md:gap-6">
            {([
              { value: timeLeft.days, label: "Days" },
              { value: timeLeft.hours, label: "Hours" },
              { value: timeLeft.minutes, label: "Min" },
              { value: timeLeft.seconds, label: "Sec" },
            ] as const).map((unit) => (
              <div key={unit.label} className="flex flex-col items-center">
                <span className="text-3xl md:text-5xl font-display font-bold tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest mt-1">{unit.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <Button size="lg" className="rounded-full px-8" onClick={handleCTA}>
            {user ? "Reserve your stall" : "Register now"}
          </Button>
        </ScrollReveal>

        <MarqueeRow text="HOMECOMING" direction="left" />
      </div>

      <StallPickerModal open={pickerOpen} onOpenChange={setPickerOpen} />
    </section>
  );
};

const MarqueeRow = ({ text, direction }: { text: string; direction: "left" | "right" }) => {
  const style = direction === "right" ? { animationDirection: "reverse" as const } : {};
  const items = Array.from({ length: 4 });
  return (
    <div className="overflow-hidden whitespace-nowrap w-full pointer-events-none select-none">
      <div className="marquee-track" style={style}>
        {[0, 1].map((group) => (
          <div className="marquee-group" key={group} aria-hidden={group === 1}>
            {items.map((_, i) => (
              <span
                key={i}
                className="text-[4.5rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] font-hero uppercase mx-5 md:mx-8 shrink-0 text-foreground leading-none"
              >
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroSection;
