export const CUISINES = [
  "Mexican",
  "Chinese",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Indian",
  "Mediterranean",
  "Italian",
  "American",
  "Latin American",
  "Caribbean",
  "African",
  "French",
  "Seafood",
  "Filipino",
  "Middle Eastern",
  "Greek",
  "Southern / Soul Food",
  "BBQ",
] as const;

export type CuisineSliderValue = 0 | 1 | 2 | 3 | 4;
export const CUISINE_LABELS = ["Don't like", "A little", "It's okay", "I like it", "I love it!"] as const;
export const CUISINE_LABEL_COLORS = ["text-red-500", "text-yellow-500", "text-yellow-500", "text-emerald-500", "text-emerald-600"] as const;
