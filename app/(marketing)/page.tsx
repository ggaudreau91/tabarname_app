import Link from "next/link";
import { t } from "@/lib/i18n";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">Tabarname</h1>
        <p className="text-xl text-muted-foreground">{t("landing.tagline")}</p>
        <p className="text-base text-muted-foreground">{t("landing.description")}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/parties/nouvelle"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("landing.cta.create")}
          </Link>
          <Link
            href="/parties/rejoindre"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-base font-medium hover:bg-accent"
          >
            {t("landing.cta.join")}
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-12">
          {t("landing.premiumNote")}
        </p>
      </div>
    </main>
  );
}
