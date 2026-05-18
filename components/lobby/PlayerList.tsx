import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

export type LobbyPlayer = {
  player_id: string;
  pseudo: string;
  has_premium: boolean;
  is_connected: boolean;
};

type Props = {
  players: LobbyPlayer[];
  hostId: string;
  selfId: string;
};

export function PlayerList({ players, hostId, selfId }: Props) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {players.map((p) => (
        <li key={p.player_id} className="flex items-center gap-3 px-4 py-3">
          <span
            className={`size-2 rounded-full ${
              p.is_connected ? "bg-emerald-500" : "bg-muted-foreground/40"
            }`}
            aria-hidden
          />
          <span className="font-medium">
            {p.pseudo}
            {p.player_id === selfId && <span className="text-muted-foreground"> (toi)</span>}
          </span>
          {p.player_id === hostId && (
            <Badge variant="secondary">{t("lobby.host")}</Badge>
          )}
          {p.has_premium && <Badge>{t("lobby.premium")}</Badge>}
          {!p.is_connected && (
            <span className="text-xs text-muted-foreground ml-auto">
              {t("lobby.disconnected")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
