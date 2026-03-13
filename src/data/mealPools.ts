export interface MealCard {
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
}

import { BREAKFAST_POOL } from "./meals/breakfast";
import { LUNCH_POOL } from "./meals/lunch";
import { SNACK_POOL } from "./meals/snack";
import { DINNER_POOL } from "./meals/dinner";
import { DATE_NIGHT_POOL, MEAL_PREP_POOL, CROWD_FEED_POOL, BABY_BREAKFAST_POOL, BABY_DINNER_POOL } from "./meals/specialty";

// High-protein cross-section pool
const HIGH_PROTEIN_POOL: MealCard[] = [
  { name: "Grilled Chicken & Egg Bowl", cal: 480, protein: 52, carbs: 18, fat: 18, tags: ["american", "high_protein"] },
  { name: "Steak & Roasted Veg", cal: 560, protein: 48, carbs: 20, fat: 28, tags: ["american", "high_protein"] },
  { name: "Salmon & Quinoa Bowl", cal: 480, protein: 44, carbs: 38, fat: 16, tags: ["american", "seafood", "high_protein"] },
  { name: "Shrimp & Egg Stir Fry", cal: 380, protein: 36, carbs: 18, fat: 16, tags: ["asian", "seafood", "high_protein", "one_pan"] },
  { name: "Greek Chicken Bowl", cal: 440, protein: 42, carbs: 24, fat: 16, tags: ["mediterranean", "high_protein"] },
  { name: "Turkish Lamb Kebabs", cal: 500, protein: 44, carbs: 12, fat: 28, tags: ["mediterranean", "grill", "high_protein"] },
  { name: "Chicken Tikka Bowl", cal: 460, protein: 44, carbs: 28, fat: 16, tags: ["south_asian", "high_protein"] },
  { name: "Carne Asada Plate", cal: 520, protein: 48, carbs: 18, fat: 24, tags: ["mexican", "grill", "high_protein"] },
  { name: "Korean Beef Bowl", cal: 500, protein: 42, carbs: 38, fat: 16, tags: ["asian", "high_protein"] },
];

// Quick under-20 cross-section pool
const UNDER_20_POOL: MealCard[] = [
  { name: "Pasta Aglio e Olio", cal: 460, protein: 14, carbs: 64, fat: 18, tags: ["italian", "quick", "vegan"] },
  { name: "Shrimp Stir Fry", cal: 380, protein: 30, carbs: 28, fat: 14, tags: ["asian", "seafood", "quick", "one_pan"] },
  { name: "Fried Egg Rice", cal: 380, protein: 16, carbs: 54, fat: 12, tags: ["asian", "quick", "one_pan"] },
  { name: "Chicken Quesadilla", cal: 470, protein: 32, carbs: 38, fat: 20, tags: ["mexican", "quick"] },
  { name: "Scrambled Eggs & Toast", cal: 380, protein: 22, carbs: 34, fat: 16, tags: ["american", "quick", "kid_friendly"] },
  { name: "Caprese Sandwich", cal: 400, protein: 16, carbs: 42, fat: 16, tags: ["italian", "vegetarian", "quick"] },
  { name: "Noodles with Peanut Sauce", cal: 460, protein: 16, carbs: 62, fat: 16, tags: ["asian", "southeast_asian", "quick"] },
  { name: "Pan Salmon with Lemon", cal: 360, protein: 38, carbs: 6, fat: 18, tags: ["american", "seafood", "quick"] },
  { name: "Pesto Pasta", cal: 480, protein: 16, carbs: 62, fat: 18, tags: ["italian", "quick", "vegetarian"] },
  { name: "Steak Tacos", cal: 490, protein: 34, carbs: 38, fat: 20, tags: ["mexican", "quick", "grill"] },
];

// Kid-friendly cross-section pool
const KID_FRIENDLY_POOL: MealCard[] = [
  { name: "Mac & Cheese (homemade)", cal: 480, protein: 16, carbs: 62, fat: 18, tags: ["american", "kid_friendly", "comfort"] },
  { name: "Chicken Nuggets (homemade)", cal: 460, protein: 32, carbs: 34, fat: 20, tags: ["american", "kid_friendly"] },
  { name: "Spaghetti & Meatballs", cal: 580, protein: 32, carbs: 66, fat: 18, tags: ["italian", "kid_friendly", "comfort"] },
  { name: "Pizza Quesadillas", cal: 440, protein: 22, carbs: 44, fat: 20, tags: ["american", "italian", "kid_friendly"] },
  { name: "Pancakes with Berries", cal: 480, protein: 12, carbs: 72, fat: 14, tags: ["american", "kid_friendly"] },
  { name: "Chicken Fried Rice", cal: 460, protein: 26, carbs: 58, fat: 12, tags: ["asian", "kid_friendly", "one_pan"] },
  { name: "Mini Turkey Meatballs", cal: 380, protein: 28, carbs: 24, fat: 18, tags: ["american", "italian", "kid_friendly"] },
  { name: "Quesadilla with Cheese", cal: 400, protein: 18, carbs: 40, fat: 18, tags: ["mexican", "kid_friendly", "quick"] },
  { name: "Grilled Cheese & Tomato Soup", cal: 440, protein: 16, carbs: 52, fat: 18, tags: ["american", "kid_friendly", "comfort"] },
  { name: "Fish Sticks (homemade)", cal: 420, protein: 26, carbs: 36, fat: 16, tags: ["american", "seafood", "kid_friendly"] },
  { name: "Buttered Egg Noodles", cal: 380, protein: 12, carbs: 58, fat: 12, tags: ["american", "kid_friendly", "quick", "comfort"] },
  { name: "Taquitos (baked)", cal: 440, protein: 22, carbs: 48, fat: 16, tags: ["mexican", "kid_friendly"] },
];

// Late night pool
const LATE_NIGHT_POOL: MealCard[] = [
  { name: "Instant Ramen Upgrade", cal: 480, protein: 18, carbs: 62, fat: 16, tags: ["asian", "quick", "comfort"] },
  { name: "Fried Rice", cal: 420, protein: 16, carbs: 62, fat: 12, tags: ["asian", "quick", "one_pan"] },
  { name: "Quesadilla", cal: 440, protein: 22, carbs: 42, fat: 20, tags: ["mexican", "quick"] },
  { name: "Loaded Fries", cal: 520, protein: 12, carbs: 64, fat: 24, tags: ["american", "comfort", "quick"] },
  { name: "Grilled Cheese", cal: 420, protein: 16, carbs: 42, fat: 22, tags: ["american", "quick", "kid_friendly"] },
  { name: "Pasta Aglio e Olio", cal: 460, protein: 14, carbs: 64, fat: 18, tags: ["italian", "quick", "vegan"] },
  { name: "Noodles with Chili Oil", cal: 420, protein: 12, carbs: 60, fat: 16, tags: ["asian", "spicy", "quick", "vegan"] },
  { name: "Breakfast Sandwich", cal: 500, protein: 26, carbs: 40, fat: 26, tags: ["american", "quick", "comfort"] },
];

// Brunch pool (breakfast + brunch specialty)
const BRUNCH_POOL: MealCard[] = [
  { name: "Eggs Benedict", cal: 580, protein: 24, carbs: 38, fat: 36, tags: ["american", "french"] },
  { name: "Dutch Baby Pancake", cal: 480, protein: 14, carbs: 58, fat: 20, tags: ["american", "french"] },
  { name: "Classic French Omelette", cal: 380, protein: 22, carbs: 6, fat: 30, tags: ["french"] },
  { name: "Croque Madame", cal: 620, protein: 28, carbs: 38, fat: 36, tags: ["french"] },
  { name: "Steak & Eggs", cal: 680, protein: 46, carbs: 4, fat: 50, tags: ["american", "high_protein"] },
  { name: "Huevos Divorciados", cal: 490, protein: 24, carbs: 44, fat: 22, tags: ["mexican"] },
  { name: "Quiche Lorraine", cal: 540, protein: 20, carbs: 34, fat: 36, tags: ["french"] },
  { name: "Waffles with Fried Chicken", cal: 680, protein: 36, carbs: 64, fat: 26, tags: ["american", "comfort"] },
  { name: "Shakshuka Brunch", cal: 380, protein: 20, carbs: 28, fat: 20, tags: ["mediterranean", "vegetarian"] },
  { name: "Chilaquiles Brunch", cal: 510, protein: 22, carbs: 54, fat: 22, tags: ["mexican", "spicy"] },
  { name: "Smoked Salmon Benedict", cal: 560, protein: 30, carbs: 36, fat: 32, tags: ["american", "seafood"] },
  { name: "Brioche French Toast", cal: 480, protein: 14, carbs: 58, fat: 22, tags: ["french", "kid_friendly"] },
  { name: "Crab Cake Benedict", cal: 580, protein: 28, carbs: 36, fat: 34, tags: ["american", "seafood"] },
  { name: "Monte Cristo Sandwich", cal: 620, protein: 28, carbs: 44, fat: 34, tags: ["american", "french"] },
  { name: "Banana Foster Pancakes", cal: 540, protein: 12, carbs: 72, fat: 22, tags: ["american", "french"] },
  { name: "Mushroom & Truffle Omelette", cal: 420, protein: 22, carbs: 8, fat: 32, tags: ["french", "vegetarian"] },
];

export const MEAL_POOLS: Record<string, MealCard[]> = {
  breakfast: BREAKFAST_POOL,
  brunch: BRUNCH_POOL,
  quick_lunch: LUNCH_POOL.filter(m => m.tags.includes("quick")),
  sit_down_lunch: LUNCH_POOL.filter(m => !m.tags.includes("quick")),
  afternoon_snack: SNACK_POOL,
  light_dinner: DINNER_POOL.filter(m => m.tags.includes("light")),
  full_dinner: DINNER_POOL.filter(m => !m.tags.includes("light")),
  late_night: LATE_NIGHT_POOL,
  meal_prep: MEAL_PREP_POOL,
  high_protein: HIGH_PROTEIN_POOL,
  under_20_min: UNDER_20_POOL,
  kid_friendly: KID_FRIENDLY_POOL,
  date_night: DATE_NIGHT_POOL,
  crowd_feed: CROWD_FEED_POOL,
  baby_breakfast: BABY_BREAKFAST_POOL,
  baby_dinner: BABY_DINNER_POOL,
};

// Map composite section IDs to combined pools
MEAL_POOLS.lunch = [...LUNCH_POOL];
MEAL_POOLS.dinner = [...DINNER_POOL];
MEAL_POOLS.snack = [...SNACK_POOL];
MEAL_POOLS.child_breakfast = [...BABY_BREAKFAST_POOL, ...KID_FRIENDLY_POOL.filter(c => c.cal < 500)];
MEAL_POOLS.child_lunch = [...KID_FRIENDLY_POOL, ...LUNCH_POOL.filter(c => c.tags.includes("kid_friendly") || c.tags.includes("mild"))];
MEAL_POOLS.child_snack = [...SNACK_POOL.filter(c => c.tags.includes("kid_friendly") || c.cal < 300)];
MEAL_POOLS.child_dinner = [...KID_FRIENDLY_POOL, ...DINNER_POOL.filter(c => c.tags.includes("kid_friendly") || c.tags.includes("mild"))];
