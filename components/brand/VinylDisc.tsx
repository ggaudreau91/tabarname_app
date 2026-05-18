type Props = {
  size?: number;
  labelColor?: string;
  spinning?: boolean;
  label?: string;
};

// Disque vinyle SVG avec grooves, étiquette "Tabarname" et indication RPM.
// Reproduit exactement le design Stitch.
export function VinylDisc({
  size = 220,
  labelColor = "var(--oxblood)",
  spinning = false,
  label = "45 RPM",
}: Props) {
  const r = size / 2;
  const grooves = [];
  for (let i = 0; i < 28; i++) {
    const radius = r - 10 - i * ((r - 60) / 28);
    grooves.push(
      <circle
        key={i}
        cx={r}
        cy={r}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.6"
      />,
    );
  }
  const id = `vg-${size}-${labelColor.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ animation: spinning ? "spin 6s linear infinite" : "none" }}
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0a05" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 1} fill={`url(#${id})`} />
      {grooves}
      <path
        d={`M ${r} 4 A ${r - 4} ${r - 4} 0 0 1 ${r + (r - 4) * 0.7} ${r - (r - 4) * 0.7}`}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx={r} cy={r} r={r * 0.32} fill={labelColor} />
      <circle
        cx={r}
        cy={r}
        r={r * 0.32}
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="1"
      />
      <text
        x={r}
        y={r - 6}
        textAnchor="middle"
        fontFamily="var(--font-display), serif"
        fontStyle="italic"
        fontSize={r * 0.11}
        fontWeight="700"
        fill="var(--creme)"
      >
        Tabarname
      </text>
      <text
        x={r}
        y={r + 10}
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize={r * 0.065}
        fill="var(--creme)"
        letterSpacing="2"
      >
        {label}
      </text>
      <circle cx={r} cy={r} r={r * 0.04} fill="var(--creme)" />
      <circle cx={r} cy={r} r={r * 0.025} fill="#000" />
    </svg>
  );
}
