import type { ReactNode } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_25%),linear-gradient(180deg,_#050816_0%,_#0b1324_55%,_#111827_100%)] text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <img src="/android-chrome-192x192.png" alt={t("dashboard:app_title")} className="h-10 w-10 rounded-xl" />
          <div>
            <div className="text-lg font-semibold tracking-wide text-slate-50">{t("dashboard:app_title")}</div>
            <div className="text-xs tracking-[0.18em] text-sky-200/70">{t("dashboard:app_subtitle")}</div>
          </div>
        </Link>
        <Link href="/" className="text-sm text-slate-300 transition hover:text-white">
          {t("auth:back_home")}
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 pb-14 pt-4 lg:grid-cols-[minmax(0,1.15fr)_28rem] lg:items-start">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(2,8,23,0.45)] backdrop-blur">
          {eyebrow && (
            <div className="mb-4 inline-flex rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-100/80">
              {eyebrow}
            </div>
          )}
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
          {aside && <div className="mt-10">{aside}</div>}
        </section>

        <section className="rounded-[2rem] border border-white/12 bg-slate-950/70 p-7 shadow-[0_24px_70px_rgba(2,8,23,0.55)] backdrop-blur-xl">
          {children}
        </section>
      </main>
    </div>
  );
}
