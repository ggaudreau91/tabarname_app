// Petites icônes au trait (sans emoji) pour les cartes de mode & lignes Spotify.
type Kind = "globe" | "headphones" | "table" | "copy" | "spotify";

export function GlyphIcon({
  kind,
  size = 20,
  color = "currentColor",
}: {
  kind: Kind;
  size?: number;
  color?: string;
}) {
  const p = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<Kind, React.ReactNode> = {
    globe: (
      <g {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
      </g>
    ),
    headphones: (
      <g {...p}>
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <rect x="3" y="13" width="4" height="7" rx="1.6" />
        <rect x="17" y="13" width="4" height="7" rx="1.6" />
      </g>
    ),
    table: (
      <g {...p}>
        <circle cx="8" cy="8" r="2.6" />
        <circle cx="16" cy="8" r="2.6" />
        <path d="M3.5 19c0-2.8 2-4.5 4.5-4.5S12.5 16.2 12.5 19M11.5 19c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" />
      </g>
    ),
    copy: (
      <g {...p}>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h8" />
      </g>
    ),
    spotify: (
      <g>
        <circle cx="12" cy="12" r="10" fill={color} />
        <path
          d="M7 10c3-1 7-.6 9.5 1M7.5 13c2.5-.7 5.7-.3 7.5 1M8 15.6c2-.5 4.2-.2 5.6.8"
          fill="none"
          stroke="#06210F"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}
