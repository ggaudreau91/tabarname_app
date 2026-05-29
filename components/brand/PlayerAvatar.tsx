import { Star } from "lucide-react";

type Props = {
  name: string;
  color?: string;
  size?: number;
  isHost?: boolean;
};

// Avatar cercle avec 2 lettres initiales en Fraunces, étoile or si hôte.
// Charte "Nuit de vinyle" : teintes froides, anneau sur la surface, encre claire.
export function PlayerAvatar({
  name,
  color = "var(--ava-1-bg)",
  size = 44,
  isHost = false,
}: Props) {
  const initial = (name || "?").slice(0, 2).toUpperCase();
  // L'or a besoin d'une encre sombre ; les teintes froides prennent de l'encre claire.
  const isGold = color === "var(--gold)" || color === "var(--accent)";
  const ink = isGold ? "#16263a" : "var(--ava-1-ink)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full font-display font-bold"
        style={{
          width: size,
          height: size,
          background: color,
          color: ink,
          fontSize: size * 0.42,
          letterSpacing: "-0.02em",
          border: "2px solid var(--surface)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
        }}
      >
        {initial}
      </div>
      {isHost && (
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            top: -4,
            right: -4,
            width: 18,
            height: 18,
            background: "var(--panel)",
            border: "2px solid var(--accent)",
            color: "var(--accent)",
          }}
        >
          <Star size={10} fill="var(--accent)" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
}

// Génère une couleur stable à partir d'un ID joueur (teintes froides cohérentes,
// sans brun chaud — conforme à la charte "Nuit de vinyle").
const PALETTE = [
  "var(--ava-1-bg)", // navy steel
  "var(--gold)",     // or
  "var(--ava-3-bg)", // teal
  "var(--ava-4-bg)", // plum
  "#3A4E6E",         // indigo
  "#2E5A4A",         // pine
];

export function colorForPlayer(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
