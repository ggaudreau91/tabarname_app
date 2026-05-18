"use client";

import { YearCard } from "@/components/brand/YearCard";
import { MetaLabel } from "@/components/brand/Stamp";
import type { TimelineCard } from "@/types/game";

type Props = {
  cards: TimelineCard[];
  totalToWin: number;
  /** Si défini, des drop-zones interactives sont rendues entre les cartes */
  onChooseSlot?: (position: number) => void;
  selectedSlot?: number | null;
  metadata?: Record<string, { title?: string; artists?: string }>;
};

function DropSlot({
  active,
  hover,
  onClick,
}: {
  active: boolean;
  hover: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label="Drop zone"
      className="relative shrink-0 transition-all"
      style={{
        width: 28,
        height: 132,
        borderRadius: 6,
        border: `2px dashed ${hover ? "var(--oxblood)" : "var(--brun-mid)"}`,
        background: hover
          ? "rgba(139,35,49,0.08)"
          : active
            ? "rgba(139,35,49,0.04)"
            : "transparent",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {hover && (
        <div
          className="absolute font-mono font-semibold whitespace-nowrap"
          style={{
            top: -22,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 10,
            color: "var(--oxblood)",
            background: "var(--creme)",
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid var(--oxblood)",
          }}
        >
          ICI
        </div>
      )}
    </button>
  );
}

// Rail de timeline crème avec drop-zones entre cartes. Quand onChooseSlot
// est fourni → les zones deviennent interactives (placement actif ou
// contestation). La zone sélectionnée apparaît avec un tag "ICI" or.
export function TimelineRail({
  cards,
  totalToWin,
  onChooseSlot,
  selectedSlot,
  metadata,
}: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3.5">
          <MetaLabel>Ma timeline</MetaLabel>
          <div
            className="font-mono"
            style={{
              fontSize: 12,
              color: "var(--brun-mid)",
              letterSpacing: "0.1em",
            }}
          >
            {cards.length} / {totalToWin} CARTES
          </div>
        </div>
        {onChooseSlot && (
          <div
            className="italic"
            style={{ fontSize: 12, color: "var(--brun-mid)" }}
          >
            Choisis l&apos;emplacement{" "}
            <span
              className="not-italic font-semibold"
              style={{ color: "var(--oxblood)" }}
            >
              ↓
            </span>
          </div>
        )}
      </div>

      <div
        className="mt-3.5 relative p-4 sm:py-6 sm:px-5"
        style={{
          background: "var(--creme-2)",
          border: "1px solid var(--creme-3)",
          borderRadius: 10,
        }}
      >
        <div
          className="flex items-center overflow-x-auto pb-6"
          style={{ scrollbarWidth: "thin" }}
        >
          <DropSlot
            active={!!onChooseSlot}
            hover={selectedSlot === 0}
            onClick={onChooseSlot ? () => onChooseSlot(0) : undefined}
          />
          {cards.map((card, i) => {
            const meta = metadata?.[card.trackId];
            return (
              <div key={`${card.trackId}-${i}`} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <YearCard
                    year={card.year}
                    size="md"
                    title={meta?.title}
                    artist={meta?.artists}
                  />
                  <div
                    className="rounded-full mt-1"
                    style={{
                      width: 6,
                      height: 6,
                      background: "var(--brun)",
                    }}
                  />
                </div>
                <DropSlot
                  active={!!onChooseSlot}
                  hover={selectedSlot === i + 1}
                  onClick={onChooseSlot ? () => onChooseSlot(i + 1) : undefined}
                />
              </div>
            );
          })}
        </div>

        <div
          className="absolute"
          style={{
            left: 22,
            right: 22,
            bottom: 18,
            height: 1,
            background: "var(--creme-3)",
          }}
        />
      </div>
    </div>
  );
}
