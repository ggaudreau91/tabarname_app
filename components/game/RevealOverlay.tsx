"use client";

import { GameCard } from "./Card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { TurnOutcome } from "@/types/game";

type Props = {
  year: number;
  title: string;
  artists: string;
  outcome: TurnOutcome;
  winnerLabel: string | null;
  isYouWinner: boolean;
  canAdvance: boolean;
  onAdvance: () => void;
};

export function RevealOverlay({
  year,
  title,
  artists,
  outcome,
  winnerLabel,
  isYouWinner,
  canAdvance,
  onAdvance,
}: Props) {
  const headline =
    outcome === "active_correct"
      ? isYouWinner
        ? t("game.revealCorrect")
        : `${winnerLabel} — ${t("game.revealCorrect")}`
      : outcome === "challenger_correct"
        ? `${winnerLabel} ${t("game.revealChallenger")}`
        : t("game.revealNone");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur">
      <div className="max-w-md w-full mx-6 rounded-lg border bg-card p-8 text-center space-y-6">
        <div className="flex justify-center">
          <GameCard year={year} title={title} artists={artists} />
        </div>
        <div>
          <div className="text-lg font-semibold">{headline}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {title} — {artists} ({year})
          </div>
        </div>
        {canAdvance && (
          <Button onClick={onAdvance} className="w-full">
            {t("game.nextTurn")}
          </Button>
        )}
      </div>
    </div>
  );
}
