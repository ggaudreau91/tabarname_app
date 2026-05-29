import type { CSSProperties, ReactNode } from "react";

// Eyebrow / kicker mono uppercase, avec trait optionnel à gauche.
export function Kicker({
  children,
  rule = false,
  style = {},
}: {
  children: ReactNode;
  rule?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
      {rule && (
        <span
          style={{ width: 32, height: 1.5, background: "var(--ink-dim)", flexShrink: 0 }}
        />
      )}
      <span className="tb-kicker" style={{ whiteSpace: "nowrap" }}>
        {children}
      </span>
    </div>
  );
}
