import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Tabarname",
  description:
    "Comment Tabarname collecte, utilise et protège tes données personnelles.",
};

const UPDATED = "7 juin 2026";

const h2: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 24,
  color: "var(--ink)",
  margin: "30px 0 10px",
};
const p: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "var(--ink-2)",
  margin: "0 0 12px",
};
const li: React.CSSProperties = { ...p, margin: "0 0 8px" };

export default function ConfidentialitePage() {
  return (
    <main className="tb" style={{ minHeight: "100%", background: "var(--bg-grad)", color: "var(--ink)" }}>
      <div className="safe-top safe-bottom" style={{ padding: "16px 22px 48px", maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" className="tb-mono" style={{ fontSize: 12, color: "var(--accent)" }}>
          ← Tabarname
        </Link>

        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 40, letterSpacing: "-0.01em", margin: "18px 0 6px" }}>
          Politique de confidentialité
        </h1>
        <p className="tb-mono" style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8 }}>
          Dernière mise à jour : {UPDATED}
        </p>

        <p style={p}>
          Tabarname est un jeu musical édité par PAR Design (Boisbriand, Québec,
          Canada). Cette politique explique quelles données nous traitons et
          pourquoi. Pour toute question :{" "}
          <a href="mailto:ggaudreau@pardesign.net" style={{ color: "var(--accent)" }}>
            ggaudreau@pardesign.net
          </a>
          .
        </p>

        <h2 style={h2}>Données que nous traitons</h2>
        <ul style={{ paddingLeft: 18 }}>
          <li style={li}>
            <b style={{ color: "var(--ink)" }}>Compte de jeu</b> : un identifiant
            de compte anonyme (créé automatiquement) et, si tu en choisis un, un
            pseudonyme.
          </li>
          <li style={li}>
            <b style={{ color: "var(--ink)" }}>Connexion Spotify</b> : lorsque tu
            relies ton compte Spotify, nous recevons ton identifiant Spotify, ton
            adresse courriel Spotify et ton type d’abonnement (Premium/gratuit),
            ainsi que des jetons d’accès. Les jetons sont{" "}
            <b style={{ color: "var(--ink)" }}>chiffrés</b> et stockés côté serveur ;
            ils ne sont jamais exposés au navigateur.
          </li>
          <li style={li}>
            <b style={{ color: "var(--ink)" }}>Données de partie</b> : parties
            jouées, pseudonyme utilisé, cartes/scores et événements de jeu.
          </li>
          <li style={li}>
            <b style={{ color: "var(--ink)" }}>Données techniques</b> : données de
            session nécessaires au fonctionnement (cookies d’authentification).
          </li>
        </ul>

        <h2 style={h2}>Finalités</h2>
        <p style={p}>
          Nous utilisons ces données uniquement pour : te connecter, faire
          fonctionner le jeu et la lecture de musique via Spotify, conserver
          l’historique de tes parties, et assurer la sécurité du service. Nous ne
          vendons pas tes données et ne les utilisons pas à des fins publicitaires.
        </p>

        <h2 style={h2}>Sous-traitants</h2>
        <ul style={{ paddingLeft: 18 }}>
          <li style={li}>
            <b style={{ color: "var(--ink)" }}>Spotify</b> — lecture de la musique
            et authentification (
            <a href="https://www.spotify.com/legal/privacy-policy/" style={{ color: "var(--accent)" }}>
              politique Spotify
            </a>
            ).
          </li>
          <li style={li}>
            <b style={{ color: "var(--ink)" }}>Supabase</b> — base de données et
            authentification.
          </li>
          <li style={li}>
            <b style={{ color: "var(--ink)" }}>Vercel</b> — hébergement de
            l’application.
          </li>
        </ul>

        <h2 style={h2}>Conservation</h2>
        <p style={p}>
          Nous conservons tes données tant que ton compte existe. Tu peux retirer
          la connexion Spotify ou supprimer ton compte à tout moment depuis la page{" "}
          <Link href="/compte" style={{ color: "var(--accent)" }}>
            Mon compte
          </Link>
          .
        </p>

        <h2 style={h2}>Tes droits</h2>
        <p style={p}>
          Tu peux à tout moment : déconnecter ton compte Spotify (ce qui supprime
          tes jetons), ou{" "}
          <b style={{ color: "var(--ink)" }}>supprimer ton compte</b>, ce qui
          efface ton identité de connexion, ton adresse courriel et tes jetons
          Spotify. Tu peux aussi nous écrire pour exercer tes droits d’accès et de
          rectification.
        </p>

        <h2 style={h2}>Enfants</h2>
        <p style={p}>
          Tabarname n’est pas destiné aux enfants de moins de 13 ans et requiert un
          compte Spotify.
        </p>

        <h2 style={h2}>Modifications</h2>
        <p style={p}>
          Nous pouvons mettre à jour cette politique ; la date en haut de page
          indique la dernière révision.
        </p>

        <p style={{ ...p, marginTop: 28 }}>
          <Link href="/legal/conditions" style={{ color: "var(--accent)" }}>
            Conditions d’utilisation →
          </Link>
        </p>
      </div>
    </main>
  );
}
