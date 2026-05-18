// Carte affichée dans une timeline.
// `revealed=false` → dos de carte (utilisé pendant turn_playing pour la carte mystère).

type Props = {
  year?: number;
  title?: string;
  artists?: string;
  revealed?: boolean;
  size?: "sm" | "md";
};

export function GameCard({ year, title, artists, revealed = true, size = "md" }: Props) {
  const dim = size === "sm" ? "w-20 h-28" : "w-32 h-44";

  if (!revealed) {
    return (
      <div
        className={`${dim} rounded-md border-2 border-dashed border-muted-foreground/30 bg-card flex items-center justify-center text-3xl text-muted-foreground/50 font-bold select-none`}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className={`${dim} rounded-md border bg-card shadow-sm p-2 flex flex-col items-center justify-center text-center`}
    >
      <div className="text-2xl font-bold tabular-nums">{year ?? "?"}</div>
      {title && (
        <div className="text-xs font-medium mt-2 line-clamp-2">{title}</div>
      )}
      {artists && (
        <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{artists}</div>
      )}
    </div>
  );
}
