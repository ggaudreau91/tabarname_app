// Machine d'état pure pour un tour Tabarname.
// AUCUN I/O, AUCUNE dépendance externe — 100 % testable unitairement.
// La version autoritaire vit côté DB (0002_game_functions.sql) et doit refléter
// EXACTEMENT cette logique. Les tests de ce fichier protègent les deux.

import type {
  ChallengeAttempt,
  PlayerId,
  ResolveInput,
  ResolveResult,
  Timeline,
  TimelineCard,
} from "@/types/game";

// ---------------------------------------------------------------------------
// Validation de placement
// ---------------------------------------------------------------------------

/**
 * Vérifie qu'une position d'insertion est dans les bornes de la timeline.
 * Les positions valides vont de 0 à cards.length inclus.
 */
export function isPositionInBounds(timeline: Timeline, position: number): boolean {
  return (
    Number.isInteger(position) &&
    position >= 0 &&
    position <= timeline.cards.length
  );
}

/**
 * Une position est *correcte* si, après insertion d'une carte d'année `year`
 * à cette position, la timeline reste triée par année croissante (égalités OK).
 *
 * Concrètement: la carte à position-1 doit avoir year <= newYear,
 * et la carte à position doit avoir newYear <= year.
 */
export function isPlacementCorrect(
  timeline: Timeline,
  position: number,
  year: number,
): boolean {
  if (!isPositionInBounds(timeline, position)) return false;
  const before = timeline.cards[position - 1];
  const after = timeline.cards[position];
  if (before && before.year > year) return false;
  if (after && after.year < year) return false;
  return true;
}

/**
 * Insère une carte dans une timeline triée à la position donnée et
 * retourne une NOUVELLE timeline (immutable).
 */
export function insertCard(
  timeline: Timeline,
  position: number,
  card: TimelineCard,
): Timeline {
  if (!isPositionInBounds(timeline, position)) {
    throw new Error(`insertCard: position ${position} hors bornes (len=${timeline.cards.length})`);
  }
  const next = timeline.cards.slice();
  next.splice(position, 0, card);
  return { playerId: timeline.playerId, cards: next };
}

// ---------------------------------------------------------------------------
// Résolution d'un tour — règle Hitster originale
// ---------------------------------------------------------------------------
//
// Règles confirmées par l'utilisateur:
// - Si le joueur actif place correctement → il gagne la carte. Les challengers
//   ne sont PAS évalués (l'actif a priorité quand il a raison).
// - Sinon (actif faux), on évalue les challengers dans l'ordre de soumission.
//   Le premier dont le placement (dans SA timeline) est correct gagne la carte.
// - Si aucun n'est correct → personne ne gagne (outcome `all_wrong`).
//   Aucune pénalité pour les challengers fautifs.

export function resolveTurn(input: ResolveInput): ResolveResult {
  const evaluations: ResolveResult["evaluations"] = [];

  const activeCorrect = isPlacementCorrect(
    input.activeTimeline,
    input.activeGuessPosition,
    input.trueYear,
  );

  evaluations.push({
    playerId: input.activePlayerId,
    position: input.activeGuessPosition,
    role: "active",
    correct: activeCorrect,
  });

  if (activeCorrect) {
    return {
      outcome: "active_correct",
      winnerId: input.activePlayerId,
      insertedAt: input.activeGuessPosition,
      evaluations,
    };
  }

  // Trier les challenges par submittedAt croissant (déterministe)
  const ordered = input.challenges.slice().sort((a, b) => a.submittedAt - b.submittedAt);

  let winningChallenger: ChallengeAttempt | null = null;
  for (const c of ordered) {
    const timeline = input.challengerTimelines[c.challengerId];
    if (!timeline) {
      // Sécurité: challenger sans timeline → ignoré
      evaluations.push({
        playerId: c.challengerId,
        position: c.proposedPosition,
        role: "challenger",
        correct: false,
      });
      continue;
    }
    const correct = isPlacementCorrect(timeline, c.proposedPosition, input.trueYear);
    evaluations.push({
      playerId: c.challengerId,
      position: c.proposedPosition,
      role: "challenger",
      correct,
    });
    if (correct && !winningChallenger) {
      winningChallenger = c;
    }
  }

  if (winningChallenger) {
    return {
      outcome: "challenger_correct",
      winnerId: winningChallenger.challengerId,
      insertedAt: winningChallenger.proposedPosition,
      evaluations,
    };
  }

  return {
    outcome: "all_wrong",
    winnerId: null,
    insertedAt: null,
    evaluations,
  };
}

// ---------------------------------------------------------------------------
// Condition de victoire
// ---------------------------------------------------------------------------

export function hasReachedWinCondition(
  timeline: Timeline,
  winConditionCards: number,
): boolean {
  return timeline.cards.length >= winConditionCards;
}

/**
 * Détermine le gagnant à partir des timelines, OU null si personne n'a atteint
 * le seuil. En cas d'égalité (deux joueurs atteignent N au même tour, ce qui
 * ne peut pas arriver via resolveTurn standard puisqu'on attribue 1 carte par
 * tour, mais on couvre quand même), on retourne le premier dans l'itération.
 */
export function findWinner(
  timelines: Iterable<Timeline>,
  winConditionCards: number,
): PlayerId | null {
  for (const t of timelines) {
    if (hasReachedWinCondition(t, winConditionCards)) return t.playerId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers de tour (sélection du prochain joueur actif)
// ---------------------------------------------------------------------------

/**
 * À partir d'une liste ordonnée de joueurs connectés et de l'id du joueur
 * actif courant, retourne l'id du prochain joueur actif (rotation circulaire).
 * Saute les joueurs déconnectés. Retourne null si aucun joueur connecté.
 */
export function nextActivePlayer(
  orderedPlayerIds: PlayerId[],
  connected: Set<PlayerId>,
  currentActiveId: PlayerId | null,
): PlayerId | null {
  const connectedOrdered = orderedPlayerIds.filter((p) => connected.has(p));
  if (connectedOrdered.length === 0) return null;
  if (currentActiveId === null) return connectedOrdered[0];

  const idx = orderedPlayerIds.indexOf(currentActiveId);
  if (idx === -1) return connectedOrdered[0];

  // Cherche le prochain connecté à partir de idx+1, cycliquement
  for (let step = 1; step <= orderedPlayerIds.length; step++) {
    const candidate = orderedPlayerIds[(idx + step) % orderedPlayerIds.length];
    if (connected.has(candidate)) return candidate;
  }
  return null;
}
