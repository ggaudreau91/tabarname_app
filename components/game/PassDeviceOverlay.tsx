"use client";

import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { Stamp } from "@/components/brand/Stamp";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { Btn } from "@/components/brand/Btn";

type Props = {
  pseudo: string;
  playerId: string;
  cardCount: number;
  onReady: () => void;
};

// Overlay "Passe l'appareil à X" en mode local_pass — empêche le joueur
// précédent de voir la timeline du suivant accidentellement.
export function PassDeviceOverlay({ pseudo, playerId, cardCount, onReady }: Props) {
  return (
    <div
      className="tb fixed inset-0 z-50 overflow-hidden"
      style={{
        background: "var(--panel)",
        color: "var(--panel-ink)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 28px",
        textAlign: "center",
      }}
    >
      <div style={{ position: "absolute", left: -90, top: -70, opacity: 0.5, pointerEvents: "none" }}>
        <VinylDisc size={260} spinning />
      </div>

      <div style={{ position: "relative" }}>
        <Stamp>Passe l&apos;appareil</Stamp>
      </div>

      <div style={{ marginTop: 40 }}>
        <PlayerAvatar name={pseudo} color={colorForPlayer(playerId)} size={120} />
      </div>

      <h1
        className="font-display"
        style={{ fontWeight: 700, fontSize: 44, lineHeight: 1.04, marginTop: 28, letterSpacing: "-0.02em", color: "var(--panel-ink)" }}
      >
        C&apos;est à
        <br />
        <span style={{ fontStyle: "italic", color: "var(--gold)", whiteSpace: "nowrap" }}>{pseudo}</span>
      </h1>
      <div className="tb-mono" style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--panel-dim)", marginTop: 18 }}>
        {cardCount} carte{cardCount > 1 ? "s" : ""} dans ta timeline
      </div>

      <div style={{ marginTop: 44, width: "100%", maxWidth: 320 }}>
        <Btn kind="accent" block icon={<span>▶</span>} onClick={onReady}>
          Je suis prêt
        </Btn>
      </div>
    </div>
  );
}
