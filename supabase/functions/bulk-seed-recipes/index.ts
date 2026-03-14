import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── CUISINES ──────────────────────────────────────────────────
const ALL_CUISINES = [
  "mexican", "italian", "american", "mediterranean", "french",
  "asian", "south_asian", "southeast_asian", "caribbean", "african",
  "latin_american", "seafood", "korean", "japanese", "chinese",
  "middle_eastern", "greek", "southern", "bbq", "filipino",
];

const PROTEINS = [
  "Chicken", "Beef", "Ground Beef", "Pork", "Lamb", "Salmon", "Shrimp",
  "Tuna", "Fish", "Seafood", "Duck", "Turkey", "Eggs", "Plant Based",
];

const CATEGORIES = ["breakfast", "lunch", "dinner", "snack", "date_night", "meal_prep", "crowd_feed"];

// ─── DISH TEMPLATES PER CATEGORY ───────────────────────────────
const DISH_TEMPLATES: Record<string, string[]> = {
  breakfast: ["Omelette", "Scramble", "Hash", "Breakfast Bowl", "Breakfast Wrap", "Breakfast Sandwich", "Frittata", "Skillet", "Breakfast Tacos", "Morning Plate"],
  lunch: ["Salad", "Wrap", "Bowl", "Sandwich", "Quesadilla", "Stir-Fry", "Rice Bowl", "Soup", "Tacos", "Flatbread", "Pita Pocket", "Grain Bowl"],
  dinner: ["Stir-Fry", "Curry", "Pasta", "Tacos", "Bowl", "Skillet", "Sheet Pan", "Casserole", "Grilled", "Roasted", "Stew", "Fried Rice", "Noodles", "Risotto", "Bake", "One Pot"],
  snack: ["Bites", "Dip & Chips", "Skewers", "Toast", "Rolls", "Mini Wraps", "Lettuce Cups"],
  date_night: ["Pan-Seared", "Risotto", "Pasta", "Glazed", "Medallions", "Stuffed", "Wellington", "Piccata"],
  meal_prep: ["Meal Prep Bowl", "Sheet Pan", "Wraps", "Casserole", "Soup", "Stew", "Burrito Bowl", "Grain Bowl"],
  crowd_feed: ["Sliders", "Nachos", "Tacos", "Skewers", "Pizza", "Dip", "Wings", "Platter", "Pot"],
};

// ─── CUISINE-SPECIFIC MODIFIERS ────────────────────────────────
const CUISINE_MODIFIERS: Record<string, string[]> = {
  mexican: ["Spicy", "Chipotle", "Cilantro Lime", "Street-Style", "Ancho", "Smoky", "Jalapeño", "Tomatillo", "Adobo", "Habanero", "Mole-Rubbed", "Fire-Roasted", "Salsa Verde", "Cotija-Crusted", "Cumin-Spiced"],
  italian: ["Tuscan", "Garlic", "Herb-Crusted", "Pesto", "Parmesan", "Sun-Dried Tomato", "Caprese", "Lemon Basil", "Truffle", "Rosemary", "Balsamic-Glazed", "Prosciutto-Wrapped", "Calabrese", "Aglio e Olio", "Piccata"],
  american: ["Classic", "Southern-Style", "BBQ", "Ranch", "Loaded", "Smoked", "Crispy", "All-American", "Cajun", "Nashville Hot", "Buffalo", "Honey Mustard", "Bacon-Wrapped", "Diner-Style", "Applewood"],
  mediterranean: ["Lemon Herb", "Za'atar", "Tahini", "Harissa", "Olive Oil", "Sumac", "Feta-Topped", "Sun-Kissed", "Oregano", "Roasted Red Pepper", "Pomegranate", "Herb Garden", "Citrus", "Caperberry", "Saffron"],
  french: ["Provençal", "Dijon", "Herb de Provence", "Butter-Basted", "Shallot", "Tarragon", "Cognac-Flamed", "Bourguignon", "Béarnaise", "Thyme-Roasted", "Champagne", "Gruyère", "Beurre Blanc", "Lyonnaise", "Niçoise"],
  asian: ["Teriyaki", "Sesame", "Ginger", "Soy-Glazed", "Sweet Chili", "Hoisin", "Five-Spice", "Black Bean", "Kung Pao", "Orange", "General Tso's", "Szechuan", "Garlic Black Pepper", "Oyster Sauce", "Char Siu"],
  south_asian: ["Tikka", "Tandoori", "Masala", "Coconut", "Turmeric", "Korma", "Vindaloo", "Madras", "Kashmiri", "Chana", "Palak", "Garam", "Tamarind", "Cardamom", "Biryani-Style"],
  southeast_asian: ["Thai Basil", "Lemongrass", "Coconut Curry", "Peanut", "Sriracha", "Pad Thai-Style", "Satay", "Galangal", "Tamarind", "Fish Sauce-Glazed", "Sambal", "Laksa-Style", "Green Curry", "Red Curry", "Tom Yum"],
  caribbean: ["Jerk", "Mango", "Scotch Bonnet", "Rum-Glazed", "Coconut", "Plantain", "Island-Style", "Tropical", "Allspice", "Tamarind", "Lime Pepper", "Pineapple", "Curry", "Creole", "Habanero Mango"],
  african: ["Berbere", "Peri-Peri", "Suya-Spiced", "Groundnut", "Jollof-Style", "Harissa", "Dukkah", "Ras el Hanout", "Chakalaka", "Peanut", "Coconut Curry", "Spiced", "Grilled", "Smoked", "Tomato-Braised"],
  latin_american: ["Chimichurri", "Achiote", "Sofrito", "Mojo", "Peruvian", "Argentine", "Ají", "Huancaína", "Empanada-Style", "Arepa", "Plantain-Crusted", "Lime Garlic", "Tostada", "Green Sauce", "Criolla"],
  seafood: ["Lemon Butter", "Old Bay", "Blackened", "Garlic Herb", "Caper", "Dill", "Citrus-Glazed", "Broiled", "Pan-Seared", "Coconut-Crusted", "Miso-Glazed", "Piccata", "Scampi-Style", "Herb-Crusted", "Chili Lime"],
  korean: ["Gochujang", "Kimchi", "Bulgogi", "Sesame", "Doenjang", "Bibimbap-Style", "Tteokbokki-Style", "Japchae-Style", "Sweet Soy", "Spicy Korean", "Gochugaru", "Korean BBQ", "Fermented", "Scallion Pancake", "Army-Style"],
  japanese: ["Teriyaki", "Miso", "Ponzu", "Katsu", "Tempura", "Yuzu", "Wasabi", "Shoyu", "Dashi", "Matcha", "Furikake", "Tonkatsu", "Yakitori", "Okonomiyaki-Style", "Soy Ginger"],
  chinese: ["Kung Pao", "Mapo", "Black Bean", "Five-Spice", "Char Siu", "XO Sauce", "Chili Oil", "Doubanjiang", "Hoisin-Glazed", "Wok-Tossed", "Clay Pot", "Cumin", "Sichuan", "Cantonese", "Shanghai-Style"],
  middle_eastern: ["Za'atar", "Shawarma", "Sumac", "Tahini", "Baharat", "Dukkah", "Pomegranate-Glazed", "Saffron", "Rose Water", "Falafel-Style", "Kebab-Style", "Flatbread", "Hummus-Crusted", "Cardamom", "Pistachio-Crusted"],
  greek: ["Lemon Oregano", "Feta", "Tzatziki", "Souvlaki", "Spanakopita-Style", "Kalamata", "Gyro-Style", "Moussaka-Style", "Mediterranean Herb", "Olive Oil Herb", "Dill Yogurt", "Oregano Garlic", "Lemon Caper", "Herbed Feta", "Roasted Lemon"],
  southern: ["Cajun", "Creole", "Honey Butter", "Buttermilk", "Smoked", "Brown Sugar", "Pecan-Crusted", "Country-Style", "Bourbon-Glazed", "Sweet Tea-Brined", "Hot Honey", "Cornbread-Crusted", "Biscuit-Topped", "Fried Green", "Collard-Wrapped"],
  bbq: ["Smoked", "Hickory", "Mesquite", "Carolina Gold", "Kansas City", "Texas-Style", "Memphis-Style", "Applewood", "Cherry-Smoked", "Beer-Brined", "Dry-Rubbed", "Pit-Style", "Charcoal", "Low & Slow", "Competition-Style"],
  filipino: ["Adobo", "Sinigang", "Kare-Kare", "Caldereta", "Sisig-Style", "Lechon-Style", "Pancit-Style", "Lumpia-Style", "Coconut Vinegar", "Calamansi", "Bagoong", "Sweet Soy", "Garlic Vinegar", "Annatto", "Sawsawan"],
};

// Fallback modifiers
const GENERIC_MODIFIERS = ["Spicy", "Honey", "Garlic", "Lemon Herb", "Crispy", "Smoky", "Sweet Chili", "Tangy", "Zesty", "Roasted", "Herb-Crusted", "Brown Butter", "Maple", "Sesame", "Ginger"];

// ─── PROTEIN-CATEGORY COMPATIBILITY ────────────────────────────
const INCOMPATIBLE: Record<string, Set<string>> = {
  "Duck": new Set(["snack", "crowd_feed", "breakfast"]),
  "Lamb": new Set(["breakfast", "snack"]),
  "Tuna": new Set(["breakfast"]),
  "Seafood": new Set(["breakfast"]),
};

// ─── NUTRITIONAL TEMPLATES ─────────────────────────────────────
const PROTEIN_CALS: Record<string, { cal: number; p: number; f: number }> = {
  Chicken: { cal: 420, p: 38, f: 14 },
  Beef: { cal: 520, p: 35, f: 28 },
  "Ground Beef": { cal: 480, p: 30, f: 24 },
  Pork: { cal: 460, p: 32, f: 22 },
  Lamb: { cal: 500, p: 34, f: 26 },
  Salmon: { cal: 440, p: 36, f: 20 },
  Shrimp: { cal: 350, p: 32, f: 10 },
  Tuna: { cal: 380, p: 40, f: 8 },
  Fish: { cal: 360, p: 34, f: 12 },
  Seafood: { cal: 370, p: 30, f: 14 },
  Duck: { cal: 540, p: 28, f: 32 },
  Turkey: { cal: 400, p: 36, f: 12 },
  Eggs: { cal: 320, p: 22, f: 18 },
  "Plant Based": { cal: 340, p: 18, f: 12 },
};

const CATEGORY_ADJUSTMENTS: Record<string, { calMult: number; carbBase: number; cookTime: number }> = {
  breakfast: { calMult: 0.8, carbBase: 25, cookTime: 15 },
  lunch: { calMult: 0.9, carbBase: 35, cookTime: 25 },
  dinner: { calMult: 1.0, carbBase: 40, cookTime: 35 },
  snack: { calMult: 0.5, carbBase: 15, cookTime: 10 },
  date_night: { calMult: 1.2, carbBase: 35, cookTime: 45 },
  meal_prep: { calMult: 1.0, carbBase: 45, cookTime: 40 },
  crowd_feed: { calMult: 0.7, carbBase: 30, cookTime: 35 },
};

const DISH_COOK_ADJUSTMENTS: Record<string, number> = {
  "Stir-Fry": -10, "Scramble": -10, "Toast": -15, "Skillet": -5,
  "Curry": 10, "Stew": 20, "Soup": 15, "Roasted": 15, "Casserole": 20,
  "Bake": 15, "Wellington": 25, "One Pot": 10, "Risotto": 10,
  "Bites": -10, "Rolls": -5, "Lettuce Cups": -10, "Mini Wraps": -10,
};

// ─── TAGS GENERATION ───────────────────────────────────────────
function generateTags(cuisine: string, protein: string, category: string, dishTemplate: string, modifier: string): string[] {
  const tags: string[] = [];
  
  // Cuisine tag
  if (["asian", "chinese", "japanese", "korean"].includes(cuisine)) tags.push("asian");
  else if (["south_asian"].includes(cuisine)) tags.push("south_asian");
  else if (["southeast_asian"].includes(cuisine)) tags.push("southeast_asian");
  else if (["mexican", "latin_american"].includes(cuisine)) tags.push("latin_american");
  else tags.push(cuisine);
  
  // Protein tags
  if (["Salmon", "Shrimp", "Tuna", "Fish", "Seafood"].includes(protein)) tags.push("seafood");
  if (protein !== "Eggs" && protein !== "Plant Based") tags.push("high_protein");
  if (protein === "Plant Based") { tags.push("vegetarian"); tags.push("vegan"); }
  if (protein === "Eggs") tags.push("vegetarian");
  
  // Dish/method tags
  const dt = dishTemplate.toLowerCase();
  if (dt.includes("stir-fry") || dt.includes("skillet") || dt.includes("one pot")) tags.push("one_pan");
  if (dt.includes("grill")) tags.push("grill");
  if (dt.includes("sheet pan") || dt.includes("bake") || dt.includes("casserole") || dt.includes("roasted") || dt.includes("wellington")) tags.push("comfort");
  if (category === "snack" || dt.includes("bites") || dt.includes("toast")) tags.push("quick");
  
  // Modifier tags
  const mod = modifier.toLowerCase();
  if (mod.includes("spicy") || mod.includes("hot") || mod.includes("habanero") || mod.includes("scotch bonnet") || mod.includes("gochujang") || mod.includes("sriracha")) tags.push("spicy");
  if (mod.includes("mild") || mod.includes("honey") || mod.includes("butter")) tags.push("mild");
  
  // Category tags
  if (category === "date_night") tags.push("date_night");
  if (category === "crowd_feed") tags.push("crowd");
  if (["breakfast", "snack"].includes(category) || (CATEGORY_ADJUSTMENTS[category]?.cookTime || 30) <= 20) tags.push("quick");
  
  // Kid-friendly
  if (!tags.includes("spicy") && ["Chicken", "Ground Beef", "Turkey", "Eggs", "Pasta"].some(p => protein.includes(p))) {
    tags.push("kid_friendly");
  }
  
  // Light
  if (["Salad", "Bowl", "Lettuce Cups", "Wrap"].includes(dishTemplate)) tags.push("light");
  
  return [...new Set(tags)];
}

// ─── EQUIPMENT GENERATION ──────────────────────────────────────
function generateEquipment(dishTemplate: string): string[] {
  const dt = dishTemplate.toLowerCase();
  if (dt.includes("stir-fry") || dt.includes("fried rice")) return ["wok"];
  if (dt.includes("grill")) return ["grill"];
  if (dt.includes("sheet pan")) return ["oven", "sheet pan"];
  if (dt.includes("casserole") || dt.includes("bake") || dt.includes("roasted") || dt.includes("wellington")) return ["oven"];
  if (dt.includes("skillet") || dt.includes("pan-seared") || dt.includes("piccata")) return ["skillet"];
  if (dt.includes("soup") || dt.includes("stew") || dt.includes("one pot") || dt.includes("curry")) return ["pot"];
  if (dt.includes("pizza")) return ["oven"];
  return ["skillet"];
}

// ─── SPICE / SKILL LEVELS ──────────────────────────────────────
function getSpiceLevel(cuisine: string, modifier: string): string {
  const mod = modifier.toLowerCase();
  if (mod.includes("spicy") || mod.includes("hot") || mod.includes("habanero") || mod.includes("scotch bonnet") || mod.includes("gochujang") || mod.includes("vindaloo")) return "hot";
  if (mod.includes("sriracha") || mod.includes("chipotle") || mod.includes("jalapeño") || mod.includes("harissa") || mod.includes("peri-peri")) return "medium";
  if (["south_asian", "southeast_asian", "korean", "african", "caribbean"].includes(cuisine)) return "mild";
  return "none";
}

function getSkillLevel(dishTemplate: string, category: string): string {
  const dt = dishTemplate.toLowerCase();
  if (dt.includes("wellington") || dt.includes("risotto") || dt.includes("medallions") || dt.includes("stuffed") || dt.includes("piccata")) return "confident";
  if (category === "date_night") return "intermediate";
  if (dt.includes("toast") || dt.includes("scramble") || dt.includes("wrap") || dt.includes("bowl") || dt.includes("sandwich")) return "beginner";
  return "intermediate";
}

// ─── DETERMINISTIC HASH ────────────────────────────────────────
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─── MAIN RECIPE GENERATOR ────────────────────────────────────
function generateRecipesForCuisine(cuisine: string): any[] {
  const recipes: any[] = [];
  const usedNames = new Set<string>();
  const modifiers = CUISINE_MODIFIERS[cuisine] || GENERIC_MODIFIERS;
  
  for (const category of CATEGORIES) {
    const templates = DISH_TEMPLATES[category] || [];
    
    for (const protein of PROTEINS) {
      // Skip incompatible combos
      if (INCOMPATIBLE[protein]?.has(category)) continue;
      
      // For each protein-category combo, pick 2-3 dish templates + modifier variants
      for (let ti = 0; ti < templates.length; ti++) {
        const dish = templates[ti];
        
        // Generate 2 modifier variants per dish template
        for (let mi = 0; mi < 2; mi++) {
          const modIdx = (simpleHash(`${cuisine}_${protein}_${dish}_${mi}`) % modifiers.length);
          const modifier = modifiers[modIdx];
          
          // Build recipe name
          let name: string;
          const proteinLabel = protein === "Ground Beef" ? "Beef" : protein;
          
          // Special naming for certain dish types
          if (dish === "Pan-Seared" || dish === "Glazed" || dish === "Grilled" || dish === "Roasted" || dish === "Blackened") {
            name = `${modifier} ${dish} ${proteinLabel}`;
          } else if (dish.includes("Style") || dish === "Risotto" || dish === "Piccata") {
            name = `${modifier} ${proteinLabel} ${dish}`;
          } else {
            name = `${modifier} ${proteinLabel} ${dish}`;
          }
          
          // Deduplicate
          if (usedNames.has(name.toLowerCase())) continue;
          usedNames.add(name.toLowerCase());
          
          // Nutrition
          const pc = PROTEIN_CALS[protein] || PROTEIN_CALS.Chicken;
          const ca = CATEGORY_ADJUSTMENTS[category] || CATEGORY_ADJUSTMENTS.dinner;
          const cookAdj = DISH_COOK_ADJUSTMENTS[dish] || 0;
          const hash = simpleHash(name);
          const calVariance = (hash % 80) - 40; // ±40 cal variance
          
          const cal = Math.round(pc.cal * ca.calMult + calVariance);
          const p = Math.round(pc.p + (hash % 8) - 4);
          const c = Math.round(ca.carbBase + (hash % 20) - 10);
          const f = Math.round(pc.f + (hash % 6) - 3);
          const cookTime = Math.max(5, ca.cookTime + cookAdj + ((hash % 10) - 5));
          
          const tags = generateTags(cuisine, protein, category, dish, modifier);
          const equipment = generateEquipment(dish);
          const spiceLevel = getSpiceLevel(cuisine, modifier);
          const skillLevel = getSkillLevel(dish, category);
          
          recipes.push({
            name,
            category,
            cuisine,
            primary_protein: protein,
            is_baby: false,
            calories: cal,
            protein: p,
            carbs: c,
            fat: f,
            cook_time: cookTime,
            tags,
            equipment,
            spice_level: spiceLevel,
            skill_level: skillLevel,
            ingredients: [], // Will be filled by seed-recipes function
            recipe_text: null, // Will be filled by seed-recipes function
          });
        }
      }
    }
    
    // Generate baby variants for applicable categories
    if (["breakfast", "lunch", "snack", "dinner"].includes(category)) {
      const babyProteins = ["Chicken", "Turkey", "Eggs", "Plant Based", "Fish", "Salmon"];
      const babyDishes = ["Mash", "Fingers", "Bites", "Purée", "Soft Bowl", "Mini Pancakes"];
      const babyModifiers = ["Gentle", "Soft", "Mild", "Simple", "Easy", "Tiny"];
      
      for (const protein of babyProteins) {
        for (let bi = 0; bi < Math.min(3, babyDishes.length); bi++) {
          const dish = babyDishes[bi];
          const mod = babyModifiers[bi % babyModifiers.length];
          const proteinLabel = protein === "Plant Based" ? "Veggie" : protein;
          const name = `${mod} Baby ${proteinLabel} ${dish}`;
          
          if (usedNames.has(name.toLowerCase())) continue;
          usedNames.add(name.toLowerCase());
          
          recipes.push({
            name,
            category,
            cuisine,
            primary_protein: protein,
            is_baby: true,
            calories: Math.round(120 + (simpleHash(name) % 80)),
            protein: Math.round(8 + (simpleHash(name) % 8)),
            carbs: Math.round(12 + (simpleHash(name) % 10)),
            fat: Math.round(4 + (simpleHash(name) % 6)),
            cook_time: Math.round(8 + (simpleHash(name) % 7)),
            tags: ["kid_friendly", "mild", cuisine],
            equipment: ["skillet"],
            spice_level: "none",
            skill_level: "beginner",
            ingredients: [],
            recipe_text: null,
          });
        }
      }
    }
  }
  
  return recipes;
}

// ─── MAIN HANDLER ──────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cuisine, all } = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cuisinesToSeed = all ? ALL_CUISINES : (cuisine ? [cuisine] : ALL_CUISINES.slice(0, 1));
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const c of cuisinesToSeed) {
      console.log(`Generating recipes for ${c}...`);
      const recipes = generateRecipesForCuisine(c);
      
      // Get existing names for this cuisine
      const { data: existing } = await supabase
        .from("recipes")
        .select("name")
        .eq("cuisine", c);
      
      const existingNames = new Set((existing || []).map((r: any) => r.name.toLowerCase()));
      
      // Filter out duplicates
      const newRecipes = recipes.filter(r => !existingNames.has(r.name.toLowerCase()));
      totalSkipped += recipes.length - newRecipes.length;
      
      // Insert in batches of 100
      for (let i = 0; i < newRecipes.length; i += 100) {
        const batch = newRecipes.slice(i, i + 100);
        const { error } = await supabase.from("recipes").insert(batch);
        if (error) {
          console.error(`Insert error for ${c} batch ${i}:`, error);
          // Try individual inserts for failed batch
          for (const recipe of batch) {
            const { error: singleError } = await supabase.from("recipes").insert(recipe);
            if (!singleError) totalInserted++;
          }
        } else {
          totalInserted += batch.length;
        }
      }
      
      console.log(`${c}: generated ${recipes.length}, inserted ${newRecipes.length}, skipped ${recipes.length - newRecipes.length}`);
    }

    return new Response(JSON.stringify({
      message: `Seeded ${totalInserted} new recipes (${totalSkipped} duplicates skipped)`,
      inserted: totalInserted,
      skipped: totalSkipped,
      cuisines: cuisinesToSeed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
