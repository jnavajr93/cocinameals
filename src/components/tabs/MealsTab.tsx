import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { RefreshCw, Star, Send, ThumbsUp, ThumbsDown, ChevronDown, X, Filter, Clock, Flame, UtensilsCrossed, ArrowLeft, Users, ShoppingCart, Check } from "lucide-react";
import { CookingAssistantChat } from "@/components/CookingAssistantChat";
import { RecipeDisplay } from "@/components/RecipeDisplay";
import { extractIngredientName, findPantryMatch } from "@/lib/ingredientMatch";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { MealCard } from "@/data/mealPools";
import { DEFAULT_SECTION_TIMES } from "@/data/mealSections";
import { toast } from "sonner";
import { getRecentSuggestions, addRecentSuggestions } from "@/lib/mealCache";
import { queryRecipes, sectionToCategory, RecipeResult } from "@/lib/recipeQuery";

interface MealCardWithCookTime extends MealCard {
  cookTime?: number;
  missingIngredients?: string[];
}

interface RecipeViewState {
  mealName: string;
  recipeText: string;
  loading: boolean;
  isBaby?: boolean;
  sectionId?: string;
  tags?: string[];
  discoverMode?: boolean;
  missingIngredients?: string[];
}

export function MealsTab() {
  const { householdId, userName } = useHousehold();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [craving, setCraving] = useState("");
  const [shuffleKey, setShuffleKey] = useState(() => Math.floor(Math.random() * 100000));
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [mealSections, setMealSections] = useState<{ id: string; name: string; enabled: boolean; order: number }[]>([]);
  const [aiCards, setAiCards] = useState<Record<string, MealCardWithCookTime[]>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  // removed shuffleCooldowns — instant shuffle from local pool
  const [batchLoaded, setBatchLoaded] = useState(false);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user?.id}` }, () => {
        loadMealsData();
        setAiCards({});
        setBatchLoaded(false);
        setShuffleKey(k => k + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId, user?.id]);

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
      setBatchLoaded(false);
      setShuffleKey(k => k + 1);
      await loadMealsData();
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
    if (filterMethod) list.push({ key: "method", label: filterMethod });
    if (filterProtein) list.push({ key: "protein", label: filterProtein });
    if (filterPeople) list.push({ key: "people", label: filterPeople });
    if (filterCuisine) list.push({ key: "cuisine", label: filterCuisine });
    if (filterMustInclude) list.push({ key: "mustInclude", label: filterMustInclude });
    if (activeFilter) list.push({ key: "quick", label: activeFilter });
    return list;
  }, [filterCookTime, filterProtein, filterCuisine, filterMethod, filterMustInclude, activeFilter]);

  // Auto-refresh all sections when any filter changes
  const filtersSignature = JSON.stringify([filterCookTime, filterProtein, filterPeople, filterCuisine, filterMethod, filterInStockOnly, filterMustInclude, activeFilter]);
  const prevFiltersRef = useRef(filtersSignature);

  useEffect(() => {
    if (prevFiltersRef.current !== filtersSignature && activeSections.length > 0 && profile) {
      prevFiltersRef.current = filtersSignature;
      setAiCards({});
      setBatchLoaded(false);
    }
  }, [filtersSignature, activeSections.length, profile]);




  const clearFilter = (key: string) => {
    if (key === "cookTime") setFilterCookTime(null);
    if (key === "protein") setFilterProtein(null);
    if (key === "people") setFilterPeople(null);
    if (key === "cuisine") setFilterCuisine(null);
    if (key === "method") setFilterMethod(null);
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
    return [];
  };

  const saveMeal = async (card: MealCardWithCookTime, sectionId?: string) => {
    if (!householdId) return;
    if (savedMealNames.has(card.name)) {
      await supabase.from("saved_recipes").delete().eq("household_id", householdId).eq("meal_name", card.name);
      setSavedMealNames(prev => { const n = new Set(prev); n.delete(card.name); return n; });
      toast.success("Removed from saved");
    } else {
      const cacheKey = getRecipeCacheKey(card.name);
      let recipeText = "";
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { text } = JSON.parse(cached);
          recipeText = text || "";
        }
      } catch {}

      if (!recipeText) {
        recipeText = buildLocalRecipeText(card, false, sectionId);
        persistRecipeLocally(card.name, recipeText);
      }

      const { error } = await supabase.from("saved_recipes").insert({
        household_id: householdId,
        meal_name: card.name,
        recipe_text: recipeText,
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

  const getRecipeCacheKey = useCallback((mealName: string) => {
    return `recipe_${mealName.replace(/\s+/g, "_").toLowerCase()}`;
  }, []);

  const trackRecentMeals = useCallback((meals: MealCardWithCookTime[]) => {
    addRecentSuggestions(meals.map(m => m.name));
  }, []);

  const persistRecipeLocally = useCallback((mealName: string, recipeText: string) => {
    localStorage.setItem(getRecipeCacheKey(mealName), JSON.stringify({ text: recipeText, ts: Date.now() }));
  }, [getRecipeCacheKey]);

  const buildLocalRecipeText = useCallback((card: MealCardWithCookTime, isBaby = false, sectionId?: string) => {
    const mealNameLower = card.name.toLowerCase();
    const proteinHint = mealNameLower.includes("chicken") ? "chicken" :
      mealNameLower.includes("beef") || mealNameLower.includes("steak") ? "beef" :
      mealNameLower.includes("pork") ? "pork" :
      mealNameLower.includes("shrimp") ? "shrimp" :
      mealNameLower.includes("salmon") || mealNameLower.includes("fish") ? "fish" :
      mealNameLower.includes("tofu") ? "tofu" :
      mealNameLower.includes("egg") ? "eggs" : "protein of choice";

    const pantryBased = pantryInStock.slice(0, 6);
    const defaults = [proteinHint, "onion", "garlic", "olive oil", "salt", "black pepper"];
    const mergedIngredients = Array.from(new Set([...pantryBased, ...defaults])).slice(0, 8);
    const cookTime = card.cookTime ?? DEFAULT_SECTION_TIMES[sectionId || "dinner"] ?? 30;
    const missing = card.missingIngredients || [];

    const ingredientLines = [
      ...mergedIngredients.map(item => `- ${item}`),
      ...missing.map(item => `- ${item}`),
    ].join("\n");

    const babySafety = isBaby
      ? "\nBABY SERVING NOTES\n- No honey, no added salt, no added sugar.\n- Serve soft, fingertip-size pieces and cool to lukewarm before serving."
      : "";

    return [
      "INGREDIENT LIST",
      ingredientLines,
      "",
      "PREP FIRST",
      "1. Wash, peel, and chop all produce before heat is on.",
      `2. Measure seasonings and prep ${proteinHint} so cooking stays smooth.`,
      "",
      "COOKING STEPS",
      "Step 1 — pan: medium heat.",
      "Add oil and aromatics; cook 2-3 minutes until fragrant.",
      "  - Use olive oil and onion",
      "  - Done when: onions are translucent and smell sweet.",
      "Step 2 — pan: medium-high heat.",
      `Add ${proteinHint} and sear, stirring as needed for even browning.`,
      `  - Use ${proteinHint}`,
      "  - Done when: protein is cooked through and lightly caramelized.",
      "Step 3 — pan: medium-low heat.",
      `Add remaining ingredients and simmer 4-6 minutes; adjust texture for ${card.name}.`,
      "  - Use remaining prepared ingredients",
      "  - Done when: sauce lightly coats the spoon and flavors are balanced.",
      "",
      "NEXT LEVEL TIP: Deglaze the pan with a small splash of water and fold that flavor back into the dish for more depth.",
      "",
      `ESTIMATED: ${Math.round(card.cal || 450)} cal | P:${Math.round(card.protein || 25)}g C:${Math.round(card.carbs || 35)}g F:${Math.round(card.fat || 18)}g`,
      `SERVES: 2 people | Cook time: ${cookTime} min`,
      babySafety,
    ].join("\n").trim();
  }, [pantryInStock]);

  const getLocalCravingPicks = useCallback((query: string, count: number): MealCardWithCookTime[] => {
    // Craving picks now come from AI only — no local pool needed
    return [];
  }, []);


    const { category, isBaby } = sectionToCategory(sectionId);
    return {
      category,
      isBaby,
      cuisineSliders: profile?.cuisineSliders || {},
      skillLevel: profile?.skillLevel || "intermediate",
      spiceTolerance: profile?.spiceTolerance || "medium",
      weeknightTime: profile?.weeknightTime || "30min",
      dietRestrictions: profile?.dietRestrictions || [],
      equipment: profile?.equipment || [],
      dislikedMeals: Array.from(dislikedMeals),
      pantryInStock,
      inStockOnly: filterInStockOnly,
      filterCookTime,
      filterProtein,
      filterCuisine,
      filterMethod,
      activeFilter,
    };
  }, [profile, dislikedMeals, pantryInStock, filterInStockOnly, filterCookTime, filterProtein, filterCuisine, filterMethod, activeFilter]);

  const shuffleSection = async (sectionId: string) => {
    setAiLoading(prev => ({ ...prev, [sectionId]: true }));
    try {
      const params = buildQueryParams(sectionId);
      const results = await queryRecipes(params);
      if (results.length > 0) {
        const cards: MealCardWithCookTime[] = results;
        setAiCards(prev => ({ ...prev, [sectionId]: cards }));
        trackRecentMeals(cards);
      }
    } catch (err) {
      console.error("Shuffle error:", err);
    }
    setAiLoading(prev => ({ ...prev, [sectionId]: false }));
  };

  // Batch load all active sections at once
  const batchLoadSections = async (sections: { id: string; name: string }[]) => {
    const loadingUpdate: Record<string, boolean> = {};
    sections.forEach(s => { loadingUpdate[s.id] = true; });
    setAiLoading(prev => ({ ...prev, ...loadingUpdate }));

    // Query all sections in parallel
    const promises = sections.map(async (section) => {
      try {
        const params = buildQueryParams(section.id);
        const results = await queryRecipes(params);
        return { sectionId: section.id, results };
      } catch {
        return { sectionId: section.id, results: [] as RecipeResult[] };
      }
    });

    const allResults = await Promise.all(promises);
    const newCards: Record<string, MealCardWithCookTime[]> = {};
    const loadingClear: Record<string, boolean> = {};

    for (const { sectionId, results } of allResults) {
      if (results.length > 0) {
        newCards[sectionId] = results;
        trackRecentMeals(results);
      }
      loadingClear[sectionId] = false;
    }

    setAiCards(prev => ({ ...prev, ...newCards }));
    setAiLoading(prev => ({ ...prev, ...loadingClear }));
  };

  // Trigger batch load when active sections and profile are ready
  useEffect(() => {
    if (activeSections.length > 0 && profile && !batchLoaded) {
      setBatchLoaded(true);
      batchLoadSections(activeSections);
    }
  }, [activeSections.length, profile, batchLoaded]);

  const handleCraving = async () => {
    const text = craving.trim();
    if (!text) return;

    setCravingPopup({ meals: [], loading: true });

    const localPicks = getLocalCravingPicks(text, 3);
    if (localPicks.length >= 3) {
      setCravingPopup({ meals: localPicks, loading: false });
      trackRecentMeals(localPicks);
      setCraving("");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("suggest-meals", {
        body: {
          craving: text,
          count: 3,
          pantryItems: pantryInStock,
          expiringItems,
          profile,
          filters: { cookTime: filterCookTime, mainProtein: filterProtein, cuisineOverride: filterCuisine, cookingMethod: filterMethod, inStockOnly: filterInStockOnly, quickFilterChip: activeFilter },
          feedback: { likedTags: [], dislikedMeals: Array.from(dislikedMeals) },
          recentSuggestions: getRecentSuggestions(),
        },
      });
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        setCravingPopup({ meals: data.slice(0, 3), loading: false });
        trackRecentMeals(data.slice(0, 3));
      } else if (localPicks.length > 0) {
        setCravingPopup({ meals: localPicks, loading: false });
        trackRecentMeals(localPicks);
      } else {
        setCravingPopup({ meals: [], loading: false });
      }
    } catch {
      if (localPicks.length > 0) {
        setCravingPopup({ meals: localPicks, loading: false });
        trackRecentMeals(localPicks);
      } else {
        toast.error("No local matches yet — try a broader craving");
        setCravingPopup(null);
      }
    }

    setCraving("");
  };

  const openRecipe = async (card: MealCardWithCookTime, isBaby = false, sectionId?: string) => {
    const cacheKey = getRecipeCacheKey(card.name);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { text, ts } = JSON.parse(cached);
        if (Date.now() - ts < 24 * 3600000) {
          setRecipeView({ mealName: card.name, recipeText: text, loading: false, isBaby, sectionId, tags: card.tags, discoverMode: !filterInStockOnly, missingIngredients: card.missingIngredients });
          return;
        }
      } catch {}
    }

    setRecipeView({ mealName: card.name, recipeText: "", loading: true, isBaby, sectionId, tags: card.tags, discoverMode: !filterInStockOnly, missingIngredients: card.missingIngredients });

    try {
      const localRecipe = buildLocalRecipeText(card, isBaby, sectionId);
      persistRecipeLocally(card.name, localRecipe);
      setRecipeView({
        mealName: card.name,
        recipeText: localRecipe,
        loading: false,
        isBaby,
        sectionId,
        tags: card.tags,
        discoverMode: !filterInStockOnly,
        missingIngredients: card.missingIngredients,
      });
    } catch {
      toast.error("Couldn't open recipe. Try another meal.");
      setRecipeView(prev => prev ? { ...prev, loading: false, recipeText: "Failed to load local recipe." } : null);
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

  const getCachedRecipeText = (mealName: string) => {
    const cacheKey = getRecipeCacheKey(mealName);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return "";
      return JSON.parse(cached).text || "";
    } catch {
      return "";
    }
  };

  const addMealToShoppingCart = async (meal: {
    name: string;
    tags?: string[];
    recipeText?: string;
    missingIngredients?: string[];
  }) => {
    if (!householdId) return;

    try {
      const fallbackMissing = Object.values(aiCards)
        .flat()
        .find(c => c.name === meal.name)?.missingIngredients || [];
      const missingIngredients = (meal.missingIngredients && meal.missingIngredients.length > 0
        ? meal.missingIngredients
        : fallbackMissing).filter(Boolean);

      let newItemsCount = 0;
      let skippedCount = 0;

      if (missingIngredients.length > 0) {
        const { data: existingItems } = await supabase
          .from("pantry_items")
          .select("name, in_stock")
          .eq("household_id", householdId);

        const allPantryNames = (existingItems || []).map(item => item.name);

        for (const ingredient of missingIngredients) {
          const cleanName = extractIngredientName(ingredient);
          const match = findPantryMatch(cleanName, allPantryNames);
          if (match) {
            skippedCount++;
          } else {
            const { error } = await supabase.from("pantry_items").insert({
              household_id: householdId,
              name: cleanName,
              category: "Shopping List",
              in_stock: false,
              is_custom: true,
              is_hidden: false,
            });
            if (!error) newItemsCount++;
          }
        }
      }

      const { data: existingRecipe, error: existingRecipeError } = await supabase
        .from("saved_recipes")
        .select("id")
        .eq("household_id", householdId)
        .eq("meal_name", meal.name)
        .eq("meal_section", "shopping_cart")
        .maybeSingle();

      if (existingRecipeError) throw existingRecipeError;

      if (!existingRecipe) {
        const { error: saveError } = await supabase.from("saved_recipes").insert({
          household_id: householdId,
          meal_name: meal.name,
          recipe_text: meal.recipeText || getCachedRecipeText(meal.name) || `Recipe for ${meal.name}`,
          saved_by: userName,
          meal_section: "shopping_cart",
          tags: meal.tags || [],
        } as any);

        if (saveError) throw saveError;
      }

      if (missingIngredients.length > 0) {
        const ingredientsMessage = newItemsCount > 0
          ? `${newItemsCount} ingredient${newItemsCount > 1 ? "s" : ""} added${skippedCount > 0 ? ` (${skippedCount} already there)` : ""}`
          : "All ingredients already in your list";
        const mealMessage = existingRecipe ? "Already in shopping cart" : "Added to shopping cart";
        toast.success(`${mealMessage} · ${ingredientsMessage}`);
        return;
      }

      toast.success(existingRecipe ? "Already in shopping cart" : "Added to shopping cart");
    } catch {
      toast.error("Couldn't add to shopping cart");
    }
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

      const shareText = `🍽️ ${recipeView.mealName} - from Cocina app.\n\nCook restaurant-quality meals with what you already have. Sign up free today!`;

      if (navigator.share) {
        await navigator.share({
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast.success("Share link copied to clipboard!");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error("Couldn't share recipe. Try again.");
      }
    }
  };

  // Missing ingredients button state
  const [addedMissing, setAddedMissing] = useState<"idle" | "added" | "all_in_stock">("idle");

  const addMissingIngredientsFromRecipe = async (missingNames?: string[]) => {
    if (!householdId) return;

    try {
      // Use passed missing names or parse from recipe
      let toProcess: string[] = missingNames || [];

      if (toProcess.length === 0 && recipeView) {
        const lines = recipeView.recipeText.split("\n");
        let inIngredients = false;
        for (const line of lines) {
          const trimmed = line.trim();
          const upper = trimmed.toUpperCase();
          if (upper === "INGREDIENT LIST" || upper === "INGREDIENTS") { inIngredients = true; continue; }
          if (upper === "PREP FIRST" || upper === "PREP STEPS" || upper === "PREPARATION" || upper === "COOKING STEPS" || upper === "COOKING") { inIngredients = false; continue; }
          if (inIngredients && trimmed) {
            const cleaned = extractIngredientName(trimmed);
            if (cleaned) toProcess.push(cleaned);
          }
        }
      }

      if (toProcess.length === 0) {
        setAddedMissing("all_in_stock");
        toast.success("You already have everything for this meal.");
        return;
      }

      // Get all pantry items for this household
      const { data: pantryData } = await supabase
        .from("pantry_items")
        .select("name, in_stock")
        .eq("household_id", householdId);

      const allPantryNames = (pantryData || []).map(p => p.name);
      const inStockNames = (pantryData || []).filter(p => p.in_stock).map(p => p.name);

      let addedCount = 0;
      let alreadyCount = 0;

      for (const ingredientName of toProcess) {
        // Check if already in stock via smart match
        const stockMatch = findPantryMatch(ingredientName, inStockNames);
        if (stockMatch) {
          alreadyCount++;
          continue;
        }

        // Check if exists in pantry (not in stock) — just needs to go to shopping list
        const pantryMatch = findPantryMatch(ingredientName, allPantryNames);
        if (pantryMatch) {
          // Item exists but not in stock — mark it as a shopping list need
          // Check if already on shopping list
          const existingItem = (pantryData || []).find(p => p.name === pantryMatch);
          if (existingItem && !existingItem.in_stock) {
            alreadyCount++;
          } else {
            // It's in stock, skip
            alreadyCount++;
          }
          continue;
        }

        // No match found — add as new shopping list item with clean name
        const { error } = await supabase.from("pantry_items").insert({
          household_id: householdId,
          name: ingredientName,
          category: "Shopping List",
          in_stock: false,
          is_custom: true,
          is_hidden: false,
        });
        if (!error) addedCount++;
      }

      if (addedCount === 0 && alreadyCount === toProcess.length) {
        setAddedMissing("all_in_stock");
        toast.success("Everything's already in your pantry or shopping list!");
      } else {
        setAddedMissing("added");
        toast.success(`${addedCount} ingredient${addedCount !== 1 ? "s" : ""} added to shopping list${alreadyCount > 0 ? ` (${alreadyCount} already there)` : ""}`);
      }
    } catch {
      toast.error("Couldn't add ingredients. Try again.");
    }
  };

  // Reset missing state when recipe changes
  useEffect(() => {
    setAddedMissing("idle");
  }, [recipeView?.mealName]);

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
            onClick={() => addMealToShoppingCart({
              name: recipeView.mealName,
              tags: recipeView.tags,
              recipeText: recipeView.recipeText,
            })}
            className="shrink-0 text-muted-foreground hover:text-gold transition-colors"
            title="Add to shopping cart"
          >
            <ShoppingCart size={16} />
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
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          {recipeView.loading && !recipeView.recipeText ? (
            <div className="space-y-3 mt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          ) : (
            <>
              <RecipeDisplay
                text={recipeView.recipeText}
                loading={recipeView.loading}
                pantryInStock={pantryInStock}
                discoverMode={recipeView.discoverMode}
                onAddMissingToShoppingList={addMissingIngredientsFromRecipe}
                addedMissing={addedMissing}
              />
            </>
          )}
        </div>
        {/* Cooking assistant */}
        {recipeView.recipeText && !recipeView.loading && (
          <CookingAssistantChat
            recipeName={recipeView.mealName}
            recipeText={recipeView.recipeText}
            equipment={profile?.equipment || []}
            skillLevel={profile?.skillLevel || "intermediate"}
          />
        )}
      </div>
    );
  }

  // Filter bottom sheet
  const renderFilterSheet = () => {
    if (!showFilterSheet) return null;
    const options: Record<string, { label: string; value: string }[]> = {
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
        { label: "Grill", value: "Grill" },
        { label: "Griddle", value: "Griddle" },
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
                        {card.cookTime && (
                          <span className="flex items-center gap-1 font-body text-xs text-muted-foreground">
                            <Clock size={10} />
                            {card.cookTime} min
                          </span>
                        )}
                        <span className="font-body text-xs text-muted-foreground">{card.cal} cal</span>
                        <span className="font-body text-xs text-muted-foreground">P:{card.protein}g C:{card.carbs}g F:{card.fat}g</span>
                      </div>
                      {cuisineTag && (
                        <span className="inline-block mt-1 rounded-full bg-secondary px-2 py-0.5 font-body text-xs text-muted-foreground">{cuisineTag}</span>
                      )}
                    </button>
                    <div className="flex items-center justify-end gap-3 mt-2">
                      <button
                        onClick={() => addMealToShoppingCart({
                          name: card.name,
                          tags: card.tags,
                          missingIngredients: card.missingIngredients,
                        })}
                        className="transition-colors text-muted-foreground hover:text-gold"
                        title="Add to shopping cart"
                      >
                        <ShoppingCart size={16} />
                      </button>
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
            placeholder={filterInStockOnly ? "I'm craving..." : "I'm craving... (beyond your pantry)"}
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

        {/* In My Pantry / Discover toggle */}
        <div className="flex flex-col mb-2">
          <div className="flex items-center rounded-full bg-secondary p-0.5 w-fit">
            <button
              onClick={() => setFilterInStockOnly(true)}
              className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                filterInStockOnly ? "bg-gold text-gold-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              In My Pantry
            </button>
            <button
              onClick={() => setFilterInStockOnly(false)}
              className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                !filterInStockOnly ? "bg-gold text-gold-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              ✨ Discover
            </button>
          </div>
          {!filterInStockOnly && (
            <p className="font-body text-xs text-muted-foreground mt-1 ml-1">Showing meals beyond your current pantry</p>
          )}
        </div>

        {/* Meal suggestion filters */}
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
                    className={`flex items-center gap-1 transition-colors disabled:opacity-40 text-muted-foreground hover:text-gold`}
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
    const hasMissing = !filterInStockOnly && card.missingIngredients && card.missingIngredients.length > 0;

    const addToShoppingCart = async (e: React.MouseEvent) => {
      e.stopPropagation();
      await addMealToShoppingCart({
        name: card.name,
        tags: card.tags,
        missingIngredients: card.missingIngredients,
      });
    };

    return (
      <div
        key={card.name}
        className={`rounded-lg border bg-card overflow-hidden transition-colors ${isLiked ? "border-gold/40" : "border-border"}`}
      >
        <button onClick={() => openRecipe(card, isBaby, sectionId)} className="text-left w-full">
          <div className="p-3">
            <p className="font-body text-sm font-medium text-foreground leading-tight">{card.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {card.cookTime && (
                <span className="flex items-center gap-1 font-body text-xs text-muted-foreground">
                  <Clock size={10} />
                  {card.cookTime} min
                </span>
              )}
              <span className="font-body text-xs text-muted-foreground">{card.cal} cal</span>
              <span className="font-body text-xs text-muted-foreground">P:{card.protein}g C:{card.carbs}g F:{card.fat}g</span>
            </div>
            {cuisineTag && (
              <span className="inline-block mt-1 rounded-full bg-secondary px-2 py-0.5 font-body text-xs text-muted-foreground">{cuisineTag}</span>
            )}
          </div>
        </button>
        {hasMissing && (
          <div className="px-3 pb-1">
            <p className="font-body text-xs text-destructive leading-snug">
              Need: {card.missingIngredients!.join(", ")}
            </p>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 px-3 pb-2">
          <button
            onClick={addToShoppingCart}
            className="text-muted-foreground hover:text-gold transition-colors"
            title="Add to shopping cart"
          >
            <ShoppingCart size={16} />
          </button>
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
