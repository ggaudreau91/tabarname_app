import { describe, it, expect } from "vitest";
import {
  findWinner,
  hasReachedWinCondition,
  insertCard,
  isPlacementCorrect,
  isPositionInBounds,
  nextActivePlayer,
  resolveTurn,
} from "./state";
import type {
  ChallengeAttempt,
  ResolveInput,
  Timeline,
} from "@/types/game";

function timeline(playerId: string, years: number[]): Timeline {
  return {
    playerId,
    cards: years.map((y, i) => ({ trackId: `${playerId}-${i}`, year: y })),
  };
}

// ---------------------------------------------------------------------------
// isPositionInBounds
// ---------------------------------------------------------------------------
describe("isPositionInBounds", () => {
  it("accepte 0 et length sur une timeline non vide", () => {
    const t = timeline("A", [1980, 1990, 2000]);
    expect(isPositionInBounds(t, 0)).toBe(true);
    expect(isPositionInBounds(t, 3)).toBe(true);
  });

  it("accepte 0 sur une timeline vide", () => {
    expect(isPositionInBounds(timeline("A", []), 0)).toBe(true);
  });

  it("refuse les positions négatives ou hors borne", () => {
    const t = timeline("A", [1980]);
    expect(isPositionInBounds(t, -1)).toBe(false);
    expect(isPositionInBounds(t, 2)).toBe(false);
  });

  it("refuse les positions non entières", () => {
    expect(isPositionInBounds(timeline("A", [1980]), 0.5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPlacementCorrect
// ---------------------------------------------------------------------------
describe("isPlacementCorrect", () => {
  const t = timeline("A", [1980, 1990, 2000]);

  it("accepte un placement valide entre deux cartes", () => {
    expect(isPlacementCorrect(t, 1, 1985)).toBe(true); // entre 1980 et 1990
    expect(isPlacementCorrect(t, 2, 1995)).toBe(true); // entre 1990 et 2000
  });

  it("accepte un placement avant la première carte", () => {
    expect(isPlacementCorrect(t, 0, 1970)).toBe(true);
    expect(isPlacementCorrect(t, 0, 1980)).toBe(true); // égalité OK
  });

  it("accepte un placement après la dernière carte", () => {
    expect(isPlacementCorrect(t, 3, 2010)).toBe(true);
    expect(isPlacementCorrect(t, 3, 2000)).toBe(true); // égalité OK
  });

  it("accepte les égalités à n'importe quelle position adjacente", () => {
    const ties = timeline("A", [1980, 1990, 1990, 2000]);
    expect(isPlacementCorrect(ties, 1, 1990)).toBe(true);
    expect(isPlacementCorrect(ties, 2, 1990)).toBe(true);
    expect(isPlacementCorrect(ties, 3, 1990)).toBe(true);
  });

  it("rejette une année qui briserait l'ordre", () => {
    expect(isPlacementCorrect(t, 1, 1975)).toBe(false); // 1975 après 1980
    expect(isPlacementCorrect(t, 2, 1985)).toBe(false); // 1985 après 1990
    expect(isPlacementCorrect(t, 0, 1985)).toBe(false); // 1985 avant 1980
  });

  it("rejette les positions hors borne", () => {
    expect(isPlacementCorrect(t, -1, 1985)).toBe(false);
    expect(isPlacementCorrect(t, 99, 1985)).toBe(false);
  });

  it("accepte toute position sur une timeline vide", () => {
    expect(isPlacementCorrect(timeline("A", []), 0, 1985)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// insertCard
// ---------------------------------------------------------------------------
describe("insertCard", () => {
  it("insère et retourne une nouvelle timeline immutable", () => {
    const t = timeline("A", [1980, 2000]);
    const next = insertCard(t, 1, { trackId: "X", year: 1990 });
    expect(next.cards.map((c) => c.year)).toEqual([1980, 1990, 2000]);
    expect(t.cards.map((c) => c.year)).toEqual([1980, 2000]); // original intouché
  });

  it("throw si position hors borne", () => {
    expect(() => insertCard(timeline("A", [1980]), 5, { trackId: "X", year: 1990 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// resolveTurn — règle Hitster originale
// ---------------------------------------------------------------------------
describe("resolveTurn", () => {
  function input(overrides: Partial<ResolveInput> = {}): ResolveInput {
    return {
      activePlayerId: "A",
      activeGuessPosition: 1,
      activeTimeline: timeline("A", [1980, 2000]),
      challengerTimelines: {
        B: timeline("B", [1970, 1995]),
        C: timeline("C", [1985]),
      },
      challenges: [],
      trackId: "T",
      trueYear: 1990,
      ...overrides,
    };
  }

  it("guess correct → joueur actif gagne la carte", () => {
    const r = resolveTurn(input());
    expect(r.outcome).toBe("active_correct");
    expect(r.winnerId).toBe("A");
    expect(r.insertedAt).toBe(1);
  });

  it("guess faux + aucun challenger → all_wrong, pas de gagnant", () => {
    const r = resolveTurn(input({ activeGuessPosition: 0 })); // 1990 avant 1980 → faux
    expect(r.outcome).toBe("all_wrong");
    expect(r.winnerId).toBeNull();
    expect(r.insertedAt).toBeNull();
  });

  it("guess faux + challenger correct → challenger gagne", () => {
    const challenges: ChallengeAttempt[] = [
      { challengerId: "B", proposedPosition: 1, submittedAt: 100 }, // 1990 entre 1970 et 1995 → OK
    ];
    const r = resolveTurn(input({ activeGuessPosition: 0, challenges }));
    expect(r.outcome).toBe("challenger_correct");
    expect(r.winnerId).toBe("B");
    expect(r.insertedAt).toBe(1);
  });

  it("actif correct PRIORISE l'actif même si un challenger aurait été correct", () => {
    // Règle Hitster: si l'actif a raison, les challenges ne sont pas évalués
    const challenges: ChallengeAttempt[] = [
      { challengerId: "B", proposedPosition: 1, submittedAt: 50 },
    ];
    const r = resolveTurn(input({ challenges })); // actif position=1 correct
    expect(r.outcome).toBe("active_correct");
    expect(r.winnerId).toBe("A");
  });

  it("plusieurs challengers — premier correct (par submittedAt) gagne", () => {
    const challenges: ChallengeAttempt[] = [
      { challengerId: "C", proposedPosition: 0, submittedAt: 200 }, // 1990 avant 1985 → faux
      { challengerId: "B", proposedPosition: 1, submittedAt: 100 }, // correct, soumis avant C
    ];
    const r = resolveTurn(input({ activeGuessPosition: 0, challenges }));
    expect(r.outcome).toBe("challenger_correct");
    expect(r.winnerId).toBe("B");
  });

  it("plusieurs challengers tous corrects — le premier soumis gagne", () => {
    // B et C ont tous deux des timelines où 1990 a une position valide
    const challenges: ChallengeAttempt[] = [
      { challengerId: "B", proposedPosition: 1, submittedAt: 300 },
      { challengerId: "C", proposedPosition: 1, submittedAt: 200 }, // 1990 après 1985 → OK
    ];
    const r = resolveTurn(input({ activeGuessPosition: 0, challenges }));
    expect(r.winnerId).toBe("C");
  });

  it("challenger faux → aucune pénalité (Hitster original), outcome reste all_wrong", () => {
    const challenges: ChallengeAttempt[] = [
      { challengerId: "C", proposedPosition: 0, submittedAt: 100 }, // 1990 avant 1985 → faux
    ];
    const r = resolveTurn(input({ activeGuessPosition: 0, challenges }));
    expect(r.outcome).toBe("all_wrong");
    expect(r.winnerId).toBeNull();
    // Le challenger n'a aucune attribution négative dans le résultat
    const cEval = r.evaluations.find((e) => e.playerId === "C");
    expect(cEval?.correct).toBe(false);
  });

  it("retourne un evaluations log complet pour debug", () => {
    const challenges: ChallengeAttempt[] = [
      { challengerId: "B", proposedPosition: 1, submittedAt: 100 },
      { challengerId: "C", proposedPosition: 0, submittedAt: 200 },
    ];
    const r = resolveTurn(input({ activeGuessPosition: 0, challenges }));
    expect(r.evaluations).toHaveLength(3); // actif + 2 challengers
    expect(r.evaluations[0].role).toBe("active");
    expect(r.evaluations.filter((e) => e.role === "challenger")).toHaveLength(2);
  });

  it("challenger sans timeline → ignoré sans crasher", () => {
    const challenges: ChallengeAttempt[] = [
      { challengerId: "GHOST", proposedPosition: 0, submittedAt: 100 },
    ];
    const r = resolveTurn(input({ activeGuessPosition: 0, challenges }));
    expect(r.outcome).toBe("all_wrong");
  });
});

// ---------------------------------------------------------------------------
// Condition de victoire
// ---------------------------------------------------------------------------
describe("hasReachedWinCondition / findWinner", () => {
  it("hasReachedWinCondition true au seuil exact", () => {
    expect(hasReachedWinCondition(timeline("A", [1, 2, 3]), 3)).toBe(true);
    expect(hasReachedWinCondition(timeline("A", [1, 2]), 3)).toBe(false);
  });

  it("findWinner retourne le premier joueur ayant atteint le seuil", () => {
    const a = timeline("A", new Array(9).fill(1980));
    const b = timeline("B", new Array(10).fill(1990));
    expect(findWinner([a, b], 10)).toBe("B");
  });

  it("findWinner retourne null si personne n'a atteint", () => {
    expect(findWinner([timeline("A", [1980])], 10)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// nextActivePlayer — rotation avec saut des déconnectés
// ---------------------------------------------------------------------------
describe("nextActivePlayer", () => {
  it("retourne le premier joueur si actif null", () => {
    expect(
      nextActivePlayer(["A", "B", "C"], new Set(["A", "B", "C"]), null),
    ).toBe("A");
  });

  it("tourne au suivant dans l'ordre", () => {
    expect(nextActivePlayer(["A", "B", "C"], new Set(["A", "B", "C"]), "A")).toBe("B");
    expect(nextActivePlayer(["A", "B", "C"], new Set(["A", "B", "C"]), "B")).toBe("C");
    expect(nextActivePlayer(["A", "B", "C"], new Set(["A", "B", "C"]), "C")).toBe("A");
  });

  it("saute les joueurs déconnectés", () => {
    expect(nextActivePlayer(["A", "B", "C"], new Set(["A", "C"]), "A")).toBe("C");
    expect(nextActivePlayer(["A", "B", "C"], new Set(["A", "C"]), "C")).toBe("A");
  });

  it("retourne null si personne de connecté", () => {
    expect(nextActivePlayer(["A", "B"], new Set(), "A")).toBeNull();
  });

  it("retourne le premier connecté si actif courant inconnu", () => {
    expect(nextActivePlayer(["A", "B"], new Set(["A", "B"]), "GHOST")).toBe("A");
  });
});
