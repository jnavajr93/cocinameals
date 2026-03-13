import { useState } from "react";
import { Logo } from "@/components/Logo";
import { CocinaText } from "@/components/CocinaText";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Mail, Compass, Leaf, DollarSign, Clock, Users, TrendingDown, Utensils, ShoppingCart, Heart, Camera, Activity } from "lucide-react";

type View = "landing" | "signin" | "signup" | "forgot";

const STATS = [
  { icon: DollarSign, value: "$3,500+", label: "Average family spends yearly on food waste" },
  { icon: TrendingDown, value: "30-40%", label: "Of food in America is wasted" },
  { icon: ShoppingCart, value: "$232/mo", label: "Average spent on eating out per household" },
  { icon: Clock, value: "37 min", label: "Spent daily deciding what to cook" },
];

interface ContentItem {
  icon: typeof ShoppingCart;
  title: string;
  description: string;
  badge?: string;
}

const PAIN_POINTS: ContentItem[] = [
  {
    icon: ShoppingCart,
    title: "Groceries go bad before you use them",
    description: "You buy with good intentions, but by Thursday half the fridge is forgotten. cocina builds meals around what you actually have.",
  },
  {
    icon: Clock,
    title: '"What\'s for dinner?" — every single night',
    description: "Decision fatigue is real. cocina delivers personalized meal ideas based on your pantry, skill level, and family preferences.",
  },
  {
    icon: DollarSign,
    title: "Eating out is draining your budget",
    description: "When cooking feels like a chore, takeout wins. cocina makes home cooking effortless with meals matched to what you own.",
  },
  {
    icon: Users,
    title: "Picky eaters and dietary needs",
    description: "Kids, allergies, spice tolerance — everyone's different. cocina factors in your whole household so every meal works for everyone.",
  },
];

const FEATURES: ContentItem[] = [
  {
    icon: Camera,
    title: "Snap A Receipt, Stock Your Pantry",
    description: "Take a photo of your grocery receipt and your pantry updates instantly with expiration dates included.",
    badge: "Beta",
  },
  {
    icon: Utensils,
    title: "Smart Pantry Tracking",
    description: "Mark what's in stock and only get suggestions for meals you can actually make. No more buying ingredients for one recipe.",
  },
  {
    icon: Compass,
    title: "Discover New Meals",
    description: "Explore restaurant-quality meal ideas personalized to your equipment, cuisine preferences, and cooking skill level — even beyond what's in your pantry.",
  },
  {
    icon: Activity,
    title: "Health-Aware Cooking",
    description: "Set health conditions like diabetes, high blood pressure, or celiac for each household member — recipes silently adapt to keep everyone safe.",
  },
  {
    icon: Leaf,
    title: "Reduce Food Waste To Near Zero",
    description: "Prioritizes ingredients that are about to expire and builds meals around what needs to be used first.",
  },
  {
    icon: Heart,
    title: "Save Favorites & Rate Meals",
    description: "Build your household cookbook over time. Rate meals so the AI learns what your family actually enjoys.",
  },
];

const TESTIMONIALS = [
  {
    quote: "We went from eating out 4 nights a week to maybe once. Our grocery bill dropped by $400/month.",
    name: "Sarah M.",
    detail: "Family of 4, Austin TX",
  },
  {
    quote: "I used to throw away so much produce. Now I just check my pantry in the app and it tells me exactly what to make.",
    name: "James R.",
    detail: "Home cook, Chicago IL",
  },
  {
    quote: "My kids are picky and my husband has celiac. cocina is the first app that actually accounts for all of us.",
    name: "Maria L.",
    detail: "Family of 5, Miami FL",
  },
  {
    quote: "I'm not a great cook but the recipes are clear and use equipment I actually own. Game changer.",
    name: "David K.",
    detail: "Beginner cook, Seattle WA",
  },
];

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

  // Auth forms (signin, signup, forgot)
  if (view !== "landing") {
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
                {view === "signin" ? "Welcome back" : "Create your account"}
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
                {loading ? "Loading..." : view === "signin" ? "Sign in" : "Create account"}
              </button>

              <div className="flex items-center gap-3 w-full">
                <div className="h-px flex-1 bg-border" />
                <span className="font-body text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button onClick={handleGoogle} disabled={loading} className="w-full rounded-lg border border-border bg-card px-6 py-3.5 font-body font-medium text-foreground transition-colors hover:bg-secondary">
                Continue with Google
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

  // Landing page
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-20">
        <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-lg">
          <Logo size="lg" />
          <div className="flex flex-col items-center gap-3 max-w-md">
            <h1 className="text-center font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Cook what you have.<br />Eat like a chef.
            </h1>
            <p className="text-center font-body text-base text-muted-foreground leading-relaxed">
              Turn your pantry into restaurant-quality meals. Waste less, eat better, save more.
            </p>
            <div className="rounded-full bg-gold/15 px-4 py-1.5 font-body text-xs font-semibold text-gold tracking-wide uppercase">
              ✨ Join the early wave
            </div>
            <p className="text-center font-body text-sm text-gold font-medium leading-relaxed">
              Join our founding members and shape the future of home cooking.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm mt-4">
            <button onClick={handleGoogle} disabled={loading} className={btnPrimary}>
              Continue with Google
            </button>
            <button
              onClick={() => setView("signup")}
              className="w-full rounded-lg border border-border bg-card px-6 py-3.5 font-body font-medium text-foreground transition-colors hover:bg-secondary flex items-center justify-center gap-2"
            >
              <Mail size={18} />
              Sign up with email
            </button>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            Already a member?{" "}
            <button onClick={() => setView("signin")} className="text-gold font-medium hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 bg-primary">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground text-center mb-12">
            The numbers don't lie
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center gap-2">
                <stat.icon size={28} className="text-gold" />
                <span className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">{stat.value}</span>
                <span className="font-body text-xs md:text-sm text-primary-foreground/70 leading-snug">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Sound familiar?
          </h2>
          <p className="font-body text-muted-foreground text-center mb-12 max-w-md mx-auto">
            These are the everyday frustrations <CocinaText /> was built to solve.
          </p>
          <div className="flex flex-col gap-8">
            {PAIN_POINTS.map((point) => (
              <div key={point.title} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                  <point.icon size={22} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">{point.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            How <CocinaText /> works
          </h2>
          <p className="font-body text-muted-foreground text-center mb-12 max-w-md mx-auto">
            Set up once, cook smarter forever.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon size={20} className="text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-foreground">{feature.title}</h3>
                  {feature.badge && (
                    <span className="rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 font-body text-[10px] font-semibold text-gold uppercase tracking-wide">{feature.badge}</span>
                  )}
                </div>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Early users are loving it
          </h2>
          <p className="font-body text-muted-foreground text-center mb-12 max-w-md mx-auto">
            Real households, real results — from our founding members.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
                <p className="font-body text-sm text-foreground leading-relaxed italic">
                  "{t.quote}"
                </p>
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="font-body text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 bg-primary">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-gold/20 px-4 py-1.5 font-body text-xs font-semibold text-gold tracking-wide uppercase">
            🚀 Early Access — Limited Spots
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
            Stop wasting food. Start cooking smarter.
          </h2>
          <p className="font-body text-sm text-primary-foreground/70 max-w-sm">
            We're opening up to a small group of early users. Get in now and help us build the smartest kitchen assistant ever made.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={() => setView("signup")}
              className="w-full rounded-lg bg-gold px-6 py-3.5 font-body font-semibold text-gold-foreground transition-colors hover:opacity-90"
            >
              Claim your early access — it's free
            </button>
            <p className="font-body text-xs text-primary-foreground/50">
              Already a member?{" "}
              <button onClick={() => setView("signin")} className="text-gold hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-background">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-2">
          <Logo size="sm" />
          <p className="font-body text-xs text-muted-foreground">
            © {new Date().getFullYear()} cocina. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
