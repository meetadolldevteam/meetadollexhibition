import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/apiClient";
import { Loader2, UploadCloud, X } from "lucide-react";

const logo = { url: "/assets/meetadoll-logo.jpg" };

const BUSINESS_CATEGORIES = [
  "Fashion",
  "Food",
  "Beauty",
  "Accessories",
  "Art & Craft",
  "Others",
];

export default function BusinessProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login?next=/business-profile", { replace: true });
      return;
    }
    if (user.business_profile_complete) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, []);

  const handleLogoChange = useCallback((file: File | null) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (!file) { setLogoFile(null); setLogoPreview(null); return; }
    const accepted = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!accepted.includes(file.type) && !file.type.startsWith("image/")) {
      setError("Logo must be a JPG, PNG, or WebP image."); return;
    }
    if (file.size > 4 * 1024 * 1024) { setError("Logo must be under 4MB."); return; }
    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }, [logoPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!businessCategory) { setError("Please select your business category."); return; }
    if (!logoFile) { setError("Please upload your business logo."); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("business_name", businessName);
      fd.append("business_category", businessCategory);
      fd.append("business_phone", businessPhone);
      fd.append(
        "instagram_username",
        instagramUsername
          .replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "")
          .replace(/^instagram\.com\/?/, "")
          .replace(/\/$/, "")
          .replace(/^@+/, "")
          .trim()
      );
      fd.append("business_logo", logoFile);

      await apiRequest<{ success: boolean }>("/auth/business-profile", {
        method: "POST",
        body: fd,
      });

      await refreshUser();
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-8">
        <img src={logo.url} alt="Meetadoll" className="h-16 w-auto" />
      </Link>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Step 2 of 2</p>
          <h1 className="font-display text-3xl font-bold mb-2">Complete your business profile</h1>
          <p className="text-muted-foreground text-sm">
            Tell us about your business before you pick your stall.
          </p>
        </div>

        {/*
          The file input lives OUTSIDE the <form> so that selecting a file
          can never trigger form submission — even on quirky mobile browsers.
          It is controlled entirely through React state via handleLogoChange.
        */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            handleLogoChange(e.target.files?.[0] ?? null);
          }}
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business_name">Business name <span className="text-destructive">*</span></Label>
            <Input
              id="business_name"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Amira's Closet"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business_category">Business category <span className="text-destructive">*</span></Label>
            <select
              id="business_category"
              required
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="" disabled>Select category…</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business_phone">Business phone <span className="text-destructive">*</span></Label>
            <Input
              id="business_phone"
              type="tel"
              required
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="08012345678"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instagram_username">Instagram username <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
              <Input
                id="instagram_username"
                required
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value.replace(/^@/, ""))}
                placeholder="amirascloset"
                className="pl-7"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Business logo <span className="text-destructive">*</span></Label>
            {logoPreview ? (
              <div
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogoChange(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove logo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
              >
                <UploadCloud className="w-6 h-6" />
                <span className="text-xs font-medium">Click to upload logo</span>
                <span className="text-xs opacity-70">JPG, PNG or WebP · max 4MB</span>
              </button>
            )}
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="rounded-full mt-1" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving profile…</>
            ) : (
              "Save & pick my stall"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Signed in as <span className="font-medium">{user?.email}</span>
        </p>
      </div>
    </div>
  );
}
