import { Sparkles } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const AgendaSection = () => (
  <section id="agenda" className="py-20 md:py-24 px-5 md:px-6">
    <div className="max-w-4xl mx-auto">
      <ScrollReveal>
        <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-3">2 days · non stop</p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-3">Agenda</h2>
        <p className="text-muted-foreground max-w-xl mb-10 md:mb-12">
          Fashion runways, live music, cultural showcases and a full marketplace: a two day celebration of business, empowerment and entertainment.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="rounded-3xl border border-border bg-secondary/60 p-8 md:p-12 text-center shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles size={14} /> Coming soon
          </span>
          <h3 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-3">
            The full schedule is to be announced
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're finalising the two day line up of runways, performances and marketplace moments. Check back soon, or register your interest to get the drop first.
          </p>
        </div>
      </ScrollReveal>
    </div>
  </section>
);

export default AgendaSection;
