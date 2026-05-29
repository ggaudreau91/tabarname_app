"use client";

import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { Kicker } from "@/components/brand/Kicker";
import { ProgressBar } from "@/components/brand/ProgressBar";

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

// Barre du bas: les autres joueurs avec mini-jauges. Bouton "Contester"
// actif pendant challenge_window.
export function OthersStrip({ players, totalToWin, canChallenge, hasChallenged, onChallenge }: Props) {
  return (
    <div className="tb" style={{ padding: "14px 20px 30px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Kicker>Autres joueurs · {players.length}</Kicker>
        {canChallenge && !hasChallenged && (
          <button
            onClick={onChallenge}
            className="tb-mono"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink)", padding: "6px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer" }}
          >
            ⚑ Contester
          </button>
        )}
        {hasChallenged && (
          <span className="tb-pill" style={{ background: "rgba(31,138,72,0.14)", color: "var(--spotify)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--spotify)" }} />
            Contestation envoyée
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {players.map((p) => (
          <div key={p.player_id} className="tb-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14 }}>
            <PlayerAvatar name={p.pseudo} color={colorForPlayer(p.player_id)} isHost={p.isHost} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="font-display" style={{ fontWeight: 600, fontSize: 18, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.pseudo}</span>
                {p.isLeader && (
                  <span className="tb-mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--gold-deep)", textTransform: "uppercase", flexShrink: 0 }}>Leader</span>
                )}
              </div>
              <div style={{ marginTop: 6 }}>
                <ProgressBar value={p.cards} max={Math.min(totalToWin, 10)} tone="gold" />
              </div>
            </div>
            <span className="tb-mono" style={{ fontSize: 12, color: "var(--ink-dim)", flexShrink: 0 }}>{p.cards}/{totalToWin}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
