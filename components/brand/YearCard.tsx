type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { w: number; h: number; year: number; label: number }> = {
  sm: { w: 70, h: 96, year: 22, label: 7 },
  md: { w: 96, h: 132, year: 30, label: 8 },
  lg: { w: 144, h: 200, year: 46, label: 10 },
  xl: { w: 220, h: 304, year: 72, label: 12 },
};

type Props = {
  year?: number | string;
  size?: Size;
  revealed?: boolean;
  title?: string;
  artist?: string;
  faded?: boolean;
};

// Carte "vinyl-label". Revealed=false → dos de carte (rayures vin de marque +
// disque crème avec "T" italique). Revealed=true → surface navy avec année
// géante en or au centre + métadonnées artiste/titre.
export function YearCard({
  year,
  size = "md",
  revealed = true,
  title,
  artist,
  faded = false,
}: Props) {
  const s = SIZES[size];

  if (!revealed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center relative"
        style={{
          width: s.w,
          height: s.h,
          borderRadius: 14,
          background:
            "repeating-linear-gradient(135deg, var(--wine) 0px, var(--wine) 8px, var(--wine-deep) 8px, var(--wine-deep) 16px)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="flex items-center justify-center font-display italic font-bold"
          style={{
            background: "#FBF7EC",
            width: s.w * 0.55,
            height: s.w * 0.55,
            borderRadius: "50%",
            color: "var(--wine)",
            fontSize: s.year * 0.55,
          }}
        >
          T
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center relative"
      style={{
        width: s.w,
        height: s.h,
        borderRadius: 14,
        background: "var(--surface)",
        border: "1.5px solid var(--line-strong)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
        opacity: faded ? 0.55 : 1,
        padding: 6,
      }}
    >
      {artist && (
        <div
          className="font-mono uppercase max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center"
          style={{
            fontSize: s.label,
            letterSpacing: "0.12em",
            color: "var(--ink-dim)",
          }}
        >
          {artist}
        </div>
      )}
      <div
        className="font-display font-bold leading-none"
        style={{
          fontSize: s.year,
          color: "var(--year-ink)",
          letterSpacing: "-0.02em",
          fontVariationSettings: '"opsz" 144',
        }}
      >
        {year}
      </div>
      {title && (
        <div
          className="italic font-display max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center"
          style={{
            fontSize: s.label,
            color: "var(--ink-2)",
            marginTop: 2,
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
}
