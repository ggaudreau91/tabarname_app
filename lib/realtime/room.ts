"use client";

// Helpers de souscription Realtime pour une salle.
// On utilise les `postgres_changes` sur les tables sûres uniquement
// (rooms, room_players, timeline_cards, challenges, game_events).
// La table `turns` n'est pas dans la publication realtime — pour observer les
// changements de phase, on écoute `game_events` (chaque transition émet un row).
// Les détails du tour courant se lisent via la vue turns_public sur demande.

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export type RoomChannelHandlers = {
  onRoomChange?: () => void;
  onPlayersChange?: () => void;
  onTimelineChange?: () => void;
  onChallengeChange?: () => void;
  onGameEvent?: (event: {
    event_type: string;
    payload: Record<string, unknown>;
    turn_id: string | null;
  }) => void;
};

export function subscribeToRoom(
  supabase: SupabaseClient,
  roomId: string,
  handlers: RoomChannelHandlers,
): RealtimeChannel {
  const channel = supabase.channel(`room:${roomId}`);

  if (handlers.onRoomChange) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      () => handlers.onRoomChange?.(),
    );
  }

  if (handlers.onPlayersChange) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
      () => handlers.onPlayersChange?.(),
    );
  }

  if (handlers.onTimelineChange) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "timeline_cards", filter: `room_id=eq.${roomId}` },
      () => handlers.onTimelineChange?.(),
    );
  }

  if (handlers.onChallengeChange) {
    // challenges n'a pas de filtre direct par room_id — on filtre côté client
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenges" },
      () => handlers.onChallengeChange?.(),
    );
  }

  if (handlers.onGameEvent) {
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "game_events", filter: `room_id=eq.${roomId}` },
      (payload) => {
        const row = payload.new as {
          event_type: string;
          payload: Record<string, unknown>;
          turn_id: string | null;
        };
        handlers.onGameEvent?.(row);
      },
    );
  }

  channel.subscribe();
  return channel;
}
