import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";

interface PublicShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}

export function PublicShell({ eyebrow, title, description, children, aside }: PublicShellProps) {
  const { t } = useTranslation(["auth", "dashboard"]);

  return (
    <div className="storyforge-public-shell flex min-h-screen flex-col">
      <div className="landing-grid pointer-events-none" />
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <Link href="/" className="rounded-[1.7rem] transition-transform hover:-translate-y-0.5">
          <BrandLogo alt={t("dashboard:app_title")} className="h-14 w-auto max-w-[17rem]" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-[rgba(117,132,159,0.16)] bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--sf-text-soft)] md:inline-flex">
            Editorial AI Studio
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(117,132,159,0.18)] bg-white/78 px-4 py-2 text-sm font-medium text-[var(--sf-text)] shadow-[0_12px_32px_rgba(23,38,69,0.08)] transition hover:border-[rgba(24,151,214,0.18)] hover:bg-white"
          >
            {t("auth:back_home")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl flex-1 gap-8 px-6 pb-16 pt-2 xl:grid-cols-[minmax(0,1.18fr)_28rem] xl:items-start">
        <section className="storyforge-stage-card relative overflow-hidden rounded-[2.4rem] p-8 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,151,214,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(216,165,90,0.12),transparent_24%)]" />
          <div className="relative space-y-8">
            {eyebrow && (
              <div className="storyforge-kicker">
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
            )}
            <div className="max-w-4xl">
              <h1
                className="landing-slogan max-w-4xl text-[2.9rem] font-semibold leading-[0.97] tracking-[-0.05em] sm:text-[3.7rem] lg:text-[4.75rem]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h1>
              <p className="mt-6 max-w-3xl text-[15px] leading-8 text-[var(--sf-text-muted)] sm:text-[1.05rem]">
                {description}
              </p>
            </div>
            {aside && <div className="border-t border-[rgba(117,132,159,0.16)] pt-8">{aside}</div>}
          </div>
        </section>

        <section className="storyforge-form-card rounded-[2rem] p-7 sm:p-8">
          {children}
        </section>
      </main>

      <SiteLegalFooter className="mt-auto bg-transparent" contentClassName="max-w-7xl px-6 py-5" />
    </div>
  );
}
