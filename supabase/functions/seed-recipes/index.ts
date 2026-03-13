import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to extract primary protein and cuisine from tags/name
function extractCuisine(tags: string[]): string {
  const cuisineMap: Record<string, string> = {
    mexican: "mexican", asian: "asian", southeast_asian: "southeast_asian",
    south_asian: "south_asian", mediterranean: "mediterranean", italian: "italian",
    american: "american", latin_american: "latin_american", caribbean: "caribbean",
    african: "african", french: "french", seafood: "seafood",
  };
  for (const tag of tags) {
    if (cuisineMap[tag]) return cuisineMap[tag];
  }
  return "american";
}

function extractProtein(name: string, tags: string[]): string | null {
  const n = name.toLowerCase();
  if (n.includes("chicken") || n.includes("pollo")) return "Chicken";
  if (n.includes("beef") || n.includes("steak") || n.includes("ribeye") || n.includes("strip") || n.includes("filet")) return "Beef";
  if (n.includes("ground beef") || n.includes("picadillo") || n.includes("meatball") || n.includes("meatloaf") || n.includes("burger") || n.includes("bolognese")) return "Ground Beef";
  if (n.includes("pork") || n.includes("carnitas") || n.includes("pernil") || n.includes("schnitzel")) return "Pork";
  if (n.includes("lamb")) return "Lamb";
  if (n.includes("salmon")) return "Salmon";
  if (n.includes("shrimp") || n.includes("prawn")) return "Shrimp";
  if (n.includes("tuna")) return "Tuna";
  if (n.includes("tilapia")) return "Tilapia";
  if (n.includes("fish") || n.includes("cod") || n.includes("halibut") || n.includes("branzino") || n.includes("swordfish") || n.includes("mahi")) return "Fish";
  if (n.includes("lobster") || n.includes("crab") || n.includes("scallop")) return "Seafood";
  if (n.includes("duck")) return "Duck";
  if (n.includes("turkey")) return "Turkey";
  if (n.includes("egg") || n.includes("omelette") || n.includes("huevos") || n.includes("shakshuka") || n.includes("frittata")) return "Eggs";
  if (n.includes("tofu") || n.includes("tempeh")) return "Plant Based";
  if (tags.includes("vegan") || tags.includes("vegetarian")) return "Plant Based";
  return null;
}

function extractSpiceLevel(tags: string[]): string {
  if (tags.includes("spicy")) return "medium";
  if (tags.includes("mild")) return "mild";
  return "mild";
}

function extractSkillLevel(tags: string[], cal: number): string {
  if (tags.includes("quick") || tags.includes("kid_friendly")) return "beginner";
  if (tags.includes("date_night") || tags.includes("comfort")) return "intermediate";
  if (cal > 550) return "intermediate";
  return "intermediate";
}

function estimateCookTime(tags: string[], category: string): number {
  if (tags.includes("quick")) return 15;
  if (category === "snack") return 10;
  if (category === "breakfast") return 15;
  if (category === "brunch") return 25;
  if (category === "lunch") return 25;
  if (category === "dinner") return 35;
  if (category === "date_night") return 45;
  if (category === "meal_prep") return 60;
  if (category === "crowd_feed") return 45;
  return 30;
}

interface MealEntry {
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
}

function toRecipeRow(meal: MealEntry, category: string, isBaby: boolean) {
  return {
    name: meal.name,
    category,
    cuisine: extractCuisine(meal.tags),
    primary_protein: extractProtein(meal.name, meal.tags),
    cook_time: estimateCookTime(meal.tags, category),
    calories: meal.cal,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    spice_level: extractSpiceLevel(meal.tags),
    skill_level: extractSkillLevel(meal.tags, meal.cal),
    tags: meal.tags,
    equipment: [],
    ingredients: [],
    recipe_text: null,
    is_baby: isBaby,
  };
}

// All meal data inline
const BREAKFAST: MealEntry[] = [
  { name: "Classic Scrambled Eggs", cal: 280, protein: 20, carbs: 4, fat: 20, tags: ["american", "quick", "kid_friendly"] },
  { name: "Avocado Toast & Poached Egg", cal: 380, protein: 18, carbs: 32, fat: 22, tags: ["american", "mediterranean"] },
  { name: "Fluffy Buttermilk Pancakes", cal: 520, protein: 12, carbs: 78, fat: 16, tags: ["american", "kid_friendly"] },
  { name: "French Toast", cal: 460, protein: 14, carbs: 62, fat: 18, tags: ["american", "french", "kid_friendly"] },
  { name: "Smoked Salmon Bagel", cal: 480, protein: 28, carbs: 44, fat: 18, tags: ["american", "seafood"] },
  { name: "Overnight Oats", cal: 360, protein: 12, carbs: 58, fat: 8, tags: ["american", "quick", "vegetarian"] },
  { name: "Protein Pancakes", cal: 440, protein: 32, carbs: 48, fat: 10, tags: ["american", "high_protein"] },
  { name: "Spinach Egg Bites", cal: 260, protein: 22, carbs: 8, fat: 16, tags: ["american", "high_protein", "low_carb"] },
  { name: "Bacon & Cheese Omelette", cal: 420, protein: 28, carbs: 4, fat: 32, tags: ["american", "high_protein", "low_carb"] },
  { name: "Blueberry Waffles", cal: 490, protein: 10, carbs: 72, fat: 16, tags: ["american", "kid_friendly"] },
  { name: "Eggs Over Easy with Toast", cal: 340, protein: 18, carbs: 30, fat: 16, tags: ["american", "quick"] },
  { name: "Western Omelette", cal: 380, protein: 26, carbs: 8, fat: 26, tags: ["american", "high_protein"] },
  { name: "Biscuits & Gravy", cal: 580, protein: 16, carbs: 54, fat: 32, tags: ["american", "comfort"] },
  { name: "Corned Beef Hash", cal: 460, protein: 26, carbs: 32, fat: 26, tags: ["american", "comfort"] },
  { name: "Eggs Benedict", cal: 580, protein: 24, carbs: 38, fat: 36, tags: ["american", "french"] },
  { name: "Banana Nut Oatmeal", cal: 380, protein: 10, carbs: 62, fat: 12, tags: ["american", "vegetarian", "quick"] },
  { name: "Cinnamon Roll Oatmeal", cal: 400, protein: 10, carbs: 66, fat: 10, tags: ["american", "vegetarian"] },
  { name: "Egg & Cheese Sandwich", cal: 420, protein: 22, carbs: 38, fat: 20, tags: ["american", "quick", "kid_friendly"] },
  { name: "Bagel with Cream Cheese", cal: 380, protein: 10, carbs: 52, fat: 14, tags: ["american", "quick", "vegetarian"] },
  { name: "Sausage & Egg Skillet", cal: 480, protein: 30, carbs: 12, fat: 34, tags: ["american", "high_protein", "one_pan"] },
  { name: "Strawberry Smoothie Bowl", cal: 340, protein: 14, carbs: 56, fat: 8, tags: ["american", "vegetarian", "light"] },
  { name: "Acai Bowl", cal: 380, protein: 8, carbs: 62, fat: 12, tags: ["american", "vegan", "light"] },
  { name: "Granola & Yogurt Bowl", cal: 420, protein: 16, carbs: 58, fat: 14, tags: ["american", "vegetarian"] },
  { name: "Peanut Butter Banana Toast", cal: 380, protein: 14, carbs: 48, fat: 16, tags: ["american", "vegan", "quick"] },
  { name: "Ham & Cheese Croissant", cal: 460, protein: 20, carbs: 38, fat: 26, tags: ["american", "french"] },
  { name: "Turkey Sausage Patties with Eggs", cal: 340, protein: 28, carbs: 4, fat: 22, tags: ["american", "high_protein", "low_carb"] },
  { name: "Loaded Hash Browns", cal: 480, protein: 18, carbs: 48, fat: 24, tags: ["american", "comfort"] },
  { name: "Veggie Egg White Omelette", cal: 220, protein: 22, carbs: 12, fat: 8, tags: ["american", "high_protein", "light", "vegetarian"] },
  { name: "Chocolate Chip Pancakes", cal: 540, protein: 12, carbs: 82, fat: 18, tags: ["american", "kid_friendly"] },
  { name: "Steel Cut Oats with Berries", cal: 320, protein: 10, carbs: 56, fat: 6, tags: ["american", "vegan", "light"] },
  { name: "Huevos Rancheros", cal: 420, protein: 22, carbs: 38, fat: 18, tags: ["mexican"] },
  { name: "Chilaquiles Verdes", cal: 490, protein: 20, carbs: 52, fat: 22, tags: ["mexican", "spicy"] },
  { name: "Breakfast Burrito", cal: 560, protein: 30, carbs: 52, fat: 24, tags: ["mexican", "crowd"] },
  { name: "Loaded Breakfast Tacos", cal: 490, protein: 26, carbs: 44, fat: 22, tags: ["mexican"] },
  { name: "Chilaquiles Rojos", cal: 510, protein: 22, carbs: 54, fat: 22, tags: ["mexican", "spicy"] },
  { name: "Machaca con Huevo", cal: 420, protein: 32, carbs: 18, fat: 24, tags: ["mexican", "high_protein"] },
  { name: "Molletes", cal: 440, protein: 20, carbs: 48, fat: 18, tags: ["mexican", "vegetarian"] },
  { name: "Chorizo & Egg Tacos", cal: 480, protein: 26, carbs: 38, fat: 24, tags: ["mexican", "spicy"] },
  { name: "Enfrijoladas", cal: 460, protein: 22, carbs: 50, fat: 18, tags: ["mexican", "vegetarian"] },
  { name: "Huevos a la Mexicana", cal: 380, protein: 22, carbs: 16, fat: 24, tags: ["mexican", "spicy"] },
  { name: "Tamales de Rajas", cal: 380, protein: 10, carbs: 46, fat: 18, tags: ["mexican", "vegetarian"] },
  { name: "Migas Tex-Mex", cal: 440, protein: 22, carbs: 36, fat: 24, tags: ["mexican", "american"] },
  { name: "Breakfast Quesadilla", cal: 460, protein: 24, carbs: 38, fat: 24, tags: ["mexican", "quick"] },
  { name: "Nopales con Huevo", cal: 280, protein: 18, carbs: 16, fat: 16, tags: ["mexican", "light", "vegetarian"] },
  { name: "Mexican Street Corn Omelette", cal: 380, protein: 22, carbs: 22, fat: 22, tags: ["mexican"] },
  { name: "Congee (Rice Porridge)", cal: 280, protein: 14, carbs: 48, fat: 4, tags: ["asian", "mild", "comfort"] },
  { name: "Fried Rice with Egg", cal: 420, protein: 16, carbs: 62, fat: 12, tags: ["asian", "quick", "one_pan"] },
  { name: "Tamagoyaki (Japanese Omelette)", cal: 240, protein: 16, carbs: 8, fat: 16, tags: ["asian", "quick", "mild"] },
  { name: "Nasi Goreng", cal: 480, protein: 20, carbs: 58, fat: 18, tags: ["asian", "southeast_asian"] },
  { name: "Dim Sum Pork Buns", cal: 380, protein: 16, carbs: 48, fat: 14, tags: ["asian", "comfort"] },
  { name: "Japanese Rice Bowl with Natto", cal: 340, protein: 18, carbs: 52, fat: 6, tags: ["asian", "vegan"] },
  { name: "Miso Soup with Rice", cal: 280, protein: 12, carbs: 46, fat: 4, tags: ["asian", "light", "vegan"] },
  { name: "Scallion Pancakes", cal: 360, protein: 8, carbs: 44, fat: 16, tags: ["asian", "vegan"] },
  { name: "Chinese Egg Drop Soup", cal: 180, protein: 12, carbs: 14, fat: 8, tags: ["asian", "light", "quick"] },
  { name: "Congee with Century Egg", cal: 310, protein: 16, carbs: 48, fat: 6, tags: ["asian", "comfort"] },
  { name: "Korean Egg Toast", cal: 380, protein: 18, carbs: 38, fat: 16, tags: ["asian", "quick"] },
  { name: "Onigiri (Rice Balls)", cal: 280, protein: 8, carbs: 52, fat: 4, tags: ["asian", "quick", "mild"] },
  { name: "Banh Cuon (Steamed Rice Rolls)", cal: 320, protein: 14, carbs: 44, fat: 8, tags: ["asian", "southeast_asian", "light"] },
  { name: "Thai Jok (Rice Porridge)", cal: 300, protein: 16, carbs: 44, fat: 6, tags: ["asian", "southeast_asian", "comfort"] },
  { name: "Chinese Savory Soy Milk", cal: 260, protein: 14, carbs: 32, fat: 8, tags: ["asian", "vegan"] },
  { name: "Japanese Breakfast Set", cal: 420, protein: 28, carbs: 48, fat: 12, tags: ["asian", "seafood"] },
  { name: "Kimchi Fried Rice", cal: 440, protein: 18, carbs: 58, fat: 14, tags: ["asian", "spicy", "one_pan"] },
  { name: "Bao Buns with Pork", cal: 420, protein: 20, carbs: 50, fat: 14, tags: ["asian", "comfort"] },
  { name: "Vietnamese Pho for Breakfast", cal: 380, protein: 24, carbs: 42, fat: 10, tags: ["asian", "southeast_asian", "light"] },
  { name: "Roti Canai", cal: 380, protein: 8, carbs: 48, fat: 18, tags: ["asian", "southeast_asian"] },
  { name: "Masala Omelette", cal: 320, protein: 20, carbs: 12, fat: 20, tags: ["south_asian", "spicy"] },
  { name: "Aloo Paratha", cal: 440, protein: 10, carbs: 56, fat: 20, tags: ["south_asian", "vegetarian"] },
  { name: "Masala Dosa", cal: 380, protein: 8, carbs: 58, fat: 12, tags: ["south_asian", "vegetarian", "vegan"] },
  { name: "Upma", cal: 280, protein: 8, carbs: 44, fat: 8, tags: ["south_asian", "vegetarian", "vegan"] },
  { name: "Poha (Flattened Rice)", cal: 300, protein: 6, carbs: 52, fat: 8, tags: ["south_asian", "vegetarian", "vegan", "quick"] },
  { name: "Idli & Sambar", cal: 280, protein: 10, carbs: 48, fat: 4, tags: ["south_asian", "vegetarian", "vegan", "light"] },
  { name: "Chole Bhature", cal: 580, protein: 16, carbs: 62, fat: 28, tags: ["south_asian", "vegetarian", "comfort"] },
  { name: "Anda Bhurji (Indian Scramble)", cal: 320, protein: 20, carbs: 10, fat: 22, tags: ["south_asian", "spicy", "quick"] },
  { name: "Uttapam", cal: 340, protein: 10, carbs: 52, fat: 10, tags: ["south_asian", "vegetarian"] },
  { name: "Puri Bhaji", cal: 480, protein: 10, carbs: 54, fat: 24, tags: ["south_asian", "vegetarian"] },
  { name: "Appam with Stew", cal: 360, protein: 14, carbs: 48, fat: 12, tags: ["south_asian", "mild"] },
  { name: "Pesarattu (Green Gram Crepe)", cal: 280, protein: 14, carbs: 38, fat: 8, tags: ["south_asian", "vegetarian", "vegan", "high_protein"] },
  { name: "Medu Vada", cal: 320, protein: 12, carbs: 36, fat: 14, tags: ["south_asian", "vegetarian", "vegan"] },
  { name: "Sabudana Khichdi", cal: 340, protein: 6, carbs: 58, fat: 10, tags: ["south_asian", "vegetarian"] },
  { name: "Besan Chilla (Chickpea Pancake)", cal: 260, protein: 12, carbs: 32, fat: 10, tags: ["south_asian", "vegetarian", "vegan", "high_protein"] },
  { name: "Shakshuka", cal: 380, protein: 20, carbs: 28, fat: 20, tags: ["mediterranean", "spicy", "vegetarian"] },
  { name: "Greek Yogurt Parfait", cal: 310, protein: 18, carbs: 42, fat: 8, tags: ["mediterranean", "quick", "light"] },
  { name: "Labneh with Olive Oil & Za'atar", cal: 280, protein: 12, carbs: 22, fat: 16, tags: ["mediterranean", "vegetarian", "quick"] },
  { name: "Ful Medames", cal: 320, protein: 16, carbs: 44, fat: 8, tags: ["mediterranean", "african", "vegan"] },
  { name: "Turkish Menemen", cal: 340, protein: 18, carbs: 22, fat: 18, tags: ["mediterranean", "vegetarian"] },
  { name: "Fattoush Breakfast Bowl", cal: 300, protein: 10, carbs: 36, fat: 14, tags: ["mediterranean", "vegetarian", "light"] },
  { name: "Halloumi & Egg Plate", cal: 420, protein: 26, carbs: 12, fat: 30, tags: ["mediterranean", "vegetarian", "high_protein"] },
  { name: "Manakish (Za'atar Flatbread)", cal: 380, protein: 10, carbs: 48, fat: 16, tags: ["mediterranean", "vegetarian", "vegan"] },
  { name: "Shakshouka with Feta", cal: 420, protein: 22, carbs: 28, fat: 24, tags: ["mediterranean", "spicy", "vegetarian"] },
  { name: "Turkish Simit & Cheese", cal: 380, protein: 14, carbs: 48, fat: 14, tags: ["mediterranean", "vegetarian"] },
  { name: "Spanakopita Bites", cal: 320, protein: 12, carbs: 28, fat: 18, tags: ["mediterranean", "vegetarian"] },
  { name: "Egyptian Falafel with Eggs", cal: 440, protein: 20, carbs: 42, fat: 20, tags: ["mediterranean", "african"] },
  { name: "Crêpes Suzette", cal: 420, protein: 8, carbs: 58, fat: 16, tags: ["french"] },
  { name: "Classic French Omelette", cal: 380, protein: 22, carbs: 6, fat: 30, tags: ["french"] },
  { name: "Pain au Chocolat", cal: 380, protein: 6, carbs: 42, fat: 20, tags: ["french", "vegetarian"] },
  { name: "Savory Crêpes with Ham", cal: 420, protein: 22, carbs: 38, fat: 20, tags: ["french"] },
  { name: "Brioche French Toast", cal: 480, protein: 14, carbs: 58, fat: 22, tags: ["french", "kid_friendly"] },
  { name: "Quiche Florentine", cal: 440, protein: 18, carbs: 28, fat: 28, tags: ["french", "vegetarian"] },
  { name: "Croque Monsieur", cal: 520, protein: 26, carbs: 38, fat: 28, tags: ["french"] },
  { name: "Croissant with Butter & Jam", cal: 380, protein: 6, carbs: 44, fat: 20, tags: ["french", "vegetarian", "quick"] },
  { name: "Arepas with Cheese", cal: 380, protein: 14, carbs: 42, fat: 16, tags: ["latin_american", "vegetarian"] },
  { name: "Pupusas", cal: 420, protein: 16, carbs: 48, fat: 18, tags: ["latin_american"] },
  { name: "Cachapas", cal: 440, protein: 14, carbs: 54, fat: 18, tags: ["latin_american", "vegetarian"] },
  { name: "Mangu (Dominican Plantain)", cal: 380, protein: 10, carbs: 58, fat: 12, tags: ["latin_american", "caribbean"] },
  { name: "Gallo Pinto", cal: 360, protein: 12, carbs: 56, fat: 8, tags: ["latin_american", "vegan"] },
  { name: "Llapingachos (Potato Patties)", cal: 380, protein: 12, carbs: 44, fat: 18, tags: ["latin_american", "vegetarian"] },
  { name: "Empanadas de Huevo", cal: 420, protein: 18, carbs: 38, fat: 22, tags: ["latin_american"] },
  { name: "Calentado Colombiano", cal: 480, protein: 22, carbs: 56, fat: 18, tags: ["latin_american"] },
  { name: "Akara (Bean Fritters)", cal: 300, protein: 14, carbs: 32, fat: 12, tags: ["african", "vegan"] },
  { name: "Mandazi (East African Donuts)", cal: 340, protein: 6, carbs: 48, fat: 14, tags: ["african", "vegetarian"] },
  { name: "Fatira (Layered Bread)", cal: 380, protein: 8, carbs: 52, fat: 16, tags: ["african"] },
  { name: "Genfo (Ethiopian Porridge)", cal: 320, protein: 8, carbs: 54, fat: 8, tags: ["african", "vegetarian"] },
  { name: "Injera with Scrambled Egg", cal: 360, protein: 16, carbs: 48, fat: 10, tags: ["african"] },
  { name: "Shakshuka North African", cal: 380, protein: 20, carbs: 26, fat: 20, tags: ["african", "mediterranean", "spicy"] },
  { name: "Saltfish & Ackee", cal: 420, protein: 26, carbs: 22, fat: 24, tags: ["caribbean", "seafood"] },
  { name: "Jamaican Cornmeal Porridge", cal: 320, protein: 8, carbs: 54, fat: 8, tags: ["caribbean", "vegetarian", "comfort"] },
  { name: "Johnnycakes", cal: 340, protein: 6, carbs: 48, fat: 14, tags: ["caribbean", "vegetarian"] },
  { name: "Plantain & Egg Scramble", cal: 380, protein: 16, carbs: 42, fat: 16, tags: ["caribbean"] },
  { name: "Chia Pudding with Mango", cal: 280, protein: 8, carbs: 38, fat: 12, tags: ["vegan", "light"] },
  { name: "Green Smoothie Bowl", cal: 320, protein: 10, carbs: 52, fat: 8, tags: ["vegan", "light"] },
  { name: "Egg White & Veggie Scramble", cal: 200, protein: 24, carbs: 10, fat: 6, tags: ["american", "high_protein", "light", "low_carb"] },
  { name: "Quinoa Breakfast Bowl", cal: 380, protein: 14, carbs: 54, fat: 12, tags: ["vegan", "high_protein"] },
  { name: "Cottage Cheese & Fruit", cal: 260, protein: 22, carbs: 28, fat: 6, tags: ["american", "high_protein", "light", "quick", "vegetarian"] },
  { name: "Smashed Chickpea Toast", cal: 340, protein: 14, carbs: 44, fat: 12, tags: ["mediterranean", "vegan", "quick"] },
  { name: "Sweet Potato Hash", cal: 360, protein: 12, carbs: 48, fat: 14, tags: ["american", "vegan", "one_pan"] },
  { name: "Buckwheat Pancakes", cal: 380, protein: 12, carbs: 56, fat: 12, tags: ["american", "vegetarian"] },
  { name: "Tofu Scramble", cal: 280, protein: 20, carbs: 14, fat: 16, tags: ["vegan", "high_protein", "quick"] },
  { name: "Breakfast Grain Bowl", cal: 420, protein: 14, carbs: 62, fat: 14, tags: ["vegetarian", "light"] },
  { name: "Almond Butter & Banana Wrap", cal: 380, protein: 12, carbs: 48, fat: 16, tags: ["vegan", "quick"] },
  { name: "Savory Oatmeal with Egg", cal: 380, protein: 18, carbs: 48, fat: 12, tags: ["american", "vegetarian"] },
  { name: "Cottage Cheese Pancakes", cal: 340, protein: 24, carbs: 32, fat: 12, tags: ["american", "high_protein", "vegetarian"] },
  { name: "Smoked Trout & Avocado Toast", cal: 420, protein: 24, carbs: 30, fat: 22, tags: ["american", "seafood"] },
  { name: "Shakshuka with Chickpeas", cal: 380, protein: 18, carbs: 36, fat: 16, tags: ["mediterranean", "vegetarian", "vegan"] },
  { name: "Mushroom & Gruyère Omelette", cal: 380, protein: 24, carbs: 6, fat: 28, tags: ["french", "vegetarian", "low_carb"] },
  { name: "Bircher Muesli", cal: 360, protein: 10, carbs: 56, fat: 10, tags: ["vegetarian", "light"] },
  { name: "Huevos Divorciados", cal: 490, protein: 24, carbs: 44, fat: 22, tags: ["mexican"] },
  { name: "Steak & Eggs", cal: 680, protein: 46, carbs: 4, fat: 50, tags: ["american", "high_protein"] },
  { name: "Dutch Baby Pancake", cal: 480, protein: 14, carbs: 58, fat: 20, tags: ["american", "french"] },
  { name: "Croque Madame", cal: 620, protein: 28, carbs: 38, fat: 36, tags: ["french"] },
  { name: "Quiche Lorraine", cal: 540, protein: 20, carbs: 34, fat: 36, tags: ["french"] },
  { name: "Waffles with Fried Chicken", cal: 680, protein: 36, carbs: 64, fat: 26, tags: ["american", "comfort"] },
  { name: "Tropical Fruit & Coconut Yogurt", cal: 280, protein: 6, carbs: 42, fat: 10, tags: ["vegan", "light", "quick"] },
  { name: "Matcha Oat Bowl", cal: 320, protein: 10, carbs: 48, fat: 10, tags: ["asian", "vegetarian", "light"] },
  { name: "Lox Breakfast Plate", cal: 440, protein: 30, carbs: 28, fat: 22, tags: ["american", "seafood"] },
  { name: "Savory Dutch Baby with Cheese", cal: 420, protein: 18, carbs: 36, fat: 24, tags: ["american", "french", "vegetarian"] },
  { name: "Breakfast Polenta with Egg", cal: 380, protein: 16, carbs: 44, fat: 16, tags: ["italian", "vegetarian"] },
  { name: "Smoked Salmon Eggs Benedict", cal: 560, protein: 30, carbs: 36, fat: 32, tags: ["american", "seafood"] },
  { name: "Arepa Reina Pepiada", cal: 460, protein: 24, carbs: 40, fat: 22, tags: ["latin_american"] },
  { name: "Stuffed French Toast", cal: 560, protein: 16, carbs: 72, fat: 22, tags: ["american", "french", "kid_friendly"] },
  { name: "Veggie Frittata", cal: 340, protein: 22, carbs: 12, fat: 22, tags: ["italian", "mediterranean", "vegetarian", "low_carb"] },
  { name: "Egg Fried Noodles", cal: 420, protein: 16, carbs: 56, fat: 14, tags: ["asian", "quick"] },
  { name: "Kaya Toast with Soft Eggs", cal: 360, protein: 14, carbs: 44, fat: 14, tags: ["asian", "southeast_asian"] },
  { name: "Ricotta Pancakes with Berries", cal: 460, protein: 16, carbs: 56, fat: 18, tags: ["italian", "vegetarian"] },
  { name: "Breakfast Fried Rice", cal: 440, protein: 20, carbs: 56, fat: 14, tags: ["asian", "one_pan"] },
  { name: "Avocado & Black Bean Toast", cal: 380, protein: 14, carbs: 42, fat: 18, tags: ["mexican", "vegan", "quick"] },
  { name: "Smoked Turkey & Egg Wrap", cal: 380, protein: 28, carbs: 28, fat: 16, tags: ["american", "high_protein", "quick"] },
  { name: "Cheese Blintzes", cal: 420, protein: 14, carbs: 46, fat: 20, tags: ["american", "vegetarian"] },
  { name: "Japanese Egg Sandwich", cal: 340, protein: 16, carbs: 34, fat: 16, tags: ["asian", "quick"] },
  { name: "Breakfast Pho", cal: 380, protein: 22, carbs: 44, fat: 10, tags: ["asian", "southeast_asian", "light"] },
  { name: "Shakshuka with Merguez", cal: 480, protein: 28, carbs: 26, fat: 28, tags: ["mediterranean", "african", "spicy"] },
  { name: "Korean Breakfast Stew", cal: 360, protein: 20, carbs: 32, fat: 16, tags: ["asian", "spicy", "comfort"] },
  { name: "Eggs in Purgatory", cal: 380, protein: 20, carbs: 28, fat: 20, tags: ["italian", "spicy", "vegetarian"] },
  { name: "Egg & Chorizo Tostada", cal: 440, protein: 24, carbs: 32, fat: 24, tags: ["mexican", "spicy"] },
  { name: "Vietnamese Coffee & Banh Mi", cal: 460, protein: 22, carbs: 48, fat: 18, tags: ["asian", "southeast_asian"] },
  { name: "Banana Oat Pancakes", cal: 380, protein: 14, carbs: 58, fat: 10, tags: ["american", "vegetarian", "kid_friendly"] },
  { name: "Chilaquiles con Pollo", cal: 520, protein: 28, carbs: 48, fat: 24, tags: ["mexican"] },
  { name: "Power Breakfast Bowl", cal: 420, protein: 22, carbs: 48, fat: 16, tags: ["american", "high_protein"] },
  { name: "Spinach & Feta Crêpe", cal: 360, protein: 16, carbs: 34, fat: 18, tags: ["french", "vegetarian"] },
  { name: "Southwest Egg Scramble", cal: 380, protein: 24, carbs: 18, fat: 24, tags: ["american", "mexican", "spicy"] },
  { name: "Maple Pecan Oatmeal", cal: 400, protein: 10, carbs: 58, fat: 14, tags: ["american", "vegetarian"] },
  { name: "Mediterranean Egg Plate", cal: 380, protein: 20, carbs: 22, fat: 24, tags: ["mediterranean", "vegetarian"] },
  { name: "Turkish Eggs (Cilbir)", cal: 380, protein: 18, carbs: 16, fat: 26, tags: ["mediterranean", "vegetarian"] },
  { name: "Chai Spiced Oatmeal", cal: 340, protein: 10, carbs: 54, fat: 8, tags: ["south_asian", "vegetarian"] },
  { name: "Avocado Eggs Benedict", cal: 520, protein: 22, carbs: 34, fat: 34, tags: ["american", "vegetarian"] },
  { name: "Smoked Salmon & Cream Cheese Wrap", cal: 420, protein: 26, carbs: 32, fat: 20, tags: ["american", "seafood", "quick"] },
  { name: "Lemon Ricotta Waffles", cal: 460, protein: 14, carbs: 58, fat: 20, tags: ["italian", "vegetarian"] },
  { name: "Breakfast Enchiladas", cal: 520, protein: 26, carbs: 44, fat: 26, tags: ["mexican"] },
  { name: "Egg Shakshuka with Feta & Herbs", cal: 400, protein: 22, carbs: 24, fat: 24, tags: ["mediterranean", "vegetarian"] },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if already seeded
    const { count } = await supabase.from("recipes").select("id", { count: "exact", head: true });
    if (count && count > 0) {
      return new Response(JSON.stringify({ message: `Already seeded with ${count} recipes` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allRows: any[] = [];

    // Breakfast
    for (const m of BREAKFAST) allRows.push(toRecipeRow(m, "breakfast", false));

    // Brunch (from mealPools brunch data)
    const BRUNCH: MealEntry[] = [
      { name: "Eggs Benedict Brunch", cal: 580, protein: 24, carbs: 38, fat: 36, tags: ["american", "french"] },
      { name: "Dutch Baby Pancake Brunch", cal: 480, protein: 14, carbs: 58, fat: 20, tags: ["american", "french"] },
      { name: "Croque Madame Brunch", cal: 620, protein: 28, carbs: 38, fat: 36, tags: ["french"] },
      { name: "Steak & Eggs Brunch", cal: 680, protein: 46, carbs: 4, fat: 50, tags: ["american", "high_protein"] },
      { name: "Huevos Divorciados Brunch", cal: 490, protein: 24, carbs: 44, fat: 22, tags: ["mexican"] },
      { name: "Quiche Lorraine Brunch", cal: 540, protein: 20, carbs: 34, fat: 36, tags: ["french"] },
      { name: "Waffles & Fried Chicken Brunch", cal: 680, protein: 36, carbs: 64, fat: 26, tags: ["american", "comfort"] },
      { name: "Shakshuka Brunch", cal: 380, protein: 20, carbs: 28, fat: 20, tags: ["mediterranean", "vegetarian"] },
      { name: "Chilaquiles Brunch", cal: 510, protein: 22, carbs: 54, fat: 22, tags: ["mexican", "spicy"] },
      { name: "Smoked Salmon Benedict Brunch", cal: 560, protein: 30, carbs: 36, fat: 32, tags: ["american", "seafood"] },
      { name: "Brioche French Toast Brunch", cal: 480, protein: 14, carbs: 58, fat: 22, tags: ["french", "kid_friendly"] },
      { name: "Crab Cake Benedict Brunch", cal: 580, protein: 28, carbs: 36, fat: 34, tags: ["american", "seafood"] },
      { name: "Monte Cristo Sandwich", cal: 620, protein: 28, carbs: 44, fat: 34, tags: ["american", "french"] },
      { name: "Banana Foster Pancakes", cal: 540, protein: 12, carbs: 72, fat: 22, tags: ["american", "french"] },
      { name: "Mushroom & Truffle Omelette", cal: 420, protein: 22, carbs: 8, fat: 32, tags: ["french", "vegetarian"] },
    ];
    for (const m of BRUNCH) allRows.push(toRecipeRow(m, "brunch", false));

    // Lunch - inline all
    const LUNCH: MealEntry[] = [
      { name: "Tuna Avocado Wrap", cal: 420, protein: 28, carbs: 34, fat: 18, tags: ["american", "seafood", "quick"] },
      { name: "Chicken Caesar Salad", cal: 380, protein: 32, carbs: 18, fat: 22, tags: ["american", "italian", "high_protein"] },
      { name: "BLT on Sourdough", cal: 440, protein: 18, carbs: 38, fat: 24, tags: ["american", "quick"] },
      { name: "Banh Mi", cal: 460, protein: 24, carbs: 52, fat: 14, tags: ["asian", "southeast_asian"] },
      { name: "Bibimbap Bowl", cal: 480, protein: 26, carbs: 58, fat: 12, tags: ["asian"] },
      { name: "Poke Bowl", cal: 440, protein: 30, carbs: 52, fat: 12, tags: ["asian", "seafood"] },
      { name: "Falafel Wrap", cal: 410, protein: 16, carbs: 52, fat: 16, tags: ["mediterranean", "vegan"] },
      { name: "Ground Beef Tacos", cal: 490, protein: 30, carbs: 44, fat: 20, tags: ["mexican"] },
      { name: "Quesadilla with Guac", cal: 480, protein: 26, carbs: 44, fat: 22, tags: ["mexican", "quick"] },
      { name: "Tom Yum Soup", cal: 280, protein: 20, carbs: 18, fat: 10, tags: ["asian", "seafood", "spicy", "light", "quick"] },
      { name: "Dal with Rice", cal: 390, protein: 18, carbs: 58, fat: 8, tags: ["south_asian", "vegan"] },
      { name: "Pasta Primavera", cal: 420, protein: 14, carbs: 62, fat: 14, tags: ["italian", "vegetarian", "quick"] },
      { name: "Ramen Bowl", cal: 520, protein: 24, carbs: 62, fat: 16, tags: ["asian", "comfort"] },
      { name: "Japanese Curry Rice", cal: 520, protein: 24, carbs: 68, fat: 14, tags: ["asian", "comfort"] },
      { name: "Pad See Ew", cal: 490, protein: 24, carbs: 62, fat: 14, tags: ["asian", "southeast_asian"] },
      { name: "Shakshuka on Toast", cal: 420, protein: 20, carbs: 36, fat: 18, tags: ["mediterranean", "vegetarian"] },
      { name: "Mezze Plate", cal: 380, protein: 14, carbs: 46, fat: 16, tags: ["mediterranean", "vegetarian"] },
      { name: "Cobb Salad", cal: 480, protein: 34, carbs: 14, fat: 32, tags: ["american", "high_protein"] },
      { name: "French Onion Soup", cal: 460, protein: 18, carbs: 42, fat: 22, tags: ["french", "comfort"] },
      { name: "Nicoise Salad", cal: 420, protein: 28, carbs: 24, fat: 22, tags: ["french", "mediterranean", "seafood", "light"] },
      { name: "Chicken Shawarma Wrap", cal: 520, protein: 34, carbs: 44, fat: 20, tags: ["mediterranean", "spicy"] },
      { name: "Greek Salad with Grilled Chicken", cal: 380, protein: 32, carbs: 16, fat: 20, tags: ["mediterranean", "high_protein", "light"] },
      { name: "Turkey Club Sandwich", cal: 480, protein: 28, carbs: 38, fat: 22, tags: ["american"] },
      { name: "Grilled Chicken & Hummus Bowl", cal: 440, protein: 36, carbs: 32, fat: 16, tags: ["mediterranean", "high_protein"] },
      { name: "Pad Thai", cal: 520, protein: 22, carbs: 64, fat: 18, tags: ["asian", "southeast_asian"] },
      { name: "Burrito Bowl", cal: 540, protein: 32, carbs: 56, fat: 16, tags: ["mexican"] },
      { name: "Caprese Panini", cal: 440, protein: 18, carbs: 42, fat: 22, tags: ["italian", "vegetarian"] },
      { name: "Shrimp Tacos", cal: 420, protein: 26, carbs: 40, fat: 16, tags: ["mexican", "seafood"] },
      { name: "Vietnamese Spring Rolls", cal: 320, protein: 16, carbs: 42, fat: 8, tags: ["asian", "southeast_asian", "light"] },
      { name: "Chicken Tortilla Soup", cal: 380, protein: 28, carbs: 34, fat: 14, tags: ["mexican", "comfort", "spicy"] },
      { name: "Teriyaki Chicken Bowl", cal: 480, protein: 32, carbs: 56, fat: 12, tags: ["asian", "quick"] },
      { name: "Mediterranean Grain Bowl", cal: 440, protein: 18, carbs: 54, fat: 16, tags: ["mediterranean", "vegetarian"] },
      { name: "Pulled Pork Sandwich", cal: 560, protein: 32, carbs: 48, fat: 24, tags: ["american", "comfort"] },
      { name: "Thai Basil Chicken Lunch", cal: 440, protein: 30, carbs: 42, fat: 16, tags: ["asian", "southeast_asian", "spicy", "quick"] },
      { name: "Salmon Sushi Bowl", cal: 460, protein: 28, carbs: 54, fat: 14, tags: ["asian", "seafood"] },
      { name: "Chicken Pho", cal: 380, protein: 26, carbs: 42, fat: 8, tags: ["asian", "southeast_asian", "light"] },
      { name: "Egg Salad Sandwich", cal: 420, protein: 18, carbs: 36, fat: 22, tags: ["american", "quick", "vegetarian"] },
      { name: "Korean Japchae", cal: 380, protein: 16, carbs: 52, fat: 12, tags: ["asian"] },
      { name: "Fish Taco Bowl", cal: 440, protein: 28, carbs: 46, fat: 14, tags: ["mexican", "seafood"] },
      { name: "Grilled Veggie Panini", cal: 400, protein: 14, carbs: 44, fat: 18, tags: ["italian", "vegetarian"] },
      { name: "Chicken Tikka Wrap", cal: 480, protein: 32, carbs: 42, fat: 18, tags: ["south_asian", "spicy"] },
      { name: "Crispy Tofu Rice Bowl", cal: 440, protein: 20, carbs: 56, fat: 14, tags: ["asian", "vegan"] },
      { name: "Lamb Gyro", cal: 520, protein: 28, carbs: 42, fat: 26, tags: ["mediterranean"] },
      { name: "Miso Ramen", cal: 480, protein: 22, carbs: 56, fat: 16, tags: ["asian", "comfort"] },
      { name: "Southwest Chicken Salad", cal: 420, protein: 30, carbs: 28, fat: 20, tags: ["american", "mexican"] },
      { name: "Soba Noodle Salad", cal: 360, protein: 14, carbs: 52, fat: 10, tags: ["asian", "light", "vegan"] },
      { name: "Cuban Sandwich", cal: 540, protein: 30, carbs: 44, fat: 26, tags: ["caribbean", "latin_american"] },
      { name: "Tom Kha Gai", cal: 340, protein: 22, carbs: 18, fat: 20, tags: ["asian", "southeast_asian", "spicy"] },
      { name: "Mediterranean Chicken Wrap", cal: 460, protein: 30, carbs: 38, fat: 20, tags: ["mediterranean"] },
      { name: "Carnitas Bowl", cal: 520, protein: 34, carbs: 48, fat: 22, tags: ["mexican"] },
    ];
    for (const m of LUNCH) allRows.push(toRecipeRow(m, "lunch", false));

    // Snack - abbreviated for size, using key items
    const SNACK: MealEntry[] = [
      { name: "Guacamole & Chips", cal: 320, protein: 4, carbs: 36, fat: 18, tags: ["mexican", "vegan", "quick"] },
      { name: "Edamame with Sea Salt", cal: 180, protein: 16, carbs: 14, fat: 8, tags: ["asian", "vegan", "quick", "light"] },
      { name: "Pan-Fried Dumplings", cal: 280, protein: 14, carbs: 32, fat: 10, tags: ["asian", "kid_friendly"] },
      { name: "Tzatziki with Pita", cal: 260, protein: 10, carbs: 28, fat: 12, tags: ["mediterranean", "vegetarian"] },
      { name: "Cheese & Crackers Board", cal: 280, protein: 10, carbs: 26, fat: 16, tags: ["american", "french", "kid_friendly"] },
      { name: "Hard Boiled Eggs", cal: 140, protein: 12, carbs: 1, fat: 10, tags: ["american", "high_protein", "quick"] },
      { name: "Bruschetta", cal: 220, protein: 6, carbs: 30, fat: 8, tags: ["italian", "vegan", "quick"] },
      { name: "Caprese Skewers", cal: 200, protein: 8, carbs: 6, fat: 14, tags: ["italian", "mediterranean", "vegetarian"] },
      { name: "Chicken Satay", cal: 260, protein: 24, carbs: 10, fat: 14, tags: ["asian", "southeast_asian", "high_protein"] },
      { name: "Spring Rolls (fresh)", cal: 200, protein: 10, carbs: 28, fat: 4, tags: ["asian", "southeast_asian", "light", "vegan"] },
      { name: "Hummus & Veggies", cal: 220, protein: 8, carbs: 24, fat: 10, tags: ["mediterranean", "vegan", "quick", "light"] },
      { name: "Trail Mix", cal: 280, protein: 8, carbs: 28, fat: 16, tags: ["american", "vegan", "quick"] },
      { name: "Apple Slices & Peanut Butter", cal: 240, protein: 8, carbs: 26, fat: 14, tags: ["american", "vegan", "quick", "kid_friendly"] },
      { name: "Greek Yogurt & Honey", cal: 180, protein: 14, carbs: 22, fat: 4, tags: ["mediterranean", "vegetarian", "quick"] },
      { name: "Popcorn with Seasonings", cal: 160, protein: 4, carbs: 28, fat: 6, tags: ["american", "vegan", "quick"] },
      { name: "Mango Sticky Rice Bites", cal: 260, protein: 4, carbs: 44, fat: 8, tags: ["asian", "southeast_asian", "vegan"] },
      { name: "Samosas", cal: 300, protein: 8, carbs: 36, fat: 14, tags: ["south_asian", "vegetarian"] },
      { name: "Stuffed Dates", cal: 220, protein: 6, carbs: 34, fat: 8, tags: ["mediterranean", "vegetarian", "quick"] },
      { name: "Deviled Eggs", cal: 200, protein: 12, carbs: 2, fat: 16, tags: ["american", "high_protein", "quick"] },
      { name: "Nachos with Cheese", cal: 380, protein: 12, carbs: 38, fat: 20, tags: ["mexican", "kid_friendly"] },
      { name: "Elote (Street Corn)", cal: 260, protein: 6, carbs: 30, fat: 14, tags: ["mexican", "vegetarian"] },
      { name: "Coconut Shrimp", cal: 300, protein: 16, carbs: 22, fat: 16, tags: ["caribbean", "seafood"] },
      { name: "Loaded Potato Skins", cal: 320, protein: 12, carbs: 28, fat: 18, tags: ["american", "comfort"] },
      { name: "Mozzarella Sticks", cal: 300, protein: 14, carbs: 24, fat: 16, tags: ["italian", "american", "kid_friendly"] },
      { name: "Jalapeño Poppers", cal: 280, protein: 10, carbs: 16, fat: 20, tags: ["mexican", "american", "spicy"] },
      { name: "Sweet Potato Fries", cal: 260, protein: 4, carbs: 38, fat: 10, tags: ["american", "vegan", "kid_friendly"] },
      { name: "Empanadas Mini", cal: 280, protein: 10, carbs: 28, fat: 14, tags: ["latin_american"] },
      { name: "Arancini (Rice Balls)", cal: 300, protein: 10, carbs: 34, fat: 14, tags: ["italian"] },
      { name: "Kimchi Pancake", cal: 240, protein: 8, carbs: 28, fat: 10, tags: ["asian", "spicy", "vegetarian"] },
      { name: "Naan Pizza Bites", cal: 280, protein: 12, carbs: 30, fat: 12, tags: ["south_asian", "italian", "kid_friendly", "quick"] },
    ];
    for (const m of SNACK) allRows.push(toRecipeRow(m, "snack", false));

    // Dinner - use the full pool from the data files  
    const DINNER: MealEntry[] = [
      { name: "Grilled Salmon with Salad", cal: 380, protein: 38, carbs: 10, fat: 20, tags: ["american", "seafood", "light", "high_protein"] },
      { name: "Shrimp & Zucchini Noodles", cal: 320, protein: 28, carbs: 16, fat: 16, tags: ["american", "seafood", "light", "low_carb"] },
      { name: "Miso Glazed Salmon", cal: 380, protein: 36, carbs: 18, fat: 18, tags: ["asian", "seafood", "light"] },
      { name: "Garlic Butter Shrimp Pasta", cal: 580, protein: 34, carbs: 62, fat: 20, tags: ["italian", "seafood"] },
      { name: "Cacio e Pepe", cal: 560, protein: 18, carbs: 72, fat: 22, tags: ["italian", "vegetarian"] },
      { name: "Chicken Pesto Pasta", cal: 540, protein: 36, carbs: 58, fat: 18, tags: ["italian"] },
      { name: "Sheet Pan Chicken Thighs", cal: 440, protein: 38, carbs: 22, fat: 22, tags: ["american", "one_pan"] },
      { name: "BBQ Smash Burgers", cal: 680, protein: 36, carbs: 52, fat: 34, tags: ["american", "comfort", "crowd"] },
      { name: "Chicken Enchiladas", cal: 560, protein: 36, carbs: 52, fat: 20, tags: ["mexican", "comfort"] },
      { name: "Beef Birria Tacos", cal: 580, protein: 38, carbs: 46, fat: 22, tags: ["mexican", "spicy", "crowd"] },
      { name: "Carne Asada Bowl", cal: 540, protein: 40, carbs: 52, fat: 16, tags: ["mexican", "high_protein"] },
      { name: "Korean Bulgogi Bowls", cal: 520, protein: 36, carbs: 56, fat: 14, tags: ["asian"] },
      { name: "Beef & Broccoli Stir Fry", cal: 460, protein: 34, carbs: 36, fat: 18, tags: ["asian", "one_pan"] },
      { name: "Thai Green Curry", cal: 520, protein: 30, carbs: 44, fat: 22, tags: ["asian", "southeast_asian", "spicy"] },
      { name: "Butter Chicken", cal: 520, protein: 36, carbs: 32, fat: 24, tags: ["south_asian", "mild", "comfort"] },
      { name: "Chicken Tikka Masala", cal: 500, protein: 38, carbs: 28, fat: 22, tags: ["south_asian", "spicy"] },
      { name: "Chicken Shawarma Bowl", cal: 500, protein: 38, carbs: 44, fat: 18, tags: ["mediterranean", "spicy"] },
      { name: "Jollof Rice with Chicken", cal: 540, protein: 34, carbs: 62, fat: 14, tags: ["african", "spicy", "crowd"] },
      { name: "Jerk Chicken", cal: 520, protein: 36, carbs: 52, fat: 16, tags: ["caribbean", "grill", "spicy"] },
      { name: "Boeuf Bourguignon", cal: 520, protein: 36, carbs: 28, fat: 24, tags: ["french", "comfort", "date_night"] },
      { name: "Chicken Parmesan", cal: 580, protein: 38, carbs: 42, fat: 26, tags: ["italian", "american", "comfort"] },
      { name: "Lasagna Bolognese", cal: 620, protein: 32, carbs: 56, fat: 28, tags: ["italian", "comfort", "crowd"] },
      { name: "Spaghetti Carbonara", cal: 580, protein: 24, carbs: 64, fat: 26, tags: ["italian"] },
      { name: "Pork Chops with Apple Sauce", cal: 480, protein: 36, carbs: 28, fat: 24, tags: ["american", "comfort"] },
      { name: "Meatloaf", cal: 520, protein: 32, carbs: 32, fat: 28, tags: ["american", "comfort", "kid_friendly"] },
      { name: "Grilled Ribeye Steak", cal: 620, protein: 48, carbs: 4, fat: 44, tags: ["american", "grill", "high_protein"] },
      { name: "Blackened Salmon", cal: 420, protein: 38, carbs: 8, fat: 26, tags: ["american", "seafood", "spicy"] },
      { name: "Seafood Paella", cal: 580, protein: 36, carbs: 62, fat: 16, tags: ["mediterranean", "seafood", "crowd"] },
      { name: "Tandoori Chicken", cal: 380, protein: 38, carbs: 12, fat: 18, tags: ["south_asian", "grill", "high_protein", "spicy"] },
      { name: "Lamb Kebabs", cal: 480, protein: 36, carbs: 14, fat: 30, tags: ["mediterranean", "grill", "high_protein"] },
      { name: "Falafel Plate", cal: 460, protein: 18, carbs: 52, fat: 18, tags: ["mediterranean", "vegan"] },
      { name: "Al Pastor Tacos", cal: 480, protein: 32, carbs: 44, fat: 18, tags: ["mexican", "spicy"] },
      { name: "Ropa Vieja", cal: 460, protein: 36, carbs: 24, fat: 24, tags: ["caribbean", "latin_american", "comfort"] },
      { name: "Coq au Vin", cal: 480, protein: 34, carbs: 18, fat: 28, tags: ["french", "comfort", "date_night"] },
      { name: "Steak Frites", cal: 620, protein: 42, carbs: 44, fat: 30, tags: ["french", "date_night"] },
      { name: "Ratatouille", cal: 280, protein: 8, carbs: 32, fat: 12, tags: ["french", "mediterranean", "vegan", "light"] },
      { name: "Chicken Adobo", cal: 460, protein: 34, carbs: 28, fat: 22, tags: ["asian", "southeast_asian", "comfort"] },
      { name: "Beef Rendang", cal: 520, protein: 34, carbs: 22, fat: 32, tags: ["asian", "southeast_asian", "spicy", "comfort"] },
      { name: "Mushroom Risotto", cal: 480, protein: 14, carbs: 62, fat: 18, tags: ["italian", "vegetarian", "comfort"] },
      { name: "Chicken Fajitas", cal: 440, protein: 30, carbs: 36, fat: 18, tags: ["mexican", "one_pan"] },
      { name: "Tofu Stir Fry", cal: 380, protein: 20, carbs: 38, fat: 16, tags: ["asian", "vegan", "quick"] },
      { name: "Pork Tenderloin", cal: 420, protein: 38, carbs: 14, fat: 22, tags: ["american", "french", "high_protein"] },
      { name: "Braised Short Ribs", cal: 580, protein: 38, carbs: 22, fat: 38, tags: ["american", "french", "comfort", "date_night"] },
      { name: "Mediterranean Grilled Chicken", cal: 420, protein: 36, carbs: 18, fat: 22, tags: ["mediterranean", "grill", "high_protein"] },
      { name: "Vegetable Lasagna", cal: 480, protein: 20, carbs: 48, fat: 22, tags: ["italian", "vegetarian", "comfort"] },
      { name: "Honey Garlic Glazed Salmon", cal: 440, protein: 36, carbs: 26, fat: 20, tags: ["asian", "american", "seafood"] },
      { name: "Coconut Chickpea Curry", cal: 420, protein: 14, carbs: 48, fat: 18, tags: ["south_asian", "vegan", "comfort"] },
      { name: "Grilled Chicken Thighs", cal: 400, protein: 36, carbs: 6, fat: 24, tags: ["american", "grill", "high_protein", "quick"] },
    ];
    for (const m of DINNER) allRows.push(toRecipeRow(m, "dinner", false));

    // Date Night
    const DATE_NIGHT: MealEntry[] = [
      { name: "Pan-Seared Filet Mignon", cal: 520, protein: 44, carbs: 4, fat: 34, tags: ["american", "french", "date_night", "high_protein"] },
      { name: "Lobster Pasta", cal: 620, protein: 38, carbs: 58, fat: 22, tags: ["italian", "seafood", "date_night"] },
      { name: "Seared Scallops with Risotto", cal: 580, protein: 34, carbs: 54, fat: 22, tags: ["italian", "seafood", "date_night"] },
      { name: "Duck Breast with Cherry Sauce", cal: 560, protein: 38, carbs: 28, fat: 28, tags: ["french", "date_night"] },
      { name: "Rack of Lamb", cal: 600, protein: 44, carbs: 10, fat: 40, tags: ["french", "mediterranean", "date_night"] },
      { name: "Beef Bourguignon", cal: 520, protein: 36, carbs: 28, fat: 24, tags: ["french", "date_night", "comfort"] },
      { name: "Salmon with Beurre Blanc", cal: 480, protein: 40, carbs: 8, fat: 28, tags: ["french", "seafood", "date_night"] },
      { name: "Mushroom Truffle Risotto", cal: 520, protein: 16, carbs: 64, fat: 22, tags: ["italian", "vegetarian", "date_night"] },
      { name: "Steak au Poivre", cal: 560, protein: 42, carbs: 8, fat: 38, tags: ["french", "date_night", "high_protein"] },
      { name: "Beef Wellington", cal: 640, protein: 38, carbs: 36, fat: 38, tags: ["french", "date_night"] },
      { name: "Lamb Chops with Rosemary", cal: 520, protein: 38, carbs: 8, fat: 36, tags: ["french", "mediterranean", "date_night", "grill"] },
      { name: "Truffle Pasta", cal: 540, protein: 18, carbs: 62, fat: 24, tags: ["italian", "date_night", "vegetarian"] },
      { name: "Wagyu Burger", cal: 620, protein: 36, carbs: 38, fat: 36, tags: ["american", "date_night"] },
      { name: "Seared Ahi Tuna", cal: 380, protein: 40, carbs: 8, fat: 18, tags: ["asian", "seafood", "date_night", "light", "high_protein"] },
      { name: "Surf & Turf", cal: 640, protein: 48, carbs: 8, fat: 44, tags: ["american", "seafood", "date_night", "high_protein"] },
      { name: "Korean BBQ Short Ribs", cal: 560, protein: 34, carbs: 32, fat: 32, tags: ["asian", "date_night", "grill"] },
      { name: "Miso Black Cod", cal: 420, protein: 32, carbs: 22, fat: 22, tags: ["asian", "seafood", "date_night"] },
      { name: "Shrimp Risotto", cal: 520, protein: 28, carbs: 56, fat: 20, tags: ["italian", "seafood", "date_night"] },
      { name: "Chilean Sea Bass", cal: 440, protein: 36, carbs: 8, fat: 28, tags: ["american", "seafood", "date_night"] },
    ];
    for (const m of DATE_NIGHT) allRows.push(toRecipeRow(m, "date_night", false));

    // Meal Prep
    const MEAL_PREP: MealEntry[] = [
      { name: "Dutch Oven Pulled Chicken", cal: 380, protein: 42, carbs: 8, fat: 18, tags: ["american", "high_protein"] },
      { name: "Ground Beef Picadillo", cal: 420, protein: 32, carbs: 28, fat: 20, tags: ["mexican", "latin_american"] },
      { name: "Big Batch Bolognese", cal: 520, protein: 32, carbs: 58, fat: 16, tags: ["italian", "comfort"] },
      { name: "Chicken Tinga", cal: 400, protein: 38, carbs: 16, fat: 20, tags: ["mexican"] },
      { name: "Lentil & Vegetable Stew", cal: 310, protein: 18, carbs: 44, fat: 6, tags: ["mediterranean", "vegan"] },
      { name: "Pork Carnitas", cal: 420, protein: 36, carbs: 8, fat: 28, tags: ["mexican"] },
      { name: "Beef Chuck Stew", cal: 480, protein: 36, carbs: 28, fat: 20, tags: ["american", "french", "comfort"] },
      { name: "Turkey Meatball Marinara", cal: 420, protein: 34, carbs: 32, fat: 16, tags: ["italian", "high_protein"] },
      { name: "Black Bean & Sweet Potato Chili", cal: 380, protein: 16, carbs: 54, fat: 10, tags: ["mexican", "vegan", "comfort"] },
      { name: "Chicken Tikka Masala Batch", cal: 480, protein: 36, carbs: 28, fat: 24, tags: ["south_asian", "spicy"] },
      { name: "Beef Chili", cal: 460, protein: 32, carbs: 34, fat: 20, tags: ["american", "spicy", "comfort"] },
      { name: "Chicken Shawarma Batch", cal: 420, protein: 36, carbs: 18, fat: 22, tags: ["mediterranean"] },
      { name: "Slow Cooker Pulled Pork", cal: 440, protein: 36, carbs: 12, fat: 28, tags: ["american", "comfort"] },
      { name: "Greek Chicken & Rice", cal: 460, protein: 34, carbs: 48, fat: 14, tags: ["mediterranean"] },
      { name: "Thai Basil Chicken Batch", cal: 420, protein: 30, carbs: 38, fat: 16, tags: ["asian", "southeast_asian", "spicy"] },
      { name: "Korean Beef Bulgogi Batch", cal: 480, protein: 34, carbs: 42, fat: 18, tags: ["asian"] },
      { name: "Chickpea Curry Batch", cal: 380, protein: 14, carbs: 50, fat: 14, tags: ["south_asian", "vegan"] },
      { name: "Teriyaki Chicken Prep", cal: 440, protein: 34, carbs: 38, fat: 14, tags: ["asian"] },
      { name: "BBQ Chicken Prep", cal: 400, protein: 36, carbs: 22, fat: 18, tags: ["american", "grill"] },
    ];
    for (const m of MEAL_PREP) allRows.push(toRecipeRow(m, "meal_prep", false));

    // Crowd Feed
    const CROWD_FEED: MealEntry[] = [
      { name: "Beef Birria Tacos (party)", cal: 580, protein: 38, carbs: 46, fat: 22, tags: ["mexican", "spicy", "crowd"] },
      { name: "Chicken Enchiladas (tray)", cal: 560, protein: 36, carbs: 52, fat: 20, tags: ["mexican", "crowd"] },
      { name: "Carnitas Taco Bar", cal: 520, protein: 38, carbs: 44, fat: 24, tags: ["mexican", "crowd"] },
      { name: "BBQ Pulled Pork Sandwiches", cal: 620, protein: 38, carbs: 52, fat: 24, tags: ["american", "grill", "comfort", "crowd"] },
      { name: "Smash Burgers Bar", cal: 680, protein: 36, carbs: 52, fat: 34, tags: ["american", "crowd"] },
      { name: "Pasta Bolognese Big Batch", cal: 580, protein: 32, carbs: 66, fat: 18, tags: ["italian", "comfort", "crowd"] },
      { name: "Jollof Rice & Chicken (party)", cal: 540, protein: 34, carbs: 62, fat: 14, tags: ["african", "spicy", "crowd"] },
      { name: "Korean BBQ Spread", cal: 560, protein: 38, carbs: 46, fat: 20, tags: ["asian", "grill", "crowd"] },
      { name: "Paella", cal: 580, protein: 36, carbs: 62, fat: 16, tags: ["mediterranean", "seafood", "crowd"] },
      { name: "Jerk Chicken Spread", cal: 520, protein: 36, carbs: 14, fat: 28, tags: ["caribbean", "spicy", "grill", "crowd"] },
      { name: "Lasagna Party Pan", cal: 580, protein: 28, carbs: 52, fat: 28, tags: ["italian", "comfort", "crowd"] },
      { name: "Taco Bar", cal: 480, protein: 26, carbs: 44, fat: 22, tags: ["mexican", "crowd", "kid_friendly"] },
      { name: "Pizza Party (homemade)", cal: 520, protein: 22, carbs: 58, fat: 22, tags: ["italian", "kid_friendly", "crowd"] },
      { name: "BBQ Brisket", cal: 580, protein: 40, carbs: 18, fat: 38, tags: ["american", "grill", "comfort", "crowd"] },
      { name: "Wing Night Spread", cal: 540, protein: 36, carbs: 18, fat: 36, tags: ["american", "spicy", "crowd"] },
      { name: "Ethiopian Feast", cal: 480, protein: 22, carbs: 54, fat: 18, tags: ["african", "spicy", "crowd", "vegetarian"] },
    ];
    for (const m of CROWD_FEED) allRows.push(toRecipeRow(m, "crowd_feed", false));

    // Baby Breakfast
    const BABY_BREAKFAST: MealEntry[] = [
      { name: "Soft Banana Oatmeal", cal: 180, protein: 4, carbs: 34, fat: 3, tags: ["kid_friendly", "mild"] },
      { name: "Scrambled Egg Bits", cal: 140, protein: 10, carbs: 2, fat: 10, tags: ["kid_friendly", "quick"] },
      { name: "Avocado Mash on Soft Toast", cal: 210, protein: 4, carbs: 24, fat: 11, tags: ["kid_friendly", "quick"] },
      { name: "Mashed Sweet Potato", cal: 150, protein: 2, carbs: 34, fat: 1, tags: ["kid_friendly", "mild", "vegan"] },
      { name: "Soft Blueberry Pancake Pieces", cal: 200, protein: 5, carbs: 36, fat: 5, tags: ["kid_friendly"] },
      { name: "Yogurt & Banana Mash", cal: 170, protein: 6, carbs: 30, fat: 3, tags: ["kid_friendly", "quick"] },
      { name: "Steamed Apple Slices", cal: 80, protein: 0, carbs: 20, fat: 0, tags: ["kid_friendly", "vegan", "quick"] },
      { name: "Egg Yolk with Rice Cereal", cal: 160, protein: 6, carbs: 22, fat: 6, tags: ["kid_friendly", "mild"] },
      { name: "Pear & Oat Puree", cal: 140, protein: 3, carbs: 28, fat: 2, tags: ["kid_friendly", "vegan"] },
      { name: "Mashed Banana & Peanut Butter", cal: 200, protein: 5, carbs: 28, fat: 8, tags: ["kid_friendly", "quick"] },
      { name: "Soft French Toast Fingers", cal: 180, protein: 6, carbs: 24, fat: 6, tags: ["kid_friendly"] },
      { name: "Cottage Cheese & Peach Mash", cal: 140, protein: 8, carbs: 18, fat: 4, tags: ["kid_friendly", "quick"] },
      { name: "Mini Banana Pancakes", cal: 180, protein: 4, carbs: 30, fat: 5, tags: ["kid_friendly"] },
      { name: "Avocado & Egg Mash", cal: 180, protein: 8, carbs: 8, fat: 14, tags: ["kid_friendly", "quick"] },
      { name: "Soft Cheese & Fruit Plate", cal: 160, protein: 6, carbs: 18, fat: 8, tags: ["kid_friendly", "quick"] },
    ];
    for (const m of BABY_BREAKFAST) allRows.push(toRecipeRow(m, "breakfast", true));

    // Baby Dinner
    const BABY_DINNER: MealEntry[] = [
      { name: "Soft Chicken & Carrot Mash", cal: 210, protein: 16, carbs: 22, fat: 6, tags: ["kid_friendly", "mild"] },
      { name: "Lentil & Sweet Potato Puree", cal: 190, protein: 8, carbs: 34, fat: 3, tags: ["kid_friendly", "vegan"] },
      { name: "Shredded Chicken & Rice", cal: 220, protein: 18, carbs: 26, fat: 5, tags: ["kid_friendly", "mild"] },
      { name: "Soft Pasta with Butter", cal: 200, protein: 6, carbs: 34, fat: 6, tags: ["kid_friendly", "mild"] },
      { name: "Ground Beef & Mashed Potato", cal: 230, protein: 16, carbs: 26, fat: 8, tags: ["kid_friendly"] },
      { name: "Steamed Salmon & Squash", cal: 200, protein: 18, carbs: 16, fat: 8, tags: ["kid_friendly", "seafood"] },
      { name: "Soft Veggie & Cheese Pasta", cal: 220, protein: 8, carbs: 32, fat: 8, tags: ["kid_friendly", "vegetarian"] },
      { name: "Turkey & Sweet Potato Mash", cal: 200, protein: 14, carbs: 28, fat: 4, tags: ["kid_friendly"] },
      { name: "Soft Tofu & Veggie Bowl", cal: 160, protein: 10, carbs: 18, fat: 6, tags: ["kid_friendly", "vegan"] },
      { name: "Mini Meatballs with Soft Veggies", cal: 220, protein: 16, carbs: 16, fat: 10, tags: ["kid_friendly"] },
      { name: "Mashed Peas & Rice", cal: 180, protein: 6, carbs: 32, fat: 2, tags: ["kid_friendly", "vegan"] },
      { name: "Soft Chicken Pasta", cal: 220, protein: 14, carbs: 30, fat: 6, tags: ["kid_friendly", "mild"] },
      { name: "Cod & Potato Mash", cal: 200, protein: 16, carbs: 24, fat: 4, tags: ["kid_friendly", "seafood"] },
      { name: "Soft Risotto with Peas", cal: 220, protein: 6, carbs: 36, fat: 6, tags: ["kid_friendly", "vegetarian", "mild"] },
      { name: "Steamed Broccoli & Cheese Melt", cal: 180, protein: 8, carbs: 14, fat: 10, tags: ["kid_friendly", "vegetarian"] },
    ];
    for (const m of BABY_DINNER) allRows.push(toRecipeRow(m, "dinner", true));

    // Deduplicate by name
    const seen = new Set<string>();
    const deduped = allRows.filter(r => {
      const key = `${r.name}_${r.category}_${r.is_baby}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < deduped.length; i += 50) {
      const batch = deduped.slice(i, i + 50);
      const { error } = await supabase.from("recipes").insert(batch);
      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
        throw error;
      }
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ message: `Seeded ${inserted} recipes`, total: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Seed error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
