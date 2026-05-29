"use client";

type Props = {
  code: string;
  turnNumber: number;
  leaderLabel?: string | null;
  leaderCards?: number;
  onSettings?: () => void;
};

export function GameTopBar({ code, turnNumber, leaderLabel, leaderCards, onSettings }: Props) {
  const formatted = code.replace(/^(.{3})(.{3})$/, "$1·$2");
  return (
    <div
      className="safe-top tb"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", background: "var(--panel)", color: "var(--panel-ink)",
        ["--safe-top-base" as string]: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--wine)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
        </span>
        <span className="font-display italic" style={{ fontWeight: 600, fontSize: 17, color: "var(--panel-ink)" }}>Tabarname</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {leaderLabel && (
          <span style={{ fontSize: 12, color: "var(--panel-dim)" }}>
            <span style={{ color: "var(--gold)", fontWeight: 600 }}>{leaderLabel}</span> · {leaderCards}
          </span>
        )}
        <span className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--gold)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Tour {turnNumber} · {formatted}
        </span>
        {onSettings && (
          <button
            onClick={onSettings}
            style={{ background: "transparent", color: "var(--panel-ink)", border: "1px solid var(--panel-line)", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
            aria-label="Paramètres"
          >
            ⚙
          </button>
        )}
      </div>
    </div>
  );
}
