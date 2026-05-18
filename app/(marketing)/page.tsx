import Link from "next/link";
import { t } from "@/lib/i18n";
import SpotifyStatus from "@/components/spotify/SpotifyStatus";

export default function Home() {
  return (
    <main className="flex-1">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <h1 className="font-display text-7xl sm:text-8xl font-bold tracking-tight text-foreground">
            Tabarname
          </h1>
          <p className="mt-4 font-display text-2xl sm:text-3xl text-primary italic">
            {t("landing.tagline")}
          </p>
          <p className="mt-6 max-w-2xl mx-auto text-base text-muted-foreground">
            {t("landing.description")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/parties/nouvelle"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              {t("landing.cta.create")}
            </Link>
            <Link
              href="/parties/rejoindre"
              className="inline-flex items-center justify-center rounded-md border-2 border-primary/20 bg-card px-8 py-3 text-base font-medium hover:bg-accent/20 transition"
            >
              {t("landing.cta.join")}
            </Link>
          </div>

          <div className="mt-12 max-w-md mx-auto">
            <SpotifyStatus />
          </div>
        </div>
      </section>

      {/* COMMENT JOUER */}
      <section className="border-t border-border bg-card/40">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="font-display text-4xl text-center mb-12">
            {t("landing.howto.title")}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              ["step1", "1"],
              ["step2", "2"],
              ["step3", "3"],
            ].map(([key, num]) => (
              <div key={key} className="space-y-3">
                <div className="font-display text-6xl text-accent leading-none">
                  {num}
                </div>
                <h3 className="font-display text-2xl font-semibold">
                  {t(`landing.howto.${key}.title` as keyof typeof import("@/lib/i18n/fr").fr)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`landing.howto.${key}.body` as keyof typeof import("@/lib/i18n/fr").fr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODES */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="font-display text-4xl text-center mb-12">
            {t("landing.modes.title")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <h3 className="font-display text-2xl font-semibold">
                {t("landing.modes.online.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.modes.online.body")}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <h3 className="font-display text-2xl font-semibold">
                {t("landing.modes.host.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.modes.host.body")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-border bg-primary/5">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-4xl mb-6">{t("landing.final.title")}</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/parties/nouvelle"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              {t("landing.cta.create")}
            </Link>
            <Link
              href="/parties/rejoindre"
              className="inline-flex items-center justify-center rounded-md border-2 border-primary/20 bg-card px-8 py-3 text-base font-medium hover:bg-accent/20 transition"
            >
              {t("landing.cta.join")}
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            {t("landing.premiumNote")}
          </p>
        </div>
      </section>
    </main>
  );
}
