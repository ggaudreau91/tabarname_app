import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions d’utilisation — Tabarname",
  description: "Les conditions d’utilisation du jeu musical Tabarname.",
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

export default function ConditionsPage() {
  return (
    <main className="tb" style={{ minHeight: "100%", background: "var(--bg-grad)", color: "var(--ink)" }}>
      <div className="safe-top safe-bottom" style={{ padding: "16px 22px 48px", maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" className="tb-mono" style={{ fontSize: 12, color: "var(--accent)" }}>
          ← Tabarname
        </Link>

        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 40, letterSpacing: "-0.01em", margin: "18px 0 6px" }}>
          Conditions d’utilisation
        </h1>
        <p className="tb-mono" style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8 }}>
          Dernière mise à jour : {UPDATED}
        </p>

        <h2 style={h2}>Le service</h2>
        <p style={p}>
          Tabarname est un jeu musical convivial édité par PAR Design. Il s’utilise
          avec un compte Spotify. La lecture de la musique est assurée par Spotify
          et requiert un abonnement <b style={{ color: "var(--ink)" }}>Premium</b>.
          Tabarname n’est ni affilié à, ni commandité par Spotify.
        </p>

        <h2 style={h2}>Compte et usage</h2>
        <p style={p}>
          Tu es responsable de l’usage que tu fais du service et du respect des
          conditions de Spotify. N’utilise pas le service de façon abusive,
          illégale ou pour porter atteinte aux droits d’autrui.
        </p>

        <h2 style={h2}>Contenu musical</h2>
        <p style={p}>
          Tout le contenu musical appartient à Spotify et à ses ayants droit. Il
          est diffusé via le lecteur Spotify, sous réserve de leurs conditions.
        </p>

        <h2 style={h2}>Suppression</h2>
        <p style={p}>
          Tu peux supprimer ton compte à tout moment depuis la page{" "}
          <Link href="/compte" style={{ color: "var(--accent)" }}>
            Mon compte
          </Link>
          .
        </p>

        <h2 style={h2}>Responsabilité</h2>
        <p style={p}>
          Le service est fourni « tel quel », sans garantie. Dans les limites
          permises par la loi, PAR Design ne saurait être tenue responsable des
          dommages résultant de l’utilisation du service.
        </p>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          Questions :{" "}
          <a href="mailto:ggaudreau@pardesign.net" style={{ color: "var(--accent)" }}>
            ggaudreau@pardesign.net
          </a>
          .
        </p>

        <p style={{ ...p, marginTop: 28 }}>
          <Link href="/legal/confidentialite" style={{ color: "var(--accent)" }}>
            Politique de confidentialité →
          </Link>
        </p>
      </div>
    </main>
  );
}
