import { useState } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Mail } from "lucide-react";

type View = "landing" | "signin" | "signup" | "forgot";

export default function Login() {
  const [view, setView] = useState<View>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password) { setError("Password is required"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignUp = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
    } else {
      toast.success("Check your email to confirm your account");
      setView("signin");
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      toast.success("Password reset link sent to your email");
      setView("signin");
    }
    setLoading(false);
  };

  const inputClass = "w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold";
  const btnPrimary = "w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40";

  if (view === "landing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-sm">
          <Logo size="lg" />
          <p className="text-center font-body text-base text-foreground max-w-xs leading-relaxed">
            Your household meal planning companion.
          </p>
          <p className="text-center font-body text-sm text-muted-foreground max-w-xs leading-relaxed">
            Cut back on eating out. Eliminate food waste. Cook restaurant-quality meals at home — with what you already have.
          </p>
          <div className="flex flex-col gap-3 w-full mt-4">
            <button onClick={handleGoogle} disabled={loading} className={btnPrimary}>
              Continue with Google
            </button>
            <button
              onClick={() => setView("signin")}
              className="w-full rounded-lg border border-border bg-card px-6 py-3.5 font-body font-medium text-foreground transition-colors hover:bg-secondary flex items-center justify-center gap-2"
            >
              <Mail size={18} />
              Continue with email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-sm">
        <Logo size="md" />

        {view === "forgot" ? (
          <>
            <h2 className="font-display text-xl font-bold text-foreground">Reset your password</h2>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className={inputClass} autoFocus />
            {error && <p className="font-body text-sm text-destructive">{error}</p>}
            <button onClick={handleForgot} disabled={loading} className={btnPrimary}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <button onClick={() => setView("signin")} className="font-body text-sm text-muted-foreground hover:text-foreground">
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold text-foreground">
              {view === "signin" ? "Sign in" : "Create account"}
            </h2>
            <div className="flex flex-col gap-3 w-full">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className={inputClass} autoFocus />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={inputClass} />
              {view === "signup" && (
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className={inputClass} />
              )}
            </div>
            {error && <p className="font-body text-sm text-destructive">{error}</p>}
            <button
              onClick={view === "signin" ? handleSignIn : handleSignUp}
              disabled={loading}
              className={btnPrimary}
            >
              {loading ? "Loading..." : view === "signin" ? "Sign in" : "Sign up"}
            </button>
            {view === "signin" && (
              <button onClick={() => setView("forgot")} className="font-body text-sm text-muted-foreground hover:text-foreground">
                Forgot password?
              </button>
            )}
            <p className="font-body text-sm text-muted-foreground">
              {view === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setView(view === "signin" ? "signup" : "signin"); setError(""); }}
                className="text-gold font-medium hover:underline"
              >
                {view === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
            <button onClick={() => setView("landing")} className="font-body text-sm text-muted-foreground hover:text-foreground">
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
