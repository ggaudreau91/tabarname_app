"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

type Track = {
  id: string;
  title: string;
  artists: string;
  album: string | null;
  spotify_release_year: number;
  effective_year: number;
  notes: string | null;
  is_excluded: boolean;
};

type Playlist = { id: string; name: string; slug: string };

export default function AdminPlaylistEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: pl } = await supabase
        .from("curated_playlists")
        .select("id, name, slug")
        .eq("id", id)
        .maybeSingle<Playlist>();
      setPlaylist(pl);

      const { data: tr } = await supabase
        .from("curated_tracks")
        .select(
          "id, title, artists, album, spotify_release_year, effective_year, notes, is_excluded",
        )
        .eq("playlist_id", id)
        .order("effective_year", { ascending: true });
      setTracks((tr ?? []) as Track[]);
    })();
  }, [id, supabase]);

  function updateLocal(trackId: string, patch: Partial<Track>) {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
    );
    setDirty((prev) => new Set(prev).add(trackId));
  }

  async function save(track: Track) {
    setSavingId(track.id);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effective_year: track.effective_year,
          notes: track.notes,
          is_excluded: track.is_excluded,
        }),
      });
      if (res.ok) {
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(track.id);
          return next;
        });
        setSavedId(track.id);
        setTimeout(() => setSavedId((s) => (s === track.id ? null : s)), 2000);
      }
    } finally {
      setSavingId(null);
    }
  }

  if (!playlist) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-6">
      <header>
        <Link
          href="/admin/playlists"
          className="text-sm underline text-muted-foreground"
        >
          ← Curation
        </Link>
        <h1 className="font-display text-4xl font-bold mt-2">{playlist.name}</h1>
        <p className="text-xs text-muted-foreground font-mono">{playlist.slug}</p>
      </header>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2 w-20">{t("admin.tracks.year")}</th>
              <th className="px-3 py-2 w-24">{t("admin.tracks.effective")}</th>
              <th className="px-3 py-2">{t("admin.tracks.notes")}</th>
              <th className="px-3 py-2 w-20">{t("admin.tracks.exclude")}</th>
              <th className="px-3 py-2 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tracks.map((tr) => {
              const isDirty = dirty.has(tr.id);
              return (
                <tr
                  key={tr.id}
                  className={tr.is_excluded ? "opacity-50" : ""}
                >
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium">{tr.title}</div>
                    <div className="text-xs text-muted-foreground">{tr.artists}</div>
                  </td>
                  <td className="px-3 py-2 align-top text-muted-foreground tabular-nums">
                    {tr.spotify_release_year}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Input
                      type="number"
                      min={1900}
                      max={2100}
                      value={tr.effective_year}
                      onChange={(e) =>
                        updateLocal(tr.id, {
                          effective_year: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-8 w-20 tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Input
                      value={tr.notes ?? ""}
                      onChange={(e) => updateLocal(tr.id, { notes: e.target.value })}
                      className="h-8"
                      placeholder="ex. Remastérisé 2011"
                    />
                  </td>
                  <td className="px-3 py-2 align-top text-center">
                    <input
                      type="checkbox"
                      checked={tr.is_excluded}
                      onChange={(e) =>
                        updateLocal(tr.id, { is_excluded: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Button
                      size="sm"
                      variant={isDirty ? "default" : "ghost"}
                      onClick={() => save(tr)}
                      disabled={!isDirty || savingId === tr.id}
                    >
                      {savedId === tr.id
                        ? t("admin.tracks.saved")
                        : t("admin.tracks.save")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
