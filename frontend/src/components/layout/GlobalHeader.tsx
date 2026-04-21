import { startTransition, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Activity, Settings, Bell, Download, Loader2, ServerCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/app-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useTasksStore } from "@/stores/tasks-store";
import { useUsageStore, type UsageStats } from "@/stores/usage-store";
import { useAuthStore } from "@/stores/auth-store";
import { buildProjectSettingsRoute } from "@/utils/project-routes";
import { TaskHud } from "@/components/task-hud/TaskHud";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { UsageDrawer } from "./UsageDrawer";
import { WorkspaceNotificationsDrawer } from "./WorkspaceNotificationsDrawer";
import { ExportScopeDialog } from "./ExportScopeDialog";

import { API } from "@/api";
import { ArchiveDiagnosticsDialog } from "@/components/shared/ArchiveDiagnosticsDialog";
import type { ExportDiagnostics, WorkspaceNotification } from "@/types";

/** 通过隐藏 <a> 触发浏览器下载，避免 window.open 产生空白标签页 */
function triggerBrowserDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

const PHASES = [
  { key: "setup" },
  { key: "worldbuilding" },
  { key: "scripting" },
  { key: "production" },
  { key: "completed" },
] as const;

type PhaseKey = (typeof PHASES)[number]["key"];

// ---------------------------------------------------------------------------
// PhaseStepper — horizontal workflow indicator
// ---------------------------------------------------------------------------

function PhaseStepper({
  currentPhase,
}: {
  currentPhase: string | undefined;
}) {
  const { t } = useTranslation();
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <nav className="flex items-center gap-1" aria-label={t("dashboard:workflow_phases")}>
      {PHASES.map((phase, idx) => {
        const isCompleted = currentIdx > idx;
        const isCurrent = currentIdx === idx;

        // Determine colors
        let circleClass =
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shrink-0 transition-colors";
        let labelClass = "text-xs whitespace-nowrap transition-colors";

        if (isCompleted) {
          circleClass += " bg-emerald-500 text-white";
          labelClass += " text-emerald-700";
        } else if (isCurrent) {
          circleClass += " bg-sky-500 text-white";
          labelClass += " text-sky-700 font-medium";
        } else {
          circleClass += " bg-slate-200 text-slate-500";
          labelClass += " text-slate-400";
        }

        return (
          <div key={phase.key} className="flex items-center gap-1">
            {/* Connector line (before each step except the first) */}
            {idx > 0 && (
              <div
                className={`h-px w-4 shrink-0 ${
                  isCompleted ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}

            {/* Step circle + label */}
            <div className="flex items-center gap-1.5">
              <span className={circleClass}>{idx + 1}</span>
              <span className={labelClass}>{t(phase.key)}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// GlobalHeader
// ---------------------------------------------------------------------------

interface GlobalHeaderProps {
  onNavigateBack?: () => void;
}

export function GlobalHeader({ onNavigateBack }: GlobalHeaderProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { currentProjectData, currentProjectName } = useProjectsStore();
  const { stats } = useTasksStore();
  const { taskHudOpen, setTaskHudOpen, triggerScrollTo, markWorkspaceNotificationRead } =
    useAppStore();
  const { stats: usageStats, setStats: setUsageStats } = useUsageStore();
  const [usageDrawerOpen, setUsageDrawerOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [exportingProject, setExportingProject] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [jianyingExporting, setJianyingExporting] = useState(false);
  const [exportDiagnostics, setExportDiagnostics] = useState<ExportDiagnostics | null>(null);
  const usageAnchorRef = useRef<HTMLDivElement>(null);
  const notificationAnchorRef = useRef<HTMLDivElement>(null);
  const taskHudAnchorRef = useRef<HTMLDivElement>(null);
  const exportAnchorRef = useRef<HTMLDivElement>(null);
  const isConfigComplete = useConfigStatusStore((s) => s.isComplete);
  const fetchConfigStatus = useConfigStatusStore((s) => s.fetch);
  const workspaceNotifications = useAppStore((s) => s.workspaceNotifications);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const currentPhase = currentProjectData?.status?.current_phase;
  const contentMode = currentProjectData?.content_mode;
  const runningCount = stats.running + stats.queued;
  const displayProjectTitle =
    currentProjectData?.title?.trim() || currentProjectName || t("no_project_selected");
  const unreadNotificationCount = workspaceNotifications.filter((item) => !item.read).length;
  const isAdmin = user?.role === "admin";
  const projectSettingsLabel = t("dashboard:project_settings", { defaultValue: "Project Settings" });
  const globalConfigLabel =
    user?.role === "admin"
      ? t("dashboard:global_model_config", { defaultValue: "Global Model Config" })
      : t("dashboard:account_settings", { defaultValue: "Account Settings" });

  // 加载费用统计数据（任务完成时自动刷新）
  const completedTaskCount = stats.succeeded + stats.failed;
  useEffect(() => {
    API.getUsageStats(currentProjectName ? { projectName: currentProjectName } : {})
      .then((res) => {
        setUsageStats(res as unknown as UsageStats);
      })
      .catch(() => {});
  }, [currentProjectName, completedTaskCount, setUsageStats]);

  useEffect(() => {
    void fetchConfigStatus();
  }, [fetchConfigStatus]);


  // Format content mode badge text
  const modeBadgeText =
    contentMode === "drama" ? t("dashboard:mode_badge_drama") : t("dashboard:mode_badge_narration");

  // Format cost display – show multi-currency summary
  const costByCurrency = usageStats?.cost_by_currency ?? {};
  const costText = Object.entries(costByCurrency)
    .filter(([, v]) => v > 0)
    .map(([currency, amount]) => `${currency === "CNY" ? "¥" : "$"}${amount.toFixed(2)}`)
    .join(" + ") || "$0.00";

  const handleNotificationNavigate = (notification: WorkspaceNotification) => {
    if (!notification.target) return;
    const target = notification.target;

    markWorkspaceNotificationRead(notification.id);
    setNotificationDrawerOpen(false);
    startTransition(() => {
      setLocation(target.route);
    });
    triggerScrollTo({
      type: target.type,
      id: target.id,
      route: target.route,
      highlight_style: target.highlight_style ?? "flash",
      expires_at: Date.now() + 3000,
    });
  };

  const handleJianyingExport = async (episode: number, draftPath: string, jianyingVersion: string) => {
    if (!currentProjectName || jianyingExporting) return;

    setJianyingExporting(true);
    try {
      const { download_token } = await API.requestExportToken(currentProjectName, "current");
      const url = API.getJianyingDraftDownloadUrl(
        currentProjectName, episode, draftPath, download_token, jianyingVersion,
      );
      triggerBrowserDownload(url);
      setExportDialogOpen(false);
      useAppStore.getState().pushToast(t("dashboard:jianying_export_started"), "success");
    } catch (err) {
      useAppStore.getState().pushToast(t("dashboard:jianying_export_failed", { message: (err as Error).message }), "error");
    } finally {
      setJianyingExporting(false);
    }
  };

  const handleExportProject = async (scope: "current" | "full") => {
    if (!currentProjectName || exportingProject) return;

    setExportDialogOpen(false);
    setExportingProject(true);
    try {
      const { download_token, diagnostics } = await API.requestExportToken(currentProjectName, scope);
      const url = API.getExportDownloadUrl(currentProjectName, download_token, scope);
      triggerBrowserDownload(url);
      const diagnosticCount =
        diagnostics.blocking.length + diagnostics.auto_fixed.length + diagnostics.warnings.length;
      if (diagnosticCount > 0) {
        setExportDiagnostics(diagnostics);
        useAppStore.getState().pushToast(
          t("dashboard:project_zip_download_started_with_diagnostics", { count: diagnosticCount }),
          "warning",
        );
      } else {
        useAppStore.getState().pushToast(t("dashboard:project_zip_download_started"), "success");
      }
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(t("dashboard:export_failed", { message: (err as Error).message }), "error");
    } finally {
      setExportingProject(false);
    }
  };

  return (
    <>
    <header className="storyforge-workspace-header flex min-h-[4.4rem] shrink-0 items-center justify-between rounded-[1.8rem] px-5 py-3">
      {/* ---- Left section ---- */}
      <div className="flex min-w-0 items-center gap-4">
        {/* Logo */}
        <BrandLogo alt={t("dashboard:app_title")} variant="mark" className="h-10 w-10" />

        {/* Back to projects */}
        <button
          type="button"
          onClick={onNavigateBack}
          className="storyforge-rail-button flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5"
          aria-label={t("dashboard:projects")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("dashboard:projects")}</span>
        </button>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-[rgba(117,132,159,0.18)] lg:block" />

        {/* Project name */}
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
            Storyforge Workspace
          </div>
          <span className="block max-w-56 truncate text-sm font-semibold text-[var(--sf-text)]">
            {displayProjectTitle}
          </span>
        </div>

        {/* Content mode badge */}
        {contentMode && (
          <span className="rounded-full bg-[rgba(24,151,214,0.08)] px-3 py-1 text-xs font-medium text-[var(--sf-blue-strong)]">
            {modeBadgeText}
          </span>
        )}
      </div>

      {/* ---- Center section ---- */}
      <div className="hidden xl:flex">
        <PhaseStepper currentPhase={currentPhase} />
      </div>

      {/* ---- Right section ---- */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={notificationAnchorRef}>
          <button
            type="button"
            onClick={() => setNotificationDrawerOpen(!notificationDrawerOpen)}
            className={`relative flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition ${
              notificationDrawerOpen
                ? "border border-amber-300/60 bg-amber-100 text-amber-900"
                : "storyforge-rail-button"
            }`}
            title={t("dashboard:notification_tooltip", { count: workspaceNotifications.length })}
            aria-label={t("dashboard:open_notification_center")}
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-white">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </button>
          <WorkspaceNotificationsDrawer
            open={notificationDrawerOpen}
            onClose={() => setNotificationDrawerOpen(false)}
            anchorRef={notificationAnchorRef}
            onNavigate={handleNotificationNavigate}
          />
        </div>

        {/* Cost badge + UsageDrawer */}
        <div className="relative" ref={usageAnchorRef}>
          <button
            type="button"
            onClick={() => setUsageDrawerOpen(!usageDrawerOpen)}
            className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition ${
              usageDrawerOpen
                ? "border border-sky-300/60 bg-sky-100 text-sky-900"
                : "storyforge-rail-button"
            }`}
            title={t("dashboard:cost_tooltip", { cost: costText })}
          >
            <span className="font-mono tabular-nums">{costText}</span>
          </button>
          <UsageDrawer
            open={usageDrawerOpen}
            onClose={() => setUsageDrawerOpen(false)}
            projectName={currentProjectName}
            anchorRef={usageAnchorRef}
          />
        </div>

        {/* Task radar + TaskHud popover */}
        <div className="relative" ref={taskHudAnchorRef}>
          <button
            type="button"
            onClick={() => setTaskHudOpen(!taskHudOpen)}
            className={`relative rounded-full p-2.5 transition ${
              taskHudOpen
                ? "border border-sky-300/60 bg-sky-100 text-sky-900"
                : "storyforge-rail-button"
            }`}
            title={t("dashboard:task_status_tooltip", { running: stats.running, queued: stats.queued })}
            aria-label={t("dashboard:toggle_task_panel")}
          >
            <Activity
              className={`h-4 w-4 ${runningCount > 0 ? "animate-pulse" : ""}`}
            />
            {/* Running task count badge */}
            {runningCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sf-blue)] px-1 text-[10px] font-bold text-white">
                {runningCount}
              </span>
            )}
          </button>
          <TaskHud anchorRef={taskHudAnchorRef} />
        </div>


        <div className="relative" ref={exportAnchorRef}>
          <button
            type="button"
            onClick={() => setExportDialogOpen(!exportDialogOpen)}
            disabled={!currentProjectName || exportingProject}
            className="storyforge-rail-button inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            title={t("dashboard:export_project_zip")}
            aria-label={t("dashboard:export_project_zip")}
          >
            {exportingProject ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden lg:inline">
              {exportingProject ? t("dashboard:exporting_zip") : t("dashboard:export_zip")}
            </span>
          </button>
          <ExportScopeDialog
            open={exportDialogOpen}
            onClose={() => setExportDialogOpen(false)}
            onSelect={(scope) => { if (scope !== "jianying-draft") void handleExportProject(scope); }}
            anchorRef={exportAnchorRef}
            episodes={currentProjectData?.episodes ?? []}
            onJianyingExport={handleJianyingExport}
            jianyingExporting={jianyingExporting}
          />
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setLocation("/app/admin")}
            className="storyforge-rail-button relative inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5"
            title={globalConfigLabel}
            aria-label={globalConfigLabel}
          >
            <ServerCog className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{globalConfigLabel}</span>
            {!isConfigComplete && (
              <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-rose-500" aria-label={t("dashboard:config_incomplete")} />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setLocation("/app/account")}
          className="storyforge-rail-button rounded-full px-4 py-2 text-xs font-medium transition hover:-translate-y-0.5"
          title={user?.display_name || user?.username || t("auth:account_settings")}
        >
          {user?.display_name || user?.username || t("auth:account_settings")}
        </button>

        <button
          type="button"
          onClick={() =>
            setLocation(
              currentProjectName
                ? buildProjectSettingsRoute(currentProjectName)
                : isAdmin
                  ? "/app/admin"
                  : "/app/account",
            )
          }
          className="storyforge-rail-button relative rounded-full p-2.5 transition hover:-translate-y-0.5"
          title={projectSettingsLabel}
          aria-label={projectSettingsLabel}
        >
          <Settings className="h-4 w-4" />
          {!isConfigComplete && !currentProjectName && isAdmin && (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-rose-500" aria-label={t("dashboard:config_incomplete")} />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            logout();
            setLocation("/login");
          }}
          className="rounded-full border border-rose-300/55 bg-rose-100/72 px-4 py-2 text-xs font-medium text-rose-900 transition hover:-translate-y-0.5"
        >
          {t("auth:logout")}
        </button>


      </div>
    </header>

    {exportDiagnostics !== null && (
      <ArchiveDiagnosticsDialog
        title={t("dashboard:export_diagnostics_title")}
        description={t("dashboard:export_diagnostics_description")}
        sections={[
          { key: "blocking", title: t("dashboard:diagnostics_blocking"), tone: "border-red-400/25 bg-red-500/10 text-red-100", items: exportDiagnostics.blocking },
          { key: "auto_fixed", title: t("dashboard:diagnostics_auto_fixed"), tone: "border-indigo-400/25 bg-indigo-500/10 text-indigo-100", items: exportDiagnostics.auto_fixed },
          { key: "warnings", title: t("dashboard:diagnostics_warnings"), tone: "border-amber-400/25 bg-amber-500/10 text-amber-100", items: exportDiagnostics.warnings },
        ]}
        onClose={() => setExportDiagnostics(null)}
      />
    )}
    </>
  );
}
