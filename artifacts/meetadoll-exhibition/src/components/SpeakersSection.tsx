import ScrollReveal from "./ScrollReveal";

const speakers = [
  { name: "Dan Musa", title: "Artist", image: "/assets/artists/dan_musa.jpg" },
  { name: "Boyskiddo", title: "Artist", image: "/assets/artists/boyskiddo.jpg" },
  { name: "Badman Binladin", title: "Artist", image: "/assets/artists/badman_binladin.jpg" },
  { name: "Khairat Abdullahi", title: "Artist", image: "/assets/artists/khairat_abdullahi.jpg" },
  { name: "Msquare Nnah", title: "Artist", image: "/assets/artists/msquare_nnah.jpg" },
  { name: "Ado Gwanja", title: "Artist", image: "/assets/artists/ado_gwanja.jpg" },
];

const SpeakersSection = () => (
  <section id="speakers" className="py-20 md:py-24 px-5 md:px-6 bg-secondary/40">
    <div className="max-w-6xl mx-auto">
      <ScrollReveal>
        <div className="mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold">Artists</h2>
        </div>
      </ScrollReveal>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {speakers.map((s, i) => (
          <ScrollReveal key={s.name} delay={i * 0.06}>
            <article className="flex flex-col">
              <div className="w-full overflow-hidden rounded-lg bg-neutral-100">
                <img
                  src={s.image}
                  alt={s.name}
                  loading="lazy"
                  className="w-full h-auto block"
                />
              </div>
              <div className="pt-3">
                <h3 className="font-display font-bold text-base sm:text-lg text-foreground leading-tight capitalize">{s.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">{s.title}</p>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default SpeakersSection;
