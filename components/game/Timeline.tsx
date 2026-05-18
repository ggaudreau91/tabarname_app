"use client";

import { GameCard } from "./Card";
import type { TimelineCard } from "@/types/game";

type Props = {
  cards: TimelineCard[];
  playerLabel?: string;
  /** Si défini → on affiche des drop-zones entre les cartes pour permettre le placement */
  onChooseSlot?: (position: number) => void;
  selectedSlot?: number | null;
  /** Taille des cartes — `sm` pour les timelines des autres joueurs, `md` pour la sienne */
  size?: "sm" | "md";
  /** Pour le reveal: titre/artiste de chaque carte */
  metadata?: Record<string, { title?: string; artists?: string }>;
};

export function Timeline({
  cards,
  playerLabel,
  onChooseSlot,
  selectedSlot,
  size = "md",
  metadata,
}: Props) {
  const slots = Array.from({ length: cards.length + 1 }, (_, i) => i);

  return (
    <div className="space-y-2">
      {playerLabel && (
        <div className="text-xs font-medium text-muted-foreground">{playerLabel}</div>
      )}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {slots.map((slotIdx) => {
          const card = cards[slotIdx];
          return (
            <div key={`slot-${slotIdx}`} className="flex items-center gap-2 shrink-0">
              {onChooseSlot ? (
                <button
                  type="button"
                  onClick={() => onChooseSlot(slotIdx)}
                  aria-label={`Placer en position ${slotIdx}`}
                  className={`h-${size === "sm" ? "28" : "44"} w-3 rounded-sm transition ${
                    selectedSlot === slotIdx
                      ? "bg-primary"
                      : "bg-muted-foreground/10 hover:bg-primary/40"
                  }`}
                  style={{ height: size === "sm" ? "7rem" : "11rem" }}
                />
              ) : (
                <div style={{ width: "0.25rem" }} />
              )}
              {card && (
                <GameCard
                  year={card.year}
                  title={metadata?.[card.trackId]?.title}
                  artists={metadata?.[card.trackId]?.artists}
                  size={size}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
