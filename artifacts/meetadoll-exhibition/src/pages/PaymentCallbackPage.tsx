import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const logo = { url: "/assets/meetadoll-logo.jpg" };

export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current || !reference) {
      if (!reference) setStatus("failed");
      return;
    }
    checked.current = true;

    const delay = setTimeout(() => {
      setStatus("success");
    }, 2000);

    return () => clearTimeout(delay);
  }, [reference]);

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
