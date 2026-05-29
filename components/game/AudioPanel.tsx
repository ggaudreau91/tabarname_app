"use client";

import { Pause, Play } from "lucide-react";
import { MetaLabel } from "@/components/brand/Stamp";
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

// Panneau brun avec timer Fraunces géant, avatar du joueur actif, et barre
// audio rainurée style vinyle (les ticks sont juste cosmétiques, le SDK
// Spotify gère le playback réel via SpotifyPlayerProvider).
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
  const pct = (elapsed / durationSeconds) * 100;
  const elapsedSec = Math.floor(elapsed);
  const remainSec = Math.ceil(remaining);

  return (
    <div
      className="relative overflow-hidden flex flex-col p-5 sm:p-7 animate-fade-slide-in"
      style={{
        background: "var(--brun)",
        color: "var(--creme)",
        borderRadius: 10,
      }}
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <MetaLabel color="var(--or)">Joueur actif</MetaLabel>
          <div className="flex items-center gap-3 mt-2">
            <PlayerAvatar
              name={activePseudo}
              color={colorForPlayer(activePlayerId)}
              size={40}
            />
            <div>
              <div
                className="font-display font-semibold"
                style={{
                  fontSize: "clamp(20px, 5vw, 30px)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                }}
              >
                <span className="italic">{isYouActive ? "Toi" : activePseudo}</span>
                {" — "}
                <span style={{ color: "var(--or)" }}>{phaseLabel}</span>
              </div>
              <div
                className="text-sm mt-1.5"
                style={{ color: "rgba(250,246,240,0.6)" }}
              >
                Écoute l&apos;extrait et glisse dans ta timeline.
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <MetaLabel color="var(--or)">Temps</MetaLabel>
          <div
            className="font-display font-bold mt-1"
            style={{
              fontSize: "clamp(32px, 7vw, 44px)",
              color: "var(--creme)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              fontVariationSettings: '"opsz" 144',
            }}
          >
            00:
            <span style={{ color: "var(--or)" }}>
              {String(remainSec).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onTogglePause}
          disabled={!onTogglePause}
          className="rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
          style={{
            width: 56,
            height: 56,
            background: "var(--or)",
            color: "var(--brun)",
            boxShadow: "0 4px 14px rgba(212,166,86,0.4)",
            cursor: onTogglePause ? "pointer" : "default",
          }}
          aria-label={paused ? "Reprendre la lecture" : "Mettre en pause"}
        >
          {paused ? (
            <Play size={22} fill="var(--brun)" strokeWidth={0} style={{ marginLeft: 2 }} />
          ) : (
            <Pause size={22} fill="var(--brun)" strokeWidth={0} />
          )}
        </button>
        <div className="flex-1">
          <div
            className="relative overflow-hidden"
            style={{
              height: 8,
              background: "rgba(250,246,240,0.12)",
              borderRadius: 4,
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 transition-all"
              style={{
                width: `${pct}%`,
                background: "var(--or)",
                borderRadius: 4,
              }}
            />
            {[10, 25, 40, 55, 70, 85].map((p) => (
              <div
                key={p}
                className="absolute"
                style={{
                  left: `${p}%`,
                  top: -3,
                  bottom: -3,
                  width: 1,
                  background: "rgba(250,246,240,0.15)",
                }}
              />
            ))}
          </div>
          <div
            className="flex justify-between mt-2 font-mono"
            style={{
              fontSize: 11,
              color: "rgba(250,246,240,0.55)",
              letterSpacing: "0.1em",
            }}
          >
            <span>
              0:{String(elapsedSec).padStart(2, "0")}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: paused ? "rgba(250,246,240,0.4)" : "var(--green-spotify)",
                  animation: paused ? "none" : "pulse-soft 1.4s infinite",
                }}
              />
              {paused ? "SPOTIFY · PAUSE" : "SPOTIFY · STREAM"}
            </span>
            <span>
              0:{String(Math.floor(durationSeconds)).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
