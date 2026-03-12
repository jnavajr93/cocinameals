import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { CUISINES, CUISINE_LABELS, CUISINE_LABEL_COLORS } from "@/data/cuisines";
import { Slider } from "@/components/ui/slider";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
}

export function StepCuisine({ profile, update, onNext }: Props) {
  const setSlider = (cuisine: string, value: number) => {
    update({ cuisineSliders: { ...profile.cuisineSliders, [cuisine]: value } });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">What flavors do you love?</h1>
        <p className="mt-1 font-body text-muted-foreground text-sm">
          Slide each cuisine to match how much you want it.
        </p>
      </div>

      <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pb-4">
        {CUISINES.map((cuisine) => {
          const val = profile.cuisineSliders[cuisine] ?? 2;
          return (
            <div key={cuisine}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body text-sm font-medium text-foreground">{cuisine}</span>
                <span className={`font-body text-xs font-semibold ${CUISINE_LABEL_COLORS[val]}`}>
                  {CUISINE_LABELS[val]}
                </span>
              </div>
              <Slider
                min={0}
                max={4}
                step={1}
                value={[val]}
                onValueChange={([v]) => setSlider(cuisine, v)}
                className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-500 [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:bg-emerald-500 [&_.relative>.absolute]:bg-emerald-500"
              />
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-background pt-2 pb-4">
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
