import { useState, useMemo } from "react";
import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { DEFAULT_PANTRY } from "@/data/pantryDefaults";
import { Check, Search, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
  isLast?: boolean;
  saving?: boolean;
}

export function StepIngredients({ profile, update, onNext, isLast, saving }: Props) {
  const [search, setSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const q = search.toLowerCase();

  const selected = profile.selectedIngredients || [];

  const toggle = (item: string) => {
    const next = selected.includes(item)
      ? selected.filter(i => i !== item)
      : [...selected, item];
    update({ selectedIngredients: next });
  };

  const toggleCategory = (catName: string) => {
    const cat = DEFAULT_PANTRY.find(c => c.name === catName);
    if (!cat) return;
    const allSelected = cat.items.every(i => selected.includes(i));
    if (allSelected) {
      update({ selectedIngredients: selected.filter(i => !cat.items.includes(i)) });
    } else {
      const merged = new Set([...selected, ...cat.items]);
      update({ selectedIngredients: Array.from(merged) });
    }
  };

  const toggleCollapse = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    return DEFAULT_PANTRY.map(cat => ({
      ...cat,
      items: cat.items.filter(i => !q || i.toLowerCase().includes(q)),
    })).filter(cat => cat.items.length > 0);
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">What do you usually buy?</h1>
        <p className="mt-1 font-body text-muted-foreground text-sm">
          Select ingredients you typically keep at home. This builds your starting pantry — you can always adjust later.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="w-full rounded-lg border border-border bg-input pl-9 pr-4 py-2.5 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pb-4">
        {filteredCategories.map(cat => {
          const catSelected = cat.items.filter(i => selected.includes(i)).length;
          const allSelected = catSelected === cat.items.length;
          const collapsed = collapsedCats.has(cat.name);

          return (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1.5">
                <button onClick={() => toggleCollapse(cat.name)} className="flex items-center gap-1.5">
                  {collapsed ? <ChevronRight size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.name}</span>
                  <span className="font-body text-xs text-muted-foreground">({catSelected}/{cat.items.length})</span>
                </button>
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="font-body text-xs text-gold font-medium"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>
              {!collapsed && (
                <div className="grid grid-cols-2 gap-1.5">
                  {cat.items.map(item => {
                    const checked = selected.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggle(item)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left font-body text-sm transition-colors ${
                          checked ? "bg-gold/10 text-foreground" : "bg-card text-muted-foreground border border-border"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            checked ? "border-gold bg-gold text-gold-foreground" : "border-foreground/20 bg-background"
                          }`}
                        >
                          {checked && <Check size={10} />}
                        </span>
                        <span className="truncate text-xs">{item}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-background pt-2 pb-4">
        <p className="text-xs font-body text-muted-foreground mb-2 text-center">
          {selected.length} ingredients selected
        </p>
        <button
          onClick={onNext}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Setting up..." : isLast ? "Finish setup" : "Continue"}
        </button>
      </div>
    </div>
  );
}
