"use client";

import { useEffect, useState } from "react";
import { GameCard } from "./Card";

type Props = {
  phaseChangedAt: string; // ISO
  durationSeconds: number;
  activePlayerLabel: string;
  isYouActive: boolean;
};

export function NowPlaying({
  phaseChangedAt,
  durationSeconds,
  activePlayerLabel,
  isYouActive,
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

  return (
    <div className="flex items-center gap-6 rounded-lg border bg-card p-6">
      <GameCard revealed={false} />
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {isYouActive ? "À toi de jouer" : "Joueur actif"}
        </div>
        <div className="text-xl font-bold">{activePlayerLabel}</div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(remaining / durationSeconds) * 100}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1 tabular-nums">
          {Math.ceil(remaining)}s
        </div>
      </div>
    </div>
  );
}
