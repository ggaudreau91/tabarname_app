"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type Props = {
  phaseChangedAt: string;
  durationSeconds: number;
  hasChallenged: boolean;
  isActivePlayer: boolean;
  onOpenChallenge: () => void;
};

export function ChallengeBar({
  phaseChangedAt,
  durationSeconds,
  hasChallenged,
  isActivePlayer,
  onOpenChallenge,
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
    <div className="rounded-lg border bg-amber-500/10 border-amber-500/40 p-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="font-medium text-sm">{t("game.challengeWindow")}</div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {Math.ceil(remaining)}s
        </div>
      </div>
      {!isActivePlayer && !hasChallenged && (
        <Button variant="outline" onClick={onOpenChallenge}>
          {t("game.challenge")}
        </Button>
      )}
      {hasChallenged && (
        <div className="text-xs text-muted-foreground">✓ Contestation envoyée</div>
      )}
    </div>
  );
}
