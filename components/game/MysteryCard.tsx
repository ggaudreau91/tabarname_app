"use client";

import { VinylDisc } from "@/components/brand/VinylDisc";
import { YearCard } from "@/components/brand/YearCard";
import { Stamp, MetaLabel } from "@/components/brand/Stamp";

type Props = {
  isYouActive: boolean;
};

// Panneau "carte mystère": dos de carte (sans année visible) avec un vinyle
// qui tourne derrière + label "Carte mystère" et tampon "À toi de jouer"
// quand c'est le tour du joueur.
export function MysteryCard({ isYouActive }: Props) {
  return (
    <div
      className="flex flex-col items-stretch relative overflow-hidden p-4 sm:p-[18px] animate-rise-in"
      style={{
        background: "var(--creme)",
        border: "1.5px solid var(--brun)",
        borderRadius: 10,
      }}
    >
      <MetaLabel>Carte mystère</MetaLabel>
      <div
        className="relative mt-2 mx-auto"
        style={{ height: 200, width: "min(220px, 100%)" }}
      >
        <div
          className="absolute"
          style={{
            top: -10,
            left: "calc(50% - 60px)",
            zIndex: 1,
            animation: "spin 8s linear infinite",
          }}
        >
          <VinylDisc size={170} labelColor="var(--oxblood)" />
        </div>
        <div className="relative z-10 flex justify-center pt-1">
          <YearCard year="?" size="lg" revealed={false} />
        </div>
      </div>
      <div className="mt-4 self-start">
        {isYouActive ? (
          <Stamp color="var(--oxblood)" rotate={-4}>
            À toi de jouer
          </Stamp>
        ) : (
          <Stamp color="var(--brun-mid)" rotate={-4}>
            Tour en cours
          </Stamp>
        )}
      </div>
    </div>
  );
}
