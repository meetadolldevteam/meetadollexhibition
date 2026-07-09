import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Store, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import StallPickerModal from "./StallPickerModal";

const navLinks = [
  { label: "About", id: "about" },
  { label: "Artists", id: "speakers" },
  { label: "Agenda", id: "agenda" },
  { label: "Vendors", id: "tickets" },
  { label: "Featured", id: "portfolio" },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  const handleCTA = () => {
    setMobileOpen(false);
    if (user) {
      setPickerOpen(true);
    } else {
      navigate("/register");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-5 rounded-full border border-border bg-card/80 backdrop-blur-md px-5 py-2.5">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => scrollTo(link.id)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </button>
        ))}

        {user ? (
          <div className="flex items-center gap-2 ml-1">
            {user.role === "admin" && (
              <Button asChild size="sm" variant="ghost" className="rounded-full gap-1.5 text-xs">
                <Link to="/admin"><ShieldCheck className="w-3.5 h-3.5" /> Admin</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="rounded-full gap-1.5 text-xs">
              <Link to="/my-reservations"><Store className="w-3.5 h-3.5" /> My stalls</Link>
            </Button>
            <Button size="sm" className="rounded-full" onClick={handleCTA}>Reserve stall</Button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button size="sm" className="rounded-full ml-1" onClick={handleCTA}>Register now</Button>
        )}
      </nav>

      <div className="fixed top-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-full border border-border bg-card/80 backdrop-blur-md text-foreground"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 md:hidden">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className="text-2xl font-display font-semibold text-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </button>
          ))}
          {user && (
            <>
              <Link
                to="/my-reservations"
                onClick={() => setMobileOpen(false)}
                className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                My Stalls
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Admin
                </Link>
              )}
            </>
          )}
          <Button size="lg" className="rounded-full mt-2" onClick={handleCTA}>
            {user ? "Reserve stall" : "Register now"}
          </Button>
          {user && (
            <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          )}
        </div>
      )}

      <StallPickerModal open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
  );
};

export default Navbar;
