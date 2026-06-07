"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { GlyphIcon } from "@/components/brand/GlyphIcon";
import { StatusPill } from "@/components/brand/StatusPill";
import { Wordmark } from "@/components/brand/Wordmark";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/fr";

type RoomRow = {
  id: string;
  code: string;
  status: "lobby" | "in_progress" | "finished" | "abandoned";
  win_condition_cards: number;
  playlist: { name: string; slug: string } | null;
  created_at: string;
};

type Row = { pseudo: string; joined_at: string; room: RoomRow };
type CardRow = { room_id: string };

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

export default function ComptePage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { product } = useSpotifyPlayer();
  const [rows, setRows] = useState<Row[]>([]);
  const [cardsByRoom, setCardsByRoom] = useState<Record<string, number>>({});
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [idCopied, setIdCopied] = useState(false);
  const [busy, setBusy] = useState<null | "disconnect" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);

  async function disconnectSpotify() {
    setBusy("disconnect");
    setDangerError(null);
    try {
      const res = await fetch("/api/spotify/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("disconnect_failed");
      window.location.reload();
    } catch {
      setDangerError("La déconnexion a échoué. Réessaie.");
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    setDangerError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error("delete_failed");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDangerError("La suppression a échoué. Réessaie ou écris-nous.");
      setBusy(null);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      setSelfId(userId);
      if (!userId) {
        setLoading(false);
        return;
      }
      const { data: memberships } = await supabase
        .from("room_players")
        .select(
          "pseudo, joined_at, room:rooms(id, code, status, win_condition_cards, created_at, playlist:curated_playlists(name, slug))",
        )
        .eq("player_id", userId)
        .order("joined_at", { ascending: false });
      const membershipRows = (memberships ?? []) as unknown as Row[];
      setRows(membershipRows);
      const roomIds = membershipRows.map((r) => r.room.id).filter(Boolean);
      if (roomIds.length > 0) {
        const { data: cards } = await supabase
          .from("timeline_cards")
          .select("room_id")
          .eq("player_id", userId)
          .in("room_id", roomIds);
        const counts: Record<string, number> = {};
        for (const c of (cards ?? []) as CardRow[]) {
          counts[c.room_id] = (counts[c.room_id] ?? 0) + 1;
        }
        setCardsByRoom(counts);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const stats = useMemo(() => {
    const finished = rows.filter((r) => r.room.status === "finished");
    const won = finished.filter((r) => (cardsByRoom[r.room.id] ?? 0) >= r.room.win_condition_cards);
    const totalCards = Object.values(cardsByRoom).reduce((a, b) => a + b, 0);
    return { played: rows.length, won: won.length, cards: totalCards };
  }, [rows, cardsByRoom]);

  const statCards = [
    { v: stats.played, l: t("compte.stats.played"), tone: "ink" as const },
    { v: stats.won, l: t("compte.stats.won"), tone: "wine" as const },
    { v: stats.cards, l: t("compte.stats.cards"), tone: "gold" as const },
  ];

  return (
    <main className="tb flex-1" style={{ minHeight: "100%", background: "var(--bg-grad)", color: "var(--ink)" }}>
      <div className="safe-top safe-bottom" style={{ padding: "12px 22px 36px" }}>
        <TopBar />

        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 44, color: "var(--ink)", letterSpacing: "-0.01em", marginTop: 22 }}>
          {t("compte.title")}
        </h1>

        {loading ? (
          <p style={{ color: "var(--ink-dim)", marginTop: 16 }}>Chargement…</p>
        ) : (
          <>
            {selfId && (
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(selfId);
                  setIdCopied(true);
                  setTimeout(() => setIdCopied(false), 1400);
                }}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", marginTop: 16, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "13px 16px", cursor: "pointer" }}
                title="Copier ton UUID"
              >
                <span className="tb-mono" style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selfId}</span>
                <span style={{ color: idCopied ? "var(--spotify)" : "var(--ink-dim)", flexShrink: 0, display: "flex" }}>
                  {idCopied ? <span className="tb-mono" style={{ fontSize: 11 }}>Copié ✓</span> : <GlyphIcon kind="copy" size={18} />}
                </span>
              </button>
            )}

            {/* spotify */}
            <h2 className="font-display" style={{ fontWeight: 700, fontSize: 28, color: "var(--ink)", marginTop: 34 }}>{t("compte.spotify.title")}</h2>
            <div className="tb-card" style={{ padding: "22px 20px", marginTop: 14, display: "flex", justifyContent: "center" }}>
              {product === "premium" && <StatusPill tone="premium">Premium</StatusPill>}
              {product === "free" && <StatusPill tone="wait">Compte gratuit</StatusPill>}
              {product === null && (
                <a href="/api/spotify/login?return_to=/compte" className="tb-btn tb-btn--spotify">
                  <GlyphIcon kind="spotify" size={18} color="#06210F" />
                  <span>{t("spotify.connect")}</span>
                </a>
              )}
            </div>

            {/* stats */}
            <h2 className="font-display" style={{ fontWeight: 700, fontSize: 28, color: "var(--ink)", marginTop: 34 }}>{t("compte.stats.title")}</h2>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {statCards.map((s, i) => (
                <div key={i} className="tb-card" style={{ flex: 1, padding: "20px 12px", textAlign: "center", background: "var(--surface-2)" }}>
                  <div className="font-display" style={{ fontWeight: 700, fontSize: 40, lineHeight: 1, color: s.tone === "wine" ? "#D9606E" : s.tone === "gold" ? "var(--accent)" : "var(--ink)" }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* parties */}
            <h2 className="font-display" style={{ fontWeight: 700, fontSize: 28, color: "var(--ink)", marginTop: 34 }}>{t("compte.history.title")}</h2>
            {rows.length === 0 ? (
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 12 }}>{t("compte.history.empty")}</p>
            ) : (
              <div className="tb-card" style={{ overflow: "hidden", padding: 0, marginTop: 14 }}>
                {rows.map((r, idx) => {
                  const cards = cardsByRoom[r.room.id] ?? 0;
                  const won = r.room.status === "finished" && cards >= r.room.win_condition_cards;
                  const statusKey = `compte.history.status.${r.room.status}` as TranslationKey;
                  return (
                    <div key={r.room.id}>
                      {idx > 0 && <div style={{ height: 1, background: "var(--line)" }} />}
                      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="tb-mono" style={{ fontSize: 15, color: "var(--ink)", fontWeight: 600 }}>{r.room.code}</span>
                            <span style={{ fontSize: 12.5, color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>— {r.room.playlist?.name ?? "?"}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 3 }}>
                            {t(statusKey)} · {cards} cartes
                            {won && <span style={{ marginLeft: 4, color: "var(--accent)", fontWeight: 600 }}>· {t("compte.history.won")}</span>}
                          </div>
                        </div>
                        {(r.room.status === "lobby" || r.room.status === "in_progress") && (
                          <Link href={`/parties/${r.room.code}`} style={{ fontSize: 13, color: "var(--accent)", flexShrink: 0 }}>Retourner →</Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Link href="/parties/nouvelle" className="tb-btn tb-btn--accent">
                <span>＋</span> Créer
              </Link>
              <Link href="/parties/rejoindre" className="tb-btn tb-btn--ghost">Rejoindre</Link>
            </div>

            {/* zone de gestion du compte */}
            <h2 className="font-display" style={{ fontWeight: 700, fontSize: 28, color: "var(--ink)", marginTop: 40 }}>Gestion du compte</h2>
            <div className="tb-card" style={{ padding: "18px 18px", marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
              {product !== null && (
                <div>
                  <button
                    onClick={disconnectSpotify}
                    disabled={busy !== null}
                    className="tb-btn tb-btn--ghost"
                    style={{ opacity: busy ? 0.6 : 1 }}
                  >
                    {busy === "disconnect" ? "Déconnexion…" : "Déconnecter Spotify"}
                  </button>
                  <p style={{ fontSize: 12.5, color: "var(--ink-dim)", marginTop: 8, lineHeight: 1.45 }}>
                    Retire le lien Spotify et supprime tes jetons. Ton compte de jeu est conservé.
                  </p>
                </div>
              )}

              <div style={{ height: 1, background: "var(--line)" }} />

              <div>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={busy !== null}
                    className="tb-btn tb-btn--ghost"
                    style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}
                  >
                    Supprimer mon compte
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
                      Cette action est <b>définitive</b> : ton compte, ton courriel et tes jetons Spotify seront effacés.
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={deleteAccount}
                        disabled={busy !== null}
                        className="tb-btn"
                        style={{ background: "var(--destructive)", color: "#fff", opacity: busy ? 0.6 : 1 }}
                      >
                        {busy === "delete" ? "Suppression…" : "Oui, supprimer définitivement"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={busy !== null}
                        className="tb-btn tb-btn--ghost"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 12.5, color: "var(--ink-dim)", marginTop: 8, lineHeight: 1.45 }}>
                  Efface ton identité de connexion et tes données personnelles.
                </p>
              </div>

              {dangerError && <p style={{ fontSize: 13, color: "var(--destructive)" }}>{dangerError}</p>}
            </div>

            {/* liens légaux */}
            <div className="tb-mono" style={{ display: "flex", gap: 14, marginTop: 22, fontSize: 12, color: "var(--ink-dim)" }}>
              <Link href="/legal/confidentialite" style={{ color: "var(--ink-dim)" }}>Confidentialité</Link>
              <Link href="/legal/conditions" style={{ color: "var(--ink-dim)" }}>Conditions</Link>
            </div>

            <Link href="/" style={{ display: "inline-block", marginTop: 22, color: "var(--accent)", fontSize: 15, textDecoration: "underline", textUnderlineOffset: 3 }}>
              ← {t("game.backHome")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
