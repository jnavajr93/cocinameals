// Local state management using localStorage (will migrate to Supabase later)

export interface HouseholdProfile {
  householdName: string;
  inviteCode: string;
  memberName: string;
  deviceId: string;
  equipment: string[];
  cuisineSliders: Record<string, number>; // 0-4
  skillLevel: string;
  spiceTolerance: string;
  weeknightTime: string;
  dietRestrictions: string[];
  mealSections: { id: string; name: string; enabled: boolean; order: number }[];
  quickFilters: string[];
  bulkCookDays: string[];
  children: { name: string; dob: string }[];
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  inStock: boolean;
  isCustom: boolean;
  isHidden: boolean;
  updatedBy?: string;
  expiresAt?: string | null;
  updatedAt: string;
}

export interface SavedRecipe {
  id: string;
  mealName: string;
  recipeText: string;
  savedBy: string;
  createdAt: string;
}

const PROFILE_KEY = "cocina_profile";
const PANTRY_KEY = "cocina_pantry";
const SAVED_KEY = "cocina_saved";
const ONBOARDED_KEY = "cocina_onboarded";

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getProfile(): HouseholdProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveProfile(profile: HouseholdProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function setOnboarded(): void {
  localStorage.setItem(ONBOARDED_KEY, "true");
}

export function getPantry(): PantryItem[] {
  const raw = localStorage.getItem(PANTRY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function savePantry(items: PantryItem[]): void {
  localStorage.setItem(PANTRY_KEY, JSON.stringify(items));
}

export function getSavedRecipes(): SavedRecipe[] {
  const raw = localStorage.getItem(SAVED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveSavedRecipes(recipes: SavedRecipe[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(recipes));
}
