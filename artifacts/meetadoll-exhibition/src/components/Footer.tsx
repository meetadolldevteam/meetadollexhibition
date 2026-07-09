import { MapPin, Phone, Instagram, ArrowUpRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";

const INSTAGRAM_URL = "https://www.instagram.com/meetadoll_exhibition?igsh=MWhvZjM2NG1rejRpZA==";
const TIKTOK_URL = "https://www.tiktok.com/%40meetadoll_exhibition?fbclid=PAb21jcASuwatleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAad5vmYPvjG_-bk-QKFeybb0x1HjjHaluHqzXXbHuddCsCHHW07CohMqBnA61g_aem_TKHfBcoNiHDPV-ZW6FZS4Q";

const Footer = () => (
  <ScrollReveal>
    <footer className="bg-foreground text-background pt-16 pb-10 px-6">
      <div className="max-w-6xl mx-auto">
        {/* CTA row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-12 border-b border-background/15">
          <div>
            <p className="font-sans-grotesk font-bold text-2xl md:text-4xl leading-tight">
              Ready to <span className="text-primary font-script font-normal italic">exhibit</span> with Meetadoll?
            </p>
            <p className="text-background/60 text-sm mt-2">Stalls are limited to 150 at ₦210,000 each. Reserve yours today.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#tickets"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold bg-background text-foreground hover:bg-background/90 transition-colors"
            >
              Reserve a stall <ArrowUpRight size={16} />
            </a>
            <a
              href="https://wa.me/2349063604449"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold bg-[#25D366] text-white hover:opacity-90 transition-opacity"
            >
              WhatsApp <MessageCircle size={14} />
            </a>
            <a
              href="tel:+2349063604449"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Call customer care <Phone size={14} />
            </a>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid gap-10 md:grid-cols-4 py-12">
          <div className="md:col-span-2">
            <p className="font-sans-grotesk font-bold text-lg mb-3">MEETADOLL EXHIBITION</p>
            <p className="text-sm text-background/60 max-w-sm leading-relaxed">
              A movement of kindness, impact, and social responsibility — empowering people through commerce and entertainment.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] mb-4 text-primary font-sans-grotesk">Explore</p>
            <ul className="space-y-2 text-sm font-sans-grotesk">
              {[
                { href: "#about", label: "About" },
                { href: "#agenda", label: "Agenda" },
                { href: "#speakers", label: "Artists" },
                { href: "#tickets", label: "Vendor stalls" },
                { href: "#portfolio", label: "Featured events" },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-background/70 hover:text-background transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] mb-4 text-primary font-sans-grotesk">Contact</p>
            <ul className="space-y-3 text-sm font-sans-grotesk">
              <li>
                <a
                  href="https://maps.google.com/?q=Umar+Musa+Yar%27adua+Hall+Kaduna"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 text-background/70 hover:text-background transition-colors"
                >
                  <MapPin size={14} className="mt-1 shrink-0 text-primary" />
                  <span>Umar Musa Yar'adua Hall, Kaduna State</span>
                </a>
              </li>
              <li>
                <a href="tel:+2349063604449" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                  <Phone size={14} className="text-primary" />
                  <span>+234 906 360 4449</span>
                </a>
              </li>
              <li className="flex gap-2 pt-1">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="p-2 rounded-full border border-background/20 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-full border border-background/20 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all font-bold text-xs flex items-center justify-center"
                >
                  TT
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-3 text-xs text-background/50 font-sans-grotesk">
          <p>© {new Date().getFullYear()} Meetadoll Exhibition. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-background/80 transition-colors">Terms &amp; Conditions</Link>
            <Link to="/privacy" className="hover:text-background/80 transition-colors">Privacy Policy</Link>
            <span>@meetadoll_exhibition</span>
          </div>
        </div>
      </div>
    </footer>
  </ScrollReveal>
);

export default Footer;
