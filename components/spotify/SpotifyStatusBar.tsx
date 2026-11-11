"use client";

import { useSpotifyPlayer } from "./SpotifyPlayerProvider";
import { GlyphIcon } from "@/components/brand/GlyphIcon";

type Props = {
  /** Si true, on doit pouvoir jouer (mode online ou je suis l'hôte en host_audio) */
  needsToPlay: boolean;
};

// Barre de diagnostic qui n'apparaît QUE quand quelque chose cloche côté
// SDK Spotify. Sert à informer l'utilisateur ET à debug en prod.
export function SpotifyStatusBar({ needsToPlay }: Props) {
  const { isReady, deviceId, product, error, mode } = useSpotifyPlayer();

  if (!needsToPlay) return null;

  let message: string | null = null;
  let kind: "info" | "warning" | "error" = "info";

  if (error) {
    message = error;
    kind = "error";
  } else if (product === null) {
    message = "Spotify pas connecté — clique 'Se connecter avec Spotify' sur l'accueil.";
    kind = "warning";
  } else if (product !== "premium") {
    message = "Compte Spotify non-Premium — la lecture est impossible dans ce navigateur.";
    kind = "warning";
  } else if (mode === "native" ? !isReady : !isReady || !deviceId) {
    message =
      mode === "native"
        ? "Connexion à Spotify… (assure-toi que l'app Spotify est installée)"
        : "Initialisation du lecteur Spotify… (peut prendre quelques secondes)";
    kind = "info";
  }

  if (!message) return null;

  // Teintes de la charte (les anciennes variables crème/brun n'existent plus).
  const colors = {
    info: { bg: "var(--surface-2)", color: "var(--ink-2)", border: "var(--line-strong)", dot: "var(--ink-dim)" },
    warning: { bg: "rgba(210,162,76,0.12)", color: "var(--ink)", border: "rgba(210,162,76,0.5)", dot: "var(--gold)" },
    error: { bg: "rgba(229,72,77,0.10)", color: "var(--ink)", border: "rgba(229,72,77,0.5)", dot: "var(--destructive)" },
  }[kind];

  return (
    <div
      style={{
        margin: "10px 16px 0",
        padding: "10px 14px",
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        fontSize: 13,
        lineHeight: 1.45,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1, display: "inline-flex" }} aria-hidden>
        <GlyphIcon kind="spotify" size={18} color="var(--spotify)" />
      </span>
      <span>{message}</span>
    </div>
  );
}
