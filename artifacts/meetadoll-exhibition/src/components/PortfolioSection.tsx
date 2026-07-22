import { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

// Local public assets — fast Netlify delivery
const EXCLUDED = new Set([2, 3, 17, 25]);
const images = Array.from({ length: 25 }, (_, i) => i + 1)
  .filter((n) => !EXCLUDED.has(n))
  .map((n) => `/assets/featured/featured-${n}.jpg`);

const PortfolioSection = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    dragFree: false,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const close = useCallback(() => {
    setZoomIndex(null);
    setZoomed(false);
  }, []);

  useEffect(() => {
    if (zoomIndex === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIndex, close]);

  if (!images.length) return null;

  return (
    <section id="portfolio" className="py-20 md:py-24 bg-secondary overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <ScrollReveal>
          <div className="mb-10 md:mb-14 text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-3 font-sans-grotesk">
              A look back
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-script text-foreground mb-4 leading-tight">
              Featured events
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans-grotesk">
              Highlights from our previous Meetadoll exhibitions.
            </p>
          </div>
        </ScrollReveal>
      </div>

      {/* Carousel — peek on both sides */}
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y -ml-3 md:-ml-5">
            {images.map((src, i) => {
              const isActive = i === selectedIndex;
              return (
                <div
                  key={i}
                  className="pl-3 md:pl-5 shrink-0 grow-0 basis-[78%] sm:basis-[60%] md:basis-[48%] lg:basis-[40%]"
                >
                  <motion.button
                    type="button"
                    onClick={() => {
                      setZoomIndex(i);
                      setZoomed(false);
                    }}
                    animate={{
                      scale: isActive ? 1 : 0.88,
                      opacity: isActive ? 1 : 0.55,
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 28 }}
                    className="block w-full aspect-[4/3] overflow-hidden bg-muted shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={src}
                      alt={`Meetadoll featured event ${i + 1}`}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? "w-6 bg-primary" : "w-1.5 bg-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Past editions summary */}
      <div className="max-w-6xl mx-auto px-5 md:px-6 mt-16 md:mt-20">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-3 font-sans-grotesk text-center">
            Our journey
          </p>
          <h3 className="text-2xl sm:text-3xl font-script text-foreground mb-10 text-center">
            Past editions
          </h3>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            {
              title: "First Edition Kaduna, 2023",
              body: "Meetadoll began its journey in Kaduna with its inaugural exhibition, bringing together 75 vendors and approximately 3,000 attendees. The event achieved an 80% vendor sell out rate and generated approximately 1.2 million social media impressions, establishing a strong foundation for future editions.",
              stats: "75 vendors · 3,000+ attendees · 80% sell out rate · 1.2M social media impressions",
            },
            {
              title: "Second Edition Kaduna, 2024",
              body: "Building on the success of its first edition, the second edition expanded its reach and participation. The event hosted 100 vendors and attracted approximately 5,000 attendees. With an 80% vendor sell out rate and approximately 3 million social media impressions, the exhibition continued its upward trajectory.",
              stats: "100 vendors · 5,000+ attendees · 80% sell out rate · 3M social media impressions",
            },
            {
              title: "Third Edition Kaduna, 2025",
              body: "The third edition marked a major milestone in Meetadoll's growth. Vendor participation more than doubled to 230 vendors, while attendance reached approximately 10,000 people. The event maintained its 80% vendor sell out rate and generated approximately 5 million social media impressions, cementing Meetadoll's position as a high-impact exhibition platform.",
              stats: "230 vendors · 10,000+ attendees · 80% sell out rate · 5M social media impressions",
            },
            {
              title: "Fourth Edition Abuja, 2026",
              body: "The fourth edition marked Meetadoll's expansion beyond Kaduna and into Nigeria's capital city, Abuja. The event brought together 200 vendors and attracted approximately 7,000 attendees. Maintaining its 80% vendor sell out rate and generating approximately 5 million social media impressions, the Abuja edition demonstrated the strength and scalability of the Meetadoll Exhibition brand.",
              stats: "200 vendors · 7,000+ attendees · 80% sell out rate · 5M social media impressions",
            },
          ].map((ed, i) => (
            <ScrollReveal key={ed.title} delay={i * 0.1}>
              <div className="bg-background border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4 h-full shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                <div>
                  <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary font-semibold font-sans-grotesk mb-2">
                    {ed.title.split(" ")[0]} edition
                  </span>
                  <h4 className="font-display font-bold text-lg text-foreground leading-snug">
                    {ed.title}
                  </h4>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {ed.body}
                </p>
                <p className="text-xs font-medium text-foreground/70 border-t border-border pt-4 font-sans-grotesk">
                  {ed.stats}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={close}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              aria-label="Close"
              className="absolute top-4 right-4 md:top-6 md:right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={22} />
            </button>
            <div
              className="w-full h-full overflow-auto flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                key={zoomIndex}
                src={images[zoomIndex]}
                alt={`Meetadoll featured event ${zoomIndex + 1} (expanded)`}
                onClick={() => setZoomed((z) => !z)}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                style={{
                  cursor: zoomed ? "zoom-out" : "zoom-in",
                  transform: zoomed ? "scale(1.8)" : "scale(1)",
                  transition: "transform 0.35s ease",
                  touchAction: "manipulation",
                }}
                className="max-w-full max-h-[90vh] object-contain rounded-lg select-none"
                draggable={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default PortfolioSection;
