"use client";

import { VinylDisc } from "@/components/brand/VinylDisc";
import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { Stamp } from "@/components/brand/Stamp";
import { StatusPill } from "@/components/brand/StatusPill";
import { Btn } from "@/components/brand/Btn";
import type { LobbyPlayer } from "@/components/lobby/PlayerList";

type Props = {
  code: string;
  hostId: string;
  selfId: string;
  players: LobbyPlayer[];
  playlistName?: string;
  playlistTrackCount?: number;
  mode: "online_premium" | "host_audio" | "local_pass";
  winConditionCards: number;
  challengesEnabled: boolean;
  maxPlayers?: number;
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  onStart: () => void;
  onLeave: () => void;
  onCopyCode: () => void;
  onCopyLink: () => void;
  copied: "code" | "link" | null;
};

const FILL_TO = 8;

function TicketCard({ code, url }: { code: string; url: string }) {
  const notch = "var(--hero-bg)";
  const left = code.slice(0, 3);
  const right = code.slice(3);
  return (
    <div style={{ position: "relative" }}>
      <div style={{ background: "var(--surface)", borderRadius: 18, padding: "22px 26px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
        <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-dim)", marginBottom: 6 }}>Salle</div>
        <div
          className="font-display"
          style={{ fontWeight: 700, fontSize: 48, lineHeight: 1, color: "var(--ink)", letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: 10 }}
        >
          {left}
          <span style={{ color: "var(--gold-deep)", fontSize: 30 }}>•</span>
          {right}
        </div>
        <div className="tb-mono" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 12, wordBreak: "break-all" }}>{url}</div>
      </div>
      <div style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: notch }} />
      <div style={{ position: "absolute", right: -10, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: notch }} />
    </div>
  );
}

function StatCell({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="font-display" style={{ fontWeight: 700, fontSize: 30, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
      <div className="tb-mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-dim)", marginTop: 7, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function RoomLobby({
  code,
  hostId,
  selfId,
  players,
  playlistName,
  playlistTrackCount,
  mode,
  winConditionCards,
  challengesEnabled,
  maxPlayers = FILL_TO,
  isHost,
  canStart,
  starting,
  onStart,
  onLeave,
  onCopyCode,
  onCopyLink,
  copied,
}: Props) {
  const hostPlayer = players.find((p) => p.player_id === hostId);
  const emptySlots = Math.max(0, maxPlayers - players.length);
  const modeLabel = mode === "online_premium" ? "En ligne" : mode === "host_audio" ? "Audio hôte" : "Local";

  return (
    <div className="tb flex-1" style={{ minHeight: "100%", background: "var(--bg)", color: "var(--ink)" }}>
      {/* top: code / share */}
      <div className="safe-top" style={{ background: "var(--hero-bg)", color: "var(--hero-ink)", padding: "16px 22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <span className="tb-mono" style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)" }}>Tabarname · Lobby</span>
          <button
            onClick={onLeave}
            className="tb-mono"
            style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hero-ink)", border: "1px solid var(--panel-line)", borderRadius: 999, padding: "7px 13px", whiteSpace: "nowrap", background: "transparent", cursor: "pointer" }}
          >
            ← Quitter
          </button>
        </div>

        <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>Code de la salle · partage-le</div>
        <TicketCard code={code} url={`tabarname.app/j/${code}`} />

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={onCopyCode}
            style={{ flex: 1, padding: "13px 10px", borderRadius: 12, border: "1px solid var(--panel-line)", color: "var(--hero-ink)", background: "rgba(255,255,255,0.04)", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
          >
            ⧉ {copied === "code" ? "Copié!" : "Copier le code"}
          </button>
          <button
            onClick={onCopyLink}
            style={{ flex: 1, padding: "13px 10px", borderRadius: 12, border: "1px solid var(--panel-line)", color: "var(--hero-ink)", background: "rgba(255,255,255,0.04)", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
          >
            🔗 {copied === "link" ? "Copié!" : "Copier le lien"}
          </button>
        </div>

        {playlistName && (
          <>
            <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)", margin: "22px 0 10px" }}>Playlist sélectionnée</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid var(--panel-line)" }}>
              <VinylDisc size={56} label="" />
              <div style={{ minWidth: 0 }}>
                <div className="font-display" style={{ fontWeight: 600, fontSize: 19, color: "var(--hero-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playlistName}</div>
                <div style={{ fontSize: 13, color: "var(--panel-dim)", marginTop: 2 }}>{playlistTrackCount ?? "?"} chansons · Sélection de la maison</div>
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
          <span className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--panel-dim)" }}>Side A · Lobby</span>
          <span className="tb-pill" style={{ background: "transparent", color: "var(--spotify)" }}>
            <span className="tb-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--spotify)" }} />
            Connecté
          </span>
        </div>
      </div>

      {/* players */}
      <div style={{ padding: "24px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div>
            <div className="tb-mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-dim)", marginBottom: 4 }}>
              {players.length} joueur{players.length > 1 ? "s" : ""} · max {maxPlayers}
            </div>
            <h2 className="font-display" style={{ fontWeight: 700, fontSize: 30, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              <span style={{ fontStyle: "italic" }}>La</span> salle d&apos;attente
            </h2>
          </div>
          {hostPlayer && (
            <div style={{ flexShrink: 0, marginTop: 6 }}>
              <Stamp>Hôte: {hostPlayer.pseudo}</Stamp>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {players.map((p, i) => {
            const isYou = p.player_id === selfId;
            const isPlayerHost = p.player_id === hostId;
            return (
              <div
                key={p.player_id}
                className="tb-card"
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, minHeight: 68,
                  border: isYou ? "1.5px solid var(--accent)" : undefined,
                }}
              >
                <span className="tb-mono" style={{ fontSize: 13, color: "var(--ink-dim)", width: 22, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                <PlayerAvatar name={p.pseudo} color={colorForPlayer(p.player_id)} size={44} isHost={isPlayerHost} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-display" style={{ fontWeight: 600, fontSize: 21, color: "var(--ink)", lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.pseudo}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    {isYou && <StatusPill tone="host">Toi</StatusPill>}
                    {isPlayerHost && <StatusPill tone="host">Hôte</StatusPill>}
                    {p.has_premium && <StatusPill tone="premium">Premium</StatusPill>}
                  </div>
                </div>
                <StatusPill tone={p.is_connected ? "ready" : "wait"}>{p.is_connected ? "Prêt" : "Absent"}</StatusPill>
              </div>
            );
          })}

          {emptySlots > 0 &&
            Array.from({ length: Math.min(emptySlots, 3) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, minHeight: 60, border: "1.5px dashed var(--line-strong)", opacity: 0.6 }}
              >
                <span className="tb-mono" style={{ fontSize: 13, color: "var(--ink-dim)", width: 22, flexShrink: 0 }}>{String(players.length + i + 1).padStart(2, "0")}</span>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px dashed var(--line-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-dim)", flexShrink: 0 }}>＋</div>
                <span className="font-display italic" style={{ fontSize: 16, color: "var(--ink-dim)" }}>en attente d&apos;un joueur…</span>
              </div>
            ))}
        </div>
      </div>

      {/* settings summary */}
      <div style={{ padding: "22px 22px 0" }}>
        <div className="tb-card" style={{ display: "flex", gap: 12, padding: "18px 20px", background: "var(--surface-2)" }}>
          <StatCell value={winConditionCards} label="Cartes pour gagner" />
          <div style={{ width: 1, background: "var(--line)" }} />
          <StatCell value={modeLabel} label="Mode" />
          <div style={{ width: 1, background: "var(--line)" }} />
          <StatCell value={challengesEnabled ? "On" : "Off"} label="Contestations" />
        </div>
      </div>

      {/* start CTA */}
      <div className="safe-bottom" style={{ padding: "20px 22px 30px" }}>
        {isHost ? (
          <Btn kind="accent" block disabled={!canStart || starting} icon={<span>▶</span>} onClick={onStart}>
            {starting ? "Démarrage…" : "Démarrer la partie"}
          </Btn>
        ) : (
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--ink-dim)" }}>
            {hostPlayer?.pseudo ?? "L'hôte"} démarrera la partie quand tout le monde sera prêt.
          </div>
        )}
      </div>
    </div>
  );
}
