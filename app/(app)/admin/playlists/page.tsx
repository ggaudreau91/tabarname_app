"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { StatusPill } from "@/components/brand/StatusPill";
import { Wordmark } from "@/components/brand/Wordmark";
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

function TopBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0 0" }}>
      <Wordmark height={24} />
      <Link href="/" className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-2)", border: "1px solid var(--line-strong)", borderRadius: 999, padding: "7px 13px", whiteSpace: "nowrap" }}>
        ← Retour
      </Link>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1.5px solid var(--line-strong)",
  borderRadius: 12,
  padding: "13px 14px",
  color: "var(--ink)",
  fontSize: 15,
  outline: "none",
  fontFamily: "var(--ff-body)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--ff-body)",
  fontWeight: 600,
  fontSize: 14,
  color: "var(--ink)",
  marginBottom: 8,
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
        body: JSON.stringify({ input, slug: slug || undefined, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "import_failed");
      setMessage(`✓ ${data.importedCount} pistes importées sur ${data.totalAvailable}.`);
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
    <main className="tb flex-1" style={{ minHeight: "100%", background: "var(--bg-grad)", color: "var(--ink)" }}>
      <div className="safe-top safe-bottom" style={{ padding: "12px 22px 36px" }}>
        <TopBar />

        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 44, color: "var(--ink)", letterSpacing: "-0.01em", marginTop: 22 }}>{t("admin.title")}</h1>
        <p style={{ fontSize: 14.5, color: "var(--ink-2)", marginTop: 8 }}>{t("admin.subtitle")}</p>

        {/* import card */}
        <form onSubmit={onImport} className="tb-card" style={{ padding: "22px 20px", marginTop: 22 }}>
          <h2 className="font-display" style={{ fontWeight: 700, fontSize: 26, color: "var(--ink)", lineHeight: 1.1, marginBottom: 18 }}>{t("admin.import.title")}</h2>

          <label htmlFor="input" style={labelStyle}>{t("admin.import.idLabel")}</label>
          <input id="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("admin.import.idPlaceholder")} required style={fieldStyle} />

          <label htmlFor="slug" style={{ ...labelStyle, margin: "16px 0 8px" }}>
            {t("admin.import.slugLabel")} <span style={{ color: "var(--ink-dim)", fontWeight: 400 }}>(optionnel)</span>
          </label>
          <input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder={t("admin.import.slugPlaceholder")} style={fieldStyle} />

          <label htmlFor="name" style={{ ...labelStyle, margin: "16px 0 8px" }}>{t("admin.import.nameLabel")}</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />

          <div style={{ marginTop: 18 }}>
            <button type="submit" disabled={submitting} className="tb-btn tb-btn--wine">
              {submitting ? t("admin.import.submitting") : t("admin.import.submit")}
            </button>
          </div>
          {message && <p style={{ marginTop: 12, fontSize: 13, color: "var(--spotify)" }}>{message}</p>}
          {error && <p style={{ marginTop: 12, fontSize: 13, color: "var(--destructive)" }}>{error}</p>}
        </form>

        {/* existing */}
        <h2 className="font-display" style={{ fontWeight: 700, fontSize: 28, color: "var(--ink)", margin: "34px 0 14px" }}>{t("admin.list.title")}</h2>
        {playlists.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--ink-dim)" }}>{t("admin.list.empty")}</p>
        ) : (
          <div className="tb-card" style={{ overflow: "hidden", padding: 0 }}>
            {playlists.map((p, idx) => (
              <div key={p.id}>
                {idx > 0 && <div style={{ height: 1, background: "var(--line)" }} />}
                <div style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span className="font-display" style={{ fontWeight: 600, fontSize: 20, color: "var(--ink)", lineHeight: 1.15 }}>{p.name}</span>
                      {p.is_active ? <StatusPill tone="ready">{t("admin.list.active")}</StatusPill> : <StatusPill tone="wait">{t("admin.list.inactive")}</StatusPill>}
                    </div>
                    <div className="tb-mono" style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 7, wordBreak: "break-all" }}>
                      {p.slug} · {p.track_count} {t("admin.list.tracks")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleActive(p)} className="tb-btn tb-btn--ghost" style={{ padding: "10px 16px", fontSize: 13, borderRadius: 11 }}>
                      {t("admin.list.toggle")}
                    </button>
                    <Link href={`/admin/playlists/${p.id}`} className="tb-btn tb-btn--wine" style={{ padding: "10px 18px", fontSize: 13, borderRadius: 11 }}>
                      {t("admin.list.edit")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/" style={{ display: "inline-block", marginTop: 30, color: "var(--accent)", fontSize: 15, textDecoration: "underline", textUnderlineOffset: 3 }}>
          ← {t("game.backHome")}
        </Link>
      </div>
    </main>
  );
}
