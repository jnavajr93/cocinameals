// Smart caching for meal suggestions — accumulative pool per section

const POOL_PREFIX = "cocina_pool_";
const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours per individual entry
const RECENT_KEY = "cocina_recent_suggestions";
const MAX_RECENT = 15;

// Pool size limits per section category
const POOL_LIMITS: Record<string, number> = {
  breakfast: 100,
  child_breakfast: 100,
  brunch: 100,
  lunch: 80,
  child_lunch: 80,
  snack: 70,
  child_snack: 70,
  dinner: 100,
  child_dinner: 100,
  date_night: 100,
  meal_prep: 100,
  crowd_feed: 50,
};

const DEFAULT_POOL_LIMIT = 80;

export function getPoolLimit(sectionId: string): number {
  // Check exact match first, then check if section starts with a known key
  if (POOL_LIMITS[sectionId] !== undefined) return POOL_LIMITS[sectionId];
  for (const [key, limit] of Object.entries(POOL_LIMITS)) {
    if (sectionId.startsWith(key)) return limit;
  }
  return DEFAULT_POOL_LIMIT;
}

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

interface PoolEntry {
  meals: any[];
  pantryHash: string;
  inStockOnly: boolean;
  updatedAt: number;
}

function getPoolKey(sectionId: string): string {
  return `${POOL_PREFIX}${sectionId}`;
}

export function getMealPool(sectionId: string, pantryHash: string, inStockOnly: boolean): any[] {
  const key = getPoolKey(sectionId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const entry: PoolEntry = JSON.parse(raw);
    // If pantry changed or stock mode changed, pool is stale — clear it
    if (entry.pantryHash !== pantryHash || entry.inStockOnly !== inStockOnly) {
      localStorage.removeItem(key);
      return [];
    }
    // If older than 12 hours, clear
    if (Date.now() - entry.updatedAt > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return [];
    }
    return entry.meals || [];
  } catch {
    return [];
  }
}

export function addToMealPool(sectionId: string, pantryHash: string, inStockOnly: boolean, newMeals: any[]): any[] {
  const existing = getMealPool(sectionId, pantryHash, inStockOnly);
  const limit = getPoolLimit(sectionId);
  
  // Deduplicate by meal name
  const existingNames = new Set(existing.map((m: any) => m.name));
  const toAdd = newMeals.filter((m: any) => !existingNames.has(m.name));
  
  const combined = [...existing, ...toAdd].slice(0, limit);
  
  const entry: PoolEntry = {
    meals: combined,
    pantryHash,
    inStockOnly,
    updatedAt: Date.now(),
  };
  
  try {
    localStorage.setItem(getPoolKey(sectionId), JSON.stringify(entry));
  } catch {}
  
  return combined;
}

export function getPoolSize(sectionId: string, pantryHash: string, inStockOnly: boolean): number {
  return getMealPool(sectionId, pantryHash, inStockOnly).length;
}

export function isPoolFull(sectionId: string, pantryHash: string, inStockOnly: boolean): boolean {
  return getPoolSize(sectionId, pantryHash, inStockOnly) >= getPoolLimit(sectionId);
}

/** Pick n random meals from the pool, avoiding recently shown */
export function pickFromPool(sectionId: string, pantryHash: string, inStockOnly: boolean, count: number): any[] {
  const pool = getMealPool(sectionId, pantryHash, inStockOnly);
  if (pool.length === 0) return [];
  
  const recent = getRecentSuggestions();
  const recentSet = new Set(recent);
  
  // Prefer meals not recently shown
  const fresh = pool.filter((m: any) => !recentSet.has(m.name));
  const source = fresh.length >= count ? fresh : pool;
  
  // Shuffle and pick
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function clearAllMealCaches(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(POOL_PREFIX)) keysToRemove.push(key);
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
    const trimmed = updated.slice(-MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function clearRecentSuggestions(): void {
  localStorage.removeItem(RECENT_KEY);
}

// Legacy compat aliases
export function getCachedMeals(sectionId: string, pantryHash: string, inStockOnly: boolean): any[] | null {
  const pool = getMealPool(sectionId, pantryHash, inStockOnly);
  return pool.length >= 3 ? pool : null;
}

export function setCachedMeals(sectionId: string, pantryHash: string, inStockOnly: boolean, meals: any[]): void {
  addToMealPool(sectionId, pantryHash, inStockOnly, meals);
}
