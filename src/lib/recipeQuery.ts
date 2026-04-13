/**
 * Database-backed meal suggestion engine.
 * Queries the `recipes` table with all user filters applied,
 * fetches 500 rows per category via random offset, shuffles client-side,
 * and paginates through the shuffled pool with deduplication.
 */

import { supabase } from "@/integrations/supabase/client";
import { getRecentSuggestions } from "./mealCache";
import { extractIngredientName, findPantryMatch } from "./ingredientMatch";

export interface RecipeResult {
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  cookTime: number;
  tags: string[];
  cuisine: string;
  primaryProtein: string | null;
  missingIngredients?: string[];
  recipeText?: string | null;
  matchScore?: number;
}

interface QueryParams {
  category: string;
  isBaby: boolean;
  cuisineSliders: Record<string, number>;
  skillLevel: string;
  spiceTolerance: string;
  weeknightTime: string;
  dietRestrictions: string[];
  equipment: string[];
  dislikedMeals: string[];
  pantryInStock: string[];
  inStockOnly: boolean;
  filterCookTime?: string | null;
  filterProtein?: string | null;
  filterCuisine?: string | null;
  filterMethod?: string | null;
  activeFilter?: string | null;
  page?: number;
  pageSize?: number;
}

// Map cuisine slider names to DB cuisine values
const CUISINE_NAME_MAP: Record<string, string> = {
  "Mexican": "mexican",
  "Chinese": "chinese",
  "Japanese": "japanese",
  "Korean": "korean",
  "Thai": "thai",
  "Vietnamese": "vietnamese",
  "Indian": "indian",
  "Mediterranean": "mediterranean",
  "Italian": "italian",
  "American": "american",
  "Latin American": "latin_american",
  "Caribbean": "caribbean",
  "African": "african",
  "French": "french",
  "Seafood": "seafood",
  "Filipino": "filipino",
  "Middle Eastern": "middle_eastern",
  "Greek": "greek",
  "Southern / Soul Food": "southern",
  "BBQ": "bbq",
};

function getSkillLevels(skill: string): string[] {
  switch (skill) {
    case "beginner": return ["beginner"];
    case "intermediate": return ["beginner", "intermediate"];
    case "confident": return ["beginner", "intermediate", "confident"];
    default: return ["beginner", "intermediate"];
  }
}

function getSpiceLevels(tolerance: string): string[] {
  switch (tolerance) {
    case "none": return ["none"];
    case "mild": return ["none", "mild"];
    case "medium": return ["none", "mild", "medium"];
    case "hot": return ["none", "mild", "medium", "hot"];
    case "extra hot": return ["none", "mild", "medium", "hot", "extra_hot"];
    default: return ["none", "mild", "medium"];
  }
}

function getCookTimeMax(filter: string | null | undefined, weeknightTime: string): number | null {
  const source = filter || weeknightTime;
  if (!source) return null;
  const s = source.toLowerCase();
  if (s.includes("no cook") || s === "0") return 0;
  if (s.includes("15") || s === "under 15 min") return 15;
  if (s.includes("20") || s === "under 20 min") return 20;
  if (s.includes("30") || s === "30min" || s === "30 min") return 30;
  if (s.includes("45") || s === "45min") return 45;
  if (s.includes("60") || s === "under 60 min") return 60;
  if (s.includes("no rush") || s.includes("no limit")) return null;
  return null;
}

const DIET_TAG_MAP: Record<string, string> = {
  "Vegetarian": "vegetarian",
  "Vegan": "vegan",
  "Plant-Based Whole Foods": "vegan",
  "Gluten-Free": "gluten_free",
  "Dairy-Free": "dairy_free",
  "Keto / Low Carb": "keto",
  "Halal": "halal",
  "Kosher": "kosher",
  "Nut-Free": "nut_free",
  "Shellfish-Free": "shellfish_free",
};

const PROTEIN_DB_MAP: Record<string, string[]> = {
  "Tilapia": ["Fish", "Tilapia"],
  "Salmon": ["Salmon", "Fish"],
  "Tuna": ["Tuna", "Fish"],
  "Shrimp": ["Shrimp", "Seafood"],
  "Seafood": ["Seafood", "Salmon", "Shrimp", "Tuna", "Fish"],
};

const METHOD_TAG_MAP: Record<string, string[]> = {
  "Air Fryer Only": ["air_fryer", "quick"],
  "Oven Only": ["comfort", "one_pan"],
  "Griddle": ["grill", "one_pan"],
  "One Pan": ["one_pan"],
  "Grill": ["grill"],
};

function calculateMatchScore(recipe: any, pantryInStock: string[]): number {
  const ingredients: string[] = recipe.ingredients || [];
  if (ingredients.length === 0) return 100;
  const staples = new Set(["salt", "pepper", "black pepper", "water", "oil", "olive oil", "cooking spray", "ice"]);
  const nonStaple = ingredients.filter((ing: string) => {
    const cleaned = extractIngredientName(ing).toLowerCase();
    return !staples.has(cleaned);
  });
  if (nonStaple.length === 0) return 100;
  const stockNames = pantryInStock.map(i => i.toLowerCase());
  const matched = nonStaple.filter((ing: string) => {
    const cleaned = extractIngredientName(ing).toLowerCase();
    return findPantryMatch(cleaned, stockNames) !== null;
  }).length;
  return Math.round((matched / nonStaple.length) * 100);
}

// ── Session pool: fetch once, shuffle, paginate ──────────────────────

interface SessionPool {
  recipes: any[];
  filterKey: string;
  fetchedAt: number;
}

const sessionPools = new Map<string, SessionPool>();
const sessionShownNames = new Set<string>();

function buildFilterKey(params: QueryParams): string {
  return JSON.stringify([
    params.category, params.isBaby, params.skillLevel, params.spiceTolerance,
    params.filterCookTime, params.filterProtein, params.filterCuisine,
    params.filterMethod, params.activeFilter, params.inStockOnly,
    params.weeknightTime,
  ]);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clearSessionPools(): void {
  sessionPools.clear();
  sessionShownNames.clear();
}

async function getOrFetchPool(params: QueryParams): Promise<any[]> {
  const poolKey = `${params.category}_${params.isBaby}`;
  const filterKey = buildFilterKey(params);
  const existing = sessionPools.get(poolKey);

  if (existing && existing.filterKey === filterKey && (Date.now() - existing.fetchedAt) < 10 * 60 * 1000) {
    return existing.recipes;
  }

  const {
    category, isBaby, cuisineSliders, skillLevel, spiceTolerance,
    weeknightTime, dietRestrictions, equipment, dislikedMeals,
    pantryInStock, inStockOnly,
    filterCookTime, filterProtein, filterCuisine, filterMethod, activeFilter,
  } = params;

  let query = supabase
    .from("recipes" as any)
    .select("*")
    .eq("category", category)
    .eq("is_baby", isBaby);

  query = query.in("skill_level", getSkillLevels(skillLevel));
  query = query.in("spice_level", getSpiceLevels(spiceTolerance));

  const weeknightCategories = ["breakfast", "lunch", "dinner", "snack"];
  const maxCook = getCookTimeMax(filterCookTime, weeknightCategories.includes(category) ? weeknightTime : "");
  if (maxCook !== null) {
    query = query.lte("cook_time", maxCook);
  }

  if (filterProtein) {
    const dbProteins = PROTEIN_DB_MAP[filterProtein] || [filterProtein];
    query = query.in("primary_protein", dbProteins);
  }

  const excludedCuisines: string[] = [];
  if (filterCuisine && filterCuisine !== "Surprise Me") {
    const dbCuisine = CUISINE_NAME_MAP[filterCuisine] || filterCuisine.toLowerCase();
    query = query.eq("cuisine", dbCuisine);
  } else {
    for (const [displayName, sliderVal] of Object.entries(cuisineSliders)) {
      if (sliderVal === 0) {
        const dbName = CUISINE_NAME_MAP[displayName] || displayName.toLowerCase().replace(/[^a-z]/g, "_");
        excludedCuisines.push(dbName);
      }
    }
  }

  // Fetch up to 1000 rows from the filtered result set, then shuffle client-side
  // NOTE: range() operates on filtered result positions, NOT raw table offsets,
  // so a random offset would miss most rows when filters are applied.
  const fetchSize = 1000;
  query = query.limit(fetchSize);

  const { data, error } = await query;
  if (error) {
    console.error("Recipe query error:", error);
    return [];
  }

  let results: any[] = data || [];

  // Client-side filters
  const excludeNames = new Set(dislikedMeals);
  if (excludeNames.size > 0) {
    results = results.filter((r: any) => !excludeNames.has(r.name));
  }

  if (excludedCuisines.length > 0) {
    const exSet = new Set(excludedCuisines);
    results = results.filter((r: any) => !exSet.has(r.cuisine));
  }

  const activeDiets = (dietRestrictions || []).filter(d => d !== "None");
  if (activeDiets.length > 0) {
    results = results.filter((r: any) => {
      const tags: string[] = r.tags || [];
      return activeDiets.every(diet => {
        const requiredTag = DIET_TAG_MAP[diet];
        return requiredTag ? tags.includes(requiredTag) : true;
      });
    });
  }

  if (equipment.length > 0) {
    const ownedSet = new Set(equipment.map(e => e.toLowerCase()));
    results = results.filter((r: any) => {
      const needed: string[] = r.equipment || [];
      return needed.every((eq: string) => ownedSet.has(eq.toLowerCase()));
    });
  }

  if (filterMethod) {
    const mappedTags = METHOD_TAG_MAP[filterMethod];
    if (mappedTags) {
      results = results.filter((r: any) => {
        const tags: string[] = r.tags || [];
        return tags.some(t => mappedTags.includes(t));
      });
    } else {
      const methodTag = filterMethod.toLowerCase().replace(/\s+/g, "_").replace(/_only$/, "");
      results = results.filter((r: any) => {
        const tags: string[] = r.tags || [];
        return tags.some(t => t.includes(methodTag));
      });
    }
  }

  if (activeFilter) {
    const chipTag = activeFilter.toLowerCase().replace(/[^a-z0-9]/g, "_");
    results = results.filter((r: any) => {
      const tags: string[] = r.tags || [];
      return tags.some(t => t.includes(chipTag) || chipTag.includes(t));
    });
  }

  // In-stock pantry filter
  if (inStockOnly && pantryInStock.length > 0) {
    const stockNames = pantryInStock.map(i => i.toLowerCase());
    const pantryFiltered = results.filter((r: any) => {
      const ingredients: string[] = r.ingredients || [];
      if (ingredients.length === 0) return true;
      const staples = new Set(["salt", "pepper", "black pepper", "water", "oil", "olive oil", "cooking spray", "ice"]);
      const nonStaple = ingredients.filter(ing => {
        const cleaned = extractIngredientName(ing).toLowerCase();
        return !staples.has(cleaned);
      });
      if (nonStaple.length === 0) return true;
      const matchCount = nonStaple.filter((ing: string) => {
        const cleaned = extractIngredientName(ing).toLowerCase();
        return findPantryMatch(cleaned, stockNames) !== null;
      }).length;
      return matchCount >= nonStaple.length * 0.3;
    });
    if (pantryFiltered.length > 0) results = pantryFiltered;
  }

  // Apply weighted sorting by cuisine preference, then shuffle with weights
  const recentSet = new Set(getRecentSuggestions().slice(-18));
  const sliderMap = new Map<string, number>();
  for (const [displayName, val] of Object.entries(cuisineSliders)) {
    const dbName = CUISINE_NAME_MAP[displayName] || displayName.toLowerCase().replace(/[^a-z]/g, "_");
    sliderMap.set(dbName, val as number);
  }

  results = results.map(r => {
    const cuisineVal = sliderMap.get(r.cuisine);
    const weight = cuisineVal === undefined ? 50 :
      cuisineVal === 1 ? 10 :
      cuisineVal === 2 ? 25 :
      cuisineVal === 3 ? 50 :
      cuisineVal === 4 ? 100 : 50;
    const recencyBias = recentSet.has(r.name) ? 0.35 : 1;
    return { ...r, _sortWeight: weight * recencyBias + Math.random() * 20 };
  });

  results.sort((a, b) => b._sortWeight - a._sortWeight);

  // Shuffle within weight tiers to avoid pure deterministic order
  results = shuffleWithinTiers(results);

  // Deduplicate by name
  const seenNames = new Set<string>();
  results = results.filter(r => {
    if (seenNames.has(r.name)) return false;
    seenNames.add(r.name);
    return true;
  });

  sessionPools.set(poolKey, { recipes: results, filterKey, fetchedAt: Date.now() });
  return results;
}

function shuffleWithinTiers(arr: any[]): any[] {
  if (arr.length <= 1) return arr;
  const result: any[] = [];
  const chunkSize = 10;
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    result.push(...shuffleArray(chunk));
  }
  return result;
}

/**
 * Query the recipes table with all filters, paginate from session pool.
 */
export async function queryRecipes(params: QueryParams): Promise<{ results: RecipeResult[]; totalMatches: number }> {
  const {
    pantryInStock, inStockOnly,
    filterCookTime, filterProtein, filterCuisine,
  } = params;

  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 3;

  const pool = await getOrFetchPool(params);
  const totalMatches = pool.length;

  if (totalMatches === 0) {
    // AI fallback
    const { category, isBaby } = sectionToCategory(
      Object.entries({ breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack" })
        .find(([, v]) => v === params.category)?.[0] || params.category
    );
    const weeknightCategories = ["breakfast", "lunch", "dinner", "snack"];
    const maxCook = getCookTimeMax(filterCookTime, weeknightCategories.includes(params.category) ? params.weeknightTime : "");
    
    try {
      const { data, error } = await supabase.functions.invoke("suggest-and-save", {
        body: {
          category: params.category,
          protein: filterProtein || undefined,
          cuisine: filterCuisine ? (CUISINE_NAME_MAP[filterCuisine] || filterCuisine.toLowerCase()) : undefined,
          cookTimeMax: maxCook || undefined,
          count: 3,
        },
      });
      if (!error && data?.recipes?.length > 0) {
        const fallbackResults = data.recipes.slice(0, 3).map((r: any) => mapToResult(r, inStockOnly, pantryInStock));
        return { results: fallbackResults, totalMatches: fallbackResults.length };
      }
    } catch (e) {
      console.warn("AI fallback failed:", e);
    }
    return { results: [], totalMatches: 0 };
  }

  // Paginate: skip already-shown recipes
  const start = page * pageSize;
  const pageSlice = pool.slice(start, start + pageSize);

  // Filter out recipes already shown in this session for dedup
  const deduped = pageSlice.filter(r => !sessionShownNames.has(r.name));
  deduped.forEach(r => sessionShownNames.add(r.name));

  const mappedResults = deduped.map((r: any) => mapToResult(r, inStockOnly, pantryInStock));

  // Sort by matchScore descending
  mappedResults.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return { results: mappedResults, totalMatches };
}

function mapToResult(r: any, inStockOnly: boolean, pantryInStock: string[]): RecipeResult {
  return {
    name: r.name,
    cal: r.calories || 0,
    protein: r.protein || 0,
    carbs: r.carbs || 0,
    fat: r.fat || 0,
    cookTime: r.cook_time || 30,
    tags: r.tags || [],
    cuisine: r.cuisine,
    primaryProtein: r.primary_protein,
    recipeText: r.recipe_text,
    missingIngredients: inStockOnly ? undefined : getMissingIngredients(r, pantryInStock),
    matchScore: inStockOnly ? 100 : calculateMatchScore(r, pantryInStock),
  };
}

function getMissingIngredients(recipe: any, pantryInStock: string[]): string[] {
  const ingredients: string[] = recipe.ingredients || [];
  if (ingredients.length === 0) return [];
  const stockSet = new Set(pantryInStock.map(i => i.toLowerCase()));
  return ingredients.filter((ing: string) => {
    const cleaned = extractIngredientName(ing).toLowerCase();
    if (["salt", "pepper", "water", "oil", "olive oil", "black pepper"].includes(cleaned)) return false;
    return !stockSet.has(cleaned) && !Array.from(stockSet).some(s => cleaned.includes(s) || s.includes(cleaned));
  })
  .slice(0, 6)
  .map((ing: string) => extractIngredientName(ing));
}

/**
 * Map section IDs to recipe DB categories.
 */
export function sectionToCategory(sectionId: string): { category: string; isBaby: boolean } {
  const babyMap: Record<string, string> = {
    baby_breakfast: "breakfast",
    baby_lunch: "lunch",
    baby_snack: "snack",
    baby_dinner: "dinner",
    child_breakfast: "breakfast",
    child_lunch: "lunch",
    child_snack: "snack",
    child_dinner: "dinner",
  };

  if (babyMap[sectionId]) {
    const isBaby = sectionId.startsWith("baby_");
    return { category: babyMap[sectionId], isBaby };
  }

  const categoryMap: Record<string, string> = {
    breakfast: "breakfast",
    brunch: "brunch",
    quick_lunch: "lunch",
    sit_down_lunch: "lunch",
    lunch: "lunch",
    snack: "snack",
    afternoon_snack: "snack",
    dinner: "dinner",
    light_dinner: "dinner",
    full_dinner: "dinner",
    late_night: "dinner",
    date_night: "date_night",
    meal_prep: "meal_prep",
    crowd_feed: "crowd_feed",
  };

  return {
    category: categoryMap[sectionId] || sectionId,
    isBaby: false,
  };
}
