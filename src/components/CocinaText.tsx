interface CocinaTextProps {
  className?: string;
}

/**
 * Inline stylized "cocina" wordmark for use within body text.
 * Matches the logo: italic "c" in primary, italic "o" in gold, upright "cina" in foreground.
 */
export function CocinaText({ className = "" }: CocinaTextProps) {
  return (
    <span className={`font-display font-bold leading-none ${className}`}>
      <span className="italic text-primary">c</span>
      <span className="italic text-gold" style={{ marginLeft: '-0.04em', letterSpacing: '-0.02em' }}>o</span>
      <span className="text-foreground" style={{ letterSpacing: '-0.03em' }}>cina</span>
    </span>
  );
}
