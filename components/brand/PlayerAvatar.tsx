type Props = {
  name: string;
  color?: string;
  size?: number;
  isHost?: boolean;
};

// Avatar cercle avec 2 lettres initiales en Fraunces, étoile or si hôte.
export function PlayerAvatar({
  name,
  color = "var(--oxblood)",
  size = 44,
  isHost = false,
}: Props) {
  const initial = (name || "?").slice(0, 2).toUpperCase();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full font-display font-bold"
        style={{
          width: size,
          height: size,
          background: color,
          color: "var(--creme)",
          fontSize: size * 0.42,
          letterSpacing: "-0.02em",
          border: "2px solid var(--creme)",
          boxShadow: "0 2px 6px rgba(45,27,18,0.18)",
        }}
      >
        {initial}
      </div>
      {isHost && (
        <div
          className="absolute flex items-center justify-center rounded-full font-extrabold"
          style={{
            top: -4,
            right: -4,
            width: 18,
            height: 18,
            background: "var(--or)",
            border: "2px solid var(--creme)",
            fontSize: 9,
            color: "var(--brun)",
          }}
        >
          ★
        </div>
      )}
    </div>
  );
}

// Génère une couleur stable à partir d'un ID joueur (pour assigner des
// teintes cohérentes aux avatars sans avoir à les stocker en DB).
const PALETTE = [
  "var(--oxblood)",
  "var(--or)",
  "var(--green-pret)",
  "var(--brun)",
  "var(--oxblood-deep)",
  "var(--brun-mid)",
];

export function colorForPlayer(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
