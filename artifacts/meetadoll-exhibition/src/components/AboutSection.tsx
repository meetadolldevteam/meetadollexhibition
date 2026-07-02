import ScrollReveal from "./ScrollReveal";

const VENUE = "Umar Musa Yar'adua Hall, Kaduna";
const DATES_DISPLAY = "5 & 6 December · 10am – 10pm";

const AboutSection = () => (
  <section id="about" className="py-24 px-6 bg-[hsl(35,25%,93%)]">
    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-stretch">
      <ScrollReveal>
        <div className="bg-secondary border border-border rounded-3xl shadow-lg p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
          <span className="absolute top-0 left-0 h-1 w-24 bg-primary rounded-br-full" />
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-4">About Meetadoll</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
            Business and empowerment through entertainment
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Meetadoll Exhibition is a premium lifestyle, commerce, and empowerment platform designed to deliver real economic outcomes by connecting curated vendors with buying customers in a structured, high-energy marketplace. It blends business, culture, entertainment, and community engagement to drive sales, visibility, and meaningful interaction — not just crowd size.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Youth-driven and powered by entertainment and digital storytelling, it remains a trusted, professional platform for SMEs, women entrepreneurs, and institutional partners to engage audiences in a credible, results-focused environment.
          </p>
          <a href="#agenda" className="text-primary hover:opacity-80 font-medium underline underline-offset-4 w-fit">
            See agenda →
          </a>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.2}>
        <div className="relative h-full min-h-[300px]">
          <img
            src="/images/about.webp"
            alt="About the exhibition"
            className="rounded-2xl w-full h-full object-cover"
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            {[{ d: "05", m: "DEC" }, { d: "06", m: "DEC" }].map((day) => (
              <div key={day.d} className="bg-card border border-border rounded-lg px-4 py-3 text-center">
                <span className="text-xs text-muted-foreground block">{day.m}</span>
                <span className="text-xl font-display font-bold">{day.d}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
    <ScrollReveal delay={0.3}>
      <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Dates", value: DATES_DISPLAY },
          { label: "Venue", value: VENUE },
          { label: "Vendor stalls", value: "150 slots" },
        ].map((item) => (
          <div key={item.label} className="bg-secondary border border-border rounded-2xl p-6 text-center shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-2">{item.label}</p>
            <p className="font-display font-bold text-lg text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </ScrollReveal>
  </section>
);

export default AboutSection;
