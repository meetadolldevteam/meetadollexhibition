import { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ApiError } from "@/lib/apiClient";
import { Eye, EyeOff } from "lucide-react";

const logo = { url: "/assets/meetadoll-logo.jpg" };

type Step = "form" | "otp";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RegisterPage() {
  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("form");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vendorCategory, setVendorCategory] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const resendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // OTP expiry countdown (600s = 10 min)
  const [otpCountdown, setOtpCountdown] = useState(600);
  const otpTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function startOtpCountdown() {
    setOtpCountdown(600);
    if (otpTimer.current) clearInterval(otpTimer.current);
    otpTimer.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(otpTimer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => {
    if (otpTimer.current) clearInterval(otpTimer.current);
    if (resendTimer.current) clearTimeout(resendTimer.current);
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const tick = () => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        resendTimer.current = setTimeout(tick, 1000);
        return prev - 1;
      });
    };
    resendTimer.current = setTimeout(tick, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (!agreed) { setError("You must agree to the Terms and Conditions and Privacy Policy to continue."); return; }
    if (!vendorCategory) { setError("Please select your vendor type."); return; }
    setLoading(true);
    try {
      const result = await register({ name, email, password, phone: phone || undefined, vendor_category: vendorCategory });
      setUserId(result.userId);
      setStep("otp");
      startResendCooldown();
      startOtpCountdown();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setError("");
    setLoading(true);
    try {
      await verifyOtp(userId, otp, "registration");
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await resendOtp(userId, "registration");
      setOtp("");
      setInfo("A new code has been sent to your email.");
      startResendCooldown();
      startOtpCountdown();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-10">
        <img src={logo.url} alt="Meetadoll" className="h-16 w-auto" />
      </Link>

      <div className="w-full max-w-sm">
        {step === "form" ? (
          <>
            <h1 className="font-display text-3xl font-bold mb-1 text-center">Create account</h1>
            <p className="text-muted-foreground text-sm text-center mb-8">
              Register as a vendor to reserve your stall
            </p>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Amira Bello"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vendor_category">What type of vendor are you? <span className="text-destructive">*</span></Label>
                <select
                  id="vendor_category"
                  required
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="" disabled>Select vendor type…</option>
                  <option value="fashion">Fashion Vendor</option>
                  <option value="food">Food Vendor</option>
                  <option value="others">Others</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pr-10"
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
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <span className="text-sm text-muted-foreground leading-snug">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                    Terms &amp; Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button type="submit" className="rounded-full mt-1" disabled={loading || !agreed}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mb-1 text-center">Verify your email</h1>
            <p className="text-muted-foreground text-sm text-center mb-2">
              We sent a 6-digit code to
            </p>
            <p className="text-sm font-semibold text-center mb-8">{email}</p>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-3">
                <Label className="self-start">Verification code</Label>
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
                disabled={loading || otp.length !== 6 || otpCountdown === 0}
              >
                {loading ? "Verifying…" : "Verify email"}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-primary hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </p>
              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); setOtp(""); if (otpTimer.current) clearInterval(otpTimer.current); }}
                className="mt-2 text-xs text-muted-foreground hover:underline"
              >
                ← Back to registration form
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
