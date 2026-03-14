/**
 * Database-backed meal suggestion engine.
 * Queries the `recipes` table with all user filters applied,
 * then picks 3 results satisfying variety rules.
 */

import { supabase } from "@/integrations/supabase/client";
import { getRecentSuggestions } from "./mealCache";

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
  // Active filters from UI
  filterCookTime?: string | null;
  filterProtein?: string | null;
  filterCuisine?: string | null;
  filterMethod?: string | null;
  activeFilter?: string | null;
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
  // Active filter overrides profile setting
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

// Map UI protein filter values to DB primary_protein values
const PROTEIN_DB_MAP: Record<string, string[]> = {
  "Tilapia": ["Fish", "Tilapia"],
  "Salmon": ["Salmon", "Fish"],
  "Tuna": ["Tuna", "Fish"],
  "Shrimp": ["Shrimp", "Seafood"],
  "Seafood": ["Seafood", "Salmon", "Shrimp", "Tuna", "Fish"],
};

// Map UI method filter values to actual DB tags
const METHOD_TAG_MAP: Record<string, string[]> = {
  "Air Fryer Only": ["air_fryer", "quick"],
  "Oven Only": ["comfort", "one_pan"],
  "Griddle": ["grill", "one_pan"],
  "One Pan": ["one_pan"],
  "Grill": ["grill"],
};

/**
 * Query the recipes table with all filters, then pick 3 with variety rules.
 */
export async function queryRecipes(params: QueryParams): Promise<RecipeResult[]> {
  const {
    category, isBaby, cuisineSliders, skillLevel, spiceTolerance,
    weeknightTime, dietRestrictions, equipment, dislikedMeals,
    pantryInStock, inStockOnly,
    filterCookTime, filterProtein, filterCuisine, filterMethod, activeFilter,
  } = params;

  const recentNames = getRecentSuggestions();
  const recentSet = new Set(recentNames.slice(-18));

  // Build query
  let query = supabase
    .from("recipes" as any)
    .select("*")
    .eq("category", category)
    .eq("is_baby", isBaby);

  // Skill level
  const skillLevels = getSkillLevels(skillLevel);
  query = query.in("skill_level", skillLevels);

  // Spice level
  const spiceLevels = getSpiceLevels(spiceTolerance);
  query = query.in("spice_level", spiceLevels);

  // Cook time
  const maxCook = getCookTimeMax(filterCookTime, weeknightTime);
  if (maxCook !== null) {
    query = query.lte("cook_time", maxCook);
  }

  // Protein filter — use mapping for broader matches
  if (filterProtein) {
    const dbProteins = PROTEIN_DB_MAP[filterProtein] || [filterProtein];
    query = query.in("primary_protein", dbProteins);
  }

  // Cuisine override filter
  const excludedCuisines: string[] = [];
  if (filterCuisine && filterCuisine !== "Surprise Me") {
    const dbCuisine = CUISINE_NAME_MAP[filterCuisine] || filterCuisine.toLowerCase();
    query = query.eq("cuisine", dbCuisine);
  } else {
    // Apply cuisine slider exclusions (value 0 = "Don't like" → exclude)
    for (const [displayName, sliderVal] of Object.entries(cuisineSliders)) {
      if (sliderVal === 0) {
        const dbName = CUISINE_NAME_MAP[displayName] || displayName.toLowerCase().replace(/[^a-z]/g, "_");
        excludedCuisines.push(dbName);
      }
    }
  }

  // Hard exclude only explicit dislikes (recent meals are soft-deprioritized instead)
  const excludeNames = [...new Set(dislikedMeals)];

  // Fetch a larger pool for variety selection
  query = query.limit(100);

  const { data, error } = await query;
  if (error) {
    console.error("Recipe query error:", error);
    return [];
  }

  let results: any[] = data || [];

  // Client-side filters that are hard to do in SQL with jsonb

  // Exclude by name
  if (excludeNames.length > 0) {
    const excludeSet = new Set(excludeNames);
    results = results.filter((r: any) => !excludeSet.has(r.name));
  }

  // Excluded cuisines
  if (excludedCuisines.length > 0) {
    const exSet = new Set(excludedCuisines);
    results = results.filter((r: any) => !exSet.has(r.cuisine));
  }

  // Diet restrictions — each active restriction requires a matching tag
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

  // Equipment filter — every item in recipe's equipment must be owned
  if (equipment.length > 0) {
    const ownedSet = new Set(equipment.map(e => e.toLowerCase()));
    results = results.filter((r: any) => {
      const needed: string[] = r.equipment || [];
      return needed.every((eq: string) => ownedSet.has(eq.toLowerCase()));
    });
  }

  // Cooking method filter — use tag mapping
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

  // Quick filter chip
  if (activeFilter) {
    const chipTag = activeFilter.toLowerCase().replace(/[^a-z0-9]/g, "_");
    results = results.filter((r: any) => {
      const tags: string[] = r.tags || [];
      return tags.some(t => t.includes(chipTag) || chipTag.includes(t));
    });
  }

  // In-stock pantry filter (with fallback: if 0 results, skip pantry filter)
  let preFilterResults = results;
  if (inStockOnly && pantryInStock.length > 0) {
    const { extractIngredientName, findPantryMatch } = await import("./ingredientMatch");
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
    // Fallback: if pantry filter eliminated everything but we had results before, use unfiltered
    results = pantryFiltered.length > 0 ? pantryFiltered : preFilterResults;
  }

  // Weighted random selection based on cuisine preference + recent de-prioritization
  let pick3WithVariety = selectWithVariety(results, cuisineSliders, 3, !!filterProtein, !!filterCuisine, recentSet);

  // AI FALLBACK: if 0 results after all filters, generate via AI and save permanently
  if (pick3WithVariety.length === 0 && (filterProtein || filterCuisine || filterMethod)) {
    try {
      const { data, error } = await supabase.functions.invoke("suggest-and-save", {
        body: {
          category,
          protein: filterProtein || undefined,
          cuisine: filterCuisine ? (CUISINE_NAME_MAP[filterCuisine] || filterCuisine.toLowerCase()) : undefined,
          cookTimeMax: maxCook || undefined,
          count: 3,
        },
      });
      if (!error && data?.recipes?.length > 0) {
        pick3WithVariety = data.recipes.slice(0, 3);
      }
    } catch (e) {
      console.warn("AI fallback failed:", e);
    }
  }

  return pick3WithVariety.map((r: any) => ({
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
  }));
}

function getMissingIngredients(recipe: any, pantryInStock: string[]): string[] {
  const ingredients: string[] = recipe.ingredients || [];
  if (ingredients.length === 0) return [];
  const stockSet = new Set(pantryInStock.map(i => i.toLowerCase()));
  return ingredients.filter((ing: string) => {
    const lower = ing.toLowerCase();
    // Skip common staples
    if (["salt", "pepper", "water", "oil", "olive oil", "black pepper"].includes(lower)) return false;
    return !stockSet.has(lower) && ![...stockSet].some(s => lower.includes(s) || s.includes(lower));
  }).slice(0, 6);
}

/**
 * Pick `count` items with weighted random selection + variety rules.
 */
function selectWithVariety(
  pool: any[],
  cuisineSliders: Record<string, number>,
  count: number,
  proteinFilterActive: boolean,
  cuisineFilterActive: boolean,
  recentSet: Set<string>,
): any[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return pool;

  // Assign weights based on cuisine preference
  const sliderMap = new Map<string, number>();
  for (const [displayName, val] of Object.entries(cuisineSliders)) {
    const dbName = CUISINE_NAME_MAP[displayName] || displayName.toLowerCase().replace(/[^a-z]/g, "_");
    sliderMap.set(dbName, val as number);
  }

  const weighted = pool.map(r => {
    const cuisineVal = sliderMap.get(r.cuisine);
    // Weight: 0=excluded(already filtered), 1=10%, 2=25%, 3=50%, 4=100%
    const weight = cuisineVal === undefined ? 50 :
      cuisineVal === 1 ? 10 :
      cuisineVal === 2 ? 25 :
      cuisineVal === 3 ? 50 :
      cuisineVal === 4 ? 100 : 50;
    const recencyBias = recentSet.has(r.name) ? 0.35 : 1;
    const adjustedWeight = weight * recencyBias;
    return { ...r, _weight: adjustedWeight + Math.random() * Math.max(adjustedWeight, 1) };
  });

  // Sort by weight descending (randomized)
  weighted.sort((a, b) => b._weight - a._weight);

  const selected: any[] = [];
  const usedCuisines = new Set<string>();
  const usedProteins = new Set<string>();

  for (const candidate of weighted) {
    if (selected.length >= count) break;

    // Variety: different cuisine (unless cuisine filter active)
    if (!cuisineFilterActive && usedCuisines.has(candidate.cuisine)) continue;

    // Variety: different protein (unless protein filter active)
    if (!proteinFilterActive && candidate.primary_protein && usedProteins.has(candidate.primary_protein)) continue;

    selected.push(candidate);
    usedCuisines.add(candidate.cuisine);
    if (candidate.primary_protein) usedProteins.add(candidate.primary_protein);
  }

  // If variety rules are too strict, fill remaining slots
  if (selected.length < count) {
    for (const candidate of weighted) {
      if (selected.length >= count) break;
      if (!selected.includes(candidate)) {
        selected.push(candidate);
      }
    }
  }

  return selected.slice(0, count);
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
