import { useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { StepName } from "./steps/StepName";
import { StepHousehold } from "./steps/StepHousehold";
import { StepChildren } from "./steps/StepChildren";
import { StepEquipment } from "./steps/StepEquipment";
import { StepCuisine } from "./steps/StepCuisine";
import { StepCookingStyle } from "./steps/StepCookingStyle";
import { StepMealRhythm } from "./steps/StepMealRhythm";
import {
  HouseholdProfile,
  generateInviteCode,
  generateId,
  saveProfile,
  setOnboarded,
  savePantry,
  PantryItem,
} from "@/lib/store";
import { DEFAULT_PANTRY } from "@/data/pantryDefaults";
import { MEAL_SECTIONS } from "@/data/mealSections";
import { CUISINES } from "@/data/cuisines";

interface OnboardingProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 7;

export function Onboarding({ onComplete }: OnboardingProps) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState<HouseholdProfile>({
    householdName: "",
    inviteCode: generateInviteCode(),
    memberName: "",
    deviceId: generateId(),
    equipment: [],
    cuisineSliders: Object.fromEntries(CUISINES.map((c) => [c, 2])),
    skillLevel: "intermediate",
    spiceTolerance: "medium",
    weeknightTime: "30min",
    dietRestrictions: [],
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
    (patch: Partial<HouseholdProfile>) => setProfile((p) => ({ ...p, ...patch })),
    []
  );

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const finish = () => {
    saveProfile(profile);
    // Seed pantry
    const items: PantryItem[] = [];
    DEFAULT_PANTRY.forEach((cat) => {
      cat.items.forEach((name) => {
        items.push({
          id: generateId(),
          name,
          category: cat.name,
          inStock: false,
          isCustom: false,
          isHidden: false,
          expiresAt: null,
          updatedAt: new Date().toISOString(),
        });
      });
    });
    savePantry(items);
    setOnboarded();
    onComplete();
  };

  if (!started) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-8 animate-fade-in">
          <Logo size="lg" />
          <p className="text-center font-body text-lg text-muted-foreground max-w-xs">
            Your household cooking assistant. Sync your pantry, get personalized meals.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setStarted(true)}
              className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              Create new household
            </button>
            <button
              onClick={() => setStarted(true)}
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
      {/* Progress bar */}
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
        {step === 4 && <StepEquipment profile={profile} update={update} onNext={next} />}
        {step === 5 && <StepCuisine profile={profile} update={update} onNext={next} />}
        {step === 6 && <StepCookingStyle profile={profile} update={update} onNext={next} />}
        {step === 7 && <StepMealRhythm profile={profile} update={update} onFinish={finish} />}
      </div>
    </div>
  );
}
