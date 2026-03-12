import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { CUISINES, CUISINE_LABELS } from "@/data/cuisines";

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
          Slide each cuisine to match how much you want it. Your recipes will reflect this.
        </p>
      </div>

      <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pb-4">
        {CUISINES.map((cuisine) => {
          const val = profile.cuisineSliders[cuisine] ?? 2;
          return (
            <div key={cuisine}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body text-sm font-medium text-foreground">{cuisine}</span>
                <span className="font-body text-xs text-emerald-600 font-semibold">{CUISINE_LABELS[val]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={val}
                onChange={(e) => setSlider(cuisine, Number(e.target.value))}
                className="w-full h-2 rounded-full bg-muted appearance-none cursor-pointer
                  [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-emerald-200
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                  [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-emerald-200
                  [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
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
