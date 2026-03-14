import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TheMealDB is free and open — no API key needed
const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

// Map MealDB categories to our categories
const CATEGORY_MAP: Record<string, string> = {
  Breakfast: "breakfast", Starter: "snack", Side: "snack",
  Dessert: "snack", Miscellaneous: "lunch",
  Beef: "dinner", Chicken: "dinner", Lamb: "dinner",
  Pork: "dinner", Seafood: "dinner", Pasta: "dinner",
  Vegetarian: "dinner", Vegan: "dinner", Goat: "dinner",
};

// Map MealDB areas to our cuisine values
const CUISINE_MAP: Record<string, string> = {
  American: "american", British: "french", Canadian: "american",
  Chinese: "chinese", Croatian: "mediterranean", Dutch: "french",
  Egyptian: "african", Filipino: "filipino", French: "french",
  Greek: "greek", Indian: "south_asian", Irish: "american",
  Italian: "italian", Jamaican: "caribbean", Japanese: "japanese",
  Kenyan: "african", Malaysian: "southeast_asian", Mexican: "mexican",
  Moroccan: "african", Polish: "french", Portuguese: "mediterranean",
  Russian: "french", Spanish: "mediterranean", Thai: "southeast_asian",
  Tunisian: "african", Turkish: "middle_eastern", Vietnamese: "southeast_asian",
  Korean: "korean", Unknown: "american",
};

function detectProtein(name: string, ingredients: string[]): string | null {
  const text = (name + " " + ingredients.join(" ")).toLowerCase();
  if (text.includes("chicken")) return "Chicken";
  if (text.includes("beef") || text.includes("steak")) return "Beef";
  if (text.includes("ground beef") || text.includes("mince")) return "Ground Beef";
  if (text.includes("pork") || text.includes("bacon") || text.includes("ham")) return "Pork";
  if (text.includes("lamb") || text.includes("goat")) return "Lamb";
  if (text.includes("salmon")) return "Salmon";
  if (text.includes("shrimp") || text.includes("prawn")) return "Shrimp";
  if (text.includes("tuna")) return "Tuna";
  if (text.includes("fish") || text.includes("cod") || text.includes("tilapia") || text.includes("haddock")) return "Fish";
  if (text.includes("seafood") || text.includes("crab") || text.includes("lobster") || text.includes("mussel")) return "Seafood";
  if (text.includes("duck")) return "Duck";
  if (text.includes("turkey")) return "Turkey";
  if (text.includes("egg")) return "Eggs";
  if (text.includes("tofu") || text.includes("lentil") || text.includes("chickpea") || text.includes("bean")) return "Plant Based";
  return null;
}

function extractIngredients(meal: any): string[] {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      const line = measure?.trim() ? `${measure.trim()} ${ing.trim()}` : ing.trim();
      ingredients.push(line);
    }
  }
  return ingredients;
}

function estimateNutrition(ingredients: string[], protein: string | null): { cal: number; p: number; c: number; f: number } {
  const baseByProtein: Record<string, { cal: number; p: number; c: number; f: number }> = {
    Chicken: { cal: 450, p: 35, c: 30, f: 15 },
    Beef: { cal: 520, p: 32, c: 25, f: 28 },
    "Ground Beef": { cal: 480, p: 28, c: 30, f: 24 },
    Salmon: { cal: 420, p: 36, c: 20, f: 18 },
    Shrimp: { cal: 350, p: 30, c: 25, f: 10 },
    "Plant Based": { cal: 340, p: 18, c: 45, f: 12 },
    default: { cal: 400, p: 25, c: 35, f: 16 },
  };
  return baseByProtein[protein || "default"] || baseByProtein.default;
}

function estimateCookTime(instructions: string): number {
  const text = instructions.toLowerCase();
  const minuteMatches = text.match(/(\d+)\s*min/g);
  if (minuteMatches) {
    const times = minuteMatches.map(m => parseInt(m));
    return Math.min(Math.max(...times), 90);
  }
  if (text.length > 2000) return 45;
  if (text.length > 1000) return 30;
  return 25;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all meals from TheMealDB by searching letters
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    let allMeals: any[] = [];
    
    for (const letter of letters) {
      try {
        const res = await fetch(`${MEALDB_BASE}/search.php?f=${letter}`);
        const data = await res.json();
        if (data.meals) allMeals.push(...data.meals);
      } catch (e) {
        console.error(`Error fetching letter ${letter}:`, e);
      }
    }

    console.log(`Fetched ${allMeals.length} meals from TheMealDB`);

    // Get existing names
    const { data: existing } = await supabase
      .from("recipes")
      .select("name")
      .limit(10000);
    const existingNames = new Set((existing || []).map((r: any) => r.name.toLowerCase()));

    let inserted = 0;
    let skipped = 0;

    for (const meal of allMeals) {
      if (existingNames.has(meal.strMeal.toLowerCase())) {
        skipped++;
        continue;
      }

      const ingredients = extractIngredients(meal);
      const protein = detectProtein(meal.strMeal, ingredients);
      const cuisine = CUISINE_MAP[meal.strArea] || "american";
      const category = CATEGORY_MAP[meal.strCategory] || "dinner";
      const nutrition = estimateNutrition(ingredients, protein);
      const cookTime = estimateCookTime(meal.strInstructions || "");

      const tags: string[] = [cuisine];
      if (protein && ["Salmon", "Shrimp", "Tuna", "Fish", "Seafood"].includes(protein)) tags.push("seafood");
      if (protein && protein !== "Eggs" && protein !== "Plant Based") tags.push("high_protein");
      if (protein === "Plant Based") { tags.push("vegetarian"); tags.push("vegan"); }
      if (cookTime <= 20) tags.push("quick");

      const recipe = {
        name: meal.strMeal,
        category,
        cuisine,
        primary_protein: protein,
        is_baby: false,
        calories: nutrition.cal,
        protein: nutrition.p,
        carbs: nutrition.c,
        fat: nutrition.f,
        cook_time: cookTime,
        tags,
        equipment: [],
        spice_level: "mild",
        skill_level: "intermediate",
        ingredients,
        recipe_text: meal.strInstructions || null,
      };

      const { error } = await supabase.from("recipes").insert(recipe);
      if (!error) {
        inserted++;
        existingNames.add(meal.strMeal.toLowerCase());
      } else {
        console.error(`Insert error for ${meal.strMeal}:`, error.message);
      }
    }

    return new Response(JSON.stringify({
      message: `Imported ${inserted} recipes from TheMealDB (${skipped} duplicates skipped)`,
      total_fetched: allMeals.length,
      inserted,
      skipped,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
