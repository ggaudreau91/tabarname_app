"use client";

import { useEffect, useState } from "react";
import { MetaLabel } from "@/components/brand/Stamp";
import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";

type Props = {
  activePseudo: string;
  activePlayerId: string;
  isYouActive: boolean;
  phaseChangedAt: string;
  durationSeconds: number;
  phaseLabel: string;
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
}: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    const startedAt = new Date(phaseChangedAt).getTime();
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setRemaining(Math.max(0, durationSeconds - elapsed));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phaseChangedAt, durationSeconds]);

  const elapsed = durationSeconds - remaining;
  const pct = (elapsed / durationSeconds) * 100;
  const elapsedSec = Math.floor(elapsed);
  const remainSec = Math.ceil(remaining);

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        background: "var(--brun)",
        color: "var(--creme)",
        borderRadius: 10,
        padding: "24px 28px",
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
                  fontSize: 30,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
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
              fontSize: 44,
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
        <div
          className="rounded-full flex items-center justify-center shrink-0"
          style={{
            width: 56,
            height: 56,
            background: "var(--or)",
            color: "var(--brun)",
            fontSize: 22,
            boxShadow: "0 4px 14px rgba(212,166,86,0.4)",
          }}
          aria-label="Lecture en cours"
        >
          ⏸
        </div>
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
                  background: "var(--green-spotify)",
                  animation: "pulse-soft 1.4s infinite",
                }}
              />
              SPOTIFY · STREAM
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
