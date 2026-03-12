import { useState } from "react";
import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { Plus, X } from "lucide-react";

const CHILD_SECTION_IDS = ["child_breakfast", "child_lunch", "child_snack", "child_dinner"];
import { Plus, X } from "lucide-react";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
}

export function StepChildren({ profile, update, onNext }: Props) {
  const [hasChildren, setHasChildren] = useState<boolean | null>(
    profile.children.length > 0 ? true : null
  );

  const setChildSections = (enabled: boolean) => {
    update({
      mealSections: profile.mealSections.map(s =>
        CHILD_SECTION_IDS.includes(s.id) ? { ...s, enabled } : s
      ),
    });
  };

  const addChild = () => {
    const newChildren = [...profile.children, { name: "", dob: "" }];
    update({ children: newChildren });
    if (newChildren.length === 1) setChildSections(true);
  };

  const removeChild = (i: number) => {
    const newChildren = profile.children.filter((_, idx) => idx !== i);
    update({ children: newChildren });
    if (newChildren.length === 0) setChildSections(false);
  };

  const updateChild = (i: number, field: "name" | "dob", value: string) => {
    const updated = [...profile.children];
    updated[i] = { ...updated[i], [field]: value };
    update({ children: updated });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Do you have any children?</h1>
        <p className="mt-1 font-body text-muted-foreground">
          We'll adjust portions and suggest age-appropriate meals.
        </p>
      </div>

      {hasChildren === null && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setHasChildren(true);
              if (profile.children.length === 0) addChild();
            }}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-3 font-body font-medium hover:bg-secondary transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => {
              setHasChildren(false);
              update({ children: [] });
              setChildSections(false);
            }}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-3 font-body font-medium hover:bg-secondary transition-colors"
          >
            No
          </button>
        </div>
      )}

      {hasChildren === true && (
        <div className="flex flex-col gap-4">
          {profile.children.map((child, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-body font-medium text-muted-foreground">Child {i + 1}</span>
                <button onClick={() => removeChild(i)} className="text-muted-foreground hover:text-destructive">
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                value={child.name}
                onChange={(e) => updateChild(i, "name", e.target.value)}
                placeholder="Name (optional)"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <input
                type="date"
                value={child.dob}
                onChange={(e) => updateChild(i, "dob", e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          ))}
          <button
            onClick={addChild}
            className="flex items-center gap-2 text-sm font-body font-medium text-gold hover:opacity-80"
          >
            <Plus size={16} /> Add another child
          </button>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={hasChildren === null}
        className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
