import { useState } from "react";
import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { MEAL_SECTIONS, DEFAULT_SECTION_TIMES } from "@/data/mealSections";
import { Plus, ChevronRight } from "lucide-react";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StepMealRhythm({ profile, update, onNext }: Props) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");

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

  const addCustomMeal = () => {
    if (!customName.trim()) return;
    const id = `custom_${customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    update({
      mealSections: [...profile.mealSections, { id, name: customName.trim(), enabled: true, order: profile.mealSections.length }],
    });
    setCustomName("");
    setAddingCustom(false);
  };

  const moveSection = (fromIndex: number, direction: "up" | "down") => {
    const sorted = [...profile.mealSections].sort((a, b) => a.order - b.order);
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= sorted.length) return;
    const item = sorted[fromIndex];
    sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, item);
    update({ mealSections: sorted.map((s, i) => ({ ...s, order: i })) });
  };

  const sortedSections = [...profile.mealSections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Set up your meal schedule</h1>
        <p className="mt-1 font-body text-muted-foreground text-sm">
          Toggle meals on, set cook times, reorder, and optionally pick which days.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {sortedSections.map((section, idx) => {
          const defSection = MEAL_SECTIONS.find(s => s.id === section.id);
          const enabled = section.enabled;
          const scheduledDays = section.scheduledDays || [];
          const currentTime = section.defaultTime ?? DEFAULT_SECTION_TIMES[section.id] ?? 30;
          return (
            <div key={section.id} className="rounded-lg border border-border overflow-hidden">
              <div className={`flex items-center w-full px-4 py-3 text-left transition-colors ${enabled ? "bg-primary/5" : "hover:bg-secondary"}`}>
                {/* Reorder arrows */}
                <div className="flex flex-col mr-2 shrink-0">
                  <button onClick={() => moveSection(idx, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5">
                    <ChevronRight size={12} className="-rotate-90" />
                  </button>
                  <button onClick={() => moveSection(idx, "down")} disabled={idx === sortedSections.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5">
                    <ChevronRight size={12} className="rotate-90" />
                  </button>
                </div>
                <button onClick={() => toggleSection(section.id)} className="flex items-center justify-between flex-1">
                  <div>
                    <span className="font-body text-sm font-medium text-foreground">{section.name}</span>
                    {defSection && <span className="block font-body text-xs text-muted-foreground">{defSection.description}</span>}
                  </div>
                  <div className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${enabled ? "bg-gold" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>
              </div>
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

        {/* Add custom meal type */}
        {addingCustom ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomMeal()}
              placeholder='e.g. "Brunch", "Post-Workout"'
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              autoFocus
            />
            <button onClick={addCustomMeal} className="rounded-lg bg-primary px-3 py-2 font-body text-sm font-medium text-primary-foreground">Add</button>
            <button onClick={() => { setAddingCustom(false); setCustomName(""); }} className="rounded-lg border border-border px-3 py-2 font-body text-sm text-foreground">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingCustom(true)} className="flex items-center gap-1 font-body text-sm text-gold hover:underline">
            <Plus size={14} />
            Add custom meal type
          </button>
        )}
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
