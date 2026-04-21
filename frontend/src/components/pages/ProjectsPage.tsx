import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  BookOpen,
  EllipsisVertical,
  FolderOpen,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { API } from "@/api";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ArchiveDiagnosticsDialog } from "@/components/shared/ArchiveDiagnosticsDialog";
import { Popover } from "@/components/ui/Popover";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { useProjectsStore } from "@/stores/projects-store";
import type {
  ImportConflictPolicy,
  ImportFailureDiagnostics,
  ProjectStatus,
  ProjectSummary,
} from "@/types";

import { CreateProjectModal } from "./CreateProjectModal";
import { OpenClawModal } from "./OpenClawModal";

const PROJECTS_COPY = {
  en: {
    heroEyebrow: "Creator home",
    heroTitle: "Start with the story, then come back here to turn it into production.",
    heroBody:
      "Use the novel workbench when you need to expand a seed into a full narrative. Return to the project library when you are ready to shape character kits, clue systems, storyboards, and video output.",
    heroNoteTitle: "Two clear entry points",
    heroNoteBody:
      "If the story skeleton is still moving, go to the novel workbench first. If the IP is already stable, create or import a project and keep shipping visuals.",
    primaryAction: "Open Novel Workbench",
    secondaryAction: "Create Project",
    tertiaryAction: "Import ZIP",
    statsEyebrow: "Studio pulse",
    totalProjects: "Projects",
    activeProjects: "In progress",
    scriptedEpisodes: "Scripted episodes",
    productionEpisodes: "In production",
    focusEyebrow: "Recommended next move",
    focusTitle: "Keep momentum instead of reorganizing tools.",
    focusBody: "The fastest path is still story to storyboard to video. These shortcuts keep that sequence visible.",
    focusContinue: "Resume library",
    focusImport: "Bring in archived work",
    focusImportBody: "Import a ZIP backup or a previous IP package without rebuilding it from scratch.",
    focusOpenClaw: "OpenClaw guide",
    focusOpenClawBody: "Use the integration guide when you need external tooling access, not as a primary navigation icon.",
    libraryEyebrow: "Project library",
    libraryTitle: "Continue shaping your story IP.",
    libraryBody:
      "Every card keeps the next useful signal visible: current phase, asset coverage, episode output, and the fastest way back into the work.",
    storyPhase: "Story Phase",
    assetCoverage: "Asset Coverage",
    episodeOutput: "Episode Output",
    currentProgress: "Current production progress",
    waitCover: "Waiting for a cover or storyboard still",
    continueProject: "Continue",
    emptyEyebrow: "Creator Starter Flow",
    emptyTitle: "Start from a novel seed, or create a video project first.",
    emptyBody:
      "Storyforge works best as novel to storyboard to video. If you are still shaping the story, start in the novel workbench; if the IP already exists, create a project directly and continue with visual assets.",
    startFromNovel: "Start from Novel",
    startNovelTitle: "Open the novel workbench",
    startNovelBody:
      "Bring in a title and a seed. The workbench can grow worldbuilding, character arcs, chapter structure, and then hand the result back to the project space.",
    startNovelAction: "Enter the workbench",
    startProject: "Start from Project",
    startProjectTitle: "Create your first project",
    startProjectBody:
      "If the story world, script, or IP package is already in place, go straight into a project and continue building storyboards, assets, and video output.",
    startProjectAction: "Create project",
    importBody: "Already have a backup or older project? Import a ZIP package and keep working.",
    importAction: "Import ZIP",
    loading: "Loading projects list...",
    readyLabel: "Ready to continue",
  },
  zh: {
    heroEyebrow: "Creator home",
    heroTitle: "先把故事推进下去，再回到这里完成资产制作。",
    heroBody:
      "当你需要把 seed 扩写成长篇叙事时，先进入小说工坊；当故事骨架稳定下来，再回到项目库继续做角色、线索、分镜和视频。",
    heroNoteTitle: "两个清晰入口",
    heroNoteBody:
      "如果故事结构还在变化，先去小说工坊；如果 IP 已经成型，就直接创建或导入项目，继续推进视觉制作。",
    primaryAction: "进入小说工坊",
    secondaryAction: "创建项目",
    tertiaryAction: "导入 ZIP",
    statsEyebrow: "Studio pulse",
    totalProjects: "项目数",
    activeProjects: "进行中",
    scriptedEpisodes: "已写集数",
    productionEpisodes: "制作中",
    focusEyebrow: "建议下一步",
    focusTitle: "别在工具之间打转，继续推进主路径。",
    focusBody: "最快的路径仍然是“小说 → 分镜 → 视频”。这些快捷入口只保留最该先做的动作。",
    focusContinue: "继续项目库",
    focusImport: "导入旧项目",
    focusImportBody: "把 ZIP 备份或既有 IP 包直接导入，不必重复搭建。",
    focusOpenClaw: "OpenClaw 指南",
    focusOpenClawBody: "需要外部工具集成时再打开说明，不再用 emoji 作为主入口。",
    libraryEyebrow: "项目库",
    libraryTitle: "继续推进你的故事 IP。",
    libraryBody: "每张卡片都只保留真正有用的信号：当前阶段、资产覆盖、集数产出，以及回到工作现场的最快入口。",
    storyPhase: "故事阶段",
    assetCoverage: "资产覆盖",
    episodeOutput: "集数产出",
    currentProgress: "当前制作进度",
    waitCover: "等待首张封面或分镜画面",
    continueProject: "继续项目",
    emptyEyebrow: "Creator Starter Flow",
    emptyTitle: "从小说种子开始，或先建一个视频项目。",
    emptyBody:
      "叙影工场的主路径是“小说 → 分镜 → 视频”。如果你还在搭故事骨架，先去小说工坊；如果你已经有现成 IP、设定或脚本，也可以直接建项目继续做视觉资产。",
    startFromNovel: "从小说开始",
    startNovelTitle: "启动小说工坊",
    startNovelBody:
      "输入标题和 seed，先自动生成世界观、人物、章节，再把成果导回项目空间继续做分镜和视频。",
    startNovelAction: "进入小说工坊",
    startProject: "直接做视频项目",
    startProjectTitle: "创建第一个项目",
    startProjectBody:
      "如果你已经有世界观、人物设定或现成脚本，可以直接建项目，配置模型、上传素材，然后继续做分镜和视频生成。",
    startProjectAction: "创建项目",
    importBody: "已有旧项目或备份包？可以直接导入 ZIP 继续工作。",
    importAction: "导入 ZIP",
    loading: "加载项目列表...",
    readyLabel: "可继续推进",
  },
} as const;

type ProjectsLocale = keyof typeof PROJECTS_COPY;

function useProjectsLocale(): ProjectsLocale {
  const { i18n } = useTranslation();
  return (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
}

function useProjectsPageCopy() {
  return PROJECTS_COPY[useProjectsLocale()];
}

function usePhaseLabels() {
  const { t, i18n } = useTranslation();
  return useMemo(
    () =>
      ({
        setup: t("setup"),
        worldbuilding: t("worldbuilding"),
        scripting: t("scripting"),
        production: t("production"),
        completed: t("completed"),
      }) as Record<string, string>,
    [i18n.language, t],
  );
}

function formatStat(current?: number, total?: number): string {
  if (!total) return "—";
  return `${current ?? 0}/${total}`;
}

function getProjectSummaryText(locale: ProjectsLocale, summary?: ProjectStatus["episodes_summary"]) {
  if (summary?.total) {
    return locale === "zh"
      ? `共 ${summary.total} 集，已完成 ${summary.completed} 集，仍可继续补齐分镜与视频。`
      : `${summary.completed} of ${summary.total} episodes are complete, with more storyboard and video work still open.`;
  }

  return locale === "zh"
    ? "项目已建立，可以继续补齐人物、线索和分镜资产。"
    : "The project is ready for more character, clue, and storyboard work.";
}

function getRecentStatusText(locale: ProjectsLocale, summary?: ProjectStatus["episodes_summary"]) {
  if (summary?.scripted) {
    return locale === "zh"
      ? `最近状态：已写完 ${summary.scripted} 集剧本，继续推进剩余制作。`
      : `Latest status: ${summary.scripted} episodes already scripted, with the remaining production still ahead.`;
  }

  return locale === "zh"
    ? "最近状态：项目仍在早期阶段，适合继续补齐世界观和分镜。"
    : "Latest status: the project is still early enough to refine worldbuilding and storyboard structure.";
}

function SurfaceMetric({
  label,
  value,
  detail,
  toneClass,
}: {
  label: string;
  value: string;
  detail: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-[-0.03em] text-white ${toneClass ?? ""}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-400">{detail}</div>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: ProjectSummary; onDelete: () => void }) {
  const { t } = useTranslation(["dashboard"]);
  const [, navigate] = useLocation();
  const phaseLabels = usePhaseLabels();
  const copy = useProjectsPageCopy();
  const locale = useProjectsLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);

  const status = project.status;
  const hasStatus = status && "current_phase" in status;
  const projectStatus = hasStatus ? (status as ProjectStatus) : null;
  const phaseLabel = projectStatus ? phaseLabels[projectStatus.current_phase] ?? projectStatus.current_phase : copy.readyLabel;
  const progress = projectStatus ? Math.round(projectStatus.phase_progress * 100) : 0;
  const characters = projectStatus?.characters;
  const clues = projectStatus?.clues;
  const summary = projectStatus?.episodes_summary;
  const assetCompleted = (characters?.completed ?? 0) + (clues?.completed ?? 0);
  const assetTotal = (characters?.total ?? 0) + (clues?.total ?? 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/app/projects/${project.name}`)}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget
          && (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          navigate(`/app/projects/${project.name}`);
        }
      }}
      className="group relative overflow-hidden rounded-[32px] border border-slate-800/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/35 hover:shadow-[0_32px_90px_rgba(2,6,23,0.48)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.14),transparent_30%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-100">
                {phaseLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
                {project.style || t("dashboard:style_not_set")}
              </span>
            </div>
            <div>
              <h3 className="truncate text-[1.35rem] font-semibold tracking-[-0.02em] text-white">{project.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {getProjectSummaryText(locale, summary)}
              </p>
            </div>
          </div>

          <button
            ref={menuAnchorRef}
            type="button"
            aria-label={t("dashboard:more_actions")}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((value) => !value);
            }}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <EllipsisVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_260px]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80">
            {project.thumbnail ? (
              <img
                src={project.thumbnail}
                alt={project.title}
                className="h-full min-h-[220px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
              />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,1))]">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <FolderOpen className="h-10 w-10" />
                  <span className="text-sm">{copy.waitCover}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <SurfaceMetric
              label={copy.storyPhase}
              value={`${progress}%`}
              detail={phaseLabel}
              toneClass="text-sky-100"
            />
            <SurfaceMetric
              label={copy.assetCoverage}
              value={formatStat(assetCompleted, assetTotal)}
              detail={`${t("dashboard:characters")} ${formatStat(characters?.completed, characters?.total)} · ${t("dashboard:clues")} ${formatStat(clues?.completed, clues?.total)}`}
            />
            <SurfaceMetric
              label={copy.episodeOutput}
              value={formatStat(summary?.completed, summary?.total)}
              detail={`${t("dashboard:episodes_scripted")} ${formatStat(summary?.scripted, summary?.total)} · ${t("dashboard:episodes_in_production")} ${summary?.in_production ?? 0}`}
            />
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{copy.currentProgress}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress} barClassName="bg-sky-500" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-400">{getRecentStatusText(locale, summary)}</span>
            <span className="font-medium text-sky-100 transition-colors group-hover:text-white">
              {copy.continueProject}
            </span>
          </div>
        </div>
      </div>

      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={menuAnchorRef}
        width="w-44"
        align="end"
        className="rounded-2xl border border-slate-700 py-1 shadow-xl"
      >
        <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-slate-800"
          >
            <Trash2 className="h-4 w-4" />
            {t("dashboard:delete_project")}
          </button>
        </div>
      </Popover>
    </div>
  );
}

function EmptyProjectsState({
  onStartNovel,
  onCreateProject,
  onImportZip,
}: {
  onStartNovel: () => void;
  onCreateProject: () => void;
  onImportZip: () => void;
}) {
  const { t } = useTranslation(["dashboard"]);
  const copy = useProjectsPageCopy();

  return (
    <section className="space-y-6 rounded-[32px] border border-slate-800/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-8 shadow-[0_30px_90px_rgba(2,6,23,0.4)]">
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-100">
          <Sparkles className="h-3.5 w-3.5" />
          {copy.emptyEyebrow}
        </div>
        <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-white">{copy.emptyTitle}</h2>
        <p className="max-w-2xl text-base leading-7 text-slate-400">{copy.emptyBody}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <button
          type="button"
          aria-label={copy.startNovelTitle}
          onClick={onStartNovel}
          className="group rounded-[28px] border border-sky-400/30 bg-[linear-gradient(180deg,rgba(14,165,233,0.16),rgba(12,74,110,0.34))] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300/45"
        >
          <div className="flex items-center gap-3 text-sky-100">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">{copy.startFromNovel}</span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-white">{copy.startNovelTitle}</h3>
          <p className="mt-3 text-sm leading-6 text-sky-100/82">{copy.startNovelBody}</p>
          <div className="mt-6 text-sm font-medium text-sky-50">{copy.startNovelAction}</div>
        </button>

        <button
          type="button"
          aria-label={t("dashboard:create_project")}
          onClick={onCreateProject}
          className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.42))] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-white/18"
        >
          <div className="flex items-center gap-3 text-indigo-100">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">{copy.startProject}</span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-white">{copy.startProjectTitle}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{copy.startProjectBody}</p>
          <div className="mt-6 text-sm font-medium text-indigo-100">{copy.startProjectAction}</div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-400">
        <Upload className="h-4 w-4 text-slate-500" />
        <span>{copy.importBody}</span>
        <button
          type="button"
          onClick={onImportZip}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
        >
          <Upload className="h-4 w-4" />
          {copy.importAction}
        </button>
      </div>
    </section>
  );
}

export function ProjectsPage() {
  const { t } = useTranslation(["common", "dashboard", "auth"]);
  const [, navigate] = useLocation();
  const copy = useProjectsPageCopy();
  const locale = useProjectsLocale();
  const { projects, projectsLoading, showCreateModal, setProjects, setProjectsLoading, setShowCreateModal } =
    useProjectsStore();

  const [importingProject, setImportingProject] = useState(false);
  const [conflictProject, setConflictProject] = useState<string | null>(null);
  const [conflictFile, setConflictFile] = useState<File | null>(null);
  const [importDiagnostics, setImportDiagnostics] = useState<ImportFailureDiagnostics | null>(null);
  const [showOpenClaw, setShowOpenClaw] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ProjectSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isConfigComplete = useConfigStatusStore((state) => state.isComplete);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = user?.role === "admin";

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const result = await API.listProjects();
      setProjects(result.projects);
    } finally {
      setProjectsLoading(false);
    }
  }, [setProjects, setProjectsLoading]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await doImport(file);
    event.target.value = "";
  };

  const doImport = async (file: File, policy: ImportConflictPolicy = "prompt") => {
    setImportingProject(true);
    try {
      const result = await API.importProject(file, policy);
      setConflictProject(null);
      setConflictFile(null);
      setImportDiagnostics(null);
      await fetchProjects();

      const autoFixedCount = result.diagnostics.auto_fixed.length;
      const warningCount = result.diagnostics.warnings.length;
      if (warningCount > 0 || autoFixedCount > 0) {
        useAppStore.getState().pushToast(
          autoFixedCount > 0
            ? t("dashboard:import_auto_fixed", { title: result.project.title || result.project_name, count: autoFixedCount })
            : t("dashboard:import_success", { title: result.project.title || result.project_name }),
          "success",
        );
      }
      navigate(`/app/projects/${result.project_name}`);
    } catch (error) {
      const importError = error as Error & {
        status?: number;
        conflict_project_name?: string;
        diagnostics?: ImportFailureDiagnostics;
      };

      if (importError.status === 409 && importError.conflict_project_name && policy === "prompt") {
        setConflictFile(file);
        setConflictProject(importError.conflict_project_name);
        return;
      }

      if (importError.diagnostics) {
        setImportDiagnostics(importError.diagnostics);
      } else {
        alert(`${t("dashboard:import_failed")}: ${importError.message}`);
      }
    } finally {
      setImportingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    setDeleteLoading(true);
    try {
      await API.deleteProject(deletingProject.name);
      await fetchProjects();
      useAppStore.getState().pushToast(t("common:deleted"), "success");
    } catch (error) {
      useAppStore.getState().pushToast(
        `${t("dashboard:delete_failed")} [${deletingProject.title}] ${(error as Error).message}`,
        "warning",
      );
    } finally {
      setDeleteLoading(false);
      setDeletingProject(null);
    }
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter((project) => {
    const status = project.status;
    return Boolean(status && "current_phase" in status && (status as ProjectStatus).current_phase !== "completed");
  }).length;
  const scriptedEpisodes = projects.reduce((sum, project) => {
    const status = project.status;
    if (!status || !("episodes_summary" in status)) return sum;
    return sum + ((status as ProjectStatus).episodes_summary?.scripted ?? 0);
  }, 0);
  const productionEpisodes = projects.reduce((sum, project) => {
    const status = project.status;
    if (!status || !("episodes_summary" in status)) return sum;
    return sum + ((status as ProjectStatus).episodes_summary?.in_production ?? 0);
  }, 0);
  const featuredProject = projects[0] ?? null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_32%),#020617] text-slate-100">
      <header className="px-6 pt-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[30px] border border-white/10 bg-slate-950/72 px-5 py-4 shadow-[0_20px_60px_rgba(2,6,23,0.28)] backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo
              alt={t("dashboard:app_title")}
              className="h-14 w-auto max-w-[11rem] rounded-2xl bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.22)]"
            />
            <div className="h-12 w-px bg-white/10" />
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{t("dashboard:app_subtitle")}</p>
              <h1 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-white">{t("dashboard:projects")}</h1>
              <p className="text-sm text-slate-400">
                {locale === "zh"
                  ? "把故事、资产和分镜进度收拢到同一个创作主页。"
                  : "Keep the story, assets, and storyboard progress inside one creator-focused home."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/app/account")}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              title={user?.display_name || user?.username || t("auth:account_settings")}
            >
              {user?.display_name || user?.username || t("auth:account_settings")}
            </button>

            <button
              type="button"
              onClick={() => setShowOpenClaw(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              title="OpenClaw"
              aria-label="OpenClaw"
            >
              <Sparkles className="h-4 w-4" />
              OpenClaw
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate("/app/admin")}
                className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                title={locale === "zh" ? "管理控制台" : "Admin Console"}
                aria-label={locale === "zh" ? "管理控制台" : "Admin Console"}
              >
                <Settings className="h-4 w-4" />
                {locale === "zh" ? "控制台" : "Console"}
                {!isConfigComplete && (
                  <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-rose-500" aria-label={t("dashboard:config_incomplete")} />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-full border border-rose-400/18 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition-colors hover:bg-rose-500/18"
            >
              {t("auth:logout")}
            </button>
          </div>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".zip,application/zip"
          aria-label={t("dashboard:import_project_file_aria")}
          onChange={handleImport}
          className="hidden"
        />
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {projectsLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-sky-400" />
            {copy.loading}
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjectsState
            onStartNovel={() => navigate("/app/novel-workbench")}
            onCreateProject={() => setShowCreateModal(true)}
            onImportZip={() => importInputRef.current?.click()}
          />
        ) : (
          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-8 shadow-[0_30px_90px_rgba(2,6,23,0.34)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.16),transparent_28%)]" />
                <div className="relative space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    {copy.heroEyebrow}
                  </div>

                  <div className="max-w-3xl space-y-3">
                    <h2 className="text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
                      {copy.heroTitle}
                    </h2>
                    <p className="max-w-2xl text-base leading-8 text-slate-300">{copy.heroBody}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => navigate("/app/novel-workbench")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      <BookOpen className="h-4 w-4" />
                      {copy.primaryAction}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      <Plus className="h-4 w-4" />
                      {copy.secondaryAction}
                    </button>
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      disabled={importingProject}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {importingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {importingProject ? t("dashboard:importing") : copy.tertiaryAction}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.heroNoteTitle}</div>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{copy.heroNoteBody}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => featuredProject && navigate(`/app/projects/${featuredProject.name}`)}
                      disabled={!featuredProject}
                      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-sky-400/30 hover:bg-white/[0.06] disabled:cursor-default disabled:hover:border-white/10"
                    >
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.focusContinue}</div>
                      <div className="mt-3 text-lg font-semibold tracking-[-0.02em] text-white">
                        {featuredProject
                          ? locale === "zh"
                            ? `继续 ${featuredProject.title}`
                            : `Resume ${featuredProject.title}`
                          : t("dashboard:no_projects")}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {featuredProject
                          ? getRecentStatusText(locale, "current_phase" in (featuredProject.status ?? {}) ? (featuredProject.status as ProjectStatus).episodes_summary : undefined)
                          : copy.focusBody}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="rounded-[32px] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.26)]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.statsEyebrow}</div>
                  <div className="mt-4 grid gap-3">
                    <SurfaceMetric label={copy.totalProjects} value={String(totalProjects)} detail={copy.libraryTitle} toneClass="text-sky-100" />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <SurfaceMetric label={copy.activeProjects} value={String(activeProjects)} detail={copy.readyLabel} />
                      <SurfaceMetric
                        label={copy.scriptedEpisodes}
                        value={String(scriptedEpisodes)}
                        detail={locale === "zh" ? "剧本推进" : "Script momentum"}
                      />
                    </div>
                    <SurfaceMetric label={copy.productionEpisodes} value={String(productionEpisodes)} detail={copy.currentProgress} />
                  </div>
                </section>

                <section className="rounded-[32px] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.26)]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.focusEyebrow}</div>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white">{copy.focusTitle}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{copy.focusBody}</p>

                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="w-full rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:bg-white/[0.07]"
                    >
                      <div className="text-sm font-medium text-white">{copy.focusImport}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-400">{copy.focusImportBody}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowOpenClaw(true)}
                      className="w-full rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:bg-white/[0.07]"
                    >
                      <div className="text-sm font-medium text-white">{copy.focusOpenClaw}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-400">{copy.focusOpenClawBody}</div>
                    </button>
                  </div>
                </section>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.26)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{copy.libraryEyebrow}</div>
                  <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-white">{copy.libraryTitle}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{copy.libraryBody}</p>
                </div>
                <div className="text-sm text-slate-400">
                  {locale === "zh"
                    ? <>当前共 <span className="font-medium text-white">{projects.length}</span> 个项目</>
                    : <>You currently have <span className="font-medium text-white">{projects.length}</span> projects</>}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.name} project={project} onDelete={() => setDeletingProject(project)} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {conflictProject && conflictFile && (
        <ConflictDialog
          projectName={conflictProject}
          importing={importingProject}
          onConfirm={(policy) => doImport(conflictFile, policy)}
          onCancel={() => {
            setConflictProject(null);
            setConflictFile(null);
          }}
        />
      )}

      {importDiagnostics && (
        <ArchiveDiagnosticsDialog
          title={t("dashboard:export_diagnostics")}
          description={t("dashboard:import_success_with_diagnostics")}
          sections={[
            {
              key: "blocking",
              title: t("dashboard:blocking_issues"),
              tone: "border-red-400/25 bg-red-500/10 text-red-100",
              items: importDiagnostics.blocking,
            },
            {
              key: "auto_fixed",
              title: t("dashboard:auto_fixed_issues"),
              tone: "border-indigo-400/25 bg-indigo-500/10 text-indigo-100",
              items: importDiagnostics.auto_fixable,
            },
            {
              key: "warnings",
              title: t("common:error"),
              tone: "border-amber-400/25 bg-amber-500/10 text-amber-100",
              items: importDiagnostics.warnings,
            },
          ]}
          onClose={() => setImportDiagnostics(null)}
        />
      )}

      {showOpenClaw && <OpenClawModal onClose={() => setShowOpenClaw(false)} />}
      {showCreateModal && <CreateProjectModal />}

      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-100">{t("dashboard:delete_project")}</h2>
                <p className="text-sm leading-6 text-slate-400">
                  {t("dashboard:confirm_delete_project", { title: deletingProject.title })}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                disabled={deleteLoading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleteLoading ? t("dashboard:deleting_project") : t("dashboard:delete_project")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConflictDialog({
  projectName,
  importing,
  onConfirm,
  onCancel,
}: {
  projectName: string;
  importing: boolean;
  onConfirm: (policy: "overwrite" | "rename") => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(["common", "dashboard"]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">{t("dashboard:duplicate_project_id")}</h2>
            <p className="text-sm leading-6 text-slate-400">
              {t("dashboard:id_intended_hint")}
              <span className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">{projectName}</span>
              {t("dashboard:already_exists_conflict_hint")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => onConfirm("overwrite")}
            disabled={importing}
            aria-label={t("dashboard:overwrite_existing")}
            className="flex w-full items-center justify-between rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-left text-sm text-red-100 transition-colors hover:border-red-300/40 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-medium">{t("dashboard:overwrite_existing")}</span>
              <span className="mt-1 block text-xs text-red-200/80">{t("dashboard:overwrite_hint")}</span>
            </span>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>

          <button
            type="button"
            onClick={() => onConfirm("rename")}
            disabled={importing}
            aria-label={t("dashboard:auto_rename_import")}
            className="flex w-full items-center justify-between rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-left text-sm text-sky-100 transition-colors hover:border-sky-300/40 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-medium">{t("dashboard:auto_rename_import")}</span>
              <span className="mt-1 block text-xs text-sky-200/80">{t("dashboard:rename_hint")}</span>
            </span>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={importing}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("common:cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
