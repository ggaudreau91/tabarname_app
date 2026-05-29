"use client";

import { VinylDisc } from "@/components/brand/VinylDisc";
import { StripedCardBack } from "@/components/brand/StripedCardBack";
import { Kicker } from "@/components/brand/Kicker";

type Props = {
  isYouActive: boolean;
};

// Panneau "carte mystère": dos de carte rayé vin, vinyle qui tourne derrière
// (clippé par overflow:hidden), tampon "À toi de jouer" / "Tour en cours".
export function MysteryCard({ isYouActive }: Props) {
  return (
    <div className="tb">
      <Kicker style={{ marginBottom: 12 }}>Carte mystère</Kicker>
      <div
        className="tb-card animate-rise-in"
        style={{ borderRadius: 20, padding: "26px 20px 20px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div style={{ position: "absolute", right: -36, top: 28, opacity: 0.9, pointerEvents: "none" }}>
          <VinylDisc size={150} label="" spinning />
        </div>
        <div style={{ position: "relative" }}>
          <StripedCardBack w={150} h={210} label="T" />
        </div>
        <div className="tb-stamp" style={{ marginTop: 18, alignSelf: "flex-start", borderColor: isYouActive ? "var(--accent)" : "var(--ink-dim)", color: isYouActive ? "var(--accent)" : "var(--ink-dim)" }}>
          {isYouActive ? "À toi de jouer" : "Tour en cours"}
        </div>
      </div>
    </div>
  );
}
