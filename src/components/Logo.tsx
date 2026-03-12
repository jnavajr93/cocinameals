interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span className={`font-display font-bold leading-none ${sizes[size]} ${className}`}>
      <span className="italic text-primary">c</span>
      <span className="italic text-gold" style={{ marginLeft: '-0.08em', letterSpacing: '-0.03em' }}>o</span>
      <span className="text-foreground" style={{ letterSpacing: '-0.03em' }}>cina</span>
    </span>
  );
}

export function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-card-warm font-display font-bold leading-none ${className}`}
      style={{ width: "2.5em", height: "2.5em", fontSize: "inherit" }}
    >
      <span className="italic text-primary">c</span>
      <span className="italic text-gold" style={{ marginLeft: '-0.08em' }}>o</span>
    </span>
  );
}
