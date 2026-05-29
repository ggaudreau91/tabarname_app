"use client";

import { connectSpotify, useSpotifyPlayer } from "./SpotifyPlayerProvider";
import { t } from "@/lib/i18n";

type Props = {
  /** En mode host_audio, seul l'hôte doit avoir Premium */
  required: boolean;
  children: React.ReactNode;
};

export function PremiumGate({ required, children }: Props) {
  const { product } = useSpotifyPlayer();

  if (!required) return <>{children}</>;
  if (product === null) {
    return (
      <div className="rounded-md border border-input bg-card p-4 text-sm">
        <p>{t("spotify.notLinked")}</p>
        <button
          type="button"
          onClick={() => connectSpotify()}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-[#1DB954] px-4 py-2 text-sm font-medium text-black hover:bg-[#1ed760]"
        >
          {t("spotify.connect")}
        </button>
      </div>
    );
  }

  if (product !== "premium") {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <p className="font-medium">{t("spotify.premiumRequired")}</p>
        <p className="text-muted-foreground text-xs mt-1">{t("spotify.upgradeHint")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
