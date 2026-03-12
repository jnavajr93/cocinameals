import { OnboardingProfile } from "@/components/onboarding/Onboarding";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
}

export function StepName({ profile, update, onNext }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">What's your name?</h1>
        <p className="mt-1 font-body text-muted-foreground">First name is fine.</p>
      </div>
      <input
        type="text"
        value={profile.memberName}
        onChange={(e) => update({ memberName: e.target.value })}
        placeholder="Your first name"
        className="w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
        autoFocus
      />
      <button
        onClick={onNext}
        disabled={!profile.memberName.trim()}
        className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
