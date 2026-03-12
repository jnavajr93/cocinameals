import { useState } from "react";
import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { EQUIPMENT_CATEGORIES } from "@/data/equipment";
import { Check, Search } from "lucide-react";

interface Props {
  profile: HouseholdProfile;
  update: (p: Partial<HouseholdProfile>) => void;
  onNext: () => void;
}

export function StepEquipment({ profile, update, onNext }: Props) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  const toggle = (item: string) => {
    const eq = profile.equipment.includes(item)
      ? profile.equipment.filter((e) => e !== item)
      : [...profile.equipment, item];
    update({ equipment: eq });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">What do you cook with?</h1>
        <p className="mt-1 font-body text-muted-foreground text-sm">
          Check everything you own -- recipes will only use what you have.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search equipment..."
          className="w-full rounded-lg border border-border bg-input pl-9 pr-4 py-2.5 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pb-4">
        {EQUIPMENT_CATEGORIES.map((cat) => {
          const filtered = cat.items.filter((i) => !q || i.toLowerCase().includes(q));
          if (filtered.length === 0) return null;
          return (
            <div key={cat.name}>
              <h3 className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {cat.name}
              </h3>
              <div className="flex flex-col gap-1">
                {filtered.map((item) => {
                  const checked = profile.equipment.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggle(item)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left font-body text-sm transition-colors ${
                        checked ? "bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          checked ? "border-gold bg-gold text-gold-foreground" : "border-border"
                        }`}
                      >
                        {checked && <Check size={12} />}
                      </span>
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-background pt-2 pb-4">
        <p className="text-xs font-body text-muted-foreground mb-2 text-center">
          {profile.equipment.length} items selected
        </p>
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
