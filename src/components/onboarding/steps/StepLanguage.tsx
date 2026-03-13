import { Logo } from "@/components/Logo";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

interface Props {
  selectedLanguage: string;
  onSelect: (code: string) => void;
  onNext: () => void;
}

export function StepLanguage({ selectedLanguage, onSelect, onNext }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <Logo size="md" />
        <h1 className="font-display text-2xl font-bold text-foreground">Choose your language</h1>
        <p className="font-body text-sm text-muted-foreground text-center">
          Cocina will adapt all recipes and the interface to your language.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 font-body text-sm transition-colors ${
              selectedLanguage === lang.code
                ? "border-gold bg-gold/10 text-foreground font-medium"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            <span className="text-xl">{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
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
