"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { GlyphIcon } from "@/components/brand/GlyphIcon";
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

export default function AdminPlaylistEditPage({ params }: { params: Promise<{ id: string }> }) {
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
        .select("id, title, artists, album, spotify_release_year, effective_year, notes, is_excluded")
        .eq("playlist_id", id)
        .order("effective_year", { ascending: true });
      setTracks((tr ?? []) as Track[]);
    })();
  }, [id, supabase]);

  function updateLocal(trackId: string, patch: Partial<Track>) {
    setTracks((prev) => prev.map((tk) => (tk.id === trackId ? { ...tk, ...patch } : tk)));
    setDirty((prev) => new Set(prev).add(trackId));
  }

  async function save(track: Track) {
    setSavingId(track.id);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ effective_year: track.effective_year, notes: track.notes, is_excluded: track.is_excluded }),
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
      <main className="tb flex-1" style={{ minHeight: "100%", background: "var(--bg)", color: "var(--ink)" }}>
        <p style={{ color: "var(--ink-dim)", padding: 24 }}>Chargement…</p>
      </main>
    );
  }

  const yearInputStyle: React.CSSProperties = {
    width: 58, flexShrink: 0, textAlign: "center", background: "var(--surface)",
    border: "1.5px solid var(--line-strong)", borderRadius: 9, padding: "7px 4px",
    color: "var(--ink)", fontSize: 14, outline: "none", fontFamily: "var(--ff-mono)",
  };

  return (
    <main className="tb flex-1" style={{ minHeight: "100%", background: "var(--bg)", color: "var(--ink)" }}>
      {/* sticky header */}
      <div className="safe-top" style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--hero-bg)", color: "var(--hero-ink)", padding: "14px 22px 16px" }}>
        <Link href="/admin/playlists" className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", padding: 0 }}>
          ← Curation
        </Link>
        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 28, color: "var(--hero-ink)", letterSpacing: "-0.01em", marginTop: 10, lineHeight: 1.05 }}>{playlist.name}</h1>
        <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--panel-dim)", marginTop: 8 }}>
          {playlist.slug} · {tracks.length} pistes
        </div>
      </div>

      {/* column header */}
      <div className="tb-mono" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 8px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-dim)" }}>
        <span style={{ flex: 1 }}>Chanson</span>
        <span style={{ width: 58, textAlign: "center", flexShrink: 0 }}>{t("admin.tracks.effective")}</span>
        <span style={{ width: 26, textAlign: "center", flexShrink: 0 }}>Sp.</span>
      </div>

      <div className="safe-bottom" style={{ padding: "0 8px 24px" }}>
        <div className="tb-card" style={{ overflow: "hidden", padding: 0 }}>
          {tracks.map((tr, i) => {
            const isDirty = dirty.has(tr.id);
            return (
              <div key={tr.id} style={{ opacity: tr.is_excluded ? 0.5 : 1 }}>
                {i > 0 && <div style={{ height: 1, background: "var(--line)" }} />}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-display" style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-dim)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tr.artists}
                        <span style={{ marginLeft: 6, opacity: 0.7 }}>· {t("admin.tracks.year")} {tr.spotify_release_year}</span>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1900}
                      max={2100}
                      value={tr.effective_year}
                      onChange={(e) => updateLocal(tr.id, { effective_year: parseInt(e.target.value) || 0 })}
                      className="tb-mono"
                      style={yearInputStyle}
                    />
                    <span title="Lié à Spotify" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26 }}>
                      <GlyphIcon kind="spotify" size={20} color="var(--spotify)" />
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <input
                      value={tr.notes ?? ""}
                      onChange={(e) => updateLocal(tr.id, { notes: e.target.value })}
                      placeholder={t("admin.tracks.notes")}
                      style={{ flex: 1, minWidth: 0, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 9, padding: "7px 10px", color: "var(--ink)", fontSize: 12.5, outline: "none" }}
                    />
                    <label className="tb-mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-dim)", flexShrink: 0, cursor: "pointer" }}>
                      <input type="checkbox" checked={tr.is_excluded} onChange={(e) => updateLocal(tr.id, { is_excluded: e.target.checked })} />
                      {t("admin.tracks.exclude")}
                    </label>
                    <button
                      onClick={() => save(tr)}
                      disabled={!isDirty || savingId === tr.id}
                      className="tb-mono"
                      style={{
                        flexShrink: 0, padding: "7px 12px", borderRadius: 9, fontSize: 11, letterSpacing: "0.06em",
                        textTransform: "uppercase", cursor: isDirty ? "pointer" : "default",
                        background: isDirty ? "var(--accent)" : "transparent",
                        color: isDirty ? "var(--accent-ink)" : "var(--ink-dim)",
                        border: isDirty ? "none" : "1px solid var(--line)",
                        opacity: !isDirty || savingId === tr.id ? 0.6 : 1,
                      }}
                    >
                      {savedId === tr.id ? t("admin.tracks.saved") : t("admin.tracks.save")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-dim)", textAlign: "center", marginTop: 16, fontStyle: "italic" }}>
          Édite l&apos;année si Spotify s&apos;est trompé.
        </p>
      </div>
    </main>
  );
}
