import { getSupabaseServer } from "@/lib/supabase/server";
import { loadTokensRow } from "@/lib/spotify/tokens";
import { t } from "@/lib/i18n";

// Server Component — utilisé en Sprint 1 pour valider le flow OAuth + premium check
// end-to-end avant l'arrivée du SpotifyPlayerProvider (Sprint 3).
export default async function SpotifyStatus() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tokens = user ? await loadTokensRow(user.id) : null;

  if (!tokens) {
    return (
      <div className="rounded-md border border-input bg-card p-4 text-sm">
        <p className="mb-3">{t("spotify.notLinked")}</p>
        <a
          href="/api/spotify/login"
          className="inline-flex items-center justify-center rounded-md bg-[#1DB954] px-4 py-2 text-sm font-medium text-black hover:bg-[#1ed760]"
        >
          {t("spotify.connect")}
        </a>
      </div>
    );
  }

  if (tokens.product === "premium") {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
        <p className="font-medium">{t("spotify.premiumOk")}</p>
        <p className="text-muted-foreground text-xs mt-1">
          {t("spotify.linkedAs")} <span className="font-mono">{tokens.spotify_user_id}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <p className="font-medium">{t("spotify.premiumRequired")}</p>
      <p className="text-muted-foreground text-xs mt-1">
        {t("spotify.upgradeHint")}
      </p>
    </div>
  );
}
