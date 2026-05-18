# Tabarname

Jeu musical multijoueur en ligne de type *Hitster*, propulsé par Spotify.
Devine l'année des chansons et construis ta timeline chronologique. Avec une touche bien québécoise.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Style**: Tailwind CSS 4 + shadcn/ui
- **Backend**: Supabase (Postgres + Realtime + Auth)
- **Audio**: Spotify Web Playback SDK (Premium requis)
- **Déploiement**: Vercel + Supabase managé

## Démarrage local

```bash
pnpm install
cp .env.example .env.local
# Remplir les variables — voir section Configuration
pnpm dev
```

Le site sera disponible à [http://localhost:3000](http://localhost:3000).

## Configuration

### 1. Spotify Developer App
1. Créer une app sur [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Ajouter le redirect URI: `http://localhost:3000/api/spotify/callback`
3. Copier `Client ID` et `Client Secret` dans `.env.local`

### 2. Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Copier `Project URL`, `anon key`, `service_role key` dans `.env.local`
3. Lier le projet local: `supabase link --project-ref <ref>`
4. Pousser les migrations: `supabase db push`

### 3. Clé de chiffrement
Générer une clé 32 bytes pour chiffrer les refresh tokens Spotify:
```bash
openssl rand -hex 32
```

## Architecture

Voir le plan complet dans `~/.claude/plans/je-veux-faire-un-velvet-petal.md`.

```
app/
  (marketing)/   Pages publiques (landing, comment-jouer, legal)
  (app)/         App authentifiée (parties, compte, admin)
  api/           Route handlers (Spotify OAuth, mutations de partie)
components/
  game/          Timeline, Card, NowPlaying, ChallengeBar, RevealOverlay
  lobby/
  spotify/       SpotifyPlayerProvider, PremiumGate
  ui/            shadcn/ui
lib/
  game/state.ts  Machine d'état pure (testable unitairement)
  spotify/       OAuth PKCE, wrappers API, chiffrement tokens
  supabase/      Clients server/browser/service
  curation/      Import et gestion des playlists curées
  i18n/          Dictionnaire FR (architecture EN-ready)
  realtime/      Helpers canaux Supabase Realtime
supabase/
  migrations/    SQL migrations (tables, RLS, fonctions plpgsql)
types/           db.ts (généré), game.ts
```

## Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Démarre le serveur de dev (Turbopack) |
| `pnpm build` | Build de production |
| `pnpm start` | Démarre le serveur de production |
| `pnpm lint` | Lint ESLint |

## Statut

Sprint 1 — Fondations en cours. Voir le plan pour la séquence complète.
