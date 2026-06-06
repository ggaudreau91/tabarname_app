"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import {
  useSpotifyPlayer,
  isLikelySdkUnsupported,
  connectSpotify,
} from "@/components/spotify/SpotifyPlayerProvider";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { Btn } from "@/components/brand/Btn";
import { GlyphIcon } from "@/components/brand/GlyphIcon";
import { Wordmark } from "@/components/brand/Wordmark";

type Playlist = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_user_imported: boolean;
  imported_by: string | null;
  track_count?: number;
};

const PLAYLIST_COLS = "id, slug, name, description, cover_url, is_user_imported, imported_by";

const RANDOM_PSEUDO_PARTS = {
  adj: ["Ptit", "Gros", "Vieux", "Bibitte", "Toune", "Gros", "Ti-Cul", "Tabarn"],
  noun: ["Gars", "Mine", "Tabar", "Pit", "Frette", "Boss", "Ouain", "Boucane"],
};

function randomPseudo(): string {
  const a =
    RANDOM_PSEUDO_PARTS.adj[Math.floor(Math.random() * RANDOM_PSEUDO_PARTS.adj.length)];
  const b =
    RANDOM_PSEUDO_PARTS.noun[Math.floor(Math.random() * RANDOM_PSEUDO_PARTS.noun.length)];
  return `${a}${b}`;
}

// ---- chrome ----
function TopBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0 0" }}>
      <Wordmark height={24} />
      <Link
        href="/"
        className="tb-mono"
        style={{
          fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-2)",
          border: "1px solid var(--line-strong)", borderRadius: 999, padding: "7px 13px",
          background: "transparent", whiteSpace: "nowrap",
        }}
      >
        ← Retour
      </Link>
    </div>
  );
}

function SectionLabel({
  n,
  children,
  action,
  href,
}: {
  n?: string;
  children: React.ReactNode;
  action?: string;
  href?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
      <div
        className="tb-mono"
        style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-dim)", whiteSpace: "nowrap" }}
      >
        {n && <span style={{ color: "var(--accent)" }}>{n} · </span>}
        {children}
      </div>
      {action && href && (
        <Link href={href} style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
          {action} →
        </Link>
      )}
    </div>
  );
}

function RadioCard({
  selected,
  onClick,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 13, width: "100%", textAlign: "left",
        padding: "15px 15px", borderRadius: 16, cursor: "pointer",
        background: selected ? "rgba(210,162,76,0.10)" : "var(--surface)",
        border: `1.5px solid ${selected ? "var(--accent)" : "var(--line)"}`,
        transition: "border-color .15s, background .15s",
      }}
    >
      {icon && (
        <span style={{ color: selected ? "var(--accent)" : "var(--ink-2)", marginTop: 2, flexShrink: 0, display: "flex" }}>
          {icon}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0, display: "block" }}>
        <span className="font-display" style={{ display: "block", fontWeight: 600, fontSize: 18, color: "var(--ink)", lineHeight: 1.2 }}>
          {title}
        </span>
        {body && (
          <span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--ink-2)", marginTop: 5 }}>
            {body}
          </span>
        )}
      </span>
      <span
        style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2,
          border: `2px solid ${selected ? "var(--accent)" : "var(--line-strong)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {selected && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)" }} />}
      </span>
    </button>
  );
}

function PlaylistThumb({ size = 46, color }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 10, flexShrink: 0, overflow: "hidden",
        position: "relative",
        background: "linear-gradient(135deg,#2C5C86,#15263a)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ position: "absolute", right: -size * 0.26, top: "50%", transform: "translateY(-50%)" }}>
        <VinylDisc size={size * 0.82} label="" labelColor={color ?? "var(--gold)"} />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const btn: React.CSSProperties = {
    width: 42, height: 42, borderRadius: 11, border: "1.5px solid var(--line-strong)",
    background: "transparent", color: "var(--ink)", fontSize: 22, lineHeight: 1, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };
  return (
    <div className="tb-card" style={{ padding: "14px 16px", background: "var(--surface-2)" }}>
      <div className="tb-mono" style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-dim)", marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} style={btn}>−</button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span className="font-display" style={{ fontWeight: 700, fontSize: 30, color: "var(--ink)", lineHeight: 1 }}>{value}</span>
          {unit && <span className="tb-mono" style={{ fontSize: 13, color: "var(--ink-dim)" }}>{unit}</span>}
        </div>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} style={btn}>+</button>
      </div>
    </div>
  );
}

export default function NewPartyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { product } = useSpotifyPlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<"online_premium" | "host_audio" | "local_pass">("online_premium");
  const [importInput, setImportInput] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [winCards, setWinCards] = useState(10);
  const [turnSeconds, setTurnSeconds] = useState(30);
  const [challengesEnabled, setChallengesEnabled] = useState(true);
  const [pseudo, setPseudo] = useState("");
  const [localPlayers, setLocalPlayers] = useState<string[]>(["", ""]);
  const [selfId, setSelfId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLikelySdkUnsupported()) return;
    queueMicrotask(() => setIsMobile(true));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSelfId(data.user?.id ?? "");
    });
    (async () => {
      const { data } = await supabase
        .from("curated_playlists")
        .select(PLAYLIST_COLS)
        .eq("is_active", true)
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
      if (lists.length > 0) setPlaylistId(lists[0].id);
    })();
  }, [supabase]);

  const validLocalPseudos = localPlayers.map((p) => p.trim()).filter((p) => p.length > 0);

  // Regroupement des sources: catalogue officiel Tabarname, les playlists du
  // joueur, et celles importées par d'autres joueurs.
  const playlistGroups = useMemo(() => {
    const official = playlists.filter((p) => !p.is_user_imported);
    const mine = playlists.filter((p) => p.is_user_imported && p.imported_by === selfId);
    const community = playlists.filter((p) => p.is_user_imported && p.imported_by !== selfId);
    return [
      { key: "official", title: "Catalogue officiel Tabarname", items: official },
      { key: "mine", title: "Mes playlists", items: mine },
      { key: "community", title: "Importées par d'autres", items: community },
    ].filter((g) => g.items.length > 0);
  }, [playlists, selfId]);

  const canSubmit = (() => {
    if (!playlistId || submitting) return false;
    if (product !== "premium") return false;
    if (mode === "local_pass") return validLocalPseudos.length >= 2;
    return pseudo.trim().length > 0;
  })();

  async function onImportPlaylist(e?: React.FormEvent) {
    e?.preventDefault();
    if (!importInput.trim()) return;
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const res = await fetch("/api/playlists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: importInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === "premium_required"
            ? "Spotify Premium requis pour importer."
            : data.error === "no_spotify_link"
              ? "Connecte ton compte Spotify d'abord."
              : data.error === "quota_reached"
                ? data.detail ?? "Trop de playlists importées."
                : data.error === "playlist_not_found"
                  ? "Playlist introuvable ou privée."
                  : data.detail ?? data.error ?? "Import échoué.";
        throw new Error(msg);
      }
      const { data: lists } = await supabase
        .from("curated_playlists")
        .select(PLAYLIST_COLS)
        .eq("is_active", true)
        .order("name");
      const enriched = (lists ?? []) as Playlist[];
      const counts = await Promise.all(
        enriched.map(async (pl) => {
          const { count } = await supabase
            .from("curated_tracks")
            .select("id", { count: "exact", head: true })
            .eq("playlist_id", pl.id);
          return { id: pl.id, count: count ?? 0 };
        }),
      );
      const map = new Map(counts.map((c) => [c.id, c.count]));
      setPlaylists(enriched.map((p) => ({ ...p, track_count: map.get(p.id) ?? 0 })));
      setPlaylistId(data.playlistRowId);
      setImportSuccess(`✓ « ${data.playlistName} » importée — ${data.importedCount} pistes prêtes.`);
      setImportInput("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "erreur");
    } finally {
      setImporting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playlistId) return;
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "local_pass"
          ? {
              mode,
              playlist_id: playlistId,
              win_condition_cards: winCards,
              turn_seconds: turnSeconds,
              local_players: validLocalPseudos,
            }
          : {
              mode,
              playlist_id: playlistId,
              win_condition_cards: winCards,
              turn_seconds: turnSeconds,
              challenges_enabled: challengesEnabled,
              pseudo: pseudo.trim(),
              has_premium: product === "premium",
            };
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "create_failed");
      router.push(`/parties/${data.room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erreur");
      setSubmitting(false);
    }
  }

  function updateLocalPlayer(index: number, value: string) {
    setLocalPlayers((prev) => {
      const next = [...prev];
      next[index] = value.slice(0, 24);
      return next;
    });
  }
  function addLocalPlayer() {
    setLocalPlayers((prev) => (prev.length < 8 ? [...prev, ""] : prev));
  }
  function removeLocalPlayer(i: number) {
    setLocalPlayers((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const localAvaColors = ["var(--ava-1-bg)", "var(--gold)", "var(--ava-3-bg)", "var(--ava-4-bg)", "#3A4E6E", "#2E5A4A", "#5A3E5C", "#2C6E6A"];

  return (
    <main className="tb flex-1" style={{ minHeight: "100%", background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>
      {/* hero */}
      <div className="safe-top" style={{ background: "var(--hero-bg)", color: "var(--hero-ink)", padding: "16px 22px 26px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -80, top: -30, opacity: 0.4, pointerEvents: "none" }}>
          <VinylDisc size={230} spinning />
        </div>
        <div style={{ position: "relative" }}>
          <TopBar />
          <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", margin: "20px 0 10px" }}>
            Étape 1 sur 1 · Côté A
          </div>
          <h1 className="font-display italic" style={{ fontWeight: 700, fontSize: 44, lineHeight: 0.98, letterSpacing: "-0.02em", color: "var(--hero-ink)" }}>
            Nouvelle
            <br />
            partie.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--panel-dim)", marginTop: 14, maxWidth: 320 }}>
            Choisis la playlist, règle la partie, partage le code à ta gang. Ça prend moins de 30 secondes.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 22, borderTop: "1px solid var(--panel-line)", paddingTop: 20 }}>
            {([["2-8", "Joueurs"], ["~30", "Min. moyenne"], [String(winCards), "Cartes pour gagner"]] as const).map(([v, l], i) => (
              <div key={i} style={{ flex: 1 }}>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 28, color: "var(--accent)", lineHeight: 1 }}>{v}</div>
                <div className="tb-mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--panel-dim)", marginTop: 7, lineHeight: 1.3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* body */}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ padding: "2px 22px 0" }}>
          {/* 01 pseudo / local players */}
          {mode === "local_pass" ? (
            <>
              <SectionLabel n="01">Joueurs ({validLocalPseudos.length}/{localPlayers.length})</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {localPlayers.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <PlayerAvatar name={p || "?"} color={localAvaColors[i % localAvaColors.length]} size={48} />
                    <input
                      value={p}
                      onChange={(e) => updateLocalPlayer(i, e.target.value)}
                      placeholder={`Joueur ${i + 1}`}
                      className="tb-input"
                      style={{ flex: 1 }}
                    />
                    {localPlayers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLocalPlayer(i)}
                        aria-label={`Retirer le joueur ${i + 1}`}
                        style={{
                          width: 42, height: 42, flexShrink: 0, borderRadius: 11,
                          border: "1.5px solid var(--line-strong)", background: "transparent",
                          color: "var(--ink-dim)", cursor: "pointer", fontSize: 16,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {localPlayers.length < 8 && (
                  <button
                    type="button"
                    onClick={addLocalPlayer}
                    className="tb-mono"
                    style={{
                      width: "100%", padding: 14, borderRadius: 14, border: "1.5px dashed var(--line-strong)",
                      background: "transparent", color: "var(--ink-2)", fontSize: 12, letterSpacing: "0.08em",
                      textTransform: "uppercase", cursor: "pointer",
                    }}
                  >
                    + Ajouter un joueur
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <SectionLabel n="01">
                Ton pseudo{" "}
                <span style={{ color: "var(--ink-dim)", fontStyle: "italic", textTransform: "none", letterSpacing: 0, fontFamily: "var(--ff-body)" }}>
                  · 16 max
                </span>
              </SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PlayerAvatar name={pseudo || "Toi"} color={selfId ? colorForPlayer(selfId) : "var(--ava-1-bg)"} size={52} />
                <input
                  value={pseudo}
                  maxLength={16}
                  onChange={(e) => setPseudo(e.target.value.slice(0, 16))}
                  placeholder="ex. PtitGars"
                  className="tb-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setPseudo(randomPseudo())}
                  className="tb-mono"
                  aria-label="Pseudo aléatoire"
                  style={{
                    flexShrink: 0, height: 52, padding: "0 14px", borderRadius: 12,
                    border: "1.5px solid var(--line-strong)", background: "transparent",
                    color: "var(--ink-2)", fontSize: 12, letterSpacing: "0.08em", cursor: "pointer",
                  }}
                >
                  ↻
                </button>
              </div>
            </>
          )}

          {/* 02 playlist */}
          <SectionLabel n="02" action="Importer une playlist" href="/admin/playlists">Playlist</SectionLabel>
          {playlists.length === 0 ? (
            <div
              className="font-display italic"
              style={{ padding: 16, borderRadius: 14, background: "var(--surface-2)", border: "1.5px dashed var(--line-strong)", fontSize: 14, color: "var(--ink-dim)" }}
            >
              Aucune playlist active — importes-en une depuis Spotify ci-dessous.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {playlistGroups.map((group) => (
                <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {playlistGroups.length > 1 && (
                    <div
                      className="tb-mono"
                      style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-dim)" }}
                    >
                      {group.title}
                    </div>
                  )}
                  {group.items.map((p) => (
                    <RadioCard
                      key={p.id}
                      selected={p.id === playlistId}
                      onClick={() => setPlaylistId(p.id)}
                      icon={<PlaylistThumb />}
                      title={p.name}
                      body={`${p.track_count ?? "?"} pistes`}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* import inline */}
          <div style={{ marginTop: 10 }}>
            {!importOpen ? (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="tb-mono"
                style={{
                  width: "100%", padding: 14, borderRadius: 14, border: "1.5px dashed var(--line-strong)",
                  background: "transparent", color: "var(--ink-2)", fontSize: 12, letterSpacing: "0.08em",
                  textTransform: "uppercase", cursor: "pointer",
                }}
              >
                + Ajouter une playlist Spotify
              </button>
            ) : (
              <div className="tb-card" style={{ padding: 14, background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
                    Importer depuis Spotify
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportOpen(false);
                      setImportError(null);
                      setImportSuccess(null);
                      setImportInput("");
                    }}
                    style={{ fontSize: 11, color: "var(--ink-dim)", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    Fermer
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="open.spotify.com/playlist/…"
                    className="tb-mono"
                    style={{
                      flex: 1, minWidth: 0, padding: "11px 12px", borderRadius: 10,
                      background: "var(--surface)", border: "1.5px solid var(--line-strong)",
                      color: "var(--ink)", fontSize: 13, outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={onImportPlaylist}
                    disabled={importing || !importInput.trim() || product !== "premium"}
                    className="tb-btn tb-btn--wine"
                    style={{ padding: "11px 16px", fontSize: 13, borderRadius: 10, opacity: importing || !importInput.trim() || product !== "premium" ? 0.5 : 1 }}
                  >
                    {importing ? "Import…" : "Importer"}
                  </button>
                </div>
                {product !== "premium" && (
                  <p style={{ marginTop: 8, fontSize: 11, color: "var(--ink-dim)" }}>Spotify Premium requis pour importer une playlist.</p>
                )}
                {importError && <p style={{ marginTop: 8, fontSize: 12, color: "var(--destructive)" }}>{importError}</p>}
                {importSuccess && <p style={{ marginTop: 8, fontSize: 12, color: "var(--spotify)" }}>{importSuccess}</p>}
              </div>
            )}
          </div>

          {/* 03 mode */}
          <SectionLabel n="03">Mode de jeu</SectionLabel>
          {isMobile && mode === "online_premium" && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 14, background: "rgba(210,162,76,0.12)", border: "1px solid var(--line)", marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginTop: 6, flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink-2)" }}>
                Sur iPhone, le son sort de ton <b style={{ color: "var(--ink)" }}>app Spotify</b> (Connect). Garde-la ouverte en arrière-plan pendant la partie.
              </p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={mode === "online_premium"}
              onClick={() => setMode("online_premium")}
              icon={<GlyphIcon kind="globe" />}
              title="En ligne"
              body="Chacun joue sur son appareil. Chaque joueur a besoin de Premium."
            />
            <RadioCard
              selected={mode === "host_audio"}
              onClick={() => setMode("host_audio")}
              icon={<GlyphIcon kind="headphones" />}
              title="Audio chez l'hôte"
              body="Plusieurs appareils, audio sur celui de l'hôte. Un Premium suffit."
            />
            <RadioCard
              selected={mode === "local_pass"}
              onClick={() => setMode("local_pass")}
              icon={<GlyphIcon kind="table" />}
              title="Autour d'une table"
              body="Un seul appareil qu'on se passe. Idéal pour les apéros, party de cuisine."
            />
          </div>

          {/* 04 réglages */}
          <SectionLabel n="04">Réglages</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Stepper label="Cartes à gagner" value={winCards} onChange={setWinCards} min={3} max={20} />
            <Stepper label="Temps par tour" value={turnSeconds} onChange={setTurnSeconds} min={15} max={120} step={5} unit="sec" />
            {mode !== "local_pass" && (
              <div className="tb-card" style={{ padding: "14px 16px", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div className="tb-mono" style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-dim)" }}>Contestations</div>
                <div className="tb-seg">
                  <button type="button" aria-pressed={challengesEnabled} onClick={() => setChallengesEnabled(true)}>Permises</button>
                  <button type="button" aria-pressed={!challengesEnabled} onClick={() => setChallengesEnabled(false)}>Off</button>
                </div>
              </div>
            )}
          </div>

          {/* connect spotify / premium gate */}
          {product !== "premium" && (
            <div className="tb-card" style={{ padding: "18px 18px", marginTop: 18, border: "1.5px solid rgba(29,185,84,0.4)", background: "rgba(29,185,84,0.07)" }}>
              <div className="font-display" style={{ fontWeight: 600, fontSize: 19, color: "var(--ink)" }}>
                {product === null ? "Connecte Spotify" : "Compte Premium requis"}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)", margin: "6px 0 14px" }}>
                En tant qu&apos;hôte, c&apos;est toi qui lances la musique — un compte Premium est nécessaire, peu importe le mode.
              </p>
              <Btn kind="spotify" icon={<GlyphIcon kind="spotify" size={18} color="#06210F" />} onClick={() => connectSpotify("/parties/nouvelle")}>
                Se connecter avec Spotify
              </Btn>
            </div>
          )}

          {error && <p style={{ marginTop: 16, fontSize: 14, color: "var(--destructive)" }}>{error}</p>}
        </div>

        <div style={{ flex: 1, minHeight: 8 }} />

        {/* sticky footer */}
        <div
          className="safe-bottom"
          style={{ position: "sticky", bottom: 0, marginTop: 22, padding: "14px 22px 18px", background: "linear-gradient(to top, var(--bg) 70%, transparent)", display: "flex", alignItems: "center", gap: 14 }}
        >
          <button type="submit" disabled={!canSubmit} className="tb-btn tb-btn--accent" style={{ flex: 1 }}>
            <span style={{ display: "inline-flex", fontSize: "0.9em" }}>▶</span>
            <span>{submitting ? "Création…" : "Créer la partie"}</span>
          </button>
          <div className="tb-mono" style={{ fontSize: 10.5, color: "var(--ink-dim)", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <GlyphIcon kind="spotify" size={16} color="var(--spotify)" />{" "}
            {product === "premium" ? "Premium ✓" : product === "free" ? "gratuit ⚠" : "non lié"}
          </div>
        </div>
      </form>
    </main>
  );
}
