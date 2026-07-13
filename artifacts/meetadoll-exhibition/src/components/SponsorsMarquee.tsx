const logos = [
  "/images/logo-1.svg",
  "/images/logo-2.svg",
  "/images/logo-3.svg",
  "/images/logo-4.svg",
  "/images/logo-5.svg",
  "/images/logo-6.svg",
  "/images/logo-7.svg",
  "/images/logo-8.svg",
];

const SponsorsMarquee = () => (
  <section className="py-12 border-t border-b border-border">
    <p className="text-center text-sm text-muted-foreground mb-8 font-display uppercase tracking-widest">Sponsored by</p>
    <div className="overflow-hidden">
      <div className="marquee-track">
        {[...logos, ...logos].map((src, i) => (
          <img key={i} src={src} alt="Sponsor" className="h-8 mx-10 opacity-70 shrink-0" loading="lazy" width="80" height="32" />
        ))}
      </div>
    </div>
  </section>
);

export default SponsorsMarquee;
