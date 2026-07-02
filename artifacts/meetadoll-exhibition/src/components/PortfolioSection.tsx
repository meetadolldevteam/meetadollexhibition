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
