"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

type Playlist = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  spotify_playlist_id: string;
  track_count?: number;
};

export default function AdminPlaylistsPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [input, setInput] = useState("");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("curated_playlists")
      .select("id, slug, name, description, is_active, spotify_playlist_id")
      .order("name");

    const lists = (data ?? []) as Playlist[];

    // Compte des pistes par playlist
    const counts = await Promise.all(
      lists.map(async (pl) => {
        const { count } = await supabase
          .from("curated_tracks")
          .select("id", { count: "exact", head: true })
          .eq("playlist_id", pl.id);
        return { id: pl.id, count: count ?? 0 };
      }),
    );
    const map = new Map(counts.map((c) => [c.id, c.count]));
    setPlaylists(lists.map((p) => ({ ...p, track_count: map.get(p.id) ?? 0 })));
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/playlists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          slug: slug || undefined,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "import_failed");
      setMessage(
        `✓ ${data.importedCount} pistes importées sur ${data.totalAvailable}.`,
      );
      setInput("");
      setSlug("");
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(p: Playlist) {
    const res = await fetch(`/api/admin/playlists/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    if (res.ok) await refresh();
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <header>
        <h1 className="font-display text-4xl font-bold mb-2">{t("admin.title")}</h1>
        <p className="text-muted-foreground">{t("admin.subtitle")}</p>
      </header>

      {/* Import */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-display text-2xl">{t("admin.import.title")}</h2>
        <form onSubmit={onImport} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input">{t("admin.import.idLabel")}</Label>
            <Input
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("admin.import.idPlaceholder")}
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">
                {t("admin.import.slugLabel")}{" "}
                <span className="text-muted-foreground text-xs">(optionnel)</span>
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                placeholder={t("admin.import.slugPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.import.nameLabel")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("admin.import.submitting") : t("admin.import.submit")}
          </Button>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </section>

      {/* Liste */}
      <section>
        <h2 className="font-display text-2xl mb-3">{t("admin.list.title")}</h2>
        {playlists.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.list.empty")}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {playlists.map((p) => (
              <li
                key={p.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {p.name}
                    {p.is_active ? (
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40">
                        {t("admin.list.active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("admin.list.inactive")}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{p.slug}</span> · {p.track_count}{" "}
                    {t("admin.list.tracks")}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                    {t("admin.list.toggle")}
                  </Button>
                  <Link
                    href={`/admin/playlists/${p.id}`}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {t("admin.list.edit")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-6">
        <Link href="/" className="text-sm underline text-muted-foreground">
          ← {t("game.backHome")}
        </Link>
      </div>
    </main>
  );
}
