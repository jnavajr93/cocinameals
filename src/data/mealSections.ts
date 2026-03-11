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
  { id: "sit_down_lunch", name: "Sit-Down Lunch", description: "More involved, worth the time", defaultOn: false },
  { id: "afternoon_snack", name: "Afternoon Snack", description: "3pm slump fix", defaultOn: false },
  { id: "light_dinner", name: "Light Dinner", description: "Lower calorie, lighter meals", defaultOn: false },
  { id: "full_dinner", name: "Full Dinner", description: "Proper sit-down meals", defaultOn: true },
  { id: "late_night", name: "Late Night", description: "Quick bites after 9pm", defaultOn: false },
  { id: "meal_prep", name: "Meal Prep", description: "Cook once, eat multiple days", defaultOn: false },
  { id: "high_protein", name: "High Protein", description: "Macro-focused meals", defaultOn: false },
  { id: "under_20_min", name: "Under 20 Min", description: "Speed is everything", defaultOn: false },
  { id: "kid_friendly", name: "Kid-Friendly", description: "Mild, fun, approachable", defaultOn: false },
  { id: "date_night", name: "Date Night", description: "Impressive, elevated cooking", defaultOn: false },
  { id: "crowd_feed", name: "Crowd Feed", description: "Feeding 6+ people", defaultOn: false },
];

export const QUICK_FILTERS = [
  "Under 20 Min", "High Protein", "Low Carb", "Dairy-Free", "Gluten-Free",
  "Vegetarian", "Vegan", "Spicy", "Mild", "Seafood", "Chicken", "Beef", "No Meat",
  "Kid-Friendly", "Date Night", "Comfort Food", "Light & Fresh",
  "Uses Leftovers", "One Pan", "Grill Only", "Air Fryer Only",
] as const;

export const DIET_RESTRICTIONS = [
  "None", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Keto / Low Carb", "Halal", "Kosher", "Nut-Free", "Shellfish-Free",
] as const;
