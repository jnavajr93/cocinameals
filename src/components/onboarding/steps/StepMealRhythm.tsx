import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { MEAL_SECTIONS, QUICK_FILTERS } from "@/data/mealSections";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onFinish: () => void;
  saving?: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StepMealRhythm({ profile, update, onFinish, saving }: Props) {
  const toggleSection = (id: string) => {
    update({
      mealSections: profile.mealSections.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
    });
  };

  const toggleFilter = (f: string) => {
    const current = profile.quickFilters;
    if (current.includes(f)) {
      update({ quickFilters: current.filter((x) => x !== f) });
    } else if (current.length < 6) {
      update({ quickFilters: [...current, f] });
    }
  };

  const toggleDay = (d: string) => {
    const current = profile.bulkCookDays;
    update({
      bulkCookDays: current.includes(d) ? current.filter((x) => x !== d) : [...current, d],
    });
  };

  const showMealPrep = profile.mealSections.find((s) => s.id === "meal_prep")?.enabled;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">What meals matter to you?</h1>
        <p className="mt-1 font-body text-muted-foreground text-sm">
          Pick the ones you want suggestions for. You can always change this later.
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-1">
        {MEAL_SECTIONS.map((section) => {
          const ms = profile.mealSections.find((s) => s.id === section.id);
          const enabled = ms?.enabled ?? section.defaultOn;
          return (
            <button
              key={section.id}
              onClick={() => toggleSection(section.id)}
              className={`flex items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
                enabled ? "bg-primary/5" : "hover:bg-secondary"
              }`}
            >
              <div>
                <span className="font-body text-sm font-medium text-foreground">{section.name}</span>
                <span className="block font-body text-xs text-muted-foreground">{section.description}</span>
              </div>
              <div
                className={`h-5 w-9 rounded-full transition-colors relative ${
                  enabled ? "bg-gold" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${
                    enabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Filters */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-1">Quick filter shortcuts</h3>
        <p className="font-body text-xs text-muted-foreground mb-3">
          Pick up to 6. These appear at the top of your Meals tab.
        </p>
        <div className="flex gap-2 flex-wrap">
          {QUICK_FILTERS.map((f) => {
            const active = profile.quickFilters.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className={`rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                  active
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Meal Prep Days */}
      {showMealPrep && (
        <div>
          <h3 className="font-body text-sm font-semibold text-foreground mb-2">Which days do you meal prep?</h3>
          <div className="flex gap-2">
            {DAYS.map((d) => {
              const active = profile.bulkCookDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`flex-1 rounded-lg border py-2.5 font-body text-xs font-medium transition-colors ${
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
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-background px-6 pt-2 pb-6">
        <button
          onClick={onFinish}
          className="w-full rounded-lg bg-gold px-6 py-3.5 font-body font-semibold text-gold-foreground transition-colors hover:opacity-90"
        >
          Start cooking
        </button>
      </div>
    </div>
  );
}
