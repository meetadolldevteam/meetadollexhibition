import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_COMMUNITY = "https://chat.whatsapp.com/FDNrEZKlSfE3gZG7LUDMhV?mode=gi_t";
const REDIRECT_DELAY = 7;

const logo = { url: "/assets/meetadoll-logo.jpg" };

export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref");
  const urlStatus = params.get("status");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);
  const checked = useRef(false);

  useEffect(() => {
    // If Paystack/caller explicitly signals failure, honour it immediately
    if (urlStatus === "failed" || urlStatus === "cancelled" || urlStatus === "error") {
      setStatus("failed");
      return;
    }
    // No reference means we have nothing to confirm
    if (!reference) {
      setStatus("failed");
      return;
    }
    if (checked.current) return;
    checked.current = true;
    // Brief delay to let the webhook process before showing success
    const delay = setTimeout(() => setStatus("success"), 2000);
    return () => clearTimeout(delay);
  }, [reference, urlStatus]);

  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      window.open(WHATSAPP_COMMUNITY, "_blank", "noopener,noreferrer");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link to="/" className="mb-10">
        <img src={logo.url} alt="Meetadoll" className="h-14 w-auto" />
      </Link>

      <div className="w-full max-w-sm text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="font-display text-2xl font-bold mb-2">Confirming payment…</h1>
            <p className="text-muted-foreground text-sm">Please wait while we confirm your payment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">Payment received!</h1>
            <p className="text-muted-foreground text-sm mb-2">
              Your stall reservation is confirmed. A confirmation email is on its way.
            </p>
            {reference && (
              <p className="text-xs text-muted-foreground font-mono bg-secondary rounded px-3 py-2 inline-block mb-6">
                Ref: {reference}
              </p>
            )}

            {/* WhatsApp community redirect */}
            <div className="rounded-2xl border-2 border-[#25D366] bg-[#25D366]/5 p-5 mb-6 text-left">
              <div className="flex items-start gap-3">
                <svg viewBox="0 0 24 24" className="w-8 h-8 shrink-0 fill-[#25D366] mt-0.5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <div>
                  <p className="font-semibold text-sm text-foreground mb-1">Join the Vendor Community</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Stay updated with event news, vendor announcements, and connect with fellow exhibitors before the big day.
                  </p>
                </div>
              </div>
              <a
                href={WHATSAPP_COMMUNITY}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full rounded-full py-2.5 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5d] transition-colors"
              >
                Join WhatsApp Community
                {countdown > 0 && (
                  <span className="text-xs font-normal opacity-80">({countdown}s)</span>
                )}
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild className="rounded-full">
                <Link to="/my-reservations">View my reservations</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">Payment failed</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Something went wrong with your payment. Your stall hold is still active for 15 minutes. You can try again from your reservations.
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild className="rounded-full">
                <Link to="/my-reservations">Try again</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
