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
  { id: "quick_lunch", name: "Quick Lunch", description: "Under 20 min, midday", defaultOn: true },
  { id: "full_dinner", name: "Full Dinner", description: "Proper sit-down meals", defaultOn: true },
  { id: "light_dinner", name: "Light Dinner", description: "Lower calorie, lighter meals", defaultOn: false },
  { id: "meal_prep", name: "Meal Prep", description: "Cook once, eat multiple days", defaultOn: false },
  { id: "kid_friendly", name: "Kid-Friendly", description: "Mild, fun, approachable", defaultOn: false },
  { id: "high_protein", name: "High Protein", description: "Macro-focused meals", defaultOn: false },
];

export const QUICK_FILTERS = [
  "Under 20 Min", "High Protein", "Low Carb", "Dairy-Free", "Gluten-Free",
  "Vegetarian", "Vegan", "Spicy", "Mild", "Seafood", "Chicken", "Beef", "No Meat",
  "Kid-Friendly", "Comfort Food", "Light & Fresh",
  "One Pan", "Air Fryer Only",
] as const;

export const DIET_RESTRICTIONS = [
  "None", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Keto / Low Carb", "Halal", "Kosher", "Nut-Free", "Shellfish-Free",
] as const;
