import { useState, useEffect } from "react";
import { ShoppingCart, UtensilsCrossed, BookOpen, Settings, ChevronRight, Camera, Sparkles, ThumbsUp, Lightbulb } from "lucide-react";
import { Logo } from "@/components/Logo";

const TOUR_SEEN_KEY = "cocina_app_tour_seen";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  arrowTarget?: string;
  useLogo?: boolean;
}

const STEPS: TourStep[] = [
  {
    title: "",
    description: "Cook what you have. Eat like a chef.\nLet's take a quick tour.",
    icon: null,
    useLogo: true,
  },
  {
    title: "Ingredients",
    description: "Track what you have at home. Toggle items in and out of stock with a tap.",
    icon: <ShoppingCart size={28} className="text-gold" />,
    arrowTarget: "tab-pantry",
  },
  {
    title: "📸 Scan Receipts (Beta)",
    description: "Snap a photo of your grocery receipt and we'll auto-add items with expiration dates. Still in beta — getting smarter every day!",
    icon: <Camera size={28} className="text-gold" />,
    arrowTarget: "scan-receipt",
  },
  {
    title: "Meals",
    description: "Get AI-powered meal suggestions based on your ingredients. Use the \"I'm craving...\" box to get instant recipe ideas for anything.",
    icon: <UtensilsCrossed size={28} className="text-gold" />,
    arrowTarget: "tab-meals",
  },
  {
    title: "✨ Discover Mode",
    description: "Toggle to Discover to explore meals beyond your pantry. Missing ingredients are listed on each card — tap the 🛒 icon to add them to your shopping list.",
    icon: <Sparkles size={28} className="text-gold" />,
  },
  {
    title: "Rate & Save",
    description: "👍 Like meals to see more like them. 👎 Dislike to hide them. ⭐ Star to save to your cookbook. Cocina learns your taste over time.",
    icon: <ThumbsUp size={28} className="text-gold" />,
  },
  {
    title: "🔥 Next Level Tips",
    description: "Every recipe includes a \"Next Level Tip\" — a chef secret to elevate your dish from good to unforgettable.",
    icon: <Lightbulb size={28} className="text-gold" />,
  },
  {
    title: "Saved & Shopping Cart",
    description: "⭐ Starred recipes go to your cookbook. 🛒 Tap the cart icon on any meal card to add missing ingredients to your shopping list. Then switch to the Shopping List tab in Ingredients — check items off as you buy them and they'll automatically mark as in-stock.",
    icon: <BookOpen size={28} className="text-gold" />,
    arrowTarget: "tab-saved",
  },
  {
    title: "Settings",
    description: "Set your skill level, diet, allergies, equipment & cuisines. Cocina adapts every recipe to you.",
    icon: <Settings size={28} className="text-gold" />,
    arrowTarget: "tab-settings",
  },
  {
    title: "You're all set!",
    description: "Start by checking your ingredients, then head to Meals and let Cocina do the rest. Happy cooking! 🍳",
    icon: null,
    useLogo: true,
  },
];

function ArrowToElement({ targetId }: { targetId: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Small delay to let layout settle
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-tour-id="${targetId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.top - 12 });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [targetId]);

  if (!pos) return null;

  return (
    <div
      className="fixed animate-bounce z-[101]"
      style={{ left: pos.x - 12, top: pos.y - 20 }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gold">
        <path d="M12 4L12 20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

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
      </div>

      {/* Arrow pointing at target element */}
      {current.arrowTarget && <ArrowToElement targetId={current.arrowTarget} />}
    </div>
  );
}

export function useAppTour(forceShow?: boolean) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setShowTour(true);
      return;
    }
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  return { showTour, closeTour: () => setShowTour(false) };
}
