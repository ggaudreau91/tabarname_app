"use client";

import Image from "next/image";
import { ArrowRight, ExternalLink, Play } from "lucide-react";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { YearCard } from "@/components/brand/YearCard";
import { Stamp, MetaLabel } from "@/components/brand/Stamp";
import type { TurnOutcome } from "@/types/game";

type Props = {
  turnNumber: number;
  year: number;
  title: string;
  artists: string;
  /** URL de l'album cover (de curated_tracks.cover_url) */
  coverUrl?: string | null;
  /** Spotify URI au format `spotify:track:<id>` — converti en lien open.spotify.com */
  spotifyUri?: string | null;
  outcome: TurnOutcome;
  winnerLabel: string | null;
  isYouWinner: boolean;
  canAdvance: boolean;
  onAdvance: () => void;
};

function spotifyOpenUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const match = uri.match(/^spotify:track:([A-Za-z0-9]+)/);
  if (!match) return null;
  return `https://open.spotify.com/track/${match[1]}`;
}

// Overlay reveal: vinyles tournants en arrière, confettis, gros titre Fraunces,
// flip card (dos → recto avec année oxblood géante + métadonnées + badge or).
export function RevealOverlay({
  turnNumber,
  year,
  title,
  artists,
  coverUrl,
  spotifyUri,
  outcome,
  winnerLabel,
  isYouWinner,
  canAdvance,
  onAdvance,
}: Props) {
  const spotifyHref = spotifyOpenUrl(spotifyUri);
  const headline =
    outcome === "active_correct"
      ? isYouWinner
        ? { lead: "Bien", emphasis: "joué,", color: "Toi" }
        : { lead: "Bien", emphasis: "joué,", color: winnerLabel ?? "—" }
      : outcome === "challenger_correct"
        ? { lead: "Contesté", emphasis: "par", color: winnerLabel ?? "—" }
        : { lead: "Personne", emphasis: "ne", color: "rafle" };

  const sub =
    outcome === "active_correct"
      ? "La carte a été placée au bon endroit. Tu gagnes la carte et l'ajoutes à ta timeline."
      : outcome === "challenger_correct"
        ? `${winnerLabel} avait raison — rafle la carte par contestation.`
        : "Aucun placement correct cette fois — personne ne gagne la carte.";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(26,15,9,0.94) 0%, rgba(26,15,9,0.98) 100%)",
        }}
      />

      {/* Spinning vinyls */}
      <div
        className="absolute"
        style={{
          top: -180,
          left: -180,
          opacity: 0.18,
          animation: "spin 18s linear infinite",
        }}
      >
        <VinylDisc size={520} labelColor="var(--or)" />
      </div>
      <div
        className="absolute"
        style={{
          bottom: -200,
          right: -200,
          opacity: 0.15,
          animation: "spin 22s linear infinite reverse",
        }}
      >
        <VinylDisc size={560} labelColor="var(--oxblood)" />
      </div>

      {/* Confetti */}
      {Array.from({ length: 24 }).map((_, i) => {
        const colors = ["var(--or)", "var(--oxblood)", "var(--creme)"];
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 29) % 100}%`,
              width: 6,
              height: 14,
              background: colors[i % 3],
              transform: `rotate(${i * 37}deg)`,
              opacity: 0.5,
              borderRadius: 1,
            }}
          />
        );
      })}

      {/* Main content */}
      <div
        className="relative z-10 w-full h-full flex flex-col items-center justify-center"
        style={{ padding: 40, color: "var(--creme)" }}
      >
        <div className="text-center mb-8">
          <Stamp color="var(--or)" rotate={-3}>
            Reveal · Tour {turnNumber}
          </Stamp>
        </div>

        <h2
          className="font-display font-semibold text-center"
          style={{
            fontSize: "clamp(56px, 9vw, 96px)",
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            color: "var(--creme)",
          }}
        >
          <span className="italic">{headline.lead}</span> {headline.emphasis}{" "}
          <span style={{ color: "var(--or)" }}>{headline.color}</span>
          <span style={{ color: "var(--or)" }}>.</span>
        </h2>
        <div
          className="mt-3.5 text-center max-w-xl"
          style={{
            fontSize: 17,
            color: "rgba(250,246,240,0.65)",
          }}
        >
          {sub}
        </div>

        {/* Card flip showcase */}
        <div className="mt-14 flex items-center gap-10 sm:gap-14">
          <div
            className="hidden sm:block"
            style={{
              transform: "rotateY(-15deg) rotateZ(-6deg)",
              opacity: 0.4,
              filter: "grayscale(0.5)",
            }}
          >
            <YearCard year="?" size="xl" revealed={false} />
          </div>

          <div className="hidden sm:flex flex-col items-center gap-2">
            <MetaLabel color="var(--or)">Flip</MetaLabel>
            <div className="flex items-center gap-1">
              <div
                style={{
                  width: 24,
                  height: 2,
                  background: "rgba(250,246,240,0.3)",
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 2,
                  background: "rgba(250,246,240,0.5)",
                }}
              />
              <ArrowRight size={22} color="var(--or)" strokeWidth={2.5} />
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                color: "rgba(250,246,240,0.4)",
                letterSpacing: "0.1em",
              }}
            >
              0.6s · ease-out
            </div>
          </div>

          {/* Revealed card */}
          <div
            className="relative"
            style={{ transform: "rotateY(8deg) rotateZ(4deg)" }}
          >
            <div
              className="flex flex-col"
              style={{
                width: 280,
                height: 380,
                background: "var(--creme)",
                border: "2px solid var(--brun)",
                borderRadius: 14,
                padding: 22,
                boxShadow:
                  "0 30px 80px rgba(0,0,0,0.55), 0 0 0 6px rgba(212,166,86,0.18), 0 0 0 12px rgba(212,166,86,0.08)",
                color: "var(--brun)",
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <MetaLabel>Tabarname · 45</MetaLabel>
                  <div
                    className="mt-1.5 font-mono"
                    style={{
                      fontSize: 10,
                      color: "var(--brun-mid)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    FACE A
                  </div>
                </div>
                <div
                  className="flex items-center justify-center rounded-full font-display italic font-bold"
                  style={{
                    width: 36,
                    height: 36,
                    background: "var(--oxblood)",
                    color: "var(--creme)",
                    fontSize: 18,
                  }}
                >
                  T
                </div>
              </div>

              <div
                className="mt-5 font-display font-bold"
                style={{
                  fontSize: 116,
                  lineHeight: 0.9,
                  color: "var(--oxblood)",
                  letterSpacing: "-0.03em",
                  fontVariationSettings: '"opsz" 144',
                }}
              >
                {year}
              </div>

              <div
                className="my-4 relative"
                style={{ height: 1, background: "var(--brun)" }}
              >
                <div
                  className="absolute rounded-full"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 8,
                    height: 8,
                    background: "var(--creme)",
                    border: "1px solid var(--brun)",
                  }}
                />
              </div>

              <div
                className="font-display italic font-semibold"
                style={{
                  fontSize: 22,
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </div>
              <div
                className="mt-1 font-medium"
                style={{ fontSize: 14, color: "var(--brun-2)" }}
              >
                {artists}
              </div>

              <div className="flex-1" />
              <div
                className="flex justify-between items-center pt-3 font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--brun-mid)",
                  letterSpacing: "0.1em",
                  borderTop: "1px dashed var(--creme-3)",
                }}
              >
                <span>TURN {turnNumber}</span>
                <span>QC · {year}</span>
              </div>
            </div>
            {outcome !== "all_wrong" && (
              <div
                className="absolute font-display italic font-bold"
                style={{
                  top: -22,
                  right: -22,
                  background: "var(--or)",
                  color: "var(--brun)",
                  padding: "10px 18px",
                  borderRadius: 30,
                  fontSize: 18,
                  transform: "rotate(8deg)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                  border: "2px solid var(--creme)",
                }}
              >
                +1 carte!
              </div>
            )}
          </div>
        </div>

        {/* Spotify info bar */}
        <div
          className="mt-12 flex items-center gap-4 rounded-lg w-full max-w-2xl"
          style={{
            padding: "14px 22px",
            background: "rgba(250,246,240,0.06)",
            border: "1px solid rgba(250,246,240,0.12)",
          }}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`Pochette de ${title}`}
              width={44}
              height={44}
              className="rounded shrink-0"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          ) : (
            <div className="shrink-0" style={{ animation: "spin 6s linear infinite" }}>
              <VinylDisc size={44} labelColor="var(--oxblood)" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold truncate"
              style={{ fontSize: 15 }}
            >
              <span
                className="italic font-display"
                style={{ fontWeight: 600 }}
              >
                {title}
              </span>{" "}
              · {artists}
            </div>
            <div
              className="truncate"
              style={{
                fontSize: 12,
                color: "rgba(250,246,240,0.55)",
                marginTop: 2,
              }}
            >
              QC · {year}
              {spotifyHref && (
                <>
                  {" · "}
                  <a
                    href={spotifyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1"
                    style={{
                      color: "var(--green-spotify)",
                      fontWeight: 600,
                    }}
                  >
                    Ouvrir sur Spotify
                    <ExternalLink size={11} strokeWidth={2.5} />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-9 flex items-center gap-3">
          {canAdvance && (
            <button
              onClick={onAdvance}
              className="inline-flex items-center gap-2.5 font-semibold rounded-md"
              style={{
                background: "var(--or)",
                color: "var(--brun)",
                padding: "16px 32px",
                fontSize: 17,
              }}
            >
              <Play size={18} fill="var(--brun)" strokeWidth={0} /> Prochain tour
            </button>
          )}
          {!canAdvance && (
            <div
              className="italic"
              style={{ color: "rgba(250,246,240,0.55)", fontSize: 14 }}
            >
              En attente de l&apos;hôte pour démarrer le prochain tour…
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute font-mono pointer-events-none"
        style={{
          left: 20,
          top: "50%",
          transform: "rotate(-90deg) translateX(50%)",
          transformOrigin: "left top",
          fontSize: 11,
          color: "rgba(250,246,240,0.3)",
          letterSpacing: "0.3em",
        }}
      >
        SIDE B · REVEAL
      </div>
    </div>
  );
}
