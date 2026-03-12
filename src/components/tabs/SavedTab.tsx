import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, BookOpen, ArrowLeft, Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { RecipeDisplay } from "@/components/RecipeDisplay";
import { toast } from "sonner";
import { MEAL_SECTIONS } from "@/data/mealSections";

interface SavedRecipe {
  id: string;
  meal_name: string;
  recipe_text: string;
  saved_by: string | null;
  created_at: string | null;
  meal_section: string | null;
  tags: string[];
}

const FILTER_CHIPS = [
  "High Protein", "Under 20 Min", "Low Carb", "Vegetarian", "Vegan",
  "Gluten-Free", "Dairy-Free", "Kid-Friendly", "Comfort Food", "Light & Fresh",
  "Chicken", "Beef", "Seafood", "Spicy",
] as const;

const SECTION_LABEL_MAP: Record<string, string> = {};
MEAL_SECTIONS.forEach(s => { SECTION_LABEL_MAP[s.id] = s.name; });

export function SavedTab() {
  const { householdId } = useHousehold();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [viewingRecipe, setViewingRecipe] = useState<SavedRecipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    const load = async () => {
      const { data } = await supabase
        .from("saved_recipes")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      if (data) setRecipes(data.map(r => ({
        ...r,
        meal_section: (r as any).meal_section || null,
        tags: ((r as any).tags as string[]) || [],
      })));
    };
    load();

    // Realtime sync
    const channel = supabase
      .channel(`saved-sync-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_recipes', filter: `household_id=eq.${householdId}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId]);

  const removeRecipe = async (id: string) => {
    await supabase.from("saved_recipes").delete().eq("id", id);
    setRecipes(prev => prev.filter(r => r.id !== id));
    toast.success("Recipe removed");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const n = new Set(prev);
      n.has(sectionId) ? n.delete(sectionId) : n.add(sectionId);
      return n;
    });
  };

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.meal_name.toLowerCase().includes(q));
    }

    // Quick filter by tag
    if (activeFilter) {
      const filterTag = activeFilter.toLowerCase().replace(/[^a-z0-9]/g, "_");
      filtered = filtered.filter(r =>
        r.tags.some(t => t.includes(filterTag) || t.includes(filterTag.replace(/_/g, ""))) ||
        r.meal_name.toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    // Category filter
    if (activeCategoryFilter) {
      filtered = filtered.filter(r => r.meal_section === activeCategoryFilter);
    }

    return filtered;
  }, [recipes, searchQuery, activeFilter, activeCategoryFilter]);

  // Group by meal section
  const groupedRecipes = useMemo(() => {
    const groups: Record<string, SavedRecipe[]> = {};
    const uncategorized: SavedRecipe[] = [];

    filteredRecipes.forEach(r => {
      if (r.meal_section) {
        if (!groups[r.meal_section]) groups[r.meal_section] = [];
        groups[r.meal_section].push(r);
      } else {
        uncategorized.push(r);
      }
    });

    // Sort sections by MEAL_SECTIONS order
    const orderedSections = MEAL_SECTIONS
      .filter(s => groups[s.id])
      .map(s => ({ id: s.id, name: s.name, recipes: groups[s.id] }));

    if (uncategorized.length > 0) {
      orderedSections.push({ id: "_uncategorized", name: "Other", recipes: uncategorized });
    }

    return orderedSections;
  }, [filteredRecipes]);

  // Available categories for filter
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    recipes.forEach(r => { if (r.meal_section) cats.add(r.meal_section); });
    return MEAL_SECTIONS.filter(s => cats.has(s.id));
  }, [recipes]);

  // Recipe detail view
  if (viewingRecipe) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => setViewingRecipe(null)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground flex-1 truncate">{viewingRecipe.meal_name}</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <RecipeDisplay text={viewingRecipe.recipe_text} />
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex justify-center pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => { removeRecipe(viewingRecipe.id); setViewingRecipe(null); }}
            className="flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 font-body text-sm text-muted-foreground"
          >
            <Trash2 size={14} />
            Unsave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-bold text-foreground mb-3">Saved Recipes</h1>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search saved recipes…"
            className="w-full rounded-lg border border-border bg-input pl-9 pr-8 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category filter pills */}
        {availableCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveCategoryFilter(null)}
              className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
                !activeCategoryFilter ? "border-gold bg-gold/10 text-foreground" : "border-border bg-card text-muted-foreground"
              }`}
            >
              All
            </button>
            {availableCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryFilter(activeCategoryFilter === cat.id ? null : cat.id)}
                className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
                  activeCategoryFilter === cat.id ? "border-gold bg-gold/10 text-foreground" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Quick filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {FILTER_CHIPS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(activeFilter === f ? null : f)}
              className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
                activeFilter === f ? "border-gold bg-gold/10 text-foreground" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <BookOpen size={32} className="text-muted-foreground mb-3" />
            {recipes.length === 0 ? (
              <>
                <p className="font-body text-sm text-muted-foreground">No saved recipes yet.</p>
                <p className="font-body text-xs text-muted-foreground mt-1">Star a recipe from the Meals tab to save it here.</p>
              </>
            ) : (
              <p className="font-body text-sm text-muted-foreground">No recipes match your filters.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            {groupedRecipes.map(group => (
              <div key={group.id}>
                <button
                  onClick={() => toggleSection(group.id)}
                  className="flex items-center gap-2 w-full mb-2"
                >
                  {collapsedSections.has(group.id) ? (
                    <ChevronRight size={14} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={14} className="text-muted-foreground" />
                  )}
                  <h2 className="font-display text-sm font-bold text-foreground">{group.name}</h2>
                  <span className="font-body text-xs text-muted-foreground">({group.recipes.length})</span>
                </button>
                {!collapsedSections.has(group.id) && (
                  <div className="flex flex-col gap-2">
                    {group.recipes.map(recipe => (
                      <div key={recipe.id} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between">
                        <button onClick={() => setViewingRecipe(recipe)} className="flex-1 min-w-0 text-left">
                          <p className="font-body text-sm font-medium text-foreground">{recipe.meal_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-body text-xs text-muted-foreground">
                              {recipe.saved_by} · {formatDate(recipe.created_at)}
                            </span>
                            {recipe.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 font-body text-[10px] text-muted-foreground">
                                {tag.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </button>
                        <button onClick={() => removeRecipe(recipe.id)} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
