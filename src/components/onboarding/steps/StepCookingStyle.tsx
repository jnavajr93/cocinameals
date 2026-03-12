import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { DIET_RESTRICTIONS } from "@/data/mealSections";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
}

const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Shellfish", "Fish", "Eggs", "Milk / Dairy",
  "Soy", "Wheat", "Sesame", "Corn",
];

const HEALTH_CONDITIONS = [
  "Diabetes", "High Blood Pressure", "High Cholesterol", "Heart Disease",
  "Kidney Disease", "Celiac Disease", "IBS / IBD", "GERD / Acid Reflux",
  "PCOS", "Gout", "Pregnancy", "Postpartum",
];

export function StepCookingStyle({ profile, update, onNext }: Props) {
  const toggleDiet = (d: string) => {
    if (d === "None") {
      update({ dietRestrictions: [] });
      return;
    }
    const current = profile.dietRestrictions.filter((r) => r !== "None");
    update({
      dietRestrictions: current.includes(d) ? current.filter((r) => r !== d) : [...current, d],
    });
  };

  const toggleAllergy = (a: string) => {
    const current = profile.allergies || [];
    update({
      allergies: current.includes(a) ? current.filter((x) => x !== a) : [...current, a],
    });
  };

  const toggleHealth = (h: string) => {
    const current = profile.healthConditions;
    update({
      healthConditions: current.includes(h) ? current.filter((x) => x !== h) : [...current, h],
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">About you</h1>
        <p className="mt-1 font-body text-muted-foreground text-sm">
          We'll personalize recipes based on these. You can fine-tune more in Settings later.
        </p>
      </div>

      {/* Diet */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Diet restrictions</h3>
        <div className="flex gap-2 flex-wrap">
          {DIET_RESTRICTIONS.map((d) => {
            const active = d === "None" ? profile.dietRestrictions.length === 0 : profile.dietRestrictions.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDiet(d)}
                className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                  active
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Allergies</h3>
        <p className="font-body text-xs text-muted-foreground mb-3">
          We'll never include these ingredients in your recipes.
        </p>
        <div className="flex gap-2 flex-wrap">
          {COMMON_ALLERGIES.map((a) => {
            const active = (profile.allergies || []).includes(a);
            return (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                  active
                    ? "border-destructive bg-destructive/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Health Conditions */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Health conditions</h3>
        <p className="font-body text-xs text-muted-foreground mb-3">
          Private to you — never shared with your household. Recipes silently adapt.
        </p>
        <div className="flex gap-2 flex-wrap">
          {HEALTH_CONDITIONS.map((h) => {
            const active = profile.healthConditions.includes(h);
            return (
              <button
                key={h}
                onClick={() => toggleHealth(h)}
                className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                  active
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background px-6 pt-2 pb-6">
        <button
          onClick={onNext}
          className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
