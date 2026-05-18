"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";

type Playlist = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
};

export default function NewPartyPage() {
  const router = useRouter();
  const { product } = useSpotifyPlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [mode, setMode] = useState<"online_premium" | "host_audio">("online_premium");
  const [winCards, setWinCards] = useState(10);
  const [pseudo, setPseudo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    (async () => {
      const { data } = await supabase
        .from("curated_playlists")
        .select("id, slug, name, description, cover_url")
        .eq("is_active", true)
        .order("name");
      setPlaylists(data ?? []);
      if (data && data.length > 0) setPlaylistId(data[0].id);
    })();
  }, []);

  // L'hôte est toujours celui qui lit l'audio (même en mode host_audio).
  // Donc le créateur doit avoir Premium peu importe le mode choisi.
  const canSubmit =
    !!playlistId &&
    pseudo.trim().length > 0 &&
    !submitting &&
    product === "premium";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playlistId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlist_id: playlistId,
          mode,
          win_condition_cards: winCards,
          pseudo: pseudo.trim(),
          has_premium: product === "premium",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "create_failed");
      router.push(`/parties/${data.room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erreur");
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">{t("create.title")}</h1>
      <p className="text-muted-foreground mb-8">{t("create.subtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>{t("create.playlist")}</Label>
          {playlists.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("create.noPlaylists")}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlaylistId(p.id)}
                  className={`text-left rounded-md border p-3 transition ${
                    playlistId === p.id
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <div className="font-medium">{p.name}</div>
                  {p.description && (
                    <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("create.mode")}</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("online_premium")}
              className={`text-left rounded-md border p-3 transition ${
                mode === "online_premium" ? "border-primary bg-primary/5" : "border-input hover:bg-accent"
              }`}
            >
              <div className="font-medium">{t("create.modeOnline")}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("create.modeOnlineHint")}</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("host_audio")}
              className={`text-left rounded-md border p-3 transition ${
                mode === "host_audio" ? "border-primary bg-primary/5" : "border-input hover:bg-accent"
              }`}
            >
              <div className="font-medium">{t("create.modeHost")}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("create.modeHostHint")}</div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="win-cards">{t("create.winCondition")}</Label>
          <Input
            id="win-cards"
            type="number"
            min={3}
            max={20}
            value={winCards}
            onChange={(e) => setWinCards(parseInt(e.target.value) || 10)}
            className="w-32"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pseudo">{t("create.pseudo")}</Label>
          <Input
            id="pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder={t("create.pseudoPlaceholder")}
            maxLength={40}
          />
        </div>

        {product !== "premium" && (
          <Card className="p-4 border-amber-500/40 bg-amber-500/10">
            <p className="text-sm font-medium mb-2">
              {product === null
                ? t("spotify.notLinked")
                : t("spotify.premiumRequired")}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              En tant qu&apos;hôte, c&apos;est toi qui lances la musique — donc tu
              dois avoir un compte Premium, peu importe le mode.
            </p>
            <a
              href={`/api/spotify/login?return_to=${encodeURIComponent("/parties/nouvelle")}`}
              className="inline-flex items-center justify-center rounded-md bg-[#1DB954] px-4 py-2 text-sm font-medium text-black hover:bg-[#1ed760]"
            >
              {t("spotify.connect")}
            </a>
          </Card>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
          {submitting ? t("create.submitting") : t("create.submit")}
        </Button>
      </form>
    </main>
  );
}
