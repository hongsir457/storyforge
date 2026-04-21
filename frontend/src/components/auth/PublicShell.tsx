import type { ReactNode } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/brand/BrandLogo";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_18%,_rgba(56,168,245,0.18),_transparent_28%),radial-gradient(circle_at_88%_14%,_rgba(216,165,90,0.14),_transparent_24%),linear-gradient(180deg,_#050913_0%,_#0b1320_42%,_#121c2d_100%)] text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <Link href="/" className="flex items-center rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-1.5 shadow-[0_18px_55px_rgba(7,12,21,0.36)] backdrop-blur-sm">
          <BrandLogo
            alt={t("dashboard:app_title")}
            className="h-12 w-auto max-w-[10.5rem] rounded-[1rem] bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.24)]"
          />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          {t("auth:back_home")}
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 pt-2 lg:grid-cols-[minmax(0,1.2fr)_26rem] lg:items-start">
        <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,38,0.88),rgba(10,16,26,0.92))] p-8 shadow-[0_34px_90px_rgba(4,10,20,0.5)] backdrop-blur-xl sm:p-10">
          {eyebrow && (
            <div className="mb-5 inline-flex rounded-full border border-sky-300/18 bg-sky-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-sky-100/78">
              {eyebrow}
            </div>
          )}
          <h1
            className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[3.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-8 text-slate-300">{description}</p>
          {aside && <div className="mt-10 border-t border-white/8 pt-8">{aside}</div>}
        </section>

        <section className="rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,14,24,0.92),rgba(6,10,18,0.96))] p-7 shadow-[0_26px_72px_rgba(2,8,23,0.6)] backdrop-blur-xl">
          {children}
        </section>
      </main>
    </div>
  );
}
