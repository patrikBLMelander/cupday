/**
 * Decorative SVG pitch markings — center circle, halfway line, penalty arcs,
 * touchlines. Pure SVG, sized to fill its container; intended to sit in the
 * lower portion of a hero behind text. The caller controls color (via
 * {@code text-*} class → {@code currentColor}) and sizing.
 */
export function PitchLines({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 1200 320"
      preserveAspectRatio="none"
      style={style}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
      >
        <line x1="600" y1="40" x2="600" y2="320" />
        <circle cx="600" cy="220" r="80" />
        <circle cx="600" cy="220" r="3" fill="currentColor" />
        {/* Penalty areas — one small box per side. */}
        <rect x="0" y="100" width="70" height="200" />
        <rect x="1130" y="100" width="70" height="200" />
        <line x1="0" y1="40" x2="1200" y2="40" />
        <line x1="0" y1="319" x2="1200" y2="319" />
      </g>
    </svg>
  );
}
