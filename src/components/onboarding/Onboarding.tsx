import { useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { StepName } from "./steps/StepName";
import { DEFAULT_EQUIPMENT } from "@/data/equipment";
import { StepHousehold } from "./steps/StepHousehold";
import { StepChildren } from "./steps/StepChildren";
import { StepEquipment } from "./steps/StepEquipment";
import { StepCuisine } from "./steps/StepCuisine";
import { StepCookingStyle } from "./steps/StepCookingStyle";
import { StepMealRhythm } from "./steps/StepMealRhythm";
import { StepJoinProfile } from "./steps/StepJoinProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_PANTRY } from "@/data/pantryDefaults";
import { MEAL_SECTIONS } from "@/data/mealSections";
import { CUISINES } from "@/data/cuisines";
import { toast } from "sonner";

// Keep the same HouseholdProfile shape for onboarding state
export interface OnboardingProfile {
  householdName: string;
  inviteCode: string;
  memberName: string;
  equipment: string[];
  cuisineSliders: Record<string, number>;
  skillLevel: string;
  spiceTolerance: string;
  weeknightTime: string;
  dietRestrictions: string[];
  healthConditions: string[];
  allergies: string[];
  dislikes: string[];
  mealSections: { id: string; name: string; enabled: boolean; order: number; scheduledDays?: string[]; defaultTime?: number }[];
  quickFilters: string[];
  bulkCookDays: string[];
  children: { name: string; dob: string }[];
}

interface OnboardingProps {
  onComplete: () => void;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const TOTAL_STEPS = 6;

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [joinMode, setJoinMode] = useState(false);
  const [joinReady, setJoinReady] = useState(false);
  const [joinHouseholdId, setJoinHouseholdId] = useState<string | null>(null);
  const [joinHouseholdName, setJoinHouseholdName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<OnboardingProfile>({
    householdName: "",
    inviteCode: generateInviteCode(),
    memberName: user?.user_metadata?.full_name?.split(" ")[0] || "",
    equipment: [...DEFAULT_EQUIPMENT],
    cuisineSliders: Object.fromEntries(CUISINES.map((c) => [c, 2])),
    skillLevel: "intermediate",
    spiceTolerance: "medium",
    weeknightTime: "20min",
    dietRestrictions: [],
    healthConditions: [],
    allergies: [],
    dislikes: [],
    mealSections: MEAL_SECTIONS.map((s, i) => ({
      id: s.id,
      name: s.name,
      enabled: s.defaultOn,
      order: i,
    })),
    quickFilters: [],
    bulkCookDays: [],
    children: [],
  });

  const update = useCallback(
    (patch: Partial<OnboardingProfile>) => setProfile((p) => ({ ...p, ...patch })),
    []
  );

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleJoin = async () => {
    setJoinError("");
    if (joinCode.length !== 6) { setJoinError("Enter a 6-character code"); return; }
    setJoinLoading(true);

    const { data: household } = await supabase
      .from("households")
      .select("id, name")
      .eq("invite_code", joinCode.toUpperCase())
      .maybeSingle();

    if (!household) {
      setJoinError("Code not found. Check with your household.");
      setJoinLoading(false);
      return;
    }

    setProfile(p => ({ ...p, householdName: household.name || "" }));
    setJoinHouseholdId(household.id);
    setJoinHouseholdName(household.name || "");
    setJoinMode(false);
    setJoinReady(true);
    setJoinLoading(false);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let householdId: string;

      if (joinHouseholdId) {
        householdId = joinHouseholdId;

        await supabase.from("household_members").insert({
          household_id: householdId,
          user_id: user.id,
          user_name: profile.memberName,
        });
      } else {
        const { data: household, error: hError } = await supabase
          .from("households")
          .insert({ invite_code: profile.inviteCode, name: profile.householdName || null })
          .select("id")
          .single();

        if (hError) throw hError;
        householdId = household.id;

        await supabase.from("household_members").insert({
          household_id: householdId,
          user_id: user.id,
          user_name: profile.memberName,
        });

        await supabase.from("household_profile").insert({
          household_id: householdId,
          equipment: profile.equipment,
          cuisine_sliders: profile.cuisineSliders,
          meal_sections: profile.mealSections,
          quick_filters: profile.quickFilters,
          meal_prep_days: profile.bulkCookDays,
        });

        if (profile.children.length > 0) {
          await supabase.from("children").insert(
            profile.children.map(c => ({
              household_id: householdId,
              name: c.name || null,
              date_of_birth: c.dob,
            }))
          );
        }

        const pantryItems = DEFAULT_PANTRY.flatMap(cat =>
          cat.items.map(name => ({
            household_id: householdId,
            name,
            category: cat.name,
            in_stock: false,
            is_custom: false,
            is_hidden: false,
          }))
        );

        for (let i = 0; i < pantryItems.length; i += 500) {
          await supabase.from("pantry_items").insert(pantryItems.slice(i, i + 500));
        }
      }

      await supabase.from("user_preferences").insert({
        user_id: user.id,
        household_id: householdId,
        skill_level: profile.skillLevel,
        spice_tolerance: profile.spiceTolerance,
        weeknight_time: profile.weeknightTime,
        diet_restrictions: profile.dietRestrictions,
        health_conditions: profile.healthConditions,
        allergies: profile.allergies,
        dislikes: profile.dislikes,
        section_order: profile.mealSections,
      });

      onComplete();
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  // Join code screen
  if (joinMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in">
          <Logo size="md" />
          <h2 className="font-display text-xl font-bold text-foreground">Join a household</h2>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="6-character code"
            className="w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-center text-xl tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold uppercase"
            maxLength={6}
            autoFocus
          />
          {joinError && <p className="font-body text-sm text-destructive">{joinError}</p>}
          <button onClick={handleJoin} disabled={joinLoading} className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40">
            {joinLoading ? "Looking up..." : "Join household"}
          </button>
          <button onClick={() => setJoinMode(false)} className="font-body text-sm text-muted-foreground hover:text-foreground">
            Back
          </button>
        </div>
      </div>
    );
  }

  // Join profile screen
  if (joinReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm animate-fade-in">
          <StepJoinProfile
            profile={profile}
            update={update}
            onFinish={finish}
            saving={saving}
            householdName={joinHouseholdName}
          />
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-8 animate-fade-in">
          <Logo size="lg" />
          <p className="text-center font-body text-base text-foreground max-w-xs leading-relaxed">
            Create personalized meal plans based on your pantry, preferences, and family needs.
          </p>
          <p className="text-center font-body text-sm text-muted-foreground max-w-xs">
            Cut back on eating out. Eliminate food waste. Cook restaurant-quality meals at home.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setStarted(true)}
              className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              Create new household
            </button>
            <button
              onClick={() => setJoinMode(true)}
              className="w-full rounded-lg border border-border bg-card px-6 py-3.5 font-body font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Join with invite code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-10 bg-background px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          {step > 1 && (
            <button onClick={prev} className="text-muted-foreground font-body text-sm">
              Back
            </button>
          )}
          <span className="ml-auto text-sm font-body text-muted-foreground">
            {step} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-gold transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-6 py-6 animate-fade-in">
        {step === 1 && <StepName profile={profile} update={update} onNext={next} />}
        {step === 2 && <StepHousehold profile={profile} update={update} onNext={next} />}
        {step === 3 && <StepChildren profile={profile} update={update} onNext={next} />}
        {step === 4 && <StepCookingStyle profile={profile} update={update} onNext={next} />}
        {step === 5 && <StepEquipment profile={profile} update={update} onNext={next} />}
        {step === 6 && (
          <StepCuisine
            profile={profile}
            update={update}
            onNext={finish}
            isLast
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
