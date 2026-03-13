// Smart ingredient name matching for pantry items

/**
 * Strip quantity/measurement prefixes from recipe ingredient lines
 * "1 portion onion" → "onion"
 * "2 cups chicken broth" → "chicken broth"
 * "- 1/2 lb ground beef" → "ground beef"
 */
export function extractIngredientName(raw: string): string {
  let s = raw.trim();
  // Strip bullet
  s = s.replace(/^[-•]\s*/, "");
  // Strip leading numbers, fractions, decimals
  s = s.replace(/^[\d½¼¾⅓⅔⅛]+[\s/.\d]*\s*/, "");
  // Strip common units
  s = s.replace(/^(cups?|tbsps?|tsps?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|portions?|pieces?|cloves?|stalks?|cans?|bunch(es)?|heads?|slices?|sprigs?|handfuls?|pinch(es)?|dashes?|splashes?|packages?|sticks?)\s+/i, "");
  // Strip "of "
  s = s.replace(/^of\s+/i, "");
  // Strip trailing parenthetical like "(missing item)"
  s = s.replace(/\s*\(.*?\)\s*$/, "");
  // Trim
  return s.trim();
}

/**
 * Normalize a name for comparison: lowercase, strip plurals, common variations
 */
function normalize(name: string): string {
  let s = name.toLowerCase().trim();
  // Remove trailing 's' for basic plural handling (but not "ss" like "swiss")
  if (s.endsWith("es") && !s.endsWith("ses") && !s.endsWith("ches") && !s.endsWith("shes")) {
    s = s.slice(0, -2);
  } else if (s.endsWith("s") && !s.endsWith("ss")) {
    s = s.slice(0, -1);
  }
  return s;
}

/**
 * Find the best matching pantry item name for a recipe ingredient.
 * Returns the pantry item name if matched, or null.
 */
export function findPantryMatch(ingredientName: string, pantryNames: string[]): string | null {
  const cleaned = extractIngredientName(ingredientName);
  const normCleaned = normalize(cleaned);

  // Exact match (case-insensitive)
  for (const pn of pantryNames) {
    if (pn.toLowerCase() === cleaned.toLowerCase()) return pn;
  }

  // Normalized match
  for (const pn of pantryNames) {
    if (normalize(pn) === normCleaned) return pn;
  }

  // Substring containment: pantry name contains ingredient or vice versa
  for (const pn of pantryNames) {
    const normPn = normalize(pn);
    if (normPn.includes(normCleaned) || normCleaned.includes(normPn)) {
      return pn;
    }
  }

  // Word overlap: if ingredient has 2+ words matching pantry item
  const cleanedWords = normCleaned.split(/\s+/);
  for (const pn of pantryNames) {
    const pnWords = normalize(pn).split(/\s+/);
    const overlap = cleanedWords.filter(w => pnWords.some(pw => pw === w || pw.includes(w) || w.includes(pw)));
    if (overlap.length >= 1 && (overlap.length / Math.max(cleanedWords.length, pnWords.length)) >= 0.5) {
      return pn;
    }
  }

  return null;
}

/**
 * Check if an ingredient (from recipe text) is in stock
 */
export function isIngredientInStock(ingredientName: string, inStockNames: string[]): boolean {
  return findPantryMatch(ingredientName, inStockNames) !== null;
}
