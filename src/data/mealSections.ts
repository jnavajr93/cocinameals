export interface MealSectionDef {
  id: string;
  name: string;
  description: string;
  defaultOn: boolean;
  isAuto?: boolean; // baby sections
}

export const MEAL_SECTIONS: MealSectionDef[] = [
  { id: "breakfast", name: "Breakfast", description: "Morning fuel, sweet or savory", defaultOn: true },
  { id: "child_breakfast", name: "Child Breakfast", description: "Kid-friendly morning meals", defaultOn: false },
  { id: "lunch", name: "Lunch", description: "Midday meals", defaultOn: true },
  { id: "child_lunch", name: "Child Lunch", description: "Kid-friendly midday meals", defaultOn: false },
  { id: "snack", name: "Snack", description: "Between-meal bites", defaultOn: false },
  { id: "child_snack", name: "Child Snack", description: "Kid-friendly snack ideas", defaultOn: false },
  { id: "dinner", name: "Dinner", description: "Evening meals", defaultOn: true },
  { id: "child_dinner", name: "Child Dinner", description: "Kid-friendly evening meals", defaultOn: false },
  { id: "date_night", name: "Date Night", description: "Special meals for two", defaultOn: false },
  { id: "meal_prep", name: "Meal Prep", description: "Cook once, eat multiple days", defaultOn: false },
  { id: "crowd_feed", name: "Crowd Feed", description: "Feeds a crowd, great for gatherings", defaultOn: false },
];

// Default cook times per section (in minutes)
export const DEFAULT_SECTION_TIMES: Record<string, number> = {
  breakfast: 15,
  child_breakfast: 10,
  lunch: 25,
  child_lunch: 15,
  snack: 10,
  child_snack: 5,
  dinner: 35,
  child_dinner: 20,
  date_night: 45,
  meal_prep: 60,
  crowd_feed: 45,
};

// Map child sections to their adult counterpart for similar meal generation
export const CHILD_ADULT_PAIRS: Record<string, string> = {
  child_breakfast: "breakfast",
  child_lunch: "lunch",
  child_snack: "snack",
  child_dinner: "dinner",
};

export const QUICK_FILTERS = [
  "High Protein", "Under 20 Min", "Low Carb", "Dairy-Free", "Gluten-Free",
  "Vegetarian", "Vegan", "Spicy", "Mild", "Seafood", "Chicken", "Beef", "No Meat",
  "Kid-Friendly", "Comfort Food", "Light & Fresh",
] as const;

export const DIET_RESTRICTIONS = [
  "None", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Keto / Low Carb", "Halal", "Kosher", "Nut-Free", "Shellfish-Free",
] as const;
