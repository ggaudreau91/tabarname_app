type StampProps = {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  className?: string;
};

// Tampon: bordure colorée, mono uppercase, légèrement pivoté.
// Défaut = encre or (--stamp-ink) pour rester lisible sur le navy.
export function Stamp({
  children,
  color = "var(--stamp-ink)",
  rotate = -3,
  className = "",
}: StampProps) {
  return (
    <div
      className={`inline-flex font-mono font-medium uppercase ${className}`}
      style={{
        padding: "7px 11px",
        border: `1.5px solid ${color}`,
        color,
        fontSize: 11,
        letterSpacing: "0.14em",
        transform: `rotate(${rotate}deg)`,
        borderRadius: 7,
      }}
    >
      {children}
    </div>
  );
}

type MetaLabelProps = {
  children: React.ReactNode;
  color?: string;
  className?: string;
};

// Caption: mono uppercase, letter-spaced, couleur muted.
export function MetaLabel({
  children,
  color = "var(--ink-dim)",
  className = "",
}: MetaLabelProps) {
  return (
    <div
      className={`font-mono uppercase font-medium ${className}`}
      style={{
        fontSize: 11,
        letterSpacing: "0.18em",
        color,
      }}
    >
      {children}
    </div>
  );
}

// Badge Spotify (logo + wordmark)
export function SpotifyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--green-spotify)">
        <circle cx="12" cy="12" r="12" />
        <path
          d="M17.5 16.8c-.2.3-.6.4-.9.2-2.4-1.5-5.5-1.8-9.1-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4-.9 7.4-.5 10.1 1.1.3.2.4.6.2 1zm1.5-3.3c-.3.4-.7.5-1.1.3-2.8-1.7-7-2.2-10.3-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.8-1.1 8.5-.6 11.7 1.4.4.2.5.7.2 1zm.1-3.4C15.7 8 9.4 7.7 6.2 8.7c-.5.2-1.1-.1-1.2-.6-.2-.5.1-1.1.6-1.2C9.4 5.8 16.3 6.1 20.2 8.4c.5.3.6 1 .3 1.5-.3.4-1 .5-1.4.2z"
          fill="#06210F"
        />
      </svg>
      <span className="font-semibold">Spotify</span>
    </span>
  );
}
