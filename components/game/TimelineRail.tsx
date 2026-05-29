"use client";

import { YearCard } from "@/components/brand/YearCard";
import type { TimelineCard } from "@/types/game";

type Props = {
  cards: TimelineCard[];
  totalToWin: number;
  /** Si défini, des drop-zones interactives sont rendues entre les cartes */
  onChooseSlot?: (position: number) => void;
  selectedSlot?: number | null;
  metadata?: Record<string, { title?: string; artists?: string }>;
};

function DropSlot({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label="Emplacement"
      className="tb-slot"
      data-active={active}
      style={{ width: 70, height: 150, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: onClick ? "pointer" : "default" }}
    >
      <span style={{ fontSize: 26, color: active ? "var(--gold-deep)" : "var(--ink-dim)" }}>{active ? "↓" : "+"}</span>
    </button>
  );
}

// Rail de timeline (surface sunken) avec emplacements pointillés entre les
// cartes. Quand onChooseSlot est fourni → emplacements interactifs.
export function TimelineRail({ cards, totalToWin, onChooseSlot, selectedSlot, metadata }: Props) {
  return (
    <div className="tb">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h3 className="font-display" style={{ fontWeight: 700, fontSize: 22, color: "var(--ink)" }}>Ma timeline</h3>
          <span className="tb-mono" style={{ fontSize: 12, color: "var(--ink-dim)", background: "var(--surface-sunken)", borderRadius: 999, padding: "3px 9px" }}>
            {cards.length}/{totalToWin}
          </span>
        </div>
      </div>
      <div className="tb-mono" style={{ fontSize: 11.5, color: "var(--ink-dim)", marginBottom: 12 }}>
        {onChooseSlot
          ? selectedSlot != null
            ? "Emplacement choisi — confirme ↓"
            : "Touche un emplacement pour glisser ta carte"
          : "Ta timeline chronologique"}
      </div>

      <div className="tb-scroll" style={{ background: "var(--surface-sunken)", borderRadius: 18, padding: "20px 18px", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: cards.length <= 2 ? "center" : "flex-start", minWidth: "min-content" }}>
          <DropSlot active={selectedSlot === 0} onClick={onChooseSlot ? () => onChooseSlot(0) : undefined} />
          {cards.map((card, i) => {
            const meta = metadata?.[card.trackId];
            return (
              <div key={`${card.trackId}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <YearCard year={card.year} size="md" title={meta?.title} artist={meta?.artists} />
                <DropSlot active={selectedSlot === i + 1} onClick={onChooseSlot ? () => onChooseSlot(i + 1) : undefined} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
