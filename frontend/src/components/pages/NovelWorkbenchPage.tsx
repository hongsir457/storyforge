import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ServerCog,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { API } from "@/api";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import type {
  NovelWorkbenchArtifact,
  NovelWorkbenchArtifactContentResponse,
  NovelWorkbenchArtifactListResponse,
  NovelWorkbenchJob,
  NovelWorkbenchLogResponse,
  NovelWorkbenchStatus,
} from "@/types";

const WORKBENCH_COPY = {
  en: {
    back: "Back to Projects",
    eyebrow: "Novel studio",
    title: "Novel Workbench",
    subtitle:
      "Grow a seed into a long-form manuscript here, then hand the result back to Storyforge for storyboard and video production.",
    refresh: "Refresh",
    loading: "Loading novel workbench...",
    heroEyebrow: "Novel starter",
    heroTitle: "Start a full-length narrative from one seed.",
    heroBody:
      "This surface is only responsible for the novel itself. Visual format, shot rhythm, and production settings stay in the project workspace so the story entry point stays focused.",
    formTitle: "Novel title",
    titlePlaceholder: "Above the Mountain Gate",
    projectName: "Imported project slug",
    projectNamePlaceholder: "Optional. Auto-generated if left blank.",
    writingLanguage: "Writing language",
    writingLanguageZh: "Simplified Chinese",
    seedLabel: "Seed text",
    seedPlaceholder:
      "Describe the premise, the relationships, the world, or the inciting incident you want to expand into a long-form novel.",
    seedHint: "The system writes this text into seed.txt and launches the full autonovel pipeline.",
    submit: "Start novel pipeline",
    submitting: "Starting...",
    flowEyebrow: "Pipeline shape",
    flowTitle: "What this run will do",
    flowSteps: [
      "Capture the title and seed so the narrative starting point is explicit.",
      "Generate worldbuilding, character systems, chapter structure, and a stable long-form direction.",
      "Iterate until the workbench produces a finished manuscript and export package.",
      "Import the result back into Storyforge so storyboard and video production can continue.",
    ],
    readyEyebrow: "Run readiness",
    readyTitle: "Ready to create a new novel run",
    blockedTitle: "The pipeline is not ready yet",
    readyBody:
      "Core dependencies are available. After creation, the workbench will generate the narrative structure and an importable Storyforge project.",
    blockedBody: "Complete the missing required dependencies before starting a new novel run.",
    optionalBody: "Optional capabilities are still missing. They do not block the run, but they may limit later extensions.",
    latestEyebrow: "Latest completed run",
    latestAction: "Open imported project",
    latestEmpty: "Once a run finishes, its import target will appear here as the clearest next step.",
    pulseEyebrow: "Run snapshot",
    totalRuns: "Runs",
    activeRuns: "Active",
    successfulRuns: "Succeeded",
    artifactCount: "Artifacts",
    diagnosticsSummary: "Runtime prerequisites and diagnostics",
    diagnosticsToggle: "View runtime prerequisites and diagnostics",
    coreDependencies: "Core dependencies",
    optionalExtensions: "Optional extensions",
    workspaceRoot: "Workspace Root",
    autonovelSource: "autonovel Source",
    importerScript: "Importer Script",
    runtimeEnv: "Runtime Env",
    runHistoryEyebrow: "Run history",
    runHistoryTitle: "Every run preserves the seed, logs, artifacts, and import result.",
    runHistoryEmpty: "No runs yet. Start the first novel job from the composer above.",
    details: "View details",
    collapse: "Hide details",
    cancel: "Cancel",
    delete: "Delete",
    detailsEmpty: "Select a run to inspect the seed, workspace artifacts, and log stream.",
    stage: "Current stage",
    target: "Import target",
    openProject: "Open Project",
    deleteRecord: "Delete record",
    created: "Created",
    updated: "Updated",
    language: "Language",
    started: "Started",
    finished: "Finished",
    seedCard: "Seed",
    workspaceCard: "Workspace & Log",
    viewFullLog: "View full log",
    downloadLog: "Download log",
    downloadArtifact: "Download",
    exportWorkspace: "Export workspace ZIP",
    workspacePath: "Workspace Path",
    logFile: "Log File",
    fullLog: "Full Log",
    logTail: "Log Tail",
    liveRefreshing: "Live refresh",
    noLogsYet: "No logs yet.",
    truncatedLog: "Only the first 250 KB is shown in preview. Download the full log for the complete file.",
    artifactsTitle: "Workspace Artifacts",
    artifactsLoading: "Syncing artifacts",
    artifactsEmpty: "No artifacts are ready to browse yet.",
    previewTitle: "Artifact Preview",
    loadingPreview: "Loading preview...",
    previewTruncated: "The preview is truncated. Download the full file for the complete contents.",
    previewUnsupported: "This file type is not available inline. Download it directly.",
    previewEmpty: "Choose a previewable artifact to inspect it here, or download the entire workspace.",
    groupLabels: {
      inputs: "Inputs",
      planning: "Planning",
      chapters: "Chapters",
      export: "Export",
    },
    requirementLabels: {
      workspace_root_exists: "Workspace root",
      autonovel_repo_exists: "autonovel repo",
      importer_exists: "Importer script",
      autonovel_env_exists: "Runtime env",
      git_available: "git",
      uv_available: "uv",
    },
    statusLabels: {
      queued: "Queued",
      running: "Running",
      succeeded: "Succeeded",
      failed: "Failed",
      cancelled: "Cancelled",
    },
    createdToast: "Novel pipeline started.",
    cancelledToast: "Novel pipeline cancelled.",
    deleteActiveWarning: "Cancel the active run before deleting its record.",
    deletedToast: "Run record deleted.",
    confirmDelete: (title: string) => `Delete the run record "${title}"?`,
    artifactsSummary: (files: number, chapters: number) => `${files} files · ${chapters} chapters`,
    latestSummary: (finishedAt: string) => `Finished at ${finishedAt}. Continue in the imported project when you are ready for storyboards and video.`,
  },
  zh: {
    back: "返回项目",
    eyebrow: "Novel studio",
    title: "小说工坊",
    subtitle: "在这里把 seed 扩写成长篇小说，再把结果交回 Storyforge 继续做分镜与视频制作。",
    refresh: "刷新",
    loading: "正在加载小说工坊...",
    heroEyebrow: "Novel starter",
    heroTitle: "从一个 seed 启动完整长篇叙事。",
    heroBody:
      "这里只负责生成小说本体。画幅、镜头节奏、视觉风格与制作参数都留在项目空间，不再堆进小说入口。",
    formTitle: "小说标题",
    titlePlaceholder: "山门之上",
    projectName: "导入后的项目标识",
    projectNamePlaceholder: "可选，留空时自动生成。",
    writingLanguage: "写作语言",
    writingLanguageZh: "简体中文",
    seedLabel: "Seed 文案",
    seedPlaceholder: "输入你想扩展成长篇小说的核心设定、人物关系、世界观或故事起点。",
    seedHint: "系统会把这段文字写入 seed.txt，并触发完整的 autonovel 流水线。",
    submit: "启动小说流水线",
    submitting: "启动中...",
    flowEyebrow: "Pipeline shape",
    flowTitle: "这次运行会完成什么",
    flowSteps: [
      "记录标题和 seed，让故事起点足够明确。",
      "自动生成世界观、人物体系、章节结构与稳定的长篇方向。",
      "持续迭代直到产出完整小说与可导入包。",
      "把结果导回 Storyforge，继续推进分镜与视频制作。",
    ],
    readyEyebrow: "运行准备度",
    readyTitle: "可以启动新的小说任务",
    blockedTitle: "当前还不能启动小说流水线",
    readyBody: "主流程依赖已经齐备。创建完成后，系统会自动生成叙事结构，并准备可导入的 Storyforge 项目。",
    blockedBody: "先补齐缺失的必要依赖，再启动新的小说任务。",
    optionalBody: "可选能力尚未齐备。它们不会阻止运行，但可能影响后续扩展环节。",
    latestEyebrow: "最近完成",
    latestAction: "打开导入后的项目",
    latestEmpty: "任务完成后，这里会显示最清晰的下一步入口，方便你直接回到项目空间继续制作。",
    pulseEyebrow: "Run snapshot",
    totalRuns: "运行数",
    activeRuns: "活跃中",
    successfulRuns: "已完成",
    artifactCount: "产物数",
    diagnosticsSummary: "运行依赖与诊断信息",
    diagnosticsToggle: "查看运行环境与诊断",
    coreDependencies: "主流程依赖",
    optionalExtensions: "可选扩展",
    workspaceRoot: "工作目录",
    autonovelSource: "autonovel 源码",
    importerScript: "导入脚本",
    runtimeEnv: "运行环境",
    runHistoryEyebrow: "运行记录",
    runHistoryTitle: "每次运行都会保留 seed、日志、产物和导入结果。",
    runHistoryEmpty: "还没有运行记录。先从上面的表单发起第一条小说任务。",
    details: "查看详情",
    collapse: "收起详情",
    cancel: "取消",
    delete: "删除",
    detailsEmpty: "选择一条运行记录，查看 seed、产物目录和实时日志。",
    stage: "当前阶段",
    target: "导入目标",
    openProject: "打开项目",
    deleteRecord: "删除记录",
    created: "创建时间",
    updated: "更新时间",
    language: "写作语言",
    started: "启动时间",
    finished: "完成时间",
    seedCard: "Seed",
    workspaceCard: "Workspace & Log",
    viewFullLog: "查看完整日志",
    downloadLog: "下载日志",
    downloadArtifact: "下载",
    exportWorkspace: "导出工作区 ZIP",
    workspacePath: "工作区路径",
    logFile: "日志文件",
    fullLog: "完整日志",
    logTail: "日志尾部",
    liveRefreshing: "实时刷新",
    noLogsYet: "暂无日志。",
    truncatedLog: "当前只预览前 250 KB 日志，完整内容请使用“下载日志”。",
    artifactsTitle: "工作区产物",
    artifactsLoading: "同步产物",
    artifactsEmpty: "暂无可展示的工作区产物。",
    previewTitle: "产物预览",
    loadingPreview: "正在加载预览...",
    previewTruncated: "预览已截断，完整文件请使用下载。",
    previewUnsupported: "这个文件暂不支持内联预览，请直接下载。",
    previewEmpty: "选择一个可预览的产物查看内容，或直接下载整个工作区。",
    groupLabels: {
      inputs: "输入",
      planning: "规划",
      chapters: "章节",
      export: "导出",
    },
    requirementLabels: {
      workspace_root_exists: "工作目录",
      autonovel_repo_exists: "autonovel 仓库",
      importer_exists: "导入脚本",
      autonovel_env_exists: "运行环境",
      git_available: "git",
      uv_available: "uv",
    },
    statusLabels: {
      queued: "排队中",
      running: "运行中",
      succeeded: "已完成",
      failed: "失败",
      cancelled: "已取消",
    },
    createdToast: "小说流水线已启动。",
    cancelledToast: "小说流水线已取消。",
    deleteActiveWarning: "请先取消运行中的任务，再删除记录。",
    deletedToast: "运行记录已删除。",
    confirmDelete: (title: string) => `确认删除运行记录「${title}」吗？`,
    artifactsSummary: (files: number, chapters: number) => `${files} 个文件 · ${chapters} 个章节`,
    latestSummary: (finishedAt: string) => `已于 ${finishedAt} 完成。现在最合理的下一步，是回到导入后的项目继续推进分镜和视频。`,
  },
} as const;

type WorkbenchLocale = keyof typeof WORKBENCH_COPY;

function useWorkbenchLocale(): WorkbenchLocale {
  const { i18n } = useTranslation();
  return (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
}

function useWorkbenchCopy() {
  return WORKBENCH_COPY[useWorkbenchLocale()];
}

function RequirementChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
        ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function JobStatusBadge({
  status,
  locale,
}: {
  status: NovelWorkbenchJob["status"];
  locale: WorkbenchLocale;
}) {
  const className =
    status === "succeeded"
      ? "bg-emerald-500/12 text-emerald-700"
      : status === "failed"
        ? "bg-rose-500/12 text-rose-700"
        : status === "cancelled"
          ? "bg-slate-200 text-slate-700"
          : "bg-amber-500/12 text-amber-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {WORKBENCH_COPY[locale].statusLabels[status]}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(117,132,159,0.18)] bg-white/82 p-4 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--sf-text)]">{value}</div>
      <div className="mt-1 text-sm text-[var(--sf-text-muted)]">{detail}</div>
    </div>
  );
}

function formatTimestamp(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function isActiveJob(status: NovelWorkbenchJob["status"]): boolean {
  return status === "queued" || status === "running";
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function NovelWorkbenchPage() {
  const [, navigate] = useLocation();
  const pushToast = useAppStore((state) => state.pushToast);
  const user = useAuthStore((state) => state.user);
  const locale = useWorkbenchLocale();
  const copy = useWorkbenchCopy();
  const isAdmin = user?.role === "admin";

  const [status, setStatus] = useState<NovelWorkbenchStatus | null>(null);
  const [jobs, setJobs] = useState<NovelWorkbenchJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [writingLanguage, setWritingLanguage] = useState("简体中文");
  const [seedText, setSeedText] = useState("");
  const [artifacts, setArtifacts] = useState<NovelWorkbenchArtifactListResponse | null>(null);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string | null>(null);
  const [artifactPreview, setArtifactPreview] = useState<NovelWorkbenchArtifactContentResponse | null>(null);
  const [artifactPreviewLoading, setArtifactPreviewLoading] = useState(false);
  const [fullLog, setFullLog] = useState<NovelWorkbenchLogResponse | null>(null);
  const [fullLogLoading, setFullLogLoading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const fetchAll = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) {
      setRefreshing(true);
    }

    try {
      const [statusResult, jobsResult] = await Promise.all([
        API.getNovelWorkbenchStatus(),
        API.listNovelWorkbenchJobs(),
      ]);
      setStatus(statusResult);
      setJobs(jobsResult.jobs);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void fetchAll(false);
    const timer = window.setInterval(() => {
      void fetchAll(false);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [fetchAll]);

  useEffect(() => {
    if (jobs.length === 0) {
      setSelectedJobId(null);
      return;
    }
    if (!selectedJobId || !jobs.some((job) => job.job_id === selectedJobId)) {
      setSelectedJobId(jobs[0].job_id);
    }
  }, [jobs, selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.job_id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );
  const selectedArtifact = useMemo(
    () => artifacts?.artifacts.find((artifact) => artifact.path === selectedArtifactPath) ?? null,
    [artifacts, selectedArtifactPath],
  );

  const missingRequiredEnv = status?.env_status?.missing_required ?? [];
  const missingOptionalEnv = status?.env_status?.missing_optional ?? [];
  const canSubmit = Boolean(status?.requirements.all_ready && title.trim() && seedText.trim() && !submitting);
  const latestSuccessfulJob = useMemo(
    () => jobs.find((job) => job.status === "succeeded") ?? null,
    [jobs],
  );
  const artifactGroups = useMemo(() => {
    if (!artifacts) return [];
    const grouped = new Map<string, NovelWorkbenchArtifact[]>();
    for (const artifact of artifacts.artifacts) {
      const bucket = grouped.get(artifact.group) ?? [];
      bucket.push(artifact);
      grouped.set(artifact.group, bucket);
    }
    return Array.from(grouped.entries());
  }, [artifacts]);
  const activeJobs = jobs.filter((job) => isActiveJob(job.status)).length;
  const successfulJobs = jobs.filter((job) => job.status === "succeeded").length;
  const artifactCount = artifacts?.summary.available_count ?? 0;

  const fetchArtifacts = useCallback(
    async (jobId: string) => {
      setArtifactsLoading(true);
      try {
        const listing = await API.listNovelWorkbenchArtifacts(jobId);
        setArtifacts(listing);
      } catch (error) {
        setArtifacts(null);
        pushToast((error as Error).message, "error");
      } finally {
        setArtifactsLoading(false);
      }
    },
    [pushToast],
  );

  const handleLoadFullLog = useCallback(
    async (job: NovelWorkbenchJob) => {
      setFullLogLoading(true);
      try {
        const payload = await API.getNovelWorkbenchLog(job.job_id);
        setFullLog(payload);
      } catch (error) {
        pushToast((error as Error).message, "error");
      } finally {
        setFullLogLoading(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    if (!selectedJobId) {
      setArtifacts(null);
      setSelectedArtifactPath(null);
      setArtifactPreview(null);
      setFullLog(null);
      return;
    }
    void fetchArtifacts(selectedJobId);
    setSelectedArtifactPath(null);
    setArtifactPreview(null);
    setFullLog(null);
  }, [fetchArtifacts, selectedJobId]);

  useEffect(() => {
    const previewablePath = artifacts?.artifacts.find((artifact) => artifact.previewable)?.path ?? null;
    if (!previewablePath) {
      setSelectedArtifactPath(null);
      return;
    }
    if (!selectedArtifactPath || !artifacts?.artifacts.some((artifact) => artifact.path === selectedArtifactPath)) {
      setSelectedArtifactPath(previewablePath);
    }
  }, [artifacts, selectedArtifactPath]);

  useEffect(() => {
    if (!selectedJobId || !selectedArtifactPath) {
      setArtifactPreview(null);
      setArtifactPreviewLoading(false);
      return;
    }

    const artifact = artifacts?.artifacts.find((item) => item.path === selectedArtifactPath);
    if (!artifact?.previewable) {
      setArtifactPreview(null);
      setArtifactPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setArtifactPreviewLoading(true);
    void API.getNovelWorkbenchArtifactContent(selectedJobId, selectedArtifactPath)
      .then((payload) => {
        if (!cancelled) {
          setArtifactPreview(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setArtifactPreview(null);
          pushToast((error as Error).message, "error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setArtifactPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artifacts, pushToast, selectedArtifactPath, selectedJobId]);

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await API.createNovelWorkbenchJob({
        title: title.trim(),
        seed_text: seedText.trim(),
        project_name: projectName.trim() || undefined,
        writing_language: writingLanguage,
      });
      pushToast(copy.createdToast, "success");
      setSelectedJobId(response.job.job_id);
      await fetchAll(false);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelJob = async (job: NovelWorkbenchJob) => {
    if (!isActiveJob(job.status)) return;

    setCancellingJobId(job.job_id);
    try {
      await API.cancelNovelWorkbenchJob(job.job_id);
      pushToast(copy.cancelledToast, "warning");
      await fetchAll(false);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setCancellingJobId(null);
    }
  };

  const handleDeleteJob = async (job: NovelWorkbenchJob) => {
    if (isActiveJob(job.status)) {
      pushToast(copy.deleteActiveWarning, "warning");
      return;
    }

    if (!window.confirm(copy.confirmDelete(job.title))) {
      return;
    }

    setDeletingJobId(job.job_id);
    try {
      await API.deleteNovelWorkbenchJob(job.job_id);
      pushToast(copy.deletedToast, "success");
      if (selectedJobId === job.job_id) {
        setSelectedJobId(null);
      }
      await fetchAll(false);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleDownloadArtifact = async (job: NovelWorkbenchJob, artifact: NovelWorkbenchArtifact) => {
    const key = `artifact:${artifact.path}`;
    setDownloadingKey(key);
    try {
      const blob = await API.downloadNovelWorkbenchArtifact(job.job_id, artifact.path);
      downloadBlob(blob, artifact.path.split("/").pop() || artifact.path);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadLog = async (job: NovelWorkbenchJob) => {
    setDownloadingKey("log");
    try {
      const blob = await API.downloadNovelWorkbenchLog(job.job_id);
      downloadBlob(blob, `${job.job_id}.log`);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadWorkspace = async (job: NovelWorkbenchJob) => {
    setDownloadingKey("workspace");
    try {
      const blob = await API.downloadNovelWorkbenchWorkspace(job.job_id);
      downloadBlob(blob, `${job.job_id}-workspace.zip`);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="sf-editorial-page flex min-h-screen flex-col text-[var(--sf-text)]">
      <header className="px-6 pt-6">
        <div className="storyforge-page-header mx-auto flex max-w-7xl flex-col gap-4 rounded-[2rem] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/app/projects")}
              className="storyforge-secondary-button inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5"
            >
              <ChevronLeft className="h-4 w-4" />
              {copy.back}
            </button>
            <div className="h-8 w-px bg-[rgba(117,132,159,0.18)]" />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900">
                <BookOpen className="h-3.5 w-3.5" />
                {copy.eyebrow}
              </div>
              <h1 className="mt-3 text-[1.85rem] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">{copy.title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-7 text-[var(--sf-text-muted)]">{copy.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate("/app/admin")}
                className="storyforge-secondary-button inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                title={locale === "zh" ? "全局配置" : "Global Config"}
                aria-label={locale === "zh" ? "全局配置" : "Global Config"}
              >
                <ServerCog className="h-4 w-4" />
                {locale === "zh" ? "全局配置" : "Global Config"}
              </button>
            )}

            <button
              type="button"
              onClick={() => void fetchAll(true)}
              className="storyforge-secondary-button inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {copy.refresh}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--sf-text-muted)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--sf-blue)]" />
            {copy.loading}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_360px]">
              <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(117,132,159,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,252,0.98))] p-8 shadow-[0_24px_60px_rgba(23,38,69,0.08)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,151,214,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(216,165,90,0.14),transparent_32%)]" />
                <div className="relative space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900">
                    <Sparkles className="h-3.5 w-3.5" />
                    {copy.heroEyebrow}
                  </div>

                  <div className="max-w-3xl space-y-3">
                    <h2 className="text-[2.3rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--sf-text)]">
                      {copy.heroTitle}
                    </h2>
                    <p className="max-w-2xl text-base leading-8 text-[var(--sf-text-muted)]">{copy.heroBody}</p>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <form onSubmit={(event) => void handleCreateJob(event)} className="space-y-4 rounded-[1.7rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-5">
                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.formTitle}</span>
                        <input
                          id="novel-title"
                          type="text"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          placeholder={copy.titlePlaceholder}
                          className="storyforge-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.projectName}</span>
                        <input
                          id="project-name"
                          type="text"
                          value={projectName}
                          onChange={(event) => setProjectName(event.target.value)}
                          placeholder={copy.projectNamePlaceholder}
                          className="storyforge-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.writingLanguage}</span>
                        <select
                          id="writing-language"
                          value={writingLanguage}
                          onChange={(event) => setWritingLanguage(event.target.value)}
                          className="storyforge-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        >
                          <option value="简体中文">{copy.writingLanguageZh}</option>
                          <option value="English">English</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.seedLabel}</span>
                        <textarea
                          id="seed-text"
                          value={seedText}
                          onChange={(event) => setSeedText(event.target.value)}
                          rows={12}
                          placeholder={copy.seedPlaceholder}
                          className="storyforge-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        />
                      </label>

                      <p className="text-xs leading-6 text-[var(--sf-text-soft)]">{copy.seedHint}</p>

                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className="storyforge-primary-button inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                        {submitting ? copy.submitting : copy.submit}
                      </button>
                    </form>

                    <div className="rounded-[1.7rem] border border-[rgba(117,132,159,0.18)] bg-white/88 p-5">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{copy.flowEyebrow}</div>
                      <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[var(--sf-text)]">{copy.flowTitle}</h3>
                      <div className="mt-4 grid gap-3">
                        {copy.flowSteps.map((step, index) => (
                          <div key={step} className="rounded-2xl border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] px-4 py-3 text-sm leading-6 text-[var(--sf-text-muted)]">
                            <span className="mr-2 text-[var(--sf-text-soft)]">{index + 1}.</span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section
                  className={`rounded-[32px] border p-6 shadow-[0_24px_70px_rgba(2,6,23,0.26)] ${
                    status?.requirements.all_ready
                      ? "border-emerald-500/20 bg-emerald-500/8"
                      : "border-rose-500/20 bg-rose-500/8"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{copy.readyEyebrow}</div>
                  <div className="mt-4 flex items-start gap-3">
                    {status?.requirements.all_ready ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 text-rose-300" />
                    )}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-[var(--sf-text)]">
                        {status?.requirements.all_ready ? copy.readyTitle : copy.blockedTitle}
                      </h3>
                      <p className="text-sm leading-6 text-[var(--sf-text-muted)]">
                        {status?.requirements.all_ready
                          ? copy.readyBody
                          : missingRequiredEnv.length > 0
                            ? `${copy.blockedBody} ${missingRequiredEnv.join(" · ")}`
                            : copy.blockedBody}
                      </p>
                      {missingOptionalEnv.length > 0 && (
                        <p className="text-sm leading-6 text-amber-700">
                          {copy.optionalBody} {missingOptionalEnv.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-[rgba(117,132,159,0.18)] bg-white/82 p-6 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{copy.latestEyebrow}</div>
                  {latestSuccessfulJob ? (
                    <>
                      <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[var(--sf-text)]">{latestSuccessfulJob.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--sf-text-muted)]">
                        {copy.latestSummary(formatTimestamp(latestSuccessfulJob.finished_at))}
                      </p>
                      {latestSuccessfulJob.imported_project_name && (
                        <button
                          type="button"
                          onClick={() => navigate(`/app/projects/${latestSuccessfulJob.imported_project_name}`)}
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:-translate-y-0.5"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {copy.latestAction}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">{copy.latestEmpty}</p>
                  )}
                </section>

                <section className="rounded-[2rem] border border-[rgba(117,132,159,0.18)] bg-white/82 p-6 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{copy.pulseEyebrow}</div>
                  <div className="mt-4 grid gap-3">
                    <MetricCard label={copy.totalRuns} value={String(jobs.length)} detail={copy.runHistoryTitle} />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <MetricCard label={copy.activeRuns} value={String(activeJobs)} detail={copy.statusLabels.running} />
                      <MetricCard label={copy.successfulRuns} value={String(successfulJobs)} detail={copy.statusLabels.succeeded} />
                    </div>
                    <MetricCard label={copy.artifactCount} value={String(artifactCount)} detail={copy.artifactsTitle} />
                  </div>
                </section>
              </div>
            </section>

            <details className="rounded-[2rem] border border-[rgba(117,132,159,0.18)] bg-white/82 p-6 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
              <summary className="cursor-pointer list-none text-sm font-medium text-[var(--sf-text)]">
                {copy.diagnosticsToggle}
              </summary>

              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <RequirementChip label={copy.requirementLabels.workspace_root_exists} ok={Boolean(status?.requirements.workspace_root_exists)} />
                  <RequirementChip label={copy.requirementLabels.autonovel_repo_exists} ok={Boolean(status?.requirements.autonovel_repo_exists)} />
                  <RequirementChip label={copy.requirementLabels.importer_exists} ok={Boolean(status?.requirements.importer_exists)} />
                  <RequirementChip label={copy.requirementLabels.autonovel_env_exists} ok={Boolean(status?.requirements.autonovel_env_exists)} />
                  <RequirementChip label={copy.requirementLabels.git_available} ok={Boolean(status?.requirements.git_available)} />
                  <RequirementChip label={copy.requirementLabels.uv_available} ok={Boolean(status?.requirements.uv_available)} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.workspaceRoot}</div>
                    <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{status?.workspace_root}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.autonovelSource}</div>
                    <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{status?.autonovel_source_dir}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.importerScript}</div>
                    <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{status?.importer_script}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.runtimeEnv}</div>
                    <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{status?.autonovel_env_source}</div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.coreDependencies}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(status?.env_status?.required ?? {}).map(([key, ok]) => (
                        <RequirementChip key={key} label={key} ok={ok} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.optionalExtensions}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(status?.env_status?.optional ?? {}).map(([key, ok]) => (
                        <RequirementChip key={key} label={key} ok={ok} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </details>

            <section className="grid gap-6 xl:grid-cols-[340px,1fr]">
              <div className="rounded-[32px] border border-[rgba(117,132,159,0.18)] bg-white/86 p-5 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{copy.runHistoryEyebrow}</div>
                    <h2 className="mt-2 text-base font-semibold text-[var(--sf-text)]">{copy.runHistoryTitle}</h2>
                  </div>
                  <span className="text-xs text-[var(--sf-text-soft)]">{jobs.length}</span>
                </div>

                <div className="space-y-3">
                  {jobs.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-center text-sm text-[var(--sf-text-muted)]">
                      {copy.runHistoryEmpty}
                    </div>
                  ) : (
                    jobs.map((job) => {
                      const selected = selectedJobId === job.job_id;
                      const jobIsActive = isActiveJob(job.status);
                      const cancelling = cancellingJobId === job.job_id;
                      const deleting = deletingJobId === job.job_id;

                      return (
                        <div
                          key={job.job_id}
                          className={`rounded-[24px] border p-4 transition-colors ${
                            selected
                              ? "border-sky-400/55 bg-sky-100/70"
                              : "border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedJobId((previous) => (previous === job.job_id ? null : job.job_id))}
                            className="block w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-[var(--sf-text)]">{job.title}</div>
                                <div className="mt-1 text-xs text-[var(--sf-text-soft)]">{job.target_project_name}</div>
                              </div>
                              <JobStatusBadge status={job.status} locale={locale} />
                            </div>
                            <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--sf-text-muted)]">{job.seed_excerpt}</div>
                            <div className="mt-3 text-[11px] uppercase tracking-wide text-[var(--sf-text-soft)]">{job.stage}</div>
                          </button>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedJobId((previous) => (previous === job.job_id ? null : job.job_id))}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-2.5 py-1.5 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)]"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {selected ? copy.collapse : copy.details}
                            </button>

                            {jobIsActive ? (
                              <button
                                type="button"
                                onClick={() => void handleCancelJob(job)}
                                disabled={cancelling}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                                {copy.cancel}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleDeleteJob(job)}
                                disabled={deleting}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-2.5 py-1.5 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {copy.delete}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-[rgba(117,132,159,0.18)] bg-white/86 p-5 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
                {selectedJob ? (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--sf-text)]">{selectedJob.title}</h2>
                          <JobStatusBadge status={selectedJob.status} locale={locale} />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--sf-text-muted)]">
                          {copy.stage} <span className="text-[var(--sf-text)]">{selectedJob.stage}</span> · {copy.target}{" "}
                          <span className="font-mono text-[var(--sf-text)]">{selectedJob.target_project_name}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedJob.imported_project_name && (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/projects/${selectedJob.imported_project_name}`)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-100 px-4 py-2 text-sm text-emerald-800 transition-colors hover:bg-emerald-200"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {copy.openProject}
                          </button>
                        )}
                        {isActiveJob(selectedJob.status) ? (
                          <button
                            type="button"
                            onClick={() => void handleCancelJob(selectedJob)}
                            disabled={cancellingJobId === selectedJob.job_id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingJobId === selectedJob.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                            {copy.cancel}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleDeleteJob(selectedJob)}
                            disabled={deletingJobId === selectedJob.job_id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(117,132,159,0.18)] bg-white px-4 py-2 text-sm text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingJobId === selectedJob.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {copy.deleteRecord}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-[var(--sf-text-muted)] md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.created}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.created_at)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.updated}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.updated_at)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.language}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{selectedJob.writing_language}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.started}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.started_at)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.finished}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.finished_at)}</div>
                      </div>
                    </div>

                    {selectedJob.error_message && (
                      <div className="rounded-[24px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {selectedJob.error_message}
                      </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.seedCard}</div>
                        <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--sf-text)]">
                          {selectedJob.seed_text}
                        </pre>
                      </div>

                      <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.workspaceCard}</div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleLoadFullLog(selectedJob)}
                              disabled={fullLogLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-3 py-2 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {fullLogLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                              {copy.viewFullLog}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownloadLog(selectedJob)}
                              disabled={downloadingKey === "log"}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-3 py-2 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {downloadingKey === "log" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              {copy.downloadLog}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownloadWorkspace(selectedJob)}
                              disabled={downloadingKey === "workspace"}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/60 bg-sky-100 px-3 py-2 text-xs text-sky-800 transition-colors hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {downloadingKey === "workspace" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                              {copy.exportWorkspace}
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.workspacePath}</div>
                        <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{selectedJob.workspace_dir}</div>
                        <div className="mt-4 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.logFile}</div>
                        <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{selectedJob.log_path}</div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">
                          {fullLog ? copy.fullLog : copy.logTail}
                        </div>
                        <div className="flex items-center gap-3">
                          {fullLog && (
                            <span className="text-xs text-[var(--sf-text-soft)]">
                              {formatFileSize(fullLog.size_bytes)} · {formatTimestamp(fullLog.modified_at)}
                            </span>
                          )}
                          {selectedJob.status === "running" && !fullLog && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {copy.liveRefreshing}
                            </span>
                          )}
                        </div>
                      </div>
                      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[rgba(117,132,159,0.18)] bg-[rgba(240,245,250,0.95)] p-3 font-mono text-xs text-[var(--sf-text)]">
                        {fullLog?.content || selectedJob.log_tail || copy.noLogsYet}
                      </pre>
                      {fullLog?.truncated && (
                        <div className="mt-3 text-xs text-amber-300">{copy.truncatedLog}</div>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.artifactsTitle}</div>
                          <div className="mt-1 text-sm text-[var(--sf-text-muted)]">
                            {artifacts
                              ? copy.artifactsSummary(artifacts.summary.available_count, artifacts.summary.chapter_count)
                              : copy.artifactsLoading}
                          </div>
                        </div>
                        {artifactsLoading && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {copy.artifactsLoading}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
                        <div className="space-y-4">
                          {artifactGroups.length > 0 ? (
                            artifactGroups.map(([group, groupArtifacts]) => (
                              <div key={group} className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-white/82 p-3">
                                <div className="mb-2 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">
                                  {copy.groupLabels[group as keyof typeof copy.groupLabels] ?? group}
                                </div>
                                <div className="space-y-2">
                                  {groupArtifacts.map((artifact) => (
                                    <div
                                      key={artifact.path}
                                      className={`rounded-xl border px-3 py-2 ${
                                        selectedArtifactPath === artifact.path
                                          ? "border-sky-500/40 bg-sky-500/10"
                                          : "border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)]"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (artifact.previewable) {
                                              setSelectedArtifactPath(artifact.path);
                                            }
                                          }}
                                          className="min-w-0 text-left"
                                        >
                                          <div className="truncate text-sm font-medium text-[var(--sf-text)]">{artifact.label}</div>
                                          <div className="mt-1 truncate font-mono text-[11px] text-[var(--sf-text-soft)]">
                                            {artifact.path}
                                          </div>
                                          <div className="mt-1 text-[11px] text-[var(--sf-text-muted)]">
                                            {formatFileSize(artifact.size_bytes)} · {formatTimestamp(artifact.modified_at)}
                                          </div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleDownloadArtifact(selectedJob, artifact)}
                                          disabled={downloadingKey === `artifact:${artifact.path}`}
                                          className="inline-flex items-center gap-1 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-2 py-1 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {downloadingKey === `artifact:${artifact.path}` ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Download className="h-3.5 w-3.5" />
                                          )}
                                          {copy.downloadArtifact}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[24px] border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-sm text-[var(--sf-text-muted)]">
                              {copy.artifactsEmpty}
                            </div>
                          )}
                        </div>

                        <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-white/82 p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">
                            <FileText className="h-3.5 w-3.5" />
                            {copy.previewTitle}
                          </div>
                          {selectedArtifact ? (
                            <div className="space-y-3">
                              <div>
                                <div className="text-sm font-medium text-[var(--sf-text)]">{selectedArtifact.label}</div>
                                <div className="mt-1 break-all font-mono text-[11px] text-[var(--sf-text-soft)]">
                                  {selectedArtifact.path}
                                </div>
                              </div>
                              {artifactPreviewLoading ? (
                                <div className="flex items-center gap-2 rounded-xl border border-[rgba(117,132,159,0.18)] bg-[rgba(240,245,250,0.95)] px-4 py-8 text-sm text-[var(--sf-text-muted)]">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {copy.loadingPreview}
                                </div>
                              ) : artifactPreview ? (
                                <>
                                  <pre className="max-h-[38rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[rgba(117,132,159,0.18)] bg-[rgba(240,245,250,0.95)] p-3 font-mono text-xs text-[var(--sf-text)]">
                                    {artifactPreview.content}
                                  </pre>
                                  {artifactPreview.truncated && (
                                    <div className="text-xs text-amber-300">{copy.previewTruncated}</div>
                                  )}
                                </>
                              ) : (
                                <div className="rounded-xl border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-sm text-[var(--sf-text-muted)]">
                                  {copy.previewUnsupported}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-sm text-[var(--sf-text-muted)]">
                              {copy.previewEmpty}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[24rem] items-center justify-center rounded-[24px] border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] text-sm text-[var(--sf-text-muted)]">
                    {copy.detailsEmpty}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <SiteLegalFooter className="bg-transparent" contentClassName="max-w-7xl px-6 py-5" />
    </div>
  );
}
