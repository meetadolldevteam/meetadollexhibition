import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import RegisterModal from "./RegisterModal";

const navLinks = [
  { label: "About", id: "about" },
  { label: "Artists", id: "speakers" },
  { label: "Agenda", id: "agenda" },
  { label: "Vendors", id: "tickets" },
  { label: "Featured", id: "portfolio" },
];

const Navbar = () => {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop nav */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-6 rounded-full border border-border bg-card/80 backdrop-blur-md px-6 py-3">
        {navLinks.map((link) => (
          <button key={link.id} onClick={() => scrollTo(link.id)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {link.label}
          </button>
        ))}
        <Button size="sm" className="rounded-full" onClick={() => setRegisterOpen(true)}>Register now</Button>
      </nav>

      {/* Mobile hamburger */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-full border border-border bg-card/80 backdrop-blur-md text-foreground"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 md:hidden">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className="text-2xl font-display font-semibold text-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </button>
          ))}
          <Button size="lg" className="rounded-full mt-4" onClick={() => { setMobileOpen(false); setRegisterOpen(true); }}>
            Register now
          </Button>
        </div>
      )}

      <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} />
    </>
  );
};

export default Navbar;
