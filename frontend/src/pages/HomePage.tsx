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
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <FeatureCard
            index="01"
            emphasis
            className="lg:row-span-2"
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
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="storyforge-kicker">Storyforge Narrative Engine</div>
          <h2
            className="text-[2.05rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--sf-text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            从一个灵感，推进到可交付的小说、分镜与影像。
          </h2>
          <p className="text-sm leading-7 text-[var(--sf-text-muted)]">
            先把故事骨架稳住，再把角色、线索、镜头和输出节奏接起来。Storyforge 把这条链路收进同一套创作工作台。
          </p>
        </div>

        <div className="grid gap-3">
          <Link
            href={isAuthenticated ? "/app/projects" : "/login"}
            className="storyforge-primary-button inline-flex h-12 items-center justify-center rounded-[1.1rem] px-4 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            {isAuthenticated ? t("auth:enter_studio") : t("auth:home_primary_cta")}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              className="storyforge-secondary-button inline-flex h-12 items-center justify-center rounded-[1.1rem] px-4 text-sm font-medium transition hover:-translate-y-0.5"
            >
              {t("auth:home_secondary_cta")}
            </Link>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.9)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">
            Studio rhythm
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">
            Novel Workbench 负责把 seed 扩成完整叙事，Project Library 负责把稳定 IP 往角色包、分镜和视频产出继续推进。
          </p>
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
      className={`rounded-[1.9rem] border border-[rgba(117,132,159,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,249,253,0.94))] p-5 shadow-[0_18px_46px_rgba(23,38,69,0.08)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full border border-[rgba(117,132,159,0.16)] bg-white/72 px-2.5 py-1 text-[11px] font-semibold tracking-[0.2em] text-[var(--sf-text-soft)]">
          {index}
        </span>
        <span className="rounded-full bg-[rgba(24,151,214,0.08)] p-2 text-[var(--sf-blue)]">{icon}</span>
      </div>
      <h3
        className={`mt-5 font-semibold tracking-[-0.03em] text-[var(--sf-text)] ${emphasis ? "text-xl leading-8" : "text-lg leading-7"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">{body}</p>
    </div>
  );
}
