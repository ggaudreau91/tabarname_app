# Tabarname

Jeu musical multijoueur en ligne de type *Hitster*, propulsé par Spotify.
Devine l'année des chansons et construis ta timeline chronologique. Avec une touche bien québécoise.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Style**: Tailwind CSS 4 + shadcn/ui
- **Backend**: Supabase (Postgres + Realtime + Auth anonyme)
- **Audio**: Spotify Web Playback SDK (Premium requis pour l'hôte)
- **Tests**: Vitest (machine d'état pure)
- **Déploiement**: Vercel + Supabase managé

## Démarrage local

```bash
pnpm install
cp .env.example .env
# Remplir les variables — voir Configuration
pnpm dev
```

Ouvre [http://127.0.0.1:3000](http://127.0.0.1:3000) (la proxy redirige automatiquement `localhost` → `127.0.0.1`).

## Configuration

### 1. Spotify Developer App
1. Créer une app sur [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. **Redirect URI**: `http://127.0.0.1:3000/api/spotify/callback`
   - ⚠️ Pas `localhost` — depuis avril 2025, Spotify exige `127.0.0.1` ou HTTPS
3. **User Management** (si l'app est en Development Mode): ajouter ton email Spotify
4. Copier `Client ID` et `Client Secret` dans `.env`

### 2. Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. **Authentication > Providers**: activer **Anonymous Sign-ins**
3. Copier `Project URL`, `anon key`, `service_role key` dans `.env`
4. Lier le projet local: `supabase link --project-ref <ref>`
5. Pousser les migrations: `supabase db push`

### 3. Clé de chiffrement
```bash
openssl rand -hex 32
```
Coller dans `TOKEN_ENCRYPTION_KEY=`.

### 4. Admin (curation de playlists)
1. Connecter Spotify une première fois dans l'app
2. Trouver ton UUID joueur dans Supabase Dashboard > Authentication > Users
3. Coller dans `ADMIN_PLAYER_IDS=<uuid>` (plusieurs UUIDs séparés par `,`)
4. Accéder à `/admin/playlists` pour importer

## Architecture

Voir le plan complet dans `~/.claude/plans/je-veux-faire-un-velvet-petal.md`.

```
app/
  (marketing)/page.tsx       Landing
  (app)/
    parties/{nouvelle,rejoindre,[code]}
    compte/                  Stats + historique
    admin/playlists/         Curation
  api/
    spotify/{login,callback,access-token}
    parties/[code]/{join,start,guess,challenge,resolve,next,leave}
    admin/{playlists,tracks}
components/
  game/         Timeline, Card, NowPlaying, ChallengeBar, RevealOverlay
  spotify/      SpotifyPlayerProvider, PremiumGate, SpotifyStatus
  lobby/        PlayerList
  ui/           shadcn/ui
lib/
  game/state.ts        Machine d'état pure (testable)
  spotify/             OAuth PKCE + chiffrement AES-256-GCM
  supabase/            Clients server/browser/service
  curation/import.ts   Import de playlist Spotify
  realtime/room.ts     Souscriptions canal salle
  i18n/                Dictionnaire FR
supabase/migrations/   0001_init, 0002_game_functions, 0003_turns_view_and_rls
proxy.ts               Redirige localhost → 127.0.0.1 en dev
```

## Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de dev (Turbopack) sur 127.0.0.1 |
| `pnpm build` | Build de production |
| `pnpm start` | Serveur de production |
| `pnpm lint` | Lint ESLint |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm import-playlist --playlist <id> --slug <slug> [--name "..."]` | CLI d'import (l'admin UI fait la même chose) |

## Déploiement Vercel

1. Push le repo sur GitHub
2. Importer dans Vercel — Next.js auto-détecté
3. **Environment Variables** (toutes celles de `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI=https://<ton-domaine>/api/spotify/callback`
   - `TOKEN_ENCRYPTION_KEY=<même clé que dev — sinon les tokens existants ne se déchiffrent plus>`
   - `APP_URL=https://<ton-domaine>`
   - `ADMIN_PLAYER_IDS=<uuid(s)>`
4. Ajouter le redirect URI prod dans le dashboard Spotify
5. Déployer

Côté Spotify: pour sortir du Development Mode (et permettre à n'importe quel user Premium d'utiliser l'app), demander **Extended Quota Mode** dans le dashboard. Processus d'approbation peut prendre plusieurs jours.

## Tests

```bash
pnpm test       # une passe
pnpm test:watch # mode watch
```

Couvre la machine d'état (`lib/game/state.ts`) : placement, résolution Hitster originale, rotation des joueurs, condition de victoire. La logique plpgsql autoritaire (`supabase/migrations/0002_game_functions.sql`) reflète exactement cette machine — toute modif côté TS doit être portée côté SQL.

## Limitations connues

- **Mobile Safari**: le Web Playback SDK Spotify est notoirement bogué sur Safari et non supporté sur iOS Safari. Tester sur Chrome/Firefox/Edge.
- **Drift audio**: 0.5–2s entre joueurs en mode `online_premium` (impossible à éliminer). Mode `host_audio` règle ce problème pour le jeu en personne.
- **Fuite métadonnée**: titre/artiste exposés via `Spotify.Player.player_state_changed`. UI affiche un dos de carte; règle d'honneur documentée.
- **Joueur actif déconnecté**: pas d'auto-skip (edge case). Le tour reste ouvert tant que personne ne soumet.
