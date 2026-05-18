import Link from "next/link";
import { t } from "@/lib/i18n";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { YearCard } from "@/components/brand/YearCard";
import { Stamp, MetaLabel, SpotifyBadge } from "@/components/brand/Stamp";

// Wordmark Tabarname avec disque mini en pastille
function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size + 10,
          height: size + 10,
          background: "var(--brun)",
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: (size + 10) * 0.375,
            height: (size + 10) * 0.375,
            background: "var(--oxblood)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            background: "var(--creme)",
          }}
        />
      </div>
      <div
        className="font-display italic font-bold"
        style={{ fontSize: size, letterSpacing: "-0.02em" }}
      >
        Tabarname
      </div>
    </div>
  );
}

const MARQUEE_ARTISTS = [
  "Beau Dommage",
  "Les Cowboys Fringants",
  "Diane Dufresne",
  "Charlebois",
  "Harmonium",
  "Karkwa",
  "Cœur de pirate",
  "Hubert Lenoir",
];

const HOWTO = [
  {
    n: "01",
    t: "Crée la salle",
    d: "L'hôte ouvre une partie, choisit une playlist (top québécois, années 90, hip-hop FR…) et partage le code à 6 caractères.",
    k: "EMB-543",
  },
  {
    n: "02",
    t: "Écoute, devine, place",
    d: "Une chanson joue. Devine son année et glisse la carte au bon endroit dans ta timeline chronologique.",
    k: "▶ 0:18 / 0:30",
  },
  {
    n: "03",
    t: "Conteste ou tabarne",
    d: "Pas d'accord avec un placement? Conteste. T'as raison, tu rafles la carte. Le premier à 10 cartes gagne.",
    k: "+1 CARTE",
  },
];

export default function Home() {
  return (
    <main className="flex-1 bg-creme text-brun">
      {/* TOP NAV */}
      <nav
        className="flex items-center justify-between px-6 sm:px-16 py-6"
        style={{ borderBottom: "1px solid var(--creme-3)" }}
      >
        <Wordmark />
        <div className="hidden sm:flex items-center gap-7">
          <a href="#howto" className="text-sm font-medium text-brun">
            Comment jouer
          </a>
          <a href="#modes" className="text-sm font-medium text-brun">
            Modes
          </a>
          <Link
            href="/parties/rejoindre"
            className="inline-flex items-center justify-center rounded-md font-semibold text-sm px-4 py-2"
            style={{
              background: "var(--creme)",
              color: "var(--brun)",
              border: "1.5px solid var(--brun)",
            }}
          >
            {t("landing.cta.joinShort")}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 sm:px-16 py-16 sm:py-20">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center max-w-7xl mx-auto">
          {/* Left — copy */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-px bg-brun" />
              <MetaLabel>{t("landing.metaLabel")}</MetaLabel>
            </div>
            <h1
              className="font-display font-semibold"
              style={{
                fontSize: "clamp(64px, 11vw, 144px)",
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                fontVariationSettings: '"opsz" 144',
              }}
            >
              <span className="italic font-medium">Devine</span>
              <br />
              l&apos;année.
              <br />
              <span style={{ color: "var(--oxblood)" }}>Bâtis</span>
              <br />
              <span className="italic font-medium">ta timeline.</span>
            </h1>
            <p
              className="mt-10 mb-10 max-w-md"
              style={{ fontSize: 19, lineHeight: 1.55, color: "var(--brun-2)" }}
            >
              {t("landing.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <Link
                href="/parties/nouvelle"
                className="inline-flex items-center justify-center gap-2 rounded-md font-semibold"
                style={{
                  background: "var(--oxblood)",
                  color: "var(--creme)",
                  padding: "16px 32px",
                  fontSize: 17,
                }}
              >
                <span style={{ fontSize: 18 }}>＋</span>
                {t("landing.cta.create")}
              </Link>

              <form
                action="/parties/rejoindre"
                className="inline-flex items-center gap-2 rounded-md font-mono"
                style={{
                  padding: "13px 18px",
                  border: "1.5px solid var(--brun)",
                  background: "var(--creme)",
                }}
              >
                <span
                  style={{ fontSize: 11, color: "var(--brun-mid)", letterSpacing: "0.1em" }}
                >
                  {t("landing.codeLabel")}
                </span>
                <input
                  name="code"
                  placeholder={t("landing.codePlaceholder")}
                  className="bg-transparent outline-none font-mono font-semibold uppercase placeholder:opacity-40"
                  style={{
                    fontSize: 17,
                    width: 110,
                    letterSpacing: "0.15em",
                    color: "var(--brun)",
                  }}
                />
                <button
                  type="submit"
                  className="rounded font-semibold"
                  style={{
                    background: "var(--brun)",
                    color: "var(--creme)",
                    padding: "6px 12px",
                    fontSize: 12,
                  }}
                >
                  →
                </button>
              </form>
            </div>

            <div
              className="mt-9 flex items-center gap-2.5 text-sm"
              style={{ color: "var(--brun-mid)" }}
            >
              <span>Propulsé par</span>
              <SpotifyBadge />
              <span>·</span>
              <span>{t("landing.spotifyLine")}</span>
            </div>
          </div>

          {/* Right — vinyl stack */}
          <div className="relative h-[500px] lg:h-[600px] hidden lg:block">
            <div
              className="absolute"
              style={{ top: 80, right: 40, transform: "rotate(-8deg)" }}
            >
              <VinylDisc size={460} labelColor="var(--oxblood)" />
            </div>
            <div
              className="absolute flex items-center gap-3.5"
              style={{
                top: 0,
                left: 20,
                background: "var(--creme)",
                border: "1.5px solid var(--brun)",
                padding: "14px 18px",
                borderRadius: 6,
                transform: "rotate(-4deg)",
                boxShadow: "0 8px 24px rgba(45,27,18,0.15)",
              }}
            >
              <YearCard year={1976} size="sm" title="Heureusement" artist="J. Leloup" />
              <div
                style={{
                  width: 1,
                  height: 80,
                  borderLeft: "1px dashed var(--brun-mid)",
                }}
              />
              <div>
                <MetaLabel>Bien joué!</MetaLabel>
                <div
                  className="font-display font-bold mt-1"
                  style={{ fontSize: 28, color: "var(--oxblood)" }}
                >
                  +1 carte
                </div>
              </div>
            </div>
            <div
              className="absolute"
              style={{ bottom: 30, left: 0, transform: "rotate(-12deg)" }}
            >
              <YearCard
                year={1989}
                size="lg"
                title="Tu m'aimes-tu"
                artist="Richard Desjardins"
              />
            </div>
            <div
              className="absolute font-mono font-semibold"
              style={{
                top: 250,
                right: 0,
                background: "var(--or)",
                color: "var(--brun)",
                padding: "10px 14px",
                borderRadius: 6,
                transform: "rotate(8deg)",
                fontSize: 11,
                letterSpacing: "0.15em",
                boxShadow: "0 4px 12px rgba(45,27,18,0.18)",
              }}
            >
              33⅓ TRS/MIN
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div
        className="overflow-hidden whitespace-nowrap"
        style={{
          background: "var(--brun)",
          color: "var(--creme)",
          padding: "14px 0",
          borderTop: "2px solid var(--or)",
          borderBottom: "2px solid var(--or)",
        }}
      >
        <div
          className="flex gap-10 font-display italic"
          style={{ fontSize: 22 }}
        >
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-10 shrink-0">
              {MARQUEE_ARTISTS.map((a) => (
                <span key={a} className="flex gap-10">
                  <span>{a}</span>
                  <span style={{ color: "var(--or)" }}>·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* COMMENT JOUER */}
      <section id="howto" className="px-6 sm:px-16 py-20 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div>
            <MetaLabel>Comment ça marche</MetaLabel>
            <h2
              className="font-display font-medium mt-2"
              style={{
                fontSize: "clamp(40px, 6vw, 64px)",
                letterSpacing: "-0.025em",
                lineHeight: 1,
              }}
            >
              Trois{" "}
              <span className="italic" style={{ color: "var(--oxblood)" }}>
                tours
              </span>
              , puis on joue.
            </h2>
          </div>
          <p
            className="text-sm max-w-xs sm:text-right"
            style={{ color: "var(--brun-mid)" }}
          >
            {t("landing.howCta")}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {HOWTO.map((step) => (
            <div
              key={step.n}
              className="flex flex-col"
              style={{
                background: "var(--creme)",
                border: "1.5px solid var(--creme-3)",
                borderRadius: 8,
                padding: 28,
                minHeight: 280,
              }}
            >
              <div
                className="font-display italic font-semibold leading-none"
                style={{
                  fontSize: 88,
                  color: "var(--or)",
                  fontVariationSettings: '"opsz" 144',
                }}
              >
                {step.n}
              </div>
              <div
                className="font-display font-semibold mt-4"
                style={{ fontSize: 28, letterSpacing: "-0.02em" }}
              >
                {step.t}
              </div>
              <div
                className="mt-3 flex-1"
                style={{
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--brun-2)",
                }}
              >
                {step.d}
              </div>
              <div
                className="mt-5 pt-3.5 font-mono"
                style={{
                  fontSize: 12,
                  color: "var(--brun-mid)",
                  letterSpacing: "0.1em",
                  borderTop: "1px dashed var(--creme-3)",
                }}
              >
                {step.k}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TWO MODES */}
      <section
        id="modes"
        className="px-6 sm:px-16 py-16"
        style={{
          background: "var(--creme-2)",
          borderTop: "1px solid var(--creme-3)",
          borderBottom: "1px solid var(--creme-3)",
        }}
      >
        <div className="grid sm:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Mode A — cream */}
          <div
            className="relative"
            style={{
              background: "var(--creme)",
              padding: 36,
              border: "1.5px solid var(--brun)",
              borderRadius: 8,
            }}
          >
            <div className="absolute top-6 right-6">
              <Stamp color="var(--oxblood)">Premium · chacun</Stamp>
            </div>
            <MetaLabel>Mode A</MetaLabel>
            <div
              className="font-display font-semibold mt-2 mb-4"
              style={{ fontSize: 40, letterSpacing: "-0.02em" }}
            >
              <span className="italic">En ligne</span> · chacun chez soi
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--brun-2)" }}>
              Chaque joueur écoute l&apos;audio en streaming sur son propre
              appareil. Idéal pour les soirées à distance, les apéros Zoom et les
              long-distance moves.
            </p>
            <div className="mt-6 flex items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 44,
                    height: 64,
                    border: "2px solid var(--brun)",
                    borderRadius: 6,
                    background: "var(--creme-2)",
                  }}
                />
              ))}
              <div
                className="self-center ml-2 text-sm"
                style={{ color: "var(--brun-mid)" }}
              >
                2 à 8 joueurs
              </div>
            </div>
          </div>

          {/* Mode B — brun nuit */}
          <div
            className="relative"
            style={{
              background: "var(--brun)",
              color: "var(--creme)",
              padding: 36,
              borderRadius: 8,
            }}
          >
            <div className="absolute top-6 right-6">
              <Stamp color="var(--or)">1 seul Premium</Stamp>
            </div>
            <MetaLabel color="var(--or)">Mode B</MetaLabel>
            <div
              className="font-display font-semibold mt-2 mb-4"
              style={{ fontSize: 40, letterSpacing: "-0.02em" }}
            >
              <span className="italic">Audio chez l&apos;hôte</span>
            </div>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--creme-2)",
              }}
            >
              L&apos;hôte branche son tél au speaker. Tout le monde voit son écran
              et place ses cartes sur son propre téléphone. Pour les vrais partys
              de cuisine.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div
                className="relative flex items-center justify-center rounded-xl"
                style={{
                  width: 60,
                  height: 60,
                  background: "var(--creme)",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 32,
                    borderRadius: 2,
                    background: "var(--brun)",
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    right: -6,
                    top: "50%",
                    width: 28,
                    height: 2,
                    background: "var(--or)",
                  }}
                />
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 44,
                      borderRadius: 4,
                      background: "rgba(250,246,240,0.15)",
                      border: "1px solid rgba(250,246,240,0.3)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="relative overflow-hidden text-center"
        style={{
          background: "var(--brun)",
          color: "var(--creme)",
          padding: "100px 24px",
        }}
      >
        <div
          className="absolute opacity-30 pointer-events-none"
          style={{ top: -100, left: -80 }}
        >
          <VinylDisc size={360} labelColor="var(--oxblood)" />
        </div>
        <div
          className="absolute opacity-30 pointer-events-none"
          style={{ bottom: -120, right: -80 }}
        >
          <VinylDisc size={360} labelColor="var(--or)" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <MetaLabel color="var(--or)">{t("landing.finalCta")}</MetaLabel>
          <h2
            className="font-display font-semibold mt-3"
            style={{
              fontSize: "clamp(56px, 9vw, 96px)",
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
            }}
          >
            Prêt à{" "}
            <span className="italic" style={{ color: "var(--or)" }}>
              tabarner
            </span>
            ?
          </h2>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/parties/nouvelle"
              className="inline-flex items-center justify-center font-semibold rounded-md"
              style={{
                background: "var(--or)",
                color: "var(--brun)",
                padding: "16px 32px",
                fontSize: 17,
              }}
            >
              {t("landing.cta.create")}
            </Link>
            <Link
              href="/parties/rejoindre"
              className="inline-flex items-center justify-center font-semibold rounded-md"
              style={{
                background: "transparent",
                color: "var(--creme)",
                padding: "16px 32px",
                fontSize: 17,
                border: "1.5px solid var(--creme)",
              }}
            >
              {t("landing.cta.join")} avec un code
            </Link>
          </div>
          <div
            className="mt-7 font-mono"
            style={{
              fontSize: 12,
              color: "rgba(250,246,240,0.55)",
              letterSpacing: "0.12em",
            }}
          >
            FAIT À MTL · CC0 · 2026
          </div>
        </div>
      </section>
    </main>
  );
}
