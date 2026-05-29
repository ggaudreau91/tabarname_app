"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { Btn } from "@/components/brand/Btn";
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

// scatter de confettis déterministe (pas de layout shift au re-render)
const TB_CONFETTI = [
  { l: 8, t: 14, r: -24, c: "gold", w: 22 }, { l: 70, t: 9, r: 18, c: "wine", w: 16 },
  { l: 88, t: 22, r: -10, c: "cream", w: 20 }, { l: 14, t: 33, r: 30, c: "wine", w: 14 },
  { l: 90, t: 44, r: 24, c: "gold", w: 18 }, { l: 6, t: 52, r: -18, c: "cream", w: 16 },
  { l: 80, t: 60, r: -28, c: "wine", w: 20 }, { l: 22, t: 68, r: 12, c: "gold", w: 14 },
  { l: 92, t: 74, r: 8, c: "cream", w: 18 }, { l: 12, t: 80, r: -22, c: "wine", w: 16 },
  { l: 60, t: 86, r: 26, c: "gold", w: 20 }, { l: 40, t: 6, r: -14, c: "cream", w: 14 },
];

function Confetti() {
  const tone: Record<string, string> = {
    gold: "var(--gold)",
    wine: "var(--wine)",
    cream: "rgba(244,237,221,0.55)",
  };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
      {TB_CONFETTI.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute", left: `${p.l}%`, top: `${p.t}%`,
            width: p.w, height: p.w * 0.34, borderRadius: 2,
            background: tone[p.c], opacity: 0.7, transform: `rotate(${p.r}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// Overlay reveal: vinyles tournants, confettis, flip 3D (dos mystère → recto
// avec année géante), verdict, bandeau "now playing", CTA prochain tour.
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
  const [flipped, setFlipped] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const won = outcome !== "all_wrong";
  const spotifyHref = spotifyOpenUrl(spotifyUri);
  const CW = 236;
  const CH = 332;

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 760);
    const t2 = setTimeout(() => setShowRest(true), 1340);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const replay = () => {
    setFlipped(false);
    setShowRest(false);
    setTimeout(() => setFlipped(true), 420);
    setTimeout(() => setShowRest(true), 1000);
  };

  // verdict copy par issue
  const verdict =
    outcome === "active_correct"
      ? { lead: isYouWinner ? "Bien joué," : "Bien joué,", who: isYouWinner ? "Toi." : `${winnerLabel ?? "—"}.` }
      : outcome === "challenger_correct"
        ? { lead: "Contesté par", who: `${winnerLabel ?? "—"}.` }
        : { lead: "Manqué,", who: "personne." };

  const sub =
    outcome === "active_correct"
      ? `${year}, pile au bon endroit. La carte rejoint la timeline.`
      : outcome === "challenger_correct"
        ? `${winnerLabel} avait raison — rafle la carte par contestation.`
        : "Pas tout à fait — personne ne gagne la carte ce tour-ci.";

  return (
    <div
      className="tb fixed inset-0 z-50"
      style={{
        background: "var(--hero-bg)",
        color: "var(--hero-ink)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "18px 22px 26px",
      }}
    >
      {/* vinyles + confetti backdrop */}
      <div style={{ position: "absolute", left: -110, top: -64, opacity: 0.16, zIndex: 0 }}>
        <VinylDisc size={300} spinning />
      </div>
      <div style={{ position: "absolute", right: -120, bottom: -90, opacity: 0.12, zIndex: 0 }}>
        <VinylDisc size={300} />
      </div>
      {showRest && won && <Confetti />}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {/* stamp */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 4, marginBottom: 14 }}>
          <span className="tb-stamp" style={{ borderColor: "var(--accent)", color: "var(--accent)", transform: "rotate(-2.5deg)" }}>
            {flipped ? `Révélation · Tour ${turnNumber}` : "On retourne la carte…"}
          </span>
        </div>

        {/* flip card */}
        <div style={{ display: "flex", justifyContent: "center", position: "relative", marginTop: 6, marginBottom: 8 }}>
          <div style={{ width: CW, height: CH, perspective: 1200 }}>
            <div
              style={{
                position: "relative", width: "100%", height: "100%",
                transformStyle: "preserve-3d", transition: "transform .72s cubic-bezier(.2,.75,.2,1)",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* FRONT — dos mystère */}
              <div
                style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  borderRadius: 18, overflow: "hidden",
                  background: "repeating-linear-gradient(45deg, var(--wine) 0 16px, #6A1622 16px 32px)",
                  boxShadow: "0 22px 50px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}
              >
                <div
                  className="font-display italic"
                  style={{
                    width: CW * 0.42, height: CW * 0.42, borderRadius: "50%", background: "#FBF7EC",
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                    fontSize: CW * 0.26, color: "var(--wine)",
                  }}
                >
                  ?
                </div>
                <span className="tb-mono" style={{ marginTop: 16, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(251,247,236,0.82)" }}>Carte mystère</span>
              </div>

              {/* BACK — carte révélée */}
              <div
                style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)", borderRadius: 18, overflow: "hidden",
                  background: "var(--paper-2, #FBF6EA)", padding: "18px 20px 16px",
                  boxShadow: "0 26px 60px rgba(0,0,0,0.5), 0 2px 0 1px rgba(0,0,0,0.2)",
                  display: "flex", flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="tb-mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "#8A6A52", lineHeight: 1.5, textTransform: "uppercase" }}>
                    Tabarname · 45<br />Face A
                  </div>
                  <span
                    className="font-display italic"
                    style={{
                      width: 28, height: 28, borderRadius: "50%", background: "var(--wine)", color: "#FBF7EC",
                      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15, flexShrink: 0,
                    }}
                  >
                    T
                  </span>
                </div>
                <div className="font-display" style={{ fontWeight: 900, fontSize: 82, lineHeight: 0.92, color: "var(--wine)", letterSpacing: "-0.02em", marginTop: 4 }}>
                  {year}
                </div>
                <div style={{ display: "flex", alignItems: "center", margin: "10px 0 12px" }}>
                  <span style={{ flex: 1, height: 1.5, background: "#2A1810" }} />
                  <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid #2A1810", margin: "0 -1px" }} />
                  <span style={{ flex: 1, height: 1.5, background: "#2A1810" }} />
                </div>
                <div className="font-display italic" style={{ fontWeight: 600, fontSize: 23, color: "#241008", lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                <div style={{ fontFamily: "var(--ff-body)", fontSize: 15, color: "#5A3A28", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artists}</div>
                <div style={{ flex: 1 }} />
                <div style={{ borderTop: "1.5px dashed rgba(42,24,16,0.28)", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                  <span className="tb-mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "#8A6A52", textTransform: "uppercase" }}>Tour {turnNumber}</span>
                  <span className="tb-mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "#8A6A52", textTransform: "uppercase" }}>QC · {year}</span>
                </div>
              </div>
            </div>
          </div>

          {/* +1 carte sticker */}
          {won && showRest && (
            <div
              className="font-display italic"
              style={{
                position: "absolute", top: -8, right: 16, transform: "rotate(7deg)",
                background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999,
                padding: "9px 16px", fontWeight: 700, fontSize: 17, boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
                animation: "tb-card-in .4s cubic-bezier(.2,.8,.2,1) both",
              }}
            >
              +1 carte!
            </div>
          )}
        </div>

        {/* verdict */}
        <h1
          className="font-display"
          style={{
            fontWeight: 700, fontSize: 38, lineHeight: 1.0, letterSpacing: "-0.02em",
            textAlign: "center", color: "var(--hero-ink)",
            opacity: showRest ? 1 : 0, transform: showRest ? "none" : "translateY(8px)",
            transition: "opacity .4s ease, transform .4s ease", marginTop: 6,
          }}
        >
          <span style={{ fontStyle: "italic" }}>{verdict.lead}</span>{" "}
          <span style={{ color: "var(--accent)" }}>{verdict.who}</span>
        </h1>
        <p
          style={{
            fontSize: 14, lineHeight: 1.5, color: "var(--ink-2)", textAlign: "center",
            maxWidth: 300, margin: "8px auto 0",
            opacity: showRest ? 1 : 0, transition: "opacity .4s ease .06s",
          }}
        >
          {sub}
        </p>

        <div style={{ flex: 1, minHeight: 14 }} />

        {/* now playing strip */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 13, padding: "11px 13px",
            background: "rgba(255,255,255,0.055)", border: "1px solid var(--line)", borderRadius: 14, marginBottom: 16,
            opacity: showRest ? 1 : 0, transition: "opacity .45s ease .12s",
          }}
        >
          {coverUrl ? (
            <Image src={coverUrl} alt={`Pochette de ${title}`} width={50} height={50} unoptimized style={{ borderRadius: 9, flexShrink: 0, objectFit: "cover" }} />
          ) : (
            <div style={{ flexShrink: 0 }}>
              <VinylDisc size={50} label="" />
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="font-display italic" style={{ fontWeight: 600, fontSize: 16, color: "var(--hero-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title} · {artists}
            </div>
            <div className="tb-mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
              <span>QC · {year}</span>
              {spotifyHref && (
                <>
                  <span style={{ color: "var(--line-strong)" }}>·</span>
                  <a href={spotifyHref} target="_blank" rel="noopener noreferrer" style={{ color: "var(--spotify)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Ouvrir sur Spotify
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3.5 3.5h5v5M8.5 3.5L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                </>
              )}
            </div>
          </div>
          <button
            onClick={replay}
            aria-label="Rejouer l'animation"
            className="tb-mono"
            style={{ flexShrink: 0, fontSize: 16, width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--line-strong)", color: "var(--ink-dim)", background: "transparent", cursor: "pointer" }}
          >
            ↻
          </button>
        </div>

        {/* CTA */}
        {canAdvance ? (
          <Btn kind="accent" block icon={<span>▶</span>} onClick={onAdvance}>
            Prochain tour
          </Btn>
        ) : (
          <div style={{ textAlign: "center", fontStyle: "italic", color: "var(--ink-dim)", fontSize: 14 }}>
            En attente de l&apos;hôte pour démarrer le prochain tour…
          </div>
        )}
      </div>
    </div>
  );
}
