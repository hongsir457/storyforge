import type { ReactNode } from "react";
import { Link } from "wouter";
import { BookMarked, Clapperboard, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicShell } from "@/components/auth/PublicShell";
import { useAuthStore } from "@/stores/auth-store";

export function HomePage() {
  const { t } = useTranslation(["auth", "dashboard"]);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <PublicShell
      eyebrow={t("dashboard:app_subtitle")}
      title={t("auth:home_hero_title")}
      description={t("auth:home_hero_body")}
      aside={
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<BookMarked className="h-5 w-5" />}
            title={t("auth:home_feature_story_title")}
            body={t("auth:home_feature_story_body")}
          />
          <FeatureCard
            icon={<Clapperboard className="h-5 w-5" />}
            title={t("auth:home_feature_adapt_title")}
            body={t("auth:home_feature_adapt_body")}
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title={t("auth:home_feature_ops_title")}
            body={t("auth:home_feature_ops_body")}
          />
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">{t("dashboard:app_title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{t("dashboard:app_subtitle")}</p>
        </div>

        <div className="grid gap-3">
          <Link
            href={isAuthenticated ? "/app/projects" : "/login"}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            {isAuthenticated ? t("auth:enter_studio") : t("auth:home_primary_cta")}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t("auth:home_secondary_cta")}
            </Link>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

function FeatureCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="mb-3 inline-flex rounded-xl bg-white/8 p-2 text-sky-200">{icon}</div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
