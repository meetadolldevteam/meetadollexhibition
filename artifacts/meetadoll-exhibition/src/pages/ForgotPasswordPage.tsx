import { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const logo = { url: "/assets/meetadoll-logo.jpg" };

type Step = "email" | "otp" | "newPassword" | "done";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // OTP expiry countdown (600s = 10 min)
  const [otpCountdown, setOtpCountdown] = useState(600);
  const otpTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resend cooldown
  const resendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => () => {
    if (otpTimer.current) clearInterval(otpTimer.current);
    if (resendTimer.current) clearTimeout(resendTimer.current);
  }, []);

  function startOtpCountdown() {
    setOtpCountdown(600);
    if (otpTimer.current) clearInterval(otpTimer.current);
    otpTimer.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) { clearInterval(otpTimer.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const tick = () => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        resendTimer.current = setTimeout(tick, 1000);
        return prev - 1;
      });
    };
    resendTimer.current = setTimeout(tick, 1000);
  }

  // ── Step 1: submit email ───────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ userId: string | null; message: string }>("/auth/forgot-password", { email });
      if (!res.userId) {
        // No account found — show message but don't advance (security UX)
        setError("No account found with that email address.");
        return;
      }
      setUserId(res.userId);
      setStep("otp");
      startOtpCountdown();
      startResendCooldown();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setError("");
    setStep("newPassword");
  };

  // ── Resend ─────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      await api.post("/auth/forgot-password", { email });
      startOtpCountdown();
      startResendCooldown();
      setOtp("");
      setInfo("A new code has been sent to your email.");
    } catch {
      setError("Failed to resend. Please try again.");
    }
  };

  // ── Step 3: set new password ───────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { userId, otp, newPassword });
      setStep("done");
    } catch (err: any) {
      if (err?.code === "OTP_LOCKED" || err?.code === "OTP_INVALID") {
        // OTP issue — push back to OTP step
        setStep("otp");
      }
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link to="/" className="mb-10">
        <img src={logo.url} alt="Meetadoll" className="h-16 w-auto" />
      </Link>

      <div className="w-full max-w-sm">

        {/* ── Step 1: Email ─────────────────────────────────────────────── */}
        {step === "email" && (
          <>
            <h1 className="font-display text-3xl font-bold mb-1 text-center">Forgot password?</h1>
            <p className="text-muted-foreground text-sm text-center mb-8">
              Enter your email and we'll send you a reset code.
            </p>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button type="submit" className="rounded-full mt-1" disabled={loading}>
                {loading ? "Sending…" : "Send reset code"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remembered it?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
        )}

        {/* ── Step 2: OTP ───────────────────────────────────────────────── */}
        {step === "otp" && (
          <>
            <h1 className="font-display text-3xl font-bold mb-1 text-center">Check your email</h1>
            <p className="text-muted-foreground text-sm text-center mb-2">
              We sent a 6-digit reset code to
            </p>
            <p className="text-sm font-semibold text-center mb-8">{email}</p>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-3">
                <Label className="self-start">Reset code</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-mono font-semibold tabular-nums ${otpCountdown <= 60 ? "text-destructive" : "text-muted-foreground"}`}>
                    {formatCountdown(otpCountdown)}
                  </span>
                  <span className="text-xs text-muted-foreground">remaining</span>
                </div>
                {otpCountdown === 0 && (
                  <p className="text-xs text-destructive">Code expired. Request a new one below.</p>
                )}
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              {info && <p className="text-sm text-green-600 text-center">{info}</p>}

              <Button
                type="submit"
                className="rounded-full"
                disabled={otp.length !== 6 || otpCountdown === 0}
              >
                Continue
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resendCooldown > 0}
                  className="text-primary hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </p>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); setOtp(""); if (otpTimer.current) clearInterval(otpTimer.current); }}
                className="mt-2 text-xs text-muted-foreground hover:underline"
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: New password ──────────────────────────────────────── */}
        {step === "newPassword" && (
          <>
            <h1 className="font-display text-3xl font-bold mb-1 text-center">New password</h1>
            <p className="text-muted-foreground text-sm text-center mb-8">
              Choose a strong password for your account.
            </p>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 characters, must include a number.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button type="submit" className="rounded-full mt-1" disabled={loading}>
                {loading ? "Saving…" : "Set new password"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { setStep("otp"); setError(""); }}
              className="mt-5 block w-full text-center text-xs text-muted-foreground hover:underline"
            >
              ← Back to code entry
            </button>
          </>
        )}

        {/* ── Step 4: Done ──────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">Password updated!</h1>
              <p className="text-muted-foreground text-sm">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
            </div>
            <Button
              className="rounded-full w-full"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
