"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { subscribeToRoom } from "@/lib/realtime/room";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { PlayerList, type LobbyPlayer } from "@/components/lobby/PlayerList";
import { Timeline } from "@/components/game/Timeline";
import { NowPlaying } from "@/components/game/NowPlaying";
import { ChallengeBar } from "@/components/game/ChallengeBar";
import { RevealOverlay } from "@/components/game/RevealOverlay";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
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
  // Visible seulement à reveal/resolved:
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

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { code } = use(params);
  const upperCode = code.toUpperCase();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { product, isReady, deviceId, playUri } = useSpotifyPlayer();

  const [selfId, setSelfId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [turn, setTurn] = useState<TurnPublic | null>(null);
  const [timelineRows, setTimelineRows] = useState<TimelineRow[]>([]);
  const [challenges, setChallenges] = useState<Array<{ challenger_id: string; proposed_position: number }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [challengeMode, setChallengeMode] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playedUriRef = useRef<string | null>(null);

  // 1. Identité courante
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null));
  }, [supabase]);

  // 2. Helpers de fetch
  const fetchRoom = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("id, code, host_player_id, status, mode, current_turn_id, win_condition_cards")
      .eq("code", upperCode)
      .maybeSingle<Room>();
    setRoom(data);
    return data;
  }, [supabase, upperCode]);

  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("room_players")
      .select("player_id, pseudo, has_premium, is_connected, turn_order")
      .eq("room_id", roomId)
      .order("turn_order", { ascending: true });
    setPlayers((data ?? []) as LobbyPlayer[]);
  }, [supabase]);

  const fetchTurn = useCallback(async (turnId: string | null) => {
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
  }, [supabase]);

  const fetchTimelines = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("timeline_cards")
      .select("player_id, track_id, effective_year")
      .eq("room_id", roomId)
      .order("effective_year", { ascending: true });
    setTimelineRows((data ?? []) as TimelineRow[]);
  }, [supabase]);

  const fetchChallenges = useCallback(async (turnId: string | null) => {
    if (!turnId) {
      setChallenges([]);
      return;
    }
    const { data } = await supabase
      .from("challenges")
      .select("challenger_id, proposed_position")
      .eq("turn_id", turnId);
    setChallenges(data ?? []);
  }, [supabase]);

  // 3. Initial load + subscription
  useEffect(() => {
    let channel: ReturnType<typeof subscribeToRoom> | null = null;

    (async () => {
      const r = await fetchRoom();
      if (!r) return;
      await Promise.all([
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
          // À chaque event, on rafraîchit l'état du tour courant (phase, outcome)
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
    fetchPlayers,
    fetchTimelines,
    fetchTurn,
    fetchChallenges,
    room?.current_turn_id,
  ]);

  // 4. Lecture Spotify quand un nouveau tour entre en turn_playing
  useEffect(() => {
    if (!turn || !turn.spotify_uri) return;
    if (turn.phase !== "turn_playing" && turn.phase !== "guess_window") return;
    if (!isReady || !deviceId) return;
    if (playedUriRef.current === turn.spotify_uri) return;

    // En mode host_audio, seul l'hôte lit
    if (room?.mode === "host_audio" && selfId !== room.host_player_id) {
      playedUriRef.current = turn.spotify_uri;
      return;
    }
    if (product !== "premium") return;

    playedUriRef.current = turn.spotify_uri;
    playUri(turn.spotify_uri).catch((e) => setError(String(e)));
  }, [turn, isReady, deviceId, product, room, selfId, playUri]);

  // 5. Dérivés
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

  const timelinesByPlayer = useMemo(() => {
    const map = new Map<string, TimelineCard[]>();
    for (const r of timelineRows) {
      const list = map.get(r.player_id) ?? [];
      list.push({ trackId: r.track_id, year: r.effective_year });
      map.set(r.player_id, list);
    }
    return map;
  }, [timelineRows]);

  const hasChallenged = !!(selfId && challenges.some((c) => c.challenger_id === selfId));

  // 6. Actions
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

  // Auto-resolve quand la fenêtre de challenge expire (toujours via setTimeout
  // pour éviter setState synchrone dans l'effet)
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
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (!selfId || !players.some((p) => p.player_id === selfId)) {
    return (
      <main className="max-w-md mx-auto px-6 py-12 space-y-4">
        <p>Tu n&apos;es pas encore dans cette salle.</p>
        <Button onClick={() => router.push(`/parties/rejoindre`)}>Rejoindre</Button>
      </main>
    );
  }

  // GAME OVER
  if (room.status === "finished") {
    const winner = players.find((p) => {
      const cards = timelinesByPlayer.get(p.player_id) ?? [];
      return cards.length >= room.win_condition_cards;
    });
    return (
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold">🏆 {t("game.winner")} {winner?.pseudo ?? "—"}</h1>
        <div className="space-y-4">
          {players.map((p) => (
            <Timeline
              key={p.player_id}
              cards={timelinesByPlayer.get(p.player_id) ?? []}
              playerLabel={p.pseudo}
              size="sm"
            />
          ))}
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push("/parties/nouvelle")}>{t("game.playAgain")}</Button>
          <Button variant="outline" onClick={() => router.push("/")}>{t("game.backHome")}</Button>
        </div>
      </main>
    );
  }

  // LOBBY
  if (room.status === "lobby") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{t("lobby.title")}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("lobby.code")}</span>
            <code className="font-mono text-base tracking-widest font-bold">{room.code}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              {t("lobby.copy")}
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">{t("lobby.players")} ({players.length})</div>
          <PlayerList players={players} hostId={room.host_player_id} selfId={selfId} />
        </div>

        {isHost ? (
          <Button
            onClick={startGame}
            disabled={players.length < 2 || submittingAction === "start"}
            className="w-full sm:w-auto"
          >
            {t("lobby.start")} {players.length < 2 && "(min. 2 joueurs)"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t("lobby.waitingHost")}</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </main>
    );
  }

  // EN JEU
  const showReveal = turn && (turn.phase === "reveal" || turn.phase === "resolved");

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-muted-foreground">
            {t("game.turn")} {turn?.turn_number ?? "—"}
          </div>
          <div className="text-sm">
            {t("game.activeIs")}{" "}
            <span className="font-medium">{activePlayer?.pseudo ?? "—"}</span>
            {isActive && (
              <span className="ml-2 text-primary font-medium">— {t("game.yourTurn")}</span>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <code className="font-mono">{room.code}</code>
        </div>
      </div>

      {turn?.phase === "turn_playing" && (
        <NowPlaying
          phaseChangedAt={turn.phase_changed_at}
          durationSeconds={TURN_PLAYING_HINT_SECONDS}
          activePlayerLabel={activePlayer?.pseudo ?? "—"}
          isYouActive={isActive}
        />
      )}

      {turn?.phase === "challenge_window" && (
        <ChallengeBar
          phaseChangedAt={turn.phase_changed_at}
          durationSeconds={CHALLENGE_WINDOW_SECONDS}
          hasChallenged={hasChallenged}
          isActivePlayer={isActive}
          onOpenChallenge={() => setChallengeMode(true)}
        />
      )}

      <section>
        <div className="text-xs uppercase text-muted-foreground mb-2">
          Ma timeline ({ownTimeline.length} cartes)
        </div>
        <Timeline
          cards={ownTimeline}
          onChooseSlot={
            (isActive && turn?.phase === "turn_playing") ||
            (challengeMode && turn?.phase === "challenge_window")
              ? setSelectedSlot
              : undefined
          }
          selectedSlot={selectedSlot}
        />

        {isActive && turn?.phase === "turn_playing" && (
          <div className="mt-3 flex gap-2">
            <Button
              onClick={submitGuess}
              disabled={selectedSlot === null || submittingAction === "guess"}
            >
              {t("game.submit")}
            </Button>
          </div>
        )}

        {challengeMode && turn?.phase === "challenge_window" && (
          <div className="mt-3 flex gap-2">
            <Button
              onClick={submitChallenge}
              disabled={selectedSlot === null || submittingAction === "challenge"}
            >
              {t("game.challenge")}
            </Button>
            <Button variant="ghost" onClick={() => { setChallengeMode(false); setSelectedSlot(null); }}>
              Annuler
            </Button>
          </div>
        )}
      </section>

      <section>
        <div className="text-xs uppercase text-muted-foreground mb-2">Autres joueurs</div>
        <div className="space-y-3">
          {players
            .filter((p) => p.player_id !== selfId)
            .map((p) => (
              <Timeline
                key={p.player_id}
                cards={timelinesByPlayer.get(p.player_id) ?? []}
                playerLabel={`${p.pseudo} (${timelinesByPlayer.get(p.player_id)?.length ?? 0})`}
                size="sm"
              />
            ))}
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showReveal && turn?.effective_year && turn.title && turn.artists && (
        <RevealOverlay
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
