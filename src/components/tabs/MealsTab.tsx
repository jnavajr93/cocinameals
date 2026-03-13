import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { RefreshCw, Star, Send, ThumbsUp, ThumbsDown, ChevronDown, X, Filter, Clock, Flame, UtensilsCrossed, ArrowLeft, Users, ShoppingCart, Plus } from "lucide-react";
import { RecipeDisplay } from "@/components/RecipeDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { MEAL_POOLS, MealCard } from "@/data/mealPools";
import { toast } from "sonner";

interface MealCardWithCookTime extends MealCard {
  cookTime?: number;
}

interface RecipeViewState {
  mealName: string;
  recipeText: string;
  loading: boolean;
  isBaby?: boolean;
  sectionId?: string;
  tags?: string[];
}

export function MealsTab() {
  const { householdId, userName } = useHousehold();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [craving, setCraving] = useState("");
  const [cravingLoading, setCravingLoading] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(() => Math.floor(Math.random() * 100000));
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [mealSections, setMealSections] = useState<{ id: string; name: string; enabled: boolean; order: number }[]>([]);
  const [aiCards, setAiCards] = useState<Record<string, MealCardWithCookTime[]>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [savedMealNames, setSavedMealNames] = useState<Set<string>>(new Set());
  const [likedMeals, setLikedMeals] = useState<Set<string>>(new Set());
  const [dislikedMeals, setDislikedMeals] = useState<Set<string>>(new Set());
  const [recipeView, setRecipeView] = useState<RecipeViewState | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [pantryInStock, setPantryInStock] = useState<string[]>([]);
  const [expiringItems, setExpiringItems] = useState<string[]>([]);
  

  // Craving popup state
  const [cravingPopup, setCravingPopup] = useState<{ meals: MealCardWithCookTime[]; loading: boolean } | null>(null);

  // Pull to refresh state
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Filters
  const [filterCookTime, setFilterCookTime] = useState<string | null>(null);
  const [filterProtein, setFilterProtein] = useState<string | null>(null);
  const [filterCuisine, setFilterCuisine] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [filterPeople, setFilterPeople] = useState<string | null>(null);
  const [filterInStockOnly, setFilterInStockOnly] = useState(true);
  const [filterMustInclude, setFilterMustInclude] = useState<string | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState<string | null>(null);

  const loadMealsData = async () => {
    if (!householdId || !user) return;
    const [{ data: hProfile }, { data: uPrefs }, { data: feedbackData }, { data: savedData }, { data: pantryData }] = await Promise.all([
      supabase.from("household_profile").select("quick_filters, meal_sections, equipment, cuisine_sliders").eq("household_id", householdId).maybeSingle(),
      supabase.from("user_preferences").select("section_order, skill_level, spice_tolerance, diet_restrictions, health_conditions, weeknight_time").eq("user_id", user.id).maybeSingle(),
      supabase.from("meal_feedback").select("meal_name, feedback, tags").eq("user_id", user.id),
      supabase.from("saved_recipes").select("meal_name").eq("household_id", householdId),
      supabase.from("pantry_items").select("name, in_stock, expires_at").eq("household_id", householdId).eq("is_hidden", false),
    ]);

    if (hProfile) {
      setQuickFilters((hProfile.quick_filters as string[]) || []);
      const sections = (uPrefs?.section_order as any[]) || (hProfile.meal_sections as any[]) || [];
      setMealSections(sections);
      setProfile({
        equipment: (hProfile.equipment as string[]) || [],
        cuisineSliders: hProfile.cuisine_sliders || {},
        skillLevel: uPrefs?.skill_level || "intermediate",
        spiceTolerance: uPrefs?.spice_tolerance || "medium",
        dietRestrictions: (uPrefs?.diet_restrictions as string[]) || [],
        healthConditions: (uPrefs?.health_conditions as string[]) || [],
        weeknightTime: uPrefs?.weeknight_time || "30min",
      });
    }

    if (feedbackData) {
      const liked = new Set<string>();
      const disliked = new Set<string>();
      feedbackData.forEach(f => {
        if (f.feedback === "liked") liked.add(f.meal_name);
        else disliked.add(f.meal_name);
      });
      setLikedMeals(liked);
      setDislikedMeals(disliked);
    }

    if (savedData) setSavedMealNames(new Set(savedData.map(s => s.meal_name)));

    if (pantryData) {
      const inStock = pantryData.filter(p => p.in_stock).map(p => p.name);
      setPantryInStock(inStock);
      const now = Date.now();
      const expiring = pantryData
        .filter(p => p.in_stock && p.expires_at && (new Date(p.expires_at).getTime() - now) / 86400000 <= 3)
        .map(p => p.name);
      setExpiringItems(expiring);
    }
  };

  useEffect(() => {
    if (!householdId || !user) return;
    loadMealsData();
  }, [householdId, user]);

  // Realtime sync: refresh when household profile or pantry changes
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`meals-sync-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_profile', filter: `household_id=eq.${householdId}` }, () => loadMealsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_items', filter: `household_id=eq.${householdId}` }, () => loadMealsData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId]);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;
    if (!scrollRef.current || scrollRef.current.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      e.preventDefault(); // Prevent native scroll / overscroll navigation
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  }, []);

  const activeSectionsRef = useRef<{ id: string; name: string; enabled: boolean; order: number }[]>([]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    const dist = pullDistance;
    if (dist > 50) {
      setPullRefreshing(true);
      setPullDistance(50);
      setAiCards({});
      setShuffleKey(k => k + 1);
      await loadMealsData();
      for (const section of activeSectionsRef.current) {
        shuffleSection(section.id);
      }
      setPullRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance]);

  // Attach touch listeners with { passive: false } so preventDefault works
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const activeSections = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = dayNames[new Date().getDay()];
    const result = mealSections
      .filter(s => s.enabled)
      .filter(s => {
        const days = (s as any).scheduledDays as string[] | undefined;
        if (!days || days.length === 0) return true;
        return days.includes(today);
      })
      .sort((a, b) => a.order - b.order);
    activeSectionsRef.current = result;
    return result;
  }, [mealSections]);

  const activeFiltersList = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    if (filterCookTime) list.push({ key: "cookTime", label: filterCookTime });
    if (filterProtein) list.push({ key: "protein", label: filterProtein });
    if (filterPeople) list.push({ key: "people", label: filterPeople });
    if (filterMethod) list.push({ key: "method", label: filterMethod });
    if (filterCuisine) list.push({ key: "cuisine", label: filterCuisine });
    if (filterInStockOnly) list.push({ key: "inStock", label: "In-Stock Only" });
    if (filterMustInclude) list.push({ key: "mustInclude", label: filterMustInclude });
    if (activeFilter) list.push({ key: "quick", label: activeFilter });
    return list;
  }, [filterCookTime, filterProtein, filterCuisine, filterMethod, filterInStockOnly, filterMustInclude, activeFilter]);

  // Auto-refresh all sections when any filter changes
  const filtersSignature = JSON.stringify([filterCookTime, filterProtein, filterPeople, filterCuisine, filterMethod, filterInStockOnly, filterMustInclude, activeFilter]);
  const prevFiltersRef = useRef(filtersSignature);

  useEffect(() => {
    if (prevFiltersRef.current !== filtersSignature && activeSections.length > 0 && profile) {
      prevFiltersRef.current = filtersSignature;
      // Clear local cards so AI re-generates with new filters
      setAiCards({});
      for (const section of activeSections) {
        shuffleSection(section.id);
      }
    }
  }, [filtersSignature, activeSections.length, profile]);




  const clearFilter = (key: string) => {
    if (key === "cookTime") setFilterCookTime(null);
    if (key === "protein") setFilterProtein(null);
    if (key === "people") setFilterPeople(null);
    if (key === "cuisine") setFilterCuisine(null);
    if (key === "method") setFilterMethod(null);
    if (key === "inStock") setFilterInStockOnly(false);
    if (key === "mustInclude") setFilterMustInclude(null);
    if (key === "quick") setActiveFilter(null);
  };

  const clearAllFilters = () => {
    setFilterCookTime(null);
    setFilterProtein(null);
    setFilterPeople(null);
    setFilterCuisine(null);
    setFilterMethod(null);
    setFilterInStockOnly(false);
    setFilterMustInclude(null);
    setActiveFilter(null);
  };

  const getCardsForSection = (sectionId: string): MealCardWithCookTime[] => {
    if (aiCards[sectionId]?.length) return aiCards[sectionId];

    const pool = MEAL_POOLS[sectionId] || [];
    let cards: MealCardWithCookTime[] = pool.map(c => ({ ...c }));

    if (activeFilter) {
      const filterTag = activeFilter.toLowerCase().replace(/[^a-z0-9]/g, "_");
      cards = cards.filter(c =>
        c.tags.includes(filterTag) ||
        c.tags.some(t => t.includes(filterTag.replace(/_/g, ""))) ||
        c.name.toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    cards = cards.filter(c => !dislikedMeals.has(c.name));

    const seed = shuffleKey + sectionId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    cards.sort((a, b) => Math.sin(seed * 9301 + cards.indexOf(a) * 49297) - Math.sin(seed * 9301 + cards.indexOf(b) * 49297));

    const limit = ["afternoon_snack", "baby_breakfast", "baby_dinner"].includes(sectionId) ? 2 : 3;
    return cards.slice(0, limit);
  };

  const saveMeal = async (card: MealCardWithCookTime, sectionId?: string) => {
    if (!householdId) return;
    if (savedMealNames.has(card.name)) {
      await supabase.from("saved_recipes").delete().eq("household_id", householdId).eq("meal_name", card.name);
      setSavedMealNames(prev => { const n = new Set(prev); n.delete(card.name); return n; });
      toast.success("Removed from saved");
    } else {
      const cacheKey = `recipe_${card.name.replace(/\s+/g, "_").toLowerCase()}`;
      let recipeText = "";
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { text } = JSON.parse(cached);
          recipeText = text || "";
        }
      } catch {}

      const { error } = await supabase.from("saved_recipes").insert({
        household_id: householdId,
        meal_name: card.name,
        recipe_text: recipeText || `Recipe for ${card.name} — generate from Meals tab to see full instructions.`,
        saved_by: userName,
        meal_section: sectionId || null,
        tags: card.tags || [],
      } as any);
      if (error) toast.error("Could not save");
      else {
        setSavedMealNames(prev => new Set(prev).add(card.name));
        toast.success(`${card.name} saved`);
      }
    }
  };

  const handleFeedback = async (card: MealCardWithCookTime, type: "liked" | "disliked") => {
    if (!householdId || !user) return;
    const { error } = await supabase.from("meal_feedback").insert({
      user_id: user.id,
      household_id: householdId,
      meal_name: card.name,
      feedback: type,
      tags: card.tags,
    });
    if (error) { toast.error("Could not save feedback"); return; }

    if (type === "liked") {
      setLikedMeals(prev => new Set(prev).add(card.name));
      toast.success("Got it — more like this.");
    } else {
      setDislikedMeals(prev => new Set(prev).add(card.name));
      toast("Got it — we'll show less of this.", { duration: 2000 });
    }
  };

  const shuffleSection = async (sectionId: string) => {
    setAiLoading(prev => ({ ...prev, [sectionId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("suggest-meals", {
        body: {
          section: sectionId,
          pantryItems: pantryInStock,
          expiringItems,
          profile,
          filters: { cookTime: filterCookTime, mainProtein: filterProtein, cuisineOverride: filterCuisine, cookingMethod: filterMethod, inStockOnly: filterInStockOnly, mustInclude: filterMustInclude, quickFilterChip: activeFilter },
          feedback: { likedTags: [], dislikedMeals: Array.from(dislikedMeals) },
        },
      });
      if (error) throw error;
      if (Array.isArray(data)) {
        setAiCards(prev => ({ ...prev, [sectionId]: data }));
      }
    } catch (e) {
      setShuffleKey(k => k + 1);
      toast.error("AI unavailable, shuffled locally");
    }
    setAiLoading(prev => ({ ...prev, [sectionId]: false }));
  };

  const handleCraving = async () => {
    if (!craving.trim()) return;
    setCravingPopup({ meals: [], loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("suggest-meals", {
        body: {
          craving: craving.trim(),
          count: 3,
          pantryItems: pantryInStock,
          expiringItems,
          profile,
          filters: { cookTime: filterCookTime, mainProtein: filterProtein, cuisineOverride: filterCuisine, cookingMethod: filterMethod, inStockOnly: filterInStockOnly, quickFilterChip: activeFilter },
          feedback: { likedTags: [], dislikedMeals: Array.from(dislikedMeals) },
        },
      });
      if (error) throw error;
      if (Array.isArray(data)) {
        setCravingPopup({ meals: data.slice(0, 3), loading: false });
      }
    } catch {
      toast.error("Something went wrong. Try again.");
      setCravingPopup(null);
    }
    setCraving("");
  };

  const openRecipe = async (card: MealCardWithCookTime, isBaby = false, sectionId?: string) => {
    const cacheKey = `recipe_${card.name}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { text, ts } = JSON.parse(cached);
        if (Date.now() - ts < 24 * 3600000) {
          setRecipeView({ mealName: card.name, recipeText: text, loading: false, isBaby, sectionId, tags: card.tags });
          return;
        }
      } catch {}
    }

    setRecipeView({ mealName: card.name, recipeText: "", loading: true, isBaby, sectionId, tags: card.tags });

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recipe`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mealName: card.name,
          pantryItems: pantryInStock,
          expiringItems,
          profile,
          isBaby,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setRecipeView(prev => prev ? { ...prev, recipeText: fullText } : null);
            }
          } catch {}
        }
      }

      setRecipeView(prev => prev ? { ...prev, loading: false } : null);
      localStorage.setItem(cacheKey, JSON.stringify({ text: fullText, ts: Date.now() }));
    } catch {
      toast.error("Something went wrong. Tap to retry.");
      setRecipeView(prev => prev ? { ...prev, loading: false, recipeText: "Failed to generate recipe. Please go back and try again." } : null);
    }
  };

  const saveRecipe = async () => {
    if (!recipeView || !householdId) return;
    if (savedMealNames.has(recipeView.mealName)) {
      await supabase.from("saved_recipes").delete().eq("household_id", householdId).eq("meal_name", recipeView.mealName);
      setSavedMealNames(prev => { const n = new Set(prev); n.delete(recipeView.mealName); return n; });
      toast.success("Recipe unsaved");
    } else {
      const { error } = await supabase.from("saved_recipes").insert({
        household_id: householdId,
        meal_name: recipeView.mealName,
        recipe_text: recipeView.recipeText,
        saved_by: userName,
        meal_section: recipeView.sectionId || null,
        tags: recipeView.tags || [],
      } as any);
      if (error) toast.error("Could not save recipe");
      else {
        setSavedMealNames(prev => new Set(prev).add(recipeView.mealName));
        toast.success("Recipe saved");
      }
    }
  };

  const getCuisineTag = (card: MealCardWithCookTime) => {
    const map: Record<string, string> = {
      mexican: "Mexican", asian: "Asian", southeast_asian: "SE Asian",
      south_asian: "Indian", mediterranean: "Med", italian: "Italian",
      american: "American", latin_american: "Latin", caribbean: "Caribbean",
      african: "African", french: "French", seafood: "Seafood",
    };
    for (const tag of card.tags) {
      if (map[tag]) return map[tag];
    }
    return null;
  };

  const shareRecipe = async () => {
    if (!recipeView || !recipeView.recipeText) return;

    try {
      toast.info("Creating share link…");

      // Save recipe to shared_recipes table
      const { data, error } = await supabase
        .from("shared_recipes")
        .insert({
          meal_name: recipeView.mealName,
          recipe_text: recipeView.recipeText,
          tags: recipeView.tags ?? [],
          shared_by_name: userName || null,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error("Failed to create share link");
      }

      const shareUrl = `${window.location.origin}/recipe/${data.id}`;
      const shareText = `🍽️ ${recipeView.mealName} — check out this recipe from cocina!`;

      if (navigator.share) {
        await navigator.share({
          title: recipeView.mealName,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success("Share link copied to clipboard!");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error("Couldn't share recipe. Try again.");
      }
    }
  };

  // Recipe view
  if (recipeView) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <button onClick={() => setRecipeView(null)} className="text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground flex-1 truncate">{recipeView.mealName}</h1>
          <button
            onClick={shareRecipe}
            className="shrink-0 text-muted-foreground hover:text-gold transition-colors"
            title="Share recipe"
          >
            <Send size={16} />
          </button>
          <button
            onClick={() => {
              handleFeedback({ name: recipeView.mealName, tags: [], cal: 0, protein: 0, carbs: 0, fat: 0 } as MealCardWithCookTime, "liked");
            }}
            className={`shrink-0 transition-colors ${likedMeals.has(recipeView.mealName) ? "text-gold" : "text-muted-foreground hover:text-gold"}`}
          >
            <ThumbsUp size={16} />
          </button>
          <button
            onClick={() => {
              handleFeedback({ name: recipeView.mealName, tags: [], cal: 0, protein: 0, carbs: 0, fat: 0 } as MealCardWithCookTime, "disliked");
            }}
            className={`shrink-0 transition-colors ${dislikedMeals.has(recipeView.mealName) ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
          >
            <ThumbsDown size={16} />
          </button>
          <button
            onClick={saveRecipe}
            className={`shrink-0 transition-colors ${savedMealNames.has(recipeView.mealName) ? "text-gold" : "text-muted-foreground hover:text-gold"}`}
          >
            <Star size={16} fill={savedMealNames.has(recipeView.mealName) ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {recipeView.loading && !recipeView.recipeText ? (
            <div className="space-y-3 mt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          ) : (
            <RecipeDisplay text={recipeView.recipeText} loading={recipeView.loading} />
          )}
        </div>
      </div>
    );
  }

  // Filter bottom sheet
  const renderFilterSheet = () => {
    if (!showFilterSheet) return null;
    const options: Record<string, { label: string; value: string }[]> = {
      cookTime: [
        { label: "Any", value: "" },
        { label: "Under 15 min", value: "Under 15 min" },
        { label: "Under 30 min", value: "Under 30 min" },
        { label: "Under 45 min", value: "Under 45 min" },
        { label: "1 hr+", value: "1 hr+" },
      ],
      protein: [
        { label: "Any", value: "" },
        { label: "Chicken", value: "Chicken" },
        { label: "Beef", value: "Beef" },
        { label: "Pork", value: "Pork" },
        { label: "Seafood", value: "Seafood" },
        { label: "Eggs", value: "Eggs" },
        { label: "Plant-Based", value: "Plant-Based" },
        { label: "Use What's Expiring", value: "Use What's Expiring" },
      ],
      cuisine: [
        { label: "My Profile", value: "" },
        { label: "Mexican", value: "Mexican" },
        { label: "Asian", value: "Asian" },
        { label: "Mediterranean", value: "Mediterranean" },
        { label: "Italian", value: "Italian" },
        { label: "American", value: "American" },
        { label: "Indian", value: "Indian" },
        { label: "French", value: "French" },
        { label: "Surprise Me", value: "Surprise Me" },
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
        { label: "Stovetop Only", value: "Stovetop Only" },
        { label: "Grill", value: "Grill" },
        { label: "No Cook", value: "No Cook" },
      ],
    };

    const items = options[showFilterSheet] || [];
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

  // Craving popup
  const renderCravingPopup = () => {
    if (!cravingPopup) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4" onClick={() => setCravingPopup(null)}>
        <div className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-foreground">Craving Picks</h3>
            <button onClick={() => setCravingPopup(null)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          {cravingPopup.loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-lg border border-border bg-card p-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cravingPopup.meals.map(card => {
                const cuisineTag = getCuisineTag(card);
                const isLiked = likedMeals.has(card.name);
                const isDisliked = dislikedMeals.has(card.name);
                const isSaved = savedMealNames.has(card.name);
                return (
                  <div key={card.name} className={`rounded-lg border bg-card p-3 transition-colors ${isLiked ? "border-gold/40" : "border-border"}`}>
                    <button onClick={() => { setCravingPopup(null); openRecipe(card); }} className="text-left w-full">
                      <p className="font-body text-sm font-medium text-foreground leading-tight">{card.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-body text-xs text-muted-foreground">{card.cal} cal</span>
                        <span className="font-body text-xs text-muted-foreground">P:{card.protein}g C:{card.carbs}g F:{card.fat}g</span>
                      </div>
                      {cuisineTag && (
                        <span className="inline-block mt-1 rounded-full bg-secondary px-2 py-0.5 font-body text-xs text-muted-foreground">{cuisineTag}</span>
                      )}
                    </button>
                    <div className="flex items-center justify-end gap-3 mt-2">
                      <button onClick={() => handleFeedback(card, "liked")} className={`transition-colors ${isLiked ? "text-gold" : "text-muted-foreground hover:text-gold"}`}>
                        <ThumbsUp size={16} />
                      </button>
                      <button onClick={() => handleFeedback(card, "disliked")} className={`transition-colors ${isDisliked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                        <ThumbsDown size={16} />
                      </button>
                      <button onClick={() => saveMeal(card)} className={`transition-colors ${isSaved ? "text-gold" : "text-muted-foreground hover:text-gold"}`}>
                        <Star size={16} fill={isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
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
            onChange={e => setCraving(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCraving()}
            placeholder="I'm craving..."
            className="w-full rounded-lg border border-border bg-input pl-4 pr-10 py-2.5 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button
            onClick={handleCraving}
            disabled={cravingPopup?.loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {cravingPopup?.loading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Send size={14} />}
          </button>
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
            <button onClick={clearAllFilters} className="shrink-0 font-body text-xs text-muted-foreground hover:text-foreground">
              Clear All
            </button>
          </div>
        )}

        {/* Meal suggestion filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { key: "cookTime", label: "Cook Time", icon: Clock, active: !!filterCookTime },
            { key: "protein", label: "Protein", icon: Flame, active: !!filterProtein },
            { key: "people", label: "People", icon: Users, active: !!filterPeople },
            { key: "method", label: "Method", icon: UtensilsCrossed, active: !!filterMethod },
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
          <button
            onClick={() => setFilterInStockOnly(!filterInStockOnly)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
              filterInStockOnly ? "border-gold bg-gold/10 text-foreground" : "border-border bg-card text-muted-foreground"
            }`}
          >
            In-Stock Only
          </button>
        </div>

        {/* Quick filters */}
        {quickFilters.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {quickFilters.map(f => (
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

      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div className="flex justify-center py-2" style={{ height: pullDistance }}>
          <RefreshCw size={18} className={`text-gold transition-transform ${pullRefreshing ? "animate-spin" : ""}`} style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
        </div>
      )}

      {/* Sections */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-24 overscroll-none"
      >
        {activeSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="font-body text-sm text-muted-foreground">
              Turn on some meal schedules in Settings to see suggestions here.
            </p>
          </div>
        ) : (
          activeSections.map(section => {
            const isLoading = aiLoading[section.id];
            const cards = getCardsForSection(section.id);
            if (cards.length === 0 && !isLoading) return null;
            return (
              <div key={section.id} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-base font-bold text-foreground">{section.name}</h2>
                  <button
                    onClick={() => shuffleSection(section.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-muted-foreground hover:text-gold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    <span className="font-body text-xs">Shuffle</span>
                  </button>
                </div>
                {isLoading && cards.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="rounded-lg border border-border bg-card p-3 animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cards.map(card => renderMealCard(card, section.id.startsWith("baby_"), section.id))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {renderFilterSheet()}
      {renderCravingPopup()}
    </div>
  );


  function renderMealCard(card: MealCardWithCookTime, isBaby = false, sectionId?: string) {
    const cuisineTag = getCuisineTag(card);
    const isLiked = likedMeals.has(card.name);
    const isDisliked = dislikedMeals.has(card.name);
    const isSaved = savedMealNames.has(card.name);

    return (
      <div
        key={card.name}
        className={`rounded-lg border bg-card overflow-hidden transition-colors ${isLiked ? "border-gold/40" : "border-border"}`}
      >
        <button onClick={() => openRecipe(card, isBaby, sectionId)} className="text-left w-full">
          <div className="p-3">
            <p className="font-body text-sm font-medium text-foreground leading-tight">{card.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-body text-xs text-muted-foreground">{card.cal} cal</span>
              <span className="font-body text-xs text-muted-foreground">P:{card.protein}g C:{card.carbs}g F:{card.fat}g</span>
              {card.cookTime && <span className="font-body text-xs text-muted-foreground">{card.cookTime} min</span>}
            </div>
            {cuisineTag && (
              <span className="inline-block mt-1 rounded-full bg-secondary px-2 py-0.5 font-body text-xs text-muted-foreground">{cuisineTag}</span>
            )}
          </div>
        </button>
        <div className="flex items-center justify-end gap-3 px-3 pb-2">
          <button
            onClick={() => handleFeedback(card, "liked")}
            className={`transition-colors ${isLiked ? "text-gold" : "text-muted-foreground hover:text-gold"}`}
          >
            <ThumbsUp size={16} />
          </button>
          <button
            onClick={() => handleFeedback(card, "disliked")}
            className={`transition-colors ${isDisliked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
          >
            <ThumbsDown size={16} />
          </button>
          <button
            onClick={() => saveMeal(card, sectionId)}
            className={`transition-colors ${isSaved ? "text-gold" : "text-muted-foreground hover:text-gold"}`}
          >
            <Star size={16} fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    );
  }
}
