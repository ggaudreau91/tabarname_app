"use client";

import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { MetaLabel } from "@/components/brand/Stamp";

type StripPlayer = {
  player_id: string;
  pseudo: string;
  cards: number;
  isLeader: boolean;
  isHost: boolean;
};

type Props = {
  players: StripPlayer[];
  totalToWin: number;
  canChallenge: boolean;
  hasChallenged: boolean;
  onChallenge?: () => void;
};

// Barre du bas: les autres joueurs avec mini-jauges de cartes. Bouton
// "Contester" actif pendant challenge_window.
export function OthersStrip({
  players,
  totalToWin,
  canChallenge,
  hasChallenged,
  onChallenge,
}: Props) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--creme-3)",
        background: "var(--creme)",
        padding: "20px 24px",
      }}
    >
      <div className="flex items-baseline justify-between mb-3.5">
        <MetaLabel>Autres joueurs · {players.length}</MetaLabel>
        {canChallenge && !hasChallenged && (
          <button
            onClick={onChallenge}
            className="font-medium"
            style={{
              background: "var(--creme-2)",
              border: "1px solid var(--creme-3)",
              color: "var(--brun)",
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            ⚑ Contester un placement
          </button>
        )}
        {hasChallenged && (
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              color: "var(--green-pret)",
              letterSpacing: "0.1em",
            }}
          >
            ✓ CONTESTATION ENVOYÉE
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {players.map((p) => (
          <div
            key={p.player_id}
            className="relative flex items-center gap-3 rounded-lg"
            style={{
              background: "var(--creme-2)",
              border: "1px solid var(--creme-3)",
              padding: "12px 14px",
            }}
          >
            <PlayerAvatar
              name={p.pseudo}
              color={colorForPlayer(p.player_id)}
              isHost={p.isHost}
              size={36}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div
                  className="font-display font-semibold truncate"
                  style={{ fontSize: 17, letterSpacing: "-0.01em" }}
                >
                  {p.pseudo}
                </div>
                {p.isLeader && (
                  <span
                    className="font-mono font-bold"
                    style={{
                      fontSize: 9,
                      color: "var(--or)",
                      letterSpacing: "0.15em",
                    }}
                  >
                    LEADER
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: Math.min(totalToWin, 10) }).map((_, j) => (
                  <div
                    key={j}
                    style={{
                      width: 6,
                      height: 14,
                      background:
                        j < p.cards ? "var(--brun)" : "var(--creme-3)",
                      borderRadius: 1,
                    }}
                  />
                ))}
                <div
                  className="ml-1.5 font-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--brun-mid)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {p.cards}/{totalToWin}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
