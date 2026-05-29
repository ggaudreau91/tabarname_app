"use client";

import { useSpotifyPlayer } from "./SpotifyPlayerProvider";

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

  const colors = {
    info: { bg: "var(--creme-2)", color: "var(--brun)", border: "var(--creme-3)" },
    warning: { bg: "rgba(212,166,86,0.15)", color: "var(--brun)", border: "var(--or)" },
    error: { bg: "rgba(139,35,49,0.10)", color: "var(--oxblood)", border: "var(--oxblood)" },
  }[kind];

  return (
    <div
      className="font-mono"
      style={{
        padding: "10px 16px",
        background: colors.bg,
        color: colors.color,
        borderLeft: `3px solid ${colors.border}`,
        fontSize: 12,
        letterSpacing: "0.05em",
      }}
    >
      <span style={{ fontWeight: 600 }}>SPOTIFY</span> · {message}
    </div>
  );
}
