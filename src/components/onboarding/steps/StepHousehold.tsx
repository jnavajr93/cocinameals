import { OnboardingProfile } from "@/components/onboarding/Onboarding";
import { toast } from "sonner";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onNext: () => void;
}

export function StepHousehold({ profile, update, onNext }: Props) {
  const copyCode = () => {
    navigator.clipboard.writeText(profile.inviteCode);
    toast.success("Invite code copied");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Name your household</h1>
        <p className="mt-1 font-body text-muted-foreground">Optional. e.g. "The Garcias" or "Apt 4B"</p>
      </div>
      <input
        type="text"
        value={profile.householdName}
        onChange={(e) => update({ householdName: e.target.value })}
        placeholder="Household name (optional)"
        className="w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-body text-muted-foreground mb-2">Your invite code</p>
        <button
          onClick={copyCode}
          className="text-2xl font-body font-bold tracking-widest text-primary hover:text-gold transition-colors"
        >
          {profile.inviteCode}
        </button>
        <p className="text-xs font-body text-muted-foreground mt-2">
          Anyone with this code can join your household and see your pantry. Tap to copy.
        </p>
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
