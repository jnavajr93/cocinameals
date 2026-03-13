import { useState, useEffect } from "react";
import { ShoppingCart, UtensilsCrossed, BookOpen, Settings, ChevronRight, Camera, Sparkles, ThumbsUp, Star, Send, Lightbulb, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/Logo";

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
    description: "Track what you have at home. Toggle items in and out of stock with a tap.",
    icon: <ShoppingCart size={28} className="text-gold" />,
    tabHighlight: "pantry",
    arrowDirection: "down",
  },
  {
    title: "📸 Scan Receipts (Beta)",
    description: "Snap a photo of your grocery receipt and we'll auto-add items with expiration dates. Still in beta — getting smarter every day!",
    icon: <Camera size={28} className="text-gold" />,
    tabHighlight: "pantry",
    arrowDirection: "down",
    arrowTarget: "scan-receipt",
  },
  {
    title: "Meals",
    description: "Get AI-powered meal suggestions based on your ingredients. Use the \"I'm craving...\" box to get instant recipe ideas for anything.",
    icon: <UtensilsCrossed size={28} className="text-gold" />,
    tabHighlight: "meals",
    arrowDirection: "down",
  },
  {
    title: "✨ Discover Mode",
    description: "Toggle to Discover to explore meals beyond your pantry. Missing ingredients are listed on each card — tap the 🛒 icon to add them to your shopping list.",
    icon: <Sparkles size={28} className="text-gold" />,
    tabHighlight: "meals",
    arrowDirection: "none",
  },
  {
    title: "Rate & Save",
    description: "👍 Like meals to see more like them. 👎 Dislike to hide them. ⭐ Star to save to your cookbook. cocina learns your taste over time.",
    icon: <ThumbsUp size={28} className="text-gold" />,
    tabHighlight: "meals",
    arrowDirection: "none",
  },
  {
    title: "🔥 Next Level Tips",
    description: "Every recipe includes a \"Next Level Tip\" — a chef secret to elevate your dish from good to unforgettable.",
    icon: <Lightbulb size={28} className="text-gold" />,
    tabHighlight: null,
    arrowDirection: "none",
  },
  {
    title: "Saved",
    description: "Your starred recipes and shopping cart meals live here. Build your household cookbook over time — every great meal, one tap away.",
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
    icon: null,
    tabHighlight: null,
    arrowDirection: "none",
    useLogo: true,
  },
];

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
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" />

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

          {/* Icon or Logo */}
          {current.useLogo ? (
            <div className="flex flex-col items-center gap-2">
              <Logo size="lg" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10">
              {current.icon}
            </div>
          )}

          {/* Text */}
          <div>
            {current.title && <h2 className="font-display text-xl font-bold text-foreground mb-2">{current.title}</h2>}
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
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  return { showTour, closeTour: () => setShowTour(false) };
}
