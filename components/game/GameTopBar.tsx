"use client";

import { MetaLabel } from "@/components/brand/Stamp";

type Props = {
  code: string;
  turnNumber: number;
  leaderLabel?: string | null;
  leaderCards?: number;
  onSettings?: () => void;
};

export function GameTopBar({
  code,
  turnNumber,
  leaderLabel,
  leaderCards,
  onSettings,
}: Props) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "16px 24px",
        background: "var(--brun)",
        color: "var(--creme)",
        borderBottom: "2px solid var(--or)",
      }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 22,
              height: 22,
              background: "var(--oxblood)",
            }}
          >
            <div
              className="rounded-full"
              style={{ width: 6, height: 6, background: "var(--creme)" }}
            />
          </div>
          <div
            className="font-display italic font-bold"
            style={{ fontSize: 16 }}
          >
            Tabarname
          </div>
        </div>
        <div
          style={{
            width: 1,
            height: 24,
            background: "rgba(250,246,240,0.2)",
          }}
        />
        <div className="flex items-center gap-3.5">
          <MetaLabel color="var(--or)">Tour {turnNumber}</MetaLabel>
          <div
            className="font-mono"
            style={{
              fontSize: 13,
              color: "rgba(250,246,240,0.7)",
              letterSpacing: "0.1em",
            }}
          >
            SALLE {code.replace(/^(.{3})(.{3})$/, "$1·$2")}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {leaderLabel && (
          <div className="hidden sm:block" style={{ fontSize: 13, color: "rgba(250,246,240,0.7)" }}>
            <span style={{ color: "var(--or)", fontWeight: 600 }}>
              {leaderLabel}
            </span>{" "}
            mène à {leaderCards} cartes
          </div>
        )}
        {onSettings && (
          <button
            onClick={onSettings}
            style={{
              background: "transparent",
              color: "var(--creme)",
              border: "1px solid rgba(250,246,240,0.25)",
              padding: "6px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            ⚙ Paramètres
          </button>
        )}
      </div>
    </div>
  );
}
