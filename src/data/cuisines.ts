export const CUISINES = [
  "Mexican & Tex-Mex",
  "East Asian (Chinese, Japanese, Korean)",
  "Southeast Asian (Thai, Vietnamese, Filipino)",
  "South Asian (Indian, Pakistani, Sri Lankan)",
  "Mediterranean & Middle Eastern",
  "Italian & Southern European",
  "American (BBQ, Southern, Comfort)",
  "Latin American (Peruvian, Brazilian, Colombian, Argentine)",
  "Caribbean",
  "African & West African",
  "French & Classical European",
  "Seafood-Forward",
] as const;

export type CuisineSliderValue = 0 | 1 | 2 | 3 | 4;
export const CUISINE_LABELS = ["Off", "Subtle", "Balanced", "Strong", "Always"] as const;
