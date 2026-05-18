// Types domaine pour la machine d'état pure (lib/game/state.ts).
// Indépendants de Supabase / DB — la couche persistance fait son propre mapping.

export type PlayerId = string;
export type TrackId = string;

export type TurnPhase =
  | "turn_playing"
  | "guess_window"
  | "challenge_window"
  | "reveal"
  | "resolved";

export type TurnOutcome = "active_correct" | "challenger_correct" | "all_wrong";

export type RoomMode = "online_premium" | "host_audio" | "local_pass";

// Une carte dans la timeline d'un joueur.
export type TimelineCard = {
  trackId: TrackId;
  year: number;
};

// Une timeline est *triée par année croissante* en permanence.
// Position N signifie: la carte sera insérée entre l'index N-1 et N.
// - position 0 → avant la première carte
// - position cards.length → après la dernière
// Les ties sur l'année sont acceptés à n'importe quelle position adjacente.
export type Timeline = {
  playerId: PlayerId;
  cards: TimelineCard[];
};

export type ChallengeAttempt = {
  challengerId: PlayerId;
  // Position d'insertion proposée par le challenger dans SA propre timeline
  // (Hitster: le challenger ne fait pas que dire "non" — il propose sa réponse).
  proposedPosition: number;
  // Ordre d'arrivée (le premier correct gagne en cas d'égalité)
  submittedAt: number;
};

export type ResolveInput = {
  // Le tour à résoudre
  activePlayerId: PlayerId;
  activeGuessPosition: number;
  // Timelines au moment du tour, AVANT placement
  activeTimeline: Timeline;
  challengerTimelines: Record<PlayerId, Timeline>;
  // Pour chaque challenger ayant contesté, sa proposition
  challenges: ChallengeAttempt[];
  // Vérité — connue du serveur seulement
  trackId: TrackId;
  trueYear: number;
};

export type ResolveResult = {
  outcome: TurnOutcome;
  // Joueur qui reçoit la carte (null si all_wrong → pas de carte attribuée en règle Hitster originale)
  winnerId: PlayerId | null;
  // Position où la carte est insérée dans la timeline du gagnant
  insertedAt: number | null;
  // Pour debug/event log
  evaluations: Array<{
    playerId: PlayerId;
    position: number;
    role: "active" | "challenger";
    correct: boolean;
  }>;
};
