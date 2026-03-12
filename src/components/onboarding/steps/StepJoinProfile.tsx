import { OnboardingProfile } from "@/components/onboarding/Onboarding";

interface Props {
  profile: OnboardingProfile;
  update: (p: Partial<OnboardingProfile>) => void;
  onFinish: () => void;
  saving: boolean;
  householdName: string;
}

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Explain everything" },
  { value: "intermediate", label: "Intermediate", desc: "Know the basics" },
  { value: "confident", label: "Confident", desc: "Just the essentials" },
];

export function StepJoinProfile({ profile, update, onFinish, saving, householdName }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Welcome to {householdName || "your household"}
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Just a couple things about you, then you're in.
        </p>
      </div>

      {/* Name */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Your name</h3>
        <input
          type="text"
          value={profile.memberName}
          onChange={(e) => update({ memberName: e.target.value })}
          placeholder="First name"
          className="w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
          autoFocus
        />
      </div>

      {/* Skill Level */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-2">Your cooking skill level</h3>
        <div className="flex gap-2">
          {SKILL_LEVELS.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ skillLevel: s.value })}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-center transition-colors ${
                profile.skillLevel === s.value
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="block font-body text-sm font-medium">{s.label}</span>
              <span className="block font-body text-xs text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onFinish}
        disabled={!profile.memberName.trim() || saving}
        className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
      >
        {saving ? "Joining..." : "Join household"}
      </button>
    </div>
  );
}
