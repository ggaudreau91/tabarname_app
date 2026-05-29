"use client";

import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { useTurnTimer } from "@/lib/game/useTurnTimer";

type Props = {
  activePseudo: string;
  activePlayerId: string;
  isYouActive: boolean;
  phaseChangedAt: string;
  durationSeconds: number;
  phaseLabel: string;
  /** Pause en cours (musique + compte à rebours figés) */
  paused?: boolean;
  /** Bascule lecture/pause; si absent, le bouton est masqué */
  onTogglePause?: () => void;
};

// Panneau navy: "Joueur actif", timer Fraunces géant, bouton lecture or,
// barre audio segmentée style vinyle, ligne Spotify stream.
export function AudioPanel({
  activePseudo,
  activePlayerId,
  isYouActive,
  phaseChangedAt,
  durationSeconds,
  phaseLabel,
  paused = false,
  onTogglePause,
}: Props) {
  const remaining = useTurnTimer(phaseChangedAt, durationSeconds, paused);
  const elapsed = durationSeconds - remaining;
  const elapsedSec = Math.floor(elapsed);
  const remainSec = Math.ceil(remaining);
  const filledTicks = Math.round((elapsed / durationSeconds) * 12);

  return (
    <div
      className="tb animate-fade-slide-in"
      style={{ background: "var(--panel)", color: "var(--panel-ink)", borderRadius: 20, padding: 20 }}
    >
      <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>Joueur actif</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <PlayerAvatar name={activePseudo} color={colorForPlayer(activePlayerId)} size={52} />
        <div style={{ minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 22, color: "var(--panel-ink)" }}>
            <span style={{ fontStyle: "italic" }}>{isYouActive ? "Toi" : activePseudo}</span> —{" "}
            <span style={{ color: "var(--gold)", fontWeight: 600 }}>{phaseLabel}</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--panel-dim)", marginTop: 3, lineHeight: 1.4 }}>Écoute l&apos;extrait et choisis où la glisser.</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 20 }}>
        <div>
          <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>Temps</div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 46, lineHeight: 0.9, color: "var(--panel-ink)" }}>
            00:<span style={{ color: "var(--gold)" }}>{String(Math.max(remainSec, 0)).padStart(2, "0")}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
        <button
          type="button"
          onClick={onTogglePause}
          disabled={!onTogglePause}
          style={{
            width: 64, height: 64, borderRadius: "50%", background: "var(--gold)", color: "#2A1810",
            flexShrink: 0, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 18px rgba(210,162,76,0.35)", cursor: onTogglePause ? "pointer" : "default", border: "none",
          }}
          aria-label={paused ? "Reprendre la lecture" : "Mettre en pause"}
        >
          {paused ? "▶" : "❚❚"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{ flex: 1, height: 8, borderRadius: 2, background: i < filledTicks ? "var(--gold)" : "rgba(255,255,255,0.14)" }}
              />
            ))}
          </div>
          <div className="tb-mono" style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--panel-dim)" }}>
            <span>{`0:${String(Math.min(elapsedSec, 99)).padStart(2, "0")}`}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span className={paused ? "" : "tb-pulse-dot"} style={{ width: 6, height: 6, borderRadius: "50%", background: paused ? "rgba(255,255,255,0.4)" : "var(--spotify)" }} />
              {paused ? "SPOTIFY · PAUSE" : "SPOTIFY · STREAM"}
            </span>
            <span>{`0:${String(Math.floor(durationSeconds)).padStart(2, "0")}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
