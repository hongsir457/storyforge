import { lazy, Suspense, useEffect, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertTriangle, BarChart3, Bot, ChevronLeft, Film, KeyRound, Languages, Plug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";
import { useConfigStatusStore } from "@/stores/config-status-store";

const AgentConfigTab = lazy(() => import("./AgentConfigTab").then((module) => ({ default: module.AgentConfigTab })));
const ApiKeysTab = lazy(() => import("./ApiKeysTab").then((module) => ({ default: module.ApiKeysTab })));
const MediaModelSection = lazy(() =>
  import("./settings/MediaModelSection").then((module) => ({ default: module.MediaModelSection })),
);
const ProviderSection = lazy(() => import("./ProviderSection").then((module) => ({ default: module.ProviderSection })));
const UsageStatsSection = lazy(() =>
  import("./settings/UsageStatsSection").then((module) => ({ default: module.UsageStatsSection })),
);

type SettingsSection = "agent" | "providers" | "media" | "usage" | "api-keys";

const SECTION_LIST: { id: SettingsSection; labelKey: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "agent", labelKey: "dashboard:agents", Icon: Bot },
  { id: "providers", labelKey: "dashboard:providers", Icon: Plug },
  { id: "media", labelKey: "dashboard:models", Icon: Film },
  { id: "usage", labelKey: "dashboard:usage", Icon: BarChart3 },
  { id: "api-keys", labelKey: "dashboard:api_keys", Icon: KeyRound },
];

export function SystemConfigPage() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const [location, navigate] = useLocation();
  const search = useSearch();

  const activeSection = useMemo((): SettingsSection => {
    const section = new URLSearchParams(search).get("section");
    if (section === "providers") return "providers";
    if (section === "media") return "media";
    if (section === "usage") return "usage";
    if (section === "api-keys") return "api-keys";
    return "agent";
  }, [search]);

  const setActiveSection = (section: SettingsSection) => {
    const params = new URLSearchParams(search);
    params.set("section", section);
    navigate(`${location}?${params.toString()}`, { replace: true });
  };

  const configIssues = useConfigStatusStore((s) => s.issues);
  const fetchConfigStatus = useConfigStatusStore((s) => s.fetch);

  useEffect(() => {
    void fetchConfigStatus();
  }, [fetchConfigStatus]);

  const sectionFallback = <RouteLoadingState embedded message="Loading admin section" />;

  return (
    <div className="storyforge-admin-shell min-h-screen px-6 py-6 text-[var(--sf-text)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="storyforge-page-header flex flex-col gap-5 rounded-[2rem] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Link
              href="/app/projects"
              className="storyforge-secondary-button inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:-translate-y-0.5"
              aria-label={t("common:back")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="space-y-2">
              <BrandLogo alt={t("dashboard:app_title")} className="h-14 w-auto max-w-[17rem]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">
                  Admin Console
                </p>
                <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.04em]" style={{ fontFamily: "var(--font-display)" }}>
                  系统配置与运营面板
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--sf-text-muted)]">
                  管理员界面保持更密、更明确，但仍然属于同一套 Storyforge 品牌世界。
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextLang = i18n.language.startsWith("zh") ? "en" : "zh";
              void i18n.changeLanguage(nextLang);
            }}
            className="storyforge-secondary-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5"
          >
            <Languages className="h-4 w-4" />
            {t("dashboard:language_setting")}
            <span className="rounded-full bg-[rgba(24,151,214,0.08)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--sf-blue-strong)]">
              {i18n.language.split("-")[0]}
            </span>
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <nav className="sf-panel rounded-[2rem] p-3">
            {SECTION_LIST.map(({ id, labelKey, Icon }) => {
              const isActive = activeSection === id;
              const hasIssue = (id === "providers" || id === "agent" || id === "media") && configIssues.length > 0;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`mb-2 flex w-full items-center gap-3 rounded-[1.15rem] px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-[rgba(24,151,214,0.1)] text-[var(--sf-blue-strong)]"
                      : "text-[var(--sf-text-muted)] hover:bg-white hover:text-[var(--sf-text)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left font-medium">{t(labelKey)}</span>
                  {hasIssue && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                </button>
              );
            })}
          </nav>

          <main className="sf-panel-strong min-w-0 rounded-[2rem] p-6">
            {configIssues.length > 0 && (
              <div className="mb-6 rounded-[1.4rem] border border-rose-300/55 bg-rose-100/72 p-4">
                <div className="mb-2 flex items-center gap-2 text-rose-900">
                  <AlertTriangle className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">{t("dashboard:config_issues")}</h2>
                </div>
                <p className="mb-3 text-sm text-rose-800/80">{t("dashboard:config_issues_hint")}</p>
                <ul className="space-y-1.5">
                  {configIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-rose-800/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      {t(`dashboard:${issue.label}`)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Suspense fallback={sectionFallback}>
              {activeSection === "agent" && <AgentConfigTab visible />}
              {activeSection === "providers" && <ProviderSection />}
              {activeSection === "media" && <MediaModelSection />}
              {activeSection === "usage" && <UsageStatsSection />}
              {activeSection === "api-keys" && (
                <div className="p-2">
                  <ApiKeysTab />
                </div>
              )}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
