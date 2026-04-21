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
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <FeatureCard
            index="01"
            emphasis
            className="md:row-span-2"
            icon={<BookMarked className="h-5 w-5" />}
            title={t("auth:home_feature_story_title")}
            body={t("auth:home_feature_story_body")}
          />
          <FeatureCard
            index="02"
            icon={<Clapperboard className="h-5 w-5" />}
            title={t("auth:home_feature_adapt_title")}
            body={t("auth:home_feature_adapt_body")}
          />
          <FeatureCard
            index="03"
            icon={<ShieldCheck className="h-5 w-5" />}
            title={t("auth:home_feature_ops_title")}
            body={t("auth:home_feature_ops_body")}
          />
        </div>
      }
    >
      <div className="space-y-7">
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300/72">
            {t("dashboard:app_title")}
          </div>
          <h2
            className="text-[2rem] font-semibold tracking-[-0.02em] text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("dashboard:app_title")}
          </h2>
          <p className="text-sm leading-7 text-slate-300">{t("dashboard:app_subtitle")}</p>
        </div>

        <div className="grid gap-3">
          <Link
            href={isAuthenticated ? "/app/projects" : "/login"}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            {isAuthenticated ? t("auth:enter_studio") : t("auth:home_primary_cta")}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-4 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              {t("auth:home_secondary_cta")}
            </Link>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  index,
  emphasis = false,
  className,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  index: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,25,39,0.82),rgba(10,15,24,0.92))] p-5 shadow-[0_20px_50px_rgba(2,8,23,0.24)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-[0.2em] text-slate-300/70">
          {index}
        </span>
        <span className="text-sky-100/72">{icon}</span>
      </div>
      <h3 className={`mt-5 font-semibold tracking-[-0.02em] text-white ${emphasis ? "text-xl leading-8" : "text-lg leading-7"}`}>
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
    </div>
  );
}
