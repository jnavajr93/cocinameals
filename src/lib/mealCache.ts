// Smart caching for meal suggestions — accumulative pool per section

const POOL_PREFIX = "cocina_pool_";
const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours per individual entry
const RECENT_KEY = "cocina_recent_suggestions";
const MAX_RECENT = 60;

// AI call throttle keys
const AI_CALL_COUNT_KEY = "cocina_ai_shuffle_count";
const AI_THROTTLE_UNTIL_KEY = "cocina_ai_throttle_until";
const AI_CALL_LIMIT = 6;
const AI_THROTTLE_MS = 4 * 60 * 60 * 1000; // 4 hours
const POOL_CURSOR_PREFIX = "cocina_pool_cursor_";

// Pool size limits per section category — increased 40% from original
const POOL_LIMITS: Record<string, number> = {
  breakfast: 182,
  child_breakfast: 182,
  baby_breakfast: 182,
  brunch: 182,
  lunch: 146,
  child_lunch: 146,
  quick_lunch: 146,
  sit_down_lunch: 146,
  snack: 128,
  child_snack: 128,
  afternoon_snack: 128,
  dinner: 182,
  child_dinner: 182,
  light_dinner: 182,
  full_dinner: 182,
  date_night: 182,
  meal_prep: 182,
  crowd_feed: 91,
};

const DEFAULT_POOL_LIMIT = 146;

/** Check if AI calls are throttled */
export function isAiThrottled(): boolean {
  try {
    const until = localStorage.getItem(AI_THROTTLE_UNTIL_KEY);
    if (until && Date.now() < parseInt(until, 10)) return true;
    // Clear expired throttle
    if (until) {
      localStorage.removeItem(AI_THROTTLE_UNTIL_KEY);
      localStorage.removeItem(AI_CALL_COUNT_KEY);
    }
    return false;
  } catch { return false; }
}

/** Record an AI shuffle call. Returns true if this call is allowed. */
export function recordAiCall(): boolean {
  try {
    if (isAiThrottled()) return false;

    const count = parseInt(localStorage.getItem(AI_CALL_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(AI_CALL_COUNT_KEY, String(count));

    // Allow this call, but throttle subsequent calls for 4 hours once limit is reached
    if (count >= AI_CALL_LIMIT) {
      localStorage.setItem(AI_THROTTLE_UNTIL_KEY, String(Date.now() + AI_THROTTLE_MS));
    }

    return true;
  } catch {
    return false;
  }
}

/** Get remaining AI calls before throttle */
export function getRemainingAiCalls(): number {
  if (isAiThrottled()) return 0;
  try {
    const count = parseInt(localStorage.getItem(AI_CALL_COUNT_KEY) || "0", 10);
    return Math.max(0, AI_CALL_LIMIT - count);
  } catch { return 0; }
}

export function clearAiThrottle(): void {
  localStorage.removeItem(AI_CALL_COUNT_KEY);
  localStorage.removeItem(AI_THROTTLE_UNTIL_KEY);
}

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

/** Pick n meals from the pool with rotation to avoid repeats */
export function pickFromPool(sectionId: string, pantryHash: string, inStockOnly: boolean, count: number): any[] {
  const pool = getMealPool(sectionId, pantryHash, inStockOnly);
  if (pool.length === 0 || count <= 0) return [];

  const recent = new Set(getRecentSuggestions());
  const fresh = pool.filter((m: any) => !recent.has(m.name));
  const source = fresh.length >= count ? fresh : pool;

  // Stable ordering + rotating cursor gives variety without constant repetition
  const ordered = [...source].sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
  const cursorKey = `${POOL_CURSOR_PREFIX}${sectionId}_${pantryHash}_${inStockOnly ? "stock" : "discover"}`;

  let cursor = 0;
  try {
    cursor = parseInt(localStorage.getItem(cursorKey) || "0", 10);
    if (!Number.isFinite(cursor) || cursor < 0) cursor = 0;
  } catch {
    cursor = 0;
  }

  const result: any[] = [];
  for (let i = 0; i < Math.min(count, ordered.length); i++) {
    result.push(ordered[(cursor + i) % ordered.length]);
  }

  try {
    localStorage.setItem(cursorKey, String((cursor + result.length) % ordered.length));
  } catch {}

  return result;
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
