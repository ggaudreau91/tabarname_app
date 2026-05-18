"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { MetaLabel } from "@/components/brand/Stamp";

const CODE_LENGTH = 6;
const ALLOWED = /^[A-Z0-9]$/;

type RecentRoom = {
  code: string;
  host: string | null;
  players: number;
  when: string;
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return `il y a ${Math.floor(diff / (7 * 86400))} sem.`;
}

export default function JoinPartyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { product } = useSpotifyPlayer();
  const search = useSearchParams();

  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [focusIndex, setFocusIndex] = useState(0);
  const [pseudo, setPseudo] = useState("");
  const [selfId, setSelfId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentRoom[]>([]);
  const [foundRoom, setFoundRoom] = useState<{
    code: string;
    host: string | null;
    players: number;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSelfId(data.user?.id ?? "");
    });
  }, [supabase]);

  // Pré-remplir depuis ?code= si on arrive du landing
  useEffect(() => {
    const fromQuery = (search.get("code") ?? "")
      .toUpperCase()
      .slice(0, CODE_LENGTH);
    if (!fromQuery) return;
    queueMicrotask(() => {
      const next = Array(CODE_LENGTH).fill("");
      for (let i = 0; i < fromQuery.length; i++) next[i] = fromQuery[i];
      setChars(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recents
  useEffect(() => {
    if (!selfId) return;
    (async () => {
      const { data } = await supabase
        .from("room_players")
        .select(
          "joined_at, room:rooms(code, host_player_id, created_at)",
        )
        .eq("player_id", selfId)
        .order("joined_at", { ascending: false })
        .limit(3);
      type RawRow = {
        joined_at: string;
        room: { code: string; host_player_id: string; created_at: string } | null;
      };
      const rows = (data ?? []) as unknown as RawRow[];
      const codes = rows.map((r) => r.room?.code).filter(Boolean) as string[];
      if (codes.length === 0) return setRecents([]);

      const { data: playersData } = await supabase
        .from("room_players")
        .select("room_id, pseudo, room:rooms(code, host_player_id)")
        .in(
          "room_id",
          rows.map((r) => r.room?.code ? null : null).filter((x) => x !== null),
        );
      // Simpler: re-fetch by code
      const enriched: RecentRoom[] = await Promise.all(
        rows.slice(0, 3).map(async (r): Promise<RecentRoom | null> => {
          if (!r.room) return null;
          const { data: roomPlayers } = await supabase
            .from("room_players")
            .select("pseudo, player_id")
            .eq("room_id", playersData?.[0]?.room_id ?? "")
            .limit(0);
          void roomPlayers;
          // Use simpler enrichment — just count players + find host pseudo
          const { count } = await supabase
            .from("room_players")
            .select("id", { count: "exact", head: true })
            .eq("room_id", r.room.code);
          const { data: hostRow } = await supabase
            .from("room_players")
            .select("pseudo, player_id, room:rooms!inner(code)")
            .eq("room.code", r.room.code)
            .eq("player_id", r.room.host_player_id)
            .maybeSingle();
          const hostInfo = hostRow as unknown as { pseudo: string } | null;
          return {
            code: r.room.code,
            host: hostInfo?.pseudo ?? null,
            players: count ?? 0,
            when: timeAgo(new Date(r.joined_at)),
          };
        }),
      ).then((arr) => arr.filter(Boolean) as RecentRoom[]);
      setRecents(enriched);
    })();
  }, [supabase, selfId]);

  // Recherche live de la salle quand le code est complet
  useEffect(() => {
    const code = chars.join("");
    if (code.length !== CODE_LENGTH) {
      queueMicrotask(() => setFoundRoom(null));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSearching(true);
    });
    (async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("code, host_player_id, status")
        .eq("code", code)
        .maybeSingle<{ code: string; host_player_id: string; status: string }>();
      if (cancelled) return;
      if (!room) {
        setFoundRoom(null);
        setSearching(false);
        return;
      }
      const { data: hostMembership } = await supabase
        .from("room_players")
        .select("pseudo, room:rooms!inner(code)")
        .eq("player_id", room.host_player_id)
        .eq("room.code", code)
        .maybeSingle();
      const hostPseudo = (hostMembership as unknown as { pseudo: string } | null)
        ?.pseudo;
      const { count } = await supabase
        .from("room_players")
        .select("player_id", { count: "exact", head: true })
        .eq("room_id", room.code);
      if (cancelled) return;
      setFoundRoom({
        code: room.code,
        host: hostPseudo ?? null,
        players: count ?? 0,
      });
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [chars, supabase]);

  function setChar(i: number, raw: string) {
    const upper = raw.toUpperCase();
    const valid = upper.split("").filter((c) => ALLOWED.test(c));
    if (valid.length === 0 && raw !== "") return;
    setChars((prev) => {
      const next = [...prev];
      let cursor = i;
      for (const c of valid) {
        if (cursor >= CODE_LENGTH) break;
        next[cursor] = c;
        cursor++;
      }
      // si l'utilisateur a typé plusieurs char (paste), avance le focus
      const target = Math.min(cursor, CODE_LENGTH - 1);
      setFocusIndex(target);
      inputRefs.current[target]?.focus();
      return next;
    });
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      setChars((prev) => {
        const next = [...prev];
        if (next[i]) {
          next[i] = "";
        } else if (i > 0) {
          next[i - 1] = "";
          setFocusIndex(i - 1);
          inputRefs.current[i - 1]?.focus();
        }
        return next;
      });
    } else if (e.key === "ArrowLeft" && i > 0) {
      setFocusIndex(i - 1);
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      setFocusIndex(i + 1);
      inputRefs.current[i + 1]?.focus();
    } else if (e.key === "Enter") {
      void onSubmit();
    }
  }

  const code = chars.join("");
  const canSubmit =
    code.length === CODE_LENGTH &&
    pseudo.trim().length > 0 &&
    !submitting &&
    !!foundRoom;

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/parties/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          has_premium: product === "premium",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "join_failed");
      router.push(`/parties/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erreur");
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: "var(--creme)", color: "var(--brun)" }}
    >
      {/* TOP NAV */}
      <div
        className="flex items-center justify-between px-6 sm:px-14 py-5"
        style={{ borderBottom: "1px solid var(--creme-3)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 28,
              height: 28,
              background: "var(--brun)",
            }}
          >
            <div
              className="rounded-full"
              style={{ width: 10, height: 10, background: "var(--oxblood)" }}
            />
            <div
              className="absolute rounded-full"
              style={{ width: 3, height: 3, background: "var(--creme)" }}
            />
          </div>
          <div
            className="font-display italic font-bold"
            style={{ fontSize: 18 }}
          >
            Tabarname
          </div>
        </div>
        <Link
          href="/"
          className="font-mono"
          style={{
            background: "transparent",
            color: "var(--brun)",
            border: "1px solid var(--brun)",
            padding: "6px 12px",
            borderRadius: 4,
            fontSize: 12,
            letterSpacing: "0.1em",
          }}
        >
          ← RETOUR
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] flex-1">
        {/* LEFT HERO */}
        <section
          className="relative overflow-hidden flex flex-col"
          style={{ padding: "48px 32px" }}
        >
          {/* Decorative ↪ */}
          <div
            className="font-display italic font-bold pointer-events-none select-none absolute"
            style={{
              top: 24,
              right: -20,
              fontSize: 360,
              color: "var(--creme-2)",
              lineHeight: 0.8,
              fontVariationSettings: '"opsz" 144',
            }}
          >
            ↪
          </div>

          <form onSubmit={onSubmit} className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 40, height: 1, background: "var(--brun)" }} />
              <MetaLabel>On t&apos;a invité?</MetaLabel>
            </div>
            <h1
              className="font-display font-semibold"
              style={{
                fontSize: "clamp(56px, 8vw, 88px)",
                lineHeight: 0.92,
                letterSpacing: "-0.035em",
                fontVariationSettings: '"opsz" 144',
              }}
            >
              <span className="italic">Rentre</span>
              <br />
              le code.
            </h1>
            <p
              className="mt-5"
              style={{
                fontSize: 17,
                lineHeight: 1.55,
                color: "var(--brun-2)",
                maxWidth: 480,
              }}
            >
              L&apos;hôte t&apos;a partagé un code à 6 caractères? Tape-le ici
              pour entrer dans la salle. Tu peux aussi cliquer le lien{" "}
              <span
                className="font-mono"
                style={{
                  background: "var(--creme-2)",
                  padding: "2px 6px",
                  borderRadius: 3,
                  fontSize: 14,
                }}
              >
                tabarname.app/j/···
              </span>
              .
            </p>

            {/* Code entry */}
            <div className="mt-10">
              <MetaLabel>Code de la salle</MetaLabel>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                  <div key={`g-${i}`} className="flex items-center">
                    <input
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      value={chars[i]}
                      onChange={(e) => setChar(i, e.target.value)}
                      onKeyDown={(e) => onKeyDown(i, e)}
                      onFocus={() => setFocusIndex(i)}
                      maxLength={CODE_LENGTH}
                      autoComplete="off"
                      autoCapitalize="characters"
                      inputMode="text"
                      className="font-display font-bold text-center outline-none"
                      style={{
                        width: 56,
                        height: 76,
                        background: "var(--creme)",
                        border: `2px solid ${focusIndex === i ? "var(--oxblood)" : "var(--brun)"}`,
                        borderRadius: 8,
                        fontSize: 48,
                        color: "var(--brun)",
                        letterSpacing: "-0.02em",
                        fontVariationSettings: '"opsz" 144',
                      }}
                    />
                    {i === 2 && (
                      <div
                        className="self-center mx-1.5"
                        style={{
                          width: 16,
                          height: 4,
                          background: "var(--brun)",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div
                className="mt-3.5 flex items-center gap-2 text-sm"
                style={{ color: "var(--brun-mid)" }}
              >
                {searching && code.length === CODE_LENGTH && (
                  <span className="italic">Recherche…</span>
                )}
                {!searching && foundRoom && (
                  <>
                    <span
                      className="inline-flex items-center justify-center rounded-full font-bold"
                      style={{
                        width: 16,
                        height: 16,
                        background: "var(--green-spotify)",
                        color: "var(--creme)",
                        fontSize: 10,
                      }}
                    >
                      ✓
                    </span>
                    Salle trouvée
                    {foundRoom.host && (
                      <>
                        {" "}— <span style={{ fontWeight: 600, color: "var(--brun)" }}>{foundRoom.host}</span>{" "}
                        attend
                      </>
                    )}
                  </>
                )}
                {!searching &&
                  code.length === CODE_LENGTH &&
                  !foundRoom && (
                    <span style={{ color: "var(--oxblood)" }}>
                      Aucune salle avec ce code.
                    </span>
                  )}
              </div>
            </div>

            {/* Pseudo */}
            <div className="mt-8">
              <MetaLabel>Ton pseudo</MetaLabel>
              <div className="mt-2.5 flex gap-2.5 items-stretch" style={{ maxWidth: 520 }}>
                <PlayerAvatar
                  name={pseudo || "Toi"}
                  color={selfId ? colorForPlayer(selfId) : "var(--oxblood-deep)"}
                  size={56}
                />
                <input
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value.slice(0, 16))}
                  placeholder="ex. PtitGars, Bibitte, GrosseMine…"
                  className="flex-1 font-display font-medium outline-none"
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
              </div>
            </div>

            {error && (
              <p
                className="mt-4 text-sm"
                style={{ color: "var(--oxblood)" }}
              >
                {error}
              </p>
            )}

            <div className="mt-8 flex items-center gap-3.5 flex-wrap">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 font-semibold rounded-md disabled:opacity-50"
                style={{
                  background: "var(--oxblood)",
                  color: "var(--creme)",
                  padding: "18px 32px",
                  fontSize: 17,
                }}
              >
                <span>→</span>
                {submitting ? "Connexion…" : "Rejoindre la salle"}
              </button>
              <div
                className="font-mono"
                style={{
                  fontSize: 12,
                  color: "var(--brun-mid)",
                  letterSpacing: "0.1em",
                }}
              >
                OU APPUIE SUR{" "}
                <span style={{ color: "var(--oxblood)", fontWeight: 700 }}>
                  ↵ ENTRÉE
                </span>
              </div>
            </div>
          </form>
        </section>

        {/* RIGHT SIDEBAR */}
        <aside
          className="flex flex-col"
          style={{
            background: "var(--creme-2)",
            borderLeft: "1px solid var(--creme-3)",
            padding: "48px 32px",
          }}
        >
          {/* Recents */}
          <MetaLabel>Salles récentes</MetaLabel>
          {recents.length === 0 ? (
            <div
              className="mt-3.5 italic text-sm"
              style={{ color: "var(--brun-mid)" }}
            >
              Aucun historique pour l&apos;instant.
            </div>
          ) : (
            <div className="mt-3.5 flex flex-col gap-2">
              {recents.map((r, i) => (
                <button
                  key={`${r.code}-${i}`}
                  type="button"
                  onClick={() => {
                    const next = Array(CODE_LENGTH).fill("");
                    for (let j = 0; j < r.code.length; j++) next[j] = r.code[j];
                    setChars(next);
                  }}
                  className="flex items-center gap-3.5 text-left"
                  style={{
                    padding: "12px 14px",
                    background: "var(--creme)",
                    border: "1px solid var(--creme-3)",
                    borderRadius: 8,
                  }}
                >
                  <div
                    className="font-display font-bold"
                    style={{
                      fontSize: 22,
                      letterSpacing: "0.04em",
                      color: "var(--brun)",
                      minWidth: 100,
                    }}
                  >
                    {r.code.slice(0, 3)}·{r.code.slice(3)}
                  </div>
                  <div className="flex-1">
                    {r.host ? (
                      <div
                        className="font-medium"
                        style={{ fontSize: 13, color: "var(--brun)" }}
                      >
                        Salle de{" "}
                        <span style={{ fontWeight: 700 }}>{r.host}</span>
                      </div>
                    ) : (
                      <div
                        className="font-medium italic"
                        style={{ fontSize: 13, color: "var(--brun-mid)" }}
                      >
                        Salle
                      </div>
                    )}
                    <div
                      className="mt-0.5 font-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--brun-mid)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {r.players} JOUEUR{r.players > 1 ? "S" : ""} · {r.when}
                    </div>
                  </div>
                  <span style={{ color: "var(--brun-mid)", fontSize: 18 }}>
                    ↗
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Vinyl divider */}
          <div className="mt-9 flex items-center gap-3.5">
            <div className="flex-1 h-px" style={{ background: "var(--creme-3)" }} />
            <div className="shrink-0">
              <VinylDisc size={32} labelColor="var(--oxblood)" label="" />
            </div>
            <div className="flex-1 h-px" style={{ background: "var(--creme-3)" }} />
          </div>

          {/* Create CTA */}
          <div
            className="relative overflow-hidden mt-7"
            style={{
              background: "var(--brun)",
              color: "var(--creme)",
              padding: 24,
              borderRadius: 10,
            }}
          >
            <div className="absolute opacity-20" style={{ top: -40, right: -40 }}>
              <VinylDisc size={160} labelColor="var(--or)" />
            </div>
            <div className="relative z-10">
              <MetaLabel color="var(--or)">Pas d&apos;invite?</MetaLabel>
              <div
                className="font-display font-semibold mt-1.5"
                style={{
                  fontSize: 28,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                <span className="italic">Crée</span> ta propre partie.
              </div>
              <div
                className="mt-1.5"
                style={{
                  fontSize: 13,
                  color: "rgba(250,246,240,0.65)",
                  lineHeight: 1.5,
                }}
              >
                Choisis une playlist et invite ta gang en 30 secondes.
              </div>
              <Link
                href="/parties/nouvelle"
                className="inline-flex mt-4 font-semibold rounded-md"
                style={{
                  background: "var(--or)",
                  color: "var(--brun)",
                  padding: "10px 18px",
                  fontSize: 14,
                }}
              >
                ＋ Nouvelle partie
              </Link>
            </div>
          </div>

          <div className="flex-1 min-h-6" />

          <div
            className="mt-6 font-mono text-center"
            style={{
              fontSize: 11,
              color: "var(--brun-mid)",
              letterSpacing: "0.12em",
            }}
          >
            EN MODE EN LIGNE · COMPTE SPOTIFY PREMIUM REQUIS
          </div>
        </aside>
      </div>
    </main>
  );
}
