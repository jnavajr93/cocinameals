import { HouseholdProfile } from "@/lib/store";
import { DIET_RESTRICTIONS } from "@/data/mealSections";

interface Props {
  profile: HouseholdProfile;
  update: (p: Partial<HouseholdProfile>) => void;
  onNext: () => void;
}

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Explain everything" },
  { value: "intermediate", label: "Intermediate", desc: "Know the basics" },
  { value: "confident", label: "Confident", desc: "Just the essentials" },
];

const SPICE_LEVELS = ["None", "Mild", "Medium", "Hot", "Extra Hot"];
const TIME_OPTIONS = [
  { value: "20min", label: "Under 20 min" },
  { value: "30min", label: "30 min" },
  { value: "45min", label: "45 min" },
  { value: "norush", label: "No rush" },
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

  return (
    <div className="flex flex-col gap-6 pb-20">
      <h1 className="font-display text-2xl font-bold text-foreground">How do you cook?</h1>

      {/* Skill Level */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Skill level</h3>
        <div className="flex gap-2">
          {SKILL_LEVELS.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ skillLevel: s.value })}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-center transition-colors ${
                profile.skillLevel === s.value
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="block font-body text-sm font-medium">{s.label}</span>
              <span className="block font-body text-xs text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spice */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Spice tolerance</h3>
        <div className="flex gap-2 flex-wrap">
          {SPICE_LEVELS.map((s) => (
            <button
              key={s}
              onClick={() => update({ spiceTolerance: s.toLowerCase() })}
              className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                profile.spiceTolerance === s.toLowerCase()
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Weeknight time available</h3>
        <div className="flex gap-2 flex-wrap">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ weeknightTime: t.value })}
              className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                profile.weeknightTime === t.value
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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
