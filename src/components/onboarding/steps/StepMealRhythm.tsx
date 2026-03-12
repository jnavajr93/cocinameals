import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { MEAL_SECTIONS, DEFAULT_SECTION_TIMES } from "@/data/mealSections";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StepMealRhythm({ profile, update, onNext }: Props) {
  const toggleSection = (id: string) => {
    update({
      mealSections: profile.mealSections.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled, scheduledDays: !s.enabled ? s.scheduledDays : undefined } : s
      ),
    });
  };

  const toggleSectionDay = (sectionId: string, day: string) => {
    update({
      mealSections: profile.mealSections.map((s) => {
        if (s.id !== sectionId) return s;
        const current = s.scheduledDays || [];
        return {
          ...s,
          scheduledDays: current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
        };
      }),
    });
  };

  const updateSectionTime = (sectionId: string, mins: number) => {
    update({
      mealSections: profile.mealSections.map((s) =>
        s.id === sectionId ? { ...s, defaultTime: mins } : s
      ),
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">What meals matter to you?</h1>
        <p className="mt-1 font-body text-muted-foreground text-sm">
          Toggle meals on, set cook times, and optionally pick which days.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {MEAL_SECTIONS.map((section) => {
          const ms = profile.mealSections.find((s) => s.id === section.id);
          const enabled = ms?.enabled ?? section.defaultOn;
          const scheduledDays = ms?.scheduledDays || [];
          const currentTime = ms?.defaultTime ?? DEFAULT_SECTION_TIMES[section.id] ?? 30;
          return (
            <div key={section.id} className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className={`flex items-center justify-between w-full px-4 py-3 text-left transition-colors ${
                  enabled ? "bg-primary/5" : "hover:bg-secondary"
                }`}
              >
                <div>
                  <span className="font-body text-sm font-medium text-foreground">{section.name}</span>
                  <span className="block font-body text-xs text-muted-foreground">{section.description}</span>
                </div>
                <div
                  className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${
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
              {enabled && (
                <div className="px-4 pb-3 pt-1 bg-secondary/30 space-y-2">
                  <div>
                    <span className="font-body text-xs text-muted-foreground mb-1.5 block">Default cook time</span>
                    <div className="flex gap-1.5">
                      {[10, 15, 20, 25, 30, 45, 60].map((t) => (
                        <button
                          key={t}
                          onClick={() => updateSectionTime(section.id, t)}
                          className={`rounded-md border px-2 py-1 font-body text-xs font-medium transition-colors ${
                            currentTime === t
                              ? "border-gold bg-gold/15 text-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {t}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-body text-xs text-muted-foreground mb-1.5 block">Schedule days (optional)</span>
                    <div className="flex gap-1.5">
                      {DAYS.map((d) => {
                        const active = scheduledDays.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() => toggleSectionDay(section.id, d)}
                            className={`flex-1 rounded-md border py-1.5 font-body text-xs font-medium transition-colors ${
                              active
                                ? "border-gold bg-gold/15 text-foreground"
                                : "border-border bg-card text-muted-foreground hover:bg-secondary"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90"
      >
        Continue
      </button>
    </div>
  );
}
