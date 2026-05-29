"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Globe,
  Headphones,
  Play,
  Plus,
  RotateCw,
  Users,
  X,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import {
  useSpotifyPlayer,
  isLikelySdkUnsupported,
  connectSpotify,
} from "@/components/spotify/SpotifyPlayerProvider";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { MetaLabel, SpotifyBadge } from "@/components/brand/Stamp";

type Playlist = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  track_count?: number;
};

const PLAYLIST_COLORS = [
  "var(--oxblood)",
  "var(--or)",
  "var(--green-pret)",
  "var(--brun)",
];

const RANDOM_PSEUDO_PARTS = {
  adj: ["Ptit", "Gros", "Vieux", "Bibitte", "Toune", "Gros", "Ti-Cul", "Tabarn"],
  noun: ["Gars", "Mine", "Tabar", "Pit", "Frette", "Boss", "Ouain", "Boucane"],
};

function randomPseudo(): string {
  const a =
    RANDOM_PSEUDO_PARTS.adj[
      Math.floor(Math.random() * RANDOM_PSEUDO_PARTS.adj.length)
    ];
  const b =
    RANDOM_PSEUDO_PARTS.noun[
      Math.floor(Math.random() * RANDOM_PSEUDO_PARTS.noun.length)
    ];
  return `${a}${b}`;
}

export default function NewPartyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { product } = useSpotifyPlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<"online_premium" | "host_audio" | "local_pass">(
    "online_premium",
  );
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
    // Détection iOS/mobile: on garde le flag pour afficher un nudge UX, mais
    // on ne force plus host_audio — le mode Connect permet de jouer en
    // online_premium tant que l'app Spotify mobile est ouverte.
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
        .select("id, slug, name, description, cover_url")
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

  const validLocalPseudos = localPlayers
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const canSubmit = (() => {
    if (!playlistId || submitting) return false;
    if (product !== "premium") return false;
    if (mode === "local_pass") return validLocalPseudos.length >= 2;
    return pseudo.trim().length > 0;
  })();

  async function onImportPlaylist(e: React.FormEvent) {
    e.preventDefault();
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
      // Refresh: recharge la liste, sélectionne la nouvelle.
      const { data: lists } = await supabase
        .from("curated_playlists")
        .select("id, slug, name, description, cover_url")
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
      setImportSuccess(
        `✓ « ${data.playlistName} » importée — ${data.importedCount} pistes prêtes.`,
      );
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
    setLocalPlayers((prev) =>
      prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev,
    );
  }

  return (
    <main
      className="grid lg:grid-cols-[1fr_1.2fr] min-h-screen"
      style={{ background: "var(--creme)", color: "var(--brun)" }}
    >
      {/* LEFT — masthead */}
      <div
        className="relative overflow-hidden flex flex-col px-5 py-8 sm:px-10 sm:py-10 lg:px-12"
        style={{
          background: "var(--brun)",
          color: "var(--creme)",
          minHeight: "min(36vh, 360px)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)",
        }}
      >
        <div className="absolute opacity-50" style={{ top: 60, right: -160 }}>
          <VinylDisc size={420} labelColor="var(--oxblood)" />
        </div>
        <div
          className="absolute opacity-20"
          style={{ bottom: -120, left: -80 }}
        >
          <VinylDisc size={300} labelColor="var(--or)" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: 28,
                height: 28,
                background: "var(--creme)",
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: "var(--oxblood)",
                }}
              />
            </div>
            <div
              className="font-display italic font-bold"
              style={{ fontSize: 20 }}
            >
              Tabarname
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono"
            style={{
              background: "transparent",
              color: "var(--creme)",
              border: "1px solid rgba(250,246,240,0.3)",
              padding: "6px 12px",
              borderRadius: 4,
              fontSize: 12,
              letterSpacing: "0.1em",
            }}
          >
            <ArrowLeft size={12} strokeWidth={2.5} /> RETOUR
          </Link>
        </div>

        <div className="flex-1" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div
              style={{ width: 40, height: 1, background: "var(--or)" }}
            />
            <MetaLabel color="var(--or)">Étape 1 sur 1 · Côté A</MetaLabel>
          </div>
          <h1
            className="font-display font-semibold"
            style={{
              fontSize: "clamp(48px, 9vw, 96px)",
              lineHeight: 0.92,
              letterSpacing: "-0.035em",
              fontVariationSettings: '"opsz" 144',
            }}
          >
            <span className="italic">Nouvelle</span>
            <br />
            partie.
          </h1>
          <p
            className="mt-6"
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: "rgba(250,246,240,0.7)",
              maxWidth: 380,
            }}
          >
            Choisis la playlist, règle la partie, partage le code à ta gang.
            Ça prend moins de 30 secondes.
          </p>

          <div
            className="mt-9 flex gap-8 pt-6"
            style={{ borderTop: "1px solid rgba(250,246,240,0.12)" }}
          >
            <div>
              <div
                className="font-display font-bold"
                style={{
                  fontSize: 32,
                  color: "var(--or)",
                  letterSpacing: "-0.02em",
                }}
              >
                2-8
              </div>
              <div
                className="mt-0.5 font-mono"
                style={{
                  fontSize: 11,
                  color: "rgba(250,246,240,0.5)",
                  letterSpacing: "0.1em",
                }}
              >
                JOUEURS
              </div>
            </div>
            <div>
              <div
                className="font-display font-bold"
                style={{
                  fontSize: 32,
                  color: "var(--or)",
                  letterSpacing: "-0.02em",
                }}
              >
                ~30
                <span style={{ fontSize: 18 }}>min</span>
              </div>
              <div
                className="mt-0.5 font-mono"
                style={{
                  fontSize: 11,
                  color: "rgba(250,246,240,0.5)",
                  letterSpacing: "0.1em",
                }}
              >
                DURÉE MOYENNE
              </div>
            </div>
            <div>
              <div
                className="font-display font-bold"
                style={{
                  fontSize: 32,
                  color: "var(--or)",
                  letterSpacing: "-0.02em",
                }}
              >
                {winCards}
              </div>
              <div
                className="mt-0.5 font-mono"
                style={{
                  fontSize: 11,
                  color: "rgba(250,246,240,0.5)",
                  letterSpacing: "0.1em",
                }}
              >
                CARTES POUR GAGNER
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <form
        onSubmit={onSubmit}
        className="flex flex-col overflow-auto px-5 py-8 sm:px-8 sm:py-10"
      >
        {/* 01 Pseudo / Joueurs locaux */}
        {mode === "local_pass" ? (
          <div>
            <div className="flex items-baseline justify-between mb-2.5">
              <MetaLabel>
                01 · Joueurs ({validLocalPseudos.length}/{localPlayers.length})
              </MetaLabel>
              <div
                className="italic"
                style={{ fontSize: 11, color: "var(--brun-mid)" }}
              >
                2 à 8 joueurs · vous passerez l&apos;appareil
              </div>
            </div>
            <div className="space-y-2">
              {localPlayers.map((p, i) => (
                <div key={i} className="flex gap-2.5 items-stretch">
                  <div
                    className="flex items-center justify-center font-mono shrink-0"
                    style={{
                      width: 36,
                      height: 56,
                      color: "var(--brun-mid)",
                      fontSize: 12,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <PlayerAvatar
                    name={p || "?"}
                    color={
                      [
                        "var(--oxblood)",
                        "var(--or)",
                        "var(--green-pret)",
                        "var(--brun)",
                        "var(--oxblood-deep)",
                        "var(--brun-mid)",
                        "var(--or-deep)",
                        "var(--brun-2)",
                      ][i % 8]
                    }
                    size={56}
                  />
                  <input
                    value={p}
                    onChange={(e) => updateLocalPlayer(i, e.target.value)}
                    placeholder={`Joueur ${i + 1}`}
                    className="flex-1 font-display font-semibold outline-none"
                    style={{
                      padding: "14px 18px",
                      background: "var(--creme)",
                      border: "1.5px solid var(--brun)",
                      borderRadius: 8,
                      fontSize: 22,
                      color: "var(--brun)",
                      letterSpacing: "-0.01em",
                    }}
                  />
                  {localPlayers.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLocalPlayer(i)}
                      aria-label={`Retirer le joueur ${i + 1}`}
                      className="flex items-center justify-center"
                      style={{
                        padding: "0 14px",
                        background: "transparent",
                        border: "1.5px solid var(--creme-3)",
                        borderRadius: 8,
                        color: "var(--brun-mid)",
                      }}
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}
              {localPlayers.length < 8 && (
                <button
                  type="button"
                  onClick={addLocalPlayer}
                  className="w-full inline-flex items-center justify-center gap-2 font-mono font-semibold"
                  style={{
                    padding: "14px",
                    background: "var(--creme-2)",
                    border: "1.5px dashed var(--creme-3)",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "var(--brun-mid)",
                    letterSpacing: "0.1em",
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  AJOUTER UN JOUEUR
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between mb-2.5">
              <MetaLabel>01 · Ton pseudo</MetaLabel>
              <div
                className="italic"
                style={{ fontSize: 11, color: "var(--brun-mid)" }}
              >
                16 caractères max
              </div>
            </div>
            <div className="flex gap-2.5 items-stretch">
              <PlayerAvatar
                name={pseudo || "Toi"}
                color={selfId ? colorForPlayer(selfId) : "var(--oxblood)"}
                size={56}
              />
              <input
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value.slice(0, 16))}
                placeholder="ex. PtitGars"
                className="flex-1 font-display font-semibold outline-none"
                style={{
                  padding: "14px 18px",
                  background: "var(--creme)",
                  border: "1.5px solid var(--brun)",
                  borderRadius: 8,
                  fontSize: 24,
                  color: "var(--brun)",
                  letterSpacing: "-0.01em",
                }}
              />
              <button
                type="button"
                onClick={() => setPseudo(randomPseudo())}
                className="inline-flex items-center gap-1.5 font-mono font-semibold"
                style={{
                  padding: "0 18px",
                  background: "var(--creme-2)",
                  border: "1.5px solid var(--creme-3)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--brun)",
                  letterSpacing: "0.1em",
                }}
              >
                <RotateCw size={12} strokeWidth={2.5} /> RANDOM
              </button>
            </div>
          </div>
        )}

        {/* 02 Playlist */}
        <div className="mt-7">
          <div className="flex items-baseline justify-between mb-3">
            <MetaLabel>02 · Playlist</MetaLabel>
            <Link
              href="/admin/playlists"
              style={{
                fontSize: 12,
                color: "var(--oxblood)",
                fontWeight: 500,
              }}
            >
              Importer une playlist →
            </Link>
          </div>
          {playlists.length === 0 ? (
            <div
              className="rounded-md italic"
              style={{
                padding: 16,
                background: "var(--creme-2)",
                border: "1.5px dashed var(--creme-3)",
                fontSize: 14,
                color: "var(--brun-mid)",
              }}
            >
              Aucune playlist active pour l&apos;instant — importes-en une depuis
              Spotify ci-dessous.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {playlists.map((p, i) => {
                const selected = p.id === playlistId;
                const color = PLAYLIST_COLORS[i % PLAYLIST_COLORS.length];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlaylistId(p.id)}
                    className="relative flex items-center gap-3 text-left"
                    style={{
                      padding: "14px 16px",
                      background: selected
                        ? "rgba(139,35,49,0.06)"
                        : "var(--creme)",
                      border: `1.5px solid ${selected ? "var(--oxblood)" : "var(--creme-3)"}`,
                      borderRadius: 8,
                    }}
                  >
                    <div className="shrink-0">
                      <VinylDisc size={48} labelColor={color} label="LP" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-display font-semibold truncate"
                        style={{ fontSize: 16, letterSpacing: "-0.01em" }}
                      >
                        {p.name}
                      </div>
                      <div
                        className="mt-0.5 font-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--brun-mid)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {p.track_count ?? "?"} pistes
                      </div>
                    </div>
                    {selected && (
                      <div
                        className="absolute flex items-center justify-center rounded-full"
                        style={{
                          top: 10,
                          right: 10,
                          width: 18,
                          height: 18,
                          background: "var(--oxblood)",
                          color: "var(--creme)",
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Import inline d'une playlist Spotify publique */}
          <div className="mt-3">
            {!importOpen ? (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 font-mono font-semibold"
                style={{
                  padding: "12px",
                  background: "var(--creme-2)",
                  border: "1.5px dashed var(--creme-3)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--brun-mid)",
                  letterSpacing: "0.1em",
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                AJOUTER UNE PLAYLIST SPOTIFY
              </button>
            ) : (
              <div
                className="rounded-lg"
                style={{
                  padding: 14,
                  background: "var(--creme-2)",
                  border: "1.5px solid var(--creme-3)",
                }}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      color: "var(--brun-mid)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    IMPORTER DEPUIS SPOTIFY
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportOpen(false);
                      setImportError(null);
                      setImportSuccess(null);
                      setImportInput("");
                    }}
                    style={{
                      fontSize: 11,
                      color: "var(--brun-mid)",
                    }}
                  >
                    Fermer
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="Lien Spotify (open.spotify.com/playlist/...)"
                    className="flex-1 font-mono outline-none"
                    style={{
                      padding: "10px 12px",
                      background: "var(--creme)",
                      border: "1.5px solid var(--brun)",
                      borderRadius: 6,
                      fontSize: 13,
                      color: "var(--brun)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={onImportPlaylist}
                    disabled={importing || !importInput.trim() || product !== "premium"}
                    className="font-mono font-semibold rounded disabled:opacity-50"
                    style={{
                      background: "var(--brun)",
                      color: "var(--creme)",
                      padding: "10px 16px",
                      fontSize: 12,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {importing ? "IMPORT…" : "IMPORTER"}
                  </button>
                </div>
                {product !== "premium" && (
                  <p
                    className="mt-2"
                    style={{ fontSize: 11, color: "var(--brun-mid)" }}
                  >
                    Spotify Premium requis pour importer une playlist.
                  </p>
                )}
                {importError && (
                  <p
                    className="mt-2"
                    style={{ fontSize: 12, color: "var(--oxblood)" }}
                  >
                    {importError}
                  </p>
                )}
                {importSuccess && (
                  <p
                    className="mt-2"
                    style={{ fontSize: 12, color: "var(--green-pret)" }}
                  >
                    {importSuccess}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 03 Mode */}
        <div className="mt-7">
          <MetaLabel>03 · Mode de jeu</MetaLabel>
          {isMobile && mode === "online_premium" && (
            <div
              className="mt-2 rounded-md"
              style={{
                padding: "10px 14px",
                background: "rgba(212,166,86,0.12)",
                border: "1px solid var(--or)",
                fontSize: 12,
                color: "var(--brun)",
                lineHeight: 1.45,
              }}
            >
              📱 Sur iPhone, le son sortira de ton <strong>app Spotify
              mobile</strong> (Connect). Garde-la ouverte en arrière-plan
              pendant la partie.
            </div>
          )}
          <div className="mt-3 grid sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  m: "online_premium" as const,
                  Icon: Globe,
                  title: "En ligne",
                  body:
                    "Chacun joue sur son appareil. Chaque joueur a besoin de Premium.",
                },
                {
                  m: "host_audio" as const,
                  Icon: Headphones,
                  title: "Audio chez l'hôte",
                  body:
                    "Plusieurs appareils, audio sur celui de l'hôte. Un Premium suffit.",
                },
                {
                  m: "local_pass" as const,
                  Icon: Users,
                  title: "Autour d'une table",
                  body:
                    "Un seul appareil qu'on se passe. Idéal pour les apéros, party de cuisine.",
                },
              ]
            ).map(({ m, Icon, title, body }) => {
              const selected = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="relative text-left"
                  style={{
                    padding: 18,
                    background: selected
                      ? "rgba(139,35,49,0.06)"
                      : "var(--creme)",
                    border: `1.5px solid ${selected ? "var(--oxblood)" : "var(--creme-3)"}`,
                    borderRadius: 8,
                  }}
                >
                  <div
                    className="absolute rounded-full flex items-center justify-center"
                    style={{
                      top: 12,
                      right: 12,
                      width: 16,
                      height: 16,
                      background: selected ? "var(--oxblood)" : "transparent",
                      border: `1.5px solid ${selected ? "var(--oxblood)" : "var(--creme-3)"}`,
                    }}
                  >
                    {selected && (
                      <div
                        className="rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: "var(--creme)",
                        }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <Icon size={20} strokeWidth={1.75} color="var(--brun)" />
                    <div
                      className="font-display font-semibold"
                      style={{ fontSize: 18, letterSpacing: "-0.01em" }}
                    >
                      {title}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--brun-2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {body}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 04 Réglages */}
        <div className="mt-7">
          <MetaLabel>04 · Réglages</MetaLabel>
          <div className="mt-3 grid sm:grid-cols-3 gap-2.5">
            <Stepper
              label="CARTES À GAGNER"
              value={winCards}
              onChange={setWinCards}
              min={3}
              max={20}
            />
            <Stepper
              label="TEMPS PAR TOUR"
              value={turnSeconds}
              onChange={setTurnSeconds}
              min={15}
              max={120}
              step={5}
              suffix="sec"
            />
            <div
              className="rounded-lg"
              style={{
                padding: "14px 16px",
                background: "var(--creme-2)",
                border: "1px solid var(--creme-3)",
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: "var(--brun-mid)",
                  letterSpacing: "0.1em",
                }}
              >
                CONTESTATIONS
              </div>
              <div
                className="flex items-center mt-2 gap-1.5 rounded p-0.5"
                style={{ background: "var(--creme-3)" }}
              >
                <button
                  type="button"
                  onClick={() => setChallengesEnabled(true)}
                  className="flex-1 text-center font-semibold rounded transition"
                  style={{
                    padding: "6px 0",
                    background: challengesEnabled ? "var(--brun)" : "transparent",
                    color: challengesEnabled ? "var(--creme)" : "var(--brun-mid)",
                    fontSize: 13,
                  }}
                >
                  Permises
                </button>
                <button
                  type="button"
                  onClick={() => setChallengesEnabled(false)}
                  className="flex-1 text-center font-semibold rounded transition"
                  style={{
                    padding: "6px 0",
                    background: !challengesEnabled ? "var(--brun)" : "transparent",
                    color: !challengesEnabled ? "var(--creme)" : "var(--brun-mid)",
                    fontSize: 13,
                  }}
                >
                  Off
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Premium gate */}
        {product !== "premium" && (
          <div
            className="mt-6 rounded-lg"
            style={{
              padding: 16,
              border: "1.5px solid var(--or)",
              background: "rgba(212,166,86,0.08)",
            }}
          >
            <div
              className="font-display font-semibold mb-1"
              style={{ fontSize: 16 }}
            >
              {product === null
                ? "Connecte Spotify"
                : "Compte Premium requis"}
            </div>
            <p
              className="mb-3"
              style={{ fontSize: 13, color: "var(--brun-2)" }}
            >
              En tant qu&apos;hôte, c&apos;est toi qui lances la musique — un
              compte Spotify Premium est nécessaire, peu importe le mode.
            </p>
            <button
              type="button"
              onClick={() => connectSpotify("/parties/nouvelle")}
              className="inline-flex items-center justify-center rounded-md font-semibold"
              style={{
                background: "var(--green-spotify)",
                color: "var(--nuit)",
                padding: "10px 18px",
                fontSize: 13,
              }}
            >
              Se connecter avec Spotify
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm" style={{ color: "var(--oxblood)" }}>
            {error}
          </p>
        )}

        <div className="flex-1 min-h-8" />

        <div className="mt-8 flex items-center gap-4 flex-wrap">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-2.5 font-semibold rounded-md disabled:opacity-50"
            style={{
              background: "var(--oxblood)",
              color: "var(--creme)",
              padding: "18px 22px",
              fontSize: 17,
            }}
          >
            <Play size={18} fill="var(--creme)" strokeWidth={0} />
            {submitting ? "Création…" : "Créer la partie"}
          </button>
          <div
            className="flex items-center gap-2"
            style={{ fontSize: 12, color: "var(--brun-mid)" }}
          >
            <SpotifyBadge />
            <span>
              {product === "premium"
                ? "connecté · Premium ✓"
                : product === "free"
                  ? "connecté · gratuit ⚠"
                  : "non lié"}
            </span>
          </div>
        </div>
      </form>
    </main>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled,
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className="rounded-lg relative"
      style={{
        padding: "14px 16px",
        background: "var(--creme-2)",
        border: "1px solid var(--creme-3)",
        opacity: disabled ? 0.55 : 1,
      }}
      title={tooltip}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 11,
          color: "var(--brun-mid)",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={disabled || value <= min}
          className="rounded-md disabled:opacity-30"
          style={{
            width: 28,
            height: 28,
            border: "1px solid var(--brun)",
            background: "transparent",
            fontSize: 16,
          }}
        >
          −
        </button>
        <div
          className="font-display font-bold"
          style={{ fontSize: 28, letterSpacing: "-0.02em" }}
        >
          {value}
          {suffix && (
            <span
              className="font-medium ml-0.5"
              style={{ fontSize: 14, color: "var(--brun-mid)" }}
            >
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={disabled || value >= max}
          className="rounded-md disabled:opacity-30"
          style={{
            width: 28,
            height: 28,
            border: "1px solid var(--brun)",
            background: "transparent",
            fontSize: 16,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
