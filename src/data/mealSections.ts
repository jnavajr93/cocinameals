export interface MealSectionDef {
  id: string;
  name: string;
  description: string;
  defaultOn: boolean;
  isAuto?: boolean; // baby sections
}

export const MEAL_SECTIONS: MealSectionDef[] = [
  { id: "breakfast", name: "Breakfast", description: "Morning fuel, sweet or savory", defaultOn: true },
  { id: "brunch", name: "Brunch", description: "Lazy weekend mornings", defaultOn: false },
  { id: "lunch", name: "Lunch", description: "Midday meals", defaultOn: true },
  { id: "dinner", name: "Dinner", description: "Evening meals", defaultOn: true },
  { id: "snacks", name: "Snacks", description: "Between-meal bites", defaultOn: false },
  { id: "meal_prep", name: "Meal Prep", description: "Cook once, eat multiple days", defaultOn: false },
  { id: "kid_friendly", name: "Kid-Friendly", description: "Mild, fun, approachable", defaultOn: false },
  { id: "baby_breakfast", name: "Baby Breakfast", description: "Morning meals for little ones", defaultOn: false, isAuto: true },
  { id: "baby_snack", name: "Baby Snack", description: "Safe, soft snack ideas", defaultOn: false, isAuto: true },
  { id: "baby_lunch", name: "Baby Lunch", description: "Midday meals for babies", defaultOn: false, isAuto: true },
  { id: "baby_dinner", name: "Baby Dinner", description: "Evening meals for babies", defaultOn: false, isAuto: true },
];

export const QUICK_FILTERS = [
  "High Protein", "Under 20 Min", "Low Carb", "Dairy-Free", "Gluten-Free",
  "Vegetarian", "Vegan", "Spicy", "Mild", "Seafood", "Chicken", "Beef", "No Meat",
  "Kid-Friendly", "Comfort Food", "Light & Fresh",
  "One Pan", "Air Fryer Only",
] as const;

export const DIET_RESTRICTIONS = [
  "None", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Keto / Low Carb", "Halal", "Kosher", "Nut-Free", "Shellfish-Free",
] as const;
