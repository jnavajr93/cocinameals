import { useState, useMemo } from "react";
import { RefreshCw, Star, Send } from "lucide-react";
import { getProfile, getSavedRecipes, saveSavedRecipes, generateId } from "@/lib/store";
import { MEAL_POOLS, MealCard } from "@/data/mealPools";
import { toast } from "sonner";

export function MealsTab() {
  const profile = getProfile();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [craving, setCraving] = useState("");
  const [shuffleKey, setShuffleKey] = useState(0);

  const activeSections = useMemo(() => {
    if (!profile) return [];
    return profile.mealSections
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);
  }, [profile]);

  const getCardsForSection = (sectionId: string): MealCard[] => {
    const pool = MEAL_POOLS[sectionId] || [];
    let cards = [...pool];

    // Apply quick filter
    if (activeFilter) {
      const filterTag = activeFilter.toLowerCase().replace(/[^a-z0-9]/g, "_");
      cards = cards.filter(
        (c) =>
          c.tags.includes(filterTag) ||
          c.tags.some((t) => t.includes(filterTag.replace(/_/g, ""))) ||
          c.name.toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    // Shuffle with key as seed
    const seed = shuffleKey + sectionId.length;
    cards.sort(() => Math.sin(seed + cards.indexOf(cards[0])) - 0.5);

    const limit = ["afternoon_snack", "baby_breakfast", "baby_dinner"].includes(sectionId) ? 2 : 3;
    return cards.slice(0, limit);
  };

  const saveRecipe = (card: MealCard) => {
    const saved = getSavedRecipes();
    if (saved.find((r) => r.mealName === card.name)) {
      toast("Already saved");
      return;
    }
    saveSavedRecipes([
      ...saved,
      {
        id: generateId(),
        mealName: card.name,
        recipeText: `Recipe for ${card.name} - ${card.cal} cal, P:${card.protein}g C:${card.carbs}g F:${card.fat}g`,
        savedBy: profile?.memberName || "You",
        createdAt: new Date().toISOString(),
      },
    ]);
    toast.success(`${card.name} saved`);
  };

  const getCuisineTag = (card: MealCard) => {
    const cuisineMap: Record<string, string> = {
      mexican: "Mexican",
      asian: "Asian",
      southeast_asian: "SE Asian",
      south_asian: "Indian",
      mediterranean: "Med",
      italian: "Italian",
      american: "American",
      latin_american: "Latin",
      caribbean: "Caribbean",
      african: "African",
      french: "French",
      seafood: "Seafood",
    };
    for (const tag of card.tags) {
      if (cuisineMap[tag]) return cuisineMap[tag];
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-bold text-foreground mb-3">Meals</h1>

        {/* Craving input */}
        <div className="relative mb-3">
          <input
            type="text"
            value={craving}
            onChange={(e) => setCraving(e.target.value)}
            placeholder="I'm craving..."
            className="w-full rounded-lg border border-border bg-input pl-4 pr-10 py-2.5 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Send size={14} />
          </button>
        </div>

        {/* Quick filters */}
        {profile && profile.quickFilters.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {profile.quickFilters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(activeFilter === f ? null : f)}
                className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
                  activeFilter === f
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {activeSections.map((section) => {
          const cards = getCardsForSection(section.id);
          if (cards.length === 0) return null;
          return (
            <div key={section.id} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-base font-bold text-foreground">{section.name}</h2>
                <button
                  onClick={() => setShuffleKey((k) => k + 1)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-gold transition-colors"
                >
                  <RefreshCw size={14} />
                  <span className="font-body text-xs">Shuffle</span>
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((card) => {
                  const cuisineTag = getCuisineTag(card);
                  return (
                    <div
                      key={card.name}
                      className="rounded-lg border border-border bg-card p-3 flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-foreground leading-tight">
                          {card.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-body text-xs text-muted-foreground">
                            {card.cal} cal
                          </span>
                          <span className="font-body text-xs text-muted-foreground">
                            P:{card.protein}g C:{card.carbs}g F:{card.fat}g
                          </span>
                        </div>
                        {cuisineTag && (
                          <span className="inline-block mt-1 rounded-full bg-secondary px-2 py-0.5 font-body text-xs text-muted-foreground">
                            {cuisineTag}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => saveRecipe(card)}
                        className="ml-2 shrink-0 text-muted-foreground hover:text-gold transition-colors"
                      >
                        <Star size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
