// Smart caching for meal suggestions

const CACHE_PREFIX = "cocina_meals_";
const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours
const RECENT_KEY = "cocina_recent_suggestions";
const MAX_RECENT = 15;

export function getPantryHash(pantryItems: string[]): string {
  const sorted = [...pantryItems].sort();
  let hash = 0;
  const str = sorted.join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(sectionId: string, pantryHash: string, inStockOnly: boolean): string {
  return `${CACHE_PREFIX}${sectionId}_${pantryHash}_${inStockOnly ? "stock" : "discover"}`;
}

export function getCachedMeals(sectionId: string, pantryHash: string, inStockOnly: boolean): any[] | null {
  const key = getCacheKey(sectionId, pantryHash, inStockOnly);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { meals, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return meals;
  } catch {
    return null;
  }
}

export function setCachedMeals(sectionId: string, pantryHash: string, inStockOnly: boolean, meals: any[]): void {
  const key = getCacheKey(sectionId, pantryHash, inStockOnly);
  try {
    localStorage.setItem(key, JSON.stringify({ meals, ts: Date.now() }));
  } catch {}
}

export function clearAllMealCaches(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

// Recent suggestions blacklist
export function getRecentSuggestions(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSuggestions(names: string[]): void {
  try {
    const current = getRecentSuggestions();
    const updated = [...current, ...names];
    // Keep only the last MAX_RECENT
    const trimmed = updated.slice(-MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function clearRecentSuggestions(): void {
  localStorage.removeItem(RECENT_KEY);
}
