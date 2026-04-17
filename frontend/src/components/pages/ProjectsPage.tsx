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

function ProjectCard({ project, onDelete }: { project: ProjectSummary; onDelete: () => void }) {
  const { t } = useTranslation(["dashboard"]);
  const [, navigate] = useLocation();
  const phaseLabels = usePhaseLabels();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);

  const status = project.status;
  const hasStatus = status && "current_phase" in status;
  const projectStatus = hasStatus ? (status as ProjectStatus) : null;
  const phaseLabel = projectStatus ? phaseLabels[projectStatus.current_phase] ?? projectStatus.current_phase : "准备中";
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
      className="group relative flex cursor-pointer flex-col gap-4 rounded-[28px] border border-gray-800 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(8,12,24,0.98))] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-[0_28px_60px_rgba(15,23,42,0.28)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
              {phaseLabel}
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[11px] text-gray-400">
              {project.style || t("dashboard:style_not_set")}
            </span>
          </div>
          <div>
            <h3 className="truncate text-lg font-semibold text-white">{project.title}</h3>
            <p className="mt-1 text-sm text-gray-400">
              {summary?.total
                ? `共 ${summary.total} 集，已完成 ${summary.completed} 集，仍可继续追加分镜与视频。`
                : "项目已建立，可以继续补齐人物、线索和分镜资产。"}
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
          className="rounded-full border border-white/8 bg-white/5 p-2 text-gray-400 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white"
        >
          <EllipsisVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-gray-900/80">
          {project.thumbnail ? (
            <img
              src={project.thumbnail}
              alt={project.title}
              className="h-full min-h-[190px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            />
          ) : (
            <div className="flex min-h-[190px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_48%),linear-gradient(180deg,rgba(17,24,39,0.96),rgba(10,14,28,1))]">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <FolderOpen className="h-10 w-10" />
                <span className="text-sm">等待首张封面或分镜画面</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">故事阶段</div>
            <div className="mt-2 text-2xl font-semibold text-white">{progress}%</div>
            <div className="mt-1 text-sm text-gray-400">{phaseLabel}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">资产覆盖</div>
            <div className="mt-2 text-2xl font-semibold text-white">{formatStat(assetCompleted, assetTotal)}</div>
            <div className="mt-1 text-sm text-gray-400">
              角色 {formatStat(characters?.completed, characters?.total)} · 线索 {formatStat(clues?.completed, clues?.total)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">集数产出</div>
            <div className="mt-2 text-2xl font-semibold text-white">{formatStat(summary?.completed, summary?.total)}</div>
            <div className="mt-1 text-sm text-gray-400">
              剧本 {formatStat(summary?.scripted, summary?.total)} · 制作中 {summary?.in_production ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>当前制作进度</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} barClassName="bg-indigo-500" />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {summary?.scripted
            ? `最近状态：已写完 ${summary.scripted} 集剧本，继续推进剩余制作。`
            : "最近状态：项目还在早期阶段，适合继续补齐世界观和分镜。"}
        </span>
        <span className="font-medium text-indigo-200 transition-colors group-hover:text-indigo-100">
          继续项目
        </span>
      </div>

      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={menuAnchorRef}
        width="w-44"
        align="end"
        className="rounded-2xl border border-gray-700 py-1 shadow-xl"
      >
        <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-gray-800"
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
  return (
    <section className="space-y-6 rounded-[32px] border border-gray-800 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(8,12,24,0.98))] p-8 shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
          <Sparkles className="h-3.5 w-3.5" />
          Creator Starter Flow
        </div>
        <h2 className="text-3xl font-semibold text-white">从小说种子开始，或先建一个视频项目。</h2>
        <p className="max-w-2xl text-base leading-7 text-gray-400">
          叙影工场的主路径是“小说 → 分镜 → 视频”。如果你已经有故事设定，就先去小说工坊；如果你已经有现成 IP 或脚本，也可以直接建项目继续做视觉资产。
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <button
          type="button"
          aria-label="启动小说工坊"
          onClick={onStartNovel}
          className="group rounded-[28px] border border-indigo-400/30 bg-[linear-gradient(180deg,rgba(79,70,229,0.18),rgba(29,38,84,0.35))] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-300/45"
        >
          <div className="flex items-center gap-3 text-indigo-200">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">从小说开始</span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-white">启动小说工坊</h3>
          <p className="mt-3 text-sm leading-6 text-indigo-100/80">
            输入标题和 seed，先自动生成世界观、人物、章节，再把成稿导回项目空间继续做分镜和视频。
          </p>
          <div className="mt-6 text-sm font-medium text-indigo-100">进入小说工坊</div>
        </button>

        <button
          type="button"
          aria-label="创建第一个项目"
          onClick={onCreateProject}
          className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.42))] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-white/20"
        >
          <div className="flex items-center gap-3 text-sky-200">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">直接做视频项目</span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-white">创建第一个项目</h3>
          <p className="mt-3 text-sm leading-6 text-gray-300">
            如果你已经有世界观、人物设定或现成脚本，可以直接建项目，配置模型、上传素材，然后继续做分镜和视频生成。
          </p>
          <div className="mt-6 text-sm font-medium text-sky-100">创建项目</div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-gray-400">
        <Upload className="h-4 w-4 text-gray-500" />
        <span>已有旧项目或备份包？可以直接导入 ZIP 继续工作。</span>
        <button
          type="button"
          onClick={onImportZip}
          className="inline-flex items-center gap-2 rounded-full border border-gray-700 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:text-white"
        >
          <Upload className="h-4 w-4" />
          导入 ZIP
        </button>
      </div>
    </section>
  );
}

export function ProjectsPage() {
  const { t } = useTranslation(["common", "dashboard", "auth"]);
  const [, navigate] = useLocation();
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
        `${t("dashboard:delete_failed")}[${deletingProject.title}] ${(error as Error).message}`,
        "warning",
      );
    } finally {
      setDeleteLoading(false);
      setDeletingProject(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-950/85 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo
              alt={t("dashboard:app_title")}
              className="h-14 w-auto max-w-[11rem] rounded-2xl bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.22)]"
            />
            <div className="h-12 w-px bg-gray-800" />
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500">{t("dashboard:app_subtitle")}</p>
              <h1 className="text-2xl font-semibold text-white">{t("dashboard:projects")}</h1>
              <p className="text-sm text-gray-400">在这里管理你的故事资产、分镜进度和视频项目。</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importingProject}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importingProject ? t("dashboard:importing") : t("dashboard:import_zip")}
            </button>

            <button
              type="button"
              onClick={() => navigate("/app/novel-workbench")}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/20"
            >
              <BookOpen className="h-4 w-4" />
              小说工坊
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              {t("dashboard:create_project")}
            </button>

            <div className="ml-0 flex items-center gap-1 border-l border-gray-800 pl-3 xl:ml-1">
              <button
                type="button"
                onClick={() => navigate("/app/account")}
                className="rounded-md px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                title={user?.display_name || user?.username || t("auth:account_settings")}
              >
                {user?.display_name || user?.username || t("auth:account_settings")}
              </button>

              <button
                type="button"
                onClick={() => setShowOpenClaw(true)}
                className="rounded-md px-2.5 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
                title="OpenClaw 集成"
                aria-label="OpenClaw 集成指南"
              >
                🐾
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate("/app/admin")}
                  className="relative rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
                  title="管理控制台"
                  aria-label="管理控制台"
                >
                  <Settings className="h-4 w-4" />
                  {!isConfigComplete && (
                    <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-rose-500" aria-label={t("dashboard:config_incomplete")} />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="rounded-md px-2.5 py-1.5 text-sm text-rose-200 transition-colors hover:bg-rose-500/10 hover:text-rose-100"
              >
                {t("auth:logout")}
              </button>
            </div>
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

      <main className="mx-auto max-w-7xl px-6 py-8">
        {projectsLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-400" />
            {t("dashboard:loading_projects")}
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjectsState
            onStartNovel={() => navigate("/app/novel-workbench")}
            onCreateProject={() => setShowCreateModal(true)}
            onImportZip={() => importInputRef.current?.click()}
          />
        ) : (
          <div className="space-y-6">
            <section className="rounded-[28px] border border-gray-800 bg-[linear-gradient(180deg,rgba(17,24,39,0.84),rgba(8,12,24,0.96))] p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-gray-500">Storyforge Studio</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">继续推进你的故事 IP 资产。</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                    先在小说工坊生成故事，再回到项目里补齐人物、线索、分镜和视频；也可以直接在现有项目上继续推进制作。
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  当前共 <span className="font-medium text-white">{projects.length}</span> 个项目
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.name} project={project} onDelete={() => setDeletingProject(project)} />
              ))}
            </div>
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
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-100">{t("dashboard:delete_project")}</h2>
                <p className="text-sm leading-6 text-gray-400">
                  {t("dashboard:confirm_delete_project", { title: deletingProject.title })}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                disabled={deleteLoading}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
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
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-100">{t("dashboard:duplicate_project_id")}</h2>
            <p className="text-sm leading-6 text-gray-400">
              {t("dashboard:id_intended_hint")}
              <span className="mx-1 rounded bg-gray-800 px-1.5 py-0.5 font-mono text-gray-200">{projectName}</span>
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
            className="flex w-full items-center justify-between rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-left text-sm text-red-100 transition-colors hover:border-red-300/40 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="flex w-full items-center justify-between rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-4 py-3 text-left text-sm text-indigo-100 transition-colors hover:border-indigo-300/40 hover:bg-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-medium">{t("dashboard:auto_rename_import")}</span>
              <span className="mt-1 block text-xs text-indigo-200/80">{t("dashboard:rename_hint")}</span>
            </span>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={importing}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("common:cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
