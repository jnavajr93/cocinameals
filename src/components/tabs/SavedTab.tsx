import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, BookOpen, ArrowLeft, Search, X, ChevronDown, ChevronRight, Clock, Flame, UtensilsCrossed, Filter, Users, ShoppingCart, Send, Star } from "lucide-react";
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

const SECTION_LABEL_MAP: Record<string, string> = {};
MEAL_SECTIONS.forEach(s => { SECTION_LABEL_MAP[s.id] = s.name; });

export function SavedTab() {
  const { householdId } = useHousehold();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [viewingRecipe, setViewingRecipe] = useState<SavedRecipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"saved" | "shopping">("saved");

  // Filter states matching meals tab
  const [filterCookTime, setFilterCookTime] = useState<string | null>(null);
  const [filterProtein, setFilterProtein] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [filterPeople, setFilterPeople] = useState<string | null>(null);
  const [filterCuisine, setFilterCuisine] = useState<string | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState<string | null>(null);

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

  // Separate shopping cart meals from saved recipes
  const shoppingCartMeals = useMemo(() => recipes.filter(r => r.meal_section === "shopping_cart"), [recipes]);
  const savedRecipes = useMemo(() => recipes.filter(r => r.meal_section !== "shopping_cart"), [recipes]);

  // Filter saved recipes
  const filteredRecipes = useMemo(() => {
    let filtered = viewMode === "shopping" ? shoppingCartMeals : savedRecipes;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.meal_name.toLowerCase().includes(q));
    }

    // Tag-based filtering for cook time, protein, method, cuisine
    const tagFilter = (tag: string) => {
      const t = tag.toLowerCase().replace(/[^a-z0-9]/g, "_");
      return (r: SavedRecipe) =>
        r.tags.some(rt => rt.includes(t) || rt.includes(t.replace(/_/g, ""))) ||
        r.meal_name.toLowerCase().includes(tag.toLowerCase());
    };

    if (filterCookTime) filtered = filtered.filter(tagFilter(filterCookTime));
    if (filterProtein) filtered = filtered.filter(tagFilter(filterProtein));
    if (filterMethod) filtered = filtered.filter(tagFilter(filterMethod));
    if (filterCuisine) filtered = filtered.filter(tagFilter(filterCuisine));

    if (activeCategoryFilter) {
      filtered = filtered.filter(r => r.meal_section === activeCategoryFilter);
    }

    return filtered;
  }, [savedRecipes, shoppingCartMeals, viewMode, searchQuery, filterCookTime, filterProtein, filterMethod, filterCuisine, activeCategoryFilter]);

  // Group by meal section
  const groupedRecipes = useMemo(() => {
    const groups: Record<string, SavedRecipe[]> = {};
    const uncategorized: SavedRecipe[] = [];

    filteredRecipes.forEach(r => {
      if (r.meal_section && r.meal_section !== "shopping_cart") {
        if (!groups[r.meal_section]) groups[r.meal_section] = [];
        groups[r.meal_section].push(r);
      } else {
        uncategorized.push(r);
      }
    });

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
    savedRecipes.forEach(r => { if (r.meal_section && r.meal_section !== "shopping_cart") cats.add(r.meal_section); });
    return MEAL_SECTIONS.filter(s => cats.has(s.id));
  }, [savedRecipes]);

  const activeFiltersList = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    if (filterCookTime) list.push({ key: "cookTime", label: filterCookTime });
    if (filterMethod) list.push({ key: "method", label: filterMethod });
    if (filterProtein) list.push({ key: "protein", label: filterProtein });
    if (filterPeople) list.push({ key: "people", label: filterPeople });
    if (filterCuisine) list.push({ key: "cuisine", label: filterCuisine });
    return list;
  }, [filterCookTime, filterProtein, filterMethod, filterPeople, filterCuisine]);

  const clearFilter = (key: string) => {
    if (key === "cookTime") setFilterCookTime(null);
    if (key === "protein") setFilterProtein(null);
    if (key === "people") setFilterPeople(null);
    if (key === "cuisine") setFilterCuisine(null);
    if (key === "method") setFilterMethod(null);
  };

  // Filter sheet options (same as meals tab)
  const filterOptions: Record<string, { label: string; value: string }[]> = {
    cookTime: [
      { label: "Any", value: "" },
      { label: "No Cook", value: "No Cook" },
      { label: "Under 15 min", value: "Under 15 min" },
      { label: "Under 30 min", value: "Under 30 min" },
      { label: "Under 60 min", value: "Under 60 min" },
    ],
    protein: [
      { label: "Any", value: "" },
      { label: "Chicken Breast", value: "Chicken Breast" },
      { label: "Chicken Thigh", value: "Chicken Thigh" },
      { label: "Chicken Drumsticks", value: "Chicken Drumsticks" },
      { label: "Steaks", value: "Steaks" },
      { label: "Ground Beef", value: "Ground Beef" },
      { label: "Pork", value: "Pork" },
      { label: "Salmon", value: "Salmon" },
      { label: "Shrimp", value: "Shrimp" },
      { label: "Tuna", value: "Tuna" },
      { label: "Tilapia", value: "Tilapia" },
      { label: "Eggs", value: "Eggs" },
      { label: "Plant Based", value: "Plant Based" },
    ],
    cuisine: [
      { label: "Any", value: "" },
      { label: "Mexican", value: "Mexican" },
      { label: "Asian", value: "Asian" },
      { label: "Mediterranean", value: "Mediterranean" },
      { label: "Italian", value: "Italian" },
      { label: "American", value: "American" },
      { label: "Indian", value: "Indian" },
      { label: "French", value: "French" },
    ],
    people: [
      { label: "Any", value: "" },
      { label: "1 person", value: "1 person" },
      { label: "2 people", value: "2 people" },
      { label: "3-4 people", value: "3-4 people" },
      { label: "5-6 people", value: "5-6 people" },
      { label: "7+ people", value: "7+ people" },
    ],
    method: [
      { label: "Any", value: "" },
      { label: "Air Fryer Only", value: "Air Fryer Only" },
      { label: "One Pan", value: "One Pan" },
      { label: "Oven Only", value: "Oven Only" },
      { label: "Grill", value: "Grill" },
      { label: "Griddle", value: "Griddle" },
    ],
  };

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
            {viewingRecipe.meal_section === "shopping_cart" ? "Remove from cart" : "Unsave"}
          </button>
        </div>
      </div>
    );
  }

  const renderFilterSheet = () => {
    if (!showFilterSheet) return null;
    const items = filterOptions[showFilterSheet] || [];
    const setter = showFilterSheet === "cookTime" ? setFilterCookTime
      : showFilterSheet === "protein" ? setFilterProtein
      : showFilterSheet === "people" ? setFilterPeople
      : showFilterSheet === "cuisine" ? setFilterCuisine
      : setFilterMethod;
    const current = showFilterSheet === "cookTime" ? filterCookTime
      : showFilterSheet === "protein" ? filterProtein
      : showFilterSheet === "people" ? filterPeople
      : showFilterSheet === "cuisine" ? filterCuisine
      : filterMethod;

    return (
      <div className="fixed inset-0 z-50 flex items-end bg-foreground/30" onClick={() => setShowFilterSheet(null)}>
        <div className="w-full rounded-t-2xl bg-background p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
          <h3 className="font-display text-lg font-bold text-foreground mb-4">
            {showFilterSheet === "cookTime" ? "Cook Time" : showFilterSheet === "protein" ? "Main Protein" : showFilterSheet === "people" ? "Number of People" : showFilterSheet === "cuisine" ? "Cuisine" : "Cooking Method"}
          </h3>
          <div className="flex flex-col gap-1">
            {items.map(opt => (
              <button
                key={opt.label}
                onClick={() => { setter(opt.value || null); setShowFilterSheet(null); }}
                className={`rounded-lg px-4 py-3 text-left font-body text-sm transition-colors ${
                  current === opt.value || (!current && !opt.value) ? "bg-gold/10 text-foreground font-medium" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-bold text-foreground mb-3">Saved Recipes</h1>

        {/* Saved / Shopping Cart toggle */}
        <div className="flex items-center rounded-full bg-secondary p-0.5 mb-3 w-fit">
          <button
            onClick={() => setViewMode("saved")}
            className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-colors ${
              viewMode === "saved" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            ⭐ Saved
          </button>
          <button
            onClick={() => setViewMode("shopping")}
            className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-colors flex items-center gap-1 ${
              viewMode === "shopping" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <ShoppingCart size={12} />
            Shopping Cart
            {shoppingCartMeals.length > 0 && (
              <span className="ml-1 rounded-full bg-gold/20 px-1.5 text-[10px] font-medium text-gold">{shoppingCartMeals.length}</span>
            )}
          </button>
        </div>

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

        {viewMode === "saved" && (
          <>
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

            {/* Filter buttons matching meals tab */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { key: "cookTime", label: "Cook Time", icon: Clock, active: !!filterCookTime },
                { key: "method", label: "Method", icon: UtensilsCrossed, active: !!filterMethod },
                { key: "protein", label: "Protein", icon: Flame, active: !!filterProtein },
                { key: "people", label: "People", icon: Users, active: !!filterPeople },
                { key: "cuisine", label: "Cuisine", icon: Filter, active: !!filterCuisine },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setShowFilterSheet(f.key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                    f.active ? "border-gold bg-gold/10 text-foreground" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <f.icon size={12} />
                  {f.label}
                  <ChevronDown size={10} />
                </button>
              ))}
            </div>

            {/* Active filter summary */}
            {activeFiltersList.length > 0 && (
              <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide">
                {activeFiltersList.map(f => (
                  <button
                    key={f.key}
                    onClick={() => clearFilter(f.key)}
                    className="shrink-0 flex items-center gap-1 rounded-full bg-gold/10 border border-gold/30 px-2.5 py-1 font-body text-xs text-foreground"
                  >
                    {f.label}
                    <X size={10} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            {viewMode === "shopping" ? (
              <>
                <ShoppingCart size={32} className="text-muted-foreground mb-3" />
                <p className="font-body text-sm text-muted-foreground">No meals in shopping cart.</p>
                <p className="font-body text-xs text-muted-foreground mt-1">Tap the 🛒 icon on a Discover meal to add it here.</p>
              </>
            ) : (
              <>
                <BookOpen size={32} className="text-muted-foreground mb-3" />
                {savedRecipes.length === 0 ? (
                  <>
                    <p className="font-body text-sm text-muted-foreground">No saved recipes yet.</p>
                    <p className="font-body text-xs text-muted-foreground mt-1">Star a recipe from the Meals tab to save it here.</p>
                  </>
                ) : (
                  <p className="font-body text-sm text-muted-foreground">No recipes match your filters.</p>
                )}
              </>
            )}
          </div>
        ) : viewMode === "shopping" ? (
          <div className="flex flex-col gap-2 mt-2">
            {filteredRecipes.map(recipe => (
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

      {renderFilterSheet()}
    </div>
  );
}
