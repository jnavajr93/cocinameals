import { useState, useEffect } from "react";
import { UtensilsCrossed, ShoppingCart, BookOpen, Settings, ChevronRight, Sparkles, ChefHat } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CocinaText } from "@/components/CocinaText";

const TOUR_SEEN_KEY = "cocina_app_tour_seen";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tabHighlight: string | null;
  arrowDirection: "down" | "none";
  useLogo?: boolean;
}

const STEPS: TourStep[] = [
  {
    title: "",
    description: "Cook what you have. Eat like a chef.\nLet's take a quick tour.",
    icon: null,
    tabHighlight: null,
    arrowDirection: "none",
    useLogo: true,
  },
  {
    title: "Ingredients",
    description: "Track what you have at home. Scan a receipt to add items instantly — we'll even track expiration dates for you.",
    icon: <ShoppingCart size={28} className="text-gold" />,
    tabHighlight: "pantry",
    arrowDirection: "down",
  },
  {
    title: "Meals",
    description: "Get AI-powered meal suggestions based on what's in your kitchen. Toggle Discover mode to explore beyond your pantry.",
    icon: <UtensilsCrossed size={28} className="text-gold" />,
    tabHighlight: "meals",
    arrowDirection: "down",
  },
  {
    title: "Saved",
    description: "Star any recipe to save it here. Build your household cookbook over time — every great meal, one tap away.",
    icon: <BookOpen size={28} className="text-gold" />,
    tabHighlight: "saved",
    arrowDirection: "down",
  },
  {
    title: "Settings",
    description: "Set your skill level, diet, allergies, equipment & cuisines. cocina adapts every recipe to you.",
    icon: <Settings size={28} className="text-gold" />,
    tabHighlight: "settings",
    arrowDirection: "down",
  },
  {
    title: "You're all set!",
    description: "Start by checking your ingredients, then head to Meals and let cocina do the rest. Happy cooking! 🍳",
    icon: <Sparkles size={32} className="text-gold" />,
    tabHighlight: null,
    arrowDirection: "none",
  },
];

// Tab positions (index based, 4 tabs evenly spaced)
const TAB_INDEX: Record<string, number> = { pantry: 0, meals: 1, saved: 2, settings: 3 };

export function AppTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setExiting(true);
      localStorage.setItem(TOUR_SEEN_KEY, "true");
      setTimeout(onComplete, 300);
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    setExiting(true);
    localStorage.setItem(TOUR_SEEN_KEY, "true");
    setTimeout(onComplete, 300);
  };

  // Calculate the highlight position for the tab bar
  const tabHighlightStyle = current.tabHighlight
    ? {
        left: `${(TAB_INDEX[current.tabHighlight] / 4) * 100 + 12.5}%`,
        width: "25%",
      }
    : null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" />

      {/* Content card */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8">
        <div
          key={step}
          className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-xl animate-scale-in flex flex-col items-center text-center gap-5"
        >
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-gold" : i < step ? "w-1.5 bg-gold/40" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10">
            {current.icon}
          </div>

          {/* Text */}
          <div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">{current.title}</h2>
            <p className="font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {current.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full mt-1">
            <button
              onClick={next}
              className="w-full rounded-lg bg-primary px-6 py-3 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 flex items-center justify-center gap-2"
            >
              {isLast ? "Let's cook!" : "Next"}
              {!isLast && <ChevronRight size={16} />}
            </button>
            {!isLast && (
              <button
                onClick={skip}
                className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Skip tour
              </button>
            )}
          </div>
        </div>

        {/* Arrow pointing down to the tab */}
        {current.arrowDirection === "down" && tabHighlightStyle && (
          <div
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] animate-bounce"
            style={{ left: tabHighlightStyle.left, width: tabHighlightStyle.width, display: "flex", justifyContent: "center" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gold">
              <path d="M12 4L12 20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Tab bar highlight overlay */}
      {current.tabHighlight && (
        <div className="relative h-0">
          <div
            className="absolute bottom-0 h-[calc(3.5rem+env(safe-area-inset-bottom))] transition-all duration-500 rounded-t-xl"
            style={{
              left: `${(TAB_INDEX[current.tabHighlight] / 4) * 100}%`,
              width: "25%",
              background: "hsla(34, 65%, 47%, 0.15)",
              border: "2px solid hsla(34, 65%, 47%, 0.4)",
              borderBottom: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function useAppTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    if (!seen) {
      // Small delay so the app renders first
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  return { showTour, closeTour: () => setShowTour(false) };
}
