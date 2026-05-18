"use client";

import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { MetaLabel, Stamp } from "@/components/brand/Stamp";
import { VinylDisc } from "@/components/brand/VinylDisc";

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
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(26,15,9,0.95) 0%, rgba(26,15,9,0.99) 100%)",
        }}
      />
      <div
        className="absolute"
        style={{
          top: -180,
          left: -180,
          opacity: 0.16,
          animation: "spin 18s linear infinite",
        }}
      >
        <VinylDisc size={520} labelColor="var(--or)" />
      </div>

      <div
        className="relative z-10 w-full h-full flex flex-col items-center justify-center"
        style={{ padding: 32, color: "var(--creme)" }}
      >
        <Stamp color="var(--or)" rotate={-3}>
          Passe l&apos;appareil
        </Stamp>

        <div className="mt-10">
          <PlayerAvatar
            name={pseudo}
            color={colorForPlayer(playerId)}
            size={128}
          />
        </div>

        <h2
          className="font-display font-semibold text-center mt-8"
          style={{
            fontSize: "clamp(56px, 9vw, 96px)",
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            color: "var(--creme)",
          }}
        >
          C&apos;est à{" "}
          <span className="italic" style={{ color: "var(--or)" }}>
            {pseudo}
          </span>
        </h2>
        <div className="mt-4" style={{ color: "rgba(250,246,240,0.65)" }}>
          <MetaLabel color="rgba(250,246,240,0.55)">
            {cardCount} carte{cardCount > 1 ? "s" : ""} dans ta timeline
          </MetaLabel>
        </div>

        <button
          onClick={onReady}
          className="mt-12 inline-flex items-center gap-2 font-semibold rounded-md"
          style={{
            background: "var(--or)",
            color: "var(--brun)",
            padding: "18px 36px",
            fontSize: 17,
          }}
        >
          <span>▶</span> Je suis prêt
        </button>
      </div>
    </div>
  );
}
