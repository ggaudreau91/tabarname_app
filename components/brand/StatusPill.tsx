import type { ReactNode } from "react";

type Tone = "ready" | "premium" | "wait" | "host";

const TONES: Record<Tone, { bg: string; ink: string; dot: string }> = {
  ready: { bg: "rgba(31,138,72,0.14)", ink: "#3FBE73", dot: "#3FBE73" },
  premium: { bg: "transparent", ink: "var(--spotify)", dot: "var(--spotify)" },
  wait: { bg: "transparent", ink: "var(--ink-dim)", dot: "var(--ink-dim)" },
  host: { bg: "rgba(210,162,76,0.16)", ink: "var(--gold)", dot: "var(--gold)" },
};

// Pastille de statut (prêt / premium / hôte / attente).
export function StatusPill({
  tone = "ready",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const t = TONES[tone] ?? TONES.ready;
  return (
    <span className="tb-pill" style={{ background: t.bg, color: t.ink }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: t.dot,
          flexShrink: 0,
        }}
      />
      {children}
    </span>
  );
}
