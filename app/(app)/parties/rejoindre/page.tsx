"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { Kicker } from "@/components/brand/Kicker";
import { Btn } from "@/components/brand/Btn";
import { Wordmark } from "@/components/brand/Wordmark";

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

function TopBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0 0" }}>
      <Wordmark height={24} />
      <Link
        href="/"
        className="tb-mono"
        style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-2)", border: "1px solid var(--line-strong)", borderRadius: 999, padding: "7px 13px", background: "transparent", whiteSpace: "nowrap" }}
      >
        ← Retour
      </Link>
    </div>
  );
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
  const [foundRoom, setFoundRoom] = useState<{ code: string; host: string | null; players: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSelfId(data.user?.id ?? "");
    });
  }, [supabase]);

  // Pré-remplir depuis ?code=
  useEffect(() => {
    const fromQuery = (search.get("code") ?? "").toUpperCase().slice(0, CODE_LENGTH);
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
        .select("joined_at, room:rooms(code, host_player_id, created_at)")
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

      const enriched: RecentRoom[] = await Promise.all(
        rows.slice(0, 3).map(async (r): Promise<RecentRoom | null> => {
          if (!r.room) return null;
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

  // Recherche live
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
      try {
        const res = await fetch(`/api/parties/${code}`);
        if (cancelled) return;
        if (res.status === 404) {
          setFoundRoom(null);
          setSearching(false);
          return;
        }
        if (!res.ok) throw new Error(`lookup_${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setFoundRoom({ code: data.code, host: data.host_pseudo ?? null, players: data.players_count ?? 0 });
      } catch {
        if (!cancelled) setFoundRoom(null);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chars]);

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
  const canSubmit = code.length === CODE_LENGTH && pseudo.trim().length > 0 && !submitting && !!foundRoom;

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/parties/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudo.trim(), has_premium: product === "premium" }),
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
    <main className="tb flex-1" style={{ minHeight: "100%", background: "var(--bg-grad)", color: "var(--ink)" }}>
      <div className="safe-top" style={{ padding: "16px 22px 36px" }}>
        <TopBar />

        <div style={{ position: "relative", marginTop: 26 }}>
          <Kicker rule style={{ marginBottom: 12 }}>On t&apos;a invité?</Kicker>
          <h1 className="font-display italic" style={{ fontWeight: 700, fontSize: 52, lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Rentre
            <br />
            le code.
          </h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 16, maxWidth: 330 }}>
            L&apos;hôte t&apos;a partagé un code à 6 caractères? Tape-le ici pour entrer dans la salle. Tu peux aussi cliquer le lien{" "}
            <span className="tb-mono" style={{ fontSize: 12.5, background: "var(--surface-2)", borderRadius: 5, padding: "1px 6px", color: "var(--ink)", wordBreak: "break-all" }}>
              tabarname.app/j/…
            </span>
          </p>
        </div>

        {/* code boxes */}
        <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-dim)", margin: "28px 0 12px" }}>
          Code de la salle
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {chars.map((c, i) => (
            <span key={i} style={{ display: "contents" }}>
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                value={c}
                onChange={(e) => setChar(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={() => setFocusIndex(i)}
                maxLength={CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                inputMode="text"
                aria-label={`Caractère ${i + 1} du code`}
                className="tb-codebox"
                style={{ flex: 1, minWidth: 0, borderColor: focusIndex === i ? "var(--accent)" : undefined }}
              />
              {i === 2 && <span style={{ color: "var(--ink-dim)", fontSize: 24, flexShrink: 0 }}>–</span>}
            </span>
          ))}
        </div>

        {/* status */}
        <div style={{ marginTop: 12, minHeight: 20, fontSize: 13, color: "var(--ink-dim)", display: "flex", alignItems: "center", gap: 8 }}>
          {searching && code.length === CODE_LENGTH && <span style={{ fontStyle: "italic" }}>Recherche…</span>}
          {!searching && foundRoom && (
            <>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--spotify)", color: "#06210F", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</span>
              Salle trouvée
              {foundRoom.host && (
                <>
                  {" "}— <span style={{ fontWeight: 600, color: "var(--ink)" }}>{foundRoom.host}</span> attend
                </>
              )}
            </>
          )}
          {!searching && code.length === CODE_LENGTH && !foundRoom && (
            <span style={{ color: "var(--destructive)" }}>Aucune salle avec ce code.</span>
          )}
        </div>

        {/* pseudo */}
        <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-dim)", margin: "20px 0 12px" }}>
          Ton pseudo
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PlayerAvatar name={pseudo || "Toi"} color={selfId ? colorForPlayer(selfId) : "var(--ava-1-bg)"} size={52} />
          <input
            value={pseudo}
            maxLength={16}
            onChange={(e) => setPseudo(e.target.value.slice(0, 16))}
            placeholder="ex. PtitGars, Bibitte…"
            className="tb-input"
            style={{ flex: 1 }}
          />
        </div>

        {error && <p style={{ marginTop: 14, fontSize: 14, color: "var(--destructive)" }}>{error}</p>}

        <div style={{ marginTop: 18 }}>
          <Btn kind="accent" block disabled={!canSubmit} icon={<span>→</span>} onClick={() => void onSubmit()}>
            {submitting ? "Connexion…" : "Rejoindre la salle"}
          </Btn>
        </div>
        <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-dim)", marginTop: 14 }}>
          ou appuie sur <span style={{ color: "var(--accent)" }}>↵ Entrée</span>
        </div>
      </div>

      {/* recents + promo */}
      <div className="safe-bottom" style={{ background: "var(--surface-2)", padding: "26px 22px 30px" }}>
        <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-dim)", marginBottom: 10 }}>
          Salles récentes
        </div>
        {recents.length === 0 ? (
          <p className="font-display italic" style={{ fontSize: 16, color: "var(--ink-dim)" }}>Aucun historique pour l&apos;instant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recents.map((r, i) => (
              <button
                key={`${r.code}-${i}`}
                type="button"
                onClick={() => {
                  const next = Array(CODE_LENGTH).fill("");
                  for (let j = 0; j < r.code.length; j++) next[j] = r.code[j];
                  setChars(next);
                }}
                className="tb-card"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textAlign: "left", cursor: "pointer" }}
              >
                <div className="font-display" style={{ fontWeight: 700, fontSize: 20, letterSpacing: "0.04em", color: "var(--ink)", minWidth: 92 }}>
                  {r.code.slice(0, 3)}·{r.code.slice(3)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: r.host ? "var(--ink)" : "var(--ink-dim)", fontStyle: r.host ? "normal" : "italic" }}>
                    {r.host ? <>Salle de <span style={{ fontWeight: 700 }}>{r.host}</span></> : "Salle"}
                  </div>
                  <div className="tb-mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
                    {r.players} JOUEUR{r.players > 1 ? "S" : ""} · {r.when}
                  </div>
                </div>
                <span style={{ color: "var(--ink-dim)", fontSize: 16, flexShrink: 0 }}>↗</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <VinylDisc size={34} label="" />
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        <div style={{ background: "var(--hero-bg)", borderRadius: 18, padding: "22px 22px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -50, top: -30, opacity: 0.35, pointerEvents: "none" }}>
            <VinylDisc size={150} />
          </div>
          <div style={{ position: "relative" }}>
            <div className="tb-mono" style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Pas d&apos;invite?</div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 26, color: "var(--hero-ink)", lineHeight: 1.05 }}>
              <span style={{ fontStyle: "italic" }}>Crée</span> ta propre partie.
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--panel-dim)", margin: "8px 0 16px", maxWidth: 280 }}>
              Choisis une playlist et invite ta gang en 30 secondes.
            </p>
            <Link href="/parties/nouvelle" className="tb-btn tb-btn--accent">
              <span style={{ display: "inline-flex", fontSize: "0.9em" }}>＋</span>
              <span>Nouvelle partie</span>
            </Link>
          </div>
        </div>

        <div className="tb-mono" style={{ textAlign: "center", fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-dim)", marginTop: 22, lineHeight: 1.5 }}>
          En mode en ligne · Compte Spotify Premium requis
        </div>
      </div>
    </main>
  );
}
