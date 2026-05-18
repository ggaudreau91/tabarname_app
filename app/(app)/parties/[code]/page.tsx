"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { subscribeToRoom } from "@/lib/realtime/room";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { RoomLobby } from "@/components/lobby/RoomLobby";
import type { LobbyPlayer } from "@/components/lobby/PlayerList";
import { GameTopBar } from "@/components/game/GameTopBar";
import { MysteryCard } from "@/components/game/MysteryCard";
import { AudioPanel } from "@/components/game/AudioPanel";
import { TimelineRail } from "@/components/game/TimelineRail";
import { OthersStrip } from "@/components/game/OthersStrip";
import { RevealOverlay } from "@/components/game/RevealOverlay";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { MetaLabel } from "@/components/brand/Stamp";
import { YearCard } from "@/components/brand/YearCard";
import type { TimelineCard, TurnOutcome, TurnPhase } from "@/types/game";

const CHALLENGE_WINDOW_SECONDS = 10;
const TURN_PLAYING_HINT_SECONDS = 30;

type Room = {
  id: string;
  code: string;
  host_player_id: string;
  status: "lobby" | "in_progress" | "finished" | "abandoned";
  mode: "online_premium" | "host_audio";
  current_turn_id: string | null;
  win_condition_cards: number;
  playlist_id: string;
};

type Playlist = {
  id: string;
  name: string;
  slug: string;
  track_count?: number;
};

type TurnPublic = {
  id: string;
  room_id: string;
  turn_number: number;
  active_player_id: string;
  phase: TurnPhase;
  phase_changed_at: string;
  guess_position: number | null;
  outcome: TurnOutcome | null;
  spotify_uri: string | null;
  track_id: string | null;
  title: string | null;
  artists: string | null;
  cover_url: string | null;
  effective_year: number | null;
};

type TimelineRow = {
  player_id: string;
  track_id: string;
  effective_year: number;
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const { code } = use(params);
  const upperCode = code.toUpperCase();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { product, isReady, deviceId, playUri } = useSpotifyPlayer();

  const [selfId, setSelfId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [turn, setTurn] = useState<TurnPublic | null>(null);
  const [timelineRows, setTimelineRows] = useState<TimelineRow[]>([]);
  const [challenges, setChallenges] = useState<
    Array<{ challenger_id: string; proposed_position: number }>
  >([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [challengeMode, setChallengeMode] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const playedUriRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null));
  }, [supabase]);

  const fetchRoom = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select(
        "id, code, host_player_id, status, mode, current_turn_id, win_condition_cards, playlist_id",
      )
      .eq("code", upperCode)
      .maybeSingle<Room>();
    setRoom(data);
    return data;
  }, [supabase, upperCode]);

  const fetchPlaylist = useCallback(
    async (playlistId: string) => {
      const { data: pl } = await supabase
        .from("curated_playlists")
        .select("id, name, slug")
        .eq("id", playlistId)
        .maybeSingle<Playlist>();
      if (pl) {
        const { count } = await supabase
          .from("curated_tracks")
          .select("id", { count: "exact", head: true })
          .eq("playlist_id", playlistId);
        setPlaylist({ ...pl, track_count: count ?? 0 });
      } else {
        setPlaylist(null);
      }
    },
    [supabase],
  );

  const fetchPlayers = useCallback(
    async (roomId: string) => {
      const { data } = await supabase
        .from("room_players")
        .select("player_id, pseudo, has_premium, is_connected, turn_order")
        .eq("room_id", roomId)
        .order("turn_order", { ascending: true });
      setPlayers((data ?? []) as LobbyPlayer[]);
    },
    [supabase],
  );

  const fetchTurn = useCallback(
    async (turnId: string | null) => {
      if (!turnId) {
        setTurn(null);
        return;
      }
      const { data } = await supabase
        .from("turns_public")
        .select("*")
        .eq("id", turnId)
        .maybeSingle<TurnPublic>();
      setTurn(data);
    },
    [supabase],
  );

  const fetchTimelines = useCallback(
    async (roomId: string) => {
      const { data } = await supabase
        .from("timeline_cards")
        .select("player_id, track_id, effective_year")
        .eq("room_id", roomId)
        .order("effective_year", { ascending: true });
      setTimelineRows((data ?? []) as TimelineRow[]);
    },
    [supabase],
  );

  const fetchChallenges = useCallback(
    async (turnId: string | null) => {
      if (!turnId) {
        setChallenges([]);
        return;
      }
      const { data } = await supabase
        .from("challenges")
        .select("challenger_id, proposed_position")
        .eq("turn_id", turnId);
      setChallenges(data ?? []);
    },
    [supabase],
  );

  useEffect(() => {
    let channel: ReturnType<typeof subscribeToRoom> | null = null;

    (async () => {
      const r = await fetchRoom();
      setInitialLoadDone(true);
      if (!r) return;
      await Promise.all([
        fetchPlaylist(r.playlist_id),
        fetchPlayers(r.id),
        fetchTimelines(r.id),
        fetchTurn(r.current_turn_id),
        fetchChallenges(r.current_turn_id),
      ]);

      channel = subscribeToRoom(supabase, r.id, {
        onRoomChange: async () => {
          const updated = await fetchRoom();
          if (updated) await fetchTurn(updated.current_turn_id);
        },
        onPlayersChange: () => fetchPlayers(r.id),
        onTimelineChange: () => fetchTimelines(r.id),
        onChallengeChange: () =>
          fetchChallenges(r.current_turn_id ?? room?.current_turn_id ?? null),
        onGameEvent: async () => {
          const updated = await fetchRoom();
          if (updated) {
            await fetchTurn(updated.current_turn_id);
            await fetchChallenges(updated.current_turn_id);
          }
        },
      });
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [
    supabase,
    fetchRoom,
    fetchPlaylist,
    fetchPlayers,
    fetchTimelines,
    fetchTurn,
    fetchChallenges,
    room?.current_turn_id,
  ]);

  // Lecture Spotify automatique
  useEffect(() => {
    if (!turn || !turn.spotify_uri) return;
    if (turn.phase !== "turn_playing" && turn.phase !== "guess_window") return;
    if (!isReady || !deviceId) return;
    if (playedUriRef.current === turn.spotify_uri) return;

    if (room?.mode === "host_audio" && selfId !== room.host_player_id) {
      playedUriRef.current = turn.spotify_uri;
      return;
    }
    if (product !== "premium") return;

    playedUriRef.current = turn.spotify_uri;
    playUri(turn.spotify_uri).catch((e) => setError(String(e)));
  }, [turn, isReady, deviceId, product, room, selfId, playUri]);

  const isHost = !!(room && selfId && room.host_player_id === selfId);
  const activePlayer = useMemo(
    () => players.find((p) => p.player_id === turn?.active_player_id) ?? null,
    [players, turn],
  );
  const isActive = !!(turn && selfId && turn.active_player_id === selfId);

  const ownTimeline: TimelineCard[] = useMemo(() => {
    if (!selfId) return [];
    return timelineRows
      .filter((r) => r.player_id === selfId)
      .map((r) => ({ trackId: r.track_id, year: r.effective_year }));
  }, [timelineRows, selfId]);

  const cardCountByPlayer = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of timelineRows) {
      m.set(r.player_id, (m.get(r.player_id) ?? 0) + 1);
    }
    return m;
  }, [timelineRows]);

  const leader = useMemo(() => {
    let best: { id: string; count: number } | null = null;
    for (const [id, count] of cardCountByPlayer.entries()) {
      if (!best || count > best.count) best = { id, count };
    }
    return best;
  }, [cardCountByPlayer]);
  const leaderLabel = leader
    ? players.find((p) => p.player_id === leader.id)?.pseudo ?? null
    : null;

  const hasChallenged = !!(
    selfId && challenges.some((c) => c.challenger_id === selfId)
  );

  async function callApi(path: string, body?: unknown): Promise<unknown> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "api_error");
    return data;
  }

  async function startGame() {
    if (!room) return;
    setSubmittingAction("start");
    setError(null);
    try {
      await callApi(`/api/parties/${room.code}/start`);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmittingAction(null);
    }
  }

  async function submitGuess() {
    if (!turn || selectedSlot === null) return;
    setSubmittingAction("guess");
    setError(null);
    try {
      await callApi(`/api/parties/${upperCode}/guess`, {
        turn_id: turn.id,
        position: selectedSlot,
      });
      setSelectedSlot(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmittingAction(null);
    }
  }

  async function submitChallenge() {
    if (!turn || selectedSlot === null) return;
    setSubmittingAction("challenge");
    setError(null);
    try {
      await callApi(`/api/parties/${upperCode}/challenge`, {
        turn_id: turn.id,
        position: selectedSlot,
      });
      setSelectedSlot(null);
      setChallengeMode(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmittingAction(null);
    }
  }

  async function resolveAndAdvance() {
    if (!turn) return;
    setSubmittingAction("resolve");
    setError(null);
    try {
      await callApi(`/api/parties/${upperCode}/resolve`, { turn_id: turn.id });
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmittingAction(null);
    }
  }

  async function nextTurn() {
    setSubmittingAction("next");
    setError(null);
    try {
      await callApi(`/api/parties/${upperCode}/next`);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmittingAction(null);
    }
  }

  async function leave() {
    setSubmittingAction("leave");
    try {
      await callApi(`/api/parties/${upperCode}/leave`);
      router.push("/");
    } catch (e) {
      setError(String(e));
      setSubmittingAction(null);
    }
  }

  async function copyToClipboard(kind: "code" | "link") {
    const value =
      kind === "code"
        ? upperCode
        : `${window.location.origin}/parties/${upperCode}`;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  // Auto-resolve quand challenge expire
  useEffect(() => {
    if (!turn || turn.phase !== "challenge_window") return;
    const startedAt = new Date(turn.phase_changed_at).getTime();
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = Math.max(0, CHALLENGE_WINDOW_SECONDS - elapsed);
    const id = setTimeout(() => {
      resolveAndAdvance();
    }, remaining * 1000 + 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn?.id, turn?.phase]);

  // ----- RENDERS -----

  if (!room) {
    if (!initialLoadDone) {
      return (
        <main className="flex min-h-[60vh] items-center justify-center">
          <p style={{ color: "var(--brun-mid)" }}>Chargement…</p>
        </main>
      );
    }
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center text-center"
        style={{ background: "var(--creme)", color: "var(--brun)", padding: 24 }}
      >
        <div className="max-w-md w-full space-y-4">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 48, letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            <span className="italic">Salle</span> introuvable
          </h1>
          <p style={{ color: "var(--brun-mid)" }}>
            Le code{" "}
            <code
              className="font-mono"
              style={{
                background: "var(--creme-2)",
                padding: "2px 8px",
                borderRadius: 3,
              }}
            >
              {upperCode}
            </code>{" "}
            ne correspond à aucune salle active. Vérifie l&apos;orthographe
            avec ton hôte.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => router.push("/parties/rejoindre")}
              className="inline-flex items-center justify-center font-semibold rounded-md"
              style={{
                background: "var(--oxblood)",
                color: "var(--creme)",
                padding: "12px 24px",
              }}
            >
              Entrer un autre code
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center font-semibold rounded-md"
              style={{
                background: "transparent",
                color: "var(--brun)",
                padding: "12px 24px",
                border: "1.5px solid var(--brun)",
              }}
            >
              Accueil
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!selfId || !players.some((p) => p.player_id === selfId)) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "var(--creme)", color: "var(--brun)", padding: 24 }}
      >
        <div className="max-w-md w-full text-center space-y-5">
          <div
            className="font-mono"
            style={{
              fontSize: 11,
              color: "var(--brun-mid)",
              letterSpacing: "0.18em",
            }}
          >
            INVITATION
          </div>
          <h1
            className="font-display font-semibold"
            style={{
              fontSize: 56,
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
            }}
          >
            <span className="italic">Bienvenue</span> dans la salle
          </h1>
          <div
            className="font-display font-bold"
            style={{
              fontSize: 64,
              letterSpacing: "0.04em",
              color: "var(--oxblood)",
              fontVariationSettings: '"opsz" 144',
            }}
          >
            {upperCode.slice(0, 3)}·{upperCode.slice(3)}
          </div>
          {players.length > 0 && (
            <p style={{ color: "var(--brun-mid)" }}>
              {players.length} joueur{players.length > 1 ? "s" : ""} déjà{" "}
              {players.length > 1 ? "présents" : "présent"}. Choisis un pseudo
              pour rejoindre.
            </p>
          )}
          <button
            onClick={() => router.push(`/parties/rejoindre?code=${upperCode}`)}
            className="inline-flex items-center gap-2 font-semibold rounded-md"
            style={{
              background: "var(--oxblood)",
              color: "var(--creme)",
              padding: "16px 32px",
              fontSize: 17,
            }}
          >
            <span>→</span> Rejoindre la salle
          </button>
        </div>
      </main>
    );
  }

  // GAME OVER
  if (room.status === "finished") {
    const winner = players.find(
      (p) => (cardCountByPlayer.get(p.player_id) ?? 0) >= room.win_condition_cards,
    );
    return (
      <main className="min-h-screen flex flex-col bg-creme">
        <div
          className="relative overflow-hidden"
          style={{ background: "var(--brun)", color: "var(--creme)", padding: "60px 24px" }}
        >
          <div className="absolute opacity-20" style={{ top: -100, left: -80 }}>
            <VinylDisc size={360} labelColor="var(--or)" />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <MetaLabel color="var(--or)">Partie terminée</MetaLabel>
            <h1
              className="font-display font-semibold mt-3"
              style={{
                fontSize: "clamp(48px, 8vw, 88px)",
                letterSpacing: "-0.03em",
                lineHeight: 0.95,
              }}
            >
              🏆 <span className="italic">{winner?.pseudo ?? "—"}</span> gagne
            </h1>
          </div>
        </div>

        <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
          <MetaLabel>Timelines finales</MetaLabel>
          <div className="mt-4 space-y-6">
            {players.map((p) => {
              const cards = timelineRows
                .filter((r) => r.player_id === p.player_id)
                .map((r) => ({ trackId: r.track_id, year: r.effective_year }));
              return (
                <div key={p.player_id}>
                  <div className="font-display font-semibold mb-2" style={{ fontSize: 22 }}>
                    {p.pseudo}{" "}
                    <span className="text-muted-foreground text-sm">
                      ({cards.length} cartes)
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {cards.map((c) => (
                      <YearCard key={c.trackId} year={c.year} size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-12 flex gap-3">
            <button
              onClick={() => router.push("/parties/nouvelle")}
              className="inline-flex items-center justify-center rounded-md font-semibold"
              style={{
                background: "var(--oxblood)",
                color: "var(--creme)",
                padding: "12px 24px",
              }}
            >
              Rejouer
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-md font-semibold"
              style={{
                background: "transparent",
                color: "var(--brun)",
                padding: "12px 24px",
                border: "1.5px solid var(--brun)",
              }}
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </main>
    );
  }

  // LOBBY
  if (room.status === "lobby") {
    return (
      <RoomLobby
        code={room.code}
        hostId={room.host_player_id}
        selfId={selfId}
        players={players}
        playlistName={playlist?.name}
        playlistTrackCount={playlist?.track_count}
        mode={room.mode}
        winConditionCards={room.win_condition_cards}
        isHost={isHost}
        canStart={players.length >= 2}
        starting={submittingAction === "start"}
        onStart={startGame}
        onLeave={leave}
        onCopyCode={() => copyToClipboard("code")}
        onCopyLink={() => copyToClipboard("link")}
        copied={copied}
      />
    );
  }

  // EN JEU
  const showReveal = turn && (turn.phase === "reveal" || turn.phase === "resolved");
  const stripPlayers = players
    .filter((p) => p.player_id !== selfId)
    .map((p) => ({
      player_id: p.player_id,
      pseudo: p.pseudo,
      cards: cardCountByPlayer.get(p.player_id) ?? 0,
      isLeader: leader?.id === p.player_id,
      isHost: room.host_player_id === p.player_id,
    }));

  return (
    <main className="min-h-screen flex flex-col bg-creme">
      <GameTopBar
        code={room.code}
        turnNumber={turn?.turn_number ?? 0}
        leaderLabel={leaderLabel}
        leaderCards={leader?.count}
      />

      <div className="flex-1 px-6 sm:px-10 py-8 max-w-7xl mx-auto w-full flex flex-col gap-7">
        {turn && (
          <div className="grid lg:grid-cols-[300px_1fr] gap-8 items-stretch">
            <MysteryCard isYouActive={isActive} />
            {activePlayer && (
              <AudioPanel
                activePseudo={activePlayer.pseudo}
                activePlayerId={activePlayer.player_id}
                isYouActive={isActive}
                phaseChangedAt={turn.phase_changed_at}
                durationSeconds={
                  turn.phase === "challenge_window"
                    ? CHALLENGE_WINDOW_SECONDS
                    : TURN_PLAYING_HINT_SECONDS
                }
                phaseLabel={
                  turn.phase === "turn_playing"
                    ? "place ta carte"
                    : turn.phase === "challenge_window"
                      ? "fenêtre de contestation"
                      : "tour en cours"
                }
              />
            )}
          </div>
        )}

        <TimelineRail
          cards={ownTimeline}
          totalToWin={room.win_condition_cards}
          onChooseSlot={
            (isActive && turn?.phase === "turn_playing") ||
            (challengeMode && turn?.phase === "challenge_window")
              ? setSelectedSlot
              : undefined
          }
          selectedSlot={selectedSlot}
        />

        {isActive && turn?.phase === "turn_playing" && (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm" style={{ color: "var(--brun-mid)" }}>
              {selectedSlot !== null
                ? "Zone choisie · prêt à confirmer"
                : "Choisis l'emplacement de la carte dans ta timeline."}
            </div>
            <button
              onClick={submitGuess}
              disabled={selectedSlot === null || submittingAction === "guess"}
              className="inline-flex items-center gap-2 font-semibold rounded-md disabled:opacity-50"
              style={{
                background: "var(--oxblood)",
                color: "var(--creme)",
                padding: "12px 22px",
                fontSize: 15,
              }}
            >
              <span>↓</span> Confirmer le placement
            </button>
          </div>
        )}

        {challengeMode && turn?.phase === "challenge_window" && (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm" style={{ color: "var(--brun-mid)" }}>
              {selectedSlot !== null
                ? "Position de contestation prête."
                : "Choisis la position où TU placerais la carte."}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setChallengeMode(false);
                  setSelectedSlot(null);
                }}
                style={{
                  background: "transparent",
                  color: "var(--brun)",
                  padding: "12px 18px",
                  fontSize: 14,
                }}
              >
                Annuler
              </button>
              <button
                onClick={submitChallenge}
                disabled={
                  selectedSlot === null || submittingAction === "challenge"
                }
                className="inline-flex items-center gap-2 font-semibold rounded-md disabled:opacity-50"
                style={{
                  background: "var(--oxblood)",
                  color: "var(--creme)",
                  padding: "12px 22px",
                  fontSize: 15,
                }}
              >
                ⚑ Contester
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: "var(--oxblood)" }}>
            {error}
          </p>
        )}
      </div>

      <OthersStrip
        players={stripPlayers}
        totalToWin={room.win_condition_cards}
        canChallenge={!!turn && turn.phase === "challenge_window" && !isActive}
        hasChallenged={hasChallenged}
        onChallenge={() => setChallengeMode(true)}
      />

      {showReveal && turn?.effective_year && turn.title && turn.artists && (
        <RevealOverlay
          turnNumber={turn.turn_number}
          year={turn.effective_year}
          title={turn.title}
          artists={turn.artists}
          outcome={turn.outcome ?? "all_wrong"}
          winnerLabel={
            turn.outcome === "active_correct"
              ? activePlayer?.pseudo ?? null
              : turn.outcome === "challenger_correct"
                ? players.find((p) =>
                    challenges.find((c) => c.challenger_id === p.player_id),
                  )?.pseudo ?? null
                : null
          }
          isYouWinner={
            (turn.outcome === "active_correct" && isActive) ||
            (turn.outcome === "challenger_correct" && hasChallenged)
          }
          canAdvance={isHost}
          onAdvance={nextTurn}
        />
      )}
    </main>
  );
}
