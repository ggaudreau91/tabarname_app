"use client";

import { ArrowLeft, Copy, Link as LinkIcon, Play, Plus, Star } from "lucide-react";
import { Stamp, MetaLabel } from "@/components/brand/Stamp";
import { PlayerAvatar, colorForPlayer } from "@/components/brand/PlayerAvatar";
import { VinylDisc } from "@/components/brand/VinylDisc";
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

// Pseudo-QR fait main (le vrai serait généré côté client avec qrcode lib —
// pour l'instant on garde le pattern stylé du design).
function FakeQR({ seed }: { seed: string }) {
  const cells = Array.from({ length: 144 }, (_, i) => {
    const row = Math.floor(i / 12);
    const col = i % 12;
    const isCorner =
      (row < 3 && col < 3) || (row < 3 && col > 8) || (row > 8 && col < 3);
    // hash from seed for pseudo-randomness
    let h = 0;
    for (const ch of seed + i) h = ((h * 31) + ch.charCodeAt(0)) | 0;
    const on = Math.abs(h % 3) !== 0;
    return isCorner || on;
  });
  return (
    <div
      className="grid"
      style={{
        width: 96,
        height: 96,
        background: "var(--brun)",
        gridTemplateColumns: "repeat(12, 1fr)",
        gridTemplateRows: "repeat(12, 1fr)",
        padding: 6,
        gap: 1,
        borderRadius: 4,
      }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          style={{ background: on ? "var(--creme)" : "transparent" }}
        />
      ))}
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
  const formatted = code.replace(/^(.{3})(.{3})$/, "$1·$2");
  const hostPlayer = players.find((p) => p.player_id === hostId);
  const emptySlots = Math.max(0, maxPlayers - players.length);

  return (
    <div className="grid lg:grid-cols-[1.05fr_0.95fr] min-h-screen">
      {/* LEFT — code + invite */}
      <div
        className="relative flex flex-col px-5 py-8 sm:px-8 sm:py-10"
        style={{
          background: "var(--brun)",
          color: "var(--creme)",
        }}
      >
        <div className="flex items-center justify-between">
          <MetaLabel color="var(--or)">Tabarname · Lobby</MetaLabel>
          <button
            onClick={onLeave}
            className="inline-flex items-center gap-1.5 font-mono"
            style={{
              background: "transparent",
              color: "var(--creme)",
              border: "1px solid rgba(250,246,240,0.3)",
              padding: "6px 12px",
              borderRadius: 4,
              fontSize: 12,
              letterSpacing: "0.1em",
            }}
          >
            <ArrowLeft size={12} strokeWidth={2.5} /> QUITTER
          </button>
        </div>

        {/* Ticket */}
        <div className="mt-12">
          <MetaLabel color="var(--or)">Code de la salle · partage-le</MetaLabel>
        </div>
        <div className="mt-4 relative">
          <div
            className="relative flex items-stretch gap-4 sm:gap-7 px-5 py-6 sm:px-9 sm:py-8"
            style={{
              background: "var(--creme)",
              color: "var(--brun)",
              borderRadius: 10,
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                left: -8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                background: "var(--brun)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                right: -8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                background: "var(--brun)",
              }}
            />
            <div className="flex-1">
              <MetaLabel>Salle</MetaLabel>
              <div
                className="font-display font-bold flex items-baseline gap-1 mt-2"
                style={{
                  fontSize: "clamp(40px, 12vw, 92px)",
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                  fontVariationSettings: '"opsz" 144',
                }}
              >
                {formatted.split("·")[0]}
                <span style={{ color: "var(--or)", margin: "0 2px" }}>·</span>
                {formatted.split("·")[1]}
              </div>
              <div
                className="mt-3 font-mono"
                style={{
                  fontSize: 12,
                  color: "var(--brun-mid)",
                  letterSpacing: "0.1em",
                }}
              >
                tabarname.app/j/{code}
              </div>
            </div>
            <div
              className="hidden sm:block"
              style={{ width: 1, borderLeft: "2px dashed var(--creme-3)" }}
            />
            <div className="hidden sm:flex flex-col items-center justify-center gap-2">
              <FakeQR seed={code} />
              <div
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--brun-mid)",
                  letterSpacing: "0.1em",
                }}
              >
                SCANNE
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3.5">
            <button
              onClick={onCopyCode}
              className="flex-1 flex items-center justify-center gap-2 rounded-md font-medium"
              style={{
                padding: "12px 16px",
                background: "rgba(250,246,240,0.08)",
                border: "1px solid rgba(250,246,240,0.2)",
                color: "var(--creme)",
                fontSize: 13,
              }}
            >
              <Copy size={14} strokeWidth={2} />
              {copied === "code" ? "Copié!" : "Copier le code"}
            </button>
            <button
              onClick={onCopyLink}
              className="flex-1 flex items-center justify-center gap-2 rounded-md font-medium"
              style={{
                padding: "12px 16px",
                background: "rgba(250,246,240,0.08)",
                border: "1px solid rgba(250,246,240,0.2)",
                color: "var(--creme)",
                fontSize: 13,
              }}
            >
              <LinkIcon size={14} strokeWidth={2} />
              {copied === "link" ? "Copié!" : "Copier le lien"}
            </button>
          </div>
        </div>

        {/* Playlist */}
        {playlistName && (
          <div className="mt-14">
            <MetaLabel color="var(--or)">Playlist sélectionnée</MetaLabel>
            <div
              className="mt-3.5 flex items-center gap-4 rounded-lg"
              style={{
                padding: 18,
                background: "rgba(250,246,240,0.06)",
                border: "1px solid rgba(250,246,240,0.12)",
              }}
            >
              <div className="shrink-0">
                <VinylDisc size={72} labelColor="var(--or)" label="LP" />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-display font-semibold truncate"
                  style={{ fontSize: 22, letterSpacing: "-0.01em" }}
                >
                  {playlistName}
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "rgba(250,246,240,0.65)" }}
                >
                  {playlistTrackCount ?? "?"} chansons · Sélection de la maison
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div
          className="mt-8 flex justify-between font-mono"
          style={{
            fontSize: 11,
            color: "rgba(250,246,240,0.4)",
            letterSpacing: "0.12em",
          }}
        >
          <span>SIDE A · LOBBY</span>
          <span className="flex items-center gap-1.5">
            <span
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                background: "var(--green-spotify)",
                animation: "pulse-soft 2s infinite",
              }}
            />
            CONNECTÉ
          </span>
        </div>
      </div>

      {/* RIGHT — players + settings */}
      <div
        className="flex flex-col px-5 py-8 sm:px-8 sm:py-10"
        style={{ background: "var(--creme)" }}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <MetaLabel>
              {players.length} joueur{players.length > 1 ? "s" : ""} · max{" "}
              {maxPlayers}
            </MetaLabel>
            <h2
              className="font-display font-semibold mt-1"
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              <span className="italic">La</span> salle d&apos;attente
            </h2>
          </div>
          {hostPlayer && (
            <Stamp color="var(--oxblood)" rotate={6}>
              Hôte: {hostPlayer.pseudo}
            </Stamp>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          {players.map((p, i) => {
            const isYou = p.player_id === selfId;
            const isPlayerHost = p.player_id === hostId;
            return (
              <div
                key={p.player_id}
                className="flex items-center gap-4 rounded-lg"
                style={{
                  padding: "12px 16px",
                  background: isYou ? "rgba(139,35,49,0.08)" : "var(--creme)",
                  border: `1.5px solid ${isYou ? "var(--oxblood)" : "var(--creme-3)"}`,
                }}
              >
                <div
                  className="font-mono w-6"
                  style={{
                    fontSize: 12,
                    color: "var(--brun-mid)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <PlayerAvatar
                  name={p.pseudo}
                  color={colorForPlayer(p.player_id)}
                  isHost={isPlayerHost}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="font-display font-semibold truncate"
                      style={{ fontSize: 22, letterSpacing: "-0.01em" }}
                    >
                      {p.pseudo}
                    </div>
                    {isYou && (
                      <span
                        className="font-mono font-bold"
                        style={{
                          fontSize: 10,
                          color: "var(--oxblood)",
                          letterSpacing: "0.15em",
                        }}
                      >
                        TOI
                      </span>
                    )}
                    {isPlayerHost && (
                      <span
                        className="inline-flex items-center gap-1 font-mono font-bold"
                        style={{
                          fontSize: 10,
                          color: "var(--or)",
                          letterSpacing: "0.15em",
                        }}
                      >
                        <Star size={10} fill="var(--or)" strokeWidth={0} />
                        HÔTE
                      </span>
                    )}
                    {p.has_premium && (
                      <span
                        className="font-mono font-bold"
                        style={{
                          fontSize: 10,
                          color: "var(--green-spotify)",
                          letterSpacing: "0.15em",
                        }}
                      >
                        ◉ PREMIUM
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 font-mono font-semibold"
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.1em",
                    color: p.is_connected
                      ? "var(--green-pret)"
                      : "var(--brun-mid)",
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      background: p.is_connected
                        ? "var(--green-pret)"
                        : "var(--brun-mid)",
                      animation: p.is_connected
                        ? "none"
                        : "blink 1.4s infinite",
                    }}
                  />
                  {p.is_connected ? "PRÊT" : "ABSENT"}
                </div>
              </div>
            );
          })}

          {emptySlots > 0 &&
            Array.from({ length: Math.min(emptySlots, 3) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-4 rounded-lg opacity-70"
                style={{
                  padding: "12px 16px",
                  border: "1.5px dashed var(--creme-3)",
                }}
              >
                <div
                  className="font-mono w-6"
                  style={{
                    fontSize: 12,
                    color: "var(--brun-mid)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {String(players.length + i + 1).padStart(2, "0")}
                </div>
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 44,
                    height: 44,
                    border: "1.5px dashed var(--creme-3)",
                    color: "var(--creme-3)",
                  }}
                >
                  <Plus size={18} strokeWidth={2} />
                </div>
                <div
                  className="italic"
                  style={{ fontSize: 14, color: "var(--brun-mid)" }}
                >
                  en attente d&apos;un joueur…
                </div>
              </div>
            ))}
        </div>

        <div className="flex-1" />

        {/* Settings strip */}
        <div
          className="mt-8 grid grid-cols-3 gap-2.5 rounded-lg"
          style={{
            padding: "16px 20px",
            background: "var(--creme-2)",
          }}
        >
          <div>
            <MetaLabel>Cartes pour gagner</MetaLabel>
            <div
              className="font-display font-semibold mt-0.5"
              style={{ fontSize: 26 }}
            >
              {winConditionCards}
            </div>
          </div>
          <div>
            <MetaLabel>Mode</MetaLabel>
            <div
              className="font-display font-semibold mt-0.5"
              style={{ fontSize: 18 }}
            >
              {mode === "online_premium"
                ? "En ligne"
                : mode === "host_audio"
                  ? "Audio hôte"
                  : "Local"}
            </div>
          </div>
          <div>
            <MetaLabel>Contestations</MetaLabel>
            <div
              className="font-display font-semibold mt-0.5"
              style={{ fontSize: 18 }}
            >
              {challengesEnabled ? "Permises" : "Off"}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {isHost ? (
            <button
              onClick={onStart}
              disabled={!canStart || starting}
              className="w-full flex items-center justify-center gap-2.5 font-semibold rounded-md disabled:opacity-50"
              style={{
                background: "var(--oxblood)",
                color: "var(--creme)",
                padding: "16px 32px",
                fontSize: 17,
              }}
            >
              <Play size={18} fill="var(--creme)" strokeWidth={0} />
              {starting ? "Démarrage…" : "Démarrer la partie"}
            </button>
          ) : (
            <div
              className="text-center"
              style={{ fontSize: 14, color: "var(--brun-mid)" }}
            >
              {hostPlayer?.pseudo ?? "L'hôte"} démarrera la partie quand tout le
              monde sera prêt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
