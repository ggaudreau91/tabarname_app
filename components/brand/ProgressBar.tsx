// Barre segmentée pour le décompte de cartes de la timeline.
export function ProgressBar({
  value = 1,
  max = 10,
  width = "100%",
  tone = "gold",
}: {
  value?: number;
  max?: number;
  width?: number | string;
  tone?: "gold" | "wine";
}) {
  return (
    <div style={{ display: "flex", gap: 3, width }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 8,
            borderRadius: 3,
            background:
              i < value
                ? tone === "gold"
                  ? "var(--gold)"
                  : "var(--wine)"
                : "var(--surface-sunken)",
            boxShadow: i < value ? "none" : "inset 0 0 0 1px var(--line)",
          }}
        />
      ))}
    </div>
  );
}
