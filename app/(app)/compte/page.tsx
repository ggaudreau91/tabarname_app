"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { Badge } from "@/components/ui/badge";
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

type Row = {
  pseudo: string;
  joined_at: string;
  room: RoomRow;
};

type CardRow = { room_id: string };

export default function ComptePage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { product } = useSpotifyPlayer();
  const [rows, setRows] = useState<Row[]>([]);
  const [cardsByRoom, setCardsByRoom] = useState<Record<string, number>>({});
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Stats agrégées
  const stats = useMemo(() => {
    const finished = rows.filter((r) => r.room.status === "finished");
    const won = finished.filter(
      (r) => (cardsByRoom[r.room.id] ?? 0) >= r.room.win_condition_cards,
    );
    const totalCards = Object.values(cardsByRoom).reduce((a, b) => a + b, 0);
    return {
      played: rows.length,
      won: won.length,
      cards: totalCards,
    };
  }, [rows, cardsByRoom]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
      <header>
        <h1 className="font-display text-4xl font-bold mb-2">{t("compte.title")}</h1>
        <div className="text-xs text-muted-foreground font-mono">
          {selfId ? selfId.slice(0, 8) + "…" : ""}
        </div>
      </header>

      {/* Spotify */}
      <section>
        <h2 className="font-display text-2xl mb-3">{t("compte.spotify.title")}</h2>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          {product === "premium" && (
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40">
              Premium
            </Badge>
          )}
          {product === "free" && <Badge variant="secondary">Compte gratuit</Badge>}
          {product === null && (
            <a
              href="/api/spotify/login?return_to=/compte"
              className="inline-flex items-center justify-center rounded-md bg-[#1DB954] px-4 py-2 text-sm font-medium text-black hover:bg-[#1ed760]"
            >
              {t("spotify.connect")}
            </a>
          )}
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="font-display text-2xl mb-3">{t("compte.stats.title")}</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="font-display text-4xl font-bold">{stats.played}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("compte.stats.played")}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="font-display text-4xl font-bold text-primary">
              {stats.won}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("compte.stats.won")}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="font-display text-4xl font-bold text-accent-foreground">
              {stats.cards}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("compte.stats.cards")}
            </div>
          </div>
        </div>
      </section>

      {/* Historique */}
      <section>
        <h2 className="font-display text-2xl mb-3">{t("compte.history.title")}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("compte.history.empty")}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {rows.map((r) => {
              const cards = cardsByRoom[r.room.id] ?? 0;
              const won =
                r.room.status === "finished" && cards >= r.room.win_condition_cards;
              const statusKey =
                `compte.history.status.${r.room.status}` as TranslationKey;
              return (
                <li
                  key={r.room.id}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="font-mono">{r.room.code}</span>
                      <span className="text-xs text-muted-foreground">
                        — {r.room.playlist?.name ?? "?"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(statusKey)} · {cards} cartes
                      {won && (
                        <span className="ml-1 text-primary font-medium">
                          · {t("compte.history.won")}
                        </span>
                      )}
                    </div>
                  </div>
                  {(r.room.status === "lobby" ||
                    r.room.status === "in_progress") && (
                    <Link
                      href={`/parties/${r.room.code}`}
                      className="text-xs underline"
                    >
                      Retourner
                    </Link>
                  )}
                </li>
              );
            })}
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
