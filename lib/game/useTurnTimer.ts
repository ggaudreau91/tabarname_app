"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Compte à rebours d'un tour, dérivé de `phaseChangedAt` (timestamp serveur)
 * mais **pausable**: le temps écoulé pendant les pauses est accumulé et exclu,
 * pour que le timeout ne se déclenche pas tant que c'est en pause.
 *
 * Réinitialise à chaque changement de phase (nouveau `phaseChangedAt`) ou de durée.
 * Retourne les secondes restantes (float, ≥ 0).
 */
export function useTurnTimer(
  phaseChangedAt: string | null | undefined,
  durationSeconds: number,
  paused: boolean,
): number {
  const startRef = useRef(0);
  const pausedAccumMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(durationSeconds);

  // Reset sur nouveau tour / nouvelle phase / durée modifiée.
  useEffect(() => {
    startRef.current = phaseChangedAt ? new Date(phaseChangedAt).getTime() : Date.now();
    pausedAccumMsRef.current = 0;
    pausedAtRef.current = null;
    setRemaining(durationSeconds);
  }, [phaseChangedAt, durationSeconds]);

  // Transitions de pause: accumule le temps passé en pause.
  useEffect(() => {
    if (paused) {
      if (pausedAtRef.current === null) pausedAtRef.current = Date.now();
    } else if (pausedAtRef.current !== null) {
      pausedAccumMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [paused]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const pausedExtra =
        pausedAtRef.current !== null ? now - pausedAtRef.current : 0;
      const elapsed =
        (now - startRef.current - pausedAccumMsRef.current - pausedExtra) / 1000;
      setRemaining(Math.max(0, durationSeconds - elapsed));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phaseChangedAt, durationSeconds, paused]);

  return remaining;
}
